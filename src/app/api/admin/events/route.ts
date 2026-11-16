import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";
import { pushAdminNotification, pushCategory } from "@/lib/adminPush";

export const runtime = "nodejs";
const TYPES = ["signup", "visit", "document_uploaded", "job_created", "payment", "support", "system", "login", "profile_saved", "job_status_change", "account_approved", "account_rejected"];
const text = (value: unknown, max: number) => typeof value === "string" ? value.slice(0, max) : undefined;
const clean = (value: Record<string, unknown>) => Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined));

/**
 * Records an admin dashboard event from the website or app, and alerts the admin's phone.
 * Only events from a signed-in person push, and the uid always comes from their token,
 * so a visitor can't trigger alerts or pose as someone else.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || !TYPES.includes(body.type) || typeof body.message !== "string") return NextResponse.json({ error: "Invalid event." }, { status: 400 });
  const bearer = request.headers.get("authorization")?.replace(/^Bearer /, "");
  const uid = bearer ? (await getAdminAuth().verifyIdToken(bearer).catch(() => null))?.uid ?? null : null;
  const meta = body.meta && typeof body.meta === "object" && !Array.isArray(body.meta)
    ? Object.fromEntries(Object.entries(body.meta as Record<string, unknown>).slice(0, 20).filter(([, v]) => v === null || ["string", "number", "boolean"].includes(typeof v)).map(([k, v]) => [k.slice(0, 60), typeof v === "string" ? v.slice(0, 500) : v]))
    : undefined;
  const record = clean({
    type: body.type, message: body.message.slice(0, 1000), title: text(body.title, 200), senderName: text(body.senderName, 120),
    chatLabel: text(body.chatLabel, 120), preview: text(body.preview, 500), chatId: text(body.chatId, 150), uid, meta,
  });
  try {
    const db = getAdminDb();
    await db.collection("adminNotifications").add({ ...record, read: false, createdAt: FieldValue.serverTimestamp() });
    if (uid && pushCategory(body.type)) {
      // At most one alert per person and event type every five minutes.
      const throttle = db.doc(`adminPushThrottle/${uid}_${body.type}`);
      const fresh = await db.runTransaction(async (tx) => {
        const last = (await tx.get(throttle)).data()?.at ?? 0;
        if (Date.now() - last < 5 * 60_000) return false;
        tx.set(throttle, { at: Date.now() });
        return true;
      });
      if (fresh) await pushAdminNotification(record);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin event failed", error);
    return NextResponse.json({ error: "Could not record event." }, { status: 500 });
  }
}
