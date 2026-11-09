"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { ChevronLeft, Menu } from "lucide-react";
import { primaryNavigation } from "@/lib/appNavigation";
import { NativeHaptics } from "@/lib/native";
import { nativeBackDestination } from "@/lib/nativeNavigation";
import type { UserRole } from "@/lib/types";
import styles from "./mobile.module.css";
import GlassRefraction from "@/components/ui/GlassRefraction";

// Movement (px) before a press becomes a scrub across the tabs rather than a tap.
const DRAG_THRESHOLD = 6;

// A horizontal swipe this far (or a quick flick) across a tab page moves to the neighbouring tab.
const SWIPE_DISTANCE = 80;
const SWIPE_FLICK = { distance: 40, speed: 0.5 };
// Starts this close to a screen edge belong to iOS (edge swipe back, Control Center).
const SYSTEM_EDGE = 28;
const NO_SWIPE = "input,textarea,select,[contenteditable],[role=dialog],[aria-modal=true],nav,canvas,iframe,.gm-style,[data-no-swipe]";

type Lens = { x: number; width: number };

// Pages visited in this app session. Navbar remounts per route, so this lives at module scope.
const trail: string[] = [];
function recordVisit(pathname: string) {
  if (trail.at(-1) === pathname) return;
  if (trail.at(-2) === pathname) trail.pop();
  else trail.push(pathname);
}

function scrollsSideways(target: EventTarget | null) {
  for (let node = target as HTMLElement | null; node && node !== document.body; node = node.parentElement) {
    const overflow = getComputedStyle(node).overflowX;
    if ((overflow === "auto" || overflow === "scroll") && node.scrollWidth > node.clientWidth) return true;
  }
  return false;
}

