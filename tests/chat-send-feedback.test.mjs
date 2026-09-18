import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the real send callback, including failure and overlapping submissions.
const file = ts.createSourceFile('chat.tsx', fs.readFileSync('src/app/dashboard/messages/[chatId]/page.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let callback;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(file) === 'sendMessage') callback = node.initializer.arguments[0].getText(file);
  ts.forEachChild(node, visit);
}
visit(file);
const code = ts.transpileModule(`exports.send = ${callback}`, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
function setup(commit = async () => {}) {
  let draft = 'Hello', error = '', commits = 0;
  const operations = [], busy = [], notifications = [];
  const context = {
    exports: {}, console: { error() {} },
    user: { uid: 'client', getIdToken: async () => 'test-token' },
    profile: { displayName: 'Client' }, chatId: 'chat', job: { id: 'order' }, db: {},
    sendingLock: { current: false },
    setSendingMessage: value => busy.push(value), setSendError: value => { error = value; },
    setNewMessage: update => { draft = typeof update === 'function' ? update(draft) : update; },
    notify: (...args) => notifications.push(args),
    Timestamp: { now: () => 123 }, increment: value => ({ increment: value }),
    collection: (_, path) => path, doc: (...args) => args.length === 1 ? 'new-message' : args.at(-1),
    getDoc: async () => ({ data: () => ({ participants: ['client', 'operator'], jobId: 'order' }) }),
    writeBatch: () => ({ set: (...args) => operations.push(['set', ...args]), update: (...args) => operations.push(['update', ...args]), commit: async () => { commits++; await commit(); } }),
    sendAdminNotif: async () => {}, fetch: async () => {},
  };
  vm.runInNewContext(code, context);
  return { send: context.exports.send, busy, operations, notifications, draft: () => draft, error: () => error, commits: () => commits, edit: value => { draft = value; } };
}
test('a sent message and its inbox preview commit together', async () => {
  const s = setup(); await s.send('Hello');
  assert.equal(s.commits(), 1);
  assert.deepEqual(s.operations.map(op => op[0]), ['set', 'update']);
  assert.equal(s.operations[0][2].content, 'Hello');
  assert.equal(s.operations[1][2].lastMessage, 'Hello');
  assert.equal(s.draft(), '');
  assert.deepEqual(s.busy, [true, false]);
});
test('failure keeps the draft and explains retry', async () => {
  const s = setup(async () => { throw Error('offline'); }); await s.send('Hello');
  assert.equal(s.draft(), 'Hello'); assert.match(s.error(), /draft is safe/);
  assert.deepEqual(s.busy, [true, false]);
});
test('overlapping sends commit once and preserve newly typed text', async () => {
  let release; const pending = new Promise(resolve => { release = resolve; });
  const s = setup(() => pending); const first = s.send('Hello');
  await s.send('Hello'); s.edit('Next message'); release(); await first;
  assert.equal(s.commits(), 1); assert.equal(s.draft(), 'Next message');
});
