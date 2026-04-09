"use client";

import React, { useMemo, useState } from "react";
import { PlayCircle } from "lucide-react";
import { AdminCard, EmptyState, SortHeader, StatusTag, tableCell, tableHead } from "@/components/admin/AdminUI";
import { useAdminData } from "@/components/admin/AdminProvider";

type SortKey = "caller" | "receiver" | "duration" | "status" | "dateTime";

const rangeDaysMap: Record<string, number> = {
  "Last 7 days": 7,
  "Last 30 days": 30,
  "Last 90 days": 90,
};

export default function AdminCallsPage() {
  const { calls } = useAdminData();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [dateRange, setDateRange] = useState("Last 30 days");
  const [sortKey, setSortKey] = useState<SortKey>("dateTime");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const rows = useMemo(() => {
    let list = [...calls];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((c) =>
        [
          c.caller,
          c.receiver,
          c.callerEmail,
          c.receiverEmail,
          c.callerPhone,
          c.receiverPhone,
          c.callerId,
          c.receiverId,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    if (status !== "All") list = list.filter((c) => c.status === status);

    const minMs = Date.now() - (rangeDaysMap[dateRange] || 30) * 24 * 60 * 60 * 1000;
    list = list.filter((c) => new Date(c.dateTimeIso || c.dateTime).getTime() >= minMs);

    list.sort((a, b) => {
      const av = sortKey === "dateTime" ? new Date(a.dateTimeIso || a.dateTime).getTime() : sortKey === "duration" ? a.durationSeconds ?? 0 : a[sortKey] || "";
      const bv = sortKey === "dateTime" ? new Date(b.dateTimeIso || b.dateTime).getTime() : sortKey === "duration" ? b.durationSeconds ?? 0 : b[sortKey] || "";
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [calls, dateRange, query, sortDir, sortKey, status]);

  const toggleSort = (key: SortKey) => {
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
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="h-10 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm">
            <option>All</option>
            <option>Completed</option>
            <option>Missed</option>
            <option>In Progress</option>
          </select>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by user" className="h-10 px-3 rounded-lg border border-[#E5E7EB] bg-[#F8F9FA] text-sm min-w-[220px]" />
        </div>
      </AdminCard>

      <AdminCard className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className={tableHead}><SortHeader label="Caller" active={sortKey === "caller"} direction={sortDir} onClick={() => toggleSort("caller")} /></th>
              <th className={tableHead}><SortHeader label="Receiver" active={sortKey === "receiver"} direction={sortDir} onClick={() => toggleSort("receiver")} /></th>
              <th className={tableHead}><SortHeader label="Duration" active={sortKey === "duration"} direction={sortDir} onClick={() => toggleSort("duration")} /></th>
              <th className={tableHead}><SortHeader label="Status" active={sortKey === "status"} direction={sortDir} onClick={() => toggleSort("status")} /></th>
              <th className={tableHead}><SortHeader label="Date/Time" active={sortKey === "dateTime"} direction={sortDir} onClick={() => toggleSort("dateTime")} /></th>
              <th className={tableHead}>Recording</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((call) => (
              <React.Fragment key={call.id}>
                <tr className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB] cursor-pointer" onClick={() => setExpandedId((prev) => (prev === call.id ? null : call.id))}>
                  <td className={tableCell}>{call.caller}</td>
                  <td className={tableCell}>{call.receiver}</td>
                  <td className={tableCell}>{call.duration}</td>
                  <td className={tableCell}>
                    <StatusTag
                      label={call.status}
                      tone={call.status === "Completed" ? "green" : call.status === "Missed" ? "red" : "yellow"}
                    />
                  </td>
                  <td className={tableCell}>{call.dateTime}</td>
                  <td className={tableCell}>
                    {call.recordingUrl ? <PlayCircle className="w-5 h-5 text-[#3B82F6]" /> : <span className="text-xs text-[#9CA3AF]">{call.recordingStatus || "missing"}</span>}
                  </td>
                </tr>
                {expandedId === call.id && (
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                    <td colSpan={6} className="px-4 py-3 text-sm text-[#374151]">
                      <p><span className="font-semibold">Caller:</span> {call.callerEmail || "-"} {call.callerPhone ? `• ${call.callerPhone}` : ""}</p>
                      <p><span className="font-semibold">Receiver:</span> {call.receiverEmail || "-"} {call.receiverPhone ? `• ${call.receiverPhone}` : ""}</p>
                      <p className="mt-1"><span className="font-semibold">Caller UID:</span> {call.callerId || "-"}</p>
                      <p><span className="font-semibold">Receiver UID:</span> {call.receiverId || "-"}</p>
                      <p><span className="font-semibold">Call notes:</span> {call.notes || "No notes available."}</p>
                      <p className="mt-1"><span className="font-semibold">Transcript preview:</span> {call.transcriptPreview || "No transcript preview."}</p>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <EmptyState title="No calls found" subtitle="No calls match your current filters." />}
      </AdminCard>
    </div>
  );
}
