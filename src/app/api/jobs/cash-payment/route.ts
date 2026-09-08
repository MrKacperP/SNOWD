import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";
import { Job } from "@/lib/types";

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  let uid: string;
  try { if (!token) throw new Error(); uid = (await getAdminAuth().verifyIdToken(token, true)).uid; }
  catch { return NextResponse.json({ error: "Please sign in again." }, { status: 401 }); }
  let jobId: unknown, action: unknown;
  try { ({ jobId, action } = await request.json()); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (typeof jobId !== "string" || !jobId || jobId.includes("/") || !["defer", "complete", "refund"].includes(String(action))) {
    return NextResponse.json({ error: "Invalid cash payment action." }, { status: 400 });
  }
  try {
    const db = getAdminDb();
    const result = await db.runTransaction(async transaction => {
      const ref = db.doc(`jobs/${jobId}`);
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) return { error: "Job not found.", status: 404 };
      const job = snapshot.data() as Job;
      if (uid !== (action === "defer" ? job.clientId : job.operatorId)) return { error: "You cannot perform this action for this job.", status: 403 };
      if (job.paymentMethod !== "cash" || job.stripePaymentIntentId || !Number.isFinite(job.price) || job.price <= 0) return { error: "A valid cash job is required.", status: 409 };
      if (job.status === "cancelled" && action !== "refund") return { error: "This job is cancelled.", status: 409 };
      const now = FieldValue.serverTimestamp();
      let message: string;
      let title: string;
      if (action === "defer") {
        if (job.status === "completed" || job.paymentStatus === "paid") return { error: "This payment can no longer be deferred.", status: 409 };
        if (job.cashPaymentDeferredAt && job.paymentStatus === "pending") return { alreadyApplied: true };
        transaction.update(ref, { paymentStatus: "pending", cashPaymentDeferredAt: now, cashPaymentAcknowledged: true, updatedAt: now });
        title = "Cash payment needed";
        message = `The client will pay $${job.price} CAD in cash after the work. No prepayment is held through Stripe. Collect payment directly; proceeding without prepayment is at your own risk.`;
      } else if (action === "complete") {
        if (job.status === "completed") return { alreadyApplied: true };
        if (job.status !== "in-progress" || !job.completionPhotoUrl) return { error: "Start the work and upload a completion photo first.", status: 409 };
        transaction.update(ref, { status: "completed", completionTime: now, paymentStatus: job.paymentStatus === "paid" ? "paid" : "pending", updatedAt: now });
        title = job.paymentStatus === "paid" ? "Job complete" : "Cash payment due";
        message = job.paymentStatus === "paid" ? "Your work order is complete and cash payment has been received." : `Your work order is complete. Please pay $${job.price} CAD directly to the operator. Payment stays pending until the operator confirms cash received.`;
      } else {
        if (job.status === "completed") return { error: "Cash refunds can only be recorded before work is completed.", status: 409 };
        if (job.paymentStatus === "refunded") return { alreadyApplied: true };
        if (job.paymentStatus !== "paid") return { error: "There is no confirmed cash payment to refund.", status: 409 };
        transaction.update(ref, { paymentStatus: "refunded", cashRefundedAt: now, cashRefundedBy: uid, updatedAt: now });
        transaction.set(db.doc(`transactions/${jobId}-cash`), { jobId, clientId: job.clientId, operatorId: job.operatorId, chatId: job.chatId || "", amount: Math.round(job.price * 100), paymentMethod: "cash", status: "refunded", refundedAt: now, refundedBy: uid, updatedAt: now }, { merge: true });
        title = "Cash refund recorded";
        message = `The operator confirmed that $${job.price} CAD was returned to you in cash. No electronic refund was issued. ${job.status === "cancelled" ? "Your job remains cancelled." : "Your unfinished job remains open; cancel it if the work is no longer needed."}`;
      }
      const recipient = action === "defer" ? job.operatorId : job.clientId;
      transaction.set(db.doc(`notifications/${jobId}-cash-${action}`), { uid: recipient, type: "payment", title, message, jobId, chatId: job.chatId || "", read: false, createdAt: now });
      if (job.chatId) {
        transaction.set(db.doc(`messages/${jobId}-cash-${action}`), { chatId: job.chatId, jobId, senderId: uid, senderName: "Cash payment update", type: "payment", content: message, read: false, createdAt: now });
        transaction.update(db.doc(`chats/${job.chatId}`), { lastMessage: message, lastMessageTime: now, [`unreadCount.${recipient}`]: FieldValue.increment(1) });
      }
      return { alreadyApplied: false };
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Cash payment action failed:", error);
    return NextResponse.json({ error: "Could not update this cash payment. Please try again." }, { status: 500 });
  }
}
