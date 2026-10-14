"use client";

import { HomeActions } from "./HomeActions";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { Job,OperatorProfile,Transaction } from "@/lib/types";
import PaymentSummary from "@/components/work-orders/PaymentSummary";
import { transactionDisplayAmount } from "@/lib/marketplacePricing";
import { dateMillis, orderActionNeeded, propertySizeLabel, scheduleText } from "@/lib/workOrders";
import { collection,onSnapshot,query,where } from "firebase/firestore";
import { ArrowUpRight, Snowflake } from "lucide-react";
import Link from "next/link";
import { useEffect,useState } from "react";

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

  const pending = jobs.filter(job => job.status === "pending" && orderActionNeeded(job, operator?.uid || ""));
  const active = jobs.filter(job => ["accepted", "en-route", "in-progress"].includes(job.status)).sort((a, b) => (dateMillis(a.scheduledDate) || dateMillis(a.createdAt)) - (dateMillis(b.scheduledDate) || dateMillis(b.createdAt)));
  const nextJob = active.find(job => job.status === "in-progress") ?? active.find(job => job.status === "en-route") ?? active[0];
  const now = new Date();
  const seasonYear = now.getMonth() >= 10 ? now.getFullYear() : now.getFullYear() - 1;
  const seasonLabel = now.getMonth() >= 4 && now.getMonth() < 10 ? "Last snow season" : "Earned this snow season";
  const seasonStart = new Date(seasonYear, 10, 1).getTime();
  const seasonEnd = new Date(seasonYear + 1, 4, 1).getTime();
  const seasonEarnings = transactions.filter(item => item.status === "paid" && (() => { const when = dateMillis(item.completedAt || item.createdAt); return when >= seasonStart && when < seasonEnd; })()).reduce((sum, item) => sum + transactionDisplayAmount(item, true), 0);
  const seasonAmount = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(seasonEarnings / 100);

  const serviceSummary = (job: Job) => {
    const extras = job.serviceTypes?.filter(service => service !== "driveway").map(service => service.replaceAll("-", " ")) ?? [];
    return [propertySizeLabel(job.propertySize), ...extras].join(" + ");
  };

  return (
    <div className="app-page text-[var(--text-primary)]">
      <header className="dashboard-overview"><div><p className="app-eyebrow">Your snow day</p><h1>{loading ? "Work overview" : pending.length ? `${pending.length} work ${pending.length === 1 ? "order needs" : "orders need"} your reply` : nextJob ? "Your next visit" : "Ready for your next request"}</h1><p>{pending.length ? "Review the location, timing and payment, then accept or suggest a time." : "Your requests, upcoming visits and payments in one place."}</p></div><Link href="/dashboard/jobs" className="btn-primary">{pending.length ? "Review requests" : "View work orders"}<ArrowUpRight size={18} /></Link></header>
      {!operator?.idVerified && <Link href="/dashboard/settings?tab=verification" className="inline-flex min-h-9 items-center rounded-lg px-2 text-sm font-semibold hover:bg-[var(--bg-secondary)]">Verify your ID to receive jobs</Link>}

      <section aria-labelledby="work-heading" className="app-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="work-heading" className="text-xl font-semibold">{pending.length ? "Waiting for your reply" : "Upcoming work"}</h2>
          <Link href="/dashboard/jobs" className="min-h-10 content-center rounded-lg px-3 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] no-underline">View jobs</Link>
        </div>
        {loadError ? <p role="alert" className="mt-3">Could not load jobs. <Link href="/dashboard/jobs" className="font-semibold text-[var(--accent)] hover:underline">Open jobs to try again.</Link></p> : loading ? <p role="status" className="mt-3">Loading jobs…</p> : <>
          {pending.length > 0 && <div className="mt-3 grid gap-3">{pending.map(job => {
            const timing = job.status === "pending" ? (job.scheduleMode === "asap" || !job.scheduledDate ? "ASAP · arrival to confirm" : scheduleText(job)) : scheduleText(job);
            return <Link key={job.id} href={`/dashboard/jobs/${job.id}`} className="block overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card-solid)] no-underline shadow-sm transition hover:border-slate-300 hover:bg-[var(--bg-secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">
              <div className="p-4"><p className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--accent)]">New request · Reply needed</p>
                <div className="grid grid-cols-[1fr_auto] items-center gap-3"><div className="min-w-0"><p className="text-base font-semibold capitalize">{serviceSummary(job)}</p><div className="mt-2 flex flex-wrap items-center gap-2"><span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">{timing}</span></div></div><PaymentSummary job={job} operator /></div>
                <p className="mt-3 text-sm text-[var(--text-secondary)]">{job.address || "Address to be confirmed"}</p><span className="mt-4 flex items-center justify-between border-t border-[var(--border-color)] pt-3 font-semibold">Review request <ArrowUpRight size={17} /></span>
              </div>
            </Link>;
          })}</div>}
          {nextJob ? <Link href={`/dashboard/jobs/${nextJob.id}`} className={`job-widget job-widget--${nextJob.status} mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 no-underline`}>
            <div className="min-w-0 flex-1"><p className="text-base font-semibold break-words capitalize">{serviceSummary(nextJob)}</p><p className="mt-1 text-sm text-[var(--text-secondary)]">{nextJob.address || "Address to be confirmed"}</p><p className="mt-2"><span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">{nextJob.status === "in-progress" ? "Work in progress" : nextJob.status === "en-route" && nextJob.eta ? `On your way · ${nextJob.eta} min` : scheduleText(nextJob)}</span></p></div>
            <PaymentSummary job={nextJob} operator />
          </Link> : null}
          {!pending.length && !nextJob && <p className="py-8 text-sm text-[var(--text-secondary)]">No visits waiting. New requests will appear here when a neighbor books you.</p>}
        </>}
      </section>

      <Link href="/dashboard/transactions" className="dashboard-earnings"><span><span>{seasonLabel}</span><strong>{earningsLoading || earningsError ? "—" : seasonAmount}<small> CAD</small></strong><small>{earningsError ? "Could not load earnings. Open payments to retry." : `Nov ${seasonYear} – Apr ${seasonYear + 1}`}</small></span><span><Snowflake size={24} /><span>View payments ↗</span></span></Link>
      <HomeActions operator />
    </div>
  );
}
