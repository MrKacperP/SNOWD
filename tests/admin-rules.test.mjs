import test from 'node:test';
import fs from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';

test('CRM rules protect staff roles and suspended accounts while allowing admin records and evidence', { skip: !process.env.FIRESTORE_EMULATOR_HOST }, async () => {
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
  const env = await initializeTestEnvironment({ projectId: 'demo-snowd-admin-crm', firestore: { host, port: Number(port), rules: fs.readFileSync('firestore.rules', 'utf8') } });
  try {
    await env.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      for (const [id, role, disabled] of [['admin', 'admin', false], ['employee', 'employee', false], ['client', 'client', false], ['suspended', 'admin', true]]) await setDoc(doc(db, 'users', id), { role, disabled });
      await setDoc(doc(db, 'calls/call'), { notes: '' });
      await setDoc(doc(db, 'chats/chat'), { participants: ['client', 'operator'] });
      await setDoc(doc(db, 'messages/message'), { chatId: 'chat', senderId: 'client', content: 'Photo uploaded', metadata: { imageUrl: 'https://example.test/photo.png' } });
      await setDoc(doc(db, 'adminNotifications/notice'), { read: false });
    });
    const admin = env.authenticatedContext('admin').firestore();
    const employee = env.authenticatedContext('employee').firestore();
    const client = env.authenticatedContext('client').firestore();
    const suspended = env.authenticatedContext('suspended').firestore();
    await assertSucceeds(getDocs(collection(admin, 'users')));
    await assertSucceeds(getDoc(doc(admin, 'messages/message')));
    await assertSucceeds(getDoc(doc(admin, 'calls/call')));
    await assertSucceeds(updateDoc(doc(admin, 'adminNotifications/notice'), { read: true }));
    await assertSucceeds(updateDoc(doc(employee, 'users/client'), { verificationStatus: 'approved', idVerified: true }));
    await assertFails(updateDoc(doc(employee, 'users/employee'), { role: 'admin' }));
    await assertFails(updateDoc(doc(employee, 'users/client'), { disabled: true }));
    await assertFails(updateDoc(doc(client, 'users/client'), { disabled: true }));
    await assertFails(getDoc(doc(client, 'calls/call')));
    await assertFails(getDocs(collection(suspended, 'users')));
    await assertFails(updateDoc(doc(suspended, 'users/suspended'), { disabled: false }));
  } finally { await env.cleanup(); }
});
