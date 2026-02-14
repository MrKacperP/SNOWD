import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

export async function POST(req: NextRequest) {
  try {
    const { accountId } = await req.json();

    if (!accountId) {
      return NextResponse.json({ error: "Missing accountId" }, { status: 400 });
    }

    // Create a new account link (refresh or re-onboard)
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/dashboard/settings?stripe=refresh`,
      return_url: `${origin}/dashboard/settings?stripe=success&account=${accountId}`,
      type: "account_onboarding",
    });

    return NextResponse.json({ onboardingUrl: accountLink.url });
  } catch (error: unknown) {
    console.error("Stripe account link error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
