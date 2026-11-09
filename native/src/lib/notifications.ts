import { collection, doc, onSnapshot, query, updateDoc, where, writeBatch } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { presentNotification, type NotificationRecord } from "@/lib/notificationPresentation";
import { dateMillis } from "@/lib/workOrders";
import { db } from "./firebase";

export type AppNotification = NotificationRecord & { id: string; uid: string; read?: boolean; createdAt?: unknown };

/** The same in-app updates the website's bell shows, newest first. */
export function useNotifications(uid?: string) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      query(collection(db, "notifications"), where("uid", "==", uid)),
      (snap) => {
        const list = snap.docs.map((d) => ({ ...d.data(), id: d.id }) as AppNotification);
        list.sort((a, b) => dateMillis(b.createdAt) - dateMillis(a.createdAt));
        setItems(list);
        setLoading(false);
        setError("");
      },
      () => {
        setLoading(false);
        setError("Couldn’t load your updates. Check your connection.");
      },
    );
  }, [uid]);
  const markRead = useCallback((id: string) => updateDoc(doc(db, "notifications", id), { read: true }).catch(() => {}), []);
  const markAllRead = useCallback(async () => {
    const unread = items.filter((item) => !item.read).slice(0, 450);
    if (!unread.length) return;
    const batch = writeBatch(db);
    unread.forEach((item) => batch.update(doc(db, "notifications", item.id), { read: true }));
    await batch.commit();
  }, [items]);
  return { items, unread: items.filter((item) => !item.read).length, loading, error, markRead, markAllRead };
}

/** Turns the website link a notification points at into the matching app screen. */
export function notificationRoute(item: AppNotification): string | null {
  const view = presentNotification(item);
  const href = view.href || "";
  if (href.startsWith("/dashboard/messages/")) return `/chat/${href.split("/").pop()}`;
  if (href.startsWith("/dashboard/jobs/")) return `/job/${href.split("/").pop()}`;
  if (href.startsWith("/dashboard/find")) return item.operatorId ? `/operator/${item.operatorId}` : "/find";
  if (href.includes("verification")) return "/profile/verification";
  if (href === "/dashboard") return "/home";
  return null;
}
