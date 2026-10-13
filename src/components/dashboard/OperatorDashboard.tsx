"use client";

import { HomeActions } from "./HomeActions";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { Job,OperatorProfile,Transaction } from "@/lib/types";
import { jobDisplayPrice, transactionDisplayAmount } from "@/lib/marketplacePricing";
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
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";
  const serviceSummary = (job: Job) => {
    const extras = job.serviceTypes?.filter(service => service !== "driveway").map(service => service.replaceAll("-", " ")) ?? [];
    return [propertySizeLabel(job.propertySize), ...extras].join(" + ");
  };

  return (
    <div className="app-page text-[var(--text-primary)]">
      <header className="mb-1 flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm font-medium text-[var(--text-secondary)]">Your dashboard</p><h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{greeting}{profile?.displayName ? `, ${profile.displayName.split(" ")[0]}` : ""}</h1></div>
      </header>
      <Link href="/dashboard/transactions" className="group relative flex min-h-[156px] items-center justify-between overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#112b3b,#245b9b)] p-6 text-white no-underline shadow-[0_16px_34px_#17394b24] sm:p-7">
        <div className="relative z-10"><span className="text-sm font-medium text-white/75">{seasonLabel}</span><strong className="mt-2 block text-4xl font-bold tracking-tight sm:text-5xl">{earningsLoading || earningsError ? "—" : seasonAmount}</strong><span className="mt-3 block text-xs font-medium text-white/70">Nov {seasonYear} – Apr {seasonYear + 1}</span></div>
        <span className="relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/15 text-white transition-transform group-hover:scale-105"><Snowflake size={29} strokeWidth={1.7} /><ArrowUpRight className="absolute right-1 top-1" size={13} /></span>
        <span className="pointer-events-none absolute -right-12 -top-20 h-60 w-60 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
      </Link>
      {!operator?.idVerified && <Link href="/dashboard/settings?tab=verification" className="inline-flex min-h-9 items-center rounded-lg px-2 text-sm font-semibold hover:bg-[var(--bg-secondary)]">Verify your ID to receive jobs</Link>}

      <section aria-labelledby="work-heading" className="app-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="work-heading" className="text-xl font-semibold">Work orders</h2>
          <Link href="/dashboard/jobs" className="min-h-10 content-center rounded-lg px-3 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] no-underline">View jobs</Link>
        </div>
        {loadError ? <p role="alert" className="mt-3">Could not load jobs. <Link href="/dashboard/jobs" className="font-semibold text-[var(--accent)] hover:underline">Open jobs to try again.</Link></p> : loading ? <p role="status" className="mt-3">Loading jobs…</p> : <>
          {pending.length > 0 && <div className="mt-3 grid gap-3">{pending.map(job => {
            const timing = job.status === "pending" ? (job.scheduleMode === "asap" || !job.scheduledDate ? "ASAP · arrival to confirm" : scheduleText(job)) : scheduleText(job);
            return <Link key={job.id} href={`/dashboard/jobs/${job.id}`} className="block overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card-solid)] no-underline shadow-sm transition hover:border-slate-300 hover:bg-[var(--bg-secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">
              <div className="p-4">
                <div className="grid grid-cols-[1fr_auto] items-center gap-3"><div className="min-w-0"><p className="text-base font-semibold capitalize">{serviceSummary(job)}</p><div className="mt-2 flex flex-wrap items-center gap-2"><span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800">{timing}</span></div></div><strong className="grid min-h-[72px] min-w-[112px] place-items-center rounded-2xl bg-emerald-50 px-4 text-center text-xl font-bold text-emerald-800">${jobDisplayPrice(job, true).toFixed(2)}</strong></div>
              </div>
            </Link>;
          })}</div>}
          {nextJob ? <Link href={`/dashboard/jobs/${nextJob.id}`} className={`job-widget job-widget--${nextJob.status} mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 no-underline`}>
            <div className="min-w-0 flex-1"><p className="text-base font-semibold break-words capitalize">{serviceSummary(nextJob)}</p><p className="mt-2"><span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800">{nextJob.eta ? `About ${nextJob.eta} min away` : scheduleText(nextJob)}</span></p></div>
            <strong className="rounded-xl bg-emerald-50 px-3 py-2 text-lg text-emerald-800">${jobDisplayPrice(nextJob, true).toFixed(2)}</strong>
          </Link> : null}
        </>}
      </section>

      <HomeActions operator />
    </div>
  );
}
