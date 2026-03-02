/**
 * Admin Notification helpers
 * Writes lightweight events to `adminNotifications` so the admin
 * dashboard can show real-time alerts for new signups and site visits.
 * These writes are allowed by Firestore rules for all users (including
 * unauthenticated visitors) and are read-only for admin/employee roles.
 */

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type AdminNotifType =
  | "signup"
  | "visit"
  | "document_uploaded"
  | "job_created"
  | "payment"
  | "login"
  | "profile_saved"
  | "job_status_change"
  | "account_approved";

export interface AdminNotifPayload {
  type: AdminNotifType;
  /** Human-readable message shown in the admin feed */
  message: string;
  /** UID if authenticated, null for anonymous visits */
  uid?: string | null;
  /** Extra metadata */
  meta?: Record<string, string | number | boolean | null>;
}

export async function sendAdminNotif(payload: AdminNotifPayload) {
  try {
    await addDoc(collection(db, "adminNotifications"), {
      ...payload,
      createdAt: serverTimestamp(),
      read: false,
    });
  } catch {
    // Silently swallow — notification failures must never break the app
  }
}
