"use client";

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Chat } from "@/lib/types";

/** Read only the user's chats, with a job-based path for legacy query rules. */
export function useUserChats(uid?: string, role?: string, retry = 0) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!uid) return;
    let active = true;
    let unsubscribeJobs: (() => void) | undefined;
    const subscriptions = new Map<string, () => void>();
    const records = new Map<string, Chat>();
    const pending = new Set<string>();
    const failures = new Set<string>();
    const publish = () => {
      if (!active) return;
      setChats([...records.values()]);
      setLoading(pending.size > 0);
      setError(failures.size > 0);
    };
    const unsubscribe = onSnapshot(
      query(collection(db, "chats"), where("participants", "array-contains", uid)),
      snapshot => {
        if (!active) return;
        setChats(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as Chat)));
        setLoading(false);
        setError(false);
      },
      () => {
        // Each referenced chat is still checked by Firestore's document read rules.
        unsubscribeJobs = onSnapshot(
          query(collection(db, "jobs"), where(role === "operator" ? "operatorId" : "clientId", "==", uid)),
          snapshot => {
            const ids = new Set(snapshot.docs.map(item => item.data().chatId).filter((id): id is string => typeof id === "string" && id.length > 0));
            for (const [id, stop] of subscriptions) {
              if (!ids.has(id)) { stop(); subscriptions.delete(id); records.delete(id); pending.delete(id); failures.delete(id); }
            }
            for (const id of ids) {
              if (subscriptions.has(id)) continue;
              pending.add(id);
              subscriptions.set(id, onSnapshot(doc(db, "chats", id), item => {
                if (item.exists()) records.set(id, { ...item.data(), id } as Chat);
                else records.delete(id);
                pending.delete(id);
                failures.delete(id);
                publish();
              }, () => { pending.delete(id); failures.add(id); publish(); }));
            }
            publish();
          },
          () => { if (active) { setError(true); setLoading(false); } }
        );
      }
    );
    return () => { active = false; unsubscribe(); unsubscribeJobs?.(); subscriptions.forEach(stop => stop()); };
  }, [uid, role, retry]);

  return { chats, loading, error };
}
