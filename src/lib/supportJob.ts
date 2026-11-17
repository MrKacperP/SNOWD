import { SERVICE_LABELS, type Job, type ServiceType } from "@/lib/types";
import { dateMillis, isOpenOrder, orderLabel, orderNumber } from "@/lib/workOrders";

/** A job a customer attached to a support message, so the team can open it as the ticket's context. */
export type SupportJobRef = {
  jobId: string;
  orderNumber: string;
  title: string;
  address: string;
  status: string;
  statusLabel: string;
};

/**
 * The jobs worth offering in the support composer: every open job (newest first, at most three),
 * or, when nothing is open, just the most recent past job.
 */
export function supportJobChoices(jobs: Job[]): { jobs: Job[]; active: boolean } {
  const newest = [...jobs].sort((a, b) => dateMillis(b.updatedAt || b.createdAt) - dateMillis(a.updatedAt || a.createdAt));
  const open = newest.filter((job) => isOpenOrder(job));
  if (open.length) return { jobs: open.slice(0, 3), active: true };
  return { jobs: newest.slice(0, 1), active: false };
}

export function supportJobTitle(job: Pick<Job, "serviceTypes">) {
  const services = (job.serviceTypes || []).map((s) => SERVICE_LABELS[s as ServiceType] || s).filter(Boolean);
  return services.length ? services.join(", ") : "Snow clearing";
}

export function supportJobRef(job: Job): SupportJobRef {
  return {
    jobId: job.id,
    orderNumber: orderNumber(job),
    title: supportJobTitle(job),
    address: [job.address, job.city].filter(Boolean).join(", "),
    status: job.status,
    statusLabel: orderLabel(job),
  };
}

/** The line added to the message text, so the job is readable anywhere the plain text shows. */
export const supportJobLine = (ref: SupportJobRef) => `About order #${ref.orderNumber} · ${ref.title} · ${ref.statusLabel}`;

/** Reads a job reference back out of a Firestore message, ignoring anything malformed. */
export function readSupportJobRef(value: unknown): SupportJobRef | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.jobId !== "string" || !v.jobId) return null;
  const s = (key: string) => (typeof v[key] === "string" ? (v[key] as string) : "");
  return { jobId: v.jobId, orderNumber: s("orderNumber") || v.jobId, title: s("title"), address: s("address"), status: s("status"), statusLabel: s("statusLabel") };
}
