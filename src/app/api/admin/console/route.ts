import { NextRequest, NextResponse } from 'next/server';
import { FieldPath, FieldValue } from 'firebase-admin/firestore';
import { requireAdministrator } from '@/lib/admin/server';
import { getAdminAuth } from '@/lib/firebaseAdmin';
import { DEFAULT_POLICY, validatePolicy } from '@/lib/admin/pricing';
import { OrderError, orderFailure, validId } from '@/lib/workOrderServer';

const collections: Record<string, string> = { accounts: 'users', verifications: 'users', jobs: 'jobs', support: 'supportChats', payments: 'transactions', activity: 'adminActivity' };
function text(value: unknown, max = 4000) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new OrderError('Enter a valid value.', 400);
  return value.trim();
}
export async function GET(request: NextRequest) {
  try {
    const { db } = await requireAdministrator(request);
    const section = request.nextUrl.searchParams.get('section') || 'jobs';
    if (section === 'pricing') return NextResponse.json({ policy: (await db.doc('settings/marketplacePricing').get()).data() || DEFAULT_POLICY });
    const name = collections[section];
    if (!name) throw new OrderError('Unknown section.', 400);
    const id = request.nextUrl.searchParams.get('id');
    if (id) {
      if (!validId(id)) throw new OrderError('Invalid record.', 400);
      const snap = await db.doc(`${name}/${id}`).get();
      if (!snap.exists) throw new OrderError('Record not found.', 404);
      const messages = section === 'support' ? (await snap.ref.collection('messages').orderBy('createdAt', 'desc').limit(100).get()).docs.map(d => ({ ...d.data(), id: d.id })).reverse() : undefined;
      return NextResponse.json({ item: { ...snap.data(), id: snap.id }, messages });
    }
    let query = db.collection(name).orderBy(FieldPath.documentId()).limit(51);
    if (section === 'verifications') query = query.where('verificationStatus', '==', 'pending');
    const after = request.nextUrl.searchParams.get('after');
    if (after) { if (!validId(after)) throw new OrderError('Invalid cursor.', 400); query = query.startAfter(after); }
    const docs = (await query.get()).docs;
    return NextResponse.json({ items: docs.slice(0, 50).map(d => ({ ...d.data(), id: d.id })), next: docs.length > 50 ? docs[49].id : null });
  } catch (error) { return orderFailure(error); }
}

