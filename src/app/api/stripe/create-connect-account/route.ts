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

    // Managed Risk requires Accounts v2 and direct charges. The preview version
    // enables Express + Stripe loss liability while SNOWD continues paying fees.
    const account = await stripe.v2.core.accounts.create({
      dashboard: "express",
      contact_email: email,
      identity: { country: "CA" },
      defaults: {
        currency: "cad",
        responsibilities: { fees_collector: "application", losses_collector: "stripe" },
      },
      configuration: { merchant: { capabilities: { card_payments: { requested: true } } } },
      metadata: { operatorId, platform: "snowd.ca" },
      ...(businessName && { display_name: businessName }),
    }, {
      apiVersion: "2026-08-26.preview",
      idempotencyKey: `operator-connect-v2-${operatorId}-${profile.stripeConnectAccountId || "initial"}`,
    });

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
    const stripeError = error as { code?: string; type?: string; requestId?: string };
    console.error("Stripe Connect error", { code: stripeError?.code, type: stripeError?.type, requestId: stripeError?.requestId });
    const message = error instanceof Error ? error.message : "Internal server error";
    if (stripeError?.code === "account_create_activation_required" || message.includes("must be activated in order to create accounts")) {
      return NextResponse.json({
        code: "connect_activation_required",
        error: "SNOWD is finishing Stripe Connect activation. Card payout setup is temporarily unavailable. Please try again after SNOWD completes its platform setup; you do not need to change your own Stripe account.",
      }, { status: 503 });
    }
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
