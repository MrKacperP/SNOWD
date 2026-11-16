import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import ts from 'typescript';

function setup() {
  const records = new Map();
  let minted = 0;
  const source = ts.transpileModule(fs.readFileSync('src/app/api/auth/qr/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  const db = {
    collection: () => ({ doc: id => ({ id, get: async () => ({ exists: records.has(id), data: () => records.get(id) }), set: async value => records.set(id, value) }) }),
    runTransaction: async action => action({ get: async ref => ({ data: () => records.get(ref.id) }), update: (ref, value) => records.set(ref.id, { ...records.get(ref.id), ...value }) }),
  };
  const next = { NextResponse: { json: (data, options) => ({ data, ...options, cookies: { set(name, value) { this[name] = value; } } }) } };
  vm.runInNewContext(source, { exports, console, Date, require: name => name === 'node:crypto' ? crypto : name === 'next/server' ? next : { getAdminDb: () => db, getAdminAuth: () => ({ verifyIdToken: async token => { if (token !== 'valid') throw Error('invalid'); return { uid: 'user-1' }; }, createCustomToken: async uid => { minted++; return `token:${uid}`; } }) } });
  const call = (body, cookie = '', bearer = '', origin = 'https://snowd.ca') => exports.POST({ json: async () => body, nextUrl: { origin: 'https://snowd.ca', protocol: 'https:' }, headers: { get: name => name === 'origin' ? origin : bearer }, cookies: { get: () => cookie ? { value: cookie } : undefined } });
  return { call, records, minted: () => minted };
}

test('QR requires native approval and browser secret; can only be consumed once', async () => {
  const s = setup();
  const created = await s.call({ action: 'create' });
  const { id } = created.data;
  const cookie = created.cookies['snowd-qr-browser'];
  assert.equal((await s.call({ action: 'poll', id }, cookie)).data.status, 'pending');
  assert.equal((await s.call({ action: 'approve', id })).status, 401);
  assert.equal((await s.call({ action: 'approve', id }, '', 'Bearer invalid')).status, 401);
  assert.equal((await s.call({ action: 'approve', id }, '', 'Bearer valid', null)).data.approved, true);
  assert.equal((await s.call({ action: 'approve', id }, '', 'Bearer valid')).status, 410);
  assert.equal((await s.call({ action: 'poll', id })).status, 403);
  assert.equal((await s.call({ action: 'poll', id }, `${id}.${'a'.repeat(64)}`)).status, 410);
  assert.equal(s.minted(), 0);
  assert.equal((await s.call({ action: 'poll', id }, cookie)).data.token, 'token:user-1');
  assert.equal((await s.call({ action: 'poll', id }, cookie)).status, 410);
  assert.equal(s.minted(), 1);
});

test('QR rejects foreign origins, expired sessions and malformed identifiers', async () => {
  const s = setup();
  assert.equal((await s.call({ action: 'create' }, '', '', 'https://other.example')).status, 403);
  assert.equal((await s.call({ action: 'poll', id: '../users' })).status, 400);
  const created = await s.call({ action: 'create' });
  const { id } = created.data;
  s.records.get(id).expiresAt = Date.now() - 1;
  assert.equal((await s.call({ action: 'approve', id }, '', 'Bearer valid')).status, 410);
  assert.equal((await s.call({ action: 'poll', id }, created.cookies['snowd-qr-browser'])).status, 410);
  assert.equal(s.minted(), 0);
});
