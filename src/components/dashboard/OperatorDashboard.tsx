"use client";
import DashboardMap from "./DashboardMap";
import styles from "./home.module.css";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { Job,OperatorProfile,Transaction } from "@/lib/types";
import { jobDisplayPrice } from "@/lib/marketplacePricing";
import { transactionDisplayAmount } from "@/lib/marketplacePricing";
import { dateMillis, orderActionNeeded, propertySizeLabel, scheduleText } from "@/lib/workOrders";
import { collection,onSnapshot,query,where } from "firebase/firestore";
import Link from "next/link";
import { useEffect,useRef,useState } from "react";

export default function OperatorDashboard() {
  const { profile } = useAuth();
  const operator = profile as OperatorProfile | null;
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [earningsLoading, setEarningsLoading] = useState(true);
  const [earningsError, setEarningsError] = useState(false);

  useEffect(() => {
    if (!profile?.uid) return;
    return onSnapshot(query(collection(db, "jobs"), where("operatorId", "==", profile.uid)), snapshot => {
      setJobs(snapshot.docs.map(document => ({ ...document.data(), id: document.id } as Job)));
      setLoading(false);
      setLoadError(false);
    }, () => { setLoadError(true); setLoading(false); });
  }, [profile?.uid]);

  useEffect(() => {
    if (!profile?.uid) return;
    return onSnapshot(query(collection(db, "transactions"), where("operatorId", "==", profile.uid)), snapshot => {
      setTransactions(snapshot.docs.map(document => ({ ...document.data(), id: document.id } as Transaction)));
      setEarningsLoading(false);
      setEarningsError(false);
    }, () => { setEarningsLoading(false); setEarningsError(true); });
  }, [profile?.uid]);

  return <OperatorHomeView operator={operator} jobs={jobs} loading={loading} loadError={loadError} transactions={transactions} earningsLoading={earningsLoading} earningsError={earningsError} />;
}

