import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, modules = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { exports, console, Date, require(name) { if (modules[name]) return modules[name]; throw new Error(name); } });
  return exports;
}
const metrics = load('src/lib/admin/metrics.ts');
test('daily reporting counts actual dates, includes zero days and excludes future/undated rows', () => {
  const rows = metrics.dailySeries([{ date: '2026-09-06', value: 100 }, { date: '2026-09-06T15:00:00Z', value: 25 }, { date: '2026-09-08', value: 999 }, { date: '', value: 500 }], 3, new Date('2026-09-07T12:00:00Z'));
  assert.deepEqual(JSON.parse(JSON.stringify(rows)), [{ date: '2026-09-05', value: 0 }, { date: '2026-09-06', value: 125 }, { date: '2026-09-07', value: 0 }]);
});
test('notifications resolve actual account, job and support records and reject external routes', () => {
  assert.equal(metrics.notificationHref({ type: 'document_uploaded', uid: 'account' }), '/admin/users/account');
  assert.equal(metrics.notificationHref({ type: 'job_status_change', meta: { jobId: 'job' } }), '/admin/jobs?id=job');
  assert.equal(metrics.notificationHref({ type: 'support', meta: { chatId: 'support_client' } }), '/admin/support-chats?id=support_client');
  assert.equal(metrics.notificationHref({ type: 'job_created', uid: 'client' }), '/admin/jobs');
  assert.equal(metrics.notificationHref({ type: 'support', uid: 'client' }), '/admin/support-chats?id=support_client');
  assert.equal(metrics.notificationHref({ type: 'support', chatId: 'support_client', meta: { path: '/admin/support-chats' } }), '/admin/support-chats?id=support_client');
  assert.equal(metrics.notificationHref({ type: 'payment', meta: { path: 'https://evil.example' } }), '/admin/transactions');
});

function fixture({ role = 'admin', disabled = false, target = { role: 'client' }, job = {}, failAuth = false } = {}) {
  const events = [];
  const records = new Map([['users/actor', { role, disabled, displayName: 'Admin' }], ['users/target', target], ['jobs/job', { status: 'pending', paymentStatus: 'pending', ...job }]]);
  const ref = path => ({ path, get: async () => ({ exists: records.has(path), data: () => records.get(path) }), update: async changes => { events.push(['update', path, changes]); records.set(path, { ...records.get(path), ...changes }); } });
  const db = {
    doc: ref,
    collection: path => ({ doc: () => ref(`${path}/event`), add: async data => events.push(['add', path, data]), where: () => ({ limit: () => ({ get: async () => ({ empty: true }) }) }) }),
    recursiveDelete: async document => { events.push(['delete', document.path]); records.delete(document.path); },
    runTransaction: async run => run({ get: document => document.get(), update: (document, data) => { events.push(['update', document.path, data]); }, set: (document, data) => { events.push(['set', document.path, data]); } }),
  };
  const auth = {
    verifyIdToken: async () => { if (failAuth) throw new Error('invalid'); return { uid: 'actor' }; },
    updateUser: async (uid, data) => events.push(['authUpdate', uid, data]),
    revokeRefreshTokens: async uid => events.push(['revoke', uid]),
    deleteUser: async uid => events.push(['authDelete', uid]),
  };
  const modules = { 'next/server': { NextResponse: { json: (body, options) => ({ status: options?.status || 200, body }) } }, 'firebase-admin/firestore': { FieldValue: { serverTimestamp: () => 'timestamp' } }, '@/lib/firebaseAdmin': { getAdminDb: () => db, getAdminAuth: () => auth } };
  const account = load('src/app/api/admin/users/[uid]/route.ts', modules);
  const jobs = load('src/app/api/admin/jobs/[jobId]/route.ts', modules);
  const request = (method, body, token = 'token') => ({ method, headers: { get: () => token ? `Bearer ${token}` : null }, json: async () => body });
  return { events, records, account: (method, body, uid = 'target', token = 'token') => account[method](request(method, body, token), { params: Promise.resolve({ uid }) }), job: (method, body) => jobs[method](request(method, body), { params: Promise.resolve({ jobId: 'job' }) }) };
}
test('account endpoint denies unauthenticated, employee and disabled callers without mutations', async () => {
  for (const config of [{ role: 'employee' }, { disabled: true }, { failAuth: true }]) {
    const f = fixture(config); const result = await f.account('PATCH', { displayName: 'New' });
    assert.ok([401, 403].includes(result.status)); assert.equal(f.events.length, 0);
  }
  assert.equal((await fixture().account('PATCH', {}, 'target', '')).status, 401);
});
test('account editing validates fields and protects own admin access', async () => {
  for (const body of [{ role: 'owner' }, { email: 'invalid' }, { disabled: 'false' }, { stripeReady: true }]) {
    const f = fixture(); assert.equal((await f.account('PATCH', body)).status, 400); assert.equal(f.events.length, 0);
  }
  assert.equal((await fixture().account('DELETE', undefined, 'actor')).status, 400);
});
test('account suspension updates authentication and saved profile and revokes sessions', async () => {
  const f = fixture(); assert.equal((await f.account('PATCH', { disabled: true })).status, 200);
  assert.ok(f.events.some(e => e[0] === 'authUpdate' && e[2].disabled));
  assert.ok(f.events.some(e => e[0] === 'revoke'));
  assert.equal(f.records.get('users/target').disabled, true);
});
test('deleting an account removes login and profile, preserving financial/job collections', async () => {
  const f = fixture(); assert.equal((await f.account('DELETE')).status, 200);
  assert.ok(f.events.some(e => e[0] === 'authDelete'));
  assert.deepEqual(f.events.filter(e => e[0] === 'delete').map(e => e[1]), ['users/target']);
  assert.ok(f.events.findIndex(e => e[0] === 'authDelete') < f.events.findIndex(e => e[0] === 'delete'));
});
test('administrator deletion is protected', async () => {
  const f = fixture({ target: { role: 'admin' } }); assert.equal((await f.account('DELETE')).status, 409); assert.equal(f.events.length, 0);
});
test('report correction writes changes, before/after audit, and notification together', async () => {
  const f = fixture({ job: { operatorNotes: 'Before' } });
  assert.equal((await f.job('PATCH', { operatorNotes: 'After', reason: 'Corrected service detail' })).status, 200);
  const audit = f.events.find(e => e[1] === 'adminActivity/event')[2];
  assert.equal(audit.previous.operatorNotes, 'Before'); assert.equal(audit.changes.operatorNotes, 'After');
  assert.ok(f.events.some(e => e[1] === 'adminNotifications/event'));
});
test('report editor cannot manufacture payment state or finalize missing evidence', async () => {
  assert.equal((await fixture().job('PATCH', { paymentStatus: 'paid' })).status, 400);
  assert.equal((await fixture().job('PATCH', { status: 'completed' })).status, 409);
  assert.equal((await fixture({ job: { paymentStatus: 'held' } }).job('PATCH', { status: 'cancelled' })).status, 409);
  assert.equal((await fixture({ job: { status: 'completed' } }).job('PATCH', { status: 'pending' })).status, 409);
});
test('completed service and payment records cannot be deleted through job management', async () => {
  for (const job of [{ status: 'completed' }, { paymentStatus: 'paid' }, { paymentStatus: 'held' }]) {
    const f = fixture({ job }); assert.equal((await f.job('DELETE')).status, 409); assert.ok(!f.events.some(e => e[0] === 'delete'));
  }
  assert.equal((await fixture({ role: 'employee' }).job('DELETE')).status, 403);
});
