"use client";

import { ServiceReport } from "@/components/admin/ServiceReport";
import { useAdminSelection } from "@/hooks/useAdminSelection";
import Link from "next/link";
import React, { useMemo, useState } from "react";
import { Eye, MessageSquare, Pencil } from "lucide-react";
import { AdminCard, EmptyState, SideDrawer, SortHeader, StatusTag, tableCell, tableHead } from "@/components/admin/AdminUI";
import { useAdminData } from "@/components/admin/AdminProvider";

type SortKey = "title" | "category" | "orderNumber" | "status" | "datePosted" | "price";

export default function AdminJobsPage() {
  const { jobs, users } = useAdminData();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("datePosted");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [jobDrawerId, setJobDrawerId] = useAdminSelection();
  const rows = useMemo(() => {
    let list = [...jobs];
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((j) => {
        const orderNumber = j.orderNumber || `L-${j.id}`;
        return [
          j.id,
          orderNumber,
          `#${orderNumber}`,
          `Order #${orderNumber}`,
          `Work order #${orderNumber}`,
          j.title,
          j.postedBy,
          j.address,
          j.datePosted,
          j.scheduledDate,
          users.find((u) => u.id === j.clientId)?.name,
          users.find((u) => u.id === j.assignedUsers[0])?.name,
        ].filter(Boolean).join(" ").toLowerCase().includes(q);
      });
    }
    if (category !== "All") list = list.filter((j) => j.category === category);
    if (status !== "All") list = list.filter((j) => j.status === status);
    list.sort((a, b) => {
      const comparison = String(a[sortKey] ?? "").localeCompare(String(b[sortKey] ?? ""), undefined, { numeric: true });
      return sortDir === "asc" ? comparison : -comparison;
    });
    return list;
  }, [jobs, query, category, status, sortKey, sortDir, users]);

  const selected = rows.find((j) => j.id === jobDrawerId) || jobs.find((j) => j.id === jobDrawerId) || null;

  const setSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  };

  return (
    <div className="space-y-4">
      <AdminCard className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input aria-label="Search jobs by work order number, date, client, or operator" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search work order #, date, client, or operator" className="h-10 px-3 rounded-lg border-[3px] border-[var(--border)] bg-[var(--bg-primary)] text-sm min-w-[280px]" />
          <select aria-label="Filter service" value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 px-3 rounded-lg border-[3px] border-[var(--border)] bg-white text-sm">
            <option>All</option>
            <option>Snow Removal</option>
            <option>Salting</option>
            <option>Shoveling</option>
          </select>
          <select aria-label="Filter job status" value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 px-3 rounded-lg border-[3px] border-[var(--border)] bg-white text-sm">
            <option>All</option>
            <option>Open</option>
            <option>Scheduled</option>
            <option>On the way</option>
            <option>In Progress</option>
            <option>Completed</option>
            <option>Flagged</option><option>Cancelled</option>
          </select>
        </div>
      </AdminCard>

      <AdminCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px]">
            <thead>
              <tr>
                <th className={tableHead}><SortHeader label="Client & Operator" active={sortKey === "title"} direction={sortDir} onClick={() => setSort("title")} /></th>
                <th className={tableHead}><SortHeader label="Service" active={sortKey === "category"} direction={sortDir} onClick={() => setSort("category")} /></th>
                <th className={tableHead}><SortHeader label="Work Order" active={sortKey === "orderNumber"} direction={sortDir} onClick={() => setSort("orderNumber")} /></th>
                <th className={tableHead}><SortHeader label="Status" active={sortKey === "status"} direction={sortDir} onClick={() => setSort("status")} /></th>
                <th className={tableHead}><SortHeader label="Posted Date" active={sortKey === "datePosted"} direction={sortDir} onClick={() => setSort("datePosted")} /></th>
                <th className={tableHead}><SortHeader label="Price" active={sortKey === "price"} direction={sortDir} onClick={() => setSort("price")} /></th>
                <th className={tableHead}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((job) => (
                <tr key={job.id} tabIndex={0} aria-label={`Open work order ${job.orderNumber || job.id}`} onClick={() => setJobDrawerId(job.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setJobDrawerId(job.id); } }} className="cursor-pointer border-b border-[var(--border)] hover:bg-[var(--bg-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-[-2px]">
                  <td className={tableCell}>
                    <div className="text-left font-medium text-[var(--ink)]">
                      <span className="block">{users.find((user) => user.id === job.clientId)?.name || job.postedBy || "Client unavailable"}</span>
                      <span className="block text-xs font-normal text-[var(--text-muted)]">with {users.find((user) => user.id === job.assignedUsers[0])?.name || "Operator unassigned"}</span>
                    </div>
                  </td>
                  <td className={tableCell}>{job.title || job.category}</td>
                  <td className={tableCell}><span className="font-semibold text-[var(--ink)]">#{job.orderNumber || `L-${job.id}`}</span></td>
                  <td className={tableCell}>
                    <StatusTag
                      label={job.status}
                      tone={["Open", "Scheduled"].includes(job.status) ? "blue" : ["In Progress", "On the way"].includes(job.status) ? "yellow" : job.status === "Completed" ? "green" : "red"}
                    />
                  </td>
                  <td className={tableCell}>{job.datePosted}</td>
                  <td className={tableCell}><span className="font-semibold">${Number(job.price || 0).toFixed(2)}</span><span className="block text-xs text-[var(--text-muted)]">CAD</span></td>
                  <td className={tableCell}>
                    <div className="flex items-center gap-1">
                      <button aria-label={`View work order ${job.orderNumber || job.id}`} title="View" onClick={(event) => { event.stopPropagation(); setJobDrawerId(job.id); }} className="w-8 h-8 rounded-lg border-[3px] border-[var(--border)] inline-flex items-center justify-center"><Eye className="w-4 h-4" /></button>
                      <button aria-label={`Edit ${job.title}`} onClick={(event) => { event.stopPropagation(); setJobDrawerId(job.id); }} className="w-8 h-8 rounded-lg border-[3px] border-[var(--border)] inline-flex items-center justify-center"><Pencil className="w-4 h-4" /></button>
                      {job.chatId ? <Link onClick={(event) => event.stopPropagation()} aria-label={`Contact participants for work order ${job.orderNumber || job.id}`} title="Contact" href={`/admin/chats?id=${encodeURIComponent(job.chatId)}`} className="w-8 h-8 rounded-lg border border-[var(--border)] inline-flex items-center justify-center"><MessageSquare className="w-4 h-4" /></Link> : <button onClick={(event) => event.stopPropagation()} disabled aria-label="No conversation available" title="No conversation available" className="w-8 h-8 rounded-lg border border-[var(--border)] inline-flex items-center justify-center"><MessageSquare className="w-4 h-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <EmptyState title="No jobs found" subtitle="Try changing filters or search text." />}
      </AdminCard>

      <SideDrawer open={!!selected} title={selected?.title || "Job details"} onClose={() => setJobDrawerId(null)}>
        {selected && (
          <ServiceReport key={selected.id} job={selected} />
        )}
      </SideDrawer>

    </div>
  );
}
