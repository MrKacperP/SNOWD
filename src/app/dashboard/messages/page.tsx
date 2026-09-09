"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useUserChats } from "@/hooks/useUserChats";
import { useWorkOrders } from "@/hooks/useWorkOrders";
import {
  orderActionNeeded,
  dateMillis,
  orderLabel,
  orderNumber,
  scheduleText,
} from "@/lib/workOrders";
export default function MessagesPage() {
  const { profile, user } = useAuth();
  const { chats, loading, error } = useUserChats(user?.uid, profile?.role);
  const { jobs, names, error: jobsError } = useWorkOrders();
  const [search, setSearch] = useState("");
  const groups = useMemo(() => {
    const jobMap = new Map(jobs.map((job) => [job.id, job]));
    const grouped = new Map<string, typeof chats>();
    for (const chat of [...chats].sort(
      (a, b) => dateMillis(b.lastMessageTime) - dateMillis(a.lastMessageTime),
    )) {
      const other =
        chat.participants.find((id) => id !== user?.uid) || "unknown";
      const job = jobMap.get(chat.jobId);
      const haystack =
        `${names[other] || ""} ${job ? orderNumber(job) : ""} ${job?.address || ""} ${chat.lastMessage || ""}`.toLowerCase();
      if (search && !haystack.includes(search.toLowerCase())) continue;
      grouped.set(other, [...(grouped.get(other) || []), chat]);
    }
    return [...grouped].map(([other, conversations]) => ({
      other,
      conversations,
      jobMap,
    }));
  }, [chats, jobs, names, search, user?.uid]);
  return (
    <div className="mx-auto max-w-4xl space-y-5 py-3">
      <h1 className="text-3xl font-bold">Messages</h1>
      <p className="text-[var(--text-secondary)]">
        One conversation per work order. Bookings and progress are managed in{" "}
        <Link className="font-semibold underline" href="/dashboard/jobs">
          Work orders
        </Link>
        .
      </p>
      <input
        aria-label="Search company, order, address, or message"
        placeholder="Search company, order, address, or message"
        className="min-h-12 w-full rounded-xl border p-3"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {(error || jobsError) && (
        <p role="alert">
          Some conversations or order details could not load. Please reload to
          try again.
        </p>
      )}
      {loading && <p role="status">Loading conversations…</p>}
      {!loading && !groups.length && <p>No conversations found.</p>}
      {groups.map(({ other, conversations, jobMap }) => {
        const history = conversations.filter(
          (chat) =>
            chat.legacyHistory ||
            (["completed", "cancelled"].includes(
              jobMap.get(chat.jobId)?.status || "",
            ) && !(jobMap.get(chat.jobId) && orderActionNeeded(jobMap.get(chat.jobId)!, user?.uid || ""))),
        );
        const active = conversations.filter((chat) => !history.includes(chat));
        const unread = (items: typeof chats) =>
          items.reduce(
            (sum, chat) => sum + (chat.unreadCount?.[user?.uid || ""] || 0),
            0,
          );
        const row = (chat: (typeof chats)[number]) => {
          const job = jobMap.get(chat.jobId),
            count = unread([chat]);
          return (
            <Link
              key={chat.id}
              href={`/dashboard/messages/${chat.id}`}
              className={`block rounded-xl border p-4 ${count ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border-color)]"}`}
            >
              <div className="flex flex-wrap justify-between gap-2">
                <strong>
                  {chat.legacyHistory
                    ? "Earlier shared conversation"
                    : job
                      ? `Order #${orderNumber(job)}`
                      : "Work order · details unavailable"}
                </strong>
                {job && !chat.legacyHistory && orderActionNeeded(job, user?.uid || "") && <span className="rounded-full bg-blue-700 px-3 py-1 text-sm font-bold text-white">Action needed · {orderActionNeeded(job, user?.uid || "")}</span>}
                {count > 0 && (
                  <span className="text-sm font-bold">{count} unread</span>
                )}
              </div>
              <p className="mt-1 text-sm">
                {chat.legacyHistory
                  ? "Read-only legacy history"
                  : job
                    ? `${orderLabel(job)} · ${scheduleText(job)}`
                    : "Open conversation"}
              </p>
              {job && !chat.legacyHistory && (
                <p className="mt-1 text-sm">{job.address}</p>
              )}
              <p className="mt-2 truncate text-sm text-[var(--text-muted)]">
                {chat.lastMessage || "No messages yet"}
              </p>
              <span className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-blue-700 px-4 font-semibold text-white">Open messages →</span>
            </Link>
          );
        };
        return (
          <section
            key={other}
            className="surface-card space-y-4 rounded-3xl p-5"
          >
            <h2 className="text-xl font-bold">
              {names[other] || "Company / customer"}
            </h2>
            {active.map(row)}
            {history.length > 0 && (
              <details>
                <summary className="min-h-11 cursor-pointer py-3 font-semibold">
                  Previous orders ({history.length})
                  {unread(history) > 0 ? ` · ${unread(history)} unread` : ""}
                </summary>
                <div className="space-y-3">{history.map(row)}</div>
              </details>
            )}
          </section>
        );
      })}
    </div>
  );
}
