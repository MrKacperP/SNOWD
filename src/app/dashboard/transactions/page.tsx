"use client";
import { estimatedTimeSaved, timeSavedLabel } from "@/lib/clientValue";
import IconSwap from "@/components/ui/IconSwap";


import { jobDisplayPrice, transactionDisplayAmount } from "@/lib/marketplacePricing";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { canAcceptPlatformPayments } from "@/lib/operatorDiscovery";
import { Job, OperatorProfile, Transaction } from "@/lib/types";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { ArrowRight, Banknote, Check, ChevronRight, CircleDollarSign, CreditCard, Settings2, Sparkles, WalletCards } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { earningPointsFrom } from "@/components/dashboard/EarningsChart";
import EarningsCard from "./EarningsCard";
import styles from "./transactions.module.css";

function toDate(value: unknown) {
  if (!value) return null;
  const date = typeof value === "object" && value !== null && "seconds" in value
    ? new Date(Number(value.seconds) * 1000)
    : value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}
function dateMillis(value: unknown) { return toDate(value)?.getTime() || 0; }
function dateText(value: unknown) { const date = toDate(value); return date ? date.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }) : "Date unavailable"; }
const money = (cents: number) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2 }).format(cents / 100);
const statusLabel: Record<Transaction["status"], string> = { paid: "Paid", held: "On hold", refunded: "Refunded", cancelled: "Cancelled" };

