"use client";

import React, { useState, useRef } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripe";
import { Shield, Lock } from "lucide-react";
import Image from "next/image";
import Modal from "@/components/ui/Modal";

interface CheckoutFormProps {
  onSuccess: (paymentIntentId: string) => void | Promise<void>;
  onCancel: () => void;
  amount: number;
  processing: boolean;
  onProcessingChange: (value: boolean) => void;
}

function CheckoutFormInner({ onSuccess, onCancel, amount, processing, onProcessingChange }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const submitting = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || submitting.current) return;
    submitting.current = true;

    onProcessingChange(true);
    setError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || "Payment failed");
        onProcessingChange(false);
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
      } else {
        setError(paymentIntent?.status === "processing" ? "Your bank is still processing this authorization. Return to the order to check its payment status before trying again." : "The authorization is not complete. Check your payment details and try again.");
      }
    } catch (err) {
      setError("We couldn’t confirm the payment status. Return to your order and check before trying again.");
      console.error(err);
    } finally {
      submitting.current = false;
      onProcessingChange(false);
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
        <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
        <Shield className="w-4 h-4 text-green-600 shrink-0" />
        <span>
          A hold of <strong>${amount.toFixed(2)} CAD</strong> will be placed on your card. You are charged when the work is completed with photo proof.
        </span>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={processing}
          className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || !elements || processing}
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
              Authorize ${amount.toFixed(2)} CAD
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
  const [processing, setProcessing] = useState(false);
  const cancel = () => { if (!processing) onCancel(); };
  return (
    <Modal isOpen onClose={cancel} showClose={!processing} title="Authorize your payment" subtitle="A temporary card hold. Charged after completion with photo proof.">
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
              onCancel={cancel}
              processing={processing}
              onProcessingChange={setProcessing}
              amount={amount}
            />
          </Elements>
    </Modal>
  );
}
