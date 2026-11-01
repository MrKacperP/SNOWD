"use client";
import { useEffect, useRef, useState } from "react";
import { stripeConnectFetch } from "@/lib/stripeConnectClient";
import { dateMillis } from "@/lib/workOrders";
import type { Job } from "@/lib/types";

/** How long a cancelled or declined order stays on the dashboard once it has been seen. */
export const CANCELLATION_NOTICE_MS = 5000;

/**
 * Cancelled and declined work orders that still belong on the dashboard. The
 * person who cancelled sees it for 5 seconds from that moment; the other party
 * sees it for 5 seconds from when they first open their dashboard. Either way
 * it then clears to Jobs › History.
 */
export function useCancellationNotices(jobs: Job[], uid?: string) {
  const [now, setNow] = useState(() => Date.now());
  const [seenHere, setSeenHere] = useState<Record<string, number>>({});
  const reported = useRef(new Set<string>());
  // The canceller's clock starts here when it just happened; an older one is already past.
  const seenAt = (job: Job) => seenHere[job.id] || (job.cancelledBy === uid
    ? now - dateMillis(job.cancelledAt) > 60000 ? dateMillis(job.cancelledAt) : 0
    : dateMillis(job.cancellationSeenAt));
  const notices = jobs.filter(job => {
    if (job.status !== "cancelled" || !job.cancellationNotice) return false;
    const seen = seenAt(job);
    return !seen || now < seen + CANCELLATION_NOTICE_MS;
  });
  const ownFresh = notices.filter(job => uid && job.cancelledBy === uid && !seenAt(job)).map(job => job.id).join(",");
  useEffect(() => {
    if (!ownFresh) return;
    const at = Date.now();
    setSeenHere(current => ({ ...current, ...Object.fromEntries(ownFresh.split(",").map(id => [id, current[id] || at])) }));
  }, [ownFresh]);
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

  const timed = notices.some(job => seenAt(job));
  useEffect(() => {
    if (!timed) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [timed]);

  return notices;
}
