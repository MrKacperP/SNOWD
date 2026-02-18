"use client";

/**
 * PageVisitTracker
 * Fires once per browser session per page change and writes a lightweight
 * site-visit record to `adminNotifications`.
 * Renders nothing — purely a side-effect component.
 */

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { sendAdminNotif } from "@/lib/adminNotifications";

// Pages that are boring/internal and shouldn't spam the feed
const IGNORED_PREFIXES = ["/admin", "/api", "/_next"];

export default function PageVisitTracker() {
  const pathname = usePathname();
  // Track which paths we've already reported this session
  const reportedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!pathname) return;
    if (IGNORED_PREFIXES.some((p) => pathname.startsWith(p))) return;
    if (reportedRef.current.has(pathname)) return;

    reportedRef.current.add(pathname);
    sendAdminNotif({
      type: "visit",
      message: `Page visit: ${pathname}`,
      uid: null,
      meta: {
        path: pathname,
        referrer: typeof document !== "undefined" ? document.referrer || "" : "",
        userAgent:
          typeof navigator !== "undefined"
            ? navigator.userAgent.slice(0, 120)
            : "",
      },
    });
  }, [pathname]);

  return null;
}
