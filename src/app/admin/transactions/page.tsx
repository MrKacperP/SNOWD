"use client";

import React, { useMemo, useState } from "react";
import { AdminCard, EmptyState, SideDrawer, SortHeader, StatusTag, tableCell, tableHead } from "@/components/admin/AdminUI";
import { useAdminData } from "@/components/admin/AdminProvider";

type SortKey = "id" | "fromUser" | "toUser" | "amount" | "type" | "status" | "date";

export default function AdminTransactionsPage() {
  const { transactions } = useAdminData();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All");
  const [status, setStatus] = useState("All");
  const [dateRange, setDateRange] = useState("Last 30 days");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = useMemo(() => {
    let list = [...transactions];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((t) => [t.id, t.fromUser, t.toUser].join(" ").toLowerCase().includes(q));
    }
    if (type !== "All") list = list.filter((t) => t.type === type);
    if (status !== "All") list = list.filter((t) => t.status === status);
    list.sort((a, b) => {
      const av = a[sortKey] || "";
      const bv = b[sortKey] || "";
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [transactions, query, type, status, sortKey, sortDir]);

  const selected = rows.find((r) => r.id === selectedId) || transactions.find((r) => r.id === selectedId) || null;

  const summary = {
    totalVolume: rows.filter((t) => t.status === "Completed").reduce((sum, t) => sum + t.amount, 0),
    totalRefunds: rows.filter((t) => t.type === "Refund").reduce((sum, t) => sum + t.amount, 0),
    pendingAmount: rows.filter((t) => t.status === "Pending").reduce((sum, t) => sum + t.amount, 0),
  };

  const setSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <StatusTag label={`Total Volume: $${summary.totalVolume.toFixed(2)}`} tone="blue" />
        <StatusTag label={`Total Refunds: $${summary.totalRefunds.toFixed(2)}`} tone="yellow" />
        <StatusTag label={`Pending Amount: $${summary.pendingAmount.toFixed(2)}`} tone="red" />
      </div>

      <AdminCard className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="h-10 px-3 rounded-lg border border-[#E5E7EB] text-sm bg-white">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
          </select>
          <select value={type} onChange={(e) => setType(e.target.value)} className="h-10 px-3 rounded-lg border border-[#E5E7EB] text-sm bg-white">
            <option>All</option>
            <option>Payment</option>
            <option>Refund</option>
            <option>Fee</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 px-3 rounded-lg border border-[#E5E7EB] text-sm bg-white">
            <option>All</option>
            <option>Completed</option>
            <option>Pending</option>
            <option>Failed</option>
          </select>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search transactions" className="h-10 px-3 rounded-lg border border-[#E5E7EB] bg-[#F8F9FA] text-sm min-w-[220px]" />
        </div>
      </AdminCard>

      <AdminCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr>
                <th className={tableHead}><SortHeader label="Transaction ID" active={sortKey === "id"} direction={sortDir} onClick={() => setSort("id")} /></th>
                <th className={tableHead}><SortHeader label="From User" active={sortKey === "fromUser"} direction={sortDir} onClick={() => setSort("fromUser")} /></th>
                <th className={tableHead}><SortHeader label="To User" active={sortKey === "toUser"} direction={sortDir} onClick={() => setSort("toUser")} /></th>
                <th className={tableHead}><SortHeader label="Amount" active={sortKey === "amount"} direction={sortDir} onClick={() => setSort("amount")} /></th>
                <th className={tableHead}><SortHeader label="Type" active={sortKey === "type"} direction={sortDir} onClick={() => setSort("type")} /></th>
                <th className={tableHead}><SortHeader label="Status" active={sortKey === "status"} direction={sortDir} onClick={() => setSort("status")} /></th>
                <th className={tableHead}><SortHeader label="Date" active={sortKey === "date"} direction={sortDir} onClick={() => setSort("date")} /></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB] cursor-pointer" onClick={() => setSelectedId(t.id)}>
                  <td className={tableCell}>{t.id.toUpperCase()}</td>
                  <td className={tableCell}>{t.fromUser}</td>
                  <td className={tableCell}>{t.toUser}</td>
                  <td className={tableCell}>${t.amount.toFixed(2)}</td>
                  <td className={tableCell}>{t.type}</td>
                  <td className={tableCell}>
                    <StatusTag
                      label={t.status}
                      tone={t.status === "Completed" ? "green" : t.status === "Pending" ? "yellow" : "red"}
                    />
                  </td>
                  <td className={tableCell}>{t.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <EmptyState title="No transactions found" subtitle="Try changing your filters." />}
      </AdminCard>

      <SideDrawer open={!!selected} title={`Transaction ${selected?.id.toUpperCase() || ""}`} onClose={() => setSelectedId(null)}>
        {selected && (
          <div className="space-y-3">
            <AdminCard className="p-3">
              <p className="text-sm font-semibold">Breakdown</p>
              <p className="text-sm mt-1">From: {selected.fromUser}</p>
              <p className="text-sm">To: {selected.toUser}</p>
              <p className="text-sm">Amount: ${selected.amount.toFixed(2)}</p>
              <p className="text-sm">Type: {selected.type}</p>
              <p className="text-sm">Status: {selected.status}</p>
            </AdminCard>
            <AdminCard className="p-3">
              <p className="text-sm font-semibold">Linked Job</p>
              <p className="text-sm mt-1">{selected.linkedJobId || "No linked job"}</p>
            </AdminCard>
            <AdminCard className="p-3">
              <p className="text-sm font-semibold">Dispute History</p>
              <div className="text-sm mt-1 text-[#374151] space-y-1">
                {(selected.disputeHistory || []).length ? (selected.disputeHistory || []).map((d) => <p key={d}>• {d}</p>) : <p>No disputes on record.</p>}
              </div>
            </AdminCard>
          </div>
        )}
      </SideDrawer>
    </div>
  );
}
