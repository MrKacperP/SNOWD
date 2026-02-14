"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Chat, UserProfile } from "@/lib/types";
import { MessageSquare, Pin, Trash2, MailOpen, Mail, MoreVertical, X, MapPin, DollarSign, ArrowLeft, Search, Archive, CheckSquare, Square } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";

export default function MessagesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [chats, setChats] = useState<(Chat & { otherUser?: UserProfile; pinned?: boolean; jobData?: { status?: string; price?: number; serviceTypes?: string[]; address?: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ chatId: string; x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());

  // Close context menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!user?.uid) return;

    // Use real-time listener for chats
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const chatList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Chat & { pinned?: boolean }));

        // Sort: pinned first, then by lastMessageTime descending (new messages always on top)
        chatList.sort((a, b) => {
          // Pinned chats always on top
          const aPinned = (a as unknown as Record<string, unknown>)?.pinned ? 1 : 0;
          const bPinned = (b as unknown as Record<string, unknown>)?.pinned ? 1 : 0;
          if (aPinned !== bPinned) return bPinned - aPinned;

          const aTime = a.lastMessageTime;
          const bTime = b.lastMessageTime;
          if (!aTime) return 1;
          if (!bTime) return -1;
          const aDate =
            aTime instanceof Date
              ? aTime
              : typeof aTime === "object" && "toDate" in aTime
              ? (aTime as unknown as Timestamp).toDate()
              : new Date(aTime as unknown as string);
          const bDate =
            bTime instanceof Date
              ? bTime
              : typeof bTime === "object" && "toDate" in bTime
              ? (bTime as unknown as Timestamp).toDate()
              : new Date(bTime as unknown as string);
          return bDate.getTime() - aDate.getTime();
        });

        // Fetch other user details
        const enrichedChats = await Promise.all(
          chatList.map(async (chat) => {
            const otherUid = chat.participants.find((p) => p !== user.uid);
            let otherUserData = null;
            let jobData = null;
            
            if (otherUid) {
              try {
                const userDoc = await getDoc(doc(db, "users", otherUid));
                if (userDoc.exists()) {
                  otherUserData = userDoc.data() as UserProfile;
                }
              } catch {
                // Ignore user fetch errors
              }
            }
            
            // Fetch job details if jobId exists
            if (chat.jobId) {
              try {
                const jobDoc = await getDoc(doc(db, "jobs", chat.jobId));
                if (jobDoc.exists()) {
                  const job = jobDoc.data();
                  jobData = {
                    status: job.status,
                    price: job.price,
                    serviceTypes: job.serviceTypes,
                    address: job.address,
                  };
                }
              } catch {
                // Ignore job fetch errors
              }
            }
            
            return { ...chat, otherUser: otherUserData ?? undefined, jobData: jobData ?? undefined };
          })
        );
        setChats(enrichedChats);
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to chats:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Pin/unpin a chat
  const togglePin = async (chatId: string) => {
    const chat = chats.find((c) => c.id === chatId);
    if (!chat) return;
    const isPinned = (chat as unknown as Record<string, unknown>)?.pinned;
    try {
      await updateDoc(doc(db, "chats", chatId), { pinned: !isPinned });
    } catch (error) {
      console.error("Error toggling pin:", error);
    }
    setContextMenu(null);
  };

  // Mark as unread
  const markAsUnread = async (chatId: string) => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, "chats", chatId), {
        [`unreadCount.${user.uid}`]: 1,
      });
    } catch (error) {
      console.error("Error marking as unread:", error);
    }
    setContextMenu(null);
  };

  // Delete chat
  const deleteChat = async (chatId: string) => {
    if (!confirm("Delete this conversation? This cannot be undone.")) return;
    try {
      // Delete all messages
      const msgsQuery = query(collection(db, "messages"), where("chatId", "==", chatId));
      const msgsSnap = await getDocs(msgsQuery);
      await Promise.all(msgsSnap.docs.map((d) => deleteDoc(doc(db, "messages", d.id))));
      // Delete chat
      await deleteDoc(doc(db, "chats", chatId));
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
    setContextMenu(null);
  };

  // Archive/unarchive chat
  const toggleArchive = async (chatId: string) => {
    const chat = chats.find((c) => c.id === chatId);
    if (!chat) return;
    const isArchived = (chat as unknown as Record<string, unknown>)?.archived;
    try {
      await updateDoc(doc(db, "chats", chatId), { archived: !isArchived });
    } catch (error) {
      console.error("Error toggling archive:", error);
    }
    setContextMenu(null);
  };

  // Mark as read (clear notification)
  const markAsRead = async (chatId: string) => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, "chats", chatId), {
        [`unreadCount.${user.uid}`]: 0,
      });
    } catch (error) {
      console.error("Error marking as read:", error);
    }
    setContextMenu(null);
  };

  // Bulk mark all selected as read
  const bulkMarkAsRead = async () => {
    if (!user?.uid || selectedChats.size === 0) return;
    try {
      await Promise.all(
        Array.from(selectedChats).map((chatId) =>
          updateDoc(doc(db, "chats", chatId), { [`unreadCount.${user.uid}`]: 0 })
        )
      );
      setSelectedChats(new Set());
      setSelectMode(false);
    } catch (error) {
      console.error("Error bulk marking as read:", error);
    }
  };

  // Bulk delete selected
  const bulkDelete = async () => {
    if (selectedChats.size === 0) return;
    if (!confirm(`Delete ${selectedChats.size} conversation(s)? This cannot be undone.`)) return;
    try {
      await Promise.all(
        Array.from(selectedChats).map(async (chatId) => {
          const msgsQuery = query(collection(db, "messages"), where("chatId", "==", chatId));
          const msgsSnap = await getDocs(msgsQuery);
          await Promise.all(msgsSnap.docs.map((d) => deleteDoc(doc(db, "messages", d.id))));
          await deleteDoc(doc(db, "chats", chatId));
        })
      );
      setSelectedChats(new Set());
      setSelectMode(false);
    } catch (error) {
      console.error("Error bulk deleting:", error);
    }
  };

  // Toggle chat selection
  const toggleSelect = (chatId: string) => {
    setSelectedChats((prev) => {
      const next = new Set(prev);
      if (next.has(chatId)) next.delete(chatId);
      else next.add(chatId);
      return next;
    });
  };

  // Select all visible
  const selectAll = () => {
    const visible = chats.filter((chat) => {
      const isArchived = Boolean((chat as unknown as Record<string, unknown>)?.archived);
      return showArchived === isArchived;
    });
    setSelectedChats(new Set(visible.map((c) => c.id)));
  };

  const formatTime = (ts: unknown): string => {
    if (!ts) return "";
    try {
      if (ts instanceof Date) return format(ts, "MMM d");
      if (typeof ts === "object" && ts !== null && "toDate" in ts)
        return format((ts as unknown as Timestamp).toDate(), "MMM d");
      if (typeof ts === "object" && ts !== null && "seconds" in ts)
        return format(new Date((ts as { seconds: number }).seconds * 1000), "MMM d");
      if (typeof ts === "string") return format(new Date(ts), "MMM d");
    } catch {
      return "";
    }
    return "";
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Messages</h1>
        <div className="flex flex-col items-center py-12 text-gray-400 gap-3">
          <div className="animate-spin-slow">
            <Image src="/logo.svg" alt="Loading" width={32} height={32} />
          </div>
          <p>Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => router.push("/dashboard")}
        className="flex items-center gap-2 text-[#6B7C8F] hover:text-[#0B1F33] mb-4 text-sm font-medium transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>
      
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <MessageSquare className="w-6 h-6 text-[#4361EE]" />
        Messages
      </h1>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4361EE]/20 focus:border-[#4361EE]"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => { setSelectMode(!selectMode); setSelectedChats(new Set()); }}
          className={`p-2.5 rounded-xl border transition ${selectMode ? "bg-[#4361EE] text-white border-[#4361EE]" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}
          title={selectMode ? "Cancel selection" : "Select messages"}
        >
          {selectMode ? <X className="w-4 h-4" /> : <MailOpen className="w-4 h-4" />}
        </button>
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`p-2.5 rounded-xl border transition ${showArchived ? "bg-[#4361EE] text-white border-[#4361EE]" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}
          title={showArchived ? "Show active chats" : "Show archived chats"}
        >
          <Archive className="w-4 h-4" />
        </button>
      </div>

      {/* Bulk Actions Bar */}
      {selectMode && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-[#4361EE]/5 rounded-xl border border-[#4361EE]/20">
          <button
            onClick={selectAll}
            className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            Select All
          </button>
          <span className="text-xs text-gray-500 flex-1">
            {selectedChats.size} selected
          </span>
          <button
            onClick={bulkMarkAsRead}
            disabled={selectedChats.size === 0}
            className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-40 flex items-center gap-1"
          >
            <MailOpen className="w-3 h-3" /> Mark Read
          </button>
          <button
            onClick={bulkDelete}
            disabled={selectedChats.size === 0}
            className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition disabled:opacity-40 flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      )}

      {chats.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Image
            src="/logo.svg"
            alt="snowd.ca"
            width={48}
            height={48}
            className="mx-auto mb-4 opacity-30"
          />
          <h3 className="text-lg font-medium text-gray-600">No messages yet</h3>
          <p className="text-gray-400 mt-1">
            Start a conversation by booking a snow removal service.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50 relative">
          {chats
            .filter((chat) => {
              // Filter by archive status
              const isArchived = Boolean((chat as unknown as Record<string, unknown>)?.archived);
              if (showArchived !== isArchived) return false;
              // Filter by search term
              if (searchTerm) {
                const term = searchTerm.toLowerCase();
                return chat.otherUser?.displayName?.toLowerCase().includes(term);
              }
              return true;
            })
            .map((chat) => {
            const unread = chat.unreadCount?.[user?.uid || ""] || 0;
            const isPinned = Boolean((chat as unknown as Record<string, unknown>)?.pinned);
            return (
              <div key={chat.id} className="relative group">
                {/* Selection checkbox */}
                {selectMode && (
                  <button
                    onClick={() => toggleSelect(chat.id)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-5 h-5 rounded border-2 flex items-center justify-center transition"
                    style={{
                      borderColor: selectedChats.has(chat.id) ? "#4361EE" : "#D1D5DB",
                      backgroundColor: selectedChats.has(chat.id) ? "#4361EE" : "transparent",
                    }}
                  >
                    {selectedChats.has(chat.id) && (
                      <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    )}
                  </button>
                )}
                <Link
                  href={selectMode ? "#" : `/dashboard/messages/${chat.id}`}
                  onClick={(e) => {
                    if (selectMode) {
                      e.preventDefault();
                      toggleSelect(chat.id);
                    }
                  }}
                  className={`flex items-center gap-4 py-4 hover:bg-[#F7FAFC] transition ${isPinned ? "bg-[#4361EE]/10/50" : ""} ${selectMode ? "pl-10 pr-5" : "px-5"}`}
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-[#4361EE]/15 rounded-full flex items-center justify-center text-[#4361EE] font-semibold shrink-0 relative">
                    {chat.otherUser?.displayName?.charAt(0)?.toUpperCase() || "?"}
                    {isPinned && (
                      <Pin className="w-3 h-3 text-[#4361EE] absolute -top-1 -right-1 fill-[#4361EE]" />
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`font-semibold truncate ${unread > 0 ? "text-[#0B1F33]" : "text-gray-900"}`}>
                        {chat.otherUser?.displayName || "User"}
                      </p>
                      {chat.lastMessageTime && (
                        <span className="text-xs text-gray-400 shrink-0 ml-2">
                          {formatTime(chat.lastMessageTime)}
                        </span>
                      )}
                    </div>
                    
                    {/* Job details preview */}
                    {chat.jobData && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {chat.jobData.serviceTypes && chat.jobData.serviceTypes.length > 0 && chat.jobData.serviceTypes.map(s => (
                          <span key={s} className="px-2 py-0.5 bg-[#4361EE]/10 text-[#4361EE] rounded-full text-[10px] font-semibold capitalize">
                            {s.replace("-", " ")}
                          </span>
                        ))}
                        {chat.jobData.price && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold">
                            <DollarSign className="w-2.5 h-2.5" />
                            {chat.jobData.price} CAD
                          </span>
                        )}
                        {chat.jobData.status && (
                          <span className={`capitalize px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            chat.jobData.status === "completed" ? "bg-green-100 text-green-700" :
                            chat.jobData.status === "in-progress" ? "bg-[#4361EE]/15 text-[#4361EE]" :
                            chat.jobData.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                            chat.jobData.status === "cancelled" ? "bg-red-100 text-red-700" :
                            "bg-gray-100 text-gray-700"
                          }`}>
                            {chat.jobData.status.replace("-", " ")}
                          </span>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-0.5">
                      <p className={`text-sm truncate ${unread > 0 ? "text-[#0B1F33] font-medium" : "text-gray-500"}`}>
                        {chat.lastMessage || "No messages yet"}
                      </p>
                      {unread > 0 && (
                        <span className="bg-[#4361EE] text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 ml-2">
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>

                {/* Context menu trigger */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const rect = (e.target as HTMLElement).getBoundingClientRect();
                    setContextMenu({ chatId: chat.id, x: rect.left, y: rect.bottom });
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition opacity-0 group-hover:opacity-100"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            );
          })}

          {/* Context Menu */}
          {contextMenu && (
            <div
              ref={menuRef}
              className="fixed bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-50 min-w-[180px]"
              style={{ top: contextMenu.y + 4, left: Math.min(contextMenu.x, window.innerWidth - 200) }}
            >
              <button
                onClick={() => togglePin(contextMenu.chatId)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
              >
                <Pin className="w-4 h-4" />
                {chats.find((c) => c.id === contextMenu.chatId && (c as unknown as Record<string, unknown>)?.pinned)
                  ? "Unpin Chat"
                  : "Pin Chat"}
              </button>
              <button
                onClick={() => markAsRead(contextMenu.chatId)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
              >
                <Mail className="w-4 h-4" />
                Mark as Read
              </button>
              <button
                onClick={() => markAsUnread(contextMenu.chatId)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
              >
                <MailOpen className="w-4 h-4" />
                Mark as Unread
              </button>
              <button
                onClick={() => toggleArchive(contextMenu.chatId)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
              >
                <Archive className="w-4 h-4" />
                {(chats.find((c) => c.id === contextMenu.chatId) as unknown as Record<string, unknown>)?.archived
                  ? "Unarchive Chat"
                  : "Archive Chat"}
              </button>
              <hr className="my-1 border-gray-100" />
              <button
                onClick={() => deleteChat(contextMenu.chatId)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
              >
                <Trash2 className="w-4 h-4" />
                Delete Chat
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
