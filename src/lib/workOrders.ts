import { Job } from "@/lib/types";

export function orderNumber(job: Pick<Job, "id" | "orderNumber">) {
  return job.orderNumber || `L-${job.id}`;
}
export function dateMillis(value: unknown): number {
  if (value && typeof value === "object" && "toDate" in value)
    return (value as { toDate(): Date }).toDate().getTime();
  if (value instanceof Date) return value.getTime();
  return typeof value === "string" || typeof value === "number"
    ? new Date(value).getTime()
    : 0;
}
export function isAsap(
  job: Pick<Job, "scheduleMode" | "scheduledTime" | "scheduledDate">,
) {
  return (
    job.scheduleMode === "asap" ||
    job.scheduledTime === "ASAP" ||
    !dateMillis(job.scheduledDate)
  );
}
export function orderLabel(job: Job) {
  if (job.status === "cancelled")
    return job.declinedBy ? "Declined" : "Cancelled";
  if (job.status === "completed") return "Completed";
  if (job.status === "en-route") return "On the way";
  if (job.status === "in-progress") return "Work in progress";
  if (job.status === "pending")
    return job.awaitingResponseFrom === job.clientId
      ? "Awaiting customer"
      : "Awaiting company";
  if (
    job.paymentMethod !== "cash" &&
    !["held", "paid"].includes(job.paymentStatus)
  )
    return "Payment needed";
  return isAsap(job) ? "Booked · ASAP queue" : "Scheduled";
}
export function orderActionNeeded(job: Job, uid: string) {
  if (job.status === "cancelled") return "";
  if (job.status === "completed")
    return job.operatorId === uid && job.paymentMethod === "cash" && job.paymentStatus === "pending"
      ? "Confirm cash payment" : "";
  if (job.scheduleProposal?.recipientId === uid) return "Review proposed time";
  if (job.status === "pending" && !job.scheduleProposal && (job.awaitingResponseFrom || job.operatorId) === uid)
    return "Accept or decline request";
  if (job.status === "accepted" && job.clientId === uid && job.paymentMethod !== "cash" && !["held", "paid"].includes(job.paymentStatus))
    return "Authorize card payment";
  return "";
}
export function orderSection(job: Job, uid: string) {
  if (orderActionNeeded(job, uid)) return "attention";
  if (["completed", "cancelled"].includes(job.status)) return "history";
  if (["en-route", "in-progress"].includes(job.status)) return "progress";
  if (
    job.status === "pending" ||
    job.scheduleProposal?.recipientId === uid ||
    (job.clientId === uid &&
      job.paymentMethod !== "cash" &&
      !["held", "paid"].includes(job.paymentStatus))
  )
    return "attention";
  return "upcoming";
}
export function scheduleText(
  job: Pick<
    Job,
    "scheduleMode" | "scheduledTime" | "scheduledDate" | "scheduleTimezone"
  >,
) {
  if (isAsap(job)) return "ASAP · arrival time to be confirmed";
  const time = dateMillis(job.scheduledDate);
  if (!Number.isFinite(time)) return "Time to be confirmed";
  return (
    new Intl.DateTimeFormat("en-CA", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: job.scheduleTimezone || "America/Toronto",
    }).format(time) + ` (${job.scheduleTimezone || "America/Toronto"})`
  );
}
export function hasScheduleConflict(
  candidate: Pick<
    Job,
    | "id"
    | "scheduledDate"
    | "scheduledTime"
    | "scheduleMode"
    | "estimatedDuration"
  >,
  jobs: Job[],
) {
  if (isAsap(candidate)) return false;
  const start = dateMillis(candidate.scheduledDate),
    end = start + (candidate.estimatedDuration || 45) * 60000;
  return jobs.some(
    (other) =>
      other.id !== candidate.id &&
      ["accepted", "en-route", "in-progress"].includes(other.status) &&
      !isAsap(other) &&
      start <
        dateMillis(other.scheduledDate) +
          (other.estimatedDuration || 45) * 60000 &&
      end > dateMillis(other.scheduledDate),
  );
}
