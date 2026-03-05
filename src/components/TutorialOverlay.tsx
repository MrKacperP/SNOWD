"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Compass, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";

const TUTORIAL_KEY = "snowd-guided-tour-v2";
const TOOLTIP_WIDTH = 340;

interface TourStep {
  id: string;
  title: string;
  description: string;
  selector?: string;
}

function getVisibleElement(selector: string): HTMLElement | null {
  const elements = Array.from(document.querySelectorAll(selector)) as HTMLElement[];

  for (const el of elements) {
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    if (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      rect.width > 0 &&
      rect.height > 0
    ) {
      return el;
    }
  }

  return null;
}

export default function TutorialOverlay() {
  const { profile } = useAuth();
  const pathname = usePathname();
  const isStaff = profile?.role === "admin" || profile?.role === "employee";

  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const isClient = profile?.role === "client";
  const steps = useMemo<TourStep[]>(() => {
    const primaryStep: TourStep = isClient
      ? {
          id: "find",
          title: "Find nearby help",
          description: "Use Find to browse nearby operators and compare profiles before booking.",
          selector: "[data-tour='nav-find']",
        }
      : {
          id: "jobs",
          title: "Manage your jobs",
          description: "Use Jobs to review incoming requests and track active work.",
          selector: "[data-tour='nav-jobs']",
        };

    return [
      {
        id: "welcome",
        title: "Quick app tour",
        description: "This walkthrough points to key controls so you can learn the app layout quickly.",
      },
      {
        id: "home",
        title: "Home dashboard",
        description: "This is your Home tab for daily activity and key updates.",
        selector: "[data-tour='nav-home']",
      },
      primaryStep,
      {
        id: "messages",
        title: "Messages",
        description: "Open Messages to chat with operators or clients in real time.",
        selector: "[data-tour='nav-messages']",
      },
      {
        id: "calendar",
        title: "Calendar",
        description: "Use Calendar for weather and schedule visibility.",
        selector: "[data-tour='nav-calendar']",
      },
      {
        id: "profile",
        title: "Profile menu",
        description: "Access your profile, settings, and online status here.",
        selector: "[data-tour='profile-menu']",
      },
      {
        id: "support",
        title: "Support",
        description: "Need help? Use the floating support button to chat with the team.",
        selector: "[data-tour='support-chat']",
      },
    ];
  }, [isClient]);

  const dismiss = useCallback(() => {
    localStorage.setItem(TUTORIAL_KEY, "shown");
    setVisible(false);
  }, []);

  useEffect(() => {
    const shown = localStorage.getItem(TUTORIAL_KEY);
    if (!shown) {
      const t = setTimeout(() => setVisible(true), 700);
      return () => clearTimeout(t);
    }
    return undefined;
  }, []);

  const updateTarget = useCallback(() => {
    const current = steps[step];
    if (!current?.selector) {
      setTargetRect(null);
      return;
    }

    const el = getVisibleElement(current.selector);
    if (!el) {
      setTargetRect(null);
      return;
    }

    setTargetRect(el.getBoundingClientRect());
  }, [steps, step]);

  useEffect(() => {
    if (!visible) return;

    const raf = window.requestAnimationFrame(updateTarget);

    const update = () => updateTarget();
    const interval = window.setInterval(update, 220);

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearInterval(interval);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [visible, step, pathname, updateTarget]);

  const findStepInDirection = useCallback((startIndex: number, direction: 1 | -1) => {
    let idx = startIndex;

    while (idx >= 0 && idx < steps.length) {
      const candidate = steps[idx];
      if (!candidate.selector) return idx;
      if (getVisibleElement(candidate.selector)) return idx;
      idx += direction;
    }

    return -1;
  }, [steps]);

  const next = () => {
    const nextIndex = findStepInDirection(step + 1, 1);
    if (nextIndex === -1) {
      dismiss();
      return;
    }
    setStep(nextIndex);
  };

  const prev = () => {
    const prevIndex = findStepInDirection(step - 1, -1);
    if (prevIndex >= 0) {
      setStep(prevIndex);
    }
  };

  const current = steps[step];
  const hasTarget = !!(current?.selector && targetRect);

  const tooltipStyle: React.CSSProperties = useMemo(() => {
    if (!hasTarget || !targetRect) {
      return {};
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = Math.min(TOOLTIP_WIDTH, viewportWidth - 16);
    const padding = 10;

    let left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
    left = Math.max(padding, Math.min(left, viewportWidth - tooltipWidth - padding));

    const spaceBelow = viewportHeight - targetRect.bottom;
    const top = spaceBelow > 220
      ? Math.min(viewportHeight - 170, targetRect.bottom + 14)
      : Math.max(10, targetRect.top - 164);

    return {
      left,
      top,
      width: tooltipWidth,
    };
  }, [hasTarget, targetRect]);

  const highlightStyle: React.CSSProperties = useMemo(() => {
    if (!hasTarget || !targetRect) {
      return {};
    }

    return {
      top: targetRect.top - 6,
      left: targetRect.left - 6,
      width: targetRect.width + 12,
      height: targetRect.height + 12,
    };
  }, [hasTarget, targetRect]);

  if (isStaff) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[140]"
        >
          <div className="absolute inset-0 bg-[rgba(11,18,32,0.52)] backdrop-blur-[2px]" />

          {hasTarget && (
            <motion.div
              key={current.id}
              initial={{ opacity: 0.8 }}
              animate={{ opacity: 1 }}
              className="fixed rounded-2xl border-2 border-[var(--accent)] pointer-events-none"
              style={{
                ...highlightStyle,
                boxShadow: "0 0 0 9999px rgba(11,18,32,0.5), 0 0 0 4px rgba(47,111,237,0.18)",
              }}
            />
          )}

          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className={hasTarget ? "fixed" : "fixed inset-0 flex items-center justify-center p-4"}
            style={hasTarget ? tooltipStyle : undefined}
          >
            <div className="w-full max-w-[340px] bg-[var(--bg-card-solid)] border border-[var(--border)] rounded-2xl shadow-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center shrink-0 mt-0.5">
                  <Compass className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Step {step + 1} of {steps.length}
                  </p>
                  <h2 className="text-[15px] font-bold text-[var(--text-primary)] mt-0.5">{current.title}</h2>
                  <p className="text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed">{current.description}</p>
                </div>
                <button
                  onClick={dismiss}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition"
                  aria-label="Skip tutorial"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={prev}
                  disabled={step === 0}
                  className="w-10 h-10 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Previous step"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={next}
                  className="flex-1 h-10 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white font-semibold text-sm transition inline-flex items-center justify-center gap-1.5"
                >
                  {step === steps.length - 1 ? "Finish" : "Next"}
                  {step !== steps.length - 1 && <ChevronRight className="w-4 h-4" />}
                </button>
              </div>

              {step < steps.length - 1 && (
                <button
                  onClick={dismiss}
                  className="w-full mt-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition"
                >
                  Skip tour
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
