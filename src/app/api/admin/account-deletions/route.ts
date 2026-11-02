import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireStripeUser } from "@/lib/stripeConnectAuth";
export async function GET(req: NextRequest) {
  const user = await requireStripeUser(req).catch(() => null);
  if (!user || (await getAdminDb().doc(`users/${user.uid}`).get()).data()?.role !== "admin") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const records = await getAdminDb().collection("accountDeletionRequests").orderBy("requestedAt", "asc").limit(100).get();
  return NextResponse.json({ requests: records.docs.map(doc => ({ uid: doc.id, ...doc.data(), requestedAt: doc.data().requestedAt?.toDate().toISOString(), dueAt: doc.data().dueAt?.toDate().toISOString() })) }, { headers: { "Cache-Control": "no-store" } });
}
