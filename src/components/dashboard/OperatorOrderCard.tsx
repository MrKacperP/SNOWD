"use client";
import WorkOrderTimeline from "@/components/work-orders/WorkOrderTimeline";
import OrderActions, { orderRequest } from "@/components/work-orders/OrderActions";
import type { Route } from "@/components/SnowdMap";
import IconSwap from "@/components/ui/IconSwap";
import { arrivalLabel } from "@/lib/clientValue";
import { jobDisplayPrice } from "@/lib/marketplacePricing";
import { Job } from "@/lib/types";
import { dateMillis, isAsap, orderActionNeeded, propertySizeLabel } from "@/lib/workOrders";
import { workOrderPresentation } from "@/lib/workOrderPresentation";
import { Check, MapPin, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import css from "./operator-orders.module.css";

export const fullAddress = (job: Job) => [job.address, job.city, job.province, job.postalCode].filter(Boolean).join(", ");
export const directionsUrl = (job: Job) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(Number.isFinite(job.clientLat) && Number.isFinite(job.clientLng) && !job.address ? `${job.clientLat},${job.clientLng}` : fullAddress(job))}`;
export const serviceSummary = (job: Job) => {
  const extras = job.serviceTypes?.filter(service => service !== "driveway").map(service => service.replaceAll("-", " ")) ?? [];
  return [propertySizeLabel(job.propertySize), ...extras].join(" + ");
};
export const paymentLabel = (job: Job) => job.paymentMethod === "cash" ? job.paymentStatus === "paid" ? "Cash paid" : "Cash on completion" : job.paymentStatus === "paid" ? "Paid by card" : job.paymentStatus === "held" ? "Card authorized" : "Card payment pending";

/** "ASAP" in blue, or the booked date with how many days away it is. */
function WhenText({ job }: { job: Job }) {
  if (isAsap(job)) return <strong className={css.asap}>ASAP</strong>;
  const when = new Date(dateMillis(job.scheduledDate));
  const zone = job.scheduleTimezone || "America/Toronto";
  const dayKey = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  const days = Math.round((Date.parse(dayKey(when)) - Date.parse(dayKey(new Date()))) / 86400000);
  const away = days <= 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`;
  const date = new Intl.DateTimeFormat("en-CA", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: zone }).format(when);
  return <><strong>{date}</strong> <span className={css.away}>{away}</span></>;
}
export function RequestWhen({ job, className }: { job: Job; className?: string }) {
  return <p className={className} data-asap={isAsap(job) || undefined}><WhenText job={job} />{isAsap(job) && " · as soon as it's confirmed"}</p>;
}

