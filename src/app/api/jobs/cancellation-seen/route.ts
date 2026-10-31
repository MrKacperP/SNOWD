import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { orderUser, validId, orderFailure } from "@/lib/workOrderServer";
import { Job } from "@/lib/types";

/** The party who did not cancel has now seen the cancellation; both dashboards clear it shortly after. */
export async function POST(request: NextRequest) {
  try {
    const uid = await orderUser(request), body = await request.json();
    if (!validId(body.jobId)) return NextResponse.json({ error: "Invalid job." }, { status: 400 });
    const db = getAdminDb();
    await db.runTransaction(async tx => {
      const ref = db.doc(`jobs/${body.jobId}`);
      const job = (await tx.get(ref)).data() as Job | undefined;
      if (!job || ![job.clientId, job.operatorId].includes(uid)) return;
      if (job.status !== "cancelled" || !job.cancellationNotice || job.cancellationSeenAt || job.cancelledBy === uid) return;
      tx.update(ref, { cancellationSeenAt: FieldValue.serverTimestamp() });
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return orderFailure(error);
  }
}