export default function TransactionsPage() {
  const { profile } = useAuth();
  const isOperator = profile?.role === "operator";
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState(false);
  const [filter, setFilter] = useState<"all" | Transaction["status"]>("all");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!profile?.uid) return;
    const field = isOperator ? "operatorId" : "clientId";
    const stop = onSnapshot(query(collection(db, "transactions"), where(field, "==", profile.uid)), snapshot => {
      setTransactions(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as Transaction))); setLoading(false); setError(false);
    }, () => { setLoading(false); setError(true); });
    const stopJobs = onSnapshot(query(collection(db, "jobs"), where(field, "==", profile.uid)), snapshot => {
      setJobs(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as Job))); setJobsError(false); setJobsLoading(false);
    }, () => { setJobsError(true); setJobsLoading(false); });
    return () => { stop(); stopJobs(); };
  }, [profile?.uid, isOperator, retry]);

  const paidTransactions = useMemo(() => transactions.filter(item => item.status === "paid"), [transactions]);
  const paid = paidTransactions.reduce((sum, item) => sum + transactionDisplayAmount(item, isOperator), 0);
  const outstanding = jobs.filter(job => (["accepted", "en-route", "in-progress"].includes(job.status) || (job.paymentMethod === "cash" && job.status === "completed")) && job.paymentStatus === "pending");
  const list = transactions.filter(item => filter === "all" || item.status === filter).sort((a, b) => dateMillis(b.createdAt) - dateMillis(a.createdAt));
  const cashOnly = isOperator && !canAcceptPlatformPayments(profile as OperatorProfile);

  const insights = useMemo(() => {
    const cash = paidTransactions.filter(item => item.paymentMethod === "cash").reduce((sum, item) => sum + transactionDisplayAmount(item, isOperator), 0); const card = paid - cash;
    return { cash, card };
  }, [isOperator, paid, paidTransactions]);
  const earningPoints = useMemo(() => earningPointsFrom(transactions), [transactions]);
  const savedMinutes = estimatedTimeSaved(jobs);
  const completedVisits = jobs.filter(job => job.status === "completed").length;
  const empty = !loading && !error && transactions.length === 0;

  return <div className={styles.page}>
    <header className={styles.header}><div><h1>{isOperator ? "Your money" : "Payments"}</h1></div><Link href="/dashboard/settings?tab=payment" className={styles.settingsButton}><IconSwap icon={<Settings2 aria-hidden="true" />}><Settings2 aria-hidden="true" /> Payment settings</IconSwap></Link></header>
    {(error || jobsError) && <div role="alert" className={styles.errorBanner}><span>Some payment information could not load.</span><button onClick={() => setRetry(value => value + 1)}>Try again</button></div>}
    {isOperator ? <section className={styles.growthSection} aria-label="Earnings">
      <EarningsCard points={earningPoints} total={paid} loading={loading} error={error} />
      <div className={styles.sourcesCard}><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Payment mix</p><h2>By method</h2></div></div><div className={styles.sourceList}><div><span className={`${styles.sourceIcon} ${styles.cash}`}><Banknote aria-hidden="true" /></span><span><b>Cash</b></span><strong>{money(insights.cash)}</strong></div><div><span className={`${styles.sourceIcon} ${styles.card}`}><CreditCard aria-hidden="true" /></span><span><b>Card</b></span><strong>{money(insights.card)}</strong></div></div><div className={styles.mixBar} aria-label={`Cash ${paid ? Math.round(insights.cash / paid * 100) : 0} percent, card ${paid ? Math.round(insights.card / paid * 100) : 0} percent`}><span style={{ width: `${paid ? insights.cash / paid * 100 : 0}%` }} /></div></div>
    </section> : <section className={styles.heroGrid} aria-label="Payment summary">
      <div className={styles.timeSavedCard}>
        <span className={styles.eyebrow}>More winter, less work</span>
        <h2>{jobsLoading || jobsError ? "Your time saved" : savedMinutes > 0 ? <>You’ve saved <strong>{timeSavedLabel(savedMinutes)}</strong></> : "Make time for your snow day"}</h2>
        <p>{jobsError ? "Visit history is temporarily unavailable." : jobsLoading ? "Loading your visits…" : completedVisits ? `${completedVisits} completed ${completedVisits === 1 ? "visit" : "visits"} · estimated time saved from service duration.` : "Your time saved will appear after your first completed visit."}</p>
        <span className={styles.costNote}>{loading || error ? "Payment total unavailable" : <>For only <b>{money(paid)} CAD</b> paid in total</>}</span>
      </div>
    </section>}
    <section className={styles.historyCard} aria-labelledby="history-heading"><div className={styles.historyHeader}><div><p className={styles.eyebrow}>Activity</p><h2 id="history-heading">Payment history</h2></div><div className={styles.filters} aria-label="Filter payment history">{(["all", "paid", "held", "refunded"] as const).map(value => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === "all" ? "All" : statusLabel[value]}</button>)}</div></div>
      {loading ? <div role="status" className={styles.emptyState}>Loading payments…</div> : list.length === 0 ? <div className={styles.emptyState}><span><WalletCards aria-hidden="true" /></span><h3>{error ? "Payment history is unavailable" : filter === "all" ? "Your payment history starts here" : `No ${filter} payments`}</h3><p>{error ? "Try loading the page again." : filter === "all" ? "Completed jobs and receipts will appear here automatically." : "Choose another filter to see more activity."}</p></div> : <div className={styles.transactionList}>{list.map(item => { const person = isOperator ? item.clientName || "Customer" : item.operatorName || "Operator"; return <Link key={item.id} href={item.jobId ? `/dashboard/jobs/${item.jobId}` : "/dashboard/transactions"} className={styles.transactionRow}><span className={`${styles.transactionIcon} ${item.paymentMethod === "cash" ? styles.cash : styles.card}`}>{item.paymentMethod === "cash" ? <Banknote aria-hidden="true" /> : <CreditCard aria-hidden="true" />}</span><span className={styles.transactionMain}><b>{person}</b><small>{item.description || "Snow removal"} · {dateText(item.createdAt)}</small></span><span className={`${styles.status} ${styles[item.status]}`}>{item.status === "paid" && <Check aria-hidden="true" />}{statusLabel[item.status]}</span><strong className={styles.transactionAmount}>{isOperator && item.status === "paid" ? "+" : ""}{money(transactionDisplayAmount(item, isOperator))}</strong><ChevronRight className={styles.rowChevron} aria-hidden="true" /></Link>; })}</div>}
    </section>
    {outstanding.length > 0 && <section className={styles.settleCard} aria-labelledby="settle-heading"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Needs attention</p><h2 id="settle-heading">Payments to settle</h2></div><span className={styles.count}>{outstanding.length}</span></div><div className={styles.settleList}>{outstanding.map(job => <Link key={job.id} href={`/dashboard/jobs/${job.id}`}><span className={styles.sourceIcon}>{job.paymentMethod === "cash" ? <Banknote aria-hidden="true" /> : <CreditCard aria-hidden="true" />}</span><span><b>{job.address || "Snow removal"}</b><small>{job.paymentMethod === "cash" ? "Cash · pay the operator directly" : "Card payment needed"}</small></span><strong>{money(jobDisplayPrice(job, isOperator) * 100)}</strong><ChevronRight aria-hidden="true" /></Link>)}</div></section>}
    <section className={styles.paymentOptions}><div className={styles.optionCopy}><span className={styles.optionIcon}><CircleDollarSign aria-hidden="true" /></span><div><p className={styles.eyebrow}>Payment options</p><h2>{cashOnly ? "Add card payments when you’re ready" : isOperator ? "You’re set up to get paid" : "Your payment preferences"}</h2><p>{cashOnly ? "You can take cash jobs now. Connect Stripe to also accept cards and receive secure bank payouts." : isOperator ? "Manage cash and card preferences, payout details, and your Stripe connection." : "Manage your preferred way to pay and review secure payment details."}</p></div></div><Link href="/dashboard/settings?tab=payment"><IconSwap icon={<ArrowRight aria-hidden="true" />}>{isOperator ? "Manage how I get paid" : "Manage payment methods"}<ArrowRight aria-hidden="true" /></IconSwap></Link></section>
    {isOperator && empty && <div className={styles.encouragement}><Sparkles aria-hidden="true" /><span><b>Your first payment will unlock earnings insights.</b> Complete a job and your growth view will build automatically.</span></div>}
  </div>;
}
