import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    if (!secretKey || !publishableKey) {
      return NextResponse.json(
        {
          error: "Stripe is not fully configured. Please set both STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.",
        },
        { status: 500 }
      );
    }

    const secretIsTest = secretKey.startsWith("sk_test_");
    const secretIsLive = secretKey.startsWith("sk_live_");
    const publishableIsTest = publishableKey.startsWith("pk_test_");
    const publishableIsLive = publishableKey.startsWith("pk_live_");

    if ((secretIsTest && publishableIsLive) || (secretIsLive && publishableIsTest)) {
      return NextResponse.json(
        {
          error:
            "Stripe key mode mismatch: your secret and publishable keys must both be test or both be live.",
        },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const { amount, jobId, clientId, operatorId, description, operatorStripeAccountId } = await req.json();

    if (!amount || !jobId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const amountInCents = Math.round(amount * 100);

    // Build PaymentIntent params
    const params: Stripe.PaymentIntentCreateParams = {
      amount: amountInCents,
      currency: "cad",
      capture_method: "manual", // Hold funds, capture later on job completion
      metadata: {
        jobId,
        clientId: clientId || "",
        operatorId: operatorId || "",
        platform: "snowd.ca",
      },
      description: description || `Snow removal job ${jobId}`,
    };

    // If operator has a Stripe Connect account, set up transfer
    if (operatorStripeAccountId) {
      // Platform takes 15% fee, operator gets 85%
      const platformFee = Math.round(amountInCents * 0.15);
      params.application_fee_amount = platformFee;
      params.transfer_data = {
        destination: operatorStripeAccountId,
      };
    }

    const paymentIntent = await stripe.paymentIntents.create(params);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: unknown) {
    console.error("Stripe error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
