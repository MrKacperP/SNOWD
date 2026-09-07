import { Job } from "@/lib/types";

export function cashConfirmationError(job: Pick<Job, "operatorId" | "paymentMethod" | "stripePaymentIntentId" | "status" | "price">, uid: string): string | null {
  if (job.operatorId !== uid) return "Only the assigned operator can confirm cash received.";
  if (job.paymentMethod !== "cash" || job.stripePaymentIntentId) return "This is not a cash job.";
  if (!["in-progress", "completed"].includes(job.status)) return "Start the work before confirming cash received.";
  if (!Number.isFinite(job.price) || job.price <= 0) return "The job amount is invalid.";
  return null;
}
