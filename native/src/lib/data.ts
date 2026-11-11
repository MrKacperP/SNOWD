import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Chat, ChatMessage, Job, OperatorProfile } from "@/lib/types";
import { dateMillis } from "@/lib/workOrders";
import { db } from "./firebase";

export type Person = Partial<OperatorProfile> & { uid: string; displayName: string };

/** Live list of the user's chats, newest activity first. Merged per-order chats are hidden. */
export function useChats(uid?: string) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [key, setKey] = useState(0);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      query(collection(db, "chats"), where("participants", "array-contains", uid)),
      (snap) => {
        const list = snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Chat).filter((c) => !c.mergedInto);
        list.sort((a, b) => dateMillis(b.lastActivityTime || b.lastMessageTime || b.createdAt) - dateMillis(a.lastActivityTime || a.lastMessageTime || a.createdAt));
        setChats(list);
        setLoading(false);
        setError("");
      },
      () => {
        setLoading(false);
        setError("Couldn’t load your conversations. Pull to try again.");
      },
    );
  }, [uid, key]);
  /** Starts the live listener again, for pull to refresh. */
  const reload = useCallback(() => {
    peopleCache.clear();
    setKey((k) => k + 1);
  }, []);
  return { chats, loading, error, reload };
}

/** Live list of work orders where the user is the client or the operator. */
export function useJobs(uid?: string, role?: string) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState(0);
  useEffect(() => {
    if (!uid || !role) return;
    return onSnapshot(
      query(collection(db, "jobs"), where(role === "operator" ? "operatorId" : "clientId", "==", uid)),
      (snap) => {
        const list = snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Job);
        list.sort((a, b) => dateMillis(b.updatedAt || b.createdAt) - dateMillis(a.updatedAt || a.createdAt));
        setJobs(list);
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [uid, role, key]);
  const reload = useCallback(() => {
    peopleCache.clear();
    setKey((k) => k + 1);
  }, []);
  return { jobs, loading, reload };
}

export function useJob(jobId?: string) {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!jobId) return;
    return onSnapshot(
      doc(db, "jobs", jobId),
      (snap) => {
        setJob(snap.exists() ? ({ ...snap.data(), id: snap.id } as Job) : null);
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [jobId]);
  return { job, loading };
}

export function useMessages(chatId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!chatId) return;
    return onSnapshot(
      query(collection(db, "messages"), where("chatId", "==", chatId), orderBy("createdAt", "asc")),
      { includeMetadataChanges: true },
      (snap) => {
        setMessages(snap.docs.map((d) => ({ ...d.data(), id: d.id, pending: d.metadata.hasPendingWrites }) as ChatMessage));
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [chatId]);
  return { messages, loading };
}

export function useChat(chatId?: string) {
  const [chat, setChat] = useState<Chat | null>(null);
  useEffect(() => {
    if (!chatId) return;
    return onSnapshot(doc(db, "chats", chatId), (snap) => setChat(snap.exists() ? ({ ...snap.data(), id: snap.id } as Chat) : null), () => {});
  }, [chatId]);
  return chat;
}

const peopleCache = new Map<string, Person>();

/** Public profile info (name, photo, business) for the other people in chats and orders. */
export function usePeople(uids: string[]) {
  const key = useMemo(() => [...new Set(uids.filter(Boolean))].sort().join(","), [uids]);
  const [people, setPeople] = useState<Record<string, Person>>({});
  useEffect(() => {
    let active = true;
    const ids = key ? key.split(",") : [];
    Promise.all(
      ids.map(async (uid) => {
        if (peopleCache.has(uid)) return peopleCache.get(uid)!;
        const snap = await getDoc(doc(db, "users", uid)).catch(() => null);
        const person = { uid, displayName: "SNOWD member", ...(snap?.exists() ? snap.data() : {}) } as Person;
        peopleCache.set(uid, person);
        return person;
      }),
    ).then((list) => {
      if (active) setPeople(Object.fromEntries(list.map((p) => [p.uid, p])));
    });
    return () => {
      active = false;
    };
  }, [key]);
  return people;
}

export const personName = (person?: Person) => person?.businessName || person?.displayName || "SNOWD member";
