import type { Job } from "./types";

/** Service duration is a proxy for time saved, not measured client labour. */
export function estimatedTimeSaved(jobs: Job[]) {
  return jobs.reduce((minutes, job) => job.status === "completed" && Number.isFinite(job.estimatedDuration) && job.estimatedDuration > 0 ? minutes + job.estimatedDuration : minutes, 0);
}

export function timeSavedLabel(minutes: number) {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60), remainder = Math.round(minutes % 60);
  return `${hours} hr${remainder ? ` ${remainder} min` : ""}`;
}

export function arrivalLabel(job?: Job, now = Date.now()) {
  if (!job) return "Your home";
  if (job.status === "in-progress") return "Clearing now";
  if (job.status === "completed") return "All clear";
  if (job.status === "cancelled") return "Visit cancelled";
  if (job.status !== "en-route") return job.status === "accepted" ? "ETA when on the way" : "Awaiting confirmation";
  const value = job.estimatedArrivalAt as unknown;
  const date = value instanceof Date ? value : value && typeof value === "object" && "seconds" in value ? new Date(Number(value.seconds) * 1000) : typeof value === "string" ? new Date(value) : null;
  if (date && Number.isFinite(date.getTime())) {
    const minutes = Math.ceil((date.getTime() - now) / 60000);
    const time = date.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" });
    return minutes > 0 ? `ETA ${time} · ~${minutes} min` : `ETA ${time}`;
  }
  return Number.isFinite(job.eta) && job.eta! > 0 ? `~${job.eta} min · last estimate` : "ETA updating";
}
