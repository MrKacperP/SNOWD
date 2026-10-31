import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getAdminDb } from "@/lib/firebaseAdmin";

const HOUR = 60 * 60 * 1000;
const LIMIT_PER_HOUR = 5;
const kinds = ["question", "feedback"] as const;

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

// Public landing-page inbox: no sign-in, so validate hard and rate limit per hashed IP.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if (text(body.website, 200)) return NextResponse.json({ ok: true });
  const kind = kinds.includes(body.kind) ? body.kind as typeof kinds[number] : null;
  const message = text(body.message, 2000);
  const email = text(body.email, 200).toLowerCase();
  const name = text(body.name, 100);
  if (!kind) return NextResponse.json({ error: "Choose question or feedback." }, { status: 400 });
  if (message.length < 5) return NextResponse.json({ error: "Please write a little more so we can help." }, { status: 400 });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return NextResponse.json({ error: "That email address doesn’t look right." }, { status: 400 });

  const ip = (req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown").trim();
  const ipHash = createHash("sha256").update(`snowd-feedback:${ip}`).digest("hex").slice(0, 40);
  try {
    const db = getAdminDb();
    await db.runTransaction(async tx => {
      const limitRef = db.doc(`feedbackLimits/${ipHash}`);
      const now = Date.now();
      const limit = (await tx.get(limitRef)).data();
      const recent = limit && limit.windowStart > now - HOUR ? limit.count : 0;
      if (recent >= LIMIT_PER_HOUR) throw new Error("rate-limited");
      tx.set(limitRef, { windowStart: recent ? limit!.windowStart : now, count: recent + 1 });
      tx.create(db.collection("feedback").doc(), { kind, message, email: email || null, name: name || null, source: "landing", status: "new", createdAt: now });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "rate-limited") return NextResponse.json({ error: "Thanks! You’ve sent a few already. Please try again in an hour or email support@snowd.ca." }, { status: 429 });
    console.error("Feedback submit failed", error);
    return NextResponse.json({ error: "We couldn’t send that right now. Please email support@snowd.ca." }, { status: 500 });
  }
}
