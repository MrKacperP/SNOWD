import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

export async function POST(req: NextRequest) {
  try {
    const { paymentIntentId } = await req.json();

    if (!paymentIntentId) {
      return NextResponse.json({ error: "Missing paymentIntentId" }, { status: 400 });
    }

    // Capture the held funds — releases payment to snowd.ca
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);

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
