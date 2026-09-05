"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripe";
import { Shield, Lock, X } from "lucide-react";
import Image from "next/image";
import { useDialogFocus } from "@/hooks/useDialogFocus";

interface CheckoutFormProps {
  onSuccess: (paymentIntentId: string) => void | Promise<void>;
  onCancel: () => void;
  amount: number;
}

function CheckoutFormInner({ onSuccess, onCancel, amount }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || "Payment failed");
        setProcessing(false);
        return;
      }

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (confirmError) {
        setError(confirmError.message || "Payment failed");
      } else if (paymentIntent && paymentIntent.status === "requires_capture") {
        // Success! Funds are held.
        await onSuccess(paymentIntent.id);
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        await onSuccess(paymentIntent.id);
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: "accordion",
        }}
      />

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
        <Shield className="w-4 h-4 text-green-600 shrink-0" />
        <span>
          Your payment of <strong>${amount.toFixed(2)} CAD</strong> will be held
          securely by snowd.ca until the job is completed and verified with a
          photo.
        </span>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1 px-4 py-3 bg-[var(--accent)] text-white rounded-xl font-semibold hover:bg-[var(--accent-dark)] transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {processing ? (
            <>
              <Image
                src="/logo.png"
                alt="Loading"
                width={20}
                height={20}
                className="animate-spin-slow"
              />
              Processing...
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              Pay ${amount.toFixed(2)} CAD
            </>
          )}
        </button>
      </div>
    </form>
  );
}

interface StripeCheckoutProps {
  clientSecret: string;
  amount: number;
  onSuccess: (paymentIntentId: string) => void | Promise<void>;
  onCancel: () => void;
}

export default function StripeCheckout({
  clientSecret,
  amount,
  onSuccess,
  onCancel,
}: StripeCheckoutProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(true, dialogRef);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onCancel(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Secure payment" tabIndex={-1} className="max-h-[calc(100dvh-2rem)] overflow-y-auto bg-white border-[3px] border-[var(--ink)] rounded-2xl shadow-[var(--surface-shadow)] max-w-md w-full">
        {/* Header */}
        <div className="bg-[var(--accent)] p-5 text-white relative">
          <button
            onClick={onCancel}
            aria-label="Close payment"
            className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/20 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Image src="/logo.png" alt="snowd.ca" width={28} height={28} />
            </div>
            <div>
              <h2 className="font-bold text-lg">snowd.ca Secure Payment</h2>
              <p className="text-white/90 text-sm">Funds held until job completion</p>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <div className="p-5">
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: "stripe",
                variables: {
                  colorPrimary: "#061321",
                  colorBackground: "#f3f8fb",
                  colorText: "#061321",
                  colorDanger: "#b91c1c",
                  borderRadius: "16px",
                  fontFamily: "Instrument Sans, system-ui, sans-serif",
                },
              },
            }}
          >
            <CheckoutFormInner
              onSuccess={onSuccess}
              onCancel={onCancel}
              amount={amount}
            />
          </Elements>
        </div>
      </div>
    </div>
  );
}
