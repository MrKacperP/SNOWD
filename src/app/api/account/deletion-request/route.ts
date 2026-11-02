import { NextRequest, NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { requireStripeUser } from "@/lib/stripeConnectAuth";
import { getAdminDb } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  const user = await requireStripeUser(req).catch(() => null);
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const record = (await getAdminDb().doc(`accountDeletionRequests/${user.uid}`).get()).data();
  return NextResponse.json({ status: record?.status || null, dueAt: record?.dueAt?.toDate().toISOString() || null }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const user = await requireStripeUser(req).catch(() => null);
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (Date.now() / 1000 - user.auth_time > 300) return NextResponse.json({ error: "For security, sign in again before requesting deletion.", code: "recent_login_required" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (body?.confirmation !== "DELETE") return NextResponse.json({ error: "Confirm deletion to continue." }, { status: 400 });
  const db = getAdminDb();
  const request = db.doc(`accountDeletionRequests/${user.uid}`);
  await db.runTransaction(async tx => {
    if ((await tx.get(request)).exists) return;
    // This is client-reported SDK completion, not server proof of revocation.
    // The fulfilment action separately requires an administrator's review.
    tx.create(request, { uid: user.uid, email: user.email || null, status: "requested", requestedAt: FieldValue.serverTimestamp(), dueAt: Timestamp.fromMillis(Date.now() + 30 * 86400000), source: "self-service", appleRevocationReported: body.appleRevocationReported === true });
    tx.set(db.doc(`adminNotifications/account-deletion-${user.uid}`), {
      type: "account", title: "Account deletion requested", message: "Review and process this account deletion request within 30 days.",
      uid: user.uid, actionRequired: true, read: false, priority: "high",
      meta: { path: "/admin/account-deletions", uid: user.uid }, createdAt: FieldValue.serverTimestamp(),
    });
  });
  return NextResponse.json({ status: "requested" }, { status: 202, headers: { "Cache-Control": "no-store" } });
}
