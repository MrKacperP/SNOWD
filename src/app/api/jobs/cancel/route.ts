import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";
import { getStripe } from "@/lib/stripe";
import { syncStripePayment } from "@/lib/stripePaymentState";
import { Job } from "@/lib/types";
export async function POST(request: NextRequest) {
  let uid: string;
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
    if (!token) throw new Error();
    uid = (await getAdminAuth().verifyIdToken(token, true)).uid;
  } catch { return NextResponse.json({ error: "Please sign in again." }, { status: 401 }); }
  let jobId: unknown;
  try { ({ jobId } = await request.json()); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (typeof jobId !== "string" || !jobId || jobId.includes("/")) return NextResponse.json({ error: "Invalid job." }, { status: 400 });
  try {
    const db = getAdminDb();
    const result = await db.runTransaction(async transaction => {
      const ref = db.doc(`jobs/${jobId}`);
      const job = (await transaction.get(ref)).data() as Job | undefined;
      if (!job) return { error: "Job not found.", status: 404 };
      if (uid !== job.clientId && uid !== job.operatorId) return { error: "You cannot cancel this job.", status: 403 };
      if (job.status === "completed") return { error: "Completed jobs cannot be cancelled.", status: 409 };
      if (job.status !== "cancelled") {
        const now = FieldValue.serverTimestamp();
        transaction.update(ref, { status: "cancelled", revision: (job.revision || 0) + 1, scheduleProposal: null, awaitingResponseFrom: null, cancelledBy: uid, cancelledAt: now, updatedAt: now });
        transaction.set(db.doc(`jobs/${jobId}/events/cancelled`), { title: "Order cancelled", actorId: uid, createdAt: now });
        const recipient = uid === job.clientId ? job.operatorId : job.clientId;
        const message = `This job has been cancelled. ${job.paymentMethod === "cash" ? "Any cash already exchanged must be settled directly; the operator can record cash returned." : "Held card payments will be released. Captured payments require a refund through support."}`;
        transaction.set(db.doc(`notifications/${jobId}-cancelled`), { uid: recipient, type: "job", title: "Job cancelled", message, jobId, chatId: job.chatId || "", read: false, createdAt: now });
        if (job.chatId) {
          transaction.set(db.doc(`messages/${jobId}-cancelled`), { chatId: job.chatId, jobId, senderId: uid, senderName: "Job update", type: "status-update", content: message, metadata: { newStatus: "cancelled" }, read: false, createdAt: now });
          transaction.update(db.doc(`chats/${job.chatId}`), { lastMessage: message, lastMessageTime: now, [`unreadCount.${recipient}`]: FieldValue.increment(1) });
        }
      }
      return { job };
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    // Closing the job first prevents subsequent work/payment actions. Retrying this
    // endpoint on a cancelled job retries hold release without duplicate notices.
    let warning: string | undefined;
    if (result.job.stripePaymentIntentId) {
      try {
        const stripe = getStripe();
        const payment = await stripe.paymentIntents.retrieve(result.job.stripePaymentIntentId);
        if (payment.metadata.jobId !== jobId || payment.metadata.clientId !== result.job.clientId || payment.metadata.operatorId !== result.job.operatorId) throw new Error("Payment mismatch");
        if (payment.status === "succeeded") warning = "Job cancelled. The card payment was already captured; contact support to arrange a refund.";
        else {
          const released = payment.status === "canceled" ? payment : await stripe.paymentIntents.cancel(payment.id, {}, { idempotencyKey: `cancel-${payment.id}` });
          await syncStripePayment(released);
        }
      } catch {
        warning = "Job cancelled, but the card hold could not be released yet. Retry releasing the hold from this work order or contact support.";
      }
    }
    return NextResponse.json({ success: true, warning });
  } catch (error) {
    console.error("Job cancellation failed:", error);
    return NextResponse.json({ error: "Could not cancel this job. Please retry." }, { status: 500 });
  }
}
