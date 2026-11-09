import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import type { AdminNotifPayload } from "@/lib/adminNotifications";
import { db } from "./firebase";

/** Same admin alert the website writes (profile saved, ID uploaded…). Never blocks the user. */
export function notifyAdmin(payload: AdminNotifPayload) {
  void addDoc(collection(db, "adminNotifications"), { ...payload, createdAt: serverTimestamp(), read: false }).catch(() => {});
}
