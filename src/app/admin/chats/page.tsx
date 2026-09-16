"use client";

import { Conversation } from "@/components/admin/Conversation";
import { useAdminSelection } from "@/hooks/useAdminSelection";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, MapPin, Pencil, Search, Users } from "lucide-react";
import { AdminCard, EmptyState, StatusTag } from "@/components/admin/AdminUI";
import { useAdminData } from "@/components/admin/AdminProvider";

export default function AdminChatsPage() {
  const { chats, jobs, transactions, users } = useAdminData();
  const [orderQuery, setOrderQuery] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [personA, setPersonA] = useState("");
  const [personB, setPersonB] = useState("");
  const [selectedId, setSelectedId] = useAdminSelection();

  const nameFor = (id: string) => users.find((user) => user.id === id)?.name || id;
  const jobFor = (chatId: string) => jobs.find((job) => job.chatId === chatId);
  const chatUsers = useMemo(() => {
    const ids = new Set(chats.flatMap((chat) => [chat.participantA, chat.participantB]));
    return users.filter((user) => ids.has(user.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [chats, users]);

  const filtered = useMemo(() => {
    const order = orderQuery.trim().toLowerCase().replace(/^work\s*order\s*#?\s*/i, "").replace(/^order\s*#?\s*/i, "").replace(/^#/, "");
    const name = nameQuery.trim().toLowerCase();
    return [...chats]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .filter((chat) => {
        const job = jobs.find((item) => item.chatId === chat.id);
        const number = (job?.orderNumber || (job ? `L-${job.id}` : "")).toLowerCase();
        const participantAName = users.find((user) => user.id === chat.participantA)?.name || chat.participantA;
        const participantBName = users.find((user) => user.id === chat.participantB)?.name || chat.participantB;
        const names = `${participantAName} ${participantBName}`.toLowerCase();
        const participants = [chat.participantA, chat.participantB];
        return (!order || number.includes(order)) && (!name || names.includes(name))
          && (!personA || participants.includes(personA)) && (!personB || participants.includes(personB));
      });
  }, [chats, jobs, nameQuery, orderQuery, personA, personB, users]);

  useEffect(() => {
    if (selectedId && filtered.some((chat) => chat.id === selectedId)) return;
    setSelectedId(filtered[0]?.id || null);
  }, [filtered, selectedId, setSelectedId]);

  const selected = selectedId ? chats.find((chat) => chat.id === selectedId) || null : null;
  const selectedJob = selected ? jobFor(selected.id) : undefined;
  const selectedTransaction = selectedJob ? transactions.find((transaction) => transaction.linkedJobId === selectedJob.id) : undefined;
  const orderNumber = selectedJob ? selectedJob.orderNumber || `L-${selectedJob.id}` : "";
  const isCancelled = selectedJob?.status === "Cancelled";
  const isPaymentPending = selectedJob?.paymentStatus === "pending" || selectedTransaction?.status === "Pending";

  return (
    <div className="grid grid-cols-1 gap-4 xl:h-[calc(100dvh-128px)] xl:min-h-[620px] xl:grid-cols-[minmax(320px,36%)_minmax(0,1fr)]">
      <AdminCard className="flex max-h-[480px] min-h-0 flex-col p-3 xl:max-h-none">
        <div className="space-y-2 border-b border-[var(--border)] pb-3">
          <label className="block text-xs font-semibold text-[var(--text-muted)]" htmlFor="work-order-search">Work order number</label>
          <div className="relative"><Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" /><input id="work-order-search" value={orderQuery} onChange={(event) => setOrderQuery(event.target.value)} placeholder="Search work order #" className="h-10 w-full pl-9 pr-3 text-sm" /></div>
          <label className="block text-xs font-semibold text-[var(--text-muted)]" htmlFor="chat-name-search">Participant name</label>
          <input id="chat-name-search" value={nameQuery} onChange={(event) => setNameQuery(event.target.value)} placeholder="Search client or operator name" className="h-10 w-full px-3 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-semibold text-[var(--text-muted)]">First person<select aria-label="Filter by first participant" value={personA} onChange={(event) => setPersonA(event.target.value)} className="mt-1 w-full px-2 text-sm"><option value="">Anyone</option>{chatUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
            <label className="text-xs font-semibold text-[var(--text-muted)]">Second person<select aria-label="Filter by second participant" value={personB} onChange={(event) => setPersonB(event.target.value)} className="mt-1 w-full px-2 text-sm"><option value="">Anyone</option>{chatUsers.filter((user) => user.id !== personA).map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
          </div>
          {(orderQuery || nameQuery || personA || personB) && <button onClick={() => { setOrderQuery(""); setNameQuery(""); setPersonA(""); setPersonB(""); }} className="text-xs font-semibold text-[var(--accent)]">Clear filters</button>}
        </div>
        <p className="px-1 pt-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{filtered.length} conversation{filtered.length === 1 ? "" : "s"}</p>
        <div className="mt-2 min-h-0 space-y-2 overflow-y-auto">
          {filtered.map((chat) => {
            const job = jobFor(chat.id);
            const number = job?.orderNumber || (job ? `L-${job.id}` : "No linked order");
            return <button key={chat.id} onClick={() => setSelectedId(chat.id)} className={`w-full rounded-xl border p-3 text-left ${selectedId === chat.id ? "border-[var(--accent)] bg-[var(--bg-secondary)]" : "border-[var(--border)] hover:bg-[var(--bg-primary)]"}`}>
              <div className="flex items-center justify-between gap-2"><p className="font-semibold text-[var(--ink)]">{job ? `Work order #${number}` : number}</p>{job && <StatusTag label={job.status} tone={job.status === "Cancelled" ? "red" : job.status === "Completed" ? "green" : job.status === "Open" ? "blue" : "yellow"} />}</div>
              <p className="mt-1 truncate text-sm">{nameFor(chat.participantA)} ↔ {nameFor(chat.participantB)}</p>
              <p className="mt-1 truncate text-xs text-[var(--text-muted)]">{chat.lastMessage || "No messages yet"}</p>
            </button>;
          })}
          {!filtered.length && <EmptyState title="No chats found" subtitle="Try another work order, name, or participant combination." />}
        </div>
      </AdminCard>

      <AdminCard className="flex min-h-[480px] flex-col overflow-hidden p-4 xl:min-h-0">
        {selected ? <>
          <div className="border-b border-[var(--border)] pb-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-lg font-semibold text-[var(--ink)]">{selectedJob ? `Work order #${orderNumber}` : "Unlinked conversation"}</p><p className="text-sm text-[var(--text-muted)]">{nameFor(selected.participantA)} and {nameFor(selected.participantB)}</p></div>{selectedJob && <Link href={`/admin/jobs?id=${encodeURIComponent(selectedJob.id)}`} className="admin-primary"><Pencil className="h-4 w-4" /> Edit work order</Link>}</div>
            {selectedJob && <div className="mt-4 grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-3 sm:grid-cols-2 lg:grid-cols-3">
              <div><p className="text-xs font-semibold uppercase text-[var(--text-muted)]">Service</p><p className="mt-1 text-sm font-medium">{selectedJob.title}</p></div>
              <div><p className="text-xs font-semibold uppercase text-[var(--text-muted)]">Status</p><div className="mt-1"><StatusTag label={selectedJob.status} tone={isCancelled ? "red" : selectedJob.status === "Completed" ? "green" : selectedJob.status === "Open" ? "blue" : "yellow"} /></div></div>
              <div><p className="text-xs font-semibold uppercase text-[var(--text-muted)]">Amount</p><p className="mt-1 text-sm font-semibold">${Number(selectedJob.price || 0).toFixed(2)} CAD</p></div>
              <div><p className="text-xs font-semibold uppercase text-[var(--text-muted)]">Payment</p><p className={`mt-1 text-sm font-semibold ${isPaymentPending ? "text-amber-700" : "text-[var(--ink)]"}`}>{isPaymentPending ? "Pending" : selectedTransaction?.status || selectedJob.paymentStatus || "Not recorded"}</p></div>
              <div><p className="flex items-center gap-1 text-xs font-semibold uppercase text-[var(--text-muted)]"><CalendarDays className="h-3.5 w-3.5" /> Schedule</p><p className="mt-1 text-sm">{selectedJob.scheduledDate || "Not scheduled"}</p></div>
              <div><p className="flex items-center gap-1 text-xs font-semibold uppercase text-[var(--text-muted)]"><MapPin className="h-3.5 w-3.5" /> Address</p><p className="mt-1 text-sm">{selectedJob.address || "Not provided"}</p></div>
              <div className="sm:col-span-2 lg:col-span-3"><p className="flex items-center gap-1 text-xs font-semibold uppercase text-[var(--text-muted)]"><Users className="h-3.5 w-3.5" /> Participants</p><p className="mt-1 text-sm">Client: {nameFor(selectedJob.clientId || selected.participantA)} · Operator: {nameFor(selectedJob.assignedUsers[0] || selected.participantB)}</p></div>
            </div>}
            {(isCancelled || isPaymentPending) && <div className={`mt-3 flex gap-2 rounded-xl border p-3 text-sm ${isCancelled ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><p>{isCancelled ? `This work order was cancelled. The recorded amount is $${Number(selectedJob?.price || 0).toFixed(2)} CAD; review payment activity before taking further action.` : `Payment of $${Number(selectedJob?.price || 0).toFixed(2)} CAD is still pending for this work order.`}</p></div>}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1"><Conversation key={selected.id} id={selected.id} /></div>
          <div className="border-t border-[var(--border)] pt-3"><p className="text-sm text-[var(--text-muted)]">Read-only: admins can review this conversation and edit the linked work order.</p></div>
        </> : <EmptyState title="No conversation selected" subtitle="Choose a work order conversation from the list." />}
      </AdminCard>
    </div>
  );
}
