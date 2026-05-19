"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Search } from "lucide-react";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { format } from "date-fns";
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

const getChatTime = (ts: unknown): number => {
  if (!ts) return 0;

  try {
    if (ts instanceof Date) return ts.getTime();
    if (typeof ts === "object" && ts !== null && "toDate" in ts) {
      return (ts as Timestamp).toDate().getTime();
    }
    if (typeof ts === "string") return new Date(ts).getTime();
  } catch {
    return 0;
  }

  return 0;
};

export default function MessagesPage() {
  const { user } = useAuth();
  const [chatList, setChatList] = useState<ChatWithOtherUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      return;
    }

    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const list = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }) as ChatWithOtherUser)
          .sort((a, b) => getChatTime(b.lastMessageTime) - getChatTime(a.lastMessageTime));

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
              // Keep the thread visible even if a profile lookup fails.
            }

            return chat;
          })
        );

        setChatList(enriched);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const filteredChatList = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return chatList;

    return chatList.filter((chat) => {
      const name = chat.otherUser?.displayName?.toLowerCase() || "";
      const preview = chat.lastMessage?.toLowerCase() || "";
      return name.includes(term) || preview.includes(term);
    });
  }, [chatList, searchTerm]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-5 md:px-0">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-color)] bg-white text-[var(--text-primary)] transition hover:bg-[var(--bg-secondary)]"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Inbox</p>
          <h1 className="text-2xl font-headline font-bold text-[var(--text-primary)]">Conversations</h1>
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.8rem] border border-[var(--border-color)] bg-white shadow-[0_20px_40px_rgba(15,23,42,0.08)]">
        <div className="border-b border-[var(--border-soft)] bg-[#111111] px-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search people or job threads"
              className="w-full rounded-xl border border-white/10 bg-white/8 py-3 pl-9 pr-3 text-sm text-white placeholder:text-white/35 focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">
            Loading conversations...
          </div>
        ) : filteredChatList.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-secondary)] text-[var(--text-primary)]">
              <MessageSquare className="h-6 w-6" />
            </div>
            <p className="text-xl font-headline font-bold text-[var(--text-primary)]">
              No conversations yet
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Request a snow job and your operator thread will appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[#EDF2F7]">
            {filteredChatList.map((chat) => {
              const unread = chat.unreadCount?.[user?.uid || ""] || 0;
              const title = chat.otherUser?.displayName || "User";

              return (
                <li key={chat.id}>
                  <Link href={`/dashboard/messages/${chat.id}`} className="block px-4 py-4 transition hover:bg-[#f7f7f4]">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] font-semibold text-[var(--text-primary)]">
                        {title.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-base font-semibold text-[var(--text-primary)]">
                            {title}
                          </p>
                          <p className="shrink-0 text-xs text-[var(--text-muted)]">
                            {formatChatTime(chat.lastMessageTime)}
                          </p>
                        </div>

                        <div className="mt-1 flex items-center justify-between gap-3">
                          <p className={`truncate text-sm ${unread > 0 ? "font-medium text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>
                            {chat.lastMessage || "No messages yet"}
                          </p>
                          {unread > 0 && (
                            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#111111] px-2 text-xs font-semibold text-white">
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
      </div>
    </div>
  );
}
