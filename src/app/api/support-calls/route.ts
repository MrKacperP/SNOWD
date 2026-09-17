import { NextRequest, NextResponse } from "next/server";
import { createHmac, randomUUID } from "node:crypto";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";

class CallError extends Error { constructor(message: string, public status = 400) { super(message); } }
async function identity(req: NextRequest) {
  let uid: string;
  try { uid = (await getAdminAuth().verifyIdToken(req.headers.get("authorization")?.replace(/^Bearer /, "") || "", true)).uid; }
  catch { throw new CallError("Please sign in again.", 401); }
  const profile = (await getAdminDb().doc(`users/${uid}`).get()).data();
  if (!profile || profile.disabled) throw new CallError("Account unavailable.", 403);
  return { uid, staff: ["admin", "employee"].includes(profile.role), name: String(profile.displayName || "SNOWD user") };
}
function failure(error: unknown) {
  return NextResponse.json({ error: error instanceof CallError ? error.message : "Support calling is unavailable. Please try again or call 437-922-3895." }, { status: error instanceof CallError ? error.status : 500 });
}
function description(value: unknown, type: "offer" | "answer") {
  const data = value as { type?: string; sdp?: string } | undefined;
  if (data?.type !== type || typeof data.sdp !== "string" || data.sdp.length > 100000 || !data.sdp.startsWith("v=0")) throw new CallError("Invalid call connection.");
  return { type, sdp: data.sdp };
}
export async function GET(req: NextRequest) {
  try {
    const user = await identity(req), db = getAdminDb(), id = req.nextUrl.searchParams.get("id");
    if (req.nextUrl.searchParams.has("config")) {
      const iceServers: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
      if (process.env.SUPPORT_TURN_URLS && process.env.SUPPORT_TURN_SECRET) {
        const username = `${Math.floor(Date.now() / 1000) + 7200}:${user.uid}`;
        iceServers.push({ urls: process.env.SUPPORT_TURN_URLS.split(","), username, credential: createHmac("sha1", process.env.SUPPORT_TURN_SECRET).update(username).digest("base64") });
      }
      return NextResponse.json({ iceServers });
    }
    if (id) {
      if (!/^[\w-]{1,150}$/.test(id)) throw new CallError("Invalid call.");
      const call = (await db.doc(`supportCalls/${id}`).get()).data();
      if (!call || (call.callerId !== user.uid && !(user.staff && (!call.adminId || call.adminId === user.uid)))) throw new CallError("Call unavailable.", 403);
      return NextResponse.json({ ...call, id, status: call.expiresAt < Date.now() ? "ended" : call.status });
    }
    if (!user.staff) throw new CallError("Support access required.", 403);
    const calls = await db.collection("supportCalls").where("expiresAt", ">", Date.now()).get();
    return NextResponse.json({ calls: calls.docs.filter(doc => doc.data().status === "ringing").map(doc => ({ id: doc.id, callerName: doc.data().callerName, createdAt: doc.data().createdAt })).sort((a, b) => a.createdAt - b.createdAt) });
  } catch (error) { return failure(error); }
}
export async function POST(req: NextRequest) {
  try {
    const user = await identity(req), db = getAdminDb();
    const body = await req.json().catch(() => { throw new CallError("Invalid call request."); });
    if (!body || typeof body !== "object") throw new CallError("Invalid call request.");
    if (body.action === "start") {
      if (user.staff) throw new CallError("Use the admin page to answer calls.");
      const offer = description(body.offer, "offer"), id = randomUUID(), now = Date.now();
      await db.runTransaction(async tx => {
        const lock = db.doc(`supportCallLocks/${user.uid}`), existing = (await tx.get(lock)).data();
        if (existing && existing.expiresAt > now) throw new CallError("You already have a support call. End it or wait two minutes before retrying.", 409);
        tx.set(lock, { id, expiresAt: now + 120000 });
        tx.create(db.doc(`supportCalls/${id}`), { callerId: user.uid, callerName: user.name, adminId: null, status: "ringing", offer, createdAt: now, expiresAt: now + 120000 });
      });
      return NextResponse.json({ id });
    }
    if (typeof body.id !== "string" || !/^[\w-]{1,150}$/.test(body.id)) throw new CallError("Invalid call.");
    await db.runTransaction(async tx => {
      const ref = db.doc(`supportCalls/${body.id}`), call = (await tx.get(ref)).data();
      if (!call) throw new CallError("Call no longer available.", 404);
      const owner = call.callerId === user.uid, assigned = user.staff && call.adminId === user.uid;
      if (body.action === "answer") {
        if (!user.staff || call.status !== "ringing" || call.expiresAt < Date.now()) throw new CallError("This call was already answered or ended.", 409);
        const lock = db.doc(`supportCallLocks/${user.uid}`), existing = (await tx.get(lock)).data();
        if (existing && existing.expiresAt > Date.now()) throw new CallError("You are already on a call.", 409);
        const expiresAt = Date.now() + 120000;
        tx.update(ref, { adminId: user.uid, answer: description(body.answer, "answer"), status: "active", expiresAt });
        tx.set(lock, { id: body.id, expiresAt });
        tx.set(db.doc(`supportCallLocks/${call.callerId}`), { id: body.id, expiresAt });
      } else if (body.action === "heartbeat") {
        if (!owner && !assigned) throw new CallError("Call access denied.", 403);
        if (call.status !== "active" || call.expiresAt < Date.now()) throw new CallError("Call ended.", 409);
        const expiresAt = Date.now() + 120000;
        tx.update(ref, { expiresAt });
        tx.set(db.doc(`supportCallLocks/${user.uid}`), { id: body.id, expiresAt });
      } else if (body.action === "end") {
        if (!owner && !assigned && !(user.staff && call.status === "ringing")) throw new CallError("Call access denied.", 403);
        const ids = [call.callerId, call.adminId].filter(Boolean) as string[];
        const locks = await Promise.all(ids.map(uid => tx.get(db.doc(`supportCallLocks/${uid}`))));
        tx.update(ref, { status: "ended", expiresAt: Date.now(), offer: null, answer: null });
        locks.forEach(lock => { if (lock.data()?.id === body.id) tx.delete(lock.ref); });
      } else throw new CallError("Unknown call action.");
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return failure(error); }
}
