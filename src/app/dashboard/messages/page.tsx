"use client";

import UserAvatar from "@/components/UserAvatar";
import { useAuth } from "@/context/AuthContext";
import { useUserChats } from "@/hooks/useUserChats";
import { db } from "@/lib/firebase";
import { Chat,UserProfile } from "@/lib/types";
import { format } from "date-fns";
import { doc,getDoc,Timestamp } from "firebase/firestore";
import { ArrowLeft,MessageSquare,Search } from "lucide-react";
import Link from "next/link";
import { useEffect,useMemo,useState } from "react";

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
  const [retry, setRetry] = useState(0);
  const { chats, loading, error: loadError } = useUserChats(user?.uid, profile?.role, retry);

  useEffect(() => {
    let active = true;
    const list = [...chats].sort((a, b) => getChatTime(b.lastMessageTime) - getChatTime(a.lastMessageTime));
    // Render threads immediately; profile lookups enrich their names independently.
    const enrich = async () => {
      const enriched = await Promise.all(list.map(async chat => {
        const otherUid = chat.participants.find(id => id !== user?.uid);
        if (!otherUid) return chat;
        try {
          const other = await getDoc(doc(db, "users", otherUid));
          return other.exists() ? { ...chat, otherUser: other.data() as UserProfile } : chat;
        } catch { return chat; }
      }));
      if (active) setChatList(enriched);
    };
    void enrich();
    return () => { active = false; };
  }, [chats, user?.uid]);

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
    <div className="mx-auto max-w-4xl py-2">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-color)] bg-white text-[var(--text-primary)] transition hover:bg-[var(--bg-secondary)]"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Inbox</p>
          <h1 className="font-headline text-2xl font-bold text-[var(--text-primary)]">Messages</h1>
        </div>
        </div>
        <div className="rounded-full border border-[var(--border-color)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]">
          {chatList.length} conversation{chatList.length === 1 ? "" : "s"}
          {totalUnread > 0 && <span className="ml-2 text-[var(--text-primary)]">{totalUnread} unread</span>}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-white shadow-[var(--surface-shadow)]">
        <div className="border-b border-[var(--border-soft)] bg-white px-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="search"
              aria-label="Search conversations"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by person or message"
              className="w-full rounded-xl border border-[var(--border-color)] bg-[#fbfbf8] py-3 pl-9 pr-3 text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition focus:border-[var(--text-primary)] focus:bg-white"
            />
          </div>
        </div>

        {loadError ? (
          <div role="alert" className="p-8 text-center">
            <h2 className="text-lg font-bold">Could not load conversations</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">Check your connection and try again.</p>
            <button type="button" onClick={() => { setRetry(value => value + 1); }} className="mt-4 rounded-xl bg-[var(--ink)] px-4 py-3 font-semibold text-white">Try again</button>
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
              <button type="button" onClick={() => setSearchTerm("")} className="mt-4 rounded-xl border border-[var(--border-color)] px-4 py-3 font-semibold">Clear search</button>
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
                  <Link
                    href={`/dashboard/messages/${chat.id}`}
                    aria-label={`${unread > 0 ? "Unread conversation with" : "Conversation with"} ${title}${unread > 0 ? `, ${unread} new message${unread === 1 ? "" : "s"}` : ""}`}
                    className={`block border-l-4 px-4 py-4 transition focus:outline-none ${unread > 0 ? "border-[var(--accent)] bg-[var(--accent-soft)] hover:bg-[#fff4d9] focus:bg-[#fff4d9]" : "border-transparent hover:bg-[#f7f7f4] focus:bg-[#f7f7f4]"}`}
                  >
                    <div className="flex items-start gap-3">
                      <UserAvatar
                        photoURL={(chat.otherUser as unknown as Record<string, string> | undefined)?.avatar}
                        role={chat.otherUser?.role}
                        displayName={title}
                        size={48}
                        rounded="2xl"
                        className={`border bg-[var(--bg-secondary)] ${unread > 0 ? "border-[var(--accent)] ring-2 ring-[var(--accent-soft)]" : "border-[var(--border-color)]"}`}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <p className={`truncate text-base text-[var(--text-primary)] ${unread > 0 ? "font-extrabold" : "font-semibold"}`}>{title}</p>
                            {unread > 0 && <span className="shrink-0 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--ink)]">Unread</span>}
                          </div>
                          <p className="shrink-0 text-xs text-[var(--text-muted)]">
                            {formatChatTime(chat.lastMessageTime)}
                          </p>
                        </div>

                        <div className="mt-1 flex items-center justify-between gap-3">
                          <p className={`truncate text-sm leading-6 ${unread > 0 ? "font-bold text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>
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
