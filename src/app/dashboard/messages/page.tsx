"use client";
import styles from "./messages.module.css";
import UserAvatar from "@/components/UserAvatar";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Archive, ArchiveRestore, ChevronLeft, Lock, MessageCircle, Phone, Search, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useUserChats } from "@/hooks/useUserChats";
import { useWorkOrders } from "@/hooks/useWorkOrders";
import { useArchivedChats } from "@/hooks/useArchivedChats";
import { orderActionNeeded, dateMillis, orderLabel, orderNumber, isOpenOrder } from "@/lib/workOrders";
import { chatListTime, formatPhone, hasCompletedJobWith, telHref } from "@/lib/contacts";
import { OperatorProfile } from "@/lib/types";
import { EmptyState } from "@/components/ui/AppPrimitives";
import ConversationLoading from "@/components/ConversationLoading";

type View = "chats" | "archived" | "contacts";

function Avatar({ person, name, size }: { person?: OperatorProfile; name: string; size: number }) {
  return <UserAvatar photoURL={person?.avatar} logoURL={person?.role === "operator" ? person.logoUrl : undefined} role={person?.role} displayName={name} size={size} />;
}

export default function MessagesPage() {
  const { profile, user } = useAuth();
  const { chats, loading, error } = useUserChats(user?.uid, profile?.role);
  const { jobs, names, people, error: jobsError } = useWorkOrders();
  const { archived, setChatArchived } = useArchivedChats();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<View>("chats");
  const [archiveError, setArchiveError] = useState("");
  const uid = user?.uid || "";
  const needle = search.trim().toLowerCase();

  // One conversation per contact; its work orders live inside it.
  const allRows = useMemo(() => {
    const ordersByChat = new Map<string, typeof jobs>();
    for (const job of jobs) if (job.chatId) ordersByChat.set(job.chatId, [...(ordersByChat.get(job.chatId) || []), job]);
    return chats
      .filter((chat) => !chat.mergedInto)
      .map((chat) => {
        const other = chat.participants.find((id) => id !== uid) || "unknown";
        const orders = (ordersByChat.get(chat.id) || []).sort((a, b) => dateMillis(b.createdAt) - dateMillis(a.createdAt));
        const openOrders = orders.filter(isOpenOrder);
        const time = dateMillis(chat.lastActivityTime) || dateMillis(chat.lastMessageTime);
        return { chat, other, orders, openOrders, time };
      })
      .filter(({ other, orders, chat }) => !needle || `${names[other] || ""} ${orders.map((job) => `${orderNumber(job)} ${job.address || ""}`).join(" ")} ${chat.lastMessage || ""}`.toLowerCase().includes(needle))
      .sort((a, b) => b.time - a.time);
  }, [chats, jobs, names, needle, uid]);
  const archivedSet = useMemo(() => new Set(archived), [archived]);
  const inbox = allRows.filter((row) => !archivedSet.has(row.chat.id));
  const archivedRows = allRows.filter((row) => archivedSet.has(row.chat.id));
  const archivedUnread = archivedRows.reduce((sum, row) => sum + (row.chat.unreadCount?.[uid] || 0), 0);

  // Phone book: everyone this user has a work order with, A–Z.
  const contacts = useMemo(() => {
    const chatByPerson = new Map(chats.filter((chat) => !chat.mergedInto).map((chat) => [chat.participants.find((id) => id !== uid) || "", chat.id]));
    return Object.keys(names)
      .map((id) => {
        const completed = jobs.filter((job) => job.status === "completed" && (job.clientId === id || job.operatorId === id)).length;
        const person = people[id];
        const phone = hasCompletedJobWith(jobs, id) ? person?.phone || "" : "";
        return { id, name: names[id] || "Contact", person, completed, phone, chatId: chatByPerson.get(id) };
      })
      .filter((contact) => !needle || `${contact.name} ${contact.person?.city || ""} ${contact.phone}`.toLowerCase().includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [chats, jobs, names, needle, people, uid]);
  const contactGroups = useMemo(() => {
    const groups = new Map<string, typeof contacts>();
    for (const contact of contacts) {
      const letter = /[a-z]/i.test(contact.name[0] || "") ? contact.name[0].toUpperCase() : "#";
      groups.set(letter, [...(groups.get(letter) || []), contact]);
    }
    return [...groups];
  }, [contacts]);

  async function toggleArchive(chatId: string, archive: boolean) {
    setArchiveError("");
    try { await setChatArchived(chatId, archive); }
    catch { setArchiveError(archive ? "Could not archive that chat. Try again." : "Could not unarchive that chat. Try again."); }
  }

  if (loading) return <ConversationLoading />;
  const listRows = view === "archived" ? archivedRows : inbox;
  const isOperator = profile?.role === "operator";

  return (
    <div className={`app-page ${styles.page}`}>
      <header className={styles.top}>
        {view === "archived" ? (
          <div className={styles.titleRow}>
            <button type="button" className={styles.back} onClick={() => setView("chats")} aria-label="Back to messages"><ChevronLeft size={24} aria-hidden="true" /></button>
            <h1>Archived</h1>
          </div>
        ) : <h1>{view === "contacts" ? "Contacts" : "Messages"}</h1>}
        <div className={styles.tabs} role="tablist" aria-label="Messages sections">
          <button type="button" role="tab" aria-selected={view !== "contacts"} onClick={() => setView("chats")}><MessageCircle size={16} aria-hidden="true" />Chats</button>
          <button type="button" role="tab" aria-selected={view === "contacts"} onClick={() => setView("contacts")}><Phone size={16} aria-hidden="true" />Contacts</button>
        </div>
      </header>

      <label className={styles.search}>
        <Search size={17} aria-hidden="true" />
        <input type="search" aria-label={view === "contacts" ? "Search contacts" : "Search conversations"} placeholder={view === "contacts" ? "Search contacts" : "Search"} value={search} onChange={(e) => setSearch(e.target.value)} />
        {search && <button type="button" aria-label="Clear search" onClick={() => setSearch("")}><X size={16} /></button>}
      </label>

      {(error || jobsError) && <p role="alert" className={styles.alert}>Some conversations or order details could not load. Please reload to try again.</p>}
      {archiveError && <p role="alert" className={styles.alert}>{archiveError}</p>}

      {view !== "contacts" && (
        <div className={styles.list}>
          {view === "chats" && archivedRows.length > 0 && (
            <button type="button" className={styles.archivedRow} onClick={() => setView("archived")}>
              <span className={styles.archivedIcon}><Archive size={20} aria-hidden="true" /></span>
              <span className={styles.archivedLabel}>Archived</span>
              <span className={styles.archivedCount} data-unread={archivedUnread > 0}>{archivedUnread > 0 ? archivedUnread : archivedRows.length}</span>
            </button>
          )}
          {view === "archived" && <p className={styles.note}>Archived chats stay here when new messages arrive. Unarchive to move them back.</p>}
          {listRows.map(({ chat, other, openOrders, time }) => {
            const count = chat.unreadCount?.[uid] || 0;
            const current = openOrders[0];
            const needed = current ? orderActionNeeded(current, uid) : "";
            const name = names[other] || "Company / customer";
            const preview = chat.lastMessage || (current ? `Order #${orderNumber(current)} · ${needed || orderLabel(current)}` : "No messages yet");
            const isArchived = archivedSet.has(chat.id);
            return (
              <div key={chat.id} className={styles.rowWrap}>
                <Link href={`/dashboard/messages/${chat.id}`} className={styles.row} data-unread={count > 0} aria-label={count > 0 ? `${name}, ${count} unread` : undefined}>
                  <Avatar person={people[other]} name={name} size={52} />
                  <span className={styles.rowBody}>
                    <span className={styles.rowLine}>
                      <span className={styles.name}>{name}</span>
                      {current && <span className={styles.activeTag}><i aria-hidden="true" />Active</span>}
                      {time > 0 && <time className={styles.time} dateTime={new Date(time).toISOString()}>{chatListTime(time)}</time>}
                    </span>
                    <span className={styles.rowLine}>
                      <span className={styles.preview}>
                        {current && <span className={styles.orderTag}>#{orderNumber(current)}{openOrders.length > 1 ? ` +${openOrders.length - 1}` : ""}</span>}
                        {preview}
                      </span>
                      {count > 0 && <span className={styles.badge}>{count > 99 ? "99+" : count}</span>}
                    </span>
                  </span>
                </Link>
                <button type="button" className={styles.rowAction} onClick={() => toggleArchive(chat.id, !isArchived)} aria-label={isArchived ? `Unarchive chat with ${name}` : `Archive chat with ${name}`} title={isArchived ? "Unarchive" : "Archive"}>
                  {isArchived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
                </button>
              </div>
            );
          })}
          {!error && !listRows.length && (needle
            ? <div className={styles.empty}><h2>No matching conversations</h2><p>Try a name, address, or order number.</p><button type="button" className="btn-secondary mt-4" onClick={() => setSearch("")}>Clear search</button></div>
            : view === "archived"
              ? <div className={styles.empty}><h2>No archived chats</h2><p>Archive a chat from your list to tidy it away.</p></div>
              : !archivedRows.length && <EmptyState title="No messages yet" description="Your conversations will appear after a visit is requested." actionHref={isOperator ? "/dashboard/jobs" : "/dashboard/find"} actionLabel={isOperator ? "View jobs" : "Book snow help"} />)}
        </div>
      )}

      {view === "contacts" && (
        <div className={styles.list}>
          <p className={styles.note}><Lock size={13} aria-hidden="true" /> Phone numbers appear once {isOperator ? "you've completed a job for that client" : "that operator has completed a job for you"}.</p>
          {contactGroups.map(([letter, group]) => (
            <section key={letter} aria-label={letter}>
              <h2 className={styles.letter}>{letter}</h2>
              {group.map((contact) => {
                const tel = telHref(contact.phone);
                return (
                  <div key={contact.id} className={styles.contactRow}>
                    <Link href={contact.chatId ? `/dashboard/messages/${contact.chatId}` : `/dashboard/u/${contact.id}?returnTo=${encodeURIComponent("/dashboard/messages")}`} className={styles.contactMain}>
                      <Avatar person={contact.person} name={contact.name} size={44} />
                      <span className={styles.rowBody}>
                        <span className={styles.name}>{contact.name}</span>
                        <span className={styles.preview}>
                          {tel ? formatPhone(contact.phone) : [contact.person?.role === "operator" ? "Operator" : "Client", contact.person?.city].filter(Boolean).join(" · ")}
                          {contact.completed > 0 && ` · ${contact.completed} job${contact.completed === 1 ? "" : "s"} done`}
                        </span>
                      </span>
                    </Link>
                    {contact.chatId && <Link href={`/dashboard/messages/${contact.chatId}`} className={styles.iconButton} aria-label={`Message ${contact.name}`}><MessageCircle size={19} /></Link>}
                    {tel
                      ? <a href={tel} className={styles.iconButton} data-call aria-label={`Call ${contact.name}`}><Phone size={19} /></a>
                      : <span className={styles.iconButton} data-locked title="Number shared after a completed job" aria-label="Phone number not shared yet" role="img"><Phone size={19} /></span>}
                  </div>
                );
              })}
            </section>
          ))}
          {!contacts.length && <div className={styles.empty}><h2>{needle ? "No matching contacts" : "No contacts yet"}</h2><p>{needle ? "Try another name." : "People you book or work with show up here."}</p></div>}
        </div>
      )}
    </div>
  );
}
