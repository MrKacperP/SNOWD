"use client";

import { useEffect } from "react";

// Only actions explicitly marked by a screen can receive the moving shine.
const candidateSelector = ".action-shine";

export default function PrimaryActionShine() {
  useEffect(() => {
    let frame = 0;
    let active: HTMLElement | null = null;

    const update = () => {
      frame = 0;
      const candidates = Array.from(document.querySelectorAll<HTMLElement>(candidateSelector));
      const visible = candidates.filter((element) => {
        if (element.matches(":disabled, [aria-disabled='true']")) return false;
        const style = getComputedStyle(element);
        if (style.display === "none" || style.visibility !== "visible") return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
      });
      const dialogs = Array.from(document.querySelectorAll<HTMLElement>("[role='dialog'], dialog[open]")).filter((element) => {
        const style = getComputedStyle(element);
        return style.display !== "none" && style.visibility === "visible" && element.getClientRects().length > 0;
      });
      const topDialog = dialogs.at(-1);
      const choices = topDialog ? visible.filter((element) => topDialog.contains(element)) : visible;
      const next = choices[0] ?? null;

      if (active === next) return;
      active?.removeAttribute("data-shine-active");
      next?.setAttribute("data-shine-active", "true");
      active = next;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "style", "disabled", "hidden", "open", "aria-hidden"] });
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    schedule();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
      active?.removeAttribute("data-shine-active");
    };
  }, []);

  return null;
}
