"use client";
import { OperatorOrderList, estimateTrip, pointOf, serviceSummary } from "./OperatorOrderCard";
import { useCancellationNotices } from "@/hooks/useCancellationNotices";
import DashboardMap from "./DashboardMap";
import EarningsChart, { type EarningPoint } from "./EarningsChart";
import { useOperatorPosition } from "./OperatorLocationTracker";
import type { Route } from "@/components/SnowdMap";
import styles from "./home.module.css";
import { useAuth } from "@/context/AuthContext";
import { useWorkOrders } from "@/hooks/useWorkOrders";
import { db } from "@/lib/firebase";
import { Job,OperatorProfile,Transaction } from "@/lib/types";
import { jobDisplayPrice } from "@/lib/marketplacePricing";
import { transactionDisplayAmount } from "@/lib/marketplacePricing";
import { dateMillis, orderActionNeeded, scheduleText } from "@/lib/workOrders";
import { collection,onSnapshot,query,where } from "firebase/firestore";
import Link from "next/link";
import { useCallback,useEffect,useState } from "react";

export default function OperatorDashboard() {
  const { profile } = useAuth();
  const operator = profile as OperatorProfile | null;
  const { jobs, names: clientNames, loading, error } = useWorkOrders();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [earningsLoading, setEarningsLoading] = useState(true);
  const [earningsError, setEarningsError] = useState(false);

  useEffect(() => {
    if (!profile?.uid) return;
    return onSnapshot(query(collection(db, "transactions"), where("operatorId", "==", profile.uid)), snapshot => {
      setTransactions(snapshot.docs.map(document => ({ ...document.data(), id: document.id } as Transaction)));
      setEarningsLoading(false);
      setEarningsError(false);
    }, () => { setEarningsLoading(false); setEarningsError(true); });
  }, [profile?.uid]);

  return <OperatorHomeView operator={operator} jobs={jobs} clientNames={clientNames} loading={loading} loadError={!!error} transactions={transactions} earningsLoading={earningsLoading} earningsError={earningsError} />;
}

