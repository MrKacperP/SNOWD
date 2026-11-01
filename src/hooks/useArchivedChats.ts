"use client";
import { useCallback, useMemo, useState } from "react";
import { arrayRemove, arrayUnion, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

/** Per-user archive of chats, stored on the user's own profile so the other participant never sees it. */
export function useArchivedChats() {
  const { user, profile, refreshProfile } = useAuth();
  // Optimistic changes layered over the saved profile until it refreshes.
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const archived = useMemo(() => {
    const saved = new Set(profile?.archivedChats || []);
    for (const [chatId, archive] of Object.entries(pending)) {
      if (archive) saved.add(chatId); else saved.delete(chatId);
    }
    return [...saved];
  }, [pending, profile?.archivedChats]);
  const setChatArchived = useCallback(async (chatId: string, archive: boolean) => {
    if (!user) return;
    setPending((previous) => ({ ...previous, [chatId]: archive }));
    try {
      await updateDoc(doc(db, "users", user.uid), { archivedChats: archive ? arrayUnion(chatId) : arrayRemove(chatId) });
      void refreshProfile();
    } catch (error) {
      setPending((previous) => { const next = { ...previous }; delete next[chatId]; return next; });
      throw error;
    }
  }, [refreshProfile, user]);
  return { archived, isArchived: (chatId: string) => archived.includes(chatId), setChatArchived };
}
