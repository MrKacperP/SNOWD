"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { collection, doc, onSnapshot, query, updateDoc, where, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useUserChats } from "@/hooks/useUserChats";
import { notificationWasViewed } from "@/lib/notificationReadState";
import { presentNotification } from "@/lib/notificationPresentation";

export { presentNotification };

export type NotificationItem = {
  id: string;
  chatId?: string;
  jobId?: string;
  operatorId?: string;
  type?: string;
  title?: string;
  message?: string;
  read?: boolean;
  createdAt?: { seconds?: number };
  preview?: string;
};

type NotificationState = {
  notifications: NotificationItem[];
  /** Live arrivals shown as toasts; never includes items present on first load. */
  toasts: NotificationItem[];
  unreadNotifications: number;
  unreadMessages: number;
  pendingJobs: number;
  /** Unread work-order updates keyed by job id. */
  unreadByJob: Record<string, number>;
  error: string;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  dismissToast: (id: string) => void;
  centerOpen: boolean;
  setCenterOpen: (open: boolean) => void;
};

const NotificationContext = createContext<NotificationState | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const uid = profile?.uid;
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  useEffect(() => { pathRef.current = pathname; }, [pathname]);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [toasts, setToasts] = useState<NotificationItem[]>([]);
  const [pendingJobs, setPendingJobs] = useState(0);
  const [centerOpen, setCenterOpenState] = useState(false);
  const [error, setError] = useState("");
  const { chats } = useUserChats(uid, profile?.role);

  useEffect(() => {
    if (!uid) return;
    let firstSnapshot = true;
    return onSnapshot(
      query(collection(db, "notifications"), where("uid", "==", uid)),
      snapshot => {
        const items = snapshot.docs.map(snap => ({ id: snap.id, ...(snap.data() as Omit<NotificationItem, "id">) }));
        setNotifications(items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
        setError("");
        if (!firstSnapshot) {
          const arrivals = snapshot.docChanges()
            .filter(change => change.type === "added" && !snapshot.metadata.hasPendingWrites)
            .map(change => ({ id: change.doc.id, ...(change.doc.data() as Omit<NotificationItem, "id">) }))
            // Skip what the person is already looking at.
            .filter(item => !item.read && !notificationWasViewed(item, pathRef.current));
          if (arrivals.length) setToasts(current => [...arrivals, ...current.filter(t => !arrivals.some(a => a.id === t.id))].slice(0, 5));
        }
        firstSnapshot = false;
      },
      err => {
        setError("Could not load updates. Reload the page to try again.");
        if (err.code !== "failed-precondition") console.error("Notifications listener error:", err);
      },
    );
  }, [uid]);

  useEffect(() => {
    if (!uid || profile?.role !== "operator") return;
    const q = query(collection(db, "jobs"), where("operatorId", "==", uid), where("status", "==", "pending"));
    return onSnapshot(q, snapshot => setPendingJobs(snapshot.docs.length), () => setPendingJobs(0));
  }, [uid, profile?.role]);

  // Viewing an order or conversation clears its updates and any matching toast.
  useEffect(() => {
    const acknowledgeVisible = async () => {
      if (document.visibilityState !== "visible") return;
      const viewed = notifications.filter(item => notificationWasViewed(item, pathname)).slice(0, 450);
      if (!viewed.length) return;
      setToasts(current => current.filter(t => !viewed.some(v => v.id === t.id)));
      const batch = writeBatch(db);
      viewed.forEach(item => batch.update(doc(db, "notifications", item.id), { read: true }));
      try { await batch.commit(); } catch { setError("Could not clear read updates. Please reload to retry."); }
    };
    void acknowledgeVisible();
    document.addEventListener("visibilitychange", acknowledgeVisible);
    return () => document.removeEventListener("visibilitychange", acknowledgeVisible);
  }, [notifications, pathname]);

  const markRead = useCallback(async (id: string) => {
    setToasts(current => current.filter(t => t.id !== id));
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (err) {
      console.error("Failed to mark notification read:", err);
      setError("Could not mark this update as read. Please try again.");
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const unread = notifications.filter(item => !item.read);
    setToasts([]);
    if (!unread.length) return;
    try {
      const batch = writeBatch(db);
      unread.slice(0, 450).forEach(item => batch.update(doc(db, "notifications", item.id), { read: true }));
      await batch.commit();
      setError("");
    } catch (err) {
      console.error("Failed to mark all notifications read:", err);
      setError("Could not mark updates as read. Please try again.");
    }
  }, [notifications]);

  // Opening the center shows everything, so pending banners are no longer needed.
  const setCenterOpen = useCallback((open: boolean) => { setCenterOpenState(open); if (open) setToasts([]); }, []);

  const dismissToast = useCallback((id: string) => setToasts(current => current.filter(t => t.id !== id)), []);

  const value = useMemo<NotificationState>(() => {
    const unreadByJob: Record<string, number> = {};
    for (const item of notifications) {
      if (!item.read && item.jobId && item.type !== "message") unreadByJob[item.jobId] = (unreadByJob[item.jobId] || 0) + 1;
    }
    return {
      notifications,
      toasts,
      unreadNotifications: notifications.filter(item => !item.read).length,
      unreadMessages: chats.filter(chat => !chat.mergedInto).reduce((count, chat) => count + (chat.unreadCount?.[uid || ""] || 0), 0),
      pendingJobs,
      unreadByJob,
      error,
      markRead,
      markAllRead,
      dismissToast,
      centerOpen,
      setCenterOpen,
    };
  }, [notifications, toasts, chats, uid, pendingJobs, error, markRead, markAllRead, dismissToast, centerOpen, setCenterOpen]);

  // Surface the total in the browser tab so new activity is visible from other tabs.
  useEffect(() => {
    const total = value.unreadMessages + value.unreadNotifications;
    const base = document.title.replace(/^\(\d+\+?\)\s/, "");
    document.title = total > 0 ? `(${total > 99 ? "99+" : total}) ${base}` : base;
  }, [value.unreadMessages, value.unreadNotifications, pathname]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const value = useContext(NotificationContext);
  if (!value) throw new Error("useNotifications must be used inside NotificationProvider");
  return value;
}
