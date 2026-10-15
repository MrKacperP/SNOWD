import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getStripe } from "@/lib/stripe";
import { orderUser, validId, OrderError, orderFailure, orderEvent } from "@/lib/workOrderServer";
import { quoteMarketplace } from "@/lib/marketplacePricing";
import type { Job } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const uid = await orderUser(request);
    const body = await request.json();
    if (!validId(body.jobId) || body.cashPaymentAcknowledged !== true) throw new OrderError("Confirm that you will pay in cash.", 400);
    const db = getAdminDb(), ref = db.doc(`jobs/${body.jobId}`);
    const original = (await ref.get()).data();
    if (!original || original.clientId !== uid) throw new OrderError("Only the customer can change payment.", 403);
    if (!["pending", "accepted"].includes(original.status) || ["held", "paid"].includes(original.paymentStatus)) throw new OrderError("Payment cannot be changed at this stage. Contact support.");
    if (original.paymentMethod === "cash") return NextResponse.json({ success: true });
    if (original.stripePaymentIntentId) {
      const stripe = getStripe();
      const options = original.stripePaymentAccountId ? { stripeAccount: original.stripePaymentAccountId } : {};
      const payment = await stripe.paymentIntents.retrieve(original.stripePaymentIntentId, {}, options);
      if (payment.metadata.jobId !== body.jobId || payment.metadata.clientId !== uid) throw new OrderError("Payment does not match this work order.");
      if (!["requires_payment_method", "requires_confirmation", "requires_action", "canceled"].includes(payment.status)) throw new OrderError("Your card payment is processing or authorized. Check its status before changing payment.");
      // Cancellation must succeed before cash is offered, preventing a later card charge.
      if (payment.status !== "canceled") await stripe.paymentIntents.cancel(payment.id, {}, { ...options, idempotencyKey: `cash-switch-${payment.id}` });
    }
    await db.runTransaction(async tx => {
      const snapshot = await tx.get(ref), job = { ...snapshot.data(), id: body.jobId } as Job;
      if (job.clientId !== uid || !["pending", "accepted"].includes(job.status) || ["held", "paid"].includes(job.paymentStatus) || job.stripePaymentIntentId !== original.stripePaymentIntentId) throw new OrderError("The work order changed. Refresh and try again.");
      const quote = quoteMarketplace(job.operatorAmount ? job.operatorAmount / 100 : job.price, "cash");
      tx.update(ref, { ...quote, paymentMethod: "cash", requiresCardPayment: false, cashPaymentAcknowledged: true, paymentStatus: "pending", stripePaymentIntentId: FieldValue.delete(), stripePaymentAccountId: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() });
      orderEvent(tx, job, uid, "switched-to-cash", "Customer chose cash payment. Pay the operator after the work is complete.");
    });
    return NextResponse.json({ success: true });
  } catch (error) { return orderFailure(error); }
}
