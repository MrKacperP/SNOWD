"use client";
import styles from "@/components/work-orders/work-orders.module.css";
import CompanyIdentity from "@/components/CompanyIdentity";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useUserChats } from "@/hooks/useUserChats";
import { useWorkOrders } from "@/hooks/useWorkOrders";
import {
  isAsap,
  orderActionNeeded,
  dateMillis,
  orderLabel,
  orderNumber,
  scheduleText,
} from "@/lib/workOrders";
export default function MessagesPage() {
  const { profile, user } = useAuth();
  const { chats, loading, error } = useUserChats(user?.uid, profile?.role);
  const { jobs, names, people, error: jobsError } = useWorkOrders();
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
      if (search.trim() && !haystack.includes(search.trim().toLowerCase())) continue;
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
        Choose a company or customer, then open a conversation. Manage bookings in{" "}
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
      {!loading && !error && !groups.length && <div className="rounded-2xl border p-5">
        <h2 className="font-semibold">{search.trim() ? "No matching conversations" : "Your conversations will appear here"}</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{search.trim() ? "Try a name, address or order number." : "Each booking has its own chat, so messages and updates stay with the right visit."}</p>
        {search.trim() ? <button className="mt-3 min-h-11 underline" onClick={() => setSearch("")}>Clear search</button> : <Link className="mt-3 inline-flex min-h-11 items-center underline" href={profile?.role === "operator" ? "/dashboard/jobs" : "/dashboard/find"}>{profile?.role === "operator" ? "View your jobs" : "Find a shoveler"}</Link>}
      </div>}
      {groups.map(({ other, conversations, jobMap }) => {
        const addresses = [...new Set(conversations.map(chat => jobMap.get(chat.jobId)?.address?.trim()).filter(Boolean))];
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
              className={styles.conversationRow}
              data-unread={count > 0}
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
              <p className="mt-2 text-sm font-semibold">
                {chat.legacyHistory
                  ? "Read-only legacy history"
                  : job
                    ? `${orderLabel(job)}`
                    : "Open conversation"}
              </p>
              {job && !chat.legacyHistory && <p className="visit-timing mt-2" data-asap={isAsap(job)}>{isAsap(job) ? "ASAP · As soon as possible" : `Scheduled · ${scheduleText(job)}`}</p>}
              {job && !chat.legacyHistory && addresses.length > 1 && (
                <p className="mt-2 text-sm font-semibold">{job.address}</p>
              )}
              <p className={styles.messagePreview}>
                {chat.lastMessage || "No messages yet"}
              </p>
              {dateMillis(chat.lastMessageTime) > 0 && <p className="mt-2 text-xs text-[var(--text-muted)]"><time dateTime={new Date(dateMillis(chat.lastMessageTime)).toISOString()}>{new Date(dateMillis(chat.lastMessageTime)).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time></p>}
              <span className="mt-2 inline-flex min-h-9 items-center text-sm font-medium text-[var(--text-secondary)]">Open messages →</span>
            </Link>
          );
        };
        return (
          <details key={other} className={styles.companyGroup}>
            <summary className={styles.companySummary}>
              <span className={styles.companyInfo}>
                <CompanyIdentity person={people[other]} name={names[other] || "Company / customer"} />
                <span className={styles.companyMeta}>
                  {conversations.length} conversation{conversations.length === 1 ? "" : "s"} · View messages
                </span>
              </span>
              {unread(conversations) > 0 && <span className={styles.unreadBadge}>{unread(conversations)} unread</span>}
              <span className={styles.companyChevron} aria-hidden="true">›</span>
            </summary>
            {addresses.length === 1 && <p className={styles.groupAddress}>{addresses[0]}</p>}
            <ul className={styles.companyList}>
              {conversations.map(chat => <li key={chat.id}>{row(chat)}</li>)}
            </ul>
          </details>
        );
      })}
    </div>
  );
}
