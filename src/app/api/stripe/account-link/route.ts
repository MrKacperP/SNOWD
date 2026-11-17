import { NextRequest, NextResponse } from "next/server";
import { requireStripeOperator } from "@/lib/stripeConnectAuth";
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
    const { accountId, native, mode } = await req.json();

    if (!accountId) {
      return NextResponse.json({ error: "Missing accountId" }, { status: 400 });
    }

    await requireStripeOperator(req, accountId);

    // A finished account is managed in its Stripe Express dashboard (payouts, bank, tax forms);
    // sending it through onboarding again would only show the setup steps it already completed.
    if (mode === "manage") {
      const account = await stripe.accounts.retrieve(accountId);
      if (account.details_submitted) {
        const login = await stripe.accounts.createLoginLink(accountId);
        return NextResponse.json({ onboardingUrl: login.url, kind: "dashboard" });
      }
    }

    // Create a new account link (refresh or re-onboard)
    const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: native === true ? `${origin}/mobile/connect-return` : `${origin}/dashboard/settings?stripe=refresh`,
      return_url: native === true ? `${origin}/mobile/connect-return` : `${origin}/dashboard/settings?stripe=success&account=${accountId}`,
      type: "account_onboarding",
    });

    return NextResponse.json({ onboardingUrl: accountLink.url });
  } catch (error: unknown) {
    console.error("Stripe account link error:", error);
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