export default function MobileNavigation({ pathname, role, unreadMessages = 0, pendingJobs = 0, unreadNotifications = 0, menuOpen, onOpenMenu }: {
  pathname: string;
  role?: UserRole;
  unreadMessages?: number;
  pendingJobs?: number;
  unreadNotifications?: number;
  menuOpen: boolean;
  onOpenMenu: () => void;
}) {
  const router = useRouter();
  const tick = () => { void NativeHaptics.impact({ style: "LIGHT" }).catch(() => { /* Web has no haptics. */ }); };
  const navRef = useRef<HTMLElement>(null);
  const press = useRef<{ id: number; startX: number; dragging: boolean; index: number } | null>(null);
  const suppressClick = useRef(false);
  const [lens, setLens] = useState<Lens | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  // Holds the lens on a scrubbed-to tab until that route replaces this pathname.
  const [pending, setPending] = useState<{ index: number; from: string } | null>(null);

  const items = primaryNavigation(role).map(item => ({
    ...item,
    count: item.href.includes("messages") ? unreadMessages : item.href.includes("jobs") ? pendingJobs : 0,
  }));
  const activeIndex = items.findIndex(({ href }) => pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`)));
  const onTab = activeIndex >= 0 && items[activeIndex].href === pathname;

  useEffect(() => { recordVisit(pathname); }, [pathname]);

  const goBack = () => {
    if (trail.length > 1) { router.back(); return; }
    const returnTo = new URLSearchParams(window.location.search).get("returnTo");
    router.push(returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : nativeBackDestination(pathname) || "/dashboard");
  };

  // Swipe across a top-level tab page to move to the next or previous tab.
  const previousTab = onTab ? items[activeIndex - 1]?.href ?? "" : "";
  const nextTab = onTab ? items[activeIndex + 1]?.href ?? "" : "";
  useEffect(() => {
    if (!onTab || !window.matchMedia("(max-width: 1023px)").matches) return;
    const content = document.getElementById("dashboard-content");
    let swipe: { x: number; y: number; time: number; axis: "x" | "y" | null; dx: number } | null = null;
    const settle = () => {
      if (!content) return;
      content.style.transition = "transform 260ms cubic-bezier(.2,.9,.25,1), opacity 260ms ease";
      content.style.transform = "";
      content.style.opacity = "";
    };
    const start = (event: TouchEvent) => {
      const touch = event.touches[0];
      swipe = null;
      if (event.touches.length !== 1 || touch.clientX < SYSTEM_EDGE || touch.clientX > window.innerWidth - SYSTEM_EDGE) return;
      if ((event.target as Element)?.closest?.(NO_SWIPE) || document.querySelector('[role="dialog"], [aria-modal="true"]') || scrollsSideways(event.target)) return;
      swipe = { x: touch.clientX, y: touch.clientY, time: event.timeStamp, axis: null, dx: 0 };
    };
    const move = (event: TouchEvent) => {
      if (!swipe || !content) return;
      const touch = event.touches[0];
      const dx = touch.clientX - swipe.x, dy = touch.clientY - swipe.y;
      if (!swipe.axis) {
        if (Math.hypot(dx, dy) < 10) return;
        swipe.axis = Math.abs(dx) > Math.abs(dy) * 1.4 ? "x" : "y";
      }
      if (swipe.axis !== "x") return;
      event.preventDefault();
      swipe.dx = dx;
      const target = dx < 0 ? nextTab : previousTab;
      const shift = dx * (target ? 0.35 : 0.08);
      content.style.transition = "none";
      content.style.transform = `translate3d(${shift}px,0,0)`;
      content.style.opacity = target ? String(1 - Math.min(Math.abs(dx) / 900, 0.25)) : "";
    };
    const end = (event: TouchEvent) => {
      const current = swipe;
      swipe = null;
      if (!current || current.axis !== "x") return;
      const distance = Math.abs(current.dx), speed = distance / Math.max(1, event.timeStamp - current.time);
      const target = current.dx < 0 ? nextTab : previousTab;
      settle();
      if (target && (distance > SWIPE_DISTANCE || (distance > SWIPE_FLICK.distance && speed > SWIPE_FLICK.speed))) {
        tick();
        router.push(target);
      }
    };
    document.addEventListener("touchstart", start, { passive: true });
    document.addEventListener("touchmove", move, { passive: false });
    document.addEventListener("touchend", end, { passive: true });
    document.addEventListener("touchcancel", settle, { passive: true });
    return () => {
      document.removeEventListener("touchstart", start);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", end);
      document.removeEventListener("touchcancel", settle);
      if (content) { content.style.transform = ""; content.style.opacity = ""; content.style.transition = ""; }
    };
  }, [onTab, previousTab, nextTab, router]);

  const restingIndex = menuOpen ? items.length : pending?.from === pathname ? pending.index : activeIndex;

  const tabs = useCallback(() => Array.from(navRef.current?.querySelectorAll<HTMLElement>("[data-tab]") ?? []), []);
  const lensFor = useCallback((index: number): Lens | null => {
    const tab = tabs()[index];
    return tab ? { x: tab.offsetLeft, width: tab.offsetWidth } : null;
  }, [tabs]);
  const indexAt = useCallback((clientX: number) => {
    const all = tabs();
    let best = 0, bestDistance = Infinity;
    all.forEach((tab, index) => {
      const rect = tab.getBoundingClientRect();
      const distance = Math.abs(clientX - (rect.left + rect.width / 2));
      if (distance < bestDistance) { best = index; bestDistance = distance; }
    });
    return best;
  }, [tabs]);

  // The lens rests under the current tab and re-measures on rotation/resize.
  useLayoutEffect(() => {
    if (dragging) return;
    const place = () => setLens(restingIndex >= 0 ? lensFor(restingIndex) : null);
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [restingIndex, dragging, lensFor, items.length]);

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    press.current = { id: event.pointerId, startX: event.clientX, dragging: false, index: indexAt(event.clientX) };
    setPressed(true);
    setHoverIndex(press.current.index);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const current = press.current, nav = navRef.current;
    if (!current || current.id !== event.pointerId || !nav) return;
    if (!current.dragging) {
      if (Math.abs(event.clientX - current.startX) < DRAG_THRESHOLD) return;
      current.dragging = true;
      setDragging(true);
      // Capture only once scrubbing starts so ordinary taps still click their link.
      try { nav.setPointerCapture(event.pointerId); } catch { /* Pointer already released. */ }
    }
    const bounds = nav.getBoundingClientRect();
    const width = lensFor(current.index)?.width ?? bounds.width / Math.max(1, items.length + 1);
    const x = Math.min(Math.max(event.clientX - bounds.left - width / 2, 4), bounds.width - width - 4);
    setLens({ x, width });
    const index = indexAt(event.clientX);
    if (index !== current.index) { current.index = index; setHoverIndex(index); tick(); }
  };

  const finish = (event: ReactPointerEvent<HTMLElement>, cancelled: boolean) => {
    const current = press.current;
    if (!current || current.id !== event.pointerId) return;
    press.current = null;
    setPressed(false);
    setHoverIndex(null);
    if (!current.dragging) return;
    setDragging(false);
    suppressClick.current = true;
    if (cancelled) return;
    setLens(lensFor(current.index));
    const target = items[current.index];
    if (target) { if (target.href !== pathname) { setPending({ index: current.index, from: pathname }); router.push(target.href); } }
    else onOpenMenu();
  };

  return <>{!onTab && <button type="button" data-app-back className={styles.backButton} onClick={goBack} aria-label="Back"><ChevronLeft size={24} strokeWidth={2.2} aria-hidden="true" /></button>}<nav
    ref={navRef}
    className={styles.bottomNav}
    aria-label="Primary navigation"
    data-dragging={dragging || undefined}
    data-pressed={pressed || undefined}
    onPointerDown={onPointerDown}
    onPointerMove={onPointerMove}
    onPointerUp={event => finish(event, false)}
    onPointerCancel={event => finish(event, true)}
    onClickCapture={event => { if (suppressClick.current) { suppressClick.current = false; event.preventDefault(); event.stopPropagation(); } }}
  >
    <GlassRefraction />
    {lens && <span className={styles.navLens} aria-hidden="true" style={{ width: lens.width, transform: `translate3d(${lens.x}px,0,0)` }} />}
    {items.map(({ href, label, icon: Icon, count, tour }, index) => {
      const active = index === activeIndex;
      return <Link data-tab data-tour={tour} data-hover={hoverIndex === index || undefined} key={href} href={href} draggable={false} aria-current={active ? "page" : undefined} aria-label={count ? `${label}, ${count} ${label === "Jobs" ? "awaiting attention" : "unread"}` : label}>
        <span className={styles.navIcon}><Icon size={22} strokeWidth={active ? 2 : 1.7} aria-hidden="true" />{count > 0 && <span key={count} className={`${styles.badge} unread-pop`} aria-hidden="true">{count > 9 ? "9+" : count}</span>}</span><span className={styles.navLabel}>{label}</span>
      </Link>;
    })}
    <button data-tab data-hover={hoverIndex === items.length || undefined} data-tour="profile-menu" className={styles.moreButton} type="button" onClick={onOpenMenu} aria-expanded={menuOpen} aria-controls="mobile-account-menu" aria-label={unreadNotifications ? `More: notifications and account, ${unreadNotifications} unread` : "More account options"}>
      <span className={styles.navIcon}><Menu size={22} strokeWidth={1.7} aria-hidden="true" />{unreadNotifications > 0 && <span key={unreadNotifications} className={`${styles.badge} unread-pop`} aria-hidden="true">{unreadNotifications > 9 ? "9+" : unreadNotifications}</span>}</span><span className={styles.navLabel}>More</span>
    </button>
  </nav></>;
}
