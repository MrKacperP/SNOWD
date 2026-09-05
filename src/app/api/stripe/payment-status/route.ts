import { NextRequest, NextResponse } from "next/server";
import { requireJobPaymentAccess } from "@/lib/stripeConnectAuth";
import { syncStripePayment } from "@/lib/stripePaymentState";

export async function POST(req: NextRequest) {
  try {
    const { paymentIntentId } = await req.json();
    if (typeof paymentIntentId !== "string" || !paymentIntentId.startsWith("pi_")) {
      return NextResponse.json({ error: "Invalid payment reference" }, { status: 400 });
    }
    const payment = await requireJobPaymentAccess(req, paymentIntentId);
    return NextResponse.json(await syncStripePayment(payment), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to verify payment" }, { status: 400 });
  }
}
