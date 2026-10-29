"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import type { Job, Transaction } from "@/lib/types";
import { activitySummary } from "@/lib/activitySummary";
import PageHeader from "@/components/ui/PageHeader";

export default function AnalyticsPage() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState(30);
  const [retry, setRetry] = useState(0);
  const [now, setNow] = useState(0);
  const uid = profile?.uid, role = profile?.role;

  useEffect(() => {
    if (!uid || role !== "operator") return;
    let active = true;
    const load = async () => {
      setLoading(true); setError("");
      try {
        const [orders, payments] = await Promise.all([
          getDocs(query(collection(db, "jobs"), where("operatorId", "==", uid))),
          getDocs(query(collection(db, "transactions"), where("operatorId", "==", uid))),
        ]);
        if (!active) return;
        setJobs(orders.docs.map(item => ({ ...item.data(), id: item.id } as Job)));
        setTransactions(payments.docs.map(item => ({ ...item.data(), id: item.id } as Transaction)));
        setNow(Date.now());
      } catch {
        if (active) setError("Could not load your activity.");
      } finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [uid, role, retry]);

  if (role && role !== "operator") return <div className="app-page"><PageHeader title="Your payments" /><Link href="/dashboard/transactions" className="btn-primary">View payments</Link></div>;
  const summary = activitySummary(jobs, transactions, now - days * 86400000, now);
  const amount = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(summary.paidCents / 100);
  return <div className="app-page space-y-6">
    <PageHeader title="Activity" action={<Link href="/dashboard/transactions" className="btn-secondary">View payments</Link>} />
    <div className="flex flex-wrap gap-2" role="group" aria-label="Activity period">{[7, 30, 90].map(period => <button key={period} type="button" aria-pressed={days === period} onClick={() => setDays(period)} className={days === period ? "btn-primary min-h-11" : "btn-secondary min-h-11"}>Past {period} days</button>)}</div>
    {error ? <div role="alert" className="surface-card p-5"><p>{error}</p><button type="button" onClick={() => setRetry(value => value + 1)} className="btn-secondary mt-3">Try again</button></div> : loading ? <p role="status">Loading activity…</p> : <>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[{ label: "Paid earnings · CAD", value: amount }, { label: "Requests received", value: summary.requests }, { label: "Visits completed", value: summary.completed }].map(item => <div key={item.label} className="surface-card p-5"><dt className="text-sm text-[var(--text-secondary)]">{item.label}</dt><dd className="mt-2 break-words text-3xl font-semibold tabular-nums">{item.value}</dd></div>)}
      </dl>
      <p className="text-sm text-[var(--text-secondary)]">Earnings include payments recorded as paid during this period.</p>
      <Link href="/dashboard/jobs" className="surface-card flex min-h-14 items-center justify-between gap-3 p-5"><span>Active work orders</span><strong className="text-2xl tabular-nums">{summary.active}</strong></Link>
    </>}
  </div>;
}
