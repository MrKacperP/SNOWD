import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb, getAdminStorage } from "@/lib/firebaseAdmin";
import { requireStripeUser } from "@/lib/stripeConnectAuth";
import { deletionReview, fulfilAccountDeletion, DeletionError } from "@/lib/accountDeletion";
export const maxDuration = 300;
type Context = { params: Promise<{ uid: string }> };
async function administrator(req: NextRequest) {
  const user = await requireStripeUser(req).catch(() => null);
  const profile = user ? (await getAdminDb().doc(`users/${user.uid}`).get()).data() : null;
  if (!user || profile?.role !== "admin" || profile.disabled) throw new DeletionError("Active administrator access required.", 403);
  return user;
}
function failure(error: unknown) { return NextResponse.json({ error: error instanceof DeletionError ? error.message : "The deletion review could not load. Please try again." }, { status: error instanceof DeletionError ? error.status : 500 }); }
export async function GET(req: NextRequest, context: Context) {
  try {
    await administrator(req); const { uid } = await context.params;
    if (!uid || uid.includes("/")) throw new DeletionError("Invalid account.", 400);
    const review = await deletionReview(getAdminDb(), getAdminAuth(), uid);
    const request = (await getAdminDb().doc(`accountDeletionRequests/${uid}`).get()).data();
    return NextResponse.json({ uid, status: request?.status, appleLinked: review.appleLinked, appleRevocationReported: request?.appleRevocationReported === true, jobCount: review.jobCount, claimCount: review.claimCount, activeJobs: review.activeJobs, openClaims: review.openClaims }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return failure(e); }
}
export async function POST(req: NextRequest, context: Context) {
  try {
    const actor = await administrator(req);
    if (Date.now() / 1000 - actor.auth_time > 300) throw new DeletionError("Sign in again before permanently deleting account data.", 401);
    const { uid } = await context.params, body = await req.json();
    if (body.confirmation !== uid || typeof body.retentionReason !== "string") throw new DeletionError("Enter the exact account reference and retention explanation.", 400);
    if (!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) throw new DeletionError("Storage cleanup is not configured. No deletion was started.", 503);
    return NextResponse.json(await fulfilAccountDeletion({ db: getAdminDb(), auth: getAdminAuth(), bucket: getAdminStorage().bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET), uid, actorUid: actor.uid, retentionReason: body.retentionReason, providerRevocationConfirmed: body.providerRevocationConfirmed === true, externalRecordsReviewed: body.externalRecordsReviewed === true }), { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return failure(e); }
}
