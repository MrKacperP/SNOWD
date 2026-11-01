"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BadgeCheck, Banknote, BellRing, CalendarCheck, CalendarClock, CalendarX2, Camera, CircleCheckBig, CircleX, ClipboardList, CreditCard, IdCard, MapPin, MessageCircle, Shovel, Truck, Undo2, X, type LucideIcon } from "lucide-react";
import { presentNotification, useNotifications, type NotificationItem } from "@/context/NotificationContext";
import type { NotificationArt } from "@/lib/notificationPresentation";
import IconSwap from "@/components/ui/IconSwap";

const DURATION = 6000;
const ART: Record<NotificationArt, LucideIcon> = {
  request: ClipboardList, confirmed: CalendarCheck, declined: CalendarX2, time: CalendarClock, "on-the-way": Truck,
  clearing: Shovel, photo: Camera, done: CircleCheckBig, cash: Banknote, card: CreditCard, refund: Undo2,
  cancelled: CircleX, message: MessageCircle, verified: BadgeCheck, id: IdCard, nearby: MapPin, update: BellRing,
};
const LABELS = { message: "Message", order: "Work order", payment: "Payment", account: "Account", invite: "Nearby" } as const;

function Banner({ item, more }: { item: NotificationItem; more: number }) {
  const { markRead, dismissToast, setCenterOpen } = useNotifications();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const remaining = useRef(DURATION);
  const view = presentNotification(item);
  const Icon = ART[view.art];

  // Clears itself; hovering, focusing or touching holds it in place.
  useEffect(() => {
    if (paused) return;
    const started = Date.now();
    const timer = window.setTimeout(() => dismissToast(item.id), remaining.current);
    return () => { window.clearTimeout(timer); remaining.current -= Date.now() - started; };
  }, [paused, item.id, dismissToast]);

  const open = () => {
    void markRead(item.id);
    if (view.href) router.push(view.href);
  };

  return (
    <motion.div
      className="drop-banner"
      data-kind={view.kind}
      data-urgent={view.needsAction}
      data-paused={paused}
      initial={reduceMotion ? { opacity: 0 } : { y: "-140%", opacity: 0, scale: 0.94 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { y: "-140%", opacity: 0, scale: 0.96, transition: { duration: 0.22, ease: "easeIn" } }}
      transition={{ type: "spring", stiffness: 460, damping: 34 }}
      drag={reduceMotion ? false : "y"}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.6, bottom: 0.1 }}
      onDragEnd={(_, info) => { if (info.offset.y < -30 || info.velocity.y < -300) dismissToast(item.id); }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      {/* The whole card is a click target; the action button is the keyboard path. */}
      <div className="drop-banner-main" onClick={open}>
        <span className="drop-banner-icon" data-art={view.art} aria-hidden="true"><Icon size={24} strokeWidth={2} /></span>
        <span className="drop-banner-eyebrow">{LABELS[view.kind]}{view.context ? ` · ${view.context}` : ""}</span>
        <span className="drop-banner-title">{view.title}</span>
        {view.detail && <span className="drop-banner-detail">{view.detail}</span>}
      </div>
      <button type="button" className="drop-banner-close" onClick={() => dismissToast(item.id)} aria-label="Dismiss"><X size={15} /></button>
      {(view.href || more > 0) && <div className="drop-banner-footer">
        {view.href && <button type="button" className="drop-banner-action" onClick={open} aria-label={`${view.action}: ${view.title}`}>
          <IconSwap icon={<ArrowRight strokeWidth={2.5} />}>{view.action}</IconSwap>
        </button>}
        {more > 0 && <button type="button" className="drop-banner-more" onClick={() => setCenterOpen(true)}>+{more} more {more === 1 ? "update" : "updates"}</button>}
      </div>}
      <span className="drop-banner-grabber" aria-hidden="true" />
      <span key={item.id} className="drop-banner-timer" aria-hidden="true" style={{ animationDuration: `${DURATION}ms` }} />
    </motion.div>
  );
}

/** Newest live update drops in from the top, one at a time, and clears itself. */
export default function NotificationToasts() {
  const { toasts } = useNotifications();
  const current = toasts[0];
  return (
    <div className="drop-banner-region" aria-live="polite" aria-label="New notification">
      <AnimatePresence mode="wait">
        {current && <Banner key={current.id} item={current} more={toasts.length - 1} />}
      </AnimatePresence>
    </div>
  );
}
