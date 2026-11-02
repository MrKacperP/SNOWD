"use client";
import { useState } from "react";
import { NativeBrowser } from "@/lib/native";
import { stripeConnectFetch } from "@/lib/stripeConnectClient";
export default function NativeStripeOnboarding({ accountId, onExit }: { accountId: string; onExit: () => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const open = async () => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await stripeConnectFetch("/api/stripe/account-link", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId, native: true }),
      });
      const data = await response.json();
      if (!response.ok || !data.onboardingUrl) throw new Error(data.error || "Stripe setup is unavailable. Please try again.");
      const url = new URL(data.onboardingUrl);
      if (url.protocol !== "https:" || !["connect.stripe.com", "onboarding.stripe.com"].includes(url.hostname)) throw new Error("Stripe returned an unexpected setup address.");
      await NativeBrowser.open({ url: url.href });
    } catch (e) { setError(e instanceof Error ? e.message : "Stripe setup could not open."); }
    finally { setBusy(false); }
  };
  return <section className="native-card"><h3 className="font-semibold">Set up your payouts</h3><p className="my-3 text-sm">Stripe securely collects your verification and payout details. When you’re finished, return here to check your setup.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <button className="native-primary" disabled={busy} onClick={() => void open()}>{busy ? "Opening…" : "Continue to Stripe"}</button>
    <button className="native-secondary" onClick={onExit}>Back and check payment setup</button>
  </section>;
}
