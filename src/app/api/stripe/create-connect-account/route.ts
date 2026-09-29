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
      try {
        const existing = await stripe.accounts.retrieve(profile.stripeConnectAccountId);
        if (existing.metadata?.operatorId !== operatorId) throw new Error("This Stripe account does not belong to you.");
        return NextResponse.json({ accountId: existing.id });
      } catch (error) {
        const code = (error as { code?: string }).code;
        // Only an inaccessible account can be replaced; transient/auth failures must not create duplicates.
        if (code !== "account_invalid" && code !== "resource_missing") throw error;
        const platform = await stripe.accounts.retrieve();
        if (!platform.charges_enabled) throw new Error("The platform must activate Stripe payments before reconnecting operators.");
      }
    }

    if (!email || !operatorId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Stripe onboarding collects the operator’s own legal entity and banking details.
    const account = await stripe.accounts.create({
      type: "express",
      country: "CA",
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
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
    }, { idempotencyKey: `operator-connect-${operatorId}-${profile.stripeConnectAccountId || "initial"}` });

    // Persist before returning so refreshes and retries resume the same account.
    const ref = getAdminDb().doc(`users/${operatorId}`);
    await getAdminDb().runTransaction(async (transaction) => {
      const current = (await transaction.get(ref)).data();
      if (current?.stripeConnectAccountId !== profile.stripeConnectAccountId && current?.stripeConnectAccountId !== account.id) {
        throw new Error("Your payment account changed. Refresh and try again.");
      }
      transaction.update(ref, {
        stripeConnectAccountId: account.id,
        stripeAccountStatus: "pending",
        stripeReady: false,
        ...(profile.stripeConnectAccountId && { stripePreviousConnectAccountId: profile.stripeConnectAccountId }),
      });
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
