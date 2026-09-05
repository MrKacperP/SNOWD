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
import UserAvatar from "@/components/UserAvatar";

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
  const { user, profile } = useAuth();
  const [chatList, setChatList] = useState<ChatWithOtherUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      return;
    }

    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid)
    );

    let active = true;
    let revision = 0;
    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const currentRevision = ++revision;
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

        if (!active || currentRevision !== revision) return;
        setLoadError(false);
        setChatList(enriched);
        setLoading(false);
      },
      () => { if (active) { setLoadError(true); setLoading(false); } }
    );

    return () => { active = false; unsubscribe(); };
  }, [user?.uid, retry]);

  const filteredChatList = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return chatList;

    return chatList.filter((chat) => {
      const name = chat.otherUser?.displayName?.toLowerCase() || "";
      const preview = chat.lastMessage?.toLowerCase() || "";
      return name.includes(term) || preview.includes(term);
    });
  }, [chatList, searchTerm]);

  const totalUnread = chatList.reduce(
    (total, chat) => total + (chat.unreadCount?.[user?.uid || ""] || 0),
    0
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-5 md:px-0">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex h-10 w-10 items-center justify-center rounded-xl border-[3px] border-[var(--border-color)] bg-white text-[var(--text-primary)] transition hover:bg-[var(--bg-secondary)]"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Inbox</p>
          <h1 className="font-headline text-2xl font-bold text-[var(--text-primary)]">Messages</h1>
        </div>
        </div>
        <div className="rounded-full border-[3px] border-[var(--border-color)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]">
          {chatList.length} conversation{chatList.length === 1 ? "" : "s"}
          {totalUnread > 0 && <span className="ml-2 text-[var(--text-primary)]">{totalUnread} unread</span>}
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.4rem] border-[3px] border-[var(--border-color)] bg-white shadow-[var(--surface-shadow)]">
        <div className="border-b border-[var(--border-soft)] bg-white px-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="search"
              aria-label="Search conversations"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by person or message"
              className="w-full rounded-xl border-[3px] border-[var(--border-color)] bg-[#fbfbf8] py-3 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition focus:border-[var(--text-primary)] focus:bg-white"
            />
          </div>
        </div>

        {loadError ? (
          <div role="alert" className="p-8 text-center">
            <h2 className="text-lg font-bold">Could not load conversations</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">Check your connection and try again.</p>
            <button type="button" onClick={() => { setLoadError(false); setLoading(true); setRetry(value => value + 1); }} className="mt-4 rounded-xl bg-[var(--ink)] px-4 py-3 font-semibold text-white">Try again</button>
          </div>
        ) : loading ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">
            Loading conversations...
          </div>
        ) : filteredChatList.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-secondary)] text-[var(--text-primary)]">
              <MessageSquare className="h-6 w-6" />
            </div>
            <p className="text-xl font-headline font-bold text-[var(--text-primary)]">
              {searchTerm.trim() ? "No matching conversations" : "No conversations yet"}
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {searchTerm.trim() ? "Try a different name or message, or clear your search." : profile?.role === "operator" ? "Your customer conversations will appear here when you receive a job request." : "Book snow help to start a conversation with an operator."}
            </p>
            {searchTerm.trim() ? (
              <button type="button" onClick={() => setSearchTerm("")} className="mt-4 rounded-xl border-[3px] border-[var(--border-color)] px-4 py-3 font-semibold">Clear search</button>
            ) : (
              <Link href={profile?.role === "operator" ? "/dashboard/jobs" : "/dashboard/find"} className="mt-4 inline-flex rounded-xl bg-[var(--ink)] px-4 py-3 font-semibold text-white">{profile?.role === "operator" ? "View jobs" : "Book help"}</Link>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border-soft)]">
            {filteredChatList.map((chat) => {
              const unread = chat.unreadCount?.[user?.uid || ""] || 0;
              const title = chat.otherUser?.displayName || "User";

              return (
                <li key={chat.id}>
                  <Link href={`/dashboard/messages/${chat.id}`} className="block px-4 py-4 transition hover:bg-[#f7f7f4] focus:bg-[#f7f7f4] focus:outline-none">
                    <div className="flex items-start gap-3">
                      <UserAvatar
                        photoURL={(chat.otherUser as unknown as Record<string, string> | undefined)?.avatar}
                        role={chat.otherUser?.role}
                        displayName={title}
                        size={48}
                        rounded="2xl"
                        className="border-[3px] border-[var(--border-color)] bg-[var(--bg-secondary)]"
                      />

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
                          <p className={`truncate text-sm leading-6 ${unread > 0 ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>
                            {chat.lastMessage || "No messages yet"}
                          </p>
                          {unread > 0 && (
                            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--ink)] px-2 text-xs font-semibold text-white">
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
