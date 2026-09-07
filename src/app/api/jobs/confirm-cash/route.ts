import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";
import { cashConfirmationError } from "@/lib/cashPayments";
import { Job } from "@/lib/types";

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return NextResponse.json({ error: "Sign in to confirm cash received." }, { status: 401 });
  let uid: string;
  try { uid = (await getAdminAuth().verifyIdToken(token, true)).uid; }
  catch { return NextResponse.json({ error: "Please sign in again." }, { status: 401 }); }
  let jobId: unknown;
  try { ({ jobId } = await request.json()); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (typeof jobId !== "string" || !jobId || jobId.includes("/")) return NextResponse.json({ error: "Invalid job." }, { status: 400 });
  try {
    const db = getAdminDb();
    const ref = db.doc(`jobs/${jobId}`);
    const receipt = db.doc(`transactions/${jobId}-cash`);
    const result = await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) return { error: "Job not found.", status: 404 };
      const job = snapshot.data() as Job;
      const error = cashConfirmationError(job, uid);
      if (error) return { error, status: 403 };
      const oldReceipt = await transaction.get(receipt);
      if (job.paymentStatus === "paid" && oldReceipt.exists) return { alreadyConfirmed: true };
      const amount = Math.round(job.price * 100);
      const now = FieldValue.serverTimestamp();
      transaction.update(ref, { paymentStatus: "paid", cashConfirmedBy: uid, cashConfirmedAt: now, updatedAt: now });
      transaction.set(receipt, {
        jobId, chatId: job.chatId || "", clientId: job.clientId, operatorId: job.operatorId,
        amount, cashReceived: amount, paymentMethod: "cash", status: "paid",
        description: `Cash payment for snow removal at ${job.address || "the service address"}`,
        address: job.address || "", serviceTypes: job.serviceTypes || [],
        confirmedBy: uid, confirmedAt: now, createdAt: now, updatedAt: now,
      }, { merge: true });
      return { alreadyConfirmed: false };
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ confirmed: true, ...result });
  } catch (error) {
    console.error("Cash confirmation failed:", error);
    return NextResponse.json({ error: "Could not confirm cash received. Please try again." }, { status: 500 });
  }
}
