"use client";

import { JobStatus } from "@/lib/types";
import {
CheckCircle,
CheckCircle2,
Circle,
PlayCircle,
Truck,
} from "lucide-react";

interface ProgressTrackerProps {
  status: JobStatus;
  paymentStatus?: "pending" | "held" | "paid" | "refunded";
  compact?: boolean;
  paymentMethod?: string;
}

const STEPS = [
  { key: "pending", label: "Requested", icon: Circle, description: "Waiting for confirmation" },
  { key: "accepted", label: "Confirmed", icon: CheckCircle, description: "Visit is booked" },
  { key: "en-route", label: "On the way", icon: Truck, description: "Heading to you" },
  { key: "in-progress", label: "Work in progress", icon: PlayCircle, description: "Work is happening now" },
  { key: "completed", label: "Completed", icon: CheckCircle2, description: "Job complete" },
];

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  accepted: 1,
  "en-route": 2,
  "in-progress": 3,
  completed: 4,
  cancelled: -1,
};

export default function ProgressTracker({
  status,
  paymentStatus,
  paymentMethod,
  compact = false,
}: ProgressTrackerProps) {
  const currentIndex = STATUS_ORDER[status] ?? 0;
  const progressRatio = Math.max(0, Math.min(1, currentIndex / (STEPS.length - 1)));

  if (status === "cancelled") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
        <p className="text-red-700 font-semibold">Job Cancelled</p>
        <p className="text-red-500 text-sm mt-1">This job has been cancelled.</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="job-progress-compact" aria-label="Job progress">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
          <p className="font-semibold text-[var(--text-primary)]">{STEPS[currentIndex].label}<span className="ml-2 font-normal text-[var(--text-muted)]">Step {currentIndex + 1} of {STEPS.length}</span></p>
          <p className="text-[var(--text-secondary)]">{STEPS[currentIndex].description}</p>
        </div>
        <ol className="mt-2 flex gap-1.5" aria-label="Job stages">
          {STEPS.map((step, i) => (
            <li key={step.key} className="flex-1" aria-current={i === currentIndex ? "step" : undefined}>
              <div title={step.label} className={`h-1.5 rounded-full ${i <= currentIndex ? "bg-[var(--accent)]" : "bg-[var(--border-color)]"}`} />
              <span className="sr-only">{step.label}: {i < currentIndex ? "done" : i === currentIndex ? "current" : "upcoming"}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card-solid)] p-4">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <h3 className="font-semibold text-sm text-[var(--text-primary)]">Job Progress</h3>
        {paymentStatus && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              paymentStatus === "held"
                ? "bg-yellow-100 text-yellow-700"
                : paymentStatus === "paid"
                ? "bg-green-100 text-green-700"
                : paymentStatus === "refunded"
                ? "bg-red-100 text-red-700"
                : "bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
            }`}
          >
            {paymentStatus === "held"
              ? "Payment Held"
              : paymentStatus === "paid"
              ? "Payment Released"
              : paymentStatus === "refunded"
              ? "Refunded"
              : paymentMethod === "cash" ? (status === "completed" ? "Cash payment pending" : "Cash due after work") : "Awaiting Payment"}
          </span>
        )}
      </div>

      <div className="relative">
        {/* Progress line */}
        <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-[var(--border-color)]" />
        <div
          className="absolute left-[15px] top-4 w-0.5 bg-[var(--accent)] transition-all duration-500"
          style={{
            height: currentIndex <= 0 ? 0 : `calc((100% - 2rem) * ${progressRatio})`,
          }}
        />

        {/* Steps */}
        <div className="space-y-4 relative">
          {STEPS.map((step, i) => {
            const isComplete = i < currentIndex;
            const isCurrent = i === currentIndex;
            const Icon = step.icon;

            return (
              <div key={step.key} aria-current={isCurrent ? "step" : undefined} className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-all ${
                    isComplete
                      ? "bg-[var(--accent-mint)] text-white"
                      : isCurrent
                      ? "bg-[var(--accent)] text-white ring-4 ring-[var(--accent-glow)]"
                      : "bg-[var(--bg-secondary)] text-[var(--text-muted)]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="pt-1">
                  <p
                    className={`text-sm font-medium ${
                      isComplete
                        ? "text-[var(--accent-mint)]"
                        : isCurrent
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    {step.label}{isCurrent && <span className="ml-2 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] text-[var(--text-primary)]">Current</span>}
                  </p>
                  <p
                    className={`text-xs ${
                      isCurrent ? "text-[var(--text-secondary)]" : "text-[var(--text-muted)]"
                    }`}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
