"use client";
import Link from 'next/link';
import { useState } from 'react';
import { useAdminData } from '@/components/admin/AdminProvider';
import { AdminCard, EmptyState } from '@/components/admin/AdminUI';
import { relativeTime } from '@/lib/admin/utils';
export default function NotificationsPage() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useAdminData();
  const [filter, setFilter] = useState('Unread');
  const [error, setError] = useState('');
  const rows = notifications.filter(n => filter === 'All' || (filter === 'Unread' ? !n.read : n.actionRequired && !n.read));
  async function mark(id?: string) { try { if (id) await markNotificationRead(id); else await markAllNotificationsRead(); } catch { setError('Could not save read status. Please retry.'); } }
  return <div className="space-y-4"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-2xl">Notifications</h2><p className="text-sm text-[var(--text-muted)]">Open a record to review it. Marking a notification read does not resolve the work.</p></div><button className="admin-secondary" onClick={() => void mark()}>Mark all read</button></div><div className="flex gap-2">{['Unread', 'Action needed', 'All'].map(f => <button key={f} aria-pressed={f === filter} className={f === filter ? 'admin-primary' : 'admin-secondary'} onClick={() => setFilter(f)}>{f}</button>)}</div>{error && <p role="alert">{error}</p>}<AdminCard className="divide-y">{rows.map(n => <article key={n.id} className="p-4 flex flex-wrap items-start gap-3"><div className="flex-1 min-w-0"><p className="font-semibold">{n.title || n.message}</p>{n.preview && <p className="text-sm mt-1">{n.preview}</p>}<p className="text-xs text-[var(--text-muted)] mt-2">{n.actionRequired ? 'Action needed · ' : ''}{relativeTime(n.createdAt)}</p></div><Link href={n.href} onClick={() => void mark(n.id)} className="admin-primary">Open record →</Link>{!n.read && <button className="admin-secondary" onClick={() => void mark(n.id)}>Mark read</button>}</article>)}{!rows.length && <EmptyState title="You’re all caught up" subtitle="Matching notifications will appear here automatically." />}</AdminCard></div>;
}
