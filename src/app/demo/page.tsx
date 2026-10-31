"use client";

import { MouseEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Banknote, Bell, CalendarDays, MapPin, Menu, Star } from "lucide-react";
import { ClientHomeView } from "@/components/dashboard/ClientDashboard";
import MobileNavigation from "@/components/dashboard/MobileNavigation";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import UserAvatar from "@/components/UserAvatar";
import { ResultState } from "@/components/ui/AppPrimitives";
import { desktopNavigation } from "@/lib/appNavigation";
import type { ClientProfile, Job, JobStatus, OperatorProfile } from "@/lib/types";
import styles from "./demo.module.css";

export type DemoSpot = { city: string; province: string; postalCode: string; lat: number; lng: number };
export type DemoState = { status: JobStatus | null; spot: DemoSpot };

const ADDRESS = "18 Snowdrop Lane";
const PRICE = 45;
const operators = [
  { uid: "demo-op", businessName: "Northside Snow Co.", displayName: "Jamie Morgan", rating: 4.9, km: 0.8 },
  { uid: "demo-op-2", businessName: "Fresh Tracks", displayName: "Alex Rivera", rating: 4.8, km: 1.6 },
];

/** Tells the landing page (the parent frame) what happened in this copy of the app. */
const tellParent = (type: string) => window.parent !== window && window.parent.postMessage({ type }, window.location.origin);

