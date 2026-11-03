import { dateMillis } from "@/lib/workOrders";

export const money = (value: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(value || 0);

export function shortTime(value: unknown) {
  const ms = dateMillis(value);
  if (!ms) return "";
  const date = new Date(ms), now = new Date();
  if (date.toDateString() === now.toDateString())
    return date.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" });
  if (now.getTime() - ms < 6 * 86400000) return date.toLocaleDateString("en-CA", { weekday: "short" });
  return date.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

export const clockTime = (value: unknown) => {
  const ms = dateMillis(value);
  return ms ? new Date(ms).toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" }) : "";
};

export const dayLabel = (value: unknown) => {
  const ms = dateMillis(value);
  if (!ms) return "";
  const date = new Date(ms), today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-CA", { weekday: "long", month: "short", day: "numeric" });
};

export const initials = (name?: string) =>
  (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
