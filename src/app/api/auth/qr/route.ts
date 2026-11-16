import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const valid = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const cookieName = "snowd-qr-browser";
const reply = (data: object, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Browser requests must originate on this site. Native approval uses a bearer token.
    if (body.action !== "approve" && req.headers.get("origin") !== req.nextUrl.origin) return reply({ error: "Invalid origin." }, 403);
    const db = getAdminDb();
    if (body.action === "create") {
      const existing = req.cookies.get(cookieName)?.value?.split(".");
      if (existing && valid(existing[0])) {
        const previous = await db.collection("webSignInSessions").doc(existing[0]).get();
        if (previous.exists && previous.data()!.createdAt > Date.now() - 10000) return reply({ error: "Please wait before requesting another code." }, 429);
      }
      const id = randomBytes(32).toString("hex");
      const secret = randomBytes(32).toString("hex");
      const expiresAt = Date.now() + 120000;
      await db.collection("webSignInSessions").doc(id).set({ secretHash: hash(secret), createdAt: Date.now(), expiresAt, deleteAfter: new Date(expiresAt), status: "pending" });
      const response = reply({ id, expiresAt });
      response.cookies.set(cookieName, `${id}.${secret}`, { httpOnly: true, secure: req.nextUrl.protocol === "https:", sameSite: "strict", path: "/api/auth/qr", maxAge: 180 });
      return response;
    }
    if (!valid(body.id)) return reply({ error: "Invalid sign-in code." }, 400);
    const ref = db.collection("webSignInSessions").doc(body.id);
    if (body.action === "approve") {
      const bearer = req.headers.get("authorization") || "";
      if (!bearer.startsWith("Bearer ")) return reply({ error: "Sign in to the app first." }, 401);
      let uid: string;
      try { uid = (await getAdminAuth().verifyIdToken(bearer.slice(7), true)).uid; }
      catch { return reply({ error: "Please sign in again." }, 401); }
      await db.runTransaction(async tx => {
        const session = (await tx.get(ref)).data();
        if (!session || session.expiresAt <= Date.now() || session.status !== "pending") throw new Error("expired");
        tx.update(ref, { status: "approved", uid });
      });
      return reply({ approved: true });
    }
    if (body.action === "poll") {
      const [id, secret] = (req.cookies.get(cookieName)?.value || "").split(".");
      if (id !== body.id || !valid(secret)) return reply({ error: "Open a new QR code in this browser." }, 403);
      const uid = await db.runTransaction(async tx => {
        const session = (await tx.get(ref)).data();
        if (!session || session.secretHash !== hash(secret) || session.expiresAt <= Date.now() || session.status === "consumed") throw new Error("expired");
        if (session.status !== "approved") return null;
        tx.update(ref, { status: "consumed" });
        return session.uid as string;
      });
      if (!uid) return reply({ status: "pending" });
      const token = await getAdminAuth().createCustomToken(uid);
      return reply({ status: "approved", token });
    }
    return reply({ error: "Invalid request." }, 400);
  } catch (err) {
    if (err instanceof Error && err.message === "expired") return reply({ error: "This QR code expired or was already used. Get a new code." }, 410);
    console.error("QR sign-in failed", err instanceof Error ? err.message : "Unknown error");
    return reply({ error: "Couldn’t complete QR sign-in. Please try again." }, 500);
  }
}
