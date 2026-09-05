"use client";

import { useEffect, useState } from "react";

/** Keep rolling date filters current while an admin leaves a page open. */
export function useCurrentTime() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
