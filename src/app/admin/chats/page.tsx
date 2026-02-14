"use client";

import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Chat, ChatMessage, UserProfile } from "@/lib/types";
import { MessageSquare, Search, Eye, ArrowLeft, Send } from "lucide-react";
import { format } from "date-fns";

export default function AdminChatsPage() {
  const [chats, setChats] = useState<(Chat & { users: Record<string, UserProfile> })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [viewingAs, setViewingAs] = useState<string>(""); // uid of user we're viewing as

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const snap = await getDocs(collection(db, "chats"));
        const chatList = snap.docs.map(d => ({ id: d.id, ...d.data() } as Chat));
        
        // Fetch user details for all participants
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

  // Load messages for selected chat
  useEffect(() => {
    if (!selectedChat) return;
    const q = query(collection(db, "messages"), where("chatId", "==", selectedChat), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
    }, () => {
      // Fallback without orderBy
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

      {selectedChat && currentChat ? (
        <div className="space-y-4">
          <button onClick={() => setSelectedChat(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition">
            <ArrowLeft className="w-4 h-4" /> Back to all chats
          </button>

          {/* View As Switcher */}
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

          {/* Messages */}
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
              {filteredChats.map(chat => (
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
    </div>
  );
}
