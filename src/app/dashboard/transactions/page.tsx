"use client";

import { jobDisplayPrice, transactionDisplayAmount } from "@/lib/marketplacePricing";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { canAcceptPlatformPayments } from "@/lib/operatorDiscovery";
import { Job, OperatorProfile, Transaction } from "@/lib/types";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { ArrowRight, Banknote, Check, ChevronRight, CircleDollarSign, CreditCard, Hourglass, ReceiptText, Settings2, Sparkles, TrendingUp, WalletCards } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
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
const compactMoney = (cents: number) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", notation: cents >= 100000 ? "compact" : "standard", maximumFractionDigits: cents >= 100000 ? 1 : 0 }).format(cents / 100);
const statusLabel: Record<Transaction["status"], string> = { paid: "Paid", held: "On hold", refunded: "Refunded", cancelled: "Cancelled" };

export default function TransactionsPage() {
  const { profile } = useAuth();
  const isOperator = profile?.role === "operator";
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
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
      setJobs(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as Job))); setJobsError(false);
    }, () => setJobsError(true));
    return () => { stop(); stopJobs(); };
  }, [profile?.uid, isOperator, retry]);

  const paidTransactions = useMemo(() => transactions.filter(item => item.status === "paid"), [transactions]);
  const paid = paidTransactions.reduce((sum, item) => sum + transactionDisplayAmount(item, isOperator), 0);
  const held = transactions.filter(item => item.status === "held").reduce((sum, item) => sum + transactionDisplayAmount(item, isOperator), 0);
  const outstanding = jobs.filter(job => (["accepted", "en-route", "in-progress"].includes(job.status) || (job.paymentMethod === "cash" && job.status === "completed")) && job.paymentStatus === "pending");
  const list = transactions.filter(item => filter === "all" || item.status === filter).sort((a, b) => dateMillis(b.createdAt) - dateMillis(a.createdAt));
  const cashOnly = isOperator && !canAcceptPlatformPayments(profile as OperatorProfile);

  const insights = useMemo(() => {
    const now = new Date(); const currentStart = new Date(now.getFullYear(), now.getMonth(), 1); const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const sumRange = (start: Date, end?: Date) => paidTransactions.reduce((sum, item) => { const date = toDate(item.completedAt || item.createdAt); return date && date >= start && (!end || date < end) ? sum + transactionDisplayAmount(item, isOperator) : sum; }, 0);
    const currentMonth = sumRange(currentStart); const previousMonth = sumRange(previousStart, currentStart);
    const growth = previousMonth > 0 ? Math.round(((currentMonth - previousMonth) / previousMonth) * 100) : null;
    const cash = paidTransactions.filter(item => item.paymentMethod === "cash").reduce((sum, item) => sum + transactionDisplayAmount(item, isOperator), 0); const card = paid - cash;
    const chart = Array.from({ length: 6 }, (_, index) => { const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1); const next = new Date(date.getFullYear(), date.getMonth() + 1, 1); return { month: date.toLocaleDateString("en-CA", { month: "short" }), amount: sumRange(date, next) / 100 }; });
    const clients = new Set(paidTransactions.map(item => isOperator ? item.clientId : item.operatorId).filter(Boolean)).size;
    return { currentMonth, growth, cash, card, chart, clients };
  }, [isOperator, paid, paidTransactions]);
  const empty = !loading && !error && transactions.length === 0;

  return <div className={styles.page}>
    <header className={styles.header}><div><p className={styles.eyebrow}>{isOperator ? "Earnings overview" : "Payments overview"}</p><h1>{isOperator ? "Your money, clearly." : "Payments"}</h1><p>{isOperator ? "See what you’ve earned, where it came from, and what’s on the way." : "Track every payment, receipt, and pending charge in one place."}</p></div><Link href="/dashboard/settings?tab=payment" className={styles.settingsButton}><Settings2 aria-hidden="true" /> Payment settings</Link></header>
    {(error || jobsError) && <div role="alert" className={styles.errorBanner}><span>Some payment information could not load.</span><button onClick={() => setRetry(value => value + 1)}>Try again</button></div>}
    <section className={styles.heroGrid} aria-label="Payment summary">
      <div className={styles.balanceCard}><div className={styles.balanceTopline}><span>{isOperator ? "Total earned" : "Total paid"}</span><span className={styles.currency}>CAD</span></div><p className={styles.balance}>{loading || error ? "—" : money(paid)}</p><div className={styles.balanceFooter}><span className={styles.growthPill}><TrendingUp aria-hidden="true" />{insights.growth === null ? (insights.currentMonth > 0 ? "First earning month" : "Ready for your first payment") : `${insights.growth >= 0 ? "+" : ""}${insights.growth}% vs last month`}</span>{isOperator && <Link href="/dashboard/analytics">Full analytics <ArrowRight aria-hidden="true" /></Link>}</div></div>
      <div className={styles.statCard}><div className={`${styles.iconBox} ${styles.amber}`}><Hourglass aria-hidden="true" /></div><div><span>On the way</span><strong>{loading || error ? "—" : money(held)}</strong><small>Released after completed work</small></div></div>
      <div className={styles.statCard}><div className={`${styles.iconBox} ${styles.blue}`}><ReceiptText aria-hidden="true" /></div><div><span>{isOperator ? "Paid jobs" : "Receipts"}</span><strong>{loading || error ? "—" : paidTransactions.length}</strong><small>{insights.clients} {isOperator ? (insights.clients === 1 ? "customer" : "customers") : (insights.clients === 1 ? "operator" : "operators")}</small></div></div>
    </section>
    {isOperator && !empty && <section className={styles.growthSection} aria-labelledby="growth-heading">
      <div className={styles.chartCard}><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Last 6 months</p><h2 id="growth-heading">Earnings growth</h2></div><div className={styles.monthTotal}><span>This month</span><strong>{compactMoney(insights.currentMonth)}</strong></div></div><div className={styles.chart} aria-label="Monthly earnings chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={insights.chart} margin={{ top: 14, right: 2, left: 2, bottom: 0 }}><defs><linearGradient id="earningsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2e64d6" stopOpacity={0.28} /><stop offset="100%" stopColor="#2e64d6" stopOpacity={0.02} /></linearGradient></defs><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#60717d", fontSize: 12 }} dy={10} /><Tooltip cursor={{ stroke: "#b9c9e8", strokeDasharray: "4 4" }} formatter={(value) => [money(Number(value || 0) * 100), "Earnings"]} contentStyle={{ border: "1px solid #dbe3e8", borderRadius: 14, boxShadow: "0 12px 30px rgba(17,43,59,.12)" }} /><Area type="monotone" dataKey="amount" stroke="#285cce" strokeWidth={3} fill="url(#earningsFill)" activeDot={{ r: 5, fill: "#285cce", stroke: "white", strokeWidth: 3 }} /></AreaChart></ResponsiveContainer></div></div>
      <div className={styles.sourcesCard}><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Payment mix</p><h2>Where it came from</h2></div></div><div className={styles.sourceList}><div><span className={`${styles.sourceIcon} ${styles.cash}`}><Banknote aria-hidden="true" /></span><span><b>Cash</b><small>Paid directly to you</small></span><strong>{money(insights.cash)}</strong></div><div><span className={`${styles.sourceIcon} ${styles.card}`}><CreditCard aria-hidden="true" /></span><span><b>Card</b><small>Processed securely</small></span><strong>{money(insights.card)}</strong></div></div><div className={styles.mixBar} aria-label={`Cash ${paid ? Math.round(insights.cash / paid * 100) : 0} percent, card ${paid ? Math.round(insights.card / paid * 100) : 0} percent`}><span style={{ width: `${paid ? insights.cash / paid * 100 : 0}%` }} /></div></div>
    </section>}
    {outstanding.length > 0 && <section className={styles.settleCard} aria-labelledby="settle-heading"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Needs attention</p><h2 id="settle-heading">Payments to settle</h2></div><span className={styles.count}>{outstanding.length}</span></div><div className={styles.settleList}>{outstanding.map(job => <Link key={job.id} href={`/dashboard/jobs/${job.id}`}><span className={styles.sourceIcon}>{job.paymentMethod === "cash" ? <Banknote aria-hidden="true" /> : <CreditCard aria-hidden="true" />}</span><span><b>{job.address || "Snow removal"}</b><small>{job.paymentMethod === "cash" ? "Cash · pay the operator directly" : "Card payment needed"}</small></span><strong>{money(jobDisplayPrice(job, isOperator) * 100)}</strong><ChevronRight aria-hidden="true" /></Link>)}</div></section>}
    <section className={styles.historyCard} aria-labelledby="history-heading"><div className={styles.historyHeader}><div><p className={styles.eyebrow}>Activity</p><h2 id="history-heading">Payment history</h2></div><div className={styles.filters} aria-label="Filter payment history">{(["all", "paid", "held", "refunded"] as const).map(value => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === "all" ? "All" : statusLabel[value]}</button>)}</div></div>
      {loading ? <div role="status" className={styles.emptyState}>Loading payments…</div> : list.length === 0 ? <div className={styles.emptyState}><span><WalletCards aria-hidden="true" /></span><h3>{error ? "Payment history is unavailable" : filter === "all" ? "Your payment history starts here" : `No ${filter} payments`}</h3><p>{error ? "Try loading the page again." : filter === "all" ? "Completed jobs and receipts will appear here automatically." : "Choose another filter to see more activity."}</p></div> : <div className={styles.transactionList}>{list.map(item => { const person = isOperator ? item.clientName || "Customer" : item.operatorName || "Operator"; return <Link key={item.id} href={item.jobId ? `/dashboard/jobs/${item.jobId}` : "/dashboard/transactions"} className={styles.transactionRow}><span className={`${styles.transactionIcon} ${item.paymentMethod === "cash" ? styles.cash : styles.card}`}>{item.paymentMethod === "cash" ? <Banknote aria-hidden="true" /> : <CreditCard aria-hidden="true" />}</span><span className={styles.transactionMain}><b>{person}</b><small>{item.description || "Snow removal"} · {dateText(item.createdAt)}</small></span><span className={`${styles.status} ${styles[item.status]}`}>{item.status === "paid" && <Check aria-hidden="true" />}{statusLabel[item.status]}</span><strong className={styles.transactionAmount}>{isOperator && item.status === "paid" ? "+" : ""}{money(transactionDisplayAmount(item, isOperator))}</strong><ChevronRight className={styles.rowChevron} aria-hidden="true" /></Link>; })}</div>}
    </section>
    <section className={styles.paymentOptions}><div className={styles.optionCopy}><span className={styles.optionIcon}><CircleDollarSign aria-hidden="true" /></span><div><p className={styles.eyebrow}>Payment options</p><h2>{cashOnly ? "Add card payments when you’re ready" : "You’re set up to get paid"}</h2><p>{cashOnly ? "You can take cash jobs now. Connect Stripe to also accept cards and receive secure bank payouts." : isOperator ? "Manage cash and card preferences, payout details, and your Stripe connection." : "Manage your preferred way to pay and review secure payment details."}</p></div></div><Link href="/dashboard/settings?tab=payment">{isOperator ? "Manage how I get paid" : "Manage payment methods"}<ArrowRight aria-hidden="true" /></Link></section>
    {isOperator && empty && <div className={styles.encouragement}><Sparkles aria-hidden="true" /><span><b>Your first payment will unlock earnings insights.</b> Complete a job and your growth view will build automatically.</span></div>}
  </div>;
}
