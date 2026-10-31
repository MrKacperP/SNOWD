"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { formatDistanceToNowStrict } from "date-fns";
import { ArrowRight, BadgeCheck, Bell, CheckCheck, ClipboardList, CreditCard, MapPin, MessageSquare, X } from "lucide-react";
import { presentNotification, useNotifications, type NotificationItem } from "@/context/NotificationContext";
import type { NotificationKind } from "@/lib/notificationPresentation";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { UnreadDot } from "@/components/ui/UnreadBadge";

export const KIND_ICONS: Record<NotificationKind, typeof Bell> = {
  message: MessageSquare,
  order: ClipboardList,
  payment: CreditCard,
  account: BadgeCheck,
  invite: MapPin,
};

const timeAgo = (createdAt?: { seconds?: number }) =>
  createdAt?.seconds ? formatDistanceToNowStrict(new Date(createdAt.seconds * 1000), { addSuffix: true }) : "just now";

type Filter = "all" | "action" | "unread";

function NotificationCard({ item, onOpen, prominent = false }: { item: NotificationItem; onOpen: (item: NotificationItem, href?: string) => void; prominent?: boolean }) {
  const view = presentNotification(item);
  const Icon = KIND_ICONS[view.kind];
  return (
    <li>
      <button
        type="button"
        className="nc-card"
        data-kind={view.kind}
        data-unread={!item.read}
        data-prominent={prominent}
        onClick={() => onOpen(item, view.href)}
        aria-label={`${item.read ? "" : "Unread. "}${view.title}. ${view.detail} ${view.href ? view.action : ""}`}
      >
        <span className="nc-icon" aria-hidden="true"><Icon size={18} /></span>
        <span className="nc-content">
          <span className="nc-title-row">
            <span className="nc-title">{view.title}</span>
            {!item.read && <UnreadDot />}
          </span>
          {view.detail && <span className="nc-detail">{view.detail}</span>}
          <span className="nc-meta">{[view.context, timeAgo(item.createdAt)].filter(Boolean).join(" · ")}</span>
          {view.href && <span className="nc-action" aria-hidden="true">{view.action}<ArrowRight size={14} /></span>}
        </span>
      </button>
    </li>
  );
}

/** Slides out of the left toolbar on desktop, bottom sheet on phones. Grouped by what needs the person first. */
export default function NotificationCenter() {
  const { notifications, centerOpen, setCenterOpen, markRead, markAllRead, unreadNotifications, error } = useNotifications();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [sheet, setSheet] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setSheet(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const hidden = reduceMotion ? { opacity: 0 } : sheet ? { opacity: 1, y: "100%" } : { opacity: 1, x: "-105%" };
  useDialogFocus(centerOpen, panelRef);

  useEffect(() => {
    if (!centerOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setCenterOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [centerOpen, setCenterOpen]);

  const withView = notifications.map(item => ({ item, view: presentNotification(item) }));
  const needsYou = withView.filter(({ item, view }) => !item.read && view.needsAction).map(({ item }) => item);
  const fresh = withView.filter(({ item, view }) => !item.read && !view.needsAction).map(({ item }) => item);
  const earlier = withView.filter(({ item }) => item.read).slice(0, 30).map(({ item }) => item);
  const actionCount = needsYou.length;

  const open = (item: NotificationItem, href?: string) => {
    void markRead(item.id);
    if (!href) return;
    setCenterOpen(false);
    router.push(href);
  };

  const sections = [
    { key: "action", label: "Needs your attention", items: needsYou, prominent: true },
    { key: "new", label: "New", items: filter === "action" ? [] : fresh, prominent: false },
    { key: "earlier", label: "Earlier", items: filter === "all" ? earlier : [], prominent: false },
  ].filter(section => section.items.length);

  const summary = actionCount
    ? `${actionCount} ${actionCount === 1 ? "thing needs" : "things need"} your attention`
    : unreadNotifications
      ? `${unreadNotifications} new ${unreadNotifications === 1 ? "update" : "updates"}`
      : "You’re all caught up";

  return (
    <AnimatePresence>
      {centerOpen && (
        <motion.div className="nc-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onClick={() => setCenterOpen(false)}>
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="nc-heading"
            tabIndex={-1}
            className="nc-panel"
            onClick={event => event.stopPropagation()}
            initial={hidden}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={hidden}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
          >
            <header className="nc-header">
              <div className="nc-heading">
                <h2 id="nc-heading">Notifications</h2>
                <p>{summary}</p>
              </div>
              <button type="button" className="nc-close" onClick={() => setCenterOpen(false)} aria-label="Close notifications"><X size={18} /></button>
            </header>

            <div className="nc-filters" role="group" aria-label="Show">
              {([["all", "All", 0], ["action", "Needs action", actionCount], ["unread", "Unread", unreadNotifications]] as const).map(([key, label, count]) => (
                <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>
                  {label}{count > 0 && <span className="nc-filter-count">{count > 9 ? "9+" : count}</span>}
                </button>
              ))}
            </div>

            <div className="nc-body">
              {error && <p role="alert" className="nc-error">{error}</p>}
              {sections.length ? sections.map(section => (
                <section key={section.key} className="nc-section" data-section={section.key} aria-label={section.label}>
                  <h3>{section.label}</h3>
                  <ul>{section.items.map(item => <NotificationCard key={item.id} item={item} prominent={section.prominent} onOpen={open} />)}</ul>
                </section>
              )) : (
                <div className="nc-empty">
                  <span aria-hidden="true"><Bell size={22} /></span>
                  <strong>{filter === "action" ? "Nothing needs you right now" : filter === "unread" ? "No unread updates" : "You’re all caught up"}</strong>
                  <p>Bookings, arrivals, payments and messages will show up here.</p>
                </div>
              )}
            </div>

            {unreadNotifications > 0 && (
              <footer className="nc-footer">
                <button type="button" onClick={() => void markAllRead()}><CheckCheck size={16} />Mark all as read</button>
              </footer>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
