import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(file, mocks) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, require: name => { if (name in mocks) return mocks[name]; throw Error(name); } });
  return exports;
}
class OrderError extends Error { constructor(message, status) { super(message); this.status = status; } }
const order = { OrderError, orderFailure: e => ({ status: e.status || 500, error: e.message }) };
const request = { headers: { get: () => 'Bearer fixture' } };
function access(profile, deleted = false) {
  const db = { doc: path => ({ get: async () => ({ data: () => profile, exists: path.startsWith('accountDeletionTombstones') && deleted }) }) };
  return load('src/lib/admin/server.ts', { '@/lib/workOrderServer': order, '@/lib/firebaseAdmin': { getAdminAuth: () => ({ verifyIdToken: async () => ({ uid: 'caller' }) }), getAdminDb: () => db } }).requireAdministrator;
}
test('admin authorization rejects a client even if its profile email is the owner address', async () => {
  await assert.rejects(access({ role: 'client', email: 'kacperprymicz@gmail.com' })(request), e => e.status === 403);
});
test('admin authorization rejects missing, employee, disabled and deleted accounts', async () => {
  for (const profile of [undefined, { role: 'employee' }, { role: 'admin', disabled: true }]) await assert.rejects(access(profile)(request), e => e.status === 403);
  await assert.rejects(access({ role: 'admin' }, true)(request), e => e.status === 403);
});
test('active administrators are admitted and missing tokens return 401', async () => {
  assert.equal((await access({ role: 'admin' })(request)).uid, 'caller');
  await assert.rejects(access({ role: 'admin' })({ headers: { get: () => null } }), e => e.status === 401);
});
function session(identity, profile = { role: 'client' }) {
  const writes = [];
  const db = { doc: path => ({ path }), collection: () => ({ doc: () => ({ path: 'audit' }) }), runTransaction: fn => fn({ get: async ref => ({ data: () => ref.path.startsWith('users/') ? profile : null, exists: false }), set: (ref, data) => writes.push({ ref, data }) }) };
  const route = load('src/app/api/admin/session/route.ts', {
    'next/server': { NextResponse: { json: data => ({ status: 200, ...data }) } },
    'firebase-admin/firestore': { FieldValue: { serverTimestamp: () => 123 } },
    '@/lib/firebaseAdmin': { getAdminDb: () => db, getAdminAuth: () => ({ verifyIdToken: async () => ({ uid: 'owner' }), getUser: async () => ({ uid: 'owner', ...identity }) }) },
    '@/lib/admin/server': { OWNER_EMAIL: 'kacperprymicz@gmail.com' }, '@/lib/workOrderServer': order,
  });
  return { run: () => route.POST(request), writes };
}
test('owner activation requires the verified Firebase identity, never an unverified email', async () => {
  for (const identity of [{ email: 'kacperprymicz@gmail.com', emailVerified: false }, { email: 'someone@example.com', emailVerified: true }, { email: 'kacperprymicz@gmail.com', emailVerified: true, disabled: true }]) {
    const fixture = session(identity); assert.equal((await fixture.run()).status, 403); assert.equal(fixture.writes.length, 0);
  }
});
test('verified owner activation writes the role and audit once; disabled profiles cannot reactivate', async () => {
  const identity = { email: 'kacperprymicz@gmail.com', emailVerified: true };
  const fresh = session(identity); assert.equal((await fresh.run()).status, 200); assert.equal(fresh.writes[0].data.role, 'admin'); assert.equal(fresh.writes.length, 2);
  const existing = session(identity, { role: 'admin' }); await existing.run(); assert.equal(existing.writes.length, 0);
  const disabled = session(identity, { role: 'client', disabled: true }); assert.equal((await disabled.run()).status, 403); assert.equal(disabled.writes.length, 0);
});
