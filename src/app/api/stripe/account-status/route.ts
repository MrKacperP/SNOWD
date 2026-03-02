import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    const { accountId } = await req.json();

    if (!accountId) {
      return NextResponse.json({ error: "Missing accountId" }, { status: 400 });
    }

    // Check if the operator's account is fully onboarded
    const account = await stripe.accounts.retrieve(accountId);

    return NextResponse.json({
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      accountId: account.id,
      // Additional info for fully ready check
      currentlyDue: account.requirements?.currently_due || [],
      eventuallyDue: account.requirements?.eventually_due || [],
      pendingVerification: account.requirements?.pending_verification || [],
      disabledReason: account.requirements?.disabled_reason || null,
      // True when the account is fully live and ready for business
      fullyReady: !!(
        account.charges_enabled &&
        account.payouts_enabled &&
        account.details_submitted &&
        (account.requirements?.currently_due?.length === 0 || !account.requirements?.currently_due)
      ),
    });
  } catch (error: unknown) {
    console.error("Stripe account status error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
