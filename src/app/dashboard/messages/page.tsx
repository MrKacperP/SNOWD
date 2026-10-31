"use client";
import styles from "@/components/work-orders/work-orders.module.css";
import theme from "./messages.module.css";
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
import ConversationLoading from "@/components/ConversationLoading";
export default function MessagesPage() {
  const { profile, user } = useAuth();
  const { chats, loading, error } = useUserChats(user?.uid, profile?.role);
  const { jobs, names, people, error: jobsError } = useWorkOrders();
  const [search, setSearch] = useState("");
  // One conversation per contact; its work orders live inside it.
  const rows = useMemo(() => {
    const ordersByChat = new Map<string, typeof jobs>();
    for (const job of jobs) if (job.chatId) ordersByChat.set(job.chatId, [...(ordersByChat.get(job.chatId) || []), job]);
    return chats
      .filter((chat) => !chat.mergedInto)
      .map((chat) => {
        const other = chat.participants.find((id) => id !== user?.uid) || "unknown";
        const orders = (ordersByChat.get(chat.id) || []).sort((a, b) => dateMillis(b.createdAt) - dateMillis(a.createdAt));
        const openOrders = orders.filter(isOpenOrder);
        const time = dateMillis(chat.lastActivityTime) || dateMillis(chat.lastMessageTime);
        return { chat, other, orders, openOrders, time };
      })
      .filter(({ other, orders, chat }) => {
        const needle = search.trim().toLowerCase();
        if (!needle) return true;
        return `${names[other] || ""} ${orders.map((job) => `${orderNumber(job)} ${job.address || ""}`).join(" ")} ${chat.lastMessage || ""}`.toLowerCase().includes(needle);
      })
      .sort((a, b) => Number(b.openOrders.length > 0) - Number(a.openOrders.length > 0) || b.time - a.time);
  }, [chats, jobs, names, search, user?.uid]);
  if (loading) return <ConversationLoading />;
  return (
    <AppPage className={theme.page} title="Messages">
      <div className="app-search"><Search size={19} aria-hidden="true" /><input
        type="search"
        aria-label="Search conversations"
        placeholder="Search conversation"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />{search && <button type="button" aria-label="Clear search" onClick={() => setSearch("")}><X size={18} /></button>}</div>
      {(error || jobsError) && (
        <p role="alert">
          Some conversations or order details could not load. Please reload to
          try again.
        </p>
      )}
      {!loading && !error && !rows.length && (search.trim() ? <div className="empty-state"><h2>No matching conversations</h2><p>Try a name, address, or order number.</p><button className="btn-secondary mt-5" onClick={() => setSearch("")}>Clear search</button></div> : <EmptyState title="No messages yet" description="Your conversations will appear after a visit is requested." actionHref={profile?.role === "operator" ? "/dashboard/jobs" : "/dashboard/find"} actionLabel={profile?.role === "operator" ? "View jobs" : "Book snow help"} />)}
      {rows.map(({ chat, other, openOrders, time }) => {
        const count = chat.unreadCount?.[user?.uid || ""] || 0;
        const current = openOrders[0];
        const needed = current ? orderActionNeeded(current, user?.uid || "") : "";
        return (
          <section key={chat.id} className={`${styles.companyGroup} ${theme.group}`} data-active-job={!!current}>
            <Link href={`/dashboard/messages/${chat.id}`} className={`${styles.companySummary} ${theme.summary}`} data-unread={count > 0}>
              <span className={styles.companyInfo}>
                <CompanyIdentity person={people[other]} name={names[other] || "Company / customer"} />
                <span className={styles.companyMeta}>
                  {current
                    ? `Order #${orderNumber(current)} · ${needed || orderLabel(current)}${openOrders.length > 1 ? ` · +${openOrders.length - 1} more open` : ""}`
                    : chat.lastMessage || "No messages yet"}
                </span>
                {current && chat.lastMessage && <span className={styles.messagePreview}>{chat.lastMessage}</span>}
              </span>
              <span className={styles.inboxMeta}>
                {current && <span className={theme.activeBadge}>Active order</span>}
                {count > 0 && <span className={theme.unreadBadge}>{count}</span>}
                {time > 0 && <time className={styles.conversationTime} dateTime={new Date(time).toISOString()}>{new Date(time).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time>}
              </span>
              <span className={styles.companyChevron} aria-hidden="true">›</span>
            </Link>
          </section>
        );
      })}
    </AppPage>
  );
}
