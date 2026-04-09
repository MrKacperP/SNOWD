"use client";

import React, { useMemo, useState } from "react";
import { Flag, Pencil, Trash2 } from "lucide-react";
import { AdminCard, ConfirmModal, EmptyState, SideDrawer, SortHeader, StatusTag, tableCell, tableHead } from "@/components/admin/AdminUI";
import { useAdminData } from "@/components/admin/AdminProvider";

type SortKey = "title" | "postedBy" | "category" | "status" | "datePosted";

export default function AdminJobsPage() {
  const { jobs, flagJob, deleteJob } = useAdminData();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("datePosted");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [jobDrawerId, setJobDrawerId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: "flag" | "delete"; id: string } | null>(null);

  const rows = useMemo(() => {
    let list = [...jobs];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((j) => j.title.toLowerCase().includes(q) || j.postedBy.toLowerCase().includes(q));
    }
    if (category !== "All") list = list.filter((j) => j.category === category);
    if (status !== "All") list = list.filter((j) => j.status === status);
    list.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [jobs, query, category, status, sortKey, sortDir]);

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
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search jobs" className="h-10 px-3 rounded-lg border border-[#E5E7EB] bg-[#F8F9FA] text-sm min-w-[220px]" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm">
            <option>All</option>
            <option>Snow Removal</option>
            <option>Salting</option>
            <option>Shoveling</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm">
            <option>All</option>
            <option>Open</option>
            <option>In Progress</option>
            <option>Completed</option>
            <option>Flagged</option>
          </select>
        </div>
      </AdminCard>

      <AdminCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px]">
            <thead>
              <tr>
                <th className={tableHead}><SortHeader label="Job Title" active={sortKey === "title"} direction={sortDir} onClick={() => setSort("title")} /></th>
                <th className={tableHead}><SortHeader label="Posted By" active={sortKey === "postedBy"} direction={sortDir} onClick={() => setSort("postedBy")} /></th>
                <th className={tableHead}><SortHeader label="Category" active={sortKey === "category"} direction={sortDir} onClick={() => setSort("category")} /></th>
                <th className={tableHead}><SortHeader label="Status" active={sortKey === "status"} direction={sortDir} onClick={() => setSort("status")} /></th>
                <th className={tableHead}><SortHeader label="Date Posted" active={sortKey === "datePosted"} direction={sortDir} onClick={() => setSort("datePosted")} /></th>
                <th className={tableHead}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((job) => (
                <tr key={job.id} className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB]">
                  <td className={tableCell}>
                    <button onClick={() => setJobDrawerId(job.id)} className="font-medium text-[#1A1A2E] hover:text-[#3B82F6]">{job.title}</button>
                  </td>
                  <td className={tableCell}>{job.postedBy}</td>
                  <td className={tableCell}>{job.category}</td>
                  <td className={tableCell}>
                    <StatusTag
                      label={job.status}
                      tone={job.status === "Open" ? "blue" : job.status === "In Progress" ? "yellow" : job.status === "Completed" ? "green" : "red"}
                    />
                  </td>
                  <td className={tableCell}>{job.datePosted}</td>
                  <td className={tableCell}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setJobDrawerId(job.id)} className="h-8 px-2 rounded-lg border border-[#E5E7EB] text-xs">View</button>
                      <button className="w-8 h-8 rounded-lg border border-[#E5E7EB] inline-flex items-center justify-center"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => setConfirmAction({ type: "flag", id: job.id })} className="w-8 h-8 rounded-lg border border-[#E5E7EB] inline-flex items-center justify-center"><Flag className="w-4 h-4" /></button>
                      <button onClick={() => setConfirmAction({ type: "delete", id: job.id })} className="w-8 h-8 rounded-lg border border-[#E5E7EB] inline-flex items-center justify-center"><Trash2 className="w-4 h-4 text-[#DC2626]" /></button>
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
          <div className="space-y-3">
            <AdminCard className="p-3">
              <p className="text-xs text-[#6B7280]">Description</p>
              <p className="text-sm text-[#1A1A2E] mt-1">{selected.description}</p>
            </AdminCard>
            <AdminCard className="p-3">
              <p className="text-sm font-semibold">Assigned Users</p>
              <div className="mt-2 space-y-1 text-sm text-[#374151]">
                {selected.assignedUsers.length ? selected.assignedUsers.map((u) => <p key={u}>{u}</p>) : <p>No assignees yet.</p>}
              </div>
            </AdminCard>
            <AdminCard className="p-3">
              <p className="text-sm font-semibold">Timeline</p>
              <div className="mt-2 space-y-1 text-sm text-[#374151]">
                {selected.timeline.map((t) => <p key={t}>• {t}</p>)}
              </div>
            </AdminCard>
            <AdminCard className="p-3">
              <p className="text-sm font-semibold">Linked Records</p>
              <p className="text-sm text-[#374151] mt-1">Chat: {selected.chatId || "N/A"}</p>
              <p className="text-sm text-[#374151]">Transaction: {selected.transactionId || "N/A"}</p>
            </AdminCard>
          </div>
        )}
      </SideDrawer>

      <ConfirmModal
        open={!!confirmAction}
        title={confirmAction?.type === "delete" ? "Delete job" : "Flag job"}
        description={
          confirmAction?.type === "delete"
            ? "This permanently deletes the selected job."
            : "This marks the selected job as flagged for review."
        }
        confirmLabel={confirmAction?.type === "delete" ? "Delete" : "Flag"}
        confirmTone="danger"
        onConfirm={() => {
          if (!confirmAction) return;
          if (confirmAction.type === "delete") deleteJob(confirmAction.id);
          else flagJob(confirmAction.id);
          setConfirmAction(null);
        }}
        onClose={() => setConfirmAction(null)}
      />
    </div>
  );
}
