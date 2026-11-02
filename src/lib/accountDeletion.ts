import { FieldValue, type Firestore, type Query } from "firebase-admin/firestore";
import type { Auth } from "firebase-admin/auth";

type Bucket = { deleteFiles(options: { prefix: string }): Promise<unknown> };
const uploadRoots = ["verification", "id-documents", "transcripts", "avatars", "branding", "portfolio", "property-photos"];
export class DeletionError extends Error { constructor(message: string, public status = 409) { super(message); } }

export async function deletionReview(db: Firestore, auth: Auth, uid: string) {
  const [profile, user, clientJobs, operatorJobs, ownClaims, againstClaims] = await Promise.all([
    db.doc(`users/${uid}`).get(), auth.getUser(uid).catch(error => { if (error.code === "auth/user-not-found") return null; throw error; }),
    db.collection("jobs").where("clientId", "==", uid).get(), db.collection("jobs").where("operatorId", "==", uid).get(),
    db.collection("claims").where("claimantId", "==", uid).get(), db.collection("claims").where("againstId", "==", uid).get(),
  ]);
  const jobs = [...new Map([...clientJobs.docs, ...operatorJobs.docs].map(doc => [doc.id, doc])).values()];
  const claims = [...new Map([...ownClaims.docs, ...againstClaims.docs].map(doc => [doc.id, doc])).values()];
  const activeJobs = jobs.filter(doc => !["completed", "cancelled"].includes(doc.data().status) || doc.data().paymentStatus === "held").map(doc => doc.id);
  const openClaims = claims.filter(doc => !["resolved", "dismissed"].includes(doc.data().status)).map(doc => doc.id);
  return { profile: profile.data(), email: user?.email || profile.data()?.email || "", appleLinked: !!user?.providerData.some(provider => provider.providerId === "apple.com"), jobCount: jobs.length, claimCount: claims.length, activeJobs, openClaims };
}

async function eraseQuery(db: Firestore, query: Query) {
  for (;;) {
    const page = await query.limit(200).get();
    if (page.empty) return;
    const batch = db.batch(); page.docs.forEach(doc => batch.delete(doc.ref)); await batch.commit();
  }
}

/** Only called after an administrator reviews retention and provider revocation.
 * All destructive steps are retryable. The durable request records partial failure;
 * tokens/profile are disabled before removing personal data. No financial records
 * or other participant's messages are deleted by this procedure.
 */