export type Point = { lat: number; lng: number };
export const pointOf = (lat?: number | null, lng?: number | null): Point | null => Number.isFinite(lat) && Number.isFinite(lng) ? { lat: lat!, lng: lng! } : null;
/** Same straight-line road estimate the map falls back to, for orders the map isn't routing. */
export function estimateTrip(from: Point, to: Point): Route {
  const rad = (deg: number) => deg * Math.PI / 180;
  const a = Math.sin(rad(to.lat - from.lat) / 2) ** 2 + Math.cos(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.sin(rad(to.lng - from.lng) / 2) ** 2;
  const roadKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.25;
  return { minutes: Math.max(3, Math.ceil(roadKm / 35 * 60 + 2)), distanceKm: Math.round(roadKm * 10) / 10 };
}
export const distanceText = (km: number) => km < 1 ? `${Math.max(50, Math.round(km * 1000 / 50) * 50)} m` : `${km} km`;
export type Trip = { trip: Route; estimated: boolean };

/**
 * Accept or decline a new request in place. Blue and orange in the shared pill
 * style; the label swaps to a check or an X on hover. `large` is the open work order.
 */
export function RequestReply({ job, large = false }: { job: Job; large?: boolean }) {
  const [busy, setBusy] = useState<"" | "accept" | "decline">("");
  const [confirmDecline, setConfirmDecline] = useState(false);
  const [error, setError] = useState("");
  const requestIds = useRef<Record<string, string>>({});
  const reply = async (action: "accept" | "decline") => {
    if (busy) return;
    setBusy(action);
    setError("");
    requestIds.current[action] ||= crypto.randomUUID();
    try {
      await orderRequest("/api/jobs/action", { jobId: job.id, revision: job.revision || 0, action, requestId: requestIds.current[action] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
      setBusy("");
    }
  };
  if (job.scheduleProposal) return <div className={css.reply} data-large={large || undefined}><div className={css.replyButtons}><Link href={`/dashboard/jobs/${job.id}`} className={`${css.replyButton} ${css.review}`}>Review new time</Link></div></div>;
  return <div className={css.reply} data-large={large || undefined}>
    {confirmDecline && <p className={css.confirm}>Decline this request? It moves to your history.</p>}
    <div className={css.replyButtons}>
      {confirmDecline ? <>
        <button type="button" className={`${css.replyButton} ${css.keep}`} disabled={!!busy} onClick={() => setConfirmDecline(false)}>Keep it</button>
        <button type="button" className={`${css.replyButton} ${css.decline}`} disabled={!!busy} onClick={() => reply("decline")}><IconSwap icon={<X strokeWidth={3} />}>{busy === "decline" ? "Declining…" : "Yes, decline"}</IconSwap></button>
      </> : <>
        <button type="button" className={`${css.replyButton} ${css.accept}`} disabled={!!busy} onClick={() => reply("accept")}><IconSwap icon={<Check strokeWidth={3} />}>{busy === "accept" ? "Accepting…" : "Accept"}</IconSwap></button>
        <button type="button" className={`${css.replyButton} ${css.decline}`} disabled={!!busy} onClick={() => setConfirmDecline(true)}><IconSwap icon={<X strokeWidth={3} />}>Decline</IconSwap></button>
      </>}
    </div>
    {error && <p role="alert" className={css.error}>{error}</p>}
  </div>;
}

const statusText = (job: Job) => job.declinedBy ? "Request declined" : "Visit cancelled";

/** One work order as the operator sees it on the dashboard and in Jobs. */
export default function OperatorOrderCard({ job, uid, clientName, trip, mapped, onHover }: {
  job: Job; uid: string; clientName?: string; trip: Trip | null; mapped?: boolean; onHover?: (jobId: string) => void;
}) {
  const open = job.status !== "cancelled";
  const isNew = job.status === "pending" && !!orderActionNeeded(job, uid);
  const name = clientName || "Homeowner";
  const showTrip = open && !["en-route", "in-progress", "completed"].includes(job.status) ? trip : null;
  const canProgress = !job.scheduleProposal && ["accepted", "en-route", "in-progress"].includes(job.status);
  const approx = showTrip?.estimated ? "~" : "";
  const next = workOrderPresentation(job, uid);
  return <article className={css.order} data-new={isNew || undefined} data-cancelled={!open || undefined} data-mapped={(open && mapped) || undefined}
    aria-label={`${isNew ? "New request" : "Work order"}: ${name}`}
    onMouseEnter={open && onHover ? () => onHover(job.id) : undefined} onFocus={open && onHover ? () => onHover(job.id) : undefined}>
    <Link href={`/dashboard/jobs/${job.id}`} className={css.overlay} aria-label={`Open work order: ${serviceSummary(job)} for ${name}`} />
    {/* Same shape as the client's widget: progress, a headline, then who / when / pay. */}
    {isNew ? <span className={css.tag} data-tone="new">New request</span> : <div className={css.progress}><WorkOrderTimeline job={job} /></div>}
    <div className={css.headline}>
      <h3>{open ? next.title : statusText(job)}</h3>
    </div>
    <dl className={css.summary}>
      <div><dt>Customer</dt><dd><strong>{name}</strong><span className={css.service}>{serviceSummary(job)}</span></dd></div>
      <div><dt>When</dt><dd>{job.status === "en-route" ? <strong className={css.asap}>{arrivalLabel(job)}</strong> : open ? <span className={css.when}><WhenText job={job} /></span> : "—"}</dd></div>
      <div className={css.pay}><dt>{job.paymentMethod === "cash" ? "Cash" : "Card"} · {paymentLabel(job)}</dt><dd><strong>${jobDisplayPrice(job, true).toFixed(2)}<small> CAD</small></strong></dd></div>
    </dl>
    {open && <p className={css.address}>{job.address ? <a href={directionsUrl(job)} target="_blank" rel="noopener noreferrer" aria-label={`Directions to ${fullAddress(job)} in Google Maps (opens in a new tab)`}><MapPin size={14} aria-hidden="true" />{job.address}</a> : "Address to be confirmed"}{showTrip && <span className={css.trip}>ETA {approx}{showTrip.trip.minutes} min · {approx}{distanceText(showTrip.trip.distanceKm)}</span>}</p>}
    {isNew && <RequestReply job={job} />}
    {canProgress && <div className={css.actions}><OrderActions job={job} compact navigateOnUpdate={false} /></div>}
  </article>;
}

/** A lone order is its own card; several sit together in one card, split by hairlines. */
export function OperatorOrderList({ orders, uid, names, tripTo, hoveredId, onHover, label = "Work orders" }: {
  orders: Job[]; uid: string; names: Record<string, string>; tripTo: (job: Job) => Trip | null;
  hoveredId?: string | null; onHover?: (jobId: string | null) => void; label?: string;
}) {
  if (!orders.length) return null;
  const waiting = orders.filter(job => job.status === "pending" && orderActionNeeded(job, uid)).length;
  return <div className={css.listWrap} onMouseLeave={onHover ? () => onHover(null) : undefined}>
    {orders.length > 1 && <header className={css.listHead}><h2>{orders.length} work orders</h2>{waiting > 0 && <span>{waiting} {waiting === 1 ? "needs" : "need"} your reply</span>}</header>}
    <section className={css.list} data-grouped={orders.length > 1 || undefined} aria-label={label}>
      {orders.map(job => <OperatorOrderCard key={job.id} job={job} uid={uid} clientName={names[job.clientId]} trip={tripTo(job)} mapped={hoveredId === job.id} onHover={onHover} />)}
    </section>
  </div>;
}
