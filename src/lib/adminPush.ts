import { createPrivateKey, sign } from "node:crypto";
import { connect } from "node:http2";
import { getAdminDb } from "@/lib/firebaseAdmin";

/**
 * Phone notifications for the SNOWD Admin iOS app, sent straight to Apple (APNs).
 * Devices register in `adminPushTokens/{token}` through /api/admin/push-token.
 * Needs APNS_KEY (the .p8 contents), APNS_KEY_ID and, optionally, APNS_TEAM_ID.
 * Never throws: a missed alert must not fail the action that caused it.
 */
export type AdminPushCategory = "logins" | "payments" | "verifications" | "support" | "jobs" | "accounts";
export const ADMIN_PUSH_CATEGORIES: AdminPushCategory[] = ["logins", "payments", "verifications", "support", "jobs", "accounts"];
export type AdminPush = { category: AdminPushCategory; title: string; body: string; tab?: string; excludeUid?: string | null };

const TOPIC = "ca.snowd.admin";
const HOSTS = { production: "https://api.push.apple.com", sandbox: "https://api.sandbox.push.apple.com" };

/** Which phone category an `adminNotifications` event type belongs to; null means no push. */
export function pushCategory(type: string): AdminPushCategory | null {
  switch (type) {
    case "login": case "signup": return "logins";
    case "transaction": case "payment": return "payments";
    case "document_uploaded": return "verifications";
    case "support": return "support";
    case "job_created": case "job_status_change": case "job": return "jobs";
    case "account": return "accounts";
    default: return null;
  }
}
const TABS: Record<AdminPushCategory, string> = { logins: "logins", payments: "payments", verifications: "verify", support: "manage", jobs: "manage", accounts: "manage" };

let cached: { token: string; at: number } | null = null;
function providerToken() {
  const key = process.env.APNS_KEY?.replace(/\\n/g, "\n"), keyId = process.env.APNS_KEY_ID;
  if (!key || !keyId) return null;
  // Apple accepts a token for up to an hour and rejects refreshing more than every 20 minutes.
  if (cached && Date.now() - cached.at < 40 * 60_000) return cached.token;
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode({ alg: "ES256", kid: keyId })}.${encode({ iss: process.env.APNS_TEAM_ID || "9LS8P5N78V", iat: Math.floor(Date.now() / 1000) })}`;
  const signature = sign("sha256", Buffer.from(unsigned), { key: createPrivateKey(key), dsaEncoding: "ieee-p1363" }).toString("base64url");
  cached = { token: `${unsigned}.${signature}`, at: Date.now() };
  return cached.token;
}

function send(host: string, device: string, jwt: string, payload: string) {
  return new Promise<{ status: number; reason?: string }>((resolve) => {
    const client = connect(host);
    const done = (result: { status: number; reason?: string }) => { client.close(); resolve(result); };
    client.on("error", () => done({ status: 0 }));
    client.setTimeout(8000, () => done({ status: 0, reason: "Timeout" }));
    const request = client.request({
      ":method": "POST", ":path": `/3/device/${device}`, authorization: `bearer ${jwt}`,
      "apns-topic": TOPIC, "apns-push-type": "alert", "apns-priority": "10", "content-type": "application/json",
    });
    let status = 0, body = "";
    request.on("response", (headers) => { status = Number(headers[":status"]) || 0; });
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => { let reason: string | undefined; try { reason = JSON.parse(body).reason; } catch {} done({ status, reason }); });
    request.on("error", () => done({ status: 0 }));
    request.end(payload);
  });
}

/** Sends to every registered admin device that has this category turned on. Returns how many were delivered. */
export async function pushToAdmins(push: AdminPush, onlyUid?: string) {
  try {
    const jwt = providerToken();
    if (!jwt) { console.warn("Admin push skipped: APNS_KEY and APNS_KEY_ID are not set."); return 0; }
    const db = getAdminDb();
    let query = db.collection("adminPushTokens").where("categories", "array-contains", push.category);
    if (onlyUid) query = query.where("uid", "==", onlyUid);
    const devices = (await query.get()).docs.filter((d) => d.data().uid !== push.excludeUid);
    const payload = JSON.stringify({ aps: { alert: { title: push.title, body: push.body }, sound: "default", "thread-id": push.category }, tab: push.tab || TABS[push.category] });
    let delivered = 0;
    await Promise.all(devices.map(async (doc) => {
      const sandbox = doc.data().sandbox === true;
      let result = await send(sandbox ? HOSTS.sandbox : HOSTS.production, doc.id, jwt, payload);
      // A debug build's token only works with the sandbox server, and the reverse.
      if (result.reason === "BadDeviceToken") {
        result = await send(sandbox ? HOSTS.production : HOSTS.sandbox, doc.id, jwt, payload);
        if (result.status === 200) await doc.ref.update({ sandbox: !sandbox }).catch(() => {});
      }
      if (result.status === 200) delivered++;
      else if (result.status === 410 || result.reason === "BadDeviceToken" || result.reason === "Unregistered") await doc.ref.delete().catch(() => {});
      else console.error("Admin push failed", result.status, result.reason);
    }));
    return delivered;
  } catch (error) {
    console.error("Admin push failed", error);
    return 0;
  }
}

/** Pushes an `adminNotifications` record, when its type is one the admin app alerts on. */
export function pushAdminNotification(record: { type?: unknown; title?: unknown; message?: unknown; uid?: unknown }) {
  const category = pushCategory(String(record.type || ""));
  if (!category) return Promise.resolve(0);
  const fallback: Record<AdminPushCategory, string> = { logins: "Sign-in", payments: "Payment", verifications: "ID uploaded", support: "Support", jobs: "Work order", accounts: "Account" };
  const title = typeof record.title === "string" && record.title.trim() ? record.title : record.type === "signup" ? "New sign-up" : fallback[category];
  const body = typeof record.message === "string" ? record.message.slice(0, 180) : "";
  return pushToAdmins({ category, title, body, excludeUid: typeof record.uid === "string" ? record.uid : null });
}
