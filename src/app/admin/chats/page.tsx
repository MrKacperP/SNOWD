"use client";

import React, { useMemo, useState } from "react";
import { AdminCard, EmptyState, StatusTag } from "@/components/admin/AdminUI";
import { useAdminData } from "@/components/admin/AdminProvider";

export default function AdminChatsPage() {
  const { chats } = useAdminData();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(chats[0]?.id || null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const list = [...chats].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    if (!q) return list;
    return list.filter((c) => [c.participantA, c.participantB, c.lastMessage].join(" ").toLowerCase().includes(q));
  }, [chats, query]);

  const selected = filtered.find((c) => c.id === selectedId) || chats.find((c) => c.id === selectedId) || null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[35%_65%] gap-4 min-h-[680px]">
      <AdminCard className="p-3 flex flex-col min-h-0">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chats"
          className="h-10 px-3 rounded-lg border-[3px] border-[var(--border)] bg-[var(--bg-primary)] text-sm"
        />
        <div className="mt-3 overflow-y-auto space-y-2 min-h-0">
          {filtered.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setSelectedId(chat.id)}
              className={`w-full text-left p-2.5 rounded-lg border ${selectedId === chat.id ? "border-[var(--accent)] bg-[var(--bg-secondary)]" : "border-[var(--border)] hover:bg-[var(--bg-primary)]"}`}
            >
              <div className="flex items-start gap-2.5">
                <div className="flex -space-x-1">
                  <div className="w-7 h-7 rounded-full bg-[var(--bg-secondary)] text-[var(--accent)] text-xs font-semibold flex items-center justify-center border border-white">{chat.avatarA}</div>
                  <div className="w-7 h-7 rounded-full bg-[var(--border)] text-[var(--text-muted)] text-xs font-semibold flex items-center justify-center border border-white">{chat.avatarB}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold truncate text-[var(--ink)]">{chat.participantA} / {chat.participantB}</p>
                    <p className="text-[11px] text-[var(--text-muted)] shrink-0">{new Date(chat.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{chat.lastMessage}</p>
                </div>
                {chat.unreadCount > 0 && <StatusTag label={String(chat.unreadCount)} tone="blue" />}
              </div>
            </button>
          ))}
          {filtered.length === 0 && <EmptyState title="No chats found" subtitle="Try another search term." />}
        </div>
      </AdminCard>

      <AdminCard className="p-4 flex flex-col min-h-0">
        {selected ? (
          <>
            <div className="pb-3 border-b border-[var(--border)]">
              <p className="font-semibold text-[var(--ink)]">{selected.participantA} and {selected.participantB}</p>
              <p className="text-xs text-[var(--text-muted)]">Conversation details</p>
            </div>
            <div className="flex-1 overflow-y-auto py-3 space-y-2">
              {selected.messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === "A" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[70%] px-3 py-2 rounded-lg text-sm ${m.sender === "A" ? "bg-[var(--bg-secondary)] text-[#1F2937]" : "bg-[var(--bg-secondary)] text-[#1E3A8A]"}`}>
                    <p>{m.text}</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">{m.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-[var(--border)]">
              <p className="text-sm text-[var(--text-muted)]">Read-only: admins can view conversations but cannot send messages.</p>
            </div>
          </>
        ) : (
          <EmptyState title="No conversation selected" subtitle="Choose a chat from the list to view thread details." />
        )}
      </AdminCard>
    </div>
  );
}
