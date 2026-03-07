"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Search } from "lucide-react";
import { format } from "date-fns";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { Chat, UserProfile } from "@/lib/types";

type ChatWithOtherUser = Chat & {
  otherUser?: UserProfile;
};

const formatChatTime = (ts: unknown): string => {
  if (!ts) return "";

  try {
    if (ts instanceof Date) return format(ts, "MMM d");
    if (typeof ts === "object" && ts !== null && "toDate" in ts) {
      return format((ts as Timestamp).toDate(), "MMM d");
    }
    if (typeof ts === "string") return format(new Date(ts), "MMM d");
  } catch {
    return "";
  }

  return "";
};

export default function MessagesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [chats, setChats] = useState<ChatWithOtherUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const list = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as ChatWithOtherUser
        );

        list.sort((a, b) => {
          const aTime = a.lastMessageTime;
          const bTime = b.lastMessageTime;
          if (!aTime) return 1;
          if (!bTime) return -1;

          const aDate =
            aTime instanceof Date
              ? aTime
              : typeof aTime === "object" && "toDate" in aTime
              ? (aTime as Timestamp).toDate()
              : new Date(aTime as string);

          const bDate =
            bTime instanceof Date
              ? bTime
              : typeof bTime === "object" && "toDate" in bTime
              ? (bTime as Timestamp).toDate()
              : new Date(bTime as string);

          return bDate.getTime() - aDate.getTime();
        });

        const enriched = await Promise.all(
          list.map(async (chat) => {
            const otherUid = chat.participants.find((p) => p !== user.uid);
            if (!otherUid) return chat;

            try {
              const otherUserDoc = await getDoc(doc(db, "users", otherUid));
              if (otherUserDoc.exists()) {
                return {
                  ...chat,
                  otherUser: otherUserDoc.data() as UserProfile,
                };
              }
            } catch {
              // Keep chat row even if profile fetch fails.
            }

            return chat;
          })
        );

        setChats(enriched);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const filteredChats = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return chats;

    return chats.filter((chat) => {
      const name = chat.otherUser?.displayName?.toLowerCase() || "";
      const preview = chat.lastMessage?.toLowerCase() || "";
      return name.includes(term) || preview.includes(term);
    });
  }, [chats, searchTerm]);

  const handleOpenChat = async (chatId: string, unread: number) => {
    if (!user?.uid || unread <= 0) return;
    try {
      await updateDoc(doc(db, "chats", chatId), {
        [`unreadCount.${user.uid}`]: 0,
      });
    } catch {
      // Non-blocking, chat still opens.
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <button
        onClick={() => router.push("/dashboard")}
        className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <header className="rounded-2xl border border-[var(--border-soft)] bg-[linear-gradient(135deg,#ffffff_0%,#f5f9ff_100%)] p-4 sm:p-5 space-y-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-[#3B82F6]" />
            Messages
          </h1>
          <span className="text-xs sm:text-sm px-2.5 py-1 rounded-full bg-white border border-[var(--border-soft)] text-slate-600 font-medium">
            {filteredChats.length} conversation{filteredChats.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search conversations"
            className="w-full bg-white border border-[var(--border-soft)] rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/25 focus:border-[#3B82F6]"
          />
        </div>
      </header>

      <section className="bg-white border border-[var(--border-soft)] rounded-2xl overflow-hidden shadow-[0_12px_26px_rgba(15,23,42,0.04)]">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Loading conversations...
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No conversations found.
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border-soft)]">
            {filteredChats.map((chat) => {
              const unread = chat.unreadCount?.[user?.uid || ""] || 0;
              const title = chat.otherUser?.displayName || "User";

              return (
                <li key={chat.id}>
                  <Link
                    href={`/dashboard/messages/${chat.id}`}
                    onClick={() => handleOpenChat(chat.id, unread)}
                    className="block px-4 py-3.5 hover:bg-[#F8FBFF] transition"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#EAF2FF] text-[#2F6FED] flex items-center justify-center font-semibold shrink-0 border border-[#D8E7FF]">
                        {title.charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {title}
                          </p>
                          <p className="text-xs text-slate-400 shrink-0 font-medium">
                            {formatChatTime(chat.lastMessageTime)}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p
                            className={`text-sm truncate ${
                              unread > 0
                                ? "text-slate-900 font-medium"
                                : "text-slate-500"
                            }`}
                          >
                            {chat.lastMessage || "No messages yet"}
                          </p>

                          {unread > 0 && (
                            <span className="h-5 min-w-5 px-1.5 rounded-full bg-[#3B82F6] text-white text-xs font-semibold flex items-center justify-center">
                              {unread > 9 ? "9+" : unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
