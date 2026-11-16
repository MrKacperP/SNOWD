/**
 * Admin Notification helpers
 * Writes lightweight events to `adminNotifications` so the admin
 * dashboard can show real-time alerts for new signups and site visits.
 * These writes are allowed by Firestore rules for all users (including
 * unauthenticated visitors) and are read-only for admin/employee roles.
 */

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, canWriteAdminNotifications } from "@/lib/firebase";

export type AdminNotifType =
  | "signup"
  | "visit"
  | "document_uploaded"
  | "job_created"
  | "payment"
  | "support"
  | "system"
  | "login"
  | "profile_saved"
  | "job_status_change"
  | "account_approved"
  | "account_rejected";

export interface AdminNotifPayload {
  type: AdminNotifType;
  /** Legacy fallback text for older admin notification records. */
  message: string;
  /** Short notification heading and optional conversation context. */
  title?: string;
  senderName?: string;
  chatLabel?: string;
  preview?: string;
  chatId?: string;
  /** UID if authenticated, null for anonymous visits */
  uid?: string | null;
  /** Extra metadata */
  meta?: Record<string, string | number | boolean | null>;
}

export async function sendAdminNotif(payload: AdminNotifPayload) {
  // The server records the event and alerts the admin's phone; it takes the uid from the sign-in token.
  try {
    const token = await auth?.currentUser?.getIdToken().catch(() => undefined);
    const response = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    if (response.ok) return;
  } catch {
    // Fall back to writing the dashboard record directly.
  }
  try {
    if (!canWriteAdminNotifications || !db) {
      console.warn("[adminNotifications] Skipped write: Firebase is not configured.", payload.type);
      return;
    }

    await addDoc(collection(db, "adminNotifications"), {
      ...payload,
      createdAt: serverTimestamp(),
      read: false,
    });
  } catch (error) {
    console.error("[adminNotifications] Failed to write admin notification", {
      type: payload.type,
      error,
    });
  }
}
