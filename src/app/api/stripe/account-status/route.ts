import { NextRequest, NextResponse } from "next/server";
import { requireStripeOperator } from "@/lib/stripeConnectAuth";
import { syncStripeAccount } from "@/lib/stripeAccountState";
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
    const { accountId } = await req.json();

    if (!accountId) {
      return NextResponse.json({ error: "Missing accountId" }, { status: 400 });
    }

    await requireStripeOperator(req, accountId);

    // Check if the operator's account is fully onboarded
    const account = await stripe.accounts.retrieve(accountId);

    const state = await syncStripeAccount(account);
    const payoutAccount = account.external_accounts?.data.find((externalAccount) => externalAccount.object === "bank_account");
    return NextResponse.json({
      ...state,
      accountId: account.id,
      accountDetails: {
        businessName: account.business_profile?.name || null,
        email: account.email || null,
        country: account.country || null,
        currency: account.default_currency?.toUpperCase() || null,
        payoutBank: payoutAccount?.object === "bank_account" ? {
          bankName: payoutAccount.bank_name || null,
          last4: payoutAccount.last4 || null,
          currency: payoutAccount.currency?.toUpperCase() || null,
        } : null,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: unknown) {
    console.error("Stripe account status error:", error);
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