export function OperatorHomeView({ operator, jobs, loading, loadError, transactions, earningsLoading, earningsError }: {
  operator: OperatorProfile | null; jobs: Job[]; loading: boolean; loadError: boolean;
  transactions: Transaction[]; earningsLoading: boolean; earningsError: boolean;
}) {
  const [selectedRouteJobId, setSelectedRouteJobId] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const pending = jobs.filter(job => job.status === "pending" && orderActionNeeded(job, operator?.uid || ""));
  const active = jobs.filter(job => ["accepted", "en-route", "in-progress"].includes(job.status)).sort((a, b) => (dateMillis(a.scheduledDate) || dateMillis(a.createdAt)) - (dateMillis(b.scheduledDate) || dateMillis(b.createdAt)));
  const nextJob = active.find(job => job.status === "in-progress") ?? active.find(job => job.status === "en-route") ?? active[0];
  const selectedRouteJob = jobs.find(job => job.id === selectedRouteJobId && ["pending", "accepted", "en-route", "in-progress"].includes(job.status));
  // A visit already underway keeps the map; otherwise the oldest offer awaiting a reply takes it.
  const firstOffer = [...pending].sort((a, b) => dateMillis(a.createdAt) - dateMillis(b.createdAt))[0];
  const underway = nextJob && ["en-route", "in-progress"].includes(nextJob.status) ? nextJob : undefined;
  const mapJob = selectedRouteJob || underway || firstOffer || nextJob;
  const now = new Date();
  const seasonLabel = "Total earned";
  const paidThisSeason = transactions.filter(item => item.status === "paid").sort((a, b) => dateMillis(a.completedAt || a.createdAt) - dateMillis(b.completedAt || b.createdAt));
  const seasonEarnings = paidThisSeason.reduce((sum, item) => sum + transactionDisplayAmount(item, true), 0);
  const seasonAmount = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(seasonEarnings / 100);
  const firstEarning = paidThisSeason[0] ? new Date(dateMillis(paidThisSeason[0].completedAt || paidThisSeason[0].createdAt)) : null;
  const earningsPeriod = firstEarning ? `${new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric" }).format(firstEarning)} – ${new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric" }).format(now)}` : "No paid work yet";
  const trend = paidThisSeason.reduce<number[]>((points, item) => { points.push((points.at(-1) || 0) + transactionDisplayAmount(item, true)); return points; }, [0]);
  if (trend.length === 1) trend.push(0);
  const sparkline = trend.map((value, index) => `${10 + index * 100 / Math.max(1, trend.length - 1)},${42 - value * 32 / Math.max(1, seasonEarnings)}`).join(" ");

  const serviceSummary = (job: Job) => {
    const extras = job.serviceTypes?.filter(service => service !== "driveway").map(service => service.replaceAll("-", " ")) ?? [];
    return [propertySizeLabel(job.propertySize), ...extras].join(" + ");
  };

  return (
    <div className={`app-page dashboard-home ${styles.home} text-[var(--text-primary)]`}>
      <header className="dashboard-overview"><div><h1>{loading ? "Work overview" : pending.length ? `${pending.length} work ${pending.length === 1 ? "order needs" : "orders need"} your reply` : nextJob ? "Your next visit" : "Ready for your next request"}</h1></div></header>
      <div ref={mapRef}><DashboardMap profile={operator} job={mapJob} role="operator" offer={mapJob?.status === "pending" ? { href: `/dashboard/jobs/${mapJob.id}`, title: serviceSummary(mapJob), detail: `$${jobDisplayPrice(mapJob, true).toFixed(2)} CAD · ${mapJob.scheduleMode === "asap" || mapJob.scheduledTime === "ASAP" ? scheduleText(mapJob) : `Due ${scheduleText(mapJob)}`}`, more: pending.length - 1 } : undefined} /></div>
      {!operator?.idVerified && <Link href="/dashboard/settings?tab=verification" className="inline-flex min-h-9 items-center rounded-lg px-2 text-sm font-semibold hover:bg-[var(--bg-secondary)]">Verify your ID to receive jobs</Link>}

      <section aria-labelledby="work-heading" className="operator-work">
        <div className="flex items-center justify-between gap-3"><h2 id="work-heading" className="text-xl font-semibold">{pending.length ? "Waiting for your reply" : "Upcoming work"}</h2><Link href="/dashboard/jobs" className="min-h-11 content-center font-semibold">View all</Link></div>
        {loadError ? <p role="alert">Could not load work orders. <Link href="/dashboard/jobs">Try again</Link></p> : loading ? <p role="status">Loading work orders…</p> : <div className="operator-work-list">
          {[...pending.slice(0, 3), ...active.slice(0, 3)].map(job => <article key={job.id} className={`operator-work-row ${job.status === "pending" ? "operator-work-row--new" : ""}`}>
            <Link href={`/dashboard/jobs/${job.id}`} className="operator-work-row-link" aria-label={`Open work order: ${serviceSummary(job)}`} />
            <div className="operator-work-main"><p className="operator-work-status">{job.status === "pending" ? "New request" : job.status === "in-progress" ? "Work in progress" : job.status === "en-route" ? "On the way" : "Visit confirmed"}</p><h3>{serviceSummary(job)}</h3><p>{job.address ? <button type="button" className="operator-work-address" aria-label={`Show route to ${job.address} on the dashboard map`} aria-pressed={selectedRouteJobId === job.id} onClick={() => { setSelectedRouteJobId(job.id); mapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>{job.address} <span aria-hidden="true">↗</span></button> : "Address to be confirmed"}</p><p>{job.status === "en-route" && job.eta ? `Due in about ${job.eta} min` : job.scheduleMode === "asap" || job.scheduledTime === "ASAP" ? scheduleText(job) : `Due ${scheduleText(job)}`}</p></div>
            <div className="operator-work-side"><strong>${jobDisplayPrice(job, true).toFixed(2)} <small>CAD</small></strong><span>{job.paymentMethod === "cash" ? job.paymentStatus === "paid" ? "Cash paid" : "Cash, payment pending" : job.paymentStatus === "paid" ? "Paid by card" : job.paymentStatus === "held" ? "Card authorized" : "Card payment pending"}</span></div>
          </article>)}
          {!pending.length && !nextJob && <div className="client-orders-empty"><div><h3>No jobs requested</h3><p>Your queue is clear.</p></div></div>}
        </div>}
      </section>

      <Link href="/dashboard/transactions" className="dashboard-earnings" aria-label="Open payments">
        <span className="dashboard-earnings-content">
          <span>{seasonLabel}</span>
          <span className="dashboard-earnings-row">
            <span className="dashboard-earnings-value"><strong>{earningsLoading || earningsError ? "—" : seasonAmount}</strong><small>CAD</small></span>
            {!earningsLoading && !earningsError && <svg viewBox="0 0 120 52" role="img" aria-label={paidThisSeason.length ? `Cumulative paid earnings: ${seasonAmount} Canadian dollars across ${paidThisSeason.length} payments` : "No paid earnings yet"}><polyline points={sparkline} /></svg>}
          </span>
          <small>{earningsLoading ? "Loading earnings…" : earningsError ? "Could not load earnings." : earningsPeriod}</small>
        </span>
      </Link>

    </div>
  );
}
