"use client";
import { useEffect, useState } from "react";
import { arrivalLabel } from "@/lib/clientValue";
import type { Job } from "@/lib/types";

export function useArrivalLabel(job?: Job) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (job?.status !== "en-route") return;
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [job?.status]);
  return arrivalLabel(job, now);
}
