import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';
import { OWNER_EMAIL } from '@/lib/admin/server';
import { OrderError, orderFailure } from '@/lib/workOrderServer';

// Only the verified Firebase identity can claim the owner role; profile email is not trusted.
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer /, '');
    const decoded = token ? await getAdminAuth().verifyIdToken(token, true).catch(() => null) : null;
    if (!decoded) throw new OrderError('Sign in again.', 401);
    const identity = await getAdminAuth().getUser(decoded.uid);
    if (identity.disabled || !identity.emailVerified || identity.email?.toLowerCase() !== OWNER_EMAIL)
      throw new OrderError('Sign in with the verified administrator email.', 403);
    const db = getAdminDb();
    await db.runTransaction(async tx => {
      const ref = db.doc(`users/${identity.uid}`);
      const profile = (await tx.get(ref)).data();
      const deleted = await tx.get(db.doc(`accountDeletionTombstones/${identity.uid}`));
      if (profile?.disabled || deleted.exists) throw new OrderError('This account is disabled.', 403);
      if (profile?.role === 'admin') return;
      tx.set(ref, { role: 'admin', email: identity.email, displayName: profile?.displayName || identity.displayName || 'SNOWD Admin', onboardingComplete: true, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      tx.set(db.collection('adminActivity').doc(), { actorUid: identity.uid, type: 'User', description: 'Verified owner activated administrator access', createdAt: FieldValue.serverTimestamp() });
    });
    return NextResponse.json({ success: true });
  } catch (error) { return orderFailure(error); }
}
