import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import type { AdminNotifPayload } from "@/lib/adminNotifications";
import { api } from "./api";
import { db } from "./firebase";

/** Same admin alert the website sends (profile saved, ID uploaded…). The server also alerts the admin's phone. Never blocks the user. */
export function notifyAdmin(payload: AdminNotifPayload) {
  void api("/api/admin/events", { ...payload }).catch(() =>
    addDoc(collection(db, "adminNotifications"), { ...payload, createdAt: serverTimestamp(), read: false }).catch(() => {}));
}
