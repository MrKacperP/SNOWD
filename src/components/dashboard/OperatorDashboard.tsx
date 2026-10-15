"use client";
import IconSwap from "@/components/ui/IconSwap";


import { HomeActions } from "./HomeActions";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { Job,OperatorProfile,Transaction } from "@/lib/types";
import { jobDisplayPrice } from "@/lib/marketplacePricing";
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
      <header className="dashboard-overview"><div><p className="app-eyebrow">Your snow day</p><h1>{loading ? "Work overview" : pending.length ? `${pending.length} work ${pending.length === 1 ? "order needs" : "orders need"} your reply` : nextJob ? "Your next visit" : "Ready for your next request"}</h1><p>{pending.length ? "Review the location, timing and payment, then accept or suggest a time." : "Your requests, upcoming visits and payments in one place."}</p></div><Link href="/dashboard/jobs" className="btn-primary"><IconSwap icon={<ArrowUpRight size={18} />}>{pending.length ? "Review requests" : "View work orders"}<ArrowUpRight size={18} /></IconSwap></Link></header>
      {!operator?.idVerified && <Link href="/dashboard/settings?tab=verification" className="inline-flex min-h-9 items-center rounded-lg px-2 text-sm font-semibold hover:bg-[var(--bg-secondary)]">Verify your ID to receive jobs</Link>}

      <section aria-labelledby="work-heading" className="operator-work">
        <div className="flex items-center justify-between gap-3"><h2 id="work-heading" className="text-xl font-semibold">{pending.length ? "Waiting for your reply" : "Upcoming work"}</h2><Link href="/dashboard/jobs" className="min-h-11 content-center font-semibold">View all</Link></div>
        {loadError ? <p role="alert">Could not load work orders. <Link href="/dashboard/jobs">Try again</Link></p> : loading ? <p role="status">Loading work orders…</p> : <div className="operator-work-list">
          {[...pending.slice(0, 3), ...(nextJob ? [nextJob] : [])].map(job => <Link key={job.id} href={`/dashboard/jobs/${job.id}`} className="operator-work-row">
            <div><p className="operator-work-status">{job.status === "pending" ? "New request · Reply needed" : job.status === "in-progress" ? "Work in progress" : job.status === "en-route" ? "On the way" : "Visit confirmed"}</p><h3>{serviceSummary(job)}</h3><p>{job.address || "Address to be confirmed"}</p><p>{job.status === "en-route" && job.eta ? `About ${job.eta} min away` : scheduleText(job)}</p></div>
            <div className="operator-work-amount"><strong>${jobDisplayPrice(job, true).toFixed(2)} <small>CAD</small></strong><span>Your earnings · {job.paymentMethod === "cash" ? "Cash" : "Card"}</span><span>{job.paymentStatus === "paid" ? "Paid" : job.paymentStatus === "held" ? "Authorized" : "Payment pending"}</span><ArrowUpRight size={20} aria-hidden="true" /></div>
          </Link>)}
          {!pending.length && !nextJob && <div className="client-orders-empty"><div><h3>All clear for now</h3><p>New requests and upcoming visits will appear here.</p></div></div>}
        </div>}
      </section>

      <Link href="/dashboard/transactions" className="dashboard-earnings"><span><span>{seasonLabel}</span><strong>{earningsLoading || earningsError ? "—" : seasonAmount}<small> CAD</small></strong><small>{earningsError ? "Could not load earnings. Open payments to retry." : `Nov ${seasonYear} – Apr ${seasonYear + 1}`}</small></span><span><Snowflake size={24} /><span>View payments ↗</span></span></Link>
      <HomeActions operator />
    </div>
  );
}
