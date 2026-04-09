"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Send } from "lucide-react";
import { AdminCard, EmptyState, StatusTag } from "@/components/admin/AdminUI";
import { useAdminData } from "@/components/admin/AdminProvider";

const urgencyOrder: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

export default function AdminSupportPage() {
  const { supportTickets, setSupportTicketStatus, sendSupportReply } = useAdminData();
  const [selectedId, setSelectedId] = useState<string | null>(supportTickets[0]?.id || null);
  const [message, setMessage] = useState("");

  const sorted = useMemo(() => {
    return [...supportTickets].sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
  }, [supportTickets]);

  const selected = sorted.find((t) => t.id === selectedId) || null;

  useEffect(() => {
    if (sorted.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !sorted.some((ticket) => ticket.id === selectedId)) {
      setSelectedId(sorted[0].id);
    }
  }, [sorted, selectedId]);

  const handleSend = () => {
    if (!selected || !message.trim()) return;
    sendSupportReply(selected.id, message.trim());
    setMessage("");
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[35%_65%] gap-4 min-h-[680px]">
      <AdminCard className="p-3 overflow-y-auto">
        <div className="space-y-2">
          {sorted.map((ticket) => (
            <button
              key={ticket.id}
              onClick={() => setSelectedId(ticket.id)}
              className={`w-full text-left p-2.5 rounded-lg border ${selectedId === ticket.id ? "bg-[#EFF6FF] border-[#3B82F6]" : "bg-white border-[#E5E7EB] hover:bg-[#F9FAFB]"}`}
            >
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#DBEAFE] text-[#3B82F6] text-xs font-semibold flex items-center justify-center">{ticket.userAvatar}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#1A1A2E] truncate">{ticket.userName}</p>
                    <p className="text-[11px] text-[#6B7280]">{ticket.lastMessageAgo}</p>
                  </div>
                  <p className="text-xs text-[#374151] truncate">{ticket.subject}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <StatusTag label={ticket.status} tone={ticket.status === "Open" ? "red" : ticket.status === "Waiting" ? "yellow" : "green"} />
                    <StatusTag label={ticket.urgency} tone={ticket.urgency === "High" ? "red" : ticket.urgency === "Medium" ? "yellow" : "blue"} />
                    {ticket.unreadReplies > 0 && <StatusTag label={String(ticket.unreadReplies)} tone="blue" />}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </AdminCard>

      <AdminCard className="p-4 flex flex-col min-h-0">
        {selected ? (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div>
                <p className="font-semibold text-[#1A1A2E]">{selected.subject}</p>
                <p className="text-xs text-[#6B7280]">From {selected.userName}</p>
              </div>
              <select
                value={selected.status}
                onChange={(e) => setSupportTicketStatus(selected.id, e.target.value as "Open" | "Waiting" | "Resolved")}
                className="h-9 px-2.5 rounded-lg border border-[#E5E7EB] bg-white text-sm"
              >
                <option>Open</option>
                <option>Waiting</option>
                <option>Resolved</option>
              </select>
            </div>
            <div className="flex-1 overflow-y-auto py-3 space-y-2">
              {selected.thread.map((entry) => (
                <div key={entry.id} className={`flex ${entry.sender === "user" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[72%] px-3 py-2 rounded-lg text-sm ${entry.sender === "user" ? "bg-[#F3F4F6] text-[#1F2937]" : "bg-[#EFF6FF] text-[#1E3A8A]"}`}>
                    <p>{entry.text}</p>
                    <p className="text-[11px] text-[#6B7280] mt-1">{entry.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-[#E5E7EB]">
              <div className="flex items-end gap-2">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Reply to user"
                  className="flex-1 min-h-[88px] rounded-lg border border-[#E5E7EB] bg-white p-2.5 text-sm"
                />
                <button onClick={handleSend} className="h-10 px-3 rounded-lg bg-[#3B82F6] text-white inline-flex items-center gap-1.5 text-sm font-semibold">
                  <Send className="w-4 h-4" /> Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState title="No ticket selected" subtitle="Choose a support ticket to view and respond." />
        )}
      </AdminCard>
    </div>
  );
}
