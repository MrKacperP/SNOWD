/** Turns raw notification records into short, plain wording with one clear next step. */

export type NotificationRecord = {
  type?: string;
  title?: string;
  message?: string;
  preview?: string;
  jobId?: string;
  chatId?: string;
  operatorId?: string;
};

export type NotificationKind = "message" | "order" | "payment" | "account" | "invite";

/** Artwork that pictures the specific event, not just its category. */
export type NotificationArt = "request" | "confirmed" | "declined" | "time" | "on-the-way" | "clearing" | "photo" | "done" | "cash" | "card" | "refund" | "cancelled" | "message" | "verified" | "id" | "nearby" | "update";

export type NotificationView = {
  kind: NotificationKind;
  /** What happened, in a few words. */
  title: string;
  /** One line of supporting detail. */
  detail: string;
  /** Button label for the next step. */
  action: string;
  href?: string;
  /** True when the person has to do something. */
  needsAction: boolean;
  /** Order reference such as "Order #1042", when there is one. */
  context?: string;
  art: NotificationArt;
};

type Rule = { match: RegExp; art: NotificationArt; kind?: NotificationKind; title: string | ((m: RegExpMatchArray) => string); detail?: string | ((m: RegExpMatchArray) => string); action: string; needsAction?: boolean; href?: "find" | "order" | "chat" };

// Order event titles written by the work-order API, after the "Order #N · " prefix.
const ORDER_RULES: Rule[] = [
  { art: "request", match: /request sent/i, title: "New job request", detail: "A customer wants to book you. Accept or decline.", action: "Review request", needsAction: true },
  { art: "confirmed", match: /^booking accepted/i, title: "Booking confirmed", detail: "Your operator accepted the visit.", action: "View booking" },
  { art: "declined", match: /^booking declined/i, title: "Booking declined", detail: "This operator can’t take the visit. Book someone else.", action: "Find another", needsAction: true, href: "find" },
  { art: "time", match: /new time proposed/i, title: "New time suggested", detail: "Accept the new time or keep your original request.", action: "Review time", needsAction: true },
  { art: "confirmed", match: /new appointment approved/i, title: "New time confirmed", detail: "The updated visit time is locked in.", action: "View booking" },
  { art: "time", match: /time change declined/i, title: "Original time kept", detail: "The time change was declined. Your first request still stands.", action: "View booking" },
  { art: "time", match: /returned visit to confirmed/i, title: "Visit rescheduled", detail: "The visit is back to confirmed and will happen later.", action: "View booking" },
  { art: "on-the-way", match: /on the way(?:.*?ETA (\d+))?/i, title: "Operator on the way", detail: m => m[1] ? `Arriving in about ${m[1]} min.` : "Your operator is heading over now.", action: "Track arrival" },
  { art: "clearing", match: /^work started/i, title: "Work has started", detail: "Your operator is clearing snow now.", action: "View progress" },
  { art: "photo", match: /completion photo submitted/i, title: "Work done — photo ready", detail: "See the finished result.", action: "See photo" },
  { art: "cash", match: /cash payment due|^cash payment (needed|pending)/i, kind: "payment", title: "Pay your operator", detail: "The job is done. Pay the operator in cash.", action: "Pay in cash", needsAction: true },
  { art: "done", match: /^(work completed|job complete)/i, title: "Job complete", detail: "Your snow clearing is finished.", action: "View summary" },
  { art: "cash", match: /chose cash payment/i, kind: "payment", title: "Customer paying cash", detail: "Collect payment in person after the job.", action: "View order" },
  { art: "card", match: /card payment failed/i, kind: "payment", title: "Card payment failed", detail: "Retry your card or switch to cash to keep the booking.", action: "Fix payment", needsAction: true },
  { art: "card", match: /card payment unavailable/i, kind: "payment", title: "Card not accepted", detail: "This operator takes cash only. Switch to cash or rebook.", action: "Choose payment", needsAction: true },
  { art: "refund", match: /cash refund recorded/i, kind: "payment", title: "Cash refund recorded", detail: "Your operator returned your cash payment.", action: "View payment" },
  { art: "cancelled", match: /cancel/i, title: "Order cancelled", detail: "This visit won’t go ahead.", action: "View details" },
];

const orderRef = (text = "") => text.match(/Order #([\w-]+)/i)?.[0];
const eventText = (text = "") => text.replace(/^Order #[\w-]+\s*·\s*/i, "").trim();
const encode = encodeURIComponent;

export function presentNotification(item: NotificationRecord): NotificationView {
  const orderHref = item.jobId ? `/dashboard/jobs/${encode(item.jobId)}` : undefined;
  const chatHref = item.chatId ? `/dashboard/messages/${encode(item.chatId)}` : undefined;

  if (item.type === "message") {
    const sender = item.title?.match(/^New message from (.+)$/i)?.[1]?.trim();
    return { kind: "message", title: sender ? `${sender} messaged you` : "New message", detail: item.preview || item.message || "", action: "Reply", href: chatHref, needsAction: false, art: "message" };
  }
  if (item.type === "booking-invite") {
    return { kind: "invite", title: "Operator available nearby", detail: item.message || "An operator near you can take bookings.", action: "View operator", href: item.operatorId ? `/dashboard/find?operator=${encode(item.operatorId)}` : "/dashboard/find", needsAction: false, art: "nearby" };
  }
  if (item.type === "account_approved" || /account approved/i.test(item.title || "")) {
    return { kind: "account", title: "You’re verified", detail: "Your ID was approved. Your profile can now receive work.", action: "Go to home", href: "/dashboard", needsAction: false, art: "verified" };
  }
  if (item.type === "account_rejected" || /verification (rejected|needs attention)/i.test(item.title || "")) {
    return { kind: "account", title: "ID needs another look", detail: item.message || "Upload a clearer government ID.", action: "Update ID", href: "/dashboard/settings?tab=verification", needsAction: true, art: "id" };
  }

  const event = eventText(item.title) || eventText(item.message);
  const rule = ORDER_RULES.find(candidate => candidate.match.test(event));
  const context = orderRef(item.title) || orderRef(item.message);
  if (rule) {
    const m = event.match(rule.match)!;
    return {
      kind: rule.kind || (item.type === "payment" ? "payment" : "order"),
      title: typeof rule.title === "function" ? rule.title(m) : rule.title,
      detail: typeof rule.detail === "function" ? rule.detail(m) : rule.detail || "",
      action: rule.action,
      href: rule.href === "find" ? "/dashboard/find" : orderHref || chatHref,
      needsAction: !!rule.needsAction,
      context,
      art: rule.art,
    };
  }
  const detail = item.preview || (item.message && item.message !== item.title ? item.message : "");
  return { kind: item.type === "payment" ? "payment" : item.jobId ? "order" : "account", title: event || "New update", detail, action: orderHref ? "View order" : chatHref ? "Open chat" : "Open", href: orderHref || chatHref, needsAction: false, context, art: "update" };
}
