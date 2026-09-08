import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";
import { getDistanceKm, isClientWithinOperatorRadius, isOperatorPublic } from "@/lib/operatorDiscovery";
import { ClientProfile, OperatorProfile } from "@/lib/types";

async function operatorFor(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) throw new Error("Please sign in again.");
  const { uid } = await getAdminAuth().verifyIdToken(token, true);
  const data = (await getAdminDb().doc(`users/${uid}`).get()).data() as OperatorProfile;
  if (!data || data.role !== "operator" || !isOperatorPublic(data)) throw new Error("Verify your ID and turn on availability to connect with nearby clients.");
  return { ...data, uid };
}
export async function GET(request: NextRequest) {
  try {
    const operator = await operatorFor(request);
    const snapshot = await getAdminDb().collection("users").where("role", "==", "client").get();
    const clients = snapshot.docs.flatMap(doc => {
      const client = doc.data() as ClientProfile;
      return client.onboardingComplete && isClientWithinOperatorRadius(client, operator)
        ? [{ uid: doc.id, displayName: client.displayName, city: client.city, distanceKm: getDistanceKm(client, operator) }] : [];
    }).sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    return NextResponse.json({ clients });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load nearby clients." }, { status: 403 });
  }
}
export async function POST(request: NextRequest) {
  try {
    const operator = await operatorFor(request);
    const { clientId } = await request.json();
    if (typeof clientId !== "string" || !clientId || clientId.includes("/")) return NextResponse.json({ error: "Invalid client." }, { status: 400 });
    const db = getAdminDb();
    const client = (await db.doc(`users/${clientId}`).get()).data() as ClientProfile;
    if (!client || client.role !== "client" || !client.onboardingComplete || !isClientWithinOperatorRadius(client, operator)) return NextResponse.json({ error: "This client is outside your service area." }, { status: 409 });
    const ref = db.doc(`notifications/booking-invite-${operator.uid}-${clientId}`);
    await db.runTransaction(async transaction => {
      if ((await transaction.get(ref)).exists) return;
      transaction.set(ref, { uid: clientId, operatorId: operator.uid, type: "booking-invite", title: "Nearby operator available", message: `${operator.displayName} serves your area and invited you to book snow removal. Cash payment is available.`, read: false, createdAt: FieldValue.serverTimestamp() });
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not send invitation." }, { status: 403 });
  }
}
