import * as Crypto from "expo-crypto";
import { auth } from "./firebase";

export const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://www.snowd.ca";

/** Calls the website's API routes with the signed-in user's Firebase token. */
export async function api<T = Record<string, unknown>>(path: string, body?: Record<string, unknown>, method = body ? "POST" : "GET"): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Please sign in again.");
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data as { error?: string }).error || "Something went wrong. Please try again.");
  return data as T;
}

export const requestId = () => Crypto.randomUUID();
