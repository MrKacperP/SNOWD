"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AdminCard, ConfirmModal, StatusTag } from '@/components/admin/AdminUI';
import { useAdminData } from '@/components/admin/AdminProvider';
import { adminAccountRequest } from '@/lib/admin/client';
import { AdminUser } from '@/lib/admin/types';
import { useAuth } from '@/context/AuthContext';

function AccountEditor({ account }: { account: AdminUser }) {
  const { profile, user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ displayName: account.name, email: account.email, phone: account.phone || '', bio: account.bio || '', role: account.role.toLowerCase() });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [confirm, setConfirm] = useState<'delete' | 'status' | null>(null);
  const canEdit = profile?.role === 'admin' && user?.uid !== account.id;
  async function act(action: 'save' | 'delete' | 'status') {
    setBusy(true); setNotice('');
    try {
      await adminAccountRequest(account.id, action === 'delete' ? 'DELETE' : 'PATCH', action === 'save' ? form : action === 'status' ? { disabled: account.status !== 'Suspended' } : undefined);
      setConfirm(null);
      if (action === 'delete') router.push('/admin/users');
      else setNotice('Account saved.');
    } catch (error) { setNotice((error as Error).message); }
    finally { setBusy(false); }
  }
  return <AdminCard className="p-5 space-y-4">
    <div className="flex justify-between gap-3"><h2 className="text-xl">Account details</h2><StatusTag label={account.status} /></div>
    <p className="text-sm text-[var(--text-muted)] break-all">Account ID: {account.id} · Joined {account.joinDate || 'Unknown'}</p>
    <form onSubmit={e => { e.preventDefault(); void act('save'); }} className="space-y-4">
      <fieldset disabled={!canEdit || busy} className="grid sm:grid-cols-2 gap-4">
        {(['displayName', 'email', 'phone'] as const).map(key => <label key={key} className="text-sm">{key === 'displayName' ? 'Full name' : key === 'email' ? 'Email' : 'Phone'}<input required={key !== 'phone'} type={key === 'email' ? 'email' : 'text'} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} className="mt-1 w-full border rounded-xl p-3" /></label>)}
        <label className="text-sm">Role<select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="mt-1 w-full border rounded-xl p-3">{['client', 'operator', 'employee', 'admin'].map(role => <option key={role}>{role}</option>)}</select></label>
        <label className="sm:col-span-2 text-sm">Profile bio<textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} className="mt-1 w-full border rounded-xl p-3" /></label>
      </fieldset>
      {canEdit && <div className="flex flex-wrap gap-2"><button disabled={busy} className="admin-primary">{busy ? 'Saving…' : 'Save account'}</button><button type="button" disabled={busy} onClick={() => setConfirm('status')} className="admin-secondary">{account.status === 'Suspended' ? 'Restore access' : 'Suspend access'}</button><button type="button" disabled={busy} onClick={() => setConfirm('delete')} className="admin-secondary text-red-700">Delete account</button></div>}
      {!canEdit && <p className="text-sm text-[var(--text-muted)]">Account changes require another administrator. Your own profile is available in settings.</p>}
    </form>
    {notice && <p role="status">{notice}</p>}
    <ConfirmModal open={!!confirm} title={confirm === 'delete' ? 'Delete account and sign-in access?' : 'Change account access?'} description={confirm === 'delete' ? 'This removes the login and profile. Job, payment, and audit history are retained for accurate records. This cannot be undone.' : 'Suspension disables sign-in and revokes existing sessions. Restoring access enables sign-in again.'} confirmLabel={busy ? 'Working…' : 'Confirm'} confirmTone="danger" onConfirm={() => { if (!busy && confirm) void act(confirm); }} onClose={() => { if (!busy) setConfirm(null); }} />
  </AdminCard>;
}
export default function AdminUserDetailPage() {
  const { uid } = useParams<{ uid: string }>();
  const { users, jobs, transactions, supportTickets, chats } = useAdminData();
  const account = users.find(u => u.id === uid);
  if (!account) return <AdminCard className="p-6">Account not available. <Link href="/admin/users">Back to accounts</Link></AdminCard>;
  const relatedJobs = jobs.filter(j => j.clientId === uid || j.assignedUsers.includes(uid));
  const relatedPayments = transactions.filter(t => t.clientId === uid || t.operatorId === uid);
  return <div className="space-y-4">
    <Link href="/admin/users" className="admin-secondary inline-flex">← All accounts</Link>
    <AccountEditor key={uid} account={account} />
    <AdminCard className="p-5 space-y-3"><h2 className="text-lg">Uploads & profile</h2><Link className="admin-secondary inline-flex" href={`/dashboard/u/${uid}`}>Open public profile</Link><div className="flex flex-wrap gap-3">{[account.idPhotoUrl, ...(account.portfolioPhotos || [])].filter(Boolean).map((url, i) => <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="admin-secondary">{i === 0 && account.idPhotoUrl ? 'Reopen ID upload' : `Open portfolio upload ${i + 1}`}</a>)}</div><Link href="/admin/verifications">Review verification →</Link></AdminCard>
    <div className="grid md:grid-cols-2 gap-4"><AdminCard className="p-5 space-y-3"><h2 className="text-lg">Jobs & service reports ({relatedJobs.length})</h2>{relatedJobs.map(j => <Link className="block border-b py-2" key={j.id} href={`/admin/jobs?id=${j.id}`}>{j.title} · {j.status}<span className="block text-sm text-[var(--text-muted)]">{j.address}</span></Link>)}{!relatedJobs.length && <p>No linked jobs.</p>}</AdminCard>
    <AdminCard className="p-5 space-y-3"><h2 className="text-lg">Payments ({relatedPayments.length})</h2>{relatedPayments.map(t => <Link className="block border-b py-2" key={t.id} href={`/admin/transactions?id=${t.id}`}>${t.amount.toFixed(2)} CAD · {t.type} · {t.status}</Link>)}{!relatedPayments.length && <p>No linked payments.</p>}</AdminCard></div>
    <AdminCard className="p-5 space-y-3"><h2 className="text-lg">Conversations & support</h2>{chats.filter(c => c.participantA === uid || c.participantB === uid).map(c => <Link className="block" key={c.id} href={`/admin/chats?id=${c.id}`}>{c.lastMessage || 'Open conversation'} →</Link>)}{supportTickets.filter(t => t.userId === uid).map(t => <Link className="block" key={t.id} href={`/admin/support-chats?id=${t.id}`}>{t.subject} · {t.status} →</Link>)}</AdminCard>
  </div>;
}
