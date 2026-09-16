"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, MessageSquare, Save } from "lucide-react";
import { adminJobRequest } from "@/lib/admin/client";
import { JobItem } from "@/lib/admin/types";
import { ConfirmModal, StatusTag } from "./AdminUI";
import { useAdminData } from "./AdminProvider";

const statuses = ["pending", "accepted", "en-route", "in-progress", "completed", "cancelled"] as const;
const statusLabels: Record<string, string> = {
  pending: "Open",
  accepted: "Scheduled",
  "en-route": "On the way",
  "in-progress": "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};
const progressStatus: Record<string, string> = {
  pending: "accepted",
  accepted: "en-route",
  "en-route": "in-progress",
  "in-progress": "completed",
};

export function ServiceReport({ job }: { job: JobItem }) {
  const { users, transactions } = useAdminData();
  const [notes, setNotes] = useState(job.operatorNotes || "");
  const [instructions, setInstructions] = useState(job.description);
  const [status, setStatus] = useState(job.rawStatus || "pending");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const finalized = status === "completed" || status === "cancelled";
  const nextStatus = progressStatus[status];
  const orderNumber = job.orderNumber || `L-${job.id}`;
  const clientName = users.find((user) => user.id === job.clientId)?.name || job.postedBy || "Client unavailable";
  const operatorName = users.find((user) => user.id === job.assignedUsers[0])?.name || "Operator unassigned";

  async function save(targetStatus = status) {
    if (busy || !reason.trim()) return;
    setBusy(true);
    setNotice("");
    try {
      await adminJobRequest(job.id, "PATCH", {
        operatorNotes: notes,
        specialInstructions: instructions,
        reason: reason.trim(),
        ...(targetStatus !== job.rawStatus ? { status: targetStatus } : {}),
      });
      setStatus(targetStatus);
      setReason("");
      setNotice(targetStatus === "cancelled" ? "Work order cancelled." : "Work order updated successfully.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update this work order. Your changes have been kept; please retry.");
      throw error;
    } finally {
      setBusy(false);
    }
  }

  return <div className="space-y-5">
    <section className="rounded-xl border border-[var(--border)] bg-[var(--ice)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Work order</p><p className="mt-1 text-xl font-semibold text-[var(--ink)]">#{orderNumber}</p></div><StatusTag label={statusLabels[status] || job.status} tone={status === "cancelled" ? "red" : status === "completed" ? "green" : status === "pending" ? "blue" : "yellow"} /></div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-xs font-semibold text-[var(--text-muted)]">Client</dt><dd>{clientName}</dd></div>
        <div><dt className="text-xs font-semibold text-[var(--text-muted)]">Operator</dt><dd>{operatorName}</dd></div>
        <div><dt className="text-xs font-semibold text-[var(--text-muted)]">Service</dt><dd>{job.title}</dd></div>
        <div><dt className="text-xs font-semibold text-[var(--text-muted)]">Price</dt><dd className="font-semibold">${Number(job.price || 0).toFixed(2)} CAD</dd></div>
        <div><dt className="text-xs font-semibold text-[var(--text-muted)]">Scheduled</dt><dd>{job.scheduledDate || "Not scheduled"}</dd></div>
        <div><dt className="text-xs font-semibold text-[var(--text-muted)]">Payment</dt><dd>{job.paymentStatus || "Not recorded"}</dd></div>
        <div className="sm:col-span-2"><dt className="text-xs font-semibold text-[var(--text-muted)]">Address</dt><dd>{job.address || "Address unavailable"}</dd></div>
      </dl>
    </section>

    <div className="flex flex-wrap gap-2">
      {[job.clientId, ...job.assignedUsers].filter(Boolean).map((uid) => <Link key={uid} className="admin-secondary" href={`/admin/users/${uid}`}>{users.find((user) => user.id === uid)?.name || uid} ↗</Link>)}
      {job.chatId && <Link className="admin-secondary" href={`/admin/chats?id=${job.chatId}`}><MessageSquare className="h-4 w-4" /> Open conversation</Link>}
    </div>

    {!finalized && <section className="rounded-xl border border-[var(--border)] p-4">
      <h3>Progress controls</h3>
      <p className="mt-1 text-sm text-[var(--text-muted)]">Move this work order to its next stage or select a specific status below.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {nextStatus && <button type="button" disabled={busy || !reason.trim()} onClick={() => void save(nextStatus).catch(() => undefined)} className="admin-primary">Progress to {statusLabels[nextStatus]} <ArrowRight className="h-4 w-4" /></button>}
        <button type="button" disabled={busy || !reason.trim()} onClick={() => setConfirmCancel(true)} className="admin-secondary border-red-200 text-red-700"><AlertTriangle className="h-4 w-4" /> Cancel work order</button>
      </div>
      {!reason.trim() && <p className="mt-2 text-xs text-amber-700">Enter an admin reason below before progressing or cancelling.</p>}
    </section>}

    <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void save().catch(() => undefined); }}>
      <label className="block text-sm font-semibold">Work order status<select className="mt-1 w-full p-3 font-normal" value={status} disabled={finalized} onChange={(event) => setStatus(event.target.value)}>{statuses.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}</select></label>
      <label className="block text-sm font-semibold">Service instructions<textarea className="mt-1 min-h-28 w-full p-3 font-normal" value={instructions} onChange={(event) => setInstructions(event.target.value)} /></label>
      <label className="block text-sm font-semibold">Service report / operator notes<textarea className="mt-1 min-h-32 w-full p-3 font-normal" value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      <label className="block text-sm font-semibold">Admin reason for this update<input required className="mt-1 w-full p-3 font-normal" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain the correction or status change" /></label>
      <button disabled={busy || !reason.trim()} className="admin-primary"><Save className="h-4 w-4" />{busy ? "Saving…" : "Save all updates"}</button>
    </form>

    <section className="space-y-2"><h3>Evidence & payments</h3>{job.completionPhotoUrl ? <a className="admin-secondary inline-flex" href={job.completionPhotoUrl} target="_blank" rel="noopener noreferrer">Reopen completion upload ↗</a> : <p className="text-sm text-[var(--text-muted)]">No completion photo recorded.</p>}{transactions.filter((transaction) => transaction.linkedJobId === job.id).map((transaction) => <Link key={transaction.id} href={`/admin/transactions?id=${transaction.id}`} className="block text-sm underline">${transaction.amount.toFixed(2)} CAD · {transaction.status} · {transaction.type}</Link>)}</section>
    {notice && <p role="status" className={`rounded-xl border p-3 text-sm ${/could not|requires|resolve/i.test(notice) ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-800"}`}>{notice}</p>}

    <ConfirmModal open={confirmCancel} title={`Cancel work order #${orderNumber}?`} description="This changes the work order to Cancelled. If money is held or paid, resolve that payment first." confirmLabel="Cancel work order" confirmTone="danger" onClose={() => setConfirmCancel(false)} onConfirm={async () => { await save("cancelled"); setConfirmCancel(false); }} />
  </div>;
}
