"use client";

import { useState } from "react";
import { loadConnectAndInitialize } from "@stripe/connect-js/pure";
import { ConnectAccountOnboarding, ConnectComponentsProvider } from "@stripe/react-connect-js";
import { stripeConnectFetch } from "@/lib/stripeConnectClient";

export default function StripeOnboarding({ accountId, onExit }: { accountId: string; onExit: () => void }) {
  const [error, setError] = useState("");
  const [instance] = useState(() => loadConnectAndInitialize({
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
    fetchClientSecret: async () => {
      const response = await stripeConnectFetch("/api/stripe/account-session", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId }),
      });
      const data = await response.json();
      if (!response.ok || !data.clientSecret) {
        const message = data.error || "Unable to load Stripe setup. Please try again.";
        setError(message);
        throw new Error(message);
      }
      return data.clientSecret;
    },
  }));
  return <div className="mt-4 rounded-xl border p-4">
    <h3 className="font-semibold mb-3">Set up your Stripe account</h3>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <ConnectComponentsProvider connectInstance={instance}>
      <ConnectAccountOnboarding onExit={onExit} onLoadError={() => setError("Stripe setup could not load. Close setup and try again.")} />
    </ConnectComponentsProvider>
    <button onClick={onExit} className="mt-3 text-sm underline">Close setup and check payment status</button>
  </div>;
}