export async function POST(request: NextRequest) {
  try {
    const { uid, db, profile } = await requireAdministrator(request);
    const body = await request.json();
    if (!validId(body.requestId)) throw new OrderError('Invalid action reference.', 400);
    const receipt = db.doc(`adminActions/${uid}-${body.requestId}`);
    const now = FieldValue.serverTimestamp();
    if (body.action === 'create-account') {
      const email = text(body.email, 254).toLowerCase(), displayName = text(body.displayName, 120);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !['client', 'operator'].includes(body.role)) throw new OrderError('Enter an email and choose client or operator.', 400);
      // A deterministic UID makes retries safe across partial Auth/Firestore failures.
      const accountUid = `admin-created-${body.requestId}`;
      if (!(await receipt.get()).exists) {
        try { await getAdminAuth().createUser({ uid: accountUid, email, displayName, emailVerified: false }); }
        catch (error) {
          if ((error as { code?: string }).code !== 'auth/uid-already-exists') throw new OrderError('Account could not be created. The email may already be registered.', 409);
          const existing = await getAdminAuth().getUser(accountUid);
          if (existing.email !== email) throw new OrderError('Retry with the original account details.', 409);
        }
        await db.runTransaction(async tx => {
          if ((await tx.get(receipt)).exists) return;
          tx.create(db.doc(`users/${accountUid}`), { uid: accountUid, email, displayName, role: body.role, onboardingComplete: false, addedByAdmin: uid, createdAt: now });
          tx.set(receipt, { action: body.action, targetId: accountUid, createdAt: now });
          tx.set(db.collection('adminActivity').doc(), { actorUid: uid, type: 'User', description: 'Created account', targetId: accountUid, createdAt: now });
        });
      }
      return NextResponse.json({ success: true, uid: accountUid, message: 'Account created. The user can use Forgot password to set their password.' });
    }
    const result = await db.runTransaction(async tx => {
      const prior = await tx.get(receipt);
      if (prior.exists) return prior.data()?.result || {};
      const id = body.id;
      if (body.action !== 'pricing' && !validId(id)) throw new OrderError('Invalid record.', 400);
      let targetId = id || 'marketplacePricing';
      let response: Record<string, unknown> = {};
      if (body.action === 'verification') {
        if (!['approved', 'rejected'].includes(body.decision)) throw new OrderError('Choose approve or reject.', 400);
        const ref = db.doc(`users/${id}`), user = (await tx.get(ref)).data();
        if (!user?.idPhotoUrl) throw new OrderError('No identity document was submitted.', 409);
        const approved = body.decision === 'approved';
        const note = approved ? '' : text(body.note);
        tx.update(ref, { verificationStatus: body.decision, idVerified: approved, accountApproved: approved, approvedAt: approved ? now : null, rejectedAt: approved ? null : now, approvedByAdmin: approved ? profile.displayName || 'Admin' : null, reviewedByAdminUid: uid, verificationReasonCategory: approved ? null : 'other', verificationNote: note });
        tx.set(db.collection('notifications').doc(), { uid: id, type: approved ? 'account_approved' : 'account_rejected', title: approved ? 'Account approved' : 'Verification needs attention', message: approved ? 'Your ID verification has been approved.' : note, read: false, createdAt: now });
      } else if (body.action === 'pricing') {
        let policy;
        try { policy = validatePolicy(body.policy); } catch (error) { throw new OrderError((error as Error).message, 400); }
        const ref = db.doc('settings/marketplacePricing');
        const previous = (await tx.get(ref)).data() || DEFAULT_POLICY;
        if (JSON.stringify(body.previous) !== JSON.stringify({ commissionPercent: previous.commissionPercent, transactionFeeCents: previous.transactionFeeCents, discountPercent: previous.discountPercent })) throw new OrderError('Pricing changed. Refresh before saving.', 409);
        tx.set(ref, { ...policy, updatedBy: uid, updatedAt: now });
        response = { policy };
      } else if (body.action === 'support-open') {
        const user = (await tx.get(db.doc(`users/${id}`))).data();
        if (!user) throw new OrderError('Account not found.', 404);
        const ref = db.doc(`supportChats/support_${id}`);
        const existing = await tx.get(ref);
        if (!existing.exists) tx.set(ref, { userId: id, userName: user.displayName || user.email || 'User', status: 'open', subject: 'Account support', createdAt: now, updatedAt: now });
        targetId = ref.id;
        response = { id: ref.id };
      } else if (body.action === 'support-reply' || body.action === 'support-status') {
        const ref = db.doc(`supportChats/${id}`), chat = (await tx.get(ref)).data();
        if (!chat) throw new OrderError('Support conversation not found.', 404);
        if (body.action === 'support-status') {
          if (!['open', 'in-progress', 'resolved'].includes(body.status)) throw new OrderError('Invalid support status.', 400);
          tx.update(ref, { status: body.status, updatedAt: now });
        } else {
          const content = text(body.message);
          tx.set(ref.collection('messages').doc(body.requestId), { senderId: 'SNOWD_ADMIN', senderName: 'SNOWD Support', actorUid: uid, content, createdAt: now, read: false });
          tx.update(ref, { status: 'in-progress', lastMessage: content, lastMessageTime: now, updatedAt: now });
          const recipient = chat.userId || chat.uid;
          if (recipient) tx.set(db.collection('notifications').doc(), { uid: recipient, type: 'support', title: 'SNOWD Support', message: content, read: false, createdAt: now });
        }
      } else throw new OrderError('Unsupported admin action.', 400);
      tx.set(receipt, { action: body.action, targetId, result: response, createdAt: now });
      tx.set(db.collection('adminActivity').doc(), { actorUid: uid, userName: profile.displayName || 'Admin', actorRole: 'Admin', type: body.action.startsWith('support') ? 'Support' : body.action === 'verification' ? 'Verification' : 'User', description: body.action, targetId, changes: body.action === 'pricing' ? body.policy : body.decision || body.status || null, createdAt: now });
      return response;
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) { return orderFailure(error); }
}
