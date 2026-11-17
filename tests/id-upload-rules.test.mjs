import { test } from 'node:test';
import fs from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

// The apps' ID upload used to also write idVerified, accountApproved and verificationNote, which
// only admins may change, so it failed with "Missing or insufficient permissions".
test('users can submit a government ID and transcript, but not mark themselves verified', { skip: !process.env.FIRESTORE_EMULATOR_HOST }, async () => {
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
  const env = await initializeTestEnvironment({ projectId: 'demo-snowd-id', firestore: { host, port: Number(port), rules: fs.readFileSync('firestore.rules', 'utf8') } });
  try {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      // A new customer starts approved; a new operator starts unverified.
      await setDoc(doc(db, 'users/client'), { role: 'client', idVerified: true, accountApproved: true, verificationStatus: 'approved' });
      await setDoc(doc(db, 'users/operator'), { role: 'operator', idVerified: false, accountApproved: false, verificationStatus: 'not-submitted' });
    });
    for (const uid of ['client', 'operator']) {
      const db = env.authenticatedContext(uid).firestore();
      const ref = doc(db, `users/${uid}`);
      await assertFails(updateDoc(ref, { idPhotoUrl: 'id.jpg', idVerified: false, accountApproved: false, verificationStatus: 'pending', verificationNote: '' }));
      await assertSucceeds(updateDoc(ref, { idPhotoUrl: 'id.jpg', verificationStatus: 'pending', idSubmittedAt: new Date() }));
      await assertSucceeds(updateDoc(ref, { studentTranscriptUrl: 'transcript.pdf', transcriptSubmittedAt: new Date() }));
      await assertFails(updateDoc(ref, { verificationStatus: 'approved' }));
      await assertFails(updateDoc(ref, { idVerified: uid !== 'client' }));
    }
  } finally {
    await env.cleanup();
  }
});
