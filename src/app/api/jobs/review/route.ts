import { NextRequest, NextResponse } from "next/server";
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { isObjectionable, OBJECTIONABLE_NOTE } from "@/lib/moderation";
import type { Job } from "@/lib/types";
import { OrderError, orderFailure, orderUser, validId } from "@/lib/workOrderServer";

/**
 * Rates a finished job, from the website or the app. People can't edit each other's profiles, so the
 * reviewee's average rating and review count are worked out here, from every review written about them.
 */
export async function POST(request: NextRequest) {
  try {
    const uid = await orderUser(request);
    const body = await request.json().catch(() => ({}));
    const rating = Number(body.rating);
    const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 500) : "";
    if (!validId(body.jobId)) throw new OrderError("Invalid job.", 400);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new OrderError("Choose a rating from 1 to 5 stars.", 400);
    if (rating < 3 && !comment) throw new OrderError("Tell us what went wrong so we can follow up.", 400);
    if (isObjectionable(comment)) throw new OrderError(OBJECTIONABLE_NOTE, 400);

    const db = getAdminDb();
    const jobId: string = body.jobId;
    const reviewRef = db.doc(`reviews/${jobId}_${uid}`);
    const { job, revieweeId, reviewerName } = await db.runTransaction(async (tx) => {
      const job = (await tx.get(db.doc(`jobs/${jobId}`))).data() as Job | undefined;
      if (!job) throw new OrderError("Job not found.", 404);
      if (uid !== job.clientId && uid !== job.operatorId) throw new OrderError("You can only rate your own jobs.", 403);
      if (job.status !== "completed") throw new OrderError("You can rate a job once it’s done.", 409);
      if ((await tx.get(reviewRef)).exists) throw new OrderError("You’ve already rated this job.", 409);
      const legacy = await tx.get(db.collection("reviews").where("jobId", "==", jobId).where("reviewerId", "==", uid).limit(1));
      if (!legacy.empty) throw new OrderError("You’ve already rated this job.", 409);
      const reviewer = (await tx.get(db.doc(`users/${uid}`))).data();
      const byClient = uid === job.clientId;
      const revieweeId = byClient ? job.operatorId : job.clientId;
      tx.set(reviewRef, {
        jobId,
        reviewerId: uid,
        revieweeId,
        clientId: job.clientId,
        operatorId: job.operatorId,
        reviewerRole: byClient ? "client" : "operator",
        rating,
        comment,
        createdAt: FieldValue.serverTimestamp(),
      });
      if (byClient) tx.update(db.doc(`jobs/${jobId}`), { clientRating: rating, clientReview: comment, updatedAt: FieldValue.serverTimestamp() });
      return { job, revieweeId, reviewerName: String(reviewer?.displayName || "").split(" ")[0] || (byClient ? "Your customer" : "Your shoveler") };
    });

    await refreshRating(db, revieweeId);
    if (job.chatId) {
      const note = `${reviewerName} left a ${rating}-star review.`;
      const now = FieldValue.serverTimestamp();
      await Promise.all([
        db.collection("messages").add({ chatId: job.chatId, jobId, senderId: "system", senderName: "SNOWD", type: "system", content: note, read: false, createdAt: now }),
        db.doc(`chats/${job.chatId}`).update({ lastMessage: note, lastMessageTime: now, lastActivityTime: now, [`unreadCount.${revieweeId}`]: FieldValue.increment(1) }),
      ]).catch((error) => console.error("Review chat note failed", error));
    }
    return NextResponse.json({ ok: true, rating });
  } catch (error) {
    return orderFailure(error);
  }
}

/** Average of every review about this person, the same set their public profile shows. */
async function refreshRating(db: Firestore, uid: string) {
  const [about, legacy] = await Promise.all([
    db.collection("reviews").where("revieweeId", "==", uid).get(),
    db.collection("reviews").where("operatorId", "==", uid).get(),
  ]);
  const ratings = new Map<string, number>();
  about.docs.forEach((d) => ratings.set(d.id, Number(d.data().rating) || 0));
  // Older reviews have no revieweeId; keep the ones customers wrote about the shoveler.
  legacy.docs.forEach((d) => {
    const r = d.data();
    if (!r.revieweeId && r.reviewerRole !== "operator") ratings.set(d.id, Number(r.rating) || 0);
  });
  const values = [...ratings.values()].filter((v) => v >= 1 && v <= 5);
  const average = values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : 0;
  await db.doc(`users/${uid}`).update({ rating: average, reviewCount: values.length });
}
