"use client";

import React, { useMemo, useState } from "react";
import { AdminCard, EmptyState, StatusTag } from "@/components/admin/AdminUI";
import { useAdminData } from "@/components/admin/AdminProvider";
import { relativeTime } from "@/lib/admin/utils";

const tagTone: Record<string, "blue" | "green" | "purple" | "yellow" | "red"> = {
  Job: "blue",
  Chat: "purple",
  Transaction: "green",
  Verification: "yellow",
  Support: "red",
  User: "blue",
};

export default function AdminActivityPage() {
  const { activityEvents } = useAdminData();
  const [eventType, setEventType] = useState("All");
  const [userQuery, setUserQuery] = useState("");
  const [actorQuery, setActorQuery] = useState("All");
  const [dateRange, setDateRange] = useState("Last 30 days");
  const [visible, setVisible] = useState(25);

  const actorOptions = useMemo(() => {
    const options = Array.from(
      new Set(activityEvents.map((e) => e.actorUid || e.userName || "System"))
    );
    return ["All", ...options.sort((a, b) => a.localeCompare(b))];
  }, [activityEvents]);

  const filtered = useMemo(() => {
    let list = [...activityEvents].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    if (eventType !== "All") list = list.filter((e) => e.type === eventType);
    if (actorQuery !== "All") {
      list = list.filter((e) => (e.actorUid || e.userName || "System") === actorQuery);
    }
    if (userQuery.trim()) {
      const q = userQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.userName.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          (e.actionType || "").toLowerCase().includes(q) ||
          (e.targetId || "").toLowerCase().includes(q) ||
          (e.where || "").toLowerCase().includes(q)
      );
    }

    const rangeDays = dateRange === "Last 7 days" ? 7 : dateRange === "Last 90 days" ? 90 : 30;
    const minMs = Date.now() - rangeDays * 24 * 60 * 60 * 1000;
    list = list.filter((e) => new Date(e.timestamp).getTime() >= minMs);
    return list;
  }, [activityEvents, eventType, userQuery, actorQuery, dateRange]);

  const shown = filtered.slice(0, visible);

  return (
    <div className="space-y-4">
      <AdminCard className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="h-10 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm">
            <option>All</option>
            <option>Job</option>
            <option>Chat</option>
            <option>Transaction</option>
            <option>Verification</option>
            <option>Support</option>
            <option>User</option>
          </select>
          <input value={userQuery} onChange={(e) => setUserQuery(e.target.value)} placeholder="Filter by user" className="h-10 px-3 rounded-lg border border-[#E5E7EB] bg-[#F8F9FA] text-sm min-w-[220px]" />
          <select value={actorQuery} onChange={(e) => setActorQuery(e.target.value)} className="h-10 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm">
            {actorOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="h-10 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
          </select>
        </div>
      </AdminCard>

      <AdminCard className="p-4">
        <div className="space-y-2">
          {shown.map((event) => (
            <div key={event.id} className="flex items-start gap-3 p-2 rounded-lg border border-[#E5E7EB] bg-white">
              <div className="w-9 h-9 rounded-full bg-[#DBEAFE] text-[#3B82F6] text-xs font-semibold flex items-center justify-center shrink-0">{event.userAvatar}</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[#1A1A2E]">
                  <span className="font-semibold">{event.userName}</span> {event.description}
                </p>
                <p className="text-xs text-[#6B7280] mt-0.5">{relativeTime(event.timestamp)}</p>
                <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-[#6B7280]">
                  {event.actionType && <span className="px-1.5 py-0.5 rounded bg-[#F3F4F6]">action: {event.actionType}</span>}
                  {event.targetId && <span className="px-1.5 py-0.5 rounded bg-[#F3F4F6]">target: {event.targetId}</span>}
                  {event.where && <span className="px-1.5 py-0.5 rounded bg-[#F3F4F6]">where: {event.where}</span>}
                  {event.actorUid && <span className="px-1.5 py-0.5 rounded bg-[#F3F4F6]">actor: {event.actorUid}</span>}
                </div>
              </div>
              <StatusTag label={event.type} tone={tagTone[event.type] || "blue"} />
            </div>
          ))}
        </div>
        {shown.length === 0 && <EmptyState title="No activity events" subtitle="No events match the selected filters." />}
        {visible < filtered.length && (
          <div className="mt-4 text-center">
            <button onClick={() => setVisible((v) => v + 25)} className="h-9 px-4 rounded-lg border border-[#E5E7EB] text-sm text-[#374151] hover:bg-[#F9FAFB]">Load 25 more</button>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
