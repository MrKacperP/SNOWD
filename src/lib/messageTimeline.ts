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
