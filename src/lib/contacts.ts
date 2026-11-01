import { Job } from "@/lib/types";

/** Phone numbers are only shared between a client and an operator once that operator has completed a job for them. */
export function hasCompletedJobWith(jobs: Pick<Job, "status" | "clientId" | "operatorId">[], otherId: string) {
  return jobs.some((job) => job.status === "completed" && (job.clientId === otherId || job.operatorId === otherId));
}

export function telHref(phone?: string) {
  const digits = (phone || "").replace(/[^\d+]/g, "");
  return digits.replace(/\D/g, "").length >= 7 ? `tel:${digits}` : "";
}

export function formatPhone(phone?: string) {
  const digits = (phone || "").replace(/\D/g, "");
  const local = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return local.length === 10 ? `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}` : phone || "";
}

/** WhatsApp-style list time: clock today, "Yesterday", weekday this week, otherwise a short date. */
export function chatListTime(millis: number, now = Date.now()) {
  const date = new Date(millis);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - dayStart.getTime()) / 86_400_000);
  if (days <= 0) return date.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" });
  if (days === 1) return "Yesterday";
  if (days < 7) return date.toLocaleDateString("en-CA", { weekday: "long" });
  return date.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: days > 300 ? "numeric" : undefined });
}
