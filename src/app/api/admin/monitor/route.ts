import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import type { UserRecord } from 'firebase-admin/auth';
import { requireAdministrator } from '@/lib/admin/server';
import { getAdminAuth } from '@/lib/firebaseAdmin';
import { OrderError, orderFailure } from '@/lib/workOrderServer';

// Read-only monitoring feed for the admin web pages and the SNOWD Admin iOS app.
// Every timestamp is returned as epoch milliseconds so clients never parse Firestore's wire format.
export const runtime = 'nodejs';
const DAY = 86_400_000;
const MAX_AUTH_USERS = 5000;

const millis = (value: unknown): number | null => {
  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') { const parsed = Date.parse(value); return Number.isNaN(parsed) ? null : parsed; }
  return null;
};
const provider = (user: UserRecord) => {
  const id = user.providerData[0]?.providerId || (user.phoneNumber ? 'phone' : 'password');
  return ({ 'google.com': 'Google', 'apple.com': 'Apple', password: 'Email', phone: 'Phone' } as Record<string, string>)[id] || id;
};

async function authUsers() {
  const users: UserRecord[] = [];
  let pageToken: string | undefined;
  do {
    const page = await getAdminAuth().listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken && users.length < MAX_AUTH_USERS);
  return users;
}

async function profiles(db: FirebaseFirestore.Firestore, ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map<string, FirebaseFirestore.DocumentData>();
  const snaps = await db.getAll(...unique.map(id => db.doc(`users/${id}`)), { fieldMask: ['displayName', 'email', 'role', 'disabled', 'verificationStatus'] });
  return new Map(snaps.filter(s => s.exists).map(s => [s.id, s.data()!]));
}

/** Day buckets (oldest first) for the last `days` days, keyed by local midnight in UTC. */
function buckets(days: number, now: number) {
  const start = Math.floor(now / DAY) * DAY - (days - 1) * DAY;
  return Array.from({ length: days }, (_, i) => ({ day: start + i * DAY, value: 0 }));
}
function bump(series: { day: number; value: number }[], at: number | null, by = 1) {
  if (at === null) return;
  const index = Math.floor((at - series[0].day) / DAY);
  if (index >= 0 && index < series.length) series[index].value += by;
}

