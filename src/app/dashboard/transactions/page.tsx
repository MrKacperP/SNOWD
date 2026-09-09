"use client";

import ActionGroup from "@/components/ui/ActionGroup";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { canAcceptPlatformPayments } from "@/lib/operatorDiscovery";
import { Job,OperatorProfile,Transaction } from "@/lib/types";
import { collection,onSnapshot,query,where } from "firebase/firestore";
import Link from "next/link";
import { useEffect,useState } from "react";

function dateMillis(value: unknown) {
  if (!value) return 0;
  const date = typeof value === "object" && "seconds" in value ? new Date(Number(value.seconds) * 1000) : value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}
function dateText(value: unknown) {
  if (!value) return "";
  const date = typeof value === "object" && "seconds" in value ? new Date(Number(value.seconds) * 1000) : value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}
const money = (cents: number) => new Intl.NumberFormat("en-CA", {style:"currency",currency:"CAD"}).format(cents/100);

export default function TransactionsPage() {
  const { profile } = useAuth();
  const isOperator = profile?.role === "operator";
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [jobsError, setJobsError] = useState(false);
  const [filter, setFilter] = useState("all");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!profile?.uid) return;
    const field = isOperator ? "operatorId" : "clientId";
    const stop = onSnapshot(query(collection(db,"transactions"),where(field,"==",profile.uid)), snapshot => {
      setTransactions(snapshot.docs.map(item => ({...item.data(),id:item.id} as Transaction))); setLoading(false); setError(false);
    }, () => { setLoading(false); setError(true); });
    const stopJobs = onSnapshot(query(collection(db,"jobs"),where(field,"==",profile.uid)), snapshot => {
      setJobs(snapshot.docs.map(item => ({...item.data(),id:item.id} as Job))); setJobsError(false);
    }, () => setJobsError(true));
    return () => { stop(); stopJobs(); };
  }, [profile?.uid,isOperator,retry]);
  const paid = transactions.filter(item => item.status === "paid").reduce((sum,item) => sum + item.amount,0);
  const held = transactions.filter(item => item.status === "held").reduce((sum,item) => sum + item.amount,0);
  const outstanding = jobs.filter(job => (["accepted","en-route","in-progress"].includes(job.status) || (job.paymentMethod === "cash" && job.status === "completed")) && job.paymentStatus === "pending");
  const list = transactions.filter(item => filter === "all" || item.status === filter).sort((a,b) => dateMillis(b.createdAt) - dateMillis(a.createdAt));
  const cashOnly = isOperator && !canAcceptPlatformPayments(profile as OperatorProfile);
  return <div className="mx-auto max-w-[1040px] space-y-5">
    <PageHeader title="Payments" description={isOperator ? "Cash receipts and card payments, together." : "Your payments and receipts."} />
    {(error || jobsError) && <p role="alert" className="rounded-2xl bg-red-50 p-4">Some payment information could not load. <button className="underline" onClick={() => setRetry(value=>value+1)}>Try again</button></p>}
    <section className="grid grid-cols-2 gap-3" aria-label="Payment summary">
      <div className="rounded-3xl bg-[#eaf1ee] p-5"><p className="text-base text-[#43574b]">{isOperator ? "Job payments" : "Paid"}</p><p className="mt-2 break-words text-2xl font-semibold sm:text-3xl">{loading || error ? "—" : money(paid)}</p><p className="mt-1 text-xs text-[var(--text-muted)]">CAD · cash and card{isOperator ? " · before card fees" : ""}</p></div>
      <div className="rounded-3xl bg-white p-5"><p className="text-base text-[var(--text-secondary)]">On hold</p><p className="mt-2 break-words text-2xl font-semibold sm:text-3xl">{loading || error ? "—" : money(held)}</p><p className="mt-1 text-xs text-[var(--text-muted)]">Awaiting job completion</p></div>
    </section>
    {outstanding.length > 0 && <section className="rounded-3xl bg-white p-5"><h2 className="text-xl font-semibold">To settle</h2><div className="mt-3 divide-y divide-[var(--border-color)]">{outstanding.map(job => <Link key={job.id} href={`/dashboard/jobs/${job.id}`} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0 flex-1"><p className="font-semibold break-words">{job.address || "Snow removal"}</p><p className="mt-1 text-sm text-[var(--text-secondary)]">{job.paymentMethod === "cash" ? "Cash only · pay the operator directly" : "Card payment needed"}</p></div><span className="font-semibold">{money(job.price*100)} →</span></Link>)}</div></section>}
    <section className="rounded-3xl bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">History</h2><select aria-label="Filter payments" value={filter} onChange={event=>setFilter(event.target.value)} className="min-h-11 max-w-full rounded-xl border px-3 text-base"><option value="all">All payments</option><option value="paid">Paid</option><option value="held">Held</option><option value="refunded">Refunded</option><option value="cancelled">Cancelled</option></select></div>
      {loading ? <p role="status" className="py-8">Loading payments…</p> : list.length === 0 ? <p className="py-8 text-[var(--text-secondary)]">{error ? "Payment history is unavailable." : "No payments to show yet."}</p> : <div className="mt-4 divide-y divide-[var(--border-color)]">{list.map(item => <details key={item.id} className="payment-receipt py-1"><summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0 flex-1"><p className="font-semibold break-words">{isOperator ? item.clientName || "Client" : item.operatorName || "Operator"}</p><p className="mt-1 text-sm capitalize text-[var(--text-secondary)]">{item.paymentMethod === "cash" ? "Cash" : "Card"} · {item.status} · {dateText(item.createdAt)}</p></div><span className="text-lg font-semibold">{money(item.amount)} <span className="text-sm text-[var(--text-muted)]">⌄</span></span></summary><div className="space-y-3 border-t border-[var(--border-color)] pb-4 pt-4 text-sm"><p className="break-words">{item.description || "Snow removal"}</p>{item.paymentMethod === "cash" && <p>Cash payment recorded by the operator. No card was charged.</p>}{item.chatId && <Link className="inline-flex min-h-11 items-center font-semibold underline" href={`/dashboard/jobs/${item.jobId}`}>View work order</Link>}</div></details>)}</div>}
    </section>
    <ActionGroup title={isOperator ? "Payment options & payouts" : "Payment options"}>
      <p className="text-base text-[var(--text-secondary)]">{cashOnly ? "You can accept cash jobs without Stripe. Verify your ID to appear to clients. Connect Stripe only when you want to accept card payments." : "Each booking shows its payment method before you confirm. Cash is paid directly to the operator; card payments are managed in the job."}</p>
      <Link href="/dashboard/settings?tab=payment" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-[#17251e] px-5 py-3 font-semibold text-white">{isOperator ? "Manage payment options" : "Payment settings"}</Link>
      {isOperator && <Link href="/dashboard/analytics" className="ml-3 inline-flex min-h-11 items-center underline">View earnings analysis</Link>}
    </ActionGroup>
  </div>;
}
