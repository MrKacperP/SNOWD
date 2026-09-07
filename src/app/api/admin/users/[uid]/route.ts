import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';

async function manage(request: NextRequest, context: { params: Promise<{ uid: string }> }) {
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!token) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  let actor: string;
  try { actor = (await getAdminAuth().verifyIdToken(token, true)).uid; }
  catch { return NextResponse.json({ error: 'Sign in again.' }, { status: 401 }); }
  try {
    const db = getAdminDb();
    const caller = (await db.doc(`users/${actor}`).get()).data();
    if (caller?.role !== 'admin' || caller.disabled) return NextResponse.json({ error: 'Only an active administrator can manage accounts.' }, { status: 403 });
    const { uid } = await context.params;
    if (!uid || uid.includes('/')) return NextResponse.json({ error: 'Invalid account.' }, { status: 400 });
    const ref = db.doc(`users/${uid}`);
    const target = (await ref.get()).data();
    if (!target) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    if (uid === actor) return NextResponse.json({ error: 'Manage your own account in profile settings.' }, { status: 400 });
    const now = FieldValue.serverTimestamp();
    if (request.method === 'DELETE') {
      if (target.role === 'admin') return NextResponse.json({ error: 'Change this administrator to a client before deleting the account.' }, { status: 409 });
      // Disable first: a partial failure must never leave a deleted profile with an active login.
      try { await getAdminAuth().updateUser(uid, { disabled: true }); await getAdminAuth().revokeRefreshTokens(uid); }
      catch (error) { if ((error as { code?: string }).code !== 'auth/user-not-found') throw error; }
      await db.recursiveDelete(ref);
      try { await getAdminAuth().deleteUser(uid); }
      catch (error) { if ((error as { code?: string }).code !== 'auth/user-not-found') throw error; }
    } else {
      const body = await request.json();
      const allowed = ['displayName', 'email', 'phone', 'bio', 'role', 'disabled'];
      if (Object.keys(body).some(key => !allowed.includes(key))) return NextResponse.json({ error: 'Unsupported account field.' }, { status: 400 });
      if ((body.displayName !== undefined && (typeof body.displayName !== 'string' || !body.displayName.trim() || body.displayName.length > 120)) ||
          (body.email !== undefined && (typeof body.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))) ||
          (body.role !== undefined && !['client', 'operator', 'employee', 'admin'].includes(body.role)) ||
          (body.disabled !== undefined && typeof body.disabled !== 'boolean') ||
          ['phone', 'bio'].some(key => body[key] !== undefined && (typeof body[key] !== 'string' || body[key].length > 4000))) return NextResponse.json({ error: 'Check the account fields.' }, { status: 400 });
      const authUpdate = Object.fromEntries(Object.entries(body).filter(([key]) => ['displayName', 'email', 'disabled'].includes(key)));
      if (Object.keys(authUpdate).length) await getAdminAuth().updateUser(uid, authUpdate);
      if (body.disabled === true || body.role) await getAdminAuth().revokeRefreshTokens(uid);
      await ref.update({ ...body, updatedAt: now });
    }
    await db.collection('adminActivity').add({ actorUid: actor, actorRole: 'Admin', userName: caller.displayName || 'Admin', userAvatar: 'AD', type: 'User', targetId: uid, description: request.method === 'DELETE' ? 'deleted an account (job and payment history retained)' : 'updated an account', href: request.method === 'DELETE' ? '/admin/users' : `/admin/users/${uid}`, createdAt: now });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin account action failed', error);
    return NextResponse.json({ error: 'Account action could not finish. Refresh the account before retrying.' }, { status: 500 });
  }
}
export const PATCH = manage;
export const DELETE = manage;
