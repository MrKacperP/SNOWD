"use client";
import { useState } from 'react';
import Link from 'next/link';
import { adminJobRequest } from '@/lib/admin/client';
import { JobItem } from '@/lib/admin/types';
import { useAdminData } from './AdminProvider';
export function ServiceReport({ job }: { job: JobItem }) {
  const { users, transactions } = useAdminData();
  const [notes, setNotes] = useState(job.operatorNotes || '');
  const [instructions, setInstructions] = useState(job.description);
  const [status, setStatus] = useState(job.rawStatus || 'pending');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  async function save() {
    if (busy || !reason.trim()) return;
    setBusy(true); setNotice('');
    try {
      await adminJobRequest(job.id, 'PATCH', { operatorNotes: notes, specialInstructions: instructions, reason: reason.trim(), ...(status !== job.rawStatus ? { status } : {}) }); setReason(''); setNotice('Service report saved.');
    } catch { setNotice('Could not save this report. Your changes have been kept; please retry.'); }
    finally { setBusy(false); }
  }
  return <div className="space-y-4">
    <div className="rounded-xl bg-[var(--ice)] p-4 space-y-2 text-sm"><p className="break-all">Job ID: {job.id}</p><p>{job.address || 'Address unavailable'}</p><p>Scheduled: {job.scheduledDate || 'Not recorded'}</p><p>Service: {job.status} · Payment: {job.paymentStatus}</p><p>Job value: ${(job.price || 0).toFixed(2)} CAD</p><p>Completed: {job.completionTime ? new Date(job.completionTime).toLocaleString() : 'Not recorded'}</p></div>
    <div className="flex flex-wrap gap-2">{[job.clientId, ...job.assignedUsers].filter(Boolean).map(uid => <Link key={uid} className="admin-secondary" href={`/admin/users/${uid}`}>{users.find(u => u.id === uid)?.name || uid} ↗</Link>)}{job.chatId && <Link className="admin-secondary" href={`/admin/chats?id=${job.chatId}`}>Open job chat</Link>}</div>
    <div className="space-y-2"><h3>Evidence & payments</h3>{job.completionPhotoUrl ? <a className="admin-secondary inline-flex" href={job.completionPhotoUrl} target="_blank" rel="noopener noreferrer">Reopen completion upload ↗</a> : <p className="text-sm text-[var(--text-muted)]">No completion photo recorded.</p>}{transactions.filter(t => t.linkedJobId === job.id).map(t => <Link key={t.id} href={`/admin/transactions?id=${t.id}`} className="block text-sm underline">${t.amount.toFixed(2)} CAD · {t.status} · {t.type}</Link>)}</div>
    <form className="space-y-3" onSubmit={e => { e.preventDefault(); void save(); }}><label className="block text-sm">Service status<select className="w-full border rounded-xl p-3 mt-1" value={status} onChange={e => setStatus(e.target.value)}>{["pending", "accepted", "en-route", "in-progress", "completed", "cancelled"].map(value => <option key={value} value={value}>{value.replaceAll("-", " ")}</option>)}</select></label><label className="block text-sm">Service instructions<textarea className="w-full border rounded-xl p-3 mt-1 min-h-24" value={instructions} onChange={e => setInstructions(e.target.value)} /></label><label className="block text-sm">Service report / operator notes<textarea className="w-full border rounded-xl p-3 mt-1 min-h-32" value={notes} onChange={e => setNotes(e.target.value)} /></label><label className="block text-sm">Reason for correction<input required className="w-full border rounded-xl p-3 mt-1" value={reason} onChange={e => setReason(e.target.value)} /></label><button disabled={busy || !reason.trim()} className="admin-primary">{busy ? 'Saving…' : 'Save service report'}</button></form>
    {notice && <p role="status">{notice}</p>}
  </div>;
}