export default function DemoApp() {
  const [state, setState] = useState<DemoState | null>(null);
  const [view, setView] = useState<"home" | "find">("home");
  const [requesting, setRequesting] = useState<(typeof operators)[number] | null>(null);
  const [sent, setSent] = useState(false);
  const [cashAcknowledged, setCashAcknowledged] = useState(true);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== "snowd-demo") return;
      setState(previous => {
        if (previous?.status && !event.data.status) { setView("home"); setRequesting(null); setSent(false); }
        if (!previous?.status && event.data.status) setView("home");
        return { status: event.data.status, spot: event.data.spot };
      });
    };
    window.addEventListener("message", receive);
    tellParent("snowd-demo-ready");
    return () => window.removeEventListener("message", receive);
  }, []);

  const spot = state?.spot;
  const status = state?.status;
  const profile = useMemo(() => spot && ({ uid: "demo-client", role: "client", displayName: "Morgan Lee", address: ADDRESS, ...spot } as unknown as ClientProfile), [spot]);
  const job = useMemo(() => {
    if (!spot || !status) return null;
    const now = new Date();
    return {
      id: "demo", status, clientId: "demo-client", operatorId: "demo-op",
      address: ADDRESS, city: spot.city, province: spot.province, postalCode: spot.postalCode, clientLat: spot.lat, clientLng: spot.lng,
      propertySize: "medium", serviceTypes: ["driveway", "walkway"], price: PRICE, paymentMethod: "cash",
      paymentStatus: status === "completed" ? "paid" : "pending", scheduleMode: "asap", scheduledTime: "ASAP",
      estimatedArrivalAt: new Date(now.getTime() + 8 * 60000), operatorApproxLat: spot.lat + 0.004, operatorApproxLng: spot.lng - 0.006,
      operatorLocationRadiusKm: 0.3, operatorLocationUpdatedAt: now, createdAt: now,
    } as unknown as Job;
  }, [spot, status]);

  // Every link in the copied app screens is handled here, so nothing leaves the demo.
  function route(event: MouseEvent) {
    const link = (event.target as HTMLElement).closest("a");
    if (!link) return;
    event.preventDefault();
    const href = link.getAttribute("href") || "";
    if (href === "/dashboard/find") { setView("find"); setSent(false); }
    else if (href === "/dashboard" || href.startsWith("/dashboard/jobs")) { setView("home"); setRequesting(null); }
  }

  function request() {
    setSent(true);
    tellParent("snowd-demo-request");
  }

  if (!spot || !profile) return <div className={styles.loading} />;
  const pathname = view === "find" ? "/dashboard/find" : "/dashboard";
  const booked = !!state?.status;

  return (
    <div className={`dashboard-shell min-h-screen bg-[var(--bg-primary)] ${styles.demo}`} onClickCapture={route}>
      <aside className="dashboard-sidebar fixed left-0 top-0 z-30 hidden h-dvh w-[248px] overflow-y-auto border-r border-[var(--border-color)] bg-[var(--card)] px-5 py-5  lg:flex lg:flex-col">
        <Link href="/dashboard" aria-label="snowd home" className="flex items-center gap-2.5 px-2 py-1">
          <Image src="/logo.png" alt="" width={30} height={30} />
          <span className="text-xl font-headline font-bold leading-none text-[var(--ink)]">snowd</span>
        </Link>
        <section className="sidebar-weather mt-4" aria-label={`Weather in ${spot.city}: -6°C, Light snow`}>
          <div className="sidebar-weather-main">
            <span className="sidebar-weather-icon" aria-hidden="true">🌨️</span>
            <div className="min-w-0"><strong>-6°C</strong><span>Light snow · {spot.city}</span></div>
          </div>
          <dl className="sidebar-weather-stats">
            <div><dt>Feels</dt><dd>-11°</dd></div>
            <div><dt>Wind</dt><dd>18 km/h</dd></div>
            <div><dt>Humidity</dt><dd>84%</dd></div>
          </dl>
          <p className="sidebar-weather-tip">Snow falling now</p>
        </section>
        <nav aria-label="Primary navigation" className="desktop-navigation mt-4 grid gap-1">
          {desktopNavigation("client").map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}><Icon size={20} aria-hidden="true" /><span className="flex-1">{label}</span></Link>
          ))}
        </nav>
        <button type="button" className="notif-trigger mt-4 shrink-0" data-unread={false}>
          <span className="notif-trigger-icon"><Bell className="h-4 w-4" aria-hidden="true" /></span>
          <span className="flex-1 text-sm font-bold">Notifications</span>
        </button>
        <div className="joined-menu relative mt-3 shrink-0">
          <button type="button" className="flex w-full items-center gap-3 rounded-[1.2rem] border border-[var(--ink)] bg-[var(--card)] px-4 py-3 shadow-[var(--surface-shadow)]">
            <div className="relative"><UserAvatar role="client" displayName="Morgan Lee" size={38} /><div className="absolute -bottom-0.5 -right-0.5 status-dot online" /></div>
            <div className="min-w-0 flex-1 text-left"><div className="truncate text-sm font-bold text-[var(--text-primary)]">Morgan Lee</div><div className="truncate text-xs capitalize text-[var(--text-muted)]">client</div></div>
            <Menu className="h-4 w-4 text-[var(--text-muted)]" />
          </button>
        </div>
      </aside>

      <MobileNavigation role="client" pathname={pathname} menuOpen={false} onOpenMenu={() => {}} />

      <main className="dashboard-main min-h-screen min-w-0 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-20 lg:ml-[248px] lg:pb-10 lg:pt-8">
        <div className="container-app mt-4 md:mt-6">
          {view === "home" ? (
            <ClientHomeView
              key={state?.status || "none"}
              locationLabel={`${spot.city}, ${spot.province}`}
              activeJobs={job ? [job] : []}
              profile={profile}
              operatorNames={{ "demo-op": "Northside Snow Co." }}
              operators={{ "demo-op": { uid: "demo-op", businessName: "Northside Snow Co.", displayName: "Jamie Morgan" } as OperatorProfile }}
              loading={false}
              loadError={false}
              savedMinutes={state?.status === "completed" ? 45 : 0}
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
                    <p className="mt-4 text-sm capitalize text-[var(--text-secondary)]">Medium property · walkway</p>
                    <div className="mt-3 grid gap-2">
                      <div className="rounded-xl bg-[var(--bg-secondary)] p-3"><p className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]"><Banknote size={15} />Cash only</p><p className="mt-1 text-xl font-semibold">${PRICE.toFixed(2)} <span className="text-xs font-normal">CAD</span></p></div>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">Pay directly after the work.</p>
                    <button type="button" onClick={() => setRequesting(op)} disabled={booked} className="btn-primary mt-4 min-h-12 w-full px-4 py-3">{booked ? "Visit already booked" : "Request help"}</button>
                  </article>
                ))}
              </section>
            </div>
          )}
        </div>
      </main>

      <Modal isOpen={!!requesting} onClose={() => { setRequesting(null); if (sent) setView("home"); }} title={sent ? undefined : "Request snow help"} size="lg">
        {requesting && (sent ? (
          <ResultState title="Request sent." description={`${requesting.businessName} will review your request. We’ll let you know when they respond.`} actionHref="/dashboard/jobs/demo" actionLabel="Track your work order">
            <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-[var(--bg-secondary)] p-4 text-sm font-semibold"><CalendarDays size={18} />As soon as possible</div>
            <p className="mt-3 text-center text-sm text-[var(--text-secondary)]">driveway · walkway · {ADDRESS} · Cash</p>
          </ResultState>
        ) : (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold">Review and request</h3>
            <div className="detail-list text-sm">
              <div className="flex items-start justify-between gap-4"><span className="text-xs text-[var(--text-muted)]">Shoveler</span><strong>{requesting.businessName}</strong></div>
              <div className="flex items-start justify-between gap-4"><span className="text-xs text-[var(--text-muted)]">Service</span><strong className="capitalize">driveway · walkway</strong></div>
              <div className="flex items-start justify-between gap-4"><span className="text-xs text-[var(--text-muted)]">Location</span><strong className="text-right">{ADDRESS}, {spot.city}</strong></div>
              <div className="flex items-start justify-between gap-4"><span className="text-xs text-[var(--text-muted)]">When</span><strong>As soon as possible</strong></div>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-[var(--accent-soft)] p-4"><span className="text-sm font-semibold">Total</span><strong className="text-xl">${PRICE.toFixed(2)} CAD</strong></div>
            <div className="rounded-xl bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-secondary)]"><label className="flex items-start gap-3"><input type="checkbox" checked={cashAcknowledged} onChange={event => setCashAcknowledged(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0" /><span>I’ll pay the operator in cash after the work is done.</span></label></div>
            <button type="button" onClick={request} disabled={!cashAcknowledged} className="btn-primary action-shine w-full min-h-13">Request snow help</button>
            <p className="text-center text-xs text-[var(--text-muted)]">The visit is confirmed when the operator accepts.</p>
          </div>
        ))}
      </Modal>
    </div>
  );
}
