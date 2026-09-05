import type Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { syncStripePayment } from "@/lib/stripePaymentState";
import { syncStripeAccount } from "@/lib/stripeAccountState";

export async function POST(req: NextRequest) {
  const secrets = [process.env.STRIPE_CONNECT_WEBHOOK_SECRET, process.env.STRIPE_WEBHOOK_SECRET].filter((value): value is string => Boolean(value));
  if (!secrets.length) return NextResponse.json({ error: "Stripe webhook is not configured" }, { status: 503 });
  const body = await req.text();
  const signature = req.headers.get("stripe-signature") || "";
  let event: Stripe.Event | undefined;
  for (const secret of secrets) {
    try {
      event = getStripe().webhooks.constructEvent(body, signature, secret);
      break;
    } catch { /* Try the other configured event destination's signing secret. */ }
  }
  if (!event) return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  try {
    if (event.type === "account.updated") {
      // Fetch current state so out-of-order webhook deliveries cannot restore stale readiness.
      const account = await getStripe().accounts.retrieve(event.data.object.id);
      if (account.metadata?.platform === "snowd.ca") await syncStripeAccount(account);
    }
    if (["payment_intent.amount_capturable_updated", "payment_intent.succeeded", "payment_intent.canceled", "payment_intent.payment_failed"].includes(event.type)) {
      const payment = await getStripe().paymentIntents.retrieve((event.data.object as { id: string }).id);
      if (payment.metadata.platform === "snowd.ca") await syncStripePayment(payment);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe account sync failed", error);
    return NextResponse.json({ error: "Account sync failed; retry delivery" }, { status: 500 });
  }
}
