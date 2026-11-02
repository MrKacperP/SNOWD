"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import Modal from "@/components/ui/Modal";
import { auth } from "@/lib/firebase";
import { NativeStripe, nativePlatform } from "@/lib/native";

export default function NativeCheckout({ clientSecret, stripeAccount, amount, onSuccess, onCancel }: {
  clientSecret: string; stripeAccount?: string | null; amount: number;
  onSuccess: (id: string) => void | Promise<void>; onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const submitting = useRef(false);
  const pay = async () => {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError("");
    try {
      const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (!key || !auth.currentUser) throw new Error("Please sign in again to authorize your payment.");
      const merchantId = process.env.NEXT_PUBLIC_APPLE_PAY_MERCHANT_ID;
      await NativeStripe.initialize({ publishableKey: key, stripeAccount: stripeAccount || undefined });
      await NativeStripe.createPaymentSheet({
        paymentIntentClientSecret: clientSecret, merchantDisplayName: "snowd",
        enableApplePay: nativePlatform() === "ios" && !!merchantId,
        applePayMerchantId: merchantId,
        enableGooglePay: nativePlatform() === "android",
        GooglePayIsTesting: key.startsWith("pk_test_"), countryCode: "CA",
        returnURL: "snowd://payment-return",
      });
      const result = await NativeStripe.presentPaymentSheet();
      if (result.paymentResult === "paymentSheetCanceled") return;
      if (result.paymentResult !== "paymentSheetCompleted") throw new Error("Payment authorization did not finish. Check your work order before trying again.");
      const paymentIntentId = clientSecret.split("_secret_")[0];
      // Native UI completion is not proof of payment. Reconcile with Stripe on
      // the server, using its saved account/amount, before updating the order UI.
      const response = await fetch("/api/stripe/payment-status", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await auth.currentUser.getIdToken()}` },
        body: JSON.stringify({ paymentIntentId }),
      });
      const status = await response.json();
      if (!response.ok || !["held", "paid"].includes(status.paymentStatus)) {
        throw new Error("Your payment is not yet confirmed. Return to the work order to check its status before trying again.");
      }
      await onSuccess(paymentIntentId);
    } catch (e) { setError(e instanceof Error ? e.message : "We couldn’t confirm your payment. Check your work order before trying again."); }
    finally { submitting.current = false; setBusy(false); }
  };
  return <Modal isOpen title="Authorize snow removal" onClose={() => { if (!busy) onCancel(); }} showClose={!busy}>
    <p className="text-3xl font-semibold">${amount.toFixed(2)} <span className="text-base">CAD</span></p>
    <p className="mt-4 text-sm leading-6">This pays for your booked snow removal service. Stripe places a temporary hold. Payment is captured after completion with photo proof.</p>
    <p className="mt-3 text-sm leading-6">Choose an available wallet or card in the secure payment sheet. Your full card details are handled by Stripe.</p>
    <Link className="mt-3 inline-flex min-h-11 items-center text-sm underline" href="/policies/payments">Payment, cancellation and refund information</Link>
    {error && <p role="alert" className="my-3 text-sm text-red-700">{error}</p>}
    <button className="native-primary" disabled={busy} onClick={() => void pay()}>{busy ? "Checking payment…" : `Continue · $${amount.toFixed(2)} CAD`}</button>
    <button className="native-secondary" disabled={busy} onClick={onCancel}>Back to work order</button>
  </Modal>;
}
