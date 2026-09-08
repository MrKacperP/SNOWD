"use client";
import Link from 'next/link';
import { useAdminData } from '@/components/admin/AdminProvider';
import { AdminCard, StatusTag } from '@/components/admin/AdminUI';
export default function EmployeesPage() {
  const { users } = useAdminData();
  return <div className="space-y-4"><div><h2 className="text-2xl">Team access</h2><p className="text-sm text-[var(--text-muted)] mt-2">Administrators manage account roles and sign-in access. To add staff, open their existing account and change its role.</p><Link href="/admin/users" className="admin-primary mt-3">Find an account</Link></div><AdminCard className="divide-y">{users.filter(u => ['Admin', 'Employee'].includes(u.role)).map(u => <Link key={u.id} href={`/admin/users/${u.id}`} className="p-5 flex flex-wrap gap-3 items-center"><div className="flex-1"><h3>{u.name}</h3><p className="text-sm text-[var(--text-muted)]">{u.email} · {u.role}</p></div><StatusTag label={u.status} /><span className="admin-secondary">Manage access →</span></Link>)}</AdminCard></div>;
}
