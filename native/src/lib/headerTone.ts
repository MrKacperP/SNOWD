import { isOpenOrder, orderActionNeeded } from "@/lib/workOrders";
import type { Job } from "@/lib/types";
import { useAppTheme } from "~/lib/appearance";
import { stepColor } from "~/lib/theme";

/** Which open order deserves the spotlight: one waiting on you, then one underway, then the next one. */
export function spotlight(open: Job[], uid: string) {
  const rank = (j: Job) => (orderActionNeeded(j, uid) ? 0 : j.status === "in-progress" ? 1 : j.status === "en-route" ? 2 : j.status === "accepted" ? 3 : 4);
  return [...open].sort((a, b) => rank(a) - rank(b))[0];
}

export type HeaderTone = { text: string; bar: string };

/**
 * The header colour for a page: the live work order's progress colour (the same one its progress
 * bar uses), or undefined for the theme's blue when nothing is on the go or the setting is off.
 */
export function useLiveHeaderTone(jobs: Job[], uid: string | undefined): HeaderTone | undefined {
  const theme = useAppTheme();
  if (!uid || !theme.jobColouredHeader) return undefined;
  const featured = spotlight(jobs.filter(isOpenOrder), uid);
  return featured ? stepColor(featured.status) : undefined;
}
