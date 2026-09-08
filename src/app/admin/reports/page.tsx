"use client";
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AdminCard, EmptyState } from '@/components/admin/AdminUI';
import { useAdminData } from '@/components/admin/AdminProvider';
import { csvFromRows, downloadCsv } from '@/lib/admin/utils';
export default function ReportsPage() {
  const { jobs, users } = useAdminData();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const rows = useMemo(() => jobs.filter(j => (status === 'All' || j.status === status) && [j.id, j.title, j.address, j.operatorNotes].join(' ').toLowerCase().includes(search.toLowerCase())), [jobs, search, status]);
  return <div className="space-y-4"><div><h2 className="text-2xl">Service reports</h2><p className="text-[var(--text-muted)] mt-1">Review the job record, reopen evidence, and save corrections with an audit trail.</p></div><AdminCard className="p-4 flex flex-wrap gap-3"><input aria-label="Search reports" placeholder="Search address, job, or notes" value={search} onChange={e => setSearch(e.target.value)} className="border rounded-xl p-3 flex-1" /><select aria-label="Filter report status" value={status} onChange={e => setStatus(e.target.value)} className="border rounded-xl p-3">{['All', 'Open', 'In Progress', 'Completed', 'Cancelled', 'Flagged'].map(s => <option key={s}>{s}</option>)}</select><button className="admin-primary" onClick={() => downloadCsv('snowd-service-reports.csv', csvFromRows(rows.map(j => ({ JobID: j.id, Service: j.title, Address: j.address, Status: j.status, Scheduled: j.scheduledDate, Completed: j.completionTime, AmountCAD: j.price, Payment: j.paymentStatus, Notes: j.operatorNotes, Evidence: j.completionPhotoUrl }))))}>Export reports</button></AdminCard><AdminCard className="divide-y">{rows.map(job => <Link key={job.id} href={`/admin/jobs?id=${job.id}`} className="p-5 flex flex-wrap items-center justify-between gap-3 hover:bg-[var(--ice)]"><div><h3>{job.title}</h3><p className="text-sm text-[var(--text-muted)]">{job.address} · {users.find(u => u.id === job.clientId)?.name || 'Client unavailable'}</p><p className="text-sm">{job.status} · {job.scheduledDate || 'Date unavailable'}</p></div><span className="admin-secondary">Review & edit →</span></Link>)}{!rows.length && <EmptyState title="No matching reports" subtitle="Reports use the actual service and payment records from each job." />}</AdminCard></div>;
}
