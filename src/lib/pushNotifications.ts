import { getAdminDb } from "@/lib/firebaseAdmin";

type Push = { title: string; body?: string; data?: Record<string, string> };

/**
 * Sends a phone notification to every device the person has signed in on with the native app.
 * Devices register in `pushTokens/{token}` (written by the app, readable only by its owner).
 * Never throws: a missing push should never fail the action that caused it.
 */
export async function sendPushToUser(uid: string, push: Push) {
  try {
    const db = getAdminDb();
    const snap = await db.collection("pushTokens").where("uid", "==", uid).get();
    const tokens = snap.docs.map((d) => d.id).filter((t) => t.startsWith("ExponentPushToken["));
    if (!tokens.length) return;
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}),
      },
      body: JSON.stringify(tokens.map((to) => ({ to, title: push.title, body: push.body, data: push.data || {}, sound: "default", priority: "high" }))),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return;
    const result = (await response.json()) as { data?: { status: string; details?: { error?: string } }[] };
    // Forget devices that uninstalled the app or turned notifications off for good.
    const stale = (result.data || []).map((ticket, i) => (ticket.details?.error === "DeviceNotRegistered" ? tokens[i] : null)).filter(Boolean) as string[];
    await Promise.all(stale.map((token) => db.doc(`pushTokens/${token}`).delete().catch(() => {})));
  } catch (error) {
    console.error("Push notification failed", error);
  }
}
