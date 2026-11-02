"use client";
import IconSwap from "@/components/ui/IconSwap";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, CalendarDays, Banknote, CreditCard } from "lucide-react";
import { useWorkOrders } from "@/hooks/useWorkOrders";
import { jobDisplayPrice } from "@/lib/marketplacePricing";
import { dateMillis, isAsap, orderNumber, orderActionNeeded, propertySizeLabel, scheduleText } from "@/lib/workOrders";
import styles from "./work-orders.module.css";
import ui from "./order-list.module.css";
import { OperatorOrderList, estimateTrip, pointOf } from "@/components/dashboard/OperatorOrderCard";
import { ClientOrderList } from "@/components/dashboard/ClientOrderCard";
import { useOperatorPosition } from "@/components/dashboard/OperatorLocationTracker";
import { useAuth } from "@/context/AuthContext";

export default function WorkOrdersPage({ history = false, schedule = false }: { history?: boolean; schedule?: boolean }) {
  const data = useWorkOrders();
  const { jobs, names, uid, isOperator, loading, error } = data;
  const { profile } = useAuth();
  const { position } = useOperatorPosition();
  const tripStart = pointOf(position?.lat, position?.lng) || pointOf(profile?.lat, profile?.lng);
  const tripTo = (job: typeof jobs[number]) => {
    const site = pointOf(job.clientLat, job.clientLng);
    return tripStart && site ? { trip: estimateTrip(tripStart, site), estimated: true } : null;
  };
  const [search, setSearch] = useState("");
  const [view, setView] = useState(history ? "history" : "current");
  const closed = (job: typeof jobs[number]) => ["completed", "cancelled"].includes(job.status);
  // Unsettled completed orders stay visible until the outstanding step is done.
  const current = (job: typeof jobs[number]) => !closed(job) || !!orderActionNeeded(job, uid);
  // Closest to done first: finished-but-unsettled, clearing, on the way, confirmed, then requests.
  const stages = ["completed", "cancelled", "in-progress", "en-route", "accepted", "pending"];
  const rank = (job: typeof jobs[number]) => stages.indexOf(job.status);
  const query = search.trim().toLowerCase();
  const visible = jobs.filter(job => view === "current" ? current(job) : closed(job))
    .filter(job => [names[isOperator ? job.clientId : job.operatorId], job.address, orderNumber(job), job.serviceTypes?.join(" ").replaceAll("-", " ")].filter(Boolean).join(" ").toLowerCase().includes(query))
    .sort((a, b) => view === "history"
      ? dateMillis(b.completionTime || b.cancelledAt || b.updatedAt || b.createdAt) - dateMillis(a.completionTime || a.cancelledAt || a.updatedAt || a.createdAt)
      // Same stage: the older order comes first.
      : rank(a) - rank(b) || dateMillis(a.createdAt) - dateMillis(b.createdAt));

  if (!schedule) return <div className={ui.page}>
    <header className={ui.heading}>
      <h1>Work orders</h1>
      {!isOperator && <Link className={ui.primary} href="/dashboard/find"><IconSwap icon={<ArrowRight size={16} aria-hidden="true" />}>Book snow help <ArrowRight size={16} aria-hidden="true" /></IconSwap></Link>}
    </header>
    <section className={ui.panel} aria-label="Your work orders">
      <div className={ui.toolbar}>
        <div className={ui.views} role="group" aria-label="Work order view">
          <button type="button" aria-pressed={view === "current"} onClick={() => setView("current")}>Current</button>
          <button type="button" aria-pressed={view === "history"} onClick={() => setView("history")}>History</button>
        </div>
        <label className={ui.search}><Search size={17} aria-hidden="true" /><input aria-label="Search work orders" type="search" placeholder="Search orders" value={search} onChange={event => setSearch(event.target.value)} /></label>
      </div>
      {loading ? <p className={ui.empty} role="status">Loading work orders…</p> : error ? <p className={ui.empty} role="alert">{error}</p> : visible.length && isOperator
        // Operators see orders exactly as the dashboard shows them: progress, timing, pay, trip and reply.
        ? <OperatorOrderList orders={visible} uid={uid} names={names} tripTo={tripTo} label={view === "history" ? "Past work orders" : "Current work orders"} />
        : visible.length
        // Clients get the same card, tailored to them.
        ? <ClientOrderList orders={visible} names={names} />
        : <div className={ui.empty}>
        <h2>{query ? "No matching orders" : view === "history" ? "No past work orders" : "No current work orders"}</h2>
        <p>{query ? "Try a name, address or order number." : view === "history" ? "Completed and cancelled visits will appear here." : isOperator ? "New requests and upcoming visits will appear here." : "Book snow help to arrange your next visit."}</p>
        {query && <button className={ui.secondary} type="button" onClick={() => setSearch("")}>Clear search</button>}
      </div>}
    </section>
  </div>;

  const sorted = [...jobs].sort((a, b) => (dateMillis(a.scheduledDate) || dateMillis(a.createdAt)) - (dateMillis(b.scheduledDate) || dateMillis(b.createdAt)));
  const cards = (items: typeof jobs, empty: string) => items.length ? <div className="grid gap-2">{items.map(job => {
    const timing = isAsap(job) ? (job.status === "en-route" && job.etaSource === "route" && job.eta ? `About ${job.eta} min away` : "ASAP · time to confirm") : scheduleText(job);
    const services = job.serviceTypes?.filter(service => service !== "driveway").map(service => service.replaceAll("-", " ")).join(" · ") || "Driveway clearing";
    const capacity = propertySizeLabel(job.propertySize);
    return <Link key={job.id} href={`/dashboard/jobs/${job.id}`} className="flex min-h-[82px] items-center justify-between gap-3 rounded-2xl border border-[var(--border-soft)] bg-white px-4 py-3 text-inherit no-underline shadow-[0_5px_18px_rgba(17,43,59,.045)] transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">
      <span className="grid min-w-0 gap-1"><span className="flex items-center gap-2 text-sm font-semibold"><CalendarDays size={15} className="shrink-0 text-blue-700" />{timing}</span><span className="truncate text-xs capitalize text-[var(--text-secondary)]">{names[isOperator ? job.clientId : job.operatorId] || (isOperator ? "Customer" : "Shoveler")} · {capacity} · {services}</span></span>
      <strong className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-emerald-50 px-3 py-2 text-base text-emerald-800">{job.paymentMethod === "cash" ? <Banknote size={15} /> : <CreditCard size={15} />}${jobDisplayPrice(job, isOperator).toFixed(2)}</strong>
    </Link>;
  })}</div> : <p className={styles.empty}>{empty}</p>;
  return <div className={styles.page}>
    <header className={styles.header}><h1>Schedule</h1></header>
    {error && <p role="alert">{error}</p>}
    {loading ? <p role="status">Loading work orders…</p> : <>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Booked visits</h2>
            </div>
            <div className="space-y-3">
              {cards(
                sorted.filter(
                  (j) =>
                    ["accepted", "en-route", "in-progress"].includes(
                      j.status,
                    ) &&
                    !isAsap(j),
                ),
                "None",
              )}
            </div>
          </section>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>ASAP</h2>
            </div>
            <div className="space-y-3">
              {cards(
                sorted.filter(
                  (j) =>
                    ["accepted", "en-route", "in-progress"].includes(
                      j.status,
                    ) && isAsap(j),
                ),
                "None",
              )}
            </div>
          </section>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Waiting confirmation</h2>
            </div>
            <div className="space-y-3">
              {cards(
                sorted.filter((j) => j.status === "pending"),
                "None",
              )}
            </div>
          </section>
    </>}
  </div>;
}
