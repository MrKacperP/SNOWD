import { NextRequest } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';
import { OrderError } from '@/lib/workOrderServer';

export const OWNER_EMAIL = 'kacperprymicz@gmail.com';
export async function requireAdministrator(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '');
  let uid: string;
  try { if (!token) throw new Error(); uid = (await getAdminAuth().verifyIdToken(token, true)).uid; }
  catch { throw new OrderError('Sign in again.', 401); }
  const db = getAdminDb();
  const profile = (await db.doc(`users/${uid}`).get()).data();
  if (profile?.role !== 'admin' || profile.disabled || (await db.doc(`accountDeletionTombstones/${uid}`).get()).exists)
    throw new OrderError('An active administrator account is required.', 403);
  return { uid, db, profile };
}
