import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { orderUser, validId, OrderError, orderFailure } from "@/lib/workOrderServer";
import { approximateOperatorLocation } from "@/lib/operatorLocation";

export async function POST(request: NextRequest) {
  try {
    const uid = await orderUser(request);
    const body = await request.json();
    if (!validId(body.jobId)) throw new OrderError("Invalid work order.", 400);
    let location;
    try { location = approximateOperatorLocation(body.lat, body.lng, body.accuracy); }
    catch { throw new OrderError("Invalid location.", 400); }
    const db = getAdminDb();
    await db.runTransaction(async tx => {
      const ref = db.doc(`jobs/${body.jobId}`);
      const job = (await tx.get(ref)).data();
      if (!job || job.operatorId !== uid) throw new OrderError("Work order unavailable.", 403);
      if (!["accepted", "en-route"].includes(job.status)) throw new OrderError("Location sharing has ended.", 409);
      if (Date.now() - (job.operatorLocationUpdatedAt?.toMillis?.() || 0) < 15000) return;
      tx.update(ref, { ...location, operatorLocationUpdatedAt: FieldValue.serverTimestamp(), operatorLat: FieldValue.delete(), operatorLng: FieldValue.delete(), operatorLocationAccuracy: FieldValue.delete() });
    });
    return NextResponse.json({ success: true });
  } catch (error) { return orderFailure(error); }
}
