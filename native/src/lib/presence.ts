import { doc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { dateMillis } from "@/lib/workOrders";
import { db } from "./firebase";

/** How long a heartbeat counts as "online now". The app beats every minute while it's open. */
const FRESH_MS = 150_000;
const BEAT_MS = 60_000;

/** Someone is online only if they said so and their last heartbeat is recent. */
export const onlineNow = (data: { isOnline?: boolean; lastSeen?: unknown } | undefined, now = Date.now()) =>
  !!data?.isOnline && now - dateMillis(data.lastSeen) < FRESH_MS;

/**
 * Tells others you're on the app: a heartbeat every minute while SNOWD is open and in front,
 * and "offline" the moment it goes to the background.
 */
export function useHeartbeat(uid?: string) {
  useEffect(() => {
    if (!uid) return;
    const ref = doc(db, "users", uid);
    const beat = (online: boolean) => void updateDoc(ref, { isOnline: online, lastSeen: serverTimestamp() }).catch(() => {});
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      beat(true);
      clearInterval(timer);
      timer = setInterval(() => beat(true), BEAT_MS);
    };
    const stop = () => {
      clearInterval(timer);
      beat(false);
    };
    if (AppState.currentState === "active") start();
    const sub = AppState.addEventListener("change", (state) => (state === "active" ? start() : stop()));
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [uid]);
}

/** Live "online now" for a few people (a chat list or a chat header). */
export function usePresence(uids: string[]) {
  const key = useMemo(() => [...new Set(uids.filter(Boolean))].sort().slice(0, 40).join(","), [uids]);
  const [seen, setSeen] = useState<Record<string, { isOnline?: boolean; lastSeen?: unknown }>>({});
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!key) return;
    const offs = key.split(",").map((uid) =>
      onSnapshot(
        doc(db, "users", uid),
        (snap) => {
          const d = snap.data();
          setSeen((s) => ({ ...s, [uid]: { isOnline: d?.isOnline, lastSeen: d?.lastSeen } }));
        },
        () => {},
      ),
    );
    return () => offs.forEach((off) => off());
  }, [key]);
  return useMemo(() => Object.fromEntries(Object.entries(seen).map(([uid, d]) => [uid, onlineNow(d, now)])) as Record<string, boolean>, [seen, now]);
}
