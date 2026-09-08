"use client";

import Link from "next/link";
import { adminAccountRequest } from "@/lib/admin/client";
import React, { useMemo, useState } from "react";
import { Download, Eye, Pencil, ShieldAlert, ShieldCheck } from "lucide-react";
import { AdminCard, ConfirmModal, EmptyState, SideDrawer, SortHeader, StatusTag, tableCell, tableHead } from "@/components/admin/AdminUI";
import { useAdminData } from "@/components/admin/AdminProvider";
import { csvFromRows, downloadCsv } from "@/lib/admin/utils";

type SortKey = "name" | "email" | "role" | "status" | "joinDate";

export default function AdminUsersPage() {
  const { users, jobs, transactions, supportTickets } = useAdminData();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("joinDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<string | null>(null);

  const selectedUser = users.find((u) => u.id === selectedUserId) || null;

  const rows = useMemo(() => {
    let list = [...users];

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    if (statusFilter !== "All") list = list.filter((u) => u.status === statusFilter);
    if (roleFilter !== "All") list = list.filter((u) => u.role === roleFilter);

    list.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [query, roleFilter, sortDir, sortKey, statusFilter, users]);

  const setSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  };

  const [error, setError] = useState("");
  const toggleSuspend = async (id: string) => {
    try { await adminAccountRequest(id, "PATCH", { disabled: users.find(u => u.id === id)?.status !== "Suspended" }); setSuspendTarget(null); }
    catch (error) { setError((error as Error).message); setSuspendTarget(null); }
  };

  const exportCsv = () => {
    const csv = csvFromRows(
      rows.map((u) => ({
        Name: u.name,
        Email: u.email,
        Role: u.role,
        Status: u.status,
        JoinDate: u.joinDate,
      }))
    );
    downloadCsv("snowd-admin-users.csv", csv);
  };

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <AdminCard className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users"
            className="h-10 px-3 rounded-lg border-[3px] border-[var(--border)] bg-[var(--bg-primary)] text-sm min-w-[220px]"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 px-3 rounded-lg border-[3px] border-[var(--border)] bg-white text-sm">
            <option>All</option>
            <option>Active</option>
            <option>Suspended</option>
            <option>Pending</option>
          </select>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="h-10 px-3 rounded-lg border-[3px] border-[var(--border)] bg-white text-sm">
            <option>All</option>
            <option>Client</option>
            <option>Operator</option>
            <option>Admin</option>
            <option>Employee</option>
          </select>
          <button onClick={exportCsv} className="ml-auto h-10 px-3 rounded-lg bg-[var(--accent)] text-white text-sm font-semibold inline-flex items-center gap-1.5">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </AdminCard>

      <AdminCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr>
                <th className={tableHead}>Avatar</th>
                <th className={tableHead}><SortHeader label="Name" active={sortKey === "name"} direction={sortDir} onClick={() => setSort("name")} /></th>
                <th className={tableHead}><SortHeader label="Email" active={sortKey === "email"} direction={sortDir} onClick={() => setSort("email")} /></th>
                <th className={tableHead}><SortHeader label="Role" active={sortKey === "role"} direction={sortDir} onClick={() => setSort("role")} /></th>
                <th className={tableHead}><SortHeader label="Status" active={sortKey === "status"} direction={sortDir} onClick={() => setSort("status")} /></th>
                <th className={tableHead}><SortHeader label="Join Date" active={sortKey === "joinDate"} direction={sortDir} onClick={() => setSort("joinDate")} /></th>
                <th className={tableHead}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-primary)]">
                  <td className={tableCell}>
                    <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] text-[var(--accent)] font-semibold text-xs flex items-center justify-center">{u.avatar}</div>
                  </td>
                  <td className={tableCell}>
                    <button onClick={() => setSelectedUserId(u.id)} className="font-medium text-[var(--ink)] hover:text-[var(--accent)]">{u.name}</button>
                  </td>
                  <td className={tableCell}>{u.email}</td>
                  <td className={tableCell}>{u.role}</td>
                  <td className={tableCell}>
                    <StatusTag
                      label={u.status}
                      tone={u.status === "Active" ? "green" : u.status === "Pending" ? "yellow" : "red"}
                    />
                  </td>
                  <td className={tableCell}>{u.joinDate}</td>
                  <td className={tableCell}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSelectedUserId(u.id)} className="w-8 h-8 rounded-lg border-[3px] border-[var(--border)] inline-flex items-center justify-center"><Eye className="w-4 h-4" /></button>
                      <Link aria-label={`Edit ${u.name}`} href={`/admin/users/${u.id}`} className="w-8 h-8 rounded-lg border border-[var(--border)] inline-flex items-center justify-center"><Pencil className="w-4 h-4" /></Link>
                      <button
                        onClick={() => setSuspendTarget(u.id)}
                        className="w-8 h-8 rounded-lg border-[3px] border-[var(--border)] inline-flex items-center justify-center"
                      >
                        {u.status === "Suspended" ? <ShieldCheck className="w-4 h-4 text-[#16A34A]" /> : <ShieldAlert className="w-4 h-4 text-[#DC2626]" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <EmptyState title="No users found" subtitle="Try adjusting search or filters." />}
      </AdminCard>

      <SideDrawer open={!!selectedUser} title={selectedUser?.name || "User profile"} onClose={() => setSelectedUserId(null)}>
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[var(--bg-secondary)] text-[var(--accent)] font-bold text-sm flex items-center justify-center">{selectedUser.avatar}</div>
              <div>
                <Link href={`/admin/users/${selectedUser.id}`} className="text-lg font-semibold underline">{selectedUser.name} · Open account</Link>
                <p className="text-sm text-[var(--text-muted)]">{selectedUser.email}</p>
              </div>
            </div>
            <AdminCard className="p-3">
              <p className="text-xs text-[var(--text-muted)]">Role</p>
              <p className="text-sm font-medium">{selectedUser.role}</p>
              <p className="text-xs text-[var(--text-muted)] mt-2">Join Date</p>
              <p className="text-sm font-medium">{selectedUser.joinDate}</p>
            </AdminCard>
            <AdminCard className="p-3">
              <p className="text-sm font-semibold mb-2">Job History</p>
              <div className="space-y-1.5">
                {jobs.filter((j) => j.clientId === selectedUser.id || j.assignedUsers.includes(selectedUser.id)).map((j) => (
                  <div key={j.id} className="text-sm text-[var(--text-secondary)]">{j.title}</div>
                ))}
                {jobs.filter((j) => j.clientId === selectedUser.id || j.assignedUsers.includes(selectedUser.id)).length === 0 && <p className="text-sm text-[var(--text-muted)]">No jobs found.</p>}
              </div>
            </AdminCard>
            <AdminCard className="p-3">
              <p className="text-sm font-semibold mb-2">Transaction History</p>
              <div className="space-y-1.5">
                {transactions
                  .filter((t) => t.clientId === selectedUser.id || t.operatorId === selectedUser.id)
                  .map((t) => (
                    <div key={t.id} className="text-sm text-[var(--text-secondary)]">{t.id.toUpperCase()} • ${t.amount.toFixed(2)} • {t.status}</div>
                  ))}
                {transactions.filter((t) => t.clientId === selectedUser.id || t.operatorId === selectedUser.id).length === 0 && (
                  <p className="text-sm text-[var(--text-muted)]">No transactions found.</p>
                )}
              </div>
            </AdminCard>
            <AdminCard className="p-3">
              <p className="text-sm font-semibold mb-2">Open Support Tickets</p>
              <div className="space-y-1.5">
                {supportTickets
                  .filter((s) => s.userId === selectedUser.id && s.status !== "Resolved")
                  .map((s) => (
                    <div key={s.id} className="text-sm text-[var(--text-secondary)]">{s.subject} • {s.status}</div>
                  ))}
                {supportTickets.filter((s) => s.userId === selectedUser.id && s.status !== "Resolved").length === 0 && (
                  <p className="text-sm text-[var(--text-muted)]">No open tickets.</p>
                )}
              </div>
            </AdminCard>
          </div>
        )}
      </SideDrawer>

      <ConfirmModal
        open={!!suspendTarget}
        title="Confirm account status change"
        description="This will change the user account status between Active and Suspended."
        confirmLabel="Confirm"
        confirmTone="danger"
        onConfirm={async () => { if (suspendTarget) await toggleSuspend(suspendTarget); }}
        onClose={() => setSuspendTarget(null)}
      />
    </div>
  );
}
