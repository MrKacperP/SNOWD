"use client";

import { Conversation } from "@/components/admin/Conversation";
import { useAdminSelection } from "@/hooks/useAdminSelection";
import React, { useMemo, useState } from "react";
import { Send } from "lucide-react";
import { AdminCard, EmptyState, StatusTag } from "@/components/admin/AdminUI";
import { useAdminData } from "@/components/admin/AdminProvider";

const urgencyOrder: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

export default function AdminSupportPage() {
  const { supportTickets, setSupportTicketStatus, sendSupportReply } = useAdminData();
  const [selectedId, setSelectedId] = useAdminSelection();
  const [message, setMessage] = useState("");

  const sorted = useMemo(() => {
    return [...supportTickets].sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
  }, [supportTickets]);

  const selected = sorted.find((t) => t.id === selectedId) || sorted[0] || null;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const handleSend = async () => {
    if (!selected || !message.trim() || busy) return;
    setBusy(true); setError("");
    try { await sendSupportReply(selected.id, message.trim()); setMessage(""); }
    catch { setError("Reply could not be sent. Your draft has been kept."); }
    finally { setBusy(false); }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(260px,34%)_minmax(0,1fr)] gap-4 h-[calc(100dvh-128px)] min-h-[520px]">
      <AdminCard className="p-3 min-h-0 overflow-y-auto">
        <div className="space-y-2">
          {sorted.map((ticket) => (
            <button
              key={ticket.id}
              onClick={() => setSelectedId(ticket.id)}
              className={`w-full text-left p-2.5 rounded-lg border ${selected?.id === ticket.id ? "bg-[var(--bg-secondary)] border-[var(--accent)]" : "bg-white border-[var(--border)] hover:bg-[var(--bg-primary)]"}`}
            >
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] text-[var(--accent)] text-xs font-semibold flex items-center justify-center">{ticket.userAvatar}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--ink)] truncate">{ticket.userName}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{ticket.lastMessageAgo}</p>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] truncate">{ticket.subject}</p>
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

      <AdminCard className="p-4 flex min-h-0 flex-col overflow-hidden">
        {selected ? (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div>
                <p className="font-semibold text-[var(--ink)]">{selected.subject}</p>
                <p className="text-xs text-[var(--text-muted)]">From {selected.userName}</p>
              </div>
              <select
                value={selected.status}
                onChange={async (e) => { try { await setSupportTicketStatus(selected.id, e.target.value as "Open" | "Waiting" | "Resolved"); } catch { setError("Could not save ticket status."); } }}
                className="h-9 px-2.5 rounded-lg border-[3px] border-[var(--border)] bg-white text-sm"
              >
                <option>Open</option>
                <option>Waiting</option>
                <option>Resolved</option>
              </select>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto py-3 space-y-2 pr-1">
              <Conversation key={selected.id} id={selected.id} support />
            </div>
            <div className="pt-3 border-t border-[var(--border)]">{error && <p role="alert" className="text-red-700">{error}</p>}
              <div className="flex items-end gap-2">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Reply to user"
                  className="min-h-[72px] max-h-32 flex-1 resize-none rounded-2xl border border-[var(--border)] bg-white p-2.5 text-sm"
                />
                <button disabled={busy || !message.trim()} onClick={handleSend} className="h-10 px-3 rounded-lg bg-[var(--accent)] text-white inline-flex items-center gap-1.5 text-sm font-semibold">
                  <Send className="w-4 h-4" /> {busy ? "Sending…" : "Send"}
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
