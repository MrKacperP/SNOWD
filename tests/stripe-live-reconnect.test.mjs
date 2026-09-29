import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function fixture({ code, owner = 'operator', concurrent = false, active = true } = {}) {
  const created = [], writes = [];
  const profile = { stripeConnectAccountId: 'acct_sandbox', displayName: 'Operator' };
  const stripe = { accounts: {
    retrieve: async id => {
      if (!id) return { charges_enabled: active };
      if (code) throw Object.assign(new Error('Stripe retrieval failed'), { code });
      return { id, metadata: { operatorId: owner } };
    },
    create: async (params, options) => { created.push({ params, options }); return { id: 'acct_live' }; },
  } };
  stripe.v2 = { core: { accounts: { create: stripe.accounts.create } } };
  const db = { doc: () => ({}), runTransaction: async fn => fn({
    get: async () => ({ data: () => concurrent ? { stripeConnectAccountId: 'acct_other' } : profile }),
    update: (ref, data) => writes.push(data),
  }) };
  const mocks = {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    '@/lib/stripe': { getStripe: () => stripe },
    '@/lib/stripeConnectAuth': { requireStripeOperator: async () => ({ uid: 'operator', email: 'operator@example.com', profile }) },
    '@/lib/firebaseAdmin': { getAdminDb: () => db },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/api/stripe/create-connect-account/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, require: name => mocks[name], process: { env: { STRIPE_SECRET_KEY: 'sk_live_fixture' } }, console: { error() {} } });
  return { run: () => exports.POST({}), created, writes };
}

test('inaccessible sandbox account can start live onboarding and resets payout readiness', async () => {
  for (const code of ['account_invalid', 'resource_missing']) {
    const f = fixture({ code });
    assert.equal((await f.run()).body.accountId, 'acct_live');
    assert.equal(f.created[0].params.type, undefined);
    assert.equal(f.created[0].params.dashboard, 'express');
    assert.equal(f.created[0].params.defaults.responsibilities.losses_collector, 'stripe');
    assert.equal(f.created[0].params.defaults.responsibilities.fees_collector, 'application');
    assert.equal(f.created[0].options.apiVersion, '2026-08-26.preview');
    assert.equal(f.created[0].params.metadata.operatorId, 'operator');
    assert.equal(f.created[0].options.idempotencyKey, 'operator-connect-v2-operator-acct_sandbox');
    assert.equal(f.writes[0].stripeReady, false);
    assert.equal(f.writes[0].stripePreviousConnectAccountId, 'acct_sandbox');
  }
});
test('accessible account is resumed without creating another account', async () => {
  const f = fixture();
  assert.equal((await f.run()).body.accountId, 'acct_sandbox');
  assert.equal(f.created.length, 0);
});
test('network failures, ownership errors and inactive platforms never replace accounts', async () => {
  for (const options of [{ code: 'api_connection_error' }, { owner: 'other' }, { code: 'account_invalid', active: false }]) {
    const f = fixture(options);
    assert.equal((await f.run()).status, 500);
    assert.equal(f.created.length, 0);
    assert.equal(f.writes.length, 0);
  }
});
test('recovery never overwrites a concurrently changed payout destination', async () => {
  const f = fixture({ code: 'account_invalid', concurrent: true });
  assert.equal((await f.run()).status, 500);
  assert.equal(f.writes.length, 0);
});
