import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    const { email, operatorId, businessName } = await req.json();

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
    });

    // Create an account link for onboarding
    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://snowd.ca";
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
