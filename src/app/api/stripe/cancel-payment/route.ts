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

    // Cancel the held payment — refunds the authorization
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);

    return NextResponse.json({
      status: paymentIntent.status,
    });
  } catch (error: unknown) {
    console.error("Stripe cancel error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
