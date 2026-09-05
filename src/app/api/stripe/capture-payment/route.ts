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
    const existing = await requireJobPaymentAccess(req, paymentIntentId, "capture");
    const paymentIntent = existing.status === "succeeded" ? existing : await stripe.paymentIntents.capture(paymentIntentId, {}, { idempotencyKey: `capture-${paymentIntentId}` });

    await syncStripePayment(paymentIntent);

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
