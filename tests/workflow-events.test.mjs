import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function events() {
  const exports = {}, writes = [];
  const code = ts.transpileModule(fs.readFileSync('src/lib/workOrderServer.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, console, require: id => {
    if (id === 'next/server') return {};
    if (id === 'firebase-admin/firestore') return { FieldValue: { serverTimestamp: () => 'now', increment: n => n } };
    if (id === '@/lib/firebaseAdmin') return { getAdminDb: () => ({ doc: path => path }) };
    throw new Error(id);
  } });
  const tx = { set: (path, data) => writes.push({ path, data }), update: (path, data) => writes.push({ path, data }) };
  return { orderEvent: (...args) => exports.orderEvent(tx, ...args), writes };
}
const job = { id: 'job', chatId: 'chat', clientId: 'client', operatorId: 'operator', orderNumber: '42' };
test('completion proof appears as an image message and notifies the customer in the same transaction', () => {
  const { orderEvent, writes } = events();
  orderEvent(job, 'operator', 'photo-event', 'Completion photo uploaded', 'https://example.test/proof.jpg');
  const message = writes.find(w => w.path === 'messages/job-photo-event').data;
  assert.equal(message.type, 'completion-photo');
  assert.equal(message.chatId, 'chat');
  assert.equal(message.metadata.completionPhotoUrl, 'https://example.test/proof.jpg');
  assert.equal(writes.find(w => w.path === 'notifications/job-photo-event').data.uid, 'client');
  assert.equal(writes.find(w => w.path === 'chats/chat').data['unreadCount.client'], undefined);
  assert.equal(writes.find(w => w.path === 'chats/chat').data.lastActivityTime, 'now');
});
test('ordinary progress events remain text and notify the other participant', () => {
  const { orderEvent, writes } = events();
  orderEvent(job, 'client', 'accept-event', 'Booking accepted');
  const message = writes.find(w => w.path === 'messages/job-accept-event').data;
  assert.equal(message.type, 'system');
  assert.equal(message.metadata, undefined);
  assert.equal(writes.find(w => w.path === 'notifications/job-accept-event').data.uid, 'operator');
});
test('on-my-way event becomes an ETA chat update for both participants', () => {
  const { orderEvent, writes } = events();
  orderEvent(job, 'operator', 'journey-event', 'Operator is on the way · ETA 12 minutes', undefined, { type: 'eta-update', metadata: { eta: 12 } });
  const message = writes.find(w => w.path === 'messages/job-journey-event').data;
  assert.equal(message.type, 'eta-update');
  assert.equal(message.metadata.eta, 12);
  assert.match(message.content, /ETA 12 minutes/);
  assert.equal(writes.find(w => w.path === 'notifications/job-journey-event').data.uid, 'client');
});

test('viewing progress clears its update but preserves unread messages and unrelated orders', () => {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/notificationReadState.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports });
  const viewed = exports.notificationWasViewed;
  assert.equal(viewed({ type: 'job', jobId: 'a', chatId: 'chat-a' }, '/dashboard/jobs/a'), true);
  assert.equal(viewed({ type: 'message', jobId: 'a', chatId: 'chat-a' }, '/dashboard/jobs/a'), false);
  assert.equal(viewed({ type: 'message', jobId: 'a', chatId: 'chat-a' }, '/dashboard/messages/chat-a'), true);
  assert.equal(viewed({ type: 'message', chatId: 'chat-b' }, '/dashboard/messages/chat-a'), false);
  assert.equal(viewed({ type: 'job', jobId: 'b' }, '/dashboard/jobs/a'), false);
  assert.equal(viewed({ type: 'job', jobId: 'a' }, '/dashboard/jobs'), false);
  assert.equal(viewed({ type: 'job', jobId: 'a', read: true }, '/dashboard/jobs/a'), false);
});
