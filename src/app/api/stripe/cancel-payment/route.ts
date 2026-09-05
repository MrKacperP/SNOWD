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

    // Cancel the held payment — refunds the authorization
    const existing = await requireJobPaymentAccess(req, paymentIntentId, "cancel");
    const paymentIntent = existing.status === "canceled" ? existing : await stripe.paymentIntents.cancel(paymentIntentId, {}, { idempotencyKey: `cancel-${paymentIntentId}` });

    await syncStripePayment(paymentIntent);

    return NextResponse.json({
      status: paymentIntent.status,
    });
  } catch (error: unknown) {
    console.error("Stripe cancel error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
