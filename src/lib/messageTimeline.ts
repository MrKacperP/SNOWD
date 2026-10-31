type TimelineMessage = { id: string; createdAt?: unknown; pending?: boolean };

function timestampParts(value: unknown): [number, number] {
  if (value && typeof value === "object" && "seconds" in value) {
    const timestamp = value as { seconds: number; nanoseconds?: number };
    return [timestamp.seconds, timestamp.nanoseconds || 0];
  }
  const milliseconds = value instanceof Date ? value.getTime()
    : typeof value === "string" || typeof value === "number" ? new Date(value).getTime() : NaN;
  return Number.isFinite(milliseconds) ? [Math.floor(milliseconds / 1000), (milliseconds % 1000) * 1e6] : [0, 0];
}

/** One timeline for every sender. Unconfirmed local sends follow committed messages. */
export function orderMessages<T extends TimelineMessage>(messages: T[]): T[] {
  return [...messages].sort((a, b) => {
    if (!!a.pending !== !!b.pending) return a.pending ? 1 : -1;
    if (a.pending && b.pending) return 0;
    const [aSeconds, aNanos] = timestampParts(a.createdAt);
    const [bSeconds, bNanos] = timestampParts(b.createdAt);
    return aSeconds - bSeconds || aNanos - bNanos || a.id.localeCompare(b.id);
  });
}

type TimelineJob = { id: string; status: string; createdAt?: unknown; completionTime?: unknown; cancelledAt?: unknown; updatedAt?: unknown };
export type TimelineItem<M, J> =
  | { kind: "message"; message: M; job?: J }
  | { kind: "order-start"; job: J }
  | { kind: "order-end"; job: J };

const millis = (value: unknown) => { const [s, n] = timestampParts(value); return s * 1000 + n / 1e6; };

/**
 * One conversation per contact, split into work-order sections: each order opens
 * with its card, carries the messages tagged with it, and closes when it ends.
 * Untagged messages sit between sections. The booking-created event is folded into the card.
 */
export function buildTimeline<M extends TimelineMessage & { jobId?: string }, J extends TimelineJob>(
  messages: M[],
  jobs: J[],
): TimelineItem<M, J>[] {
  const byId = new Map(jobs.map((job) => [job.id, job]));
  const ordered = orderMessages(messages).filter((m) => !(m.jobId && m.id === `${m.jobId}-created`));
  const tagged = new Map<string, number[]>();
  for (const m of ordered) if (m.jobId && byId.has(m.jobId) && !m.pending)
    tagged.set(m.jobId, [...(tagged.get(m.jobId) || []), millis(m.createdAt)]);
  // rank: order-start (0) before messages (1) before order-end (2) at equal times.
  const markers: { at: number; rank: number; item: TimelineItem<M, J> }[] = [];
  for (const job of jobs) {
    const times = tagged.get(job.id) || [];
    markers.push({ at: Math.min(millis(job.createdAt) || Infinity, ...times), rank: 0, item: { kind: "order-start", job } });
    if (job.status === "completed" || job.status === "cancelled")
      markers.push({ at: Math.max(millis(job.status === "completed" ? job.completionTime || job.updatedAt : job.cancelledAt || job.updatedAt), ...times), rank: 2, item: { kind: "order-end", job } });
  }
  const timed = ordered.filter((m) => !m.pending).map((message) => ({
    at: millis(message.createdAt), rank: 1,
    item: { kind: "message" as const, message, job: message.jobId ? byId.get(message.jobId) : undefined },
  }));
  const sorted = [...markers, ...timed].sort((a, b) => a.at - b.at || a.rank - b.rank).map((entry) => entry.item);
  return [...sorted, ...ordered.filter((m) => m.pending).map((message) => ({ kind: "message" as const, message, job: message.jobId ? byId.get(message.jobId) : undefined }))];
}
