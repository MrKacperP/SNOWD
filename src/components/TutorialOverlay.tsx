"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { motion, AnimatePresence } from "framer-motion";
import { BriefcaseBusiness, CalendarDays, Check, ChevronLeft, ChevronRight, Compass, Home, LifeBuoy, MessageSquare, MousePointerClick, Search, UserRound, X } from "lucide-react";
import { useWeather } from "@/context/WeatherContext";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";

const TUTORIAL_KEY = "snowd-guided-tour-v2";
const TOOLTIP_WIDTH = 340;

interface TourStep {
  id: string;
  title: string;
  description: string;
  selector?: string;
  action: string;
  icon: React.ComponentType<{ className?: string }>;
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
  const { locationPromptOpen } = useWeather();
  const pathname = usePathname();
  const isStaff = profile?.role === "admin" || profile?.role === "employee";

  const [visible, setVisible] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(visible && !isStaff && !locationPromptOpen, dialogRef);
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
          action: "Compare distance, price, ratings, and payment options before you request help.",
          icon: Search,
        }
      : {
          id: "jobs",
          title: "Manage your work orders",
          description: "Use Work orders to review requests and track active work.",
          selector: "[data-tour='nav-jobs']",
          action: "Open a work order to accept it, update progress, and complete the job.",
          icon: BriefcaseBusiness,
        };

    return [
      {
        id: "welcome",
        title: "Quick app tour",
        description: "This walkthrough points to key controls so you can learn the app layout quickly.",
        action: "Use Next and Back to explore. Nothing will be changed while you take the tour.",
        icon: Compass,
      },
      {
        id: "home",
        title: "Home dashboard",
        description: "This is your Home tab for daily activity and key updates.",
        selector: "[data-tour='nav-home']",
        action: "Start here to see what needs attention today.",
        icon: Home,
      },
      primaryStep,
      {
        id: "messages",
        title: "Messages",
        description: "Open Messages to chat with operators or clients in real time.",
        selector: "[data-tour='nav-messages']",
        action: "Messages stay in time order and keep each job conversation together.",
        icon: MessageSquare,
      },
      {
        id: "calendar",
        title: "Calendar",
        description: "Use Calendar for weather and schedule visibility.",
        selector: "[data-tour='nav-calendar']",
        action: "Check scheduled and ASAP work before planning your day.",
        icon: CalendarDays,
      },
      {
        id: "profile",
        title: "Profile menu",
        description: "Access your profile, settings, and online status here.",
        selector: "[data-tour='profile-menu']",
        action: "Open More on mobile, or your account card on desktop, to reach Settings.",
        icon: UserRound,
      },
      {
        id: "support",
        title: "Support",
        description: "Need help? Use the floating support button to chat with the team.",
        selector: "[data-tour='support-chat']",
        action: "Tap this whenever you need help from the SNOWD team.",
        icon: LifeBuoy,
      },
    ];
  }, [isClient]);

  const dismiss = useCallback(() => {
    try { localStorage.setItem(TUTORIAL_KEY, "shown"); } catch { /* Optional preference. */ }
    setVisible(false);
  }, []);

  useEffect(() => {
    const start = () => { setStep(0); setVisible(true); };
    window.addEventListener("snowd:start-tour", start);
    return () => window.removeEventListener("snowd:start-tour", start);
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

  const next = () => {
    if (step === steps.length - 1) {
      dismiss();
      return;
    }
    setStep(value => value + 1);
  };

  const prev = () => {
    setStep(value => Math.max(0, value - 1));
  };

  const current = steps[step];
  const StepIcon = current.icon;
  const hasTarget = !!(current?.selector && targetRect);

  const tooltipStyle: React.CSSProperties = useMemo(() => {
    if (!hasTarget || !targetRect) {
      return {};
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = Math.min(TOOLTIP_WIDTH, viewportWidth - 20);
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
      maxHeight: viewportHeight - top - 10,
      overflowY: "auto",
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

  if (isStaff || locationPromptOpen) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Quick app tour"
          tabIndex={-1}
          onKeyDown={event => { if (event.key === "Escape") dismiss(); }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[140]"
        >
          <div className="absolute inset-0 bg-[rgba(11,18,32,0.52)] backdrop-blur-[2px]" />

          {hasTarget && (
            <motion.div
              key={`${current.id}-highlight`}
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
            key={`${current.id}-tooltip`}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className={hasTarget ? "fixed" : "fixed inset-0 flex items-center justify-center p-4"}
            style={hasTarget ? tooltipStyle : undefined}
          >
            <div className="w-full max-h-[calc(100dvh-2rem)] overflow-y-auto max-w-[380px] bg-[var(--bg-card-solid)] border-[3px] border-[var(--border)] rounded-2xl shadow-[var(--surface-shadow)] p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center shrink-0 mt-0.5">
                  <StepIcon className="h-[18px] w-[18px]" />
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
                  className="min-h-11 min-w-11 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition"
                  aria-label="Skip tutorial"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-3" aria-label={`${current.title} example`}>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--accent)] shadow-sm">
                    <StepIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="h-2.5 w-2/3 rounded-full bg-[var(--ink)]/15" />
                    <div className="mt-2 h-2 w-5/6 rounded-full bg-[var(--ink)]/8" />
                  </div>
                  <MousePointerClick className="h-5 w-5 shrink-0 text-[var(--accent)]" />
                </div>
                <p className="mt-3 text-xs font-medium leading-5 text-[var(--text-secondary)]">{current.action}</p>
              </div>

              <div className="mt-4 flex items-center justify-center gap-1.5" aria-label={`Tour progress: step ${step + 1} of ${steps.length}`}>
                {steps.map((item, index) => (
                  <button key={item.id} type="button" onClick={() => setStep(index)} aria-label={`Go to step ${index + 1}: ${item.title}`} aria-current={index === step ? "step" : undefined} className={`flex h-6 min-h-6 items-center justify-center rounded-full transition-all ${index === step ? "w-8 bg-[var(--accent)] text-white" : index < step ? "w-6 bg-[var(--accent-soft)] text-[var(--accent)]" : "w-6 bg-[var(--border-soft)] text-transparent"}`}>
                    {index < step ? <Check className="h-3 w-3" /> : index === step ? <span className="text-[10px] font-bold">{index + 1}</span> : <span aria-hidden="true">•</span>}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={prev}
                  disabled={step === 0}
                  className="min-w-11 min-h-11 rounded-xl border-[3px] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Previous step"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={next}
                  className="flex-1 min-h-11 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white font-semibold text-sm transition inline-flex items-center justify-center gap-1.5"
                >
                  {step === steps.length - 1 ? "Finish" : "Next"}
                  {step !== steps.length - 1 && <ChevronRight className="w-4 h-4" />}
                </button>
              </div>

              {step < steps.length - 1 && (
                <button
                  onClick={dismiss}
                  className="min-h-11 w-full mt-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition"
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
