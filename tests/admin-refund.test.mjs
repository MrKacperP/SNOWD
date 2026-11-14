import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function fixture({ admin = true, match = true, status = 'succeeded', refunded = false, direct = false } = {}) {
  const calls = [], writes = [];
  const exports = {};
  class OrderError extends Error { constructor(message, status) { super(message); this.status = status; } }
  const mocks = {
    'next/server': { NextResponse: { json: data => ({ status: 200, ...data }) } },
    'firebase-admin/firestore': { FieldValue: { serverTimestamp: () => 1 } },
    '@/lib/admin/server': { requireAdministrator: async () => { if (!admin) throw new OrderError('Forbidden', 403); return { uid: 'admin', db: { doc: () => ({ get: async () => ({ data: () => ({ stripePaymentIntentId: 'pi_job', stripePaymentAccountId: direct ? 'acct_saved' : null, clientId: 'client', operatorId: 'operator', price: 50 }) }), set: async d => writes.push(d) }) } }; } },
    '@/lib/admin/refunds': { syncAdminRefund: async (...args) => calls.push(['sync', ...args]) },
    '@/lib/stripe': { getStripe: () => ({ paymentIntents: { retrieve: async () => ({ id: 'pi_job', metadata: { jobId: match ? 'job' : 'other', clientId: 'client', operatorId: 'operator' }, currency: 'cad', amount: 5000, status, latest_charge: { refunded }, application_fee_amount: 500, transfer_data: direct ? null : { destination: 'acct_operator' } }) }, refunds: { create: async (...args) => { calls.push(['refund', ...args]); return { status: 'succeeded' }; } } }) },
    '@/lib/workOrderServer': { OrderError, validId: v => typeof v === 'string' && !!v, orderFailure: e => ({ status: e.status || 500 }) },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/api/admin/refund/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, require: key => mocks[key] });
  return { calls, writes, run: () => exports.POST({ json: async () => ({ jobId: 'job' }) }) };
}
test('non-admin, mismatched and uncaptured payments cannot initiate refunds', async () => {
  for (const options of [{ admin: false }, { match: false }, { status: 'requires_capture' }]) { const f = fixture(options); assert.notEqual((await f.run()).status, 200); assert.equal(f.calls.length, 0); }
});
test('destination refunds reverse the operator transfer and platform fee with a stable retry key', async () => {
  const f = fixture(); assert.equal((await f.run()).status, 200);
  const call = f.calls[0]; assert.equal(call[1].reverse_transfer, true); assert.equal(call[1].refund_application_fee, true); assert.equal(call[2].idempotencyKey, 'admin-full-refund-pi_job'); assert.equal(f.writes.length, 1);
});
test('direct refunds use the immutable saved connected account without destination reversal', async () => {
  const f = fixture({ direct: true }); await f.run(); assert.equal(f.calls[0][2].stripeAccount, 'acct_saved'); assert.equal(f.calls[0][1].reverse_transfer, undefined);
});
test('already refunded payments reconcile without issuing a second refund', async () => {
  const f = fixture({ refunded: true }); await f.run(); assert.equal(f.calls.length, 1); assert.equal(f.calls[0][0], 'sync');
});
