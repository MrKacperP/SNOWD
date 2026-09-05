import type Stripe from "stripe";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";

// The browser can close during checkout. Persist payment results on the server,
// both from API responses and signed webhooks, with one record per intent.
export async function syncStripePayment(payment: Stripe.PaymentIntent) {
  const jobId = payment.metadata.jobId;
  if (payment.metadata.platform !== "snowd.ca" || !jobId || jobId.includes("/")) {
    throw new Error("Payment is not associated with a SNOWD job.");
  }
  const status = payment.status === "requires_capture" ? "held"
    : payment.status === "succeeded" ? "paid"
    : payment.status === "canceled" ? "refunded" : "pending";
  const db = getAdminDb();
  const jobRef = db.doc(`jobs/${jobId}`);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(jobRef);
    const job = snapshot.data();
    if (!job || job.stripePaymentIntentId !== payment.id) return;
    if (job.clientId !== payment.metadata.clientId || job.operatorId !== payment.metadata.operatorId ||
      payment.currency !== "cad" || payment.amount !== Math.round(job.price * 100)) {
      throw new Error("Payment does not match the saved job.");
    }
    if (job.paymentStatus === status) return;
    // A delayed response from an earlier request cannot restore a released hold
    // or downgrade a captured payment. A new intent resets the job to pending.
    if (job.paymentStatus === "paid" || job.paymentStatus === "refunded") return;
    const now = FieldValue.serverTimestamp();
    transaction.update(jobRef, {
      paymentStatus: status, paymentMethod: "credit", updatedAt: now,
      ...(status === "paid" ? { paymentCapturedAt: now } : {}),
    });
    if (status !== "pending") {
      transaction.set(db.doc(`transactions/${payment.id}`), {
        jobId, chatId: job.chatId || "", clientId: job.clientId, operatorId: job.operatorId,
        amount: payment.amount, paymentMethod: "credit", status,
        stripePaymentIntentId: payment.id,
        description: `Snow removal at ${job.address || "customer address"}`,
        serviceTypes: job.serviceTypes || [], address: job.address || "",
        createdAt: job.createdAt || now, updatedAt: now,
        ...(status === "paid" ? { completedAt: now } : {}),
      }, { merge: true });
    }
  });
  return { status: payment.status, paymentStatus: status };
}
