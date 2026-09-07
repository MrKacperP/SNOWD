/**
 * Admin Notification helpers
 * Writes lightweight events to `adminNotifications` so the admin
 * dashboard can show real-time alerts for new signups and site visits.
 * These writes are allowed by Firestore rules for all users (including
 * unauthenticated visitors) and are read-only for admin/employee roles.
 */

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, canWriteAdminNotifications } from "@/lib/firebase";

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
