import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { requireStripeOperator } from "@/lib/stripeConnectAuth";

export async function POST(req: NextRequest) {
  try {
    const { accountId } = await req.json();
    if (!accountId) return NextResponse.json({ error: "Missing account ID" }, { status: 400 });
    await requireStripeOperator(req, accountId);
    const session = await getStripe().accountSessions.create({
      account: accountId,
      components: { account_onboarding: { enabled: true } },
    });
    return NextResponse.json({ clientSecret: session.client_secret }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to start Stripe setup" }, { status: 400 });
  }
}
