import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(path, mocks = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
    exports, require: name => { if (name in mocks) return mocks[name]; throw Error(name); }, console: { error() {} },
  });
  return exports;
}
const cash = load('src/lib/cashPayments.ts');
function fixture({ uid = 'operator', token = 'valid', job: changes = {}, receipt = false } = {}) {
  const job = { operatorId: 'operator', clientId: 'client', paymentMethod: 'cash', paymentStatus: 'pending', status: 'in-progress', price: 123.45, ...changes };
  const writes = [];
  const transaction = { get: async path => ({ exists: path.startsWith('jobs/') || receipt, data: () => job }), update: (path, data) => writes.push({ path, data }), set: (path, data) => writes.push({ path, data }) };
  const route = load('src/app/api/jobs/confirm-cash/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    'firebase-admin/firestore': { FieldValue: { serverTimestamp: () => 'server-time' } },
    '@/lib/cashPayments': cash,
    '@/lib/firebaseAdmin': { getAdminAuth: () => ({ verifyIdToken: async () => { if (token !== 'valid') throw Error('invalid'); return { uid }; } }), getAdminDb: () => ({ doc: path => path, runTransaction: fn => fn(transaction) }) },
  });
  return { writes, confirm: () => route.POST({ headers: new Map(token ? [['authorization', `Bearer ${token}`]] : []), json: async () => ({ jobId: 'job' }) }) };
}
test('cash confirmation works without Stripe and atomically records payment and a receipt', async () => {
  const f = fixture();
  assert.equal((await f.confirm()).status, 200);
  assert.equal(f.writes.length, 2);
  assert.equal(f.writes[0].data.paymentStatus, 'paid');
  assert.equal(f.writes[0].data.cashConfirmedBy, 'operator');
  assert.equal(f.writes[1].path, 'transactions/job-cash');
  assert.equal(f.writes[1].data.amount, 12345);
  assert.equal(f.writes[1].data.paymentMethod, 'cash');
});
test('cash confirmation is idempotent after payment', async () => {
  const f = fixture({ job: { paymentStatus: 'paid' }, receipt: true });
  assert.equal((await f.confirm()).body.alreadyConfirmed, true);
  assert.equal(f.writes.length, 0);
});
test('cash confirmation rejects unauthenticated callers, clients and unrelated operators', async () => {
  for (const options of [{ token: '' }, { token: 'expired' }, { uid: 'client' }, { uid: 'stranger' }]) {
    const f = fixture(options);
    assert.ok([401, 403].includes((await f.confirm()).status));
    assert.equal(f.writes.length, 0);
  }
});
test('cash confirmation rejects card jobs, unfinished scheduling and invalid amounts', async () => {
  for (const job of [{ paymentMethod: 'credit' }, { stripePaymentIntentId: 'pi_existing' }, { status: 'pending' }, { status: 'accepted' }, { status: 'cancelled' }, { price: 0 }, { price: -1 }, { price: NaN }]) {
    const f = fixture({ job });
    assert.equal((await f.confirm()).status, 403);
    assert.equal(f.writes.length, 0);
  }
});

function cashActionFixture(changes = {}, uid = 'operator') {
  const job = { operatorId: 'operator', clientId: 'client', chatId: 'chat', paymentMethod: 'cash', paymentStatus: 'pending', status: 'in-progress', price: 123.45, completionPhotoUrl: 'proof.jpg', ...changes };
  const writes = [];
  const transaction = {
    get: async () => ({ exists: true, data: () => job }),
    update: (path, data) => writes.push({ path, data }),
    set: (path, data) => writes.push({ path, data }),
  };
  const route = load('src/app/api/jobs/cash-payment/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    'firebase-admin/firestore': { FieldValue: { serverTimestamp: () => 'server-time', increment: n => n } },
    '@/lib/firebaseAdmin': { getAdminAuth: () => ({ verifyIdToken: async () => ({ uid }) }), getAdminDb: () => ({ doc: path => path, runTransaction: fn => fn(transaction) }) },
  });
  return { writes, run: action => route.POST({ headers: new Map([['authorization', 'Bearer valid']]), json: async () => ({ jobId: 'job', action }) }) };
}
test('client cash choice keeps payment pending and warns the operator without charging', async () => {
  const f = cashActionFixture({}, 'client');
  assert.equal((await f.run('defer')).status, 200);
  assert.equal(f.writes[0].data.paymentStatus, 'pending');
  assert.equal(f.writes.find(w => w.path.startsWith('notifications/')).data.uid, 'operator');
  assert.match(f.writes.find(w => w.path.startsWith('messages/')).data.content, /own risk/);
  assert.equal(f.writes.some(w => w.path.startsWith('transactions/')), false);
});
test('cash completion keeps payment pending and atomically notifies the client to pay', async () => {
  const f = cashActionFixture();
  assert.equal((await f.run('complete')).status, 200);
  assert.equal(f.writes[0].data.status, 'completed');
  assert.equal(f.writes[0].data.paymentStatus, 'pending');
  assert.equal(f.writes.find(w => w.path.startsWith('notifications/')).data.uid, 'client');
  assert.match(f.writes.find(w => w.path.startsWith('messages/')).data.content, /Please pay/);
});
test('cash completion preserves confirmed payment, needs proof, and only allows the operator', async () => {
  const paid = cashActionFixture({ paymentStatus: 'paid' });
  assert.equal((await paid.run('complete')).status, 200);
  assert.equal(paid.writes[0].data.paymentStatus, 'paid');
  for (const [changes, uid] of [[{ completionPhotoUrl: '' }, 'operator'], [{ status: 'accepted' }, 'operator'], [{}, 'client'], [{ paymentMethod: 'credit' }, 'operator']]) {
    const f = cashActionFixture(changes, uid);
    assert.ok((await f.run('complete')).status >= 400);
    assert.equal(f.writes.length, 0);
  }
});
test('cash refund records cash returned before completion and never marks the work complete', async () => {
  const f = cashActionFixture({ paymentStatus: 'paid' });
  assert.equal((await f.run('refund')).status, 200);
  assert.equal(f.writes[0].data.paymentStatus, 'refunded');
  assert.equal(f.writes[0].data.status, undefined);
  assert.equal(f.writes.find(w => w.path.startsWith('transactions/')).data.status, 'refunded');
  for (const [changes, uid] of [[{ paymentStatus: 'pending' }, 'operator'], [{ paymentStatus: 'paid', status: 'completed' }, 'operator'], [{ paymentStatus: 'paid' }, 'client']]) {
    const denied = cashActionFixture(changes, uid);
    assert.ok((await denied.run('refund')).status >= 400);
    assert.equal(denied.writes.length, 0);
  }
});
test('repeated cash actions do not duplicate notices and cancelled jobs reject actions', async () => {
  for (const [action, changes, uid] of [['defer', { cashPaymentDeferredAt: 'existing' }, 'client'], ['complete', { status: 'completed' }, 'operator'], ['refund', { paymentStatus: 'refunded' }, 'operator']]) {
    const f = cashActionFixture(changes, uid);
    assert.equal((await f.run(action)).body.alreadyApplied, true);
    assert.equal(f.writes.length, 0);
  }
  for (const action of ['defer', 'complete', 'refund']) {
    const f = cashActionFixture({ status: 'cancelled' }, action === 'defer' ? 'client' : 'operator');
    assert.equal((await f.run(action)).status, 409);
    assert.equal(f.writes.length, 0);
  }
});
