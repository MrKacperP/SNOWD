import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(path, mocks = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, require: name => mocks[name] });
  return exports;
}
const discovery = load('src/lib/operatorDiscovery.ts');
function fixture({ available = true, verified = true, invited = false } = {}) {
  const writes = [];
  const operator = { role: 'operator', displayName: 'Operator', isAvailable: available, idVerified: verified, lat: 43, lng: -79, serviceRadius: 10 };
  const clients = { near: { role: 'client', onboardingComplete: true, lat: 43.01, lng: -79, displayName: 'Nearby', city: 'Toronto', email: 'private@example.com' }, far: { role: 'client', onboardingComplete: true, lat: 45, lng: -79 }, incomplete: { role: 'client', onboardingComplete: false, lat: 43, lng: -79 } };
  const route = load('src/app/api/operators/nearby-clients/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    'firebase-admin/firestore': { FieldValue: { serverTimestamp: () => 'now' } },
    '@/lib/operatorDiscovery': discovery,
    '@/lib/firebaseAdmin': { getAdminAuth: () => ({ verifyIdToken: async () => ({ uid: 'operator' }) }), getAdminDb: () => ({
      doc: path => ({ path, get: async () => ({ data: () => path === 'users/operator' ? operator : clients[path.split('/')[1]] }) }),
      collection: () => ({ where: () => ({ get: async () => ({ docs: Object.entries(clients).map(([id, data]) => ({ id, data: () => data })) }) }) }),
      runTransaction: async fn => fn({ get: async () => ({ exists: invited }), set: (ref, data) => writes.push({ path: ref.path, data }) }),
    }) },
  });
  const request = { headers: new Map([['authorization', 'Bearer valid']]) };
  return { writes, get: () => route.GET(request), invite: clientId => route.POST({ ...request, json: async () => ({ clientId }) }) };
}
test('operator directory uses the same radius as client search and returns only directory fields', async () => {
  const result = await fixture().get();
  assert.equal(result.status, 200);
  assert.equal(result.body.clients.length, 1);
  assert.equal(result.body.clients[0].uid, 'near');
  assert.equal(result.body.clients[0].email, undefined);
});
test('only verified available operators can discover or invite nearby clients', async () => {
  for (const options of [{ available: false }, { verified: false }]) {
    const f = fixture(options);
    assert.equal((await f.get()).status, 403);
    assert.equal((await f.invite('near')).status, 403);
    assert.equal(f.writes.length, 0);
  }
  const f = fixture();
  assert.equal((await f.invite('far')).status, 409);
  assert.equal((await f.invite('incomplete')).status, 409);
  assert.equal(f.writes.length, 0);
});
test('invitations identify the operator and do not create jobs or duplicate notifications', async () => {
  const f = fixture();
  assert.equal((await f.invite('near')).status, 200);
  assert.equal(f.writes.length, 1);
  assert.equal(f.writes[0].data.operatorId, 'operator');
  assert.equal(f.writes[0].data.uid, 'near');
  const repeated = fixture({ invited: true });
  assert.equal((await repeated.invite('near')).status, 200);
  assert.equal(repeated.writes.length, 0);
});
