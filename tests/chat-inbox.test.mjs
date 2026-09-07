import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function inbox() {
  const states = [], watches = [];
  let effect;
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('src/hooks/useUserChats.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { exports, require: name => {
    if (name === 'react') return { useEffect: fn => { effect = fn; }, useState: initial => { const index = states.length; states.push(initial); return [initial, value => { states[index] = value; }]; } };
    if (name === 'firebase/firestore') return {
      collection: (_, path) => ({ path }), doc: (_, collection, id) => ({ path: `${collection}/${id}` }),
      where: (field, op, value) => ({ field, op, value }), query: (source, filter) => ({ ...source, filter }),
      onSnapshot: (source, next, error) => { const watcher = { source, next, error, stopped: false }; watches.push(watcher); return () => { watcher.stopped = true; }; },
    };
    if (name === '@/lib/firebase') return { db: {} };
    throw new Error(name);
  } });
  exports.useUserChats('client', 'client');
  const cleanup = effect();
  return { states, watches, cleanup };
}
const snapshot = docs => ({ docs: docs.map(([id, data]) => ({ id, data: () => data })) });

test('inbox keeps the live participant query when allowed', () => {
  const { states, watches, cleanup } = inbox();
  watches[0].next(snapshot([['chat', { participants: ['client', 'operator'], unreadCount: { client: 2 } }]]));
  assert.equal(states[0][0].unreadCount.client, 2);
  assert.equal(states[1], false);
  assert.equal(states[2], false);
  assert.equal(watches.length, 1);
  cleanup();
  assert.equal(watches[0].stopped, true);
});

test('legacy list denial falls back to own jobs and live individual chats', () => {
  const { states, watches, cleanup } = inbox();
  watches[0].error({ code: 'permission-denied' });
  assert.equal(watches[1].source.filter.field, 'clientId');
  assert.equal(watches[1].source.filter.value, 'client');
  watches[1].next(snapshot([['job', { chatId: 'chat' }], ['duplicate', { chatId: 'chat' }]]));
  assert.equal(watches.length, 3);
  assert.equal(watches[2].source.path, 'chats/chat');
  watches[2].next({ exists: () => true, data: () => ({ participants: ['client', 'operator'], lastMessage: 'first' }) });
  watches[2].next({ exists: () => true, data: () => ({ participants: ['client', 'operator'], lastMessage: 'updated' }) });
  assert.equal(states[0][0].lastMessage, 'updated');
  assert.equal(states[1], false);
  watches[1].next(snapshot([]));
  assert.equal(states[0].length, 0);
  assert.equal(watches[2].stopped, true);
  cleanup();
  assert.ok(watches.every(watcher => watcher.stopped));
});

test('denied individual chats display a failure instead of a false empty inbox', () => {
  const { states, watches, cleanup } = inbox();
  watches[0].error({ code: 'permission-denied' });
  watches[1].next(snapshot([['job', { chatId: 'chat' }]]));
  watches[2].error({ code: 'permission-denied' });
  assert.equal(states[2], true);
  assert.equal(states[1], false);
  cleanup();
});
