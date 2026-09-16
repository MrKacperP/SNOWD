"use client";
import { calculateServicePrice, quoteMarketplace } from "@/lib/marketplacePricing";
import GuidedStep from "@/components/ui/GuidedStep";
import CompanyIdentity from "@/components/CompanyIdentity";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { ClientProfile, Job, OperatorProfile } from "@/lib/types";
import { canAcceptPlatformPayments } from "@/lib/operatorDiscovery";
import { orderRequest } from "@/components/work-orders/OrderActions";
import Link from "next/link";
export default function RepeatBookingPage() {
  const { profile, user } = useAuth(),
    router = useRouter();
  const [previous, setPrevious] = useState<Job | null>(null),
    [operator, setOperator] = useState<OperatorProfile | null>(null),
    [client, setClient] = useState<ClientProfile | null>(null);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [time, setTime] = useState(""),
    [asap, setAsap] = useState(true),
    [cash, setCash] = useState(false),
    [method, setMethod] = useState("cash");
  const [step, setStep] = useState(0);
  const attempt = useRef<{ key: string; id: string } | null>(null);
  useEffect(() => {
    if (!user) return;
    let active = true;
    const id = new URLSearchParams(window.location.search).get("previousOrder");
    if (!id) {
      setError("Choose a previous work order first.");
      return;
    }
    void (async () => {
      const snap = await getDoc(doc(db, "jobs", id));
      if (!snap.exists()) throw new Error("Previous order not found.");
      const job = { ...snap.data(), id: snap.id } as Job;
      const [op, customer] = await Promise.all([
        getDoc(doc(db, "users", job.operatorId)),
        getDoc(doc(db, "users", job.clientId)),
      ]);
      if (active) {
        setPrevious(job);
        setOperator({ ...op.data(), uid: op.id } as OperatorProfile);
        setClient({ ...customer.data(), uid: customer.id } as ClientProfile);
      }
    })().catch((e) => {
      if (active) setError(e.message || "Could not load booking details.");
    });
    return () => {
      active = false;
    };
  }, [user]);
  const isOperator = profile?.role === "operator";
  const bookingSize = (previous?.propertySize || client?.propertyDetails?.propertySize || "medium") as "small" | "medium" | "large";
  const bookingServices = previous?.serviceTypes || client?.propertyDetails?.serviceTypes || ["driveway"];
  const price = calculateServicePrice(operator?.pricing, bookingServices, bookingSize);
  const shownPrice = isOperator ? price : quoteMarketplace(price, method).price;
  const submit = async () => {
    if (!previous || !operator || busy) return;
    setBusy(true);
    setError("");
    try {
      if (!asap && (!time || !Number.isFinite(new Date(time).getTime()) || new Date(time).getTime() <= Date.now()))
        throw new Error("Choose a future date and time for your visit.");
      const body = {
        previousOrderId: previous.id,
        operatorId: operator.uid,
        clientId: previous.clientId,
        paymentMethod: method,
        cashPaymentAcknowledged: !isOperator && cash,
        scheduleMode: asap ? "asap" : "scheduled",
        scheduledDate: asap ? null : new Date(time).toISOString(),
        scheduleTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        expectedPrice: shownPrice,
      };
      const key = JSON.stringify(body);
      if (attempt.current?.key !== key)
        attempt.current = { key, id: crypto.randomUUID() };
      const result = await orderRequest("/api/jobs/create", {
        ...body,
        requestId: attempt.current.id,
      });
      router.push(`/dashboard/jobs/${result.jobId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create booking.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mx-auto max-w-2xl space-y-5 py-4">
      <Link
        className="inline-flex min-h-11 items-center underline"
        href="/dashboard/jobs"
      >
        ← Work orders
      </Link>
      <h1 className="text-3xl font-bold">
        {isOperator ? "Propose another booking" : "Request again"}
      </h1>
      <p>
        Same helping hand. A fresh visit.
      </p>
      {previous && operator && (
        <section className="surface-card space-y-4 rounded-3xl p-6">
          <GuidedStep step={step} labels={["Service", "When", "Payment"]} title={["Same service again?", "When works for you?", "Ready to send?"][step]}>
          {step === 0 && <>
          <h2 className="text-xl font-bold">
            <CompanyIdentity person={operator} name={operator.businessName || operator.displayName} />
          </h2>
          {isOperator && <p>For {client?.displayName}</p>}
          <p>{client?.address}</p>
          <p className="capitalize">{previous.serviceTypes?.map((service) => service.replaceAll("-", " ")).join(" · ") || "Snow removal"}</p>
          <p>{previous.specialInstructions}</p>
          <p className="capitalize">{previous.propertySize || client?.propertyDetails?.propertySize || "medium"} driveway · company rate for this size</p>
          <p className="text-lg font-bold">
            Current price: ${shownPrice.toFixed(2)} CAD
          </p>
          </>}
          {step === 1 && <>
          <div className="grid grid-cols-2 gap-3">
            {[true, false].map(value => <button key={String(value)} type="button" aria-pressed={asap === value} onClick={() => setAsap(value)} className={`min-h-20 rounded-xl border-2 p-4 text-left font-semibold motion-safe:transition ${asap === value ? "border-[var(--ink)] bg-[var(--accent-soft)]" : "border-[var(--border-color)]"}`}>
              {value ? "As soon as possible" : "Choose a time"}
            </button>)}
          </div>
          {asap && <p className="text-sm text-[var(--text-secondary)]">Your shoveler will confirm the arrival time.</p>}
          {!asap && (
            <label className="block">
              Requested date and time
              <input
                className="mt-2 block min-h-12 w-full rounded-xl border p-3"
                type="datetime-local"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </label>
          )}
          <p className="text-sm">
            Choose a future time. Time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
          </p>
          </>}
          {step === 2 && <>
          <p className="text-lg font-bold">Total: ${shownPrice.toFixed(2)} CAD</p>
          <label className="block">
            Payment method
            <select
              className="mt-2 block min-h-12 w-full rounded-xl border p-3"
              value={method}
              onChange={(e) => {
                setMethod(e.target.value);
                setCash(false);
              }}
            >
              <option value="cash">Cash after work</option>
              {canAcceptPlatformPayments(operator) && (
                <option value="credit">
                  Card authorization after acceptance
                </option>
              )}
            </select>
          </label>
          {method === "cash" && !isOperator && (
            <label className="flex gap-3">
              <input
                type="checkbox"
                checked={cash}
                onChange={(e) => setCash(e.target.checked)}
              />
              I agree to pay ${price.toFixed(2)} directly to the operator in
              cash after work.
            </label>
          )}
          {!isOperator && <p className="text-sm">The provider must accept your request before the visit is confirmed. For card bookings, authorize payment after acceptance; payment is captured when work is completed.</p>}
          {isOperator && (
            <p>
              The customer must approve the service, price, time, and payment
              terms before this is booked.
            </p>
          )}
          </>}
          <button
            className="min-h-12 rounded-xl bg-[var(--ink)] px-5 py-3 font-semibold text-white disabled:opacity-50"
            disabled={
              busy ||
              (step === 1 && !asap && (!time || !Number.isFinite(new Date(time).getTime()) || new Date(time).getTime() <= Date.now())) ||
              (step === 2 && !isOperator && method === "cash" && !cash)
            }
            onClick={() => step === 2 ? void submit() : setStep(value => value + 1)}
          >
            {busy
              ? "Sending…"
              : step < 2 ? "Continue →" : isOperator
                ? "Send booking proposal"
                : "Send new request"}
          </button>
          {step > 0 && <button className="min-h-11 underline" disabled={busy} onClick={() => setStep(value => value - 1)}>Back</button>}
          </GuidedStep>
        </section>
      )}
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {!previous && !error && <p role="status">Loading booking details…</p>}
    </div>
  );
}
