"use client";
import { jobDisplayPrice } from "@/lib/marketplacePricing";
import CompanyIdentity from "@/components/CompanyIdentity";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, MapPin, WalletCards } from "lucide-react";
import { useWorkOrders } from "@/hooks/useWorkOrders";
import {
  dateMillis,
  isAsap,
  orderSection,
  hasScheduleConflict,
  orderNumber,
  orderLabel,
  orderActionNeeded,
  scheduleText,
} from "@/lib/workOrders";
import OrderCard from "./OrderCard";
import styles from "./work-orders.module.css";

const GROUP_FILTERS = [
  ["all", "All work orders"],
  ["in-progress", "In progress"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
] as const;
export default function WorkOrdersPage({
  history = false,
  schedule = false,
}: {
  history?: boolean;
  schedule?: boolean;
}) {
  const { jobs, names, people, uid, isOperator, loading, error } = useWorkOrders();
  const [date, setDate] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [groupFilters, setGroupFilters] = useState<Record<string, string>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const localDate = (value: unknown) => {
    const d = new Date(dateMillis(value));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const sorted = [...jobs].sort((a, b) => {
    if (!schedule) return dateMillis(b.createdAt) - dateMillis(a.createdAt);
    return (dateMillis(a.scheduledDate) || dateMillis(a.createdAt)) - (dateMillis(b.scheduledDate) || dateMillis(b.createdAt));
  });
  const matching = sorted.filter((job) =>
    [orderNumber(job), job.address, names[isOperator ? job.clientId : job.operatorId], job.serviceTypes?.join(" ")]
      .filter(Boolean).join(" ").toLowerCase().includes(search.trim().toLowerCase()),
  );
  const cards = (items: typeof jobs, empty = "No jobs in this view.") =>
    items.length ? (
      [...new Set(items.map(job => isOperator ? job.clientId : job.operatorId))].map(personId => {
        const personOrders = items.filter(job => (isOperator ? job.clientId : job.operatorId) === personId);
        const groupFilter = groupFilters[personId] || "all";
        const visibleOrders = personOrders.filter(job => groupFilter === "all" || job.status === groupFilter);
        const expanded = isOperator || !!expandedGroups[personId];
        if (!schedule) return (
          <section key={personId} className={styles.companyGroup}>
            <button
              type="button"
              className={`${styles.companySummary} w-full text-left`}
              aria-expanded={expanded}
              onClick={() => {
                if (!isOperator) setExpandedGroups(current => ({ ...current, [personId]: !current[personId] }));
              }}
            >
              <span className={styles.companyInfo}>
                <CompanyIdentity person={people[personId]} name={names[personId] || (isOperator ? "Customer" : "Company")} />
                <span className={styles.companyMeta}>{personOrders.length} work order{personOrders.length === 1 ? "" : "s"}</span>
              </span>
              {!isOperator && <span className={styles.companyChevron} aria-hidden="true">›</span>}
            </button>
            {expanded && <><div className={styles.companyTools}>
              <label className={styles.companyFilter}>
                <span>View work orders</span>
                <select
                  aria-label={`Filter work orders for ${names[personId] || (isOperator ? "customer" : "operator")}`}
                  value={groupFilter}
                  onChange={(event) => setGroupFilters(current => ({ ...current, [personId]: event.target.value }))}
                >
                  {GROUP_FILTERS.map(([key, label]) => (
                    <option key={key} value={key}>
                      {label} ({personOrders.filter(job => key === "all" || job.status === key).length})
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <ul className={styles.companyList}>
              {visibleOrders.map(job => (
                <li key={job.id}>
                  <Link className={styles.orderRow} href={`/dashboard/jobs/${job.id}`}>
                    <span className={styles.orderRowHeader}>
                      <span className={styles.orderReference}>Work order #{orderNumber(job)}</span>
                      <span className={styles.badge} data-status={job.status}>{orderLabel(job)}</span>
                    </span>
                    <span className={styles.orderHighlights}>
                      <span className={styles.orderHighlight}>
                        <CalendarClock aria-hidden="true" size={20} />
                        <span>
                          <span className={styles.orderHighlightLabel}>Date and time</span>
                          <strong>{scheduleText(job)}</strong>
                        </span>
                      </span>
                      <span className={styles.orderHighlight}>
                        <WalletCards aria-hidden="true" size={20} />
                        <span>
                          <span className={styles.orderHighlightLabel}>Payment amount</span>
                          <strong className={styles.orderPrice}>${jobDisplayPrice(job, isOperator).toFixed(2)} CAD</strong>
                          <span className={styles.orderPaymentMethod}>{job.paymentMethod === "cash" ? "Cash" : job.paymentMethod === "e-transfer" ? "E-transfer" : "Card"}</span>
                        </span>
                      </span>
                    </span>
                    <span className={styles.orderRowFooter}>
                      <span className={styles.orderAddress}>
                        <MapPin aria-hidden="true" size={16} />
                        {job.address || "Address to be confirmed"}
                      </span>
                      <span className={styles.orderView}>View order <ArrowRight aria-hidden="true" size={16} /></span>
                    </span>
                    <span className={styles.orderRowMain}>
                      {orderActionNeeded(job, uid) && <span className={styles.rowAction}>{orderActionNeeded(job, uid)}</span>}
                    </span>
                  </Link>
                </li>
              ))}
              {!visibleOrders.length && (
                <li className={styles.groupEmpty}>No work orders match this filter.</li>
              )}
            </ul></>}
          </section>
        );
        return <section key={personId} className="space-y-3 rounded-2xl border border-[var(--border-color)] p-3 sm:p-4">
          <header className="flex items-center justify-between gap-3"><h2 className="font-semibold"><CompanyIdentity person={people[personId]} name={names[personId] || (isOperator ? "Customer" : "Company")} /></h2><span className="text-sm text-[var(--text-muted)]">{personOrders.length} order{personOrders.length === 1 ? "" : "s"}</span></header>
          {personOrders.map(job => <OrderCard key={job.id} job={job} person={people[personId]} onUpdated={setNotice} conflict={isOperator && job.status === "pending" && hasScheduleConflict(job, jobs)} name={names[personId] || (isOperator ? "Customer" : "Company")} />)}
        </section>;
      })
    ) : (
      <p className={styles.empty}>{empty}</p>
    );
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className="font-headline text-3xl font-bold">
            {schedule ? "Schedule" : history ? "Job history" : "Work orders"}
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            {schedule
              ? "See booked visits, ASAP jobs, and requests awaiting confirmation."
              : isOperator ? "Choose a customer to view their work orders." : "Choose a company to view all your work orders with them."}
          </p>
        </div>
        {!isOperator && (
          <Link className={styles.button} href="/dashboard/find">
            Book snow help
          </Link>
        )}
      </header>
      {notice && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-4 text-emerald-950"
        >
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Loading work orders…</p>
      ) : schedule ? (
        <>
          <div className={styles.scheduleTools}>
            <label className="block text-sm font-medium">
              Appointment date
              <input
                className={styles.dateInput}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            {date && (
              <button className={styles.button} onClick={() => setDate("")}>
                Show all dates
              </button>
            )}
            <p className={styles.scheduleHint}>
              ASAP jobs and unconfirmed requests are always shown.
            </p>
          </div>
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
                    !isAsap(j) &&
                    (!date || localDate(j.scheduledDate) === date),
                ),
                date
                  ? "No booked visits on this date. Choose another date or show all dates."
                  : "No booked visits yet. Accepted requests will appear here.",
              )}
            </div>
          </section>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>ASAP jobs</h2>
              <span className="text-sm text-[var(--text-secondary)]">
                Arrival time to be confirmed
              </span>
            </div>
            <div className="space-y-3">
              {cards(
                sorted.filter(
                  (j) =>
                    ["accepted", "en-route", "in-progress"].includes(
                      j.status,
                    ) && isAsap(j),
                ),
                "No ASAP jobs waiting.",
              )}
            </div>
          </section>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Awaiting confirmation</h2>
            </div>
            <p className="mb-3 text-sm text-[var(--text-secondary)]">
              These requests are not booked yet.
            </p>
            <div className="space-y-3">
              {cards(
                sorted.filter((j) => j.status === "pending"),
                "No requests awaiting confirmation.",
              )}
            </div>
          </section>
        </>
      ) : (
        <>
          <label className={styles.searchLabel}>
            Find a work order
            <input type="search" className={styles.searchInput} value={search}
              placeholder="Search order number, name, address or service"
              onChange={(event) => setSearch(event.target.value)} />
          </label>
          {search && <button type="button" className={styles.button} onClick={() => setSearch("")}>Clear search</button>}
          <p className={styles.scheduleHint}>
            {history
              ? "Completed and cancelled work orders, with the most recent first."
              : `Choose ${isOperator ? "a customer" : "an operator"} to see their newest work orders and filter that list.`}
          </p>
          <div className="space-y-4">
            {cards(
              history ? matching.filter((job) => orderSection(job, uid) === "history") : matching,
              search.trim()
                ? "No matching work orders. Try another search."
                : history
                  ? "Completed and cancelled work orders will appear here."
                  : "No jobs yet. Your booking requests and visits will appear here.",
            )}
          </div>
        </>
      )}
    </div>
  );
}
