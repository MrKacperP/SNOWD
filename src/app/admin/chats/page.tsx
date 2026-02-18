"use client";

import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc, query, where, orderBy, onSnapshot, updateDoc, Timestamp, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Chat, ChatMessage, UserProfile, SupportTicket } from "@/lib/types";
import { MessageSquare, Search, Eye, ArrowLeft, Send, Headphones, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

export default function AdminChatsPage() {
  const [chats, setChats] = useState<(Chat & { users: Record<string, UserProfile> })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [viewingAs, setViewingAs] = useState<string>(""); // uid of user we're viewing as
  const [activeTab, setActiveTab] = useState<"chats" | "support">("chats");

  // Support ticket state
  const [supportTickets, setSupportTickets] = useState<(SupportTicket & { userName?: string; userEmail?: string })[]>([]);
  const [supportLoading, setSupportLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [adminReply, setAdminReply] = useState("");
  const [replying, setReplying] = useState(false);

  // Fetch regular chats
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const snap = await getDocs(collection(db, "chats"));
        const chatList = snap.docs.map(d => ({ id: d.id, ...d.data() } as Chat));
        
        const allUids = [...new Set(chatList.flatMap(c => c.participants))];
        const userMap: Record<string, UserProfile> = {};
        await Promise.all(allUids.map(async uid => {
          try {
            const userDoc = await getDoc(doc(db, "users", uid));
            if (userDoc.exists()) userMap[uid] = userDoc.data() as UserProfile;
          } catch {}
        }));

        const enriched = chatList.map(chat => ({
          ...chat,
          users: Object.fromEntries(chat.participants.map(p => [p, userMap[p]]).filter(([, v]) => v)),
        }));

        enriched.sort((a, b) => {
          const aTime = a.lastMessageTime;
          const bTime = b.lastMessageTime;
          if (!aTime) return 1;
          if (!bTime) return -1;
          const toMs = (t: unknown) => {
            if (typeof t === "object" && t !== null && "seconds" in t) return (t as { seconds: number }).seconds * 1000;
            return 0;
          };
          return toMs(bTime) - toMs(aTime);
        });

        setChats(enriched);
      } catch (error) {
        console.error("Error fetching chats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchChats();
  }, []);

  // Fetch support chats
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "supportChats"), async (snap) => {
      try {
        const tickets = snap.docs.map(d => {
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
          } as SupportTicket & { userName?: string; userEmail?: string };
        });
        // Sort by most recent
        tickets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setSupportTickets(tickets);
      } catch (error) {
        console.error("Error fetching support chats:", error);
      } finally {
        setSupportLoading(false);
      }
    }, () => {
      setSupportLoading(false);
    });
    return () => unsub();
  }, []);

  // Load messages for selected regular chat
  useEffect(() => {
    if (!selectedChat) return;
    const q = query(collection(db, "messages"), where("chatId", "==", selectedChat), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
    }, () => {
      const fallbackQ = query(collection(db, "messages"), where("chatId", "==", selectedChat));
      onSnapshot(fallbackQ, snap => {
        const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage));
        msgs.sort((a, b) => {
          const toMs = (t: unknown) => {
            if (typeof t === "object" && t !== null && "seconds" in t) return (t as { seconds: number }).seconds * 1000;
            return 0;
          };
          return toMs(a.createdAt) - toMs(b.createdAt);
        });
        setMessages(msgs);
      });
    });
    return () => unsub();
  }, [selectedChat]);

  // Load messages for selected support ticket
  const [supportMessages, setSupportMessages] = useState<{ id: string; senderId: string; senderName: string; content: string; createdAt: Date; read: boolean }[]>([]);
  useEffect(() => {
    if (!selectedTicket) { setSupportMessages([]); return; }
    const q = query(
      collection(db, "supportChats", selectedTicket.id, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setSupportMessages(snap.docs.map(d => {
        const data = d.data();
        return { id: d.id, ...data, createdAt: data.createdAt?.toDate?.() || new Date() } as { id: string; senderId: string; senderName: string; content: string; createdAt: Date; read: boolean };
      }));
    }, () => {
      // Fallback: collection may not exist yet
      setSupportMessages([]);
    });
    return () => unsub();
  }, [selectedTicket]);

  // Admin reply to support chat
  const handleAdminReply = async () => {
    if (!adminReply.trim() || !selectedTicket || replying) return;
    setReplying(true);
    const content = adminReply.trim();
    setAdminReply("");
    try {
      await addDoc(collection(db, "supportChats", selectedTicket.id, "messages"), {
        senderId: "SNOWD_ADMIN",
        senderName: "SNOWD Support",
        content,
        createdAt: new Date(),
        read: false,
      });
      // Update the parent doc
      await updateDoc(doc(db, "supportChats", selectedTicket.id), {
        lastMessage: content,
        lastMessageTime: new Date(),
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error("Error sending admin reply:", error);
    } finally {
      setReplying(false);
    }
  };

  const formatTime = (ts: unknown) => {
    try {
      if (typeof ts === "object" && ts !== null && "seconds" in ts)
        return format(new Date((ts as { seconds: number }).seconds * 1000), "MMM d, h:mm a");
    } catch {}
    return "";
  };

  const filteredChats = chats.filter(chat => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return Object.values(chat.users).some(u => u.displayName?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term));
  });

  const currentChat = chats.find(c => c.id === selectedChat);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <MessageSquare className="w-6 h-6 text-[#4361EE]" />
        <h1 className="text-2xl font-bold">All Chats</h1>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
        <button
          onClick={() => { setActiveTab("chats"); setSelectedTicket(null); }}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
            activeTab === "chats" ? "bg-white text-[#4361EE] shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Regular Chats
          {chats.length > 0 && <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">{chats.length}</span>}
        </button>
        <button
          onClick={() => { setActiveTab("support"); setSelectedChat(null); }}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
            activeTab === "support" ? "bg-white text-[#4361EE] shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Headphones className="w-4 h-4" />
          Support Chats
          {supportTickets.length > 0 && (
            <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">{supportTickets.length}</span>
          )}
        </button>
      </div>

      {/* REGULAR CHATS TAB */}
      {activeTab === "chats" && (
        <>
          {selectedChat && currentChat ? (
            <div className="space-y-4">
              <button onClick={() => setSelectedChat(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition">
                <ArrowLeft className="w-4 h-4" /> Back to all chats
              </button>

              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-xs text-gray-500 mb-2 font-medium">VIEW AS:</p>
                <div className="flex gap-2">
                  {Object.values(currentChat.users).map(u => (
                    <button
                      key={u.uid}
                      onClick={() => setViewingAs(u.uid)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        viewingAs === u.uid ? "bg-[#4361EE] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {u.displayName} ({u.role})
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-4 max-h-[60vh] overflow-y-auto space-y-3">
                {messages.map(msg => {
                  const isOwn = msg.senderId === viewingAs;
                  const isSystem = ["system", "status-update", "eta-update", "payment"].includes(msg.type);
                  
                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center">
                        <div className="bg-gray-100 px-4 py-2 rounded-full text-xs text-gray-600">
                          {msg.content}
                          <span className="ml-2 text-gray-400">{formatTime(msg.createdAt)}</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${
                        isOwn ? "bg-[#4361EE] text-white rounded-br-md" : "bg-gray-100 text-gray-900 rounded-bl-md"
                      }`}>
                        <p className={`text-xs font-medium mb-0.5 ${isOwn ? "text-white/70" : "text-[#4361EE]"}`}>{msg.senderName}</p>
                        {msg.type === "image" && msg.metadata?.imageUrl ? (
                          <img src={msg.metadata.imageUrl} alt="Photo" className="max-h-40 rounded-lg" />
                        ) : (
                          <p className="text-sm">{msg.content}</p>
                        )}
                        <p className={`text-xs mt-1 ${isOwn ? "text-white/50" : "text-gray-400"}`}>{formatTime(msg.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search chats by user name..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4361EE]/20"
                />
              </div>

              {loading ? (
                <div className="text-center py-12 text-gray-400">Loading chats...</div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                  {filteredChats.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">No chats found</div>
                  ) : filteredChats.map(chat => (
                    <button
                      key={chat.id}
                      onClick={() => { setSelectedChat(chat.id); setViewingAs(chat.participants[0] || ""); }}
                      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition text-left"
                    >
                      <div className="w-10 h-10 bg-[#4361EE]/10 rounded-full flex items-center justify-center text-[#4361EE] font-bold shrink-0">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {Object.values(chat.users).map(u => u.displayName).join(" ↔ ")}
                        </p>
                        <p className="text-sm text-gray-500 truncate">{chat.lastMessage || "No messages"}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-400">{formatTime(chat.lastMessageTime)}</p>
                        <Eye className="w-4 h-4 text-gray-400 mt-1" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* SUPPORT CHATS TAB */}
      {activeTab === "support" && (
        <>
          {selectedTicket ? (
            <div className="space-y-4">
              <button onClick={() => { setSelectedTicket(null); setAdminReply(""); }} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition">
                <ArrowLeft className="w-4 h-4" /> Back to support chats
              </button>

              {/* Ticket header */}
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {(selectedTicket as SupportTicket & { userName?: string }).userName || "Unknown User"}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {selectedTicket.userRole} &middot; {selectedTicket.userId.replace("support_", "")}
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    selectedTicket.status === "open" ? "bg-green-100 text-green-700" :
                    selectedTicket.status === "in-progress" ? "bg-amber-100 text-amber-700" :
                    selectedTicket.status === "resolved" ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {selectedTicket.status}
                  </span>
                </div>
              </div>

              {/* Support messages */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4 max-h-[50vh] overflow-y-auto space-y-3">
                {supportMessages.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">No messages yet</div>
                ) : supportMessages.map(msg => {
                  const isAdmin = msg.senderId === "SNOWD_ADMIN";
                  return (
                    <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                        isAdmin ? "bg-[#4361EE] text-white rounded-br-md" : "bg-gray-100 text-gray-900 rounded-bl-md"
                      }`}>
                        <p className={`text-xs font-medium mb-0.5 ${isAdmin ? "text-white/70" : "text-[#4361EE]"}`}>
                          {msg.senderName}
                        </p>
                        <p className="text-sm">{msg.content}</p>
                        <p className={`text-xs mt-1 ${isAdmin ? "text-white/50" : "text-gray-400"}`}>
                          {format(msg.createdAt, "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Admin reply box */}
              <div className="bg-white rounded-2xl border border-gray-100 p-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={adminReply}
                    onChange={e => setAdminReply(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleAdminReply()}
                    placeholder="Type a reply as SNOWD Support..."
                    className="flex-1 px-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4361EE]/20"
                  />
                  <button
                    onClick={handleAdminReply}
                    disabled={!adminReply.trim() || replying}
                    className="w-10 h-10 bg-[#4361EE] hover:bg-[#3249D6] disabled:opacity-50 text-white rounded-xl flex items-center justify-center transition"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {supportLoading ? (
                <div className="text-center py-12 text-gray-400">Loading support chats...</div>
              ) : supportTickets.length === 0 ? (
                <div className="text-center py-16">
                  <Headphones className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No support conversations yet</p>
                  <p className="text-gray-300 text-xs mt-1">Users can reach support via the chat button in their dashboard</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                  {supportTickets.map(ticket => {
                    const statusIcon = ticket.status === "open" ? <Clock className="w-4 h-4 text-green-500" /> :
                      ticket.status === "in-progress" ? <AlertTriangle className="w-4 h-4 text-amber-500" /> :
                      <CheckCircle className="w-4 h-4 text-blue-500" />;
                    return (
                      <button
                        key={ticket.id}
                        onClick={() => setSelectedTicket(ticket)}
                        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition text-left"
                      >
                        <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center shrink-0">
                          <Headphones className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900 truncate">{ticket.userName || "User"}</p>
                            <span className="text-xs text-gray-400 capitalize">{ticket.userRole}</span>
                          </div>
                          <p className="text-sm text-gray-500 truncate">{ticket.description || "No messages"}</p>
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end gap-1">
                          <p className="text-xs text-gray-400">{format(ticket.updatedAt, "MMM d, h:mm a")}</p>
                          {statusIcon}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