export async function fulfilAccountDeletion({ db, auth, bucket, uid, actorUid, retentionReason, providerRevocationConfirmed, externalRecordsReviewed }: {
  db: Firestore; auth: Auth; bucket: Bucket; uid: string; actorUid: string;
  retentionReason: string; providerRevocationConfirmed: boolean; externalRecordsReviewed: boolean;
}) {
  if (!uid || uid.includes("/") || uid === actorUid) throw new DeletionError("Use a different administrator to process this account.", 400);
  if (!externalRecordsReviewed || retentionReason.trim().length < 20 || retentionReason.length > 2000) throw new DeletionError("Review retention, provider records and legacy data before processing.", 400);
  const request = db.doc(`accountDeletionRequests/${uid}`);
  const existing = (await request.get()).data();
  if (!existing) throw new DeletionError("No account deletion request exists.", 404);
  if (existing.status === "completed") return { status: "completed" };
  const review = await deletionReview(db, auth, uid);
  if (review.profile?.role === "admin" || review.profile?.role === "employee") throw new DeletionError("Transfer staff access and change this account to a customer role first.");
  if (review.activeJobs.length || review.openClaims.length) throw new DeletionError("Resolve active work orders, held payments and open claims before processing. The request remains recorded.");
  if (review.appleLinked && !providerRevocationConfirmed) throw new DeletionError("Verify Sign in with Apple token revocation before processing.");
  await db.runTransaction(async tx => {
    const saved = (await tx.get(request)).data();
    if (saved?.status === "completed") throw new DeletionError("This request has already completed.");
    if (saved?.status === "processing" && saved.leaseUntil > Date.now()) throw new DeletionError("Another deletion process is running. Wait before retrying.");
    tx.update(request, { status: "processing", actorUid, leaseUntil: Date.now() + 10 * 60_000, retentionReason: retentionReason.trim(), providerRevocationConfirmed, externalRecordsReviewed, updatedAt: FieldValue.serverTimestamp() });
    // Firestore/Storage rules consult this tombstone, including for previously
    // minted ID tokens, so deletion cannot be raced by a signed-in client.
    tx.set(db.doc(`accountDeletionTombstones/${uid}`), { createdAt: FieldValue.serverTimestamp() });
    if (review.profile) tx.update(db.doc(`users/${uid}`), { disabled: true });
  });
  try {
    try { await auth.updateUser(uid, { disabled: true }); await auth.revokeRefreshTokens(uid); }
    catch (error) { if ((error as { code?: string }).code !== "auth/user-not-found") throw error; }
    const frozenReview = await deletionReview(db, auth, uid);
    if (frozenReview.activeJobs.length || frozenReview.openClaims.length) throw new DeletionError("A new job or claim appeared during review. Resolve it before retrying.");
    // Exact UID prefixes with a trailing slash cannot touch another user's files.
    for (const root of uploadRoots) await bucket.deleteFiles({ prefix: `${root}/${uid}/` });
    const reviews = await db.collection("reviews").where("reviewerId", "==", uid).get();
    const pendingReviewees = (await request.get()).data()?.pendingReviewees;
    const reviewees = new Set<string>([...(Array.isArray(pendingReviewees) ? pendingReviewees : []), ...reviews.docs.map(doc => doc.data().revieweeId)].filter((id): id is string => typeof id === "string" && !!id && !id.includes("/")));
    // Preserve aggregate repair work before erasing its source reviews so a
    // retry after partial failure can still update affected public ratings.
    await request.update({ pendingReviewees: [...reviewees] });
    for (const [collection, field] of [
      ["notifications", "uid"], ["adminNotifications", "uid"], ["siteVisits", "uid"],
      ["messages", "senderId"], ["reviews", "reviewerId"], ["supportCalls", "callerId"], ["calls", "userId"],
    ]) await eraseQuery(db, db.collection(collection).where(field, "==", uid));
    for (const reviewee of reviewees) {
      if (reviewee === uid) continue;
      const remaining = await db.collection("reviews").where("revieweeId", "==", reviewee).get();
      const ratings = remaining.docs.map(doc => doc.data().rating).filter((rating): rating is number => typeof rating === "number" && rating >= 1 && rating <= 5);
      const target = db.doc(`users/${reviewee}`);
      if ((await target.get()).exists) await target.update({ rating: ratings.length ? ratings.reduce((total, rating) => total + rating, 0) / ratings.length : 0, reviewCount: ratings.length });
    }
    await db.recursiveDelete(db.doc(`supportChats/support_${uid}`));
    await db.recursiveDelete(db.doc(`userBlocks/${uid}`));
    await db.doc(`supportCallLocks/${uid}`).delete();
    const chats = await db.collection("chats").where("participants", "array-contains", uid).get();
    for (const chat of chats.docs) await chat.ref.update({ lastMessage: FieldValue.delete(), [`unreadCount.${uid}`]: FieldValue.delete() });
    const savedBy = await db.collection("users").where("savedOperators", "array-contains", uid).get();
    for (const owner of savedBy.docs) await owner.ref.update({ savedOperators: FieldValue.arrayRemove(uid) });
    const favourites = await db.collection("users").where("favoriteOperatorId", "==", uid).get();
    for (const owner of favourites.docs) await owner.ref.update({ favoriteOperatorId: FieldValue.delete() });
    if (review.email) await db.doc(`accountHistory/${encodeURIComponent(review.email.trim().toLowerCase())}`).delete();
    // Keep the profile until all earlier steps have succeeded, so a retry can
    // still resolve provider identifiers and old email-based records.
    try { await auth.deleteUser(uid); } catch (error) { if ((error as { code?: string }).code !== "auth/user-not-found") throw error; }
    await db.recursiveDelete(db.doc(`users/${uid}`));
    await request.update({ status: "completed", email: FieldValue.delete(), pendingReviewees: FieldValue.delete(), leaseUntil: FieldValue.delete(), completedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), lastError: FieldValue.delete() });
    return { status: "completed" };
  } catch {
    await request.update({ status: "failed", leaseUntil: FieldValue.delete(), lastError: "Personal-data cleanup did not finish. Inspect server diagnostics and retry; the account remains disabled.", updatedAt: FieldValue.serverTimestamp() });
    throw new DeletionError("Cleanup did not finish. The account remains disabled. Retry after resolving the service issue.", 503);
  }
}
