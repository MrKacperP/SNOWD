import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";

async function authorize(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) throw new Error("AUTH_REQUIRED");
  const decoded = await getAdminAuth().verifyIdToken(token, true);
  const db = getAdminDb();
  const caller = (await db.doc(`users/${decoded.uid}`).get()).data();
  if (!caller || caller.disabled || !["admin", "employee"].includes(String(caller.role))) throw new Error("FORBIDDEN");
  return { db, uid: decoded.uid, caller };
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  try {
    const { db, uid, caller } = await authorize(request);
    const { jobId } = await context.params;
    if (!jobId || jobId.includes("/")) return NextResponse.json({ error: "Invalid job." }, { status: 400 });
    const body = await request.json() as Record<string, unknown>;
    const allowed = ["status", "adminFlagged", "operatorNotes", "specialInstructions", "reason"];
    if (Object.keys(body).some((key) => !allowed.includes(key))) return NextResponse.json({ error: "Unsupported job field." }, { status: 400 });
    if (body.status !== undefined && !["pending", "accepted", "in-progress", "en-route", "completed", "cancelled"].includes(String(body.status))) return NextResponse.json({ error: "Invalid job status." }, { status: 400 });
    if (body.adminFlagged !== undefined && typeof body.adminFlagged !== "boolean") return NextResponse.json({ error: "Invalid flag value." }, { status: 400 });
    if (["operatorNotes", "specialInstructions", "reason"].some((key) => body[key] !== undefined && (typeof body[key] !== "string" || String(body[key]).length > 4000))) return NextResponse.json({ error: "Job notes are too long." }, { status: 400 });
    const ref = db.doc(`jobs/${jobId}`);
    const { reason, ...changes } = body;
    const result = await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(ref);
      const job = snapshot.data();
      if (!job) return { error: "Job not found.", status: 404 };
      if (body.status && body.status !== job.status) {
        if (body.status === "completed" && (!job.completionPhotoUrl || (job.paymentStatus !== "paid" && !job.cashPaymentDeferredAt))) return { error: "Completion requires a completion photo and a recorded payment or deferred cash collection.", status: 409 };
        if (body.status === "cancelled" && ["held", "paid"].includes(job.paymentStatus)) return { error: "Resolve the payment through the job payment workflow before cancelling this service.", status: 409 };
        if (["completed", "cancelled"].includes(job.status)) return { error: "Finalized service status cannot be overwritten. You can still correct report notes.", status: 409 };
      }
      const now = FieldValue.serverTimestamp();
      transaction.update(ref, { ...changes, updatedAt: now });
      transaction.set(db.collection("adminActivity").doc(), { actorUid: uid, actorRole: caller.role === "admin" ? "Admin" : "Employee", userName: caller.displayName || "Admin", userAvatar: "AD", type: "Job", targetId: jobId, description: `${body.adminFlagged === true ? "flagged a job for review" : "updated a job report"}${reason ? `: ${reason}` : ""}`, previous: Object.fromEntries(Object.keys(changes).map(key => [key, job[key] ?? null])), changes, href: `/admin/jobs?id=${jobId}`, createdAt: now });
      transaction.set(db.collection("adminNotifications").doc(), { type: "job", message: body.adminFlagged === true ? "Job flagged for review" : "Service report updated", actionRequired: body.adminFlagged === true, read: false, meta: { path: `/admin/jobs?id=${jobId}` }, createdAt: now });
      return null;
    });
    if (result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ success: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "AUTH_REQUIRED") return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    if (code === "FORBIDDEN") return NextResponse.json({ error: "Only active admin staff can manage jobs." }, { status: 403 });
    console.error("Admin job update failed", error);
    return NextResponse.json({ error: "Job update could not finish." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  try {
    const { db, uid, caller } = await authorize(request);
    if (caller.role !== "admin") return NextResponse.json({ error: "Only administrators can delete jobs." }, { status: 403 });
    const { jobId } = await context.params;
    if (!jobId || jobId.includes("/")) return NextResponse.json({ error: "Invalid job." }, { status: 400 });
    const ref = db.doc(`jobs/${jobId}`);
    const record = (await ref.get()).data();
    if (record && (["held", "paid"].includes(record.paymentStatus) || record.status === "completed" || !(await db.collection("transactions").where("jobId", "==", jobId).limit(1).get()).empty)) return NextResponse.json({ error: "This job has payment or completed service history. Retain the record and correct its report instead." }, { status: 409 });
    if (!(await ref.get()).exists) return NextResponse.json({ error: "Job not found." }, { status: 404 });
    await db.recursiveDelete(ref);
    await db.collection("adminActivity").add({ actorUid: uid, actorRole: "Admin", userName: caller.displayName || "Admin", userAvatar: "AD", type: "Job", targetId: jobId, description: "deleted a job record", href: "/admin/jobs", createdAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "AUTH_REQUIRED") return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    if (code === "FORBIDDEN") return NextResponse.json({ error: "Only active admin staff can manage jobs." }, { status: 403 });
    console.error("Admin job delete failed", error);
    return NextResponse.json({ error: "Job deletion could not finish." }, { status: 500 });
  }
}
