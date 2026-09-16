import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function fixture(failAt) {
  const calls = [], exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/completeWithPhoto.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, crypto: { randomUUID: () => `request-${calls.length}` },
    require: () => ({ stripeConnectFetch: async (path, options) => {
      const body = JSON.parse(options.body); calls.push({ path, body });
      return { ok: calls.length !== failAt, json: async () => ({ revision: 8, error: 'Please retry' }) };
    } }),
  });
  return { calls, run: (paymentMethod = 'cash', paymentStatus = 'pending') => exports.completeWithPhoto({ id: 'job', revision: 7, paymentMethod, paymentStatus, stripePaymentIntentId: 'pi_1' }, 'data:image/jpeg;base64,proof') };
}
test('cash completion uploads proof without capturing or confirming payment', async () => {
  const f = fixture(); await f.run();
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].body.action, 'photo');
  assert.equal(f.calls[0].body.revision, 7);
});
test('card completion saves proof, captures payment, then completes with the new revision', async () => {
  const f = fixture(); await f.run('credit', 'held');
  assert.deepEqual(f.calls.map(c => c.body.action || c.path), ['photo', '/api/stripe/capture-payment', 'complete']);
  assert.equal(f.calls[2].body.revision, 8);
});
test('already-paid card completion does not capture twice', async () => {
  const f = fixture(); await f.run('credit', 'paid'); assert.equal(f.calls.length, 1);
});
test('failed proof never captures money and failed capture never completes work', async () => {
  for (const failAt of [1, 2]) {
    const f = fixture(failAt); await assert.rejects(f.run('credit', 'held'), /Please retry/);
    assert.equal(f.calls.length, failAt);
  }
});

function actionFixture({ method = 'cash', payment = 'pending', uid = 'operator', status = 'in-progress' } = {}) {
  const writes = [], exports = {};
  const job = { id: 'job', clientId: 'client', operatorId: 'operator', status, paymentMethod: method, paymentStatus: payment, revision: 7 };
  const tx = {
    get: async ref => ref === 'other-jobs' ? { docs: [] } : ({ exists: ref === 'jobs/job', id: 'job', data: () => ref === 'jobs/job' ? job : {} }),
    set: (path, data) => writes.push({ path, data }), update: (path, data) => writes.push({ path, data }),
  };
  const mocks = {
    'next/server': { NextResponse: { json: body => body } },
    'firebase-admin/firestore': { FieldValue: { serverTimestamp: () => 'now' } },
    '@/lib/firebaseAdmin': { getAdminDb: () => ({ doc: path => path, collection: () => ({ where: () => 'other-jobs' }), runTransaction: fn => fn(tx) }) },
    '@/lib/workOrders': {}, '@/lib/operatorDiscovery': {},
    '@/lib/travelEta': { calculateTravelEta: async () => ({ minutes: 12, source: 'estimate' }) },
    '@/lib/workOrderServer': { orderUser: async () => uid, validId: () => true, OrderError: Error, orderFailure: error => ({ error: error.message }), orderEvent: () => ({ recipient: 'client', message: 'Order updated' }) },
  };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/api/jobs/action/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports, require: name => { if (name === '@/lib/emailNotifications') return { sendWorkOrderEmail: async () => ({ sent: true }) }; if (name in mocks) return mocks[name]; throw Error(name); } });
  return { writes, run: () => exports.POST({ json: async () => ({ jobId: 'job', requestId: 'request', revision: 7, action: 'photo', completionPhotoUrl: 'data:image/jpeg;base64,cHJvb2Y=' }) }) };
}
test('completion proof atomically closes cash work while preserving its payment record', async () => {
  for (const payment of ['pending', 'paid', 'refunded']) {
    const f = actionFixture({ payment }); const result = await f.run();
    assert.equal(result.success, true);
    const update = f.writes.find(w => w.path === 'jobs/job').data;
    assert.equal(update.status, 'completed');
    assert.equal(update.completionTime, 'now');
    assert.equal(update.paymentStatus, undefined);
  }
});
test('card proof closes paid work and leaves uncaptured work available for recovery', async () => {
  for (const payment of ['held', 'paid']) {
    const f = actionFixture({ method: 'credit', payment }); await f.run();
    assert.equal(f.writes.find(w => w.path === 'jobs/job').data.status, payment === 'paid' ? 'completed' : undefined);
  }
});
test('clients and jobs that have not started cannot be completed through photo upload', async () => {
  for (const options of [{ uid: 'client' }, { status: 'accepted' }, { status: 'cancelled' }]) {
    const f = actionFixture(options); assert.ok((await f.run()).error); assert.equal(f.writes.length, 0);
  }
});
