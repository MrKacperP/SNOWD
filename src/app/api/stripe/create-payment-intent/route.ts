import { NextRequest, NextResponse } from "next/server";
import { requireStripeUser } from "@/lib/stripeConnectAuth";
import { getAdminDb } from "@/lib/firebaseAdmin";
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
    const user = await requireStripeUser(req);
    const { jobId } = await req.json();
    if (typeof jobId !== "string" || !jobId || jobId.includes("/")) return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
    const jobRef = getAdminDb().doc(`jobs/${jobId}`);
    const job = (await jobRef.get()).data();
    if (!job || job.clientId !== user.uid) return NextResponse.json({ error: "Only this job's customer can pay" }, { status: 403 });
    if (job.status !== "accepted" || job.paymentStatus === "paid" || job.paymentStatus === "held") return NextResponse.json({ error: "This job does not need a new payment" }, { status: 409 });
    const { clientId, operatorId } = job;
    const amount = job.price;
    if (typeof operatorId !== "string" || !operatorId || operatorId.includes("/")) return NextResponse.json({ error: "Invalid operator" }, { status: 400 });
    const operator = (await getAdminDb().doc(`users/${operatorId}`).get()).data();
    if (!operator?.idVerified) return NextResponse.json({ error: "Operator ID verification is required" }, { status: 400 });
    const operatorStripeAccountId = operator.stripeConnectAccountId;
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0 || !operatorStripeAccountId || !operatorId) {
      return NextResponse.json({ error: "A valid amount and a payment-ready operator are required. This operator may accept cash jobs only." }, { status: 400 });
    }
    const account = await stripe.accounts.retrieve(operatorStripeAccountId);
    if (account.metadata?.operatorId !== operatorId || !account.charges_enabled || !account.payouts_enabled || !account.details_submitted || account.requirements?.currently_due?.length) {
      return NextResponse.json({ error: "This operator accepts cash jobs only until Stripe setup is complete." }, { status: 400 });
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
      description: `Snow removal job ${jobId}`,
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

    // Resume a previous checkout; a released authorization needs a fresh intent.
    let previousId = "initial";
    if (job.stripePaymentIntentId) {
      const previous = await stripe.paymentIntents.retrieve(job.stripePaymentIntentId);
      if (previous.status !== "canceled") {
        if (previous.amount !== amountInCents || previous.metadata.operatorId !== operatorId) {
          return NextResponse.json({ error: "The job changed after checkout started. Cancel the previous payment first." }, { status: 409 });
        }
        return NextResponse.json({ clientSecret: previous.client_secret, paymentIntentId: previous.id });
      }
      previousId = previous.id;
    }
    const paymentIntent = await stripe.paymentIntents.create(params, { idempotencyKey: `job-payment-${jobId}-${amountInCents}-${operatorStripeAccountId}-${previousId}` });
    await jobRef.update({ stripePaymentIntentId: paymentIntent.id, paymentStatus: "pending" });

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
