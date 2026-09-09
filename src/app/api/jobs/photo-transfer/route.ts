import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { orderUser, validId, OrderError, orderFailure } from "@/lib/workOrderServer";
import { validCompletionPhoto } from "@/lib/completionPhoto";

export async function POST(request: NextRequest) {
  try {
    if (Number(request.headers.get("content-length")) > 710000) throw new OrderError("Photo is too large.", 413);
    const raw = await request.text();
    if (raw.length > 710000) throw new OrderError("Photo is too large.", 413);
    const body = JSON.parse(raw);
    if (!validId(body.jobId)) throw new OrderError("Invalid order.", 400);
    const db = getAdminDb();
    const ref = db.doc(`photoTransfers/${body.jobId}`);
    const uid = body.action === "upload" ? null : await orderUser(request);
    const token = randomBytes(32).toString("hex");
    const hash = (value: string) => createHash("sha256").update(value).digest("hex");
    const result = await db.runTransaction(async tx => {
      const job = (await tx.get(db.doc(`jobs/${body.jobId}`))).data();
      if (!job || job.status !== "in-progress") throw new OrderError("This order is no longer accepting photos.");
      if (body.action !== "upload" && job.operatorId !== uid) throw new OrderError("Only the assigned operator can upload proof.", 403);
      if (body.action === "create") {
        const expiresAt = Date.now() + 10 * 60 * 1000;
        tx.set(ref, { tokenHash: hash(token), operatorId: uid, expiresAt, photo: null });
        return { token, expiresAt, sessionId: hash(token) };
      }
      const session = (await tx.get(ref)).data();
      if (!session || session.expiresAt <= Date.now() || session.operatorId !== job.operatorId) throw new OrderError("This upload link expired. Generate a new QR code on your computer.", 410);
      if (body.action === "upload") {
        if (typeof body.token !== "string" || !/^[a-f0-9]{64}$/.test(body.token) || hash(body.token) !== session.tokenHash) throw new OrderError("Invalid upload link.", 403);
        if (session.photo) return { success: true };
        if (!validCompletionPhoto(body.photo)) throw new OrderError("Choose a valid JPEG photo under 500 KB.", 400);
        tx.update(ref, { photo: body.photo });
        return { success: true };
      }
      if (body.sessionId !== session.tokenHash) throw new OrderError("This QR code was replaced. Create a new one.", 410);
      if (body.action === "status") return { photo: session.photo, expiresAt: session.expiresAt };
      if (body.action === "close") { tx.update(ref, { photo: FieldValue.delete(), expiresAt: 0 }); return { success: true }; }
      throw new OrderError("Invalid action.", 400);
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return orderFailure(error); }
}
