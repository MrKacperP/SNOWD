import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, collection, query, where, updateDoc, writeBatch } from 'firebase/firestore';

test('Firestore enforces verified cash listings, chat access, and server-owned payments and cash completion', { skip: !process.env.FIRESTORE_EMULATOR_HOST }, async () => {
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
  const env = await initializeTestEnvironment({ projectId: 'demo-snowd-audit', firestore: { host, port: Number(port), rules: fs.readFileSync('firestore.rules', 'utf8') } });
  try {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'users/client'), { role: 'client' });
      await setDoc(doc(db, 'users/operator'), { role: 'operator', idVerified: true });
      await setDoc(doc(db, 'users/unverified'), { role: 'operator', idVerified: false });
      await setDoc(doc(db, 'users/stranger'), { role: 'client' });
    });
    const client = env.authenticatedContext('client').firestore();
    const operator = env.authenticatedContext('operator').firestore();
    const stranger = env.authenticatedContext('stranger').firestore();
    const job = { clientId: 'client', operatorId: 'operator', status: 'pending', paymentStatus: 'pending', paymentMethod: 'cash', price: 100 };
    const booking = writeBatch(client);
    booking.set(doc(client, 'jobs/batch-job'), { ...job, chatId: 'batch-chat' });
    booking.set(doc(client, 'chats/batch-chat'), { jobId: 'batch-job', participants: ['client', 'operator'] });
    booking.set(doc(client, 'messages/batch-message'), { chatId: 'batch-chat', senderId: 'client', content: 'Cash booking requested' });
    await assertFails(booking.commit());
    await assertFails(setDoc(doc(client, 'jobs/cash'), job));
    await env.withSecurityRulesDisabled(async context => { await setDoc(doc(context.firestore(), 'jobs/cash'), { ...job, chatId: 'chat' }); });
    await assertFails(updateDoc(doc(client, 'jobs/cash'), { status: 'cancelled' }));
    await assertSucceeds(getDoc(doc(operator, 'jobs/cash')));
    // Chat-scoped queries must also carry the participant constraint.
    await assertFails(getDocs(query(collection(client, 'jobs'), where('chatId', '==', 'chat'))));
    for (const [database, field, uid] of [[client, 'clientId', 'client'], [operator, 'operatorId', 'operator']]) {
      const result = await assertSucceeds(getDocs(query(collection(database, 'jobs'), where(field, '==', uid), where('chatId', '==', 'chat'))));
      assert.equal(result.docs[0].id, 'cash');
    }
    await assertFails(setDoc(doc(client, 'jobs/forged-cash'), { ...job, cashConfirmedBy: 'operator' }));
    await assertFails(updateDoc(doc(operator, 'jobs/cash'), { paymentStatus: 'paid' }));
    await assertFails(setDoc(doc(operator, 'transactions/cash-cash'), { ...job, status: 'paid' }));
    await assertFails(updateDoc(doc(operator, 'jobs/cash'), { status: 'completed', completionPhotoUrl: 'photo.jpg' }));
    await env.withSecurityRulesDisabled(async context => {
      await updateDoc(doc(context.firestore(), 'jobs/cash'), { status: 'in-progress', paymentStatus: 'paid', cashConfirmedBy: 'operator' });
    });
    await assertFails(updateDoc(doc(operator, 'jobs/cash'), { status: 'completed' }));
    await assertFails(updateDoc(doc(client, 'jobs/cash'), { status: 'completed', completionPhotoUrl: 'photo.jpg' }));
    // Cash completion goes through the server so the payment reminder is atomic.
    await assertFails(updateDoc(doc(operator, 'jobs/cash'), { status: 'completed', completionPhotoUrl: 'photo.jpg' }));
    await assertFails(updateDoc(doc(client, 'jobs/cash'), { cashPaymentDeferredAt: new Date() }));
    await assertFails(updateDoc(doc(operator, 'jobs/cash'), { cashRefundedBy: 'operator' }));
    await env.withSecurityRulesDisabled(async context => {
      await updateDoc(doc(context.firestore(), 'jobs/cash'), { status: 'completed' });
    });
    await assertSucceeds(updateDoc(doc(client, 'jobs/cash'), { reviewSubmitted: true }));
    await assertFails(updateDoc(doc(client, 'jobs/cash'), { status: 'pending' }));
    await assertFails(updateDoc(doc(client, 'jobs/cash'), { status: 'cancelled' }));
    await assertFails(updateDoc(doc(operator, 'jobs/cash'), { price: 1 }));

    await assertFails(getDoc(doc(stranger, 'jobs/cash')));
    await assertFails(setDoc(doc(client, 'jobs/card'), { ...job, paymentMethod: 'credit' }));
    await assertFails(setDoc(doc(client, 'jobs/unverified'), { ...job, operatorId: 'unverified' }));
    await assertFails(updateDoc(doc(operator, 'users/operator'), { stripeAccountStatus: 'connected', stripeConnectAccountId: 'acct_fake' }));
    await assertFails(setDoc(doc(client, 'chats/chat'), { jobId: 'cash', participants: ['client', 'operator'] }));
    await env.withSecurityRulesDisabled(async context => { await setDoc(doc(context.firestore(), 'chats/chat'), { jobId: 'cash', participants: ['client', 'operator'] }); });
    await assertSucceeds(setDoc(doc(client, 'messages/message'), { chatId: 'chat', jobId: 'cash', senderId: 'client', text: 'fixture', read: false }));
    await assertSucceeds(updateDoc(doc(operator, 'messages/message'), { read: true }));
    // The inbox and message must commit together, including under rule rejection.
    const send = writeBatch(client);
    send.set(doc(client, 'messages/atomic-message'), { chatId: 'chat', jobId: 'cash', senderId: 'client', content: 'Arrival details', read: false });
    send.update(doc(client, 'chats/chat'), { lastMessage: 'Arrival details', 'unreadCount.operator': 1 });
    await assertSucceeds(send.commit());
    assert.equal((await getDoc(doc(operator, 'messages/atomic-message'))).data().content, 'Arrival details');
    assert.equal((await getDoc(doc(operator, 'chats/chat'))).data().unreadCount.operator, 1);
    const rejected = writeBatch(client);
    rejected.set(doc(client, 'messages/rejected-atomic'), { chatId: 'chat', jobId: 'cash', senderId: 'client', content: 'Do not store', read: false });
    rejected.update(doc(client, 'chats/chat'), { jobId: 'forbidden-change', lastMessage: 'Do not store' });
    await assertFails(rejected.commit());
    await env.withSecurityRulesDisabled(async context => {
      assert.equal((await getDoc(doc(context.firestore(), 'messages/rejected-atomic'))).exists(), false);
    });
    assert.equal((await getDoc(doc(client, 'chats/chat'))).data().lastMessage, 'Arrival details');
    await assertFails(updateDoc(doc(client, 'chats/chat'), { jobId: 'other' }));
    await assertFails(updateDoc(doc(client, 'messages/message'), { jobId: 'other' }));
    await assertFails(setDoc(doc(client, 'messages/wrong-order'), { chatId: 'chat', jobId: 'other', senderId: 'client', content: 'wrong' }));
    await assertFails(updateDoc(doc(operator, 'jobs/cash'), { scheduledDate: new Date(), awaitingResponseFrom: 'client' }));
    await env.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'chats/legacy'), { jobId: 'cash', participants: ['client', 'operator'], legacyHistory: true });
    });
    await assertSucceeds(getDoc(doc(client, 'chats/legacy')));
    await assertFails(setDoc(doc(client, 'messages/legacy-write'), { chatId: 'legacy', jobId: 'cash', senderId: 'client', content: 'new' }));
    await assertFails(updateDoc(doc(operator, 'messages/message'), { injected: true }));
    await assertFails(getDoc(doc(stranger, 'chats/chat')));
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'jobs/card'), { ...job, paymentMethod: 'credit', stripePaymentIntentId: 'pi_fixture' });
    });
    await assertFails(updateDoc(doc(client, 'jobs/card'), { paymentStatus: 'paid' }));
    await assertFails(updateDoc(doc(client, 'jobs/card'), { price: 1 }));
    await assertFails(updateDoc(doc(client, 'jobs/card'), { stripePaymentIntentId: 'pi_fake' }));
    await assertFails(setDoc(doc(client, 'transactions/pi_fixture'), { ...job, paymentMethod: 'credit', stripePaymentIntentId: 'pi_fixture', status: 'paid' }));
  } finally { await env.cleanup(); }
});
