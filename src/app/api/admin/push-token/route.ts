import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdministrator } from "@/lib/admin/server";
import { ADMIN_PUSH_CATEGORIES, pushToAdmins, type AdminPushCategory } from "@/lib/adminPush";
import { OrderError, orderFailure } from "@/lib/workOrderServer";

export const runtime = "nodejs";
const validToken = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64,200}$/.test(value);

/** Registers this admin's iPhone for alerts, changes its categories, or sends a test alert. */
export async function POST(request: NextRequest) {
  try {
    const { uid, db } = await requireAdministrator(request);
    const body = await request.json().catch(() => ({}));
    if (body.action === "test") {
      const delivered = await pushToAdmins({ category: "accounts", title: "SNOWD Admin", body: "Notifications are working." }, uid)
        || await pushToAdmins({ category: "logins", title: "SNOWD Admin", body: "Notifications are working." }, uid);
      if (!delivered) throw new OrderError(process.env.APNS_KEY ? "No device received it. Turn on at least one alert type and try again." : "Notifications aren't set up on the server yet (APNs key missing).", 409);
      return NextResponse.json({ success: true, message: "Test notification sent." });
    }
    if (!validToken(body.token)) throw new OrderError("Invalid device.", 400);
    const categories = Array.isArray(body.categories) ? body.categories.filter((c: unknown): c is AdminPushCategory => ADMIN_PUSH_CATEGORIES.includes(c as AdminPushCategory)) : ADMIN_PUSH_CATEGORIES;
    await db.doc(`adminPushTokens/${body.token}`).set({ uid, categories, sandbox: body.sandbox === true, updatedAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true });
  } catch (error) { return orderFailure(error); }
}

export async function DELETE(request: NextRequest) {
  try {
    const { uid, db } = await requireAdministrator(request);
    const { token } = await request.json().catch(() => ({}));
    if (!validToken(token)) throw new OrderError("Invalid device.", 400);
    const ref = db.doc(`adminPushTokens/${token}`);
    if ((await ref.get()).data()?.uid === uid) await ref.delete();
    return NextResponse.json({ success: true });
  } catch (error) { return orderFailure(error); }
}
