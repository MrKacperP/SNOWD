"use client";
import OrderActions from "@/components/work-orders/OrderActions";
import WorkOrderTimeline from "@/components/work-orders/WorkOrderTimeline";
import { useArrivalLabel } from "@/hooks/useArrivalLabel";
import { Job } from "@/lib/types";
import { orderActionNeeded } from "@/lib/workOrders";
import { workOrderPresentation } from "@/lib/workOrderPresentation";
import { MapPin } from "lucide-react";
import Link from "next/link";
import { RequestWhen, paymentLabel, serviceSummary } from "./OperatorOrderCard";
import css from "./operator-orders.module.css";

/** One work order as the client sees it: the same simple card the operator gets. */
export default function ClientOrderCard({ job, providerName }: { job: Job; providerName?: string }) {
  const arrival = useArrivalLabel(job);
  const open = job.status !== "cancelled";
  const needsReply = !!orderActionNeeded(job, job.clientId);
  const name = providerName || "Service provider";
  const live = ["en-route", "in-progress"].includes(job.status);
  const next = workOrderPresentation(job, job.clientId);
  return <article className={css.order} data-cancelled={!open || undefined} aria-label={`Work order: ${name}`}>
    <Link href={`/dashboard/jobs/${job.id}`} className={css.overlay} aria-label={`Open work order: ${serviceSummary(job)} with ${name}`} />
    <div className={css.progress}><WorkOrderTimeline job={job} /></div>
    <div className={css.headline}>
      <h3>{next.title}</h3>
    </div>
    <dl className={css.summary}>
      <div><dt>Your shoveler</dt><dd><strong>{name}</strong><span className={css.service}>{serviceSummary(job)}</span></dd></div>
      <div><dt>When</dt><dd>{live ? <strong className={css.asap}>{arrival}</strong> : open ? <RequestWhen job={job} className={css.when} /> : "—"}</dd></div>
      <div className={css.pay}><dt>{job.paymentMethod === "cash" ? "Cash" : "Card"} · {paymentLabel(job)}</dt><dd><strong>${job.price.toFixed(2)}<small> CAD</small></strong></dd></div>
    </dl>
    {open && <p className={css.address}>{job.address ? <span><MapPin size={14} aria-hidden="true" /> {job.address}</span> : "Address to be confirmed"}</p>}
    {needsReply && <div className={css.actions}><OrderActions job={job} compact navigateOnUpdate={false} /></div>}
  </article>;
}

/** A lone order is its own card; several share one card, split by hairlines. */
export function ClientOrderList({ orders, names }: { orders: Job[]; names: Record<string, string> }) {
  if (!orders.length) return null;
  return <div className={css.listWrap}>
    {orders.length > 1 && <header className={css.listHead}><h2>{orders.length} work orders</h2></header>}
    <section className={css.list} data-grouped={orders.length > 1 || undefined} aria-label="Work orders">
      {orders.map(job => <ClientOrderCard key={job.id} job={job} providerName={names[job.operatorId]} />)}
    </section>
  </div>;
}
