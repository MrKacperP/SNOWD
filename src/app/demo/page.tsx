"use client";

import { MouseEvent, useEffect, useMemo, useState } from "react";
import { Banknote, CalendarDays, MapPin, Star, Zap } from "lucide-react";
import { ClientHomeView } from "@/components/dashboard/ClientDashboard";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import UserAvatar from "@/components/UserAvatar";
import { ResultState } from "@/components/ui/AppPrimitives";
import type { ClientProfile, OperatorProfile } from "@/lib/types";
import OperatorDemo from "./OperatorDemo";
import DemoShell from "./DemoShell";
import { ADDRESS, CLIENT_NAME, SERVICE_PRICES, demoJob, operators, priceOf, tellParent, type DemoState } from "./demoData";
import styles from "./demo.module.css";

export default function DemoApp() {
  const [state, setState] = useState<DemoState | null>(null);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== "snowd-demo") return;
      const { run, role, status, paid, services, spot } = event.data;
      setState({ run, role, status, paid, services, spot });
    };
    window.addEventListener("message", receive);
    tellParent("snowd-demo-ready");
    return () => window.removeEventListener("message", receive);
  }, []);

  if (!state) return <div className={styles.loading} />;
  return state.role === "operator"
    ? <div className={`dashboard-shell min-h-screen bg-[var(--bg-primary)] ${styles.demo}`} onClickCapture={blockLinks}><OperatorDemo key={state.run} state={state} /></div>
    : <ClientDemo key={state.run} state={state} />;
}

/** Links in the copied screens never leave the demo. */
function blockLinks(event: MouseEvent) {
  if ((event.target as HTMLElement).closest("a")) event.preventDefault();
}

