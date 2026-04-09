"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageSquare } from "lucide-react";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";

export default function MessagesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasChats, setHasChats] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const openFirstConversation = async () => {
      try {
        const q = query(
          collection(db, "chats"),
          where("participants", "array-contains", user.uid)
        );
        const snap = await getDocs(q);
        const chats = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        chats.sort((a, b) => {
          const aTime = (a as { lastMessageTime?: { toDate?: () => Date } }).lastMessageTime?.toDate?.()?.getTime?.() || 0;
          const bTime = (b as { lastMessageTime?: { toDate?: () => Date } }).lastMessageTime?.toDate?.()?.getTime?.() || 0;
          return bTime - aTime;
        });

        if (chats.length > 0) {
          router.replace(`/dashboard/messages/${chats[0].id}`);
          return;
        }

        setHasChats(false);
      } catch {
        setHasChats(false);
      } finally {
        setLoading(false);
      }
    };

    openFirstConversation();
  }, [user?.uid]);

  return (
    <div className="max-w-2xl mx-auto py-16 px-4">
      <div className="bg-white rounded-2xl border border-[var(--border-soft)] p-8 text-center shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
        {loading ? (
          <>
            <MessageSquare className="w-8 h-8 text-[#3B82F6] mx-auto mb-3 animate-pulse" />
            <p className="text-sm text-slate-500">Opening your latest conversation...</p>
          </>
        ) : hasChats ? (
          <p className="text-sm text-slate-500">Redirecting...</p>
        ) : (
          <>
            <MessageSquare className="w-8 h-8 text-[#3B82F6] mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-900">No conversations yet</p>
            <p className="text-sm text-slate-500 mt-1">Start by requesting a service or messaging an operator.</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border-soft)] text-sm text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}
