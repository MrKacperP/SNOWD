import { NextRequest, NextResponse } from "next/server";
import { requireStripeOperator } from "@/lib/stripeConnectAuth";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getStripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        {
          configured: false,
          error: "Stripe is not configured on this environment",
        },
        { status: 200 }
      );
    }

    const stripe = getStripe();
    const { uid: operatorId, email, profile } = await requireStripeOperator(req);
    const businessName = profile.businessName || profile.displayName;
    if (profile.stripeConnectAccountId) {
      await requireStripeOperator(req, profile.stripeConnectAccountId);
      return NextResponse.json({ accountId: profile.stripeConnectAccountId });
    }

    if (!email || !operatorId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Create a Stripe Connect Express account for the operator (production-ready)
    const account = await stripe.accounts.create({
      type: "express",
      country: "CA",
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "individual",
      settings: {
        payouts: {
          schedule: {
            interval: "daily",
          },
        },
      },
      metadata: {
        operatorId,
        platform: "snowd.ca",
      },
      ...(businessName && {
        business_profile: {
          name: businessName,
          product_description: "Snow removal services via snowd.ca",
          url: "https://snowd.ca",
        },
      }),
    }, { idempotencyKey: `operator-connect-${operatorId}` });

    // Persist before returning so refreshes and retries resume the same account.
    await getAdminDb().doc(`users/${operatorId}`).update({
      stripeConnectAccountId: account.id,
      stripeAccountStatus: "pending",
      stripeReady: false,
    });
    return NextResponse.json({ accountId: account.id });
  } catch (error: unknown) {
    console.error("Stripe Connect error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "STRIPE_SECRET_KEY is not configured") {
      return NextResponse.json(
        {
          configured: false,
          error: "Stripe is not configured on this environment",
        },
        { status: 200 }
      );
    }
    if (message.includes("only create new accounts if you've signed up for Connect")) {
      return NextResponse.json(
        {
          code: "connect_not_enabled",
          error: "Stripe Connect is not enabled for this platform. The site owner must activate Connect in the Stripe Dashboard before operators can connect their bank accounts.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
