"use client";
import { useEffect, useRef, useState } from "react";
import { stripeConnectFetch } from "@/lib/stripeConnectClient";
import { dateMillis } from "@/lib/workOrders";
import type { Job } from "@/lib/types";

/** How long a cancellation stays on the dashboard after the other party first sees it. */
export const CANCELLATION_NOTICE_MS = 7000;

/**
 * Cancelled work orders that still belong on the dashboard. A cancellation stays
 * for both people until the party who did not cancel opens their dashboard; it
 * then clears to history 7 seconds later.
 */
export function useCancellationNotices(jobs: Job[], uid?: string) {
  const [now, setNow] = useState(() => Date.now());
  const [seenHere, setSeenHere] = useState<Record<string, number>>({});
  const reported = useRef(new Set<string>());
  const notices = jobs.filter(job => {
    if (job.status !== "cancelled" || !job.cancellationNotice) return false;
    const seen = seenHere[job.id] || dateMillis(job.cancellationSeenAt);
    return !seen || now < seen + CANCELLATION_NOTICE_MS;
  });
  const unseen = notices.filter(job => uid && job.cancelledBy !== uid && !job.cancellationSeenAt && !seenHere[job.id]).map(job => job.id).join(",");

  useEffect(() => {
    if (!unseen) return;
    const markSeen = () => {
      if (document.visibilityState !== "visible") return;
      const ids = unseen.split(",").filter(id => !reported.current.has(id));
      if (!ids.length) return;
      const at = Date.now();
      setSeenHere(current => ({ ...current, ...Object.fromEntries(ids.map(id => [id, at])) }));
      for (const jobId of ids) {
        reported.current.add(jobId);
        void stripeConnectFetch("/api/jobs/cancellation-seen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId }) }).catch(() => reported.current.delete(jobId));
      }
    };
    markSeen();
    document.addEventListener("visibilitychange", markSeen);
    return () => document.removeEventListener("visibilitychange", markSeen);
  }, [unseen]);

  const timed = notices.some(job => seenHere[job.id] || job.cancellationSeenAt);
  useEffect(() => {
    if (!timed) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [timed]);

  return notices;
}
