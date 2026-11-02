import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { orderFailure, OrderError, orderUser, validId } from "@/lib/workOrderServer";
import type { OperatorProfile, ServiceType } from "@/lib/types";

export type ProfileReview = { id: string; rating: number; comment: string; createdAt: number | null; reviewer: string };
export type ProfileJob = { id: string; serviceTypes: ServiceType[]; city: string; completedAt: number | null; rating: number | null };

const millis = (value: unknown) => {
  if (value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") return value.toMillis() as number;
  const parsed = typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
};
const firstName = (name: unknown) => typeof name === "string" && name.trim() ? name.trim().split(/\s+/)[0] : "Client";

/**
 * An operator's public track record: reviews about them and their completed jobs.
 * Reviews and jobs are private to their participants in Firestore, so visitors read them here, without addresses.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ uid: string }> }) {
  try {
    const viewer = await orderUser(request);
    const { uid } = await context.params;
    if (!validId(uid)) throw new OrderError("Profile not found.", 404);
    const db = getAdminDb();
    const [operatorSnap, viewerSnap] = await Promise.all([db.doc(`users/${uid}`).get(), db.doc(`users/${viewer}`).get()]);
    const operator = operatorSnap.data() as OperatorProfile | undefined;
    if (operator?.role !== "operator") throw new OrderError("Profile not found.", 404);
    const viewerRole = viewerSnap.data()?.role;
    if (viewer !== uid && !["admin", "employee"].includes(viewerRole) && operator.idVerified !== true) throw new OrderError("Profile not available.", 403);

    const [reviewSnap, legacySnap, jobSnap] = await Promise.all([
      db.collection("reviews").where("revieweeId", "==", uid).limit(50).get(),
      db.collection("reviews").where("operatorId", "==", uid).limit(50).get(),
      db.collection("jobs").where("operatorId", "==", uid).where("status", "==", "completed").limit(60).get(),
    ]);
    // Older reviews have no revieweeId; only keep the ones written about the operator.
    const reviewDocs = new Map(reviewSnap.docs.map(d => [d.id, d]));
    legacySnap.docs.forEach(d => { const r = d.data(); if (!r.revieweeId && r.reviewerRole !== "operator") reviewDocs.set(d.id, d); });
    const reviewerIds = [...new Set([...reviewDocs.values()].map(d => d.data().reviewerId || d.data().clientId).filter(validId))];
    const reviewers = reviewerIds.length ? await db.getAll(...reviewerIds.map(id => db.doc(`users/${id}`))) : [];
    const names = new Map(reviewers.map(r => [r.id, firstName(r.data()?.displayName)]));

    const reviews: ProfileReview[] = [...reviewDocs.values()].map(d => {
      const r = d.data();
      return { id: d.id, rating: Number(r.rating) || 0, comment: typeof r.comment === "string" ? r.comment : "", createdAt: millis(r.createdAt), reviewer: names.get(r.reviewerId || r.clientId) || "Client" };
    }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const jobs: ProfileJob[] = jobSnap.docs.map(d => {
      const j = d.data();
      return { id: d.id, serviceTypes: Array.isArray(j.serviceTypes) ? j.serviceTypes : [], city: typeof j.city === "string" ? j.city : "", completedAt: millis(j.completionTime) ?? millis(j.updatedAt), rating: typeof j.clientRating === "number" ? j.clientRating : null };
    }).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)).slice(0, 12);

    return NextResponse.json({ reviews, jobs, completedJobs: Math.max(jobSnap.size, operator.completedJobs || 0) });
  } catch (error) { return orderFailure(error); }
}