export async function GET(request: NextRequest) {
  try {
    const { db } = await requireAdministrator(request);
    const view = request.nextUrl.searchParams.get('view') || 'overview';
    const now = Date.now();

    if (view === 'overview') {
      const count = async (query: FirebaseFirestore.Query) => (await query.count().get()).data().count;
      const users = db.collection('users');
      const [accounts, operators, clients, pendingVerifications, openSupport, activeJobs, auth, recentPayments] = await Promise.all([
        count(users), count(users.where('role', '==', 'operator')), count(users.where('role', '==', 'client')),
        count(users.where('verificationStatus', '==', 'pending')),
        count(db.collection('supportChats').where('status', 'in', ['open', 'in-progress'])),
        count(db.collection('jobs').where('status', 'in', ['pending', 'accepted', 'en-route', 'in-progress'])),
        authUsers(),
        db.collection('transactions').where('createdAt', '>=', Timestamp.fromMillis(now - 30 * DAY)).limit(2000).get(),
      ]);
      const signIns = buckets(14, now), signUps = buckets(14, now), revenue = buckets(14, now);
      const providers: Record<string, number> = {};
      let signIns24h = 0, signIns7d = 0;
      for (const user of auth) {
        const last = millis(user.metadata.lastSignInTime), created = millis(user.metadata.creationTime);
        if (last !== null && now - last < DAY) signIns24h++;
        if (last !== null && now - last < 7 * DAY) signIns7d++;
        bump(signIns, last); bump(signUps, created);
        providers[provider(user)] = (providers[provider(user)] || 0) + 1;
      }
      let revenue30d = 0, payments30d = 0, refunded30d = 0, held = 0;
      for (const doc of recentPayments.docs) {
        const payment = doc.data(), amount = Number(payment.amount) || 0;
        if (payment.status === 'refunded') { refunded30d += amount; continue; }
        if (payment.status === 'held') { held += amount; continue; }
        if (payment.status !== 'paid') continue;
        revenue30d += amount; payments30d++;
        bump(revenue, millis(payment.createdAt), amount);
      }
      return NextResponse.json({
        generatedAt: now,
        stats: { accounts, operators, clients, pendingVerifications, openSupport, activeJobs, signIns24h, signIns7d, authUsers: auth.length, revenue30d, payments30d, refunded30d, held },
        series: { signIns, signUps, revenue },
        providers: Object.entries(providers).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      });
    }

    if (view === 'logins') {
      const auth = (await authUsers())
        .sort((a, b) => (millis(b.metadata.lastSignInTime) || 0) - (millis(a.metadata.lastSignInTime) || 0))
        .slice(0, 300);
      const known = await profiles(db, auth.map(u => u.uid));
      return NextResponse.json({
        generatedAt: now,
        items: auth.map(user => {
          const profile = known.get(user.uid);
          return {
            id: user.uid,
            name: profile?.displayName || user.displayName || user.email || user.phoneNumber || 'Unnamed account',
            email: user.email || profile?.email || null,
            phone: user.phoneNumber || null,
            provider: provider(user),
            role: profile?.role || null,
            verificationStatus: profile?.verificationStatus || null,
            disabled: user.disabled || !!profile?.disabled,
            emailVerified: user.emailVerified,
            lastSignIn: millis(user.metadata.lastSignInTime),
            lastRefresh: millis(user.metadata.lastRefreshTime),
            createdAt: millis(user.metadata.creationTime),
          };
        }),
      });
    }

    if (view === 'payments') {
      const before = Number(request.nextUrl.searchParams.get('before')) || 0;
      let query = db.collection('transactions').orderBy('createdAt', 'desc').limit(51);
      if (before > 0) query = query.startAfter(Timestamp.fromMillis(before));
      const docs = (await query.get()).docs;
      const page = docs.slice(0, 50).map(d => ({ ...d.data(), id: d.id }) as Record<string, unknown> & { id: string });
      const people = await profiles(db, page.flatMap(p => [String(p.clientId || ''), String(p.operatorId || '')]));
      const name = (id: unknown) => { const p = people.get(String(id || '')); return p?.displayName || p?.email || null; };
      return NextResponse.json({
        generatedAt: now,
        next: docs.length > 50 ? millis(page[49].createdAt) : null,
        items: page.map(p => ({
          id: p.id, jobId: p.jobId || null, status: p.status || 'pending', method: p.paymentMethod || (p.stripePaymentIntentId ? 'card' : 'cash'),
          amount: Number(p.amount) || 0, operatorAmount: Number(p.operatorAmount) || null, platformFee: Number(p.platformFee ?? p.applicationFee) || null,
          description: p.description || null, address: p.address || null,
          clientId: p.clientId || null, clientName: name(p.clientId), operatorId: p.operatorId || null, operatorName: name(p.operatorId),
          stripePaymentIntentId: p.stripePaymentIntentId || null, createdAt: millis(p.createdAt), updatedAt: millis(p.updatedAt),
        })),
      });
    }

    if (view === 'verifications') {
      const users = db.collection('users');
      const [pending, reviewed] = await Promise.all([
        users.where('verificationStatus', '==', 'pending').limit(100).get(),
        users.where('verificationStatus', 'in', ['approved', 'rejected']).limit(100).get(),
      ]);
      const shape = (d: FirebaseFirestore.QueryDocumentSnapshot) => {
        const u = d.data();
        return {
          id: d.id, name: u.displayName || u.email || 'Unnamed account', email: u.email || null, phone: u.phone || null, role: u.role || null,
          status: u.verificationStatus, idPhotoUrl: u.idPhotoUrl || null, note: u.verificationNote || null, reviewedBy: u.approvedByAdmin || null,
          submittedAt: millis(u.idSubmittedAt ?? u.verificationSubmittedAt ?? u.updatedAt), reviewedAt: millis(u.approvedAt ?? u.rejectedAt), createdAt: millis(u.createdAt),
        };
      };
      return NextResponse.json({
        generatedAt: now,
        pending: pending.docs.map(shape).sort((a, b) => (a.submittedAt || 0) - (b.submittedAt || 0)),
        reviewed: reviewed.docs.map(shape).sort((a, b) => (b.reviewedAt || 0) - (a.reviewedAt || 0)),
      });
    }

    throw new OrderError('Unknown view.', 400);
  } catch (error) { return orderFailure(error); }
}
