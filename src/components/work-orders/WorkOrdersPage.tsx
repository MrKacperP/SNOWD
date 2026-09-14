"use client";
import CompanyIdentity from "@/components/CompanyIdentity";
import { useState } from "react";
import Link from "next/link";
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
import JobFilters, { JOB_FILTERS } from "./JobFilters";
import OrderCard from "./OrderCard";
import styles from "./work-orders.module.css";
export default function WorkOrdersPage({
  history = false,
  schedule = false,
}: {
  history?: boolean;
  schedule?: boolean;
}) {
  const { jobs, names, people, uid, isOperator, loading, error } = useWorkOrders();
  const [tab, setTab] = useState(history ? "history" : "all"),
    [date, setDate] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const localDate = (value: unknown) => {
    const d = new Date(dateMillis(value));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const sorted = [...jobs].sort((a, b) => {
    if (tab === "all" && !schedule) {
      const rank: Record<string, number> = { attention: 0, progress: 1, waiting: 2, upcoming: 3, history: 4 };
      const difference = rank[orderSection(a, uid)] - rank[orderSection(b, uid)];
      if (difference) return difference;
      if (orderSection(a, uid) === "history") return dateMillis(b.createdAt) - dateMillis(a.createdAt);
    }
    return tab === "history"
      ? dateMillis(b.createdAt) - dateMillis(a.createdAt)
      : (dateMillis(a.scheduledDate) || dateMillis(a.createdAt)) - (dateMillis(b.scheduledDate) || dateMillis(b.createdAt));
  });
  const matching = sorted.filter((job) =>
    [orderNumber(job), job.address, names[isOperator ? job.clientId : job.operatorId], job.serviceTypes?.join(" ")]
      .filter(Boolean).join(" ").toLowerCase().includes(search.trim().toLowerCase()),
  );
  const cards = (items: typeof jobs, empty = "No jobs in this view.") =>
    items.length ? (
      [...new Set(items.map(job => isOperator ? job.clientId : job.operatorId))].map(personId => {
        const personOrders = items.filter(job => (isOperator ? job.clientId : job.operatorId) === personId);
        if (!schedule) return (
          <details key={personId} className={styles.companyGroup}>
            <summary className={styles.companySummary}>
              <span className={styles.companyInfo}>
                <CompanyIdentity person={people[personId]} name={names[personId] || (isOperator ? "Customer" : "Company")} />
                <span className={styles.companyMeta}>{personOrders.length} work order{personOrders.length === 1 ? "" : "s"} · View orders</span>
              </span>
              <span className={styles.companyChevron} aria-hidden="true">›</span>
            </summary>
            <ul className={styles.companyList}>
              {personOrders.map(job => (
                <li key={job.id}>
                  <Link className={styles.orderRow} href={`/dashboard/jobs/${job.id}`}>
                    <span className={styles.orderRowMain}>
                      <strong>Work order #{orderNumber(job)}</strong>
                      <span className={styles.secondary}>{job.address || "Address to be confirmed"}</span>
                      <span className={styles.secondary}>{scheduleText(job)}</span>
                      {orderActionNeeded(job, uid) && <span className={styles.rowAction}>{orderActionNeeded(job, uid)}</span>}
                    </span>
                    <span className={styles.orderRowStatus}>
                      <span className={styles.badge} data-status={job.status}>{orderLabel(job)}</span>
                      <span className={styles.secondary}>${Number(job.price || 0).toFixed(2)} CAD</span>
                      <span className={styles.secondary}>View order →</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </details>
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
              onChange={(event) => { setSearch(event.target.value); if (event.target.value) setTab("all"); }} />
          </label>
          {search && <button type="button" className={styles.button} onClick={() => setSearch("")}>Clear search</button>}
          <JobFilters
            value={tab}
            onChange={setTab}
            counts={Object.fromEntries(
              JOB_FILTERS.map(([key]) => [
                key,
                matching.filter((job) => key === "all" || orderSection(job, uid) === key).length,
              ]),
            )}
          />
          <p className={styles.scheduleHint}>
            {tab === "all" ? "All your requests and visits. Choose a filter to focus on what you need." : tab === "attention" ? "Requests, time changes and payments that need your action."
              : tab === "waiting" ? "The other participant needs to respond before these visits are confirmed."
              : tab === "upcoming" ? "Confirmed visits. Open an order to review its schedule and payment."
              : tab === "progress" ? "Visits where the provider is on the way or working."
              : "Completed and cancelled orders. Unpaid cash work remains in Needs attention for the provider."}
          </p>
          <div className="space-y-4">
            {cards(
              matching.filter((j) => tab === "all" || orderSection(j, uid) === tab),
              search.trim()
                ? "No matching orders in this view. Try another search or filter."
                : tab === "all"
                  ? "No jobs yet. Your booking requests and visits will appear here."
                : tab === "waiting"
                  ? "No requests waiting for a response from the other participant."
                : tab === "attention"
                ? "You’re all caught up. No requests or payments need attention."
                : tab === "upcoming"
                  ? "No upcoming jobs. Confirmed bookings will appear here."
                  : tab === "progress"
                    ? "No jobs in progress right now."
                    : "Completed and cancelled work orders will appear here.",
            )}
          </div>
        </>
      )}
    </div>
  );
}
