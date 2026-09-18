"use client";
import styles from "@/components/work-orders/work-orders.module.css";
import CompanyIdentity from "@/components/CompanyIdentity";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useUserChats } from "@/hooks/useUserChats";
import { useWorkOrders } from "@/hooks/useWorkOrders";
import {
  orderActionNeeded,
  dateMillis,
  orderLabel,
  orderNumber,
  isOpenOrder,
} from "@/lib/workOrders";
import { AppPage, EmptyState } from "@/components/ui/AppPrimitives";
export default function MessagesPage() {
  const { profile, user } = useAuth();
  const { chats, loading, error } = useUserChats(user?.uid, profile?.role);
  const { jobs, names, people, error: jobsError } = useWorkOrders();
  const [search, setSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
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
    return [...grouped]
      .map(([other, conversations]) => ({
        other,
        conversations: [...conversations].sort((a, b) => {
          const activeDifference = Number(isOpenOrder(jobMap.get(b.jobId))) - Number(isOpenOrder(jobMap.get(a.jobId)));
          return activeDifference || dateMillis(b.lastMessageTime) - dateMillis(a.lastMessageTime);
        }),
        jobMap,
      }))
      .sort((a, b) => {
        const aActive = a.conversations.some(chat => isOpenOrder(jobMap.get(chat.jobId)));
        const bActive = b.conversations.some(chat => isOpenOrder(jobMap.get(chat.jobId)));
        return Number(bActive) - Number(aActive) || dateMillis(b.conversations[0]?.lastMessageTime) - dateMillis(a.conversations[0]?.lastMessageTime);
      });
  }, [chats, jobs, names, search, user?.uid]);
  return (
    <AppPage eyebrow="Stay connected" title="Messages" description="Your visits and conversations, in one place.">
      <div className="app-search"><Search size={19} aria-hidden="true" /><input
        type="search"
        aria-label="Search company, order, address, or message"
        placeholder="Search conversations"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />{search && <button type="button" aria-label="Clear search" onClick={() => setSearch("")}><X size={18} /></button>}</div>
      {(error || jobsError) && (
        <p role="alert">
          Some conversations or order details could not load. Please reload to
          try again.
        </p>
      )}
      {loading && <p role="status">Loading conversations…</p>}
      {!loading && !error && !groups.length && (search.trim() ? <div className="empty-state"><h2>No matching conversations</h2><p>Try a name, address, or order number.</p><button className="btn-secondary mt-5" onClick={() => setSearch("")}>Clear search</button></div> : <EmptyState title="No messages yet" description="Your conversations will appear after a visit is requested." actionHref={profile?.role === "operator" ? "/dashboard/jobs" : "/dashboard/find"} actionLabel={profile?.role === "operator" ? "View jobs" : "Book snow help"} />)}
      {groups.map(({ other, conversations, jobMap }) => {
        const hasOpenOrder = conversations.some(chat => isOpenOrder(jobMap.get(chat.jobId)));
        const unread = (items: typeof chats) =>
          items.reduce(
            (sum, chat) => sum + (chat.unreadCount?.[user?.uid || ""] || 0),
            0,
          );
        const row = (chat: (typeof chats)[number]) => {
          const job = jobMap.get(chat.jobId), count = unread([chat]), open = isOpenOrder(job);
          return (
            <Link
              key={chat.id}
              href={`/dashboard/messages/${chat.id}`}
              className={styles.conversationRow}
              data-unread={count > 0}
              data-active-job={open}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <strong>
                  {chat.legacyHistory
                    ? "Earlier shared conversation"
                    : job
                      ? `Order #${orderNumber(job)}`
                      : "Work order · details unavailable"}
                </strong>
                {open && <span className={styles.activeJobBadge}>Active visit</span>}
                {count > 0 && <span className={styles.unreadBadge}>{count} new</span>}
              </div>
              {job && !chat.legacyHistory && <p className={styles.conversationStatus}>{orderLabel(job)}{orderActionNeeded(job, user?.uid || "") ? ` · ${orderActionNeeded(job, user?.uid || "")}` : ""}</p>}
              <p className={styles.messagePreview}>
                {chat.lastMessage || "No messages yet"}
              </p>
              {dateMillis(chat.lastMessageTime) > 0 && <time className={styles.conversationTime} dateTime={new Date(dateMillis(chat.lastMessageTime)).toISOString()}>{new Date(dateMillis(chat.lastMessageTime)).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time>}
            </Link>
          );
        };
        const expanded = expandedGroups[other] ?? !!search.trim();
        const latest = [...conversations].sort((a, b) => dateMillis(b.lastMessageTime) - dateMillis(a.lastMessageTime))[0];
        const summary = <>
          <span className={styles.companyInfo}>
            <CompanyIdentity person={people[other]} name={names[other] || "Company / customer"} />
            <span className={styles.inboxPreview}>{latest.lastMessage || "Start a conversation"}</span>
            <span className={styles.companyMeta}>{hasOpenOrder ? "Active visit" : `${conversations.length} conversation${conversations.length === 1 ? "" : "s"}`}</span>
          </span>
          <span className={styles.inboxMeta}>
            {dateMillis(latest.lastMessageTime) > 0 && <time dateTime={new Date(dateMillis(latest.lastMessageTime)).toISOString()}>{new Date(dateMillis(latest.lastMessageTime)).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}</time>}
            {unread(conversations) > 0 && <span className={styles.unreadBadge}>{unread(conversations)} unread</span>}
          </span>
          <span className={styles.companyChevron} aria-hidden="true">›</span>
        </>;
        return (
          <section key={other} className={styles.companyGroup} data-active-job={hasOpenOrder}>
            {conversations.length === 1 ? <Link href={`/dashboard/messages/${conversations[0].id}`} className={styles.companySummary}>{summary}</Link> : <button type="button" className={`${styles.companySummary} w-full text-left`} aria-expanded={expanded} onClick={() => setExpandedGroups(current => ({ ...current, [other]: !expanded }))}>{summary}</button>}
            {conversations.length > 1 && expanded && <ul className={styles.companyList}>
              {conversations.map(chat => <li key={chat.id}>{row(chat)}</li>)}
            </ul>}
          </section>
        );
      })}
    </AppPage>
  );
}
