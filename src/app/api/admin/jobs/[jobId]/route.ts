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
    const allowed = ["status", "adminFlagged", "operatorNotes", "specialInstructions"];
    if (Object.keys(body).some((key) => !allowed.includes(key))) return NextResponse.json({ error: "Unsupported job field." }, { status: 400 });
    if (body.status !== undefined && !["pending", "accepted", "in-progress", "en-route", "completed", "cancelled"].includes(String(body.status))) return NextResponse.json({ error: "Invalid job status." }, { status: 400 });
    if (body.adminFlagged !== undefined && typeof body.adminFlagged !== "boolean") return NextResponse.json({ error: "Invalid flag value." }, { status: 400 });
    if (["operatorNotes", "specialInstructions"].some((key) => body[key] !== undefined && (typeof body[key] !== "string" || String(body[key]).length > 4000))) return NextResponse.json({ error: "Job notes are too long." }, { status: 400 });
    const ref = db.doc(`jobs/${jobId}`);
    if (!(await ref.get()).exists) return NextResponse.json({ error: "Job not found." }, { status: 404 });
    await ref.update({ ...body, updatedAt: FieldValue.serverTimestamp() });
    await db.collection("adminActivity").add({ actorUid: uid, actorRole: caller.role === "admin" ? "Admin" : "Employee", userName: caller.displayName || "Admin", userAvatar: "AD", type: "Job", targetId: jobId, description: body.adminFlagged === true ? "flagged a job for review" : "updated a job report", href: `/admin/jobs?job=${jobId}`, createdAt: FieldValue.serverTimestamp() });
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
    const ref = db.doc(`jobs/${jobId}`);
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
