import { getAdminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { requireJobPaymentAccess } from "@/lib/stripeConnectAuth";
import { syncStripePayment } from "@/lib/stripePaymentState";
import { getStripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    const { paymentIntentId } = await req.json();

    if (!paymentIntentId) {
      return NextResponse.json({ error: "Missing paymentIntentId" }, { status: 400 });
    }

    // Capture the held funds — releases payment to snowd.ca
    const { payment: existing, stripeAccount, administrator, actorUid, jobId } = await requireJobPaymentAccess(req, paymentIntentId, "capture");
    if (administrator) await getAdminDb().doc(`adminActivity/capture-${paymentIntentId}`).set({ actorUid, type: "Transaction", targetId: jobId, description: "Requested capture of card payment", createdAt: FieldValue.serverTimestamp() }, { merge: true });
    const paymentIntent = existing.status === "succeeded" ? existing : await stripe.paymentIntents.capture(paymentIntentId, {}, { stripeAccount, idempotencyKey: `capture-${paymentIntentId}` });

    await syncStripePayment(paymentIntent, stripeAccount);

    return NextResponse.json({
      status: paymentIntent.status,
      amount: paymentIntent.amount_received / 100,
    });
  } catch (error: unknown) {
    console.error("Stripe capture error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
