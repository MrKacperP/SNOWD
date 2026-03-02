"use client";

import React, { useState, useEffect } from "react";
import {
  collection,
  doc,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  addDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SupportTicket } from "@/lib/types";
import {
  Headphones,
  ArrowLeft,
  Send,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";

type SupportMessage = {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: Date;
  read: boolean;
};

type EnrichedTicket = SupportTicket & { userName?: string; userEmail?: string };

export default function AdminSupportChatsPage() {
  const [tickets, setTickets] = useState<EnrichedTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<EnrichedTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [adminReply, setAdminReply] = useState("");
  const [replying, setReplying] = useState(false);
  const [filter, setFilter] = useState<"all" | "open" | "in-progress" | "resolved">("all");

  // Real-time support ticket listener
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "supportChats"), (snap) => {
      const list: EnrichedTicket[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: data.userId || "",
          userRole: data.userRole || "client",
          subject: data.subject || "Support Request",
          description: data.lastMessage || "",
          status: data.status || "open",
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || data.lastMessageTime?.toDate?.() || new Date(),
          userName: data.userName,
          userEmail: data.userEmail,
          problemCategory: data.problemCategory,
        } as EnrichedTicket;
      });
      list.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      setTickets(list);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  // Real-time messages for selected ticket
  useEffect(() => {
    if (!selectedTicket) { setMessages([]); return; }
    const q = query(
      collection(db, "supportChats", selectedTicket.id, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(
        snap.docs.map((d) => {
          const data = d.data();
          return { id: d.id, ...data, createdAt: data.createdAt?.toDate?.() || new Date() } as SupportMessage;
        })
      );
    }, () => setMessages([]));
    return () => unsub();
  }, [selectedTicket]);

  const handleReply = async () => {
    if (!adminReply.trim() || !selectedTicket || replying) return;
    setReplying(true);
    const content = adminReply.trim();
    setAdminReply("");
    try {
      await addDoc(
        collection(db, "supportChats", selectedTicket.id, "messages"),
        {
          senderId: "SNOWD_ADMIN",
          senderName: "SNOWD Support",
          content,
          createdAt: new Date(),
          read: false,
        }
      );
      await updateDoc(doc(db, "supportChats", selectedTicket.id), {
        lastMessage: content,
        lastMessageTime: new Date(),
        updatedAt: new Date(),
        status: selectedTicket.status === "open" ? "in-progress" : selectedTicket.status,
      });
      setSelectedTicket((prev) =>
        prev ? { ...prev, status: prev.status === "open" ? "in-progress" : prev.status } : prev
      );
    } catch (e) {
      console.error("Error sending reply:", e);
    } finally {
      setReplying(false);
    }
  };

  const setStatus = async (status: string) => {
    if (!selectedTicket) return;
    try {
      await updateDoc(doc(db, "supportChats", selectedTicket.id), {
        status,
        updatedAt: new Date(),
      });

      // Post a system message so the user sees the status change in their chat
      const systemContent =
        status === "resolved"
          ? "✅ Your support request has been resolved. If you still need help, please reply below."
          : status === "in-progress"
          ? "👀 Our team is now reviewing your request. We\'ll get back to you shortly."
          : status === "open"
          ? "🔄 Your support request has been reopened. We will be in touch."
          : `Status updated to ${status}`;

      await addDoc(
        collection(db, "supportChats", selectedTicket.id, "messages"),
        {
          senderId: "SNOWD_ADMIN",
          senderName: "SNOWD Support",
          type: "status-update",
          statusValue: status,
          content: systemContent,
          createdAt: new Date(),
          read: false,
        }
      );
      await updateDoc(doc(db, "supportChats", selectedTicket.id), {
        lastMessage: systemContent,
        lastMessageTime: new Date(),
      });

      setSelectedTicket((prev) => prev ? { ...prev, status: status as SupportTicket["status"] } : prev);
    } catch (e) { console.error(e); }
  };

  const filtered =
    filter === "all" ? tickets : tickets.filter((t) => t.status === filter);

  const counts = {
    all: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    "in-progress": tickets.filter((t) => t.status === "in-progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
  };

  const statusBadge = (status: string) => {
    if (status === "open")
      return <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-green-100 text-green-700">Open</span>;
    if (status === "in-progress")
      return <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-100 text-amber-700">In Progress</span>;
    if (status === "resolved")
      return <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-blue-100 text-blue-700">Resolved</span>;
    return <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-gray-100 text-gray-600">{status}</span>;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Headphones className="w-6 h-6 text-[#246EB9]" />
        <h1 className="text-2xl font-bold">Support Chats</h1>
        {counts.open > 0 && (
          <span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            {counts.open} open
          </span>
        )}
        {counts["in-progress"] > 0 && (
          <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            {counts["in-progress"]} in progress
          </span>
        )}
      </div>

      {selectedTicket ? (
        <div className="space-y-4">
          {/* Back button */}
          <button
            onClick={() => { setSelectedTicket(null); setAdminReply(""); }}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to support chats
          </button>

          {/* Ticket info + status actions */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-gray-900">
                  {selectedTicket.userName || "Unknown User"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 capitalize">
                  {selectedTicket.userRole} &middot; UID:{" "}
                  {selectedTicket.userId.replace("support_", "")}
                </p>
                {(selectedTicket as EnrichedTicket & { problemCategory?: string }).problemCategory && (
                  <p className="text-xs text-[#246EB9] mt-1 font-medium capitalize">
                    Category: {(selectedTicket as EnrichedTicket & { problemCategory?: string }).problemCategory}
                  </p>
                )}
              </div>
              {statusBadge(selectedTicket.status)}
            </div>

            <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
              {selectedTicket.status !== "resolved" && (
                <button
                  onClick={() => setStatus("resolved")}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Mark Resolved
                </button>
              )}
              {selectedTicket.status !== "in-progress" && selectedTicket.status !== "resolved" && (
                <button
                  onClick={() => setStatus("in-progress")}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 transition"
                >
                  <Clock className="w-3.5 h-3.5" /> Mark In Progress
                </button>
              )}
              {selectedTicket.status === "resolved" && (
                <button
                  onClick={() => setStatus("open")}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 text-white text-xs font-semibold rounded-lg hover:bg-gray-700 transition"
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Reopen
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 max-h-[52vh] overflow-y-auto space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">
                No messages yet
              </div>
            ) : (
              messages.map((msg) => {
                const isAdmin = msg.senderId === "SNOWD_ADMIN";
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                        isAdmin
                          ? "bg-[#246EB9] text-white rounded-br-md"
                          : "bg-gray-100 text-gray-900 rounded-bl-md"
                      }`}
                    >
                      <p
                        className={`text-xs font-medium mb-0.5 ${
                          isAdmin ? "text-white/70" : "text-[#246EB9]"
                        }`}
                      >
                        {msg.senderName}
                      </p>
                      <p className="text-sm">{msg.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          isAdmin ? "text-white/50" : "text-gray-400"
                        }`}
                      >
                        {format(msg.createdAt, "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Reply box */}
          <div className="bg-white rounded-2xl border border-gray-100 p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={adminReply}
                onChange={(e) => setAdminReply(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && handleReply()
                }
                placeholder="Reply as SNOWD Support..."
                className="flex-1 px-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#246EB9]/20"
              />
              <button
                onClick={handleReply}
                disabled={!adminReply.trim() || replying}
                className="w-10 h-10 bg-[#246EB9] hover:bg-[#1B5A9A] disabled:opacity-50 text-white rounded-xl flex items-center justify-center transition"
              >
                {replying ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Filter tabs */}
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1 overflow-x-auto">
            {(["all", "open", "in-progress", "resolved"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  filter === f
                    ? "bg-white text-[#246EB9] shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <span className="capitalize">{f === "in-progress" ? "In Progress" : f}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    filter === f
                      ? "bg-[#246EB9]/10 text-[#246EB9]"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {counts[f]}
                </span>
              </button>
            ))}
          </div>

          {/* Ticket list */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-6 h-6 text-[#246EB9] animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Headphones className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">
                {filter === "all"
                  ? "No support conversations yet"
                  : `No ${filter} conversations`}
              </p>
              {filter === "all" && (
                <p className="text-gray-300 text-xs mt-1">
                  Users can reach support via the help button in their dashboard
                </p>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
              {filtered.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition text-left"
                >
                  <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center shrink-0">
                    <Headphones className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-gray-900 truncate">
                        {ticket.userName || "User"}
                      </p>
                      <span className="text-xs text-gray-400 capitalize">
                        {ticket.userRole}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {ticket.description || "No messages"}
                    </p>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <p className="text-xs text-gray-400">
                      {format(new Date(ticket.updatedAt), "MMM d, h:mm a")}
                    </p>
                    {statusBadge(ticket.status)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
