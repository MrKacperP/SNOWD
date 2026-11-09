"use client";
import { useEffect, useState } from "react";
import { RotateCw } from "lucide-react";
import { NativeHaptics } from "@/lib/native";

// Pull distance (after resistance) that reloads the page on release.
const TRIGGER = 70;
const MAX_PULL = 110;
const NO_PULL = "[role=dialog],[aria-modal=true],.conversation-shell,.gm-style,[data-no-pull]";

function scrolledAncestor(target: EventTarget | null) {
  for (let node = target as HTMLElement | null; node && node !== document.body; node = node.parentElement) {
    const overflow = getComputedStyle(node).overflowY;
    if ((overflow === "auto" || overflow === "scroll") && node.scrollTop > 0) return true;
  }
  return false;
}

/** iOS-style pull down at the top of the page to reload it. The web view does not bounce, so this draws its own spinner. */
export default function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let gesture: { x: number; y: number; distance: number; armed: boolean } | null = null;
    const start = (event: TouchEvent) => {
      gesture = null;
      if (event.touches.length !== 1 || window.scrollY > 0) return;
      if ((event.target as Element)?.closest?.(NO_PULL) || document.querySelector('[role="dialog"], [aria-modal="true"]') || scrolledAncestor(event.target)) return;
      gesture = { x: event.touches[0].clientX, y: event.touches[0].clientY, distance: 0, armed: false };
    };
    const move = (event: TouchEvent) => {
      if (!gesture) return;
      const dx = event.touches[0].clientX - gesture.x, dy = event.touches[0].clientY - gesture.y;
      if (dy <= 0 || Math.abs(dx) > dy || window.scrollY > 0) { if (gesture.distance) setPull(0); gesture.distance = 0; return; }
      gesture.distance = Math.min(dy * 0.5, MAX_PULL);
      const armed = gesture.distance >= TRIGGER;
      if (armed && !gesture.armed) void NativeHaptics.impact({ style: "LIGHT" }).catch(() => {});
      gesture.armed = armed;
      setPull(gesture.distance);
    };
    const end = () => {
      const current = gesture;
      gesture = null;
      if (current?.armed) { setRefreshing(true); setPull(TRIGGER); window.location.reload(); }
      else setPull(0);
    };
    document.addEventListener("touchstart", start, { passive: true });
    document.addEventListener("touchmove", move, { passive: true });
    document.addEventListener("touchend", end, { passive: true });
    document.addEventListener("touchcancel", end, { passive: true });
    return () => {
      document.removeEventListener("touchstart", start);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", end);
      document.removeEventListener("touchcancel", end);
    };
  }, []);

  if (!pull && !refreshing) return null;
  const progress = Math.min(pull / TRIGGER, 1);
  return <div className="native-pull" role={refreshing ? "status" : undefined} aria-label={refreshing ? "Refreshing" : undefined} style={{ transform: `translate3d(-50%, ${pull - 44}px, 0)`, opacity: Math.max(progress, 0.2) }}>
    <RotateCw size={20} strokeWidth={2.4} aria-hidden="true" className={refreshing ? "native-pull-spin" : undefined} style={refreshing ? undefined : { transform: `rotate(${progress * 270}deg)` }} />
  </div>;
}
