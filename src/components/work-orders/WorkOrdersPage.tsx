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
import OrderCard from "./OrderCard";
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
  const tabs = [
    ["attention", "Needs attention"],
    ["upcoming", "Upcoming"],
    ["progress", "In progress"],
    ["history", "History"],
  ];
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
  const cards = (items: typeof jobs) =>
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
      <p className="rounded-2xl bg-[var(--bg-secondary)] p-6 text-[var(--text-secondary)]">
        No work orders here.
      </p>
    );
  return (
    <div className="mx-auto max-w-5xl space-y-6 py-3">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl font-bold">
            {schedule ? "Schedule" : "Work orders"}
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            {schedule
              ? "Your appointments and ASAP queue, with actions ready here."
              : "Every visit has its own order, progress, and conversation."}
          </p>
        </div>
        {!isOperator && (
          <Link
            className="rounded-xl bg-[var(--ink)] px-5 py-3 font-semibold text-white"
            href="/dashboard/find"
          >
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
          <label className="block max-w-xs font-semibold">
            Show appointments for
            <input
              className="mt-2 block min-h-12 w-full rounded-xl border p-3"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          {date && (
            <button className="min-h-11 underline" onClick={() => setDate("")}>
              Show all dates
            </button>
          )}
          <section className="space-y-4">
            <h2 className="text-xl font-bold">Confirmed appointments</h2>
            {cards(
              sorted.filter(
                (j) =>
                  ["accepted", "en-route", "in-progress"].includes(j.status) &&
                  !isAsap(j) &&
                  (!date || localDate(j.scheduledDate) === date),
              ),
            )}
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-bold">ASAP queue</h2>
            {cards(
              sorted.filter(
                (j) =>
                  ["accepted", "en-route", "in-progress"].includes(j.status) &&
                  isAsap(j),
              ),
            )}
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-bold">Unconfirmed requests</h2>
            <p>These requests are not confirmed appointments.</p>
            {cards(sorted.filter((j) => j.status === "pending"))}
          </section>
        </>
      ) : (
        <>
          <nav aria-label="Work order filters" className="flex flex-wrap gap-2">
            {tabs.map(([key, label]) => (
              <button
                key={key}
                aria-pressed={tab === key}
                className={`min-h-12 rounded-xl border px-4 py-3 font-semibold ${tab === key ? "bg-[var(--ink)] text-white" : "bg-white"}`}
                onClick={() => setTab(key)}
              >
                {label}{" "}
                <span className="ml-1">
                  {jobs.filter((j) => orderSection(j, uid) === key).length}
                </span>
              </button>
            ))}
          </nav>
          <div className="space-y-4">
            {cards(sorted.filter((j) => orderSection(j, uid) === tab))}
          </div>
        </>
      )}
    </div>
  );
}
