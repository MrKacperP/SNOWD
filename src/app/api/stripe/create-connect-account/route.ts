import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

export async function POST(req: NextRequest) {
  try {
    const { email, operatorId, businessName } = await req.json();

    if (!email || !operatorId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Create a Stripe Connect Express account for the operator
    const account = await stripe.accounts.create({
      type: "express",
      country: "CA",
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "individual",
      metadata: {
        operatorId,
        platform: "snowd.ca",
      },
      ...(businessName && {
        business_profile: {
          name: businessName,
          product_description: "Snow removal services",
        },
      }),
    });

    // Create an account link for onboarding
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${origin}/dashboard/settings?stripe=refresh`,
      return_url: `${origin}/dashboard/settings?stripe=success&account=${account.id}`,
      type: "account_onboarding",
    });

    return NextResponse.json({
      accountId: account.id,
      onboardingUrl: accountLink.url,
    });
  } catch (error: unknown) {
    console.error("Stripe Connect error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