function ClientDemo({ state }: { state: DemoState }) {
  const { spot, status } = state;
  const [view, setView] = useState<"home" | "find">("home");
  const [requesting, setRequesting] = useState<(typeof operators)[number] | null>(null);
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<string[]>(["driveway"]);
  const [sent, setSent] = useState(false);
  const [cashAcknowledged, setCashAcknowledged] = useState(false);

  const profile = useMemo(() => ({ uid: "demo-client", role: "client", displayName: CLIENT_NAME, address: ADDRESS, ...spot } as unknown as ClientProfile), [spot]);
  const job = useMemo(() => demoJob(state), [state]);
  const price = priceOf(services);
  // Once the request is in, hop back to the home screen so the progress plays out in view.
  const tracking = sent && !!status;
  useEffect(() => {
    if (!tracking) return;
    const timer = window.setTimeout(() => { setRequesting(null); setView("home"); }, 1800);
    return () => window.clearTimeout(timer);
  }, [tracking]);

  // Every link in the copied app screens is handled here, so nothing leaves the demo.
  function route(event: MouseEvent) {
    const link = (event.target as HTMLElement).closest("a");
    if (!link) return;
    event.preventDefault();
    const href = link.getAttribute("href") || "";
    if (href === "/dashboard/find") { setView("find"); setSent(false); }
    else if (href === "/dashboard" || href.startsWith("/dashboard/jobs")) { setView("home"); setRequesting(null); }
  }

  function open(op: (typeof operators)[number]) {
    setRequesting(op);
    setStep(1);
    setCashAcknowledged(false);
    tellParent("snowd-demo-step", { step: "booking" });
  }

  function request() {
    setSent(true);
    tellParent("snowd-demo-request", { services });
  }

  const pathname = view === "find" ? "/dashboard/find" : "/dashboard";
  const booked = !!status;
  const toggle = (service: string) => setServices(current => current.includes(service) ? current.filter(item => item !== service) : [...current, service]);
  const choice = (selected: boolean) => `min-h-14 rounded-xl border px-3 text-sm font-semibold ${selected ? "border-[var(--ink)] bg-[var(--accent-soft)]" : "border-[var(--border-color)] bg-white"}`;

  return (
    <div className={`dashboard-shell min-h-screen bg-[var(--bg-primary)] ${styles.demo}`} onClickCapture={route}>
      <DemoShell role="client" spot={spot} pathname={pathname}>
        {view === "home" ? (
          <ClientHomeView
            key={status || "none"}
            locationLabel={`${spot.city}, ${spot.province}`}
            activeJobs={job ? [job] : []}
            profile={profile}
            operatorNames={{ "demo-op": "Northside Snow Co." }}
            operators={{ "demo-op": { uid: "demo-op", businessName: "Northside Snow Co.", displayName: "Jamie Morgan" } as OperatorProfile }}
            loading={false}
            loadError={false}
            savedMinutes={status === "completed" ? 45 : 0}
          />
        ) : (
          <div className="mx-auto max-w-[1040px] space-y-5">
            <PageHeader title="Find a shoveler" description={`Choose snow help in ${spot.city}.`} />
            <div className="rounded-2xl bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--text-secondary)]"><MapPin className="mr-2 inline h-4 w-4" />{ADDRESS}</div>
            <section className="grid gap-4 sm:grid-cols-2" aria-label="Nearby operators">
              {operators.map(op => (
                <article key={op.uid} className="operator-card app-card p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <UserAvatar role="operator" displayName={op.businessName} size={44} />
                    <div className="min-w-0 flex-1"><h2 className="text-lg font-semibold break-words">{op.businessName}</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">{op.rating.toFixed(1)} ★ · {op.km.toFixed(1)} km away</p></div>
                    <span className="-mr-1 -mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[var(--text-secondary)]"><Star size={19} fill="none" /></span>
                  </div>
                  <p className="mt-4 text-sm capitalize text-[var(--text-secondary)]">Medium property · driveway, walkway, steps</p>
                  <div className="mt-3 grid gap-2">
                    <div className="rounded-xl bg-[var(--bg-secondary)] p-3"><p className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]"><Banknote size={15} />Cash only</p><p className="mt-1 text-xl font-semibold">${SERVICE_PRICES.driveway.toFixed(2)} <span className="text-xs font-normal">CAD</span></p></div>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">Pay directly after the work.</p>
                  <button type="button" onClick={() => open(op)} disabled={booked} className="btn-primary mt-4 min-h-12 w-full px-4 py-3">{booked ? "Visit already booked" : "Request help"}</button>
                </article>
              ))}
            </section>
          </div>
        )}
      </DemoShell>

      {/* Same four steps as the real booking: service, location, timing, review. */}
      <Modal isOpen={!!requesting} onClose={() => { setRequesting(null); if (sent) setView("home"); }} title={sent ? undefined : `Request snow help · ${step} of 4`} size="lg">
        {requesting && (sent ? (
          <ResultState title="Request sent." description={`${requesting.businessName} will review your request. We’ll let you know when they respond.`} actionHref="/dashboard/jobs/demo" actionLabel="Track your work order">
            <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-[var(--bg-secondary)] p-4 text-sm font-semibold"><CalendarDays size={18} />As soon as possible</div>
            <p className="mt-3 text-center text-sm capitalize text-[var(--text-secondary)]">{services.join(" · ")} · {ADDRESS} · Cash</p>
          </ResultState>
        ) : (
          <div className="space-y-5">
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-secondary)]"><div className="h-full rounded-full bg-[image:var(--accent-gradient)] transition-all" style={{ width: `${step * 25}%` }} /></div>
            {step > 1 && <button type="button" onClick={() => setStep(current => current - 1)} className="inline-flex min-h-10 items-center gap-2 rounded-full px-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]">← Back</button>}
            {step === 1 && <>
              <h3 className="text-lg font-semibold">Choose your service</h3>
              <div className="flex items-center justify-between gap-4 rounded-xl bg-[var(--bg-secondary)] p-4"><span className="flex items-center gap-3 font-semibold"><UserAvatar role="operator" displayName={requesting.businessName} size={36} />{requesting.businessName}</span><strong>${price.toFixed(2)} CAD</strong></div>
              <fieldset className="rounded-xl bg-[var(--bg-secondary)] p-4"><legend className="text-sm font-semibold">Service</legend><div className="mt-2 flex flex-wrap gap-2">{Object.keys(SERVICE_PRICES).map(service => <label key={service} className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 font-semibold capitalize ${services.includes(service) ? "border-[var(--ink)] bg-[var(--accent-soft)]" : "border-[var(--border-color)] bg-white"}`}><input type="checkbox" className="h-4 w-4" checked={services.includes(service)} onChange={() => toggle(service)} />{service}</label>)}</div></fieldset>
              <button type="button" onClick={() => setStep(2)} disabled={!services.length} className="btn-primary w-full min-h-12">Continue with this shoveler</button>
            </>}
            {step === 2 && <>
              <h3 className="text-lg font-semibold">Confirm your location</h3>
              <div className="flex items-start gap-3 rounded-xl bg-[var(--bg-secondary)] p-4"><MapPin className="mt-0.5 h-5 w-5 shrink-0" /><span>{ADDRESS}, {spot.city}, {spot.province} {spot.postalCode}</span></div>
              <button type="button" onClick={() => setStep(3)} className="btn-primary w-full min-h-12">Continue</button>
            </>}
            {step === 3 && <>
              <h3 className="text-lg font-semibold">When do you need help?</h3>
              <div className="grid grid-cols-2 gap-2" aria-label="Choose timing">
                <button type="button" aria-pressed="true" className={choice(true)}><Zap className="mr-2 inline h-4 w-4" />ASAP</button>
                <button type="button" aria-pressed="false" disabled className={`${choice(false)} opacity-50`}><CalendarDays className="mr-2 inline h-4 w-4" />Scheduled</button>
              </div>
              <div className="rounded-2xl bg-[var(--accent-soft)] p-5 text-center"><Zap className="mx-auto mb-2 h-6 w-6 text-[var(--accent)]" /><strong className="block text-lg">As soon as possible</strong><span className="mt-1 block text-xs text-[var(--text-secondary)]">Arrival confirmed after the operator accepts</span></div>
              <button type="button" onClick={() => setStep(4)} className="btn-primary w-full min-h-12">Review choices</button>
            </>}
            {step === 4 && <>
              <h3 className="text-lg font-semibold">Review and request</h3>
              <div className="detail-list text-sm">
                <div className="flex items-start justify-between gap-4"><span className="text-xs text-[var(--text-muted)]">Shoveler</span><strong>{requesting.businessName}</strong></div>
                <div className="flex items-start justify-between gap-4"><span className="text-xs text-[var(--text-muted)]">Service</span><strong className="capitalize">{services.join(" · ")}</strong></div>
                <div className="flex items-start justify-between gap-4"><span className="text-xs text-[var(--text-muted)]">Location</span><strong className="text-right">{ADDRESS}, {spot.city}</strong></div>
                <div className="flex items-start justify-between gap-4"><span className="text-xs text-[var(--text-muted)]">When</span><strong>As soon as possible</strong></div>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[var(--accent-soft)] p-4"><span className="text-sm font-semibold">Total</span><strong className="text-xl">${price.toFixed(2)} CAD</strong></div>
              <div className="rounded-xl bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-secondary)]"><label className="flex items-start gap-3"><input type="checkbox" checked={cashAcknowledged} onChange={event => setCashAcknowledged(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0" /><span>I’ll pay the operator in cash after the work is done.</span></label></div>
              <button type="button" onClick={request} disabled={!cashAcknowledged} className="btn-primary action-shine w-full min-h-13">Request snow help</button>
              <p className="text-center text-xs text-[var(--text-muted)]">The visit is confirmed when the operator accepts.</p>
            </>}
          </div>
        ))}
      </Modal>
    </div>
  );
}