export function OperatorHomeView({ operator, jobs, clientNames = {}, loading, loadError, transactions, earningsLoading, earningsError }: {
  operator: OperatorProfile | null; jobs: Job[]; clientNames?: Record<string, string>; loading: boolean; loadError: boolean;
  transactions: Transaction[]; earningsLoading: boolean; earningsError: boolean;
}) {
  const [hoveredJobId, setHoveredJobId] = useState<string | null>(null);
  const [mapRoute, setMapRoute] = useState<Route | null>(null);
  const onMapRoute = useCallback((route: Route | null) => setMapRoute(route), []);
  const { position } = useOperatorPosition();
  const cancellations = useCancellationNotices(jobs, operator?.uid);
  // Newest offer first: a request that just came in takes the top of the dashboard and the map.
  const pending = jobs.filter(job => job.status === "pending" && orderActionNeeded(job, operator?.uid || "")).sort((a, b) => dateMillis(b.createdAt) - dateMillis(a.createdAt));
  const active = jobs.filter(job => ["accepted", "en-route", "in-progress"].includes(job.status)).sort((a, b) => (dateMillis(a.scheduledDate) || dateMillis(a.createdAt)) - (dateMillis(b.scheduledDate) || dateMillis(b.createdAt)));
  const nextJob = active.find(job => job.status === "in-progress") ?? active.find(job => job.status === "en-route") ?? active[0];
  // The map routes to the visit underway, else the newest offer; every other order is a pin that pings on hover.
  const underway = nextJob && ["en-route", "in-progress"].includes(nextJob.status) ? nextJob : undefined;
  const mapJob = underway || pending[0] || nextJob;
  const tripStart = pointOf(position?.lat, position?.lng) || pointOf(operator?.lat, operator?.lng);
  const tripTo = (job: Job): { trip: Route; estimated: boolean } | null => {
    if (job.id === mapJob?.id && mapRoute) return { trip: mapRoute, estimated: false };
    const site = pointOf(job.clientLat, job.clientLng);
    return tripStart && site ? { trip: estimateTrip(tripStart, site), estimated: true } : null;
  };
  const paid = transactions.filter(item => item.status === "paid").sort((a, b) => dateMillis(a.completedAt || a.createdAt) - dateMillis(b.completedAt || b.createdAt));
  const earned = paid.reduce((sum, item) => sum + transactionDisplayAmount(item, true), 0);
  const earnedAmount = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(earned / 100);
  const earningPoints = paid.reduce<EarningPoint[]>((points, item) => {
    const at = dateMillis(item.completedAt || item.createdAt);
    points.push({ at, total: (points.at(-1)?.total || 0) + transactionDisplayAmount(item, true) });
    return points;
  }, []);
  // Start the line from zero just before the first payment so the climb reads from the ground up.
  if (earningPoints.length) earningPoints.unshift({ at: earningPoints[0].at - 86400000, total: 0 });
  const jobsPaid = new Set(paid.map(item => item.jobId)).size;

  const orders = [...cancellations, ...pending, ...active.slice(0, 3)];

  return (
    <div className={`app-page dashboard-home ${styles.home} ${styles.operatorHome} text-[var(--text-primary)]`}>
      <header className="dashboard-overview"><div><h1>{loading ? "Work overview" : pending.length ? `${pending.length} work ${pending.length === 1 ? "order needs" : "orders need"} your reply` : nextJob ? "Your next visit" : "Ready for your next request"}</h1></div></header>
      <div><DashboardMap profile={operator} job={mapJob} role="operator" onRoute={onMapRoute} others={[...pending, ...active]} activeJobId={hoveredJobId} newJobIds={pending.map(job => job.id)} offer={mapJob?.status === "pending" ? { href: `/dashboard/jobs/${mapJob.id}`, title: serviceSummary(mapJob), detail: `$${jobDisplayPrice(mapJob, true).toFixed(2)} CAD · ${mapJob.scheduleMode === "asap" || mapJob.scheduledTime === "ASAP" ? scheduleText(mapJob) : `Due ${scheduleText(mapJob)}`}`, more: pending.length - 1 } : undefined} /></div>
      {!operator?.idVerified && <Link href="/dashboard/settings?tab=verification" className="inline-flex min-h-9 items-center rounded-lg px-2 text-sm font-semibold hover:bg-[var(--bg-secondary)]">Verify your ID to receive jobs</Link>}

      {loadError ? <p role="alert" className="operator-order-note">Could not load work orders. <Link href="/dashboard/jobs">Try again</Link></p> : loading ? <p role="status" className="operator-order-note">Loading work orders…</p> : orders.length
        ? <OperatorOrderList orders={orders} uid={operator?.uid || ""} names={clientNames} tripTo={tripTo} hoveredId={hoveredJobId} onHover={setHoveredJobId} />
        : <div className="client-orders-empty"><div><h3>No jobs requested</h3><p>Your queue is clear.</p></div></div>}

      <section className="dashboard-earnings" aria-labelledby="earnings-heading">
        <div className="dashboard-earnings-head">
          <div>
            <h2 id="earnings-heading">Total earned</h2>
            <p className="dashboard-earnings-value"><strong>{earningsLoading || earningsError ? "—" : earnedAmount}</strong><small>CAD</small></p>
            <p className="dashboard-earnings-meta">{earningsLoading ? "Loading earnings…" : earningsError ? "Could not load earnings." : jobsPaid ? `From ${jobsPaid} ${jobsPaid === 1 ? "job" : "jobs"}` : "No paid work yet"}</p>
          </div>
          <Link href="/dashboard/transactions" className="dashboard-earnings-link">Payments</Link>
        </div>
        {!earningsLoading && !earningsError && <EarningsChart points={earningPoints} />}
      </section>

    </div>
  );
}
