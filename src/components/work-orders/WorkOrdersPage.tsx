"use client";
import { useState } from "react";
import Link from "next/link";
import { useWorkOrders } from "@/hooks/useWorkOrders";
import {
  dateMillis,
  isAsap,
  orderSection,
  hasScheduleConflict,
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
  const { jobs, names, uid, isOperator, loading, error } = useWorkOrders();
  const [tab, setTab] = useState(history ? "history" : "attention"),
    [date, setDate] = useState("");
  const [notice, setNotice] = useState("");
  const localDate = (value: unknown) => {
    const d = new Date(dateMillis(value));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const sorted = [...jobs].sort((a, b) =>
    tab === "history"
      ? dateMillis(b.createdAt) - dateMillis(a.createdAt)
      : (dateMillis(a.scheduledDate) || dateMillis(a.createdAt)) -
        (dateMillis(b.scheduledDate) || dateMillis(b.createdAt)),
  );
  const cards = (items: typeof jobs, empty = "No jobs in this view.") =>
    items.length ? (
      items.map((job) => (
        <OrderCard
          key={job.id}
          job={job}
          onUpdated={setNotice}
          conflict={
            isOperator &&
            job.status === "pending" &&
            hasScheduleConflict(job, jobs)
          }
          name={
            names[isOperator ? job.clientId : job.operatorId] ||
            (isOperator ? "Customer" : "Company")
          }
        />
      ))
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
              : "Track requests, upcoming visits, and completed work."}
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
          <JobFilters
            value={tab}
            onChange={setTab}
            counts={Object.fromEntries(
              JOB_FILTERS.map(([key]) => [
                key,
                jobs.filter((job) => orderSection(job, uid) === key).length,
              ]),
            )}
          />
          <div className="space-y-4">
            {cards(
              sorted.filter((j) => orderSection(j, uid) === tab),
              tab === "attention"
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
