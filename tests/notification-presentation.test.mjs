import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(path) {const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,encodeURIComponent});return exports;}
const { presentNotification } = load('src/lib/notificationPresentation.ts');

test('order events become plain titles with a next step', () => {
  const view = presentNotification({ type: 'job', jobId: 'j1', title: 'Order #1042 · New time proposed · approval needed' });
  assert.equal(view.title, 'New time suggested');
  assert.equal(view.action, 'Review time');
  assert.equal(view.needsAction, true);
  assert.equal(view.context, 'Order #1042');
  assert.equal(view.href, '/dashboard/jobs/j1');
});

test('arrival keeps the ETA', () => {
  const view = presentNotification({ type: 'job', jobId: 'j1', title: 'Order #7 · Operator is on the way · ETA 12 minutes' });
  assert.equal(view.title, 'Operator on the way');
  assert.equal(view.detail, 'Arriving in about 12 min.');
});

test('cash due wins over plain completion', () => {
  const view = presentNotification({ type: 'job', jobId: 'j1', title: 'Order #7 · Work completed · cash payment due' });
  assert.equal(view.kind, 'payment');
  assert.equal(view.action, 'Pay in cash');
  assert.equal(presentNotification({ type: 'job', jobId: 'j1', title: 'Order #7 · Work completed' }).action, 'View summary');
});

test('messages name the sender and offer a reply', () => {
  const view = presentNotification({ type: 'message', chatId: 'c 1', title: 'New message from Northside Snow', preview: 'On my way' });
  assert.equal(view.title, 'Northside Snow messaged you');
  assert.equal(view.action, 'Reply');
  assert.equal(view.href, '/dashboard/messages/c%201');
});

test('declined bookings point to finding someone else', () => {
  const view = presentNotification({ type: 'job', jobId: 'j1', title: 'Order #7 · Booking declined' });
  assert.equal(view.href, '/dashboard/find');
  assert.equal(view.needsAction, true);
});

test('unknown titles fall back without losing the text', () => {
  const view = presentNotification({ type: 'job', jobId: 'j1', title: 'Order #7 · Something new' });
  assert.equal(view.title, 'Something new');
  assert.equal(view.action, 'View order');
});
