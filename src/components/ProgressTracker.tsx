"use client";

import React from "react";
import {
  CheckCircle,
  Truck,
  PlayCircle,
  Camera,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { JobStatus } from "@/lib/types";

interface ProgressTrackerProps {
  status: JobStatus;
  paymentStatus?: "pending" | "held" | "paid" | "refunded";
  compact?: boolean;
}

const STEPS = [
  { key: "pending", label: "Requested", icon: Circle, description: "Waiting for operator" },
  { key: "accepted", label: "Accepted", icon: CheckCircle, description: "Operator confirmed" },
  { key: "en-route", label: "En Route", icon: Truck, description: "On the way" },
  { key: "in-progress", label: "In Progress", icon: PlayCircle, description: "Working now" },
  { key: "photo-proof", label: "Photo Proof", icon: Camera, description: "Completion photo" },
  { key: "completed", label: "Completed", icon: CheckCircle2, description: "Job complete" },
];

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  accepted: 1,
  "en-route": 2,
  "in-progress": 3,
  "photo-proof": 4,
  completed: 5,
  cancelled: -1,
};

export default function ProgressTracker({
  status,
  paymentStatus,
  compact = false,
}: ProgressTrackerProps) {
  const currentIndex = STATUS_ORDER[status] ?? 0;

  if (status === "cancelled") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
        <p className="text-red-700 font-semibold">Job Cancelled</p>
        <p className="text-red-500 text-sm mt-1">This job has been cancelled.</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((step, i) => {
          const isComplete = i < currentIndex;
          const isCurrent = i === currentIndex;
          const Icon = step.icon;

          return (
            <React.Fragment key={step.key}>
              <div
                className={`flex items-center gap-1 shrink-0 px-2 py-1 rounded-full text-xs font-medium transition-all ${
                  isComplete
                    ? "bg-green-100 text-green-700"
                    : isCurrent
                    ? "bg-[#246EB9]/15 text-[#246EB9] ring-2 ring-[#246EB9]/30"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                <Icon className="w-3 h-3" />
                <span className="hidden sm:inline">{step.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-4 h-0.5 shrink-0 ${
                    i < currentIndex ? "bg-green-400" : "bg-gray-200"
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#151c24] rounded-xl border border-gray-100 dark:border-[#1e2d3d] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Job Progress</h3>
        {paymentStatus && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              paymentStatus === "held"
                ? "bg-yellow-100 text-yellow-700"
                : paymentStatus === "paid"
                ? "bg-green-100 text-green-700"
                : paymentStatus === "refunded"
                ? "bg-red-100 text-red-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {paymentStatus === "held"
              ? "Payment Held"
              : paymentStatus === "paid"
              ? "Payment Released"
              : paymentStatus === "refunded"
              ? "Refunded"
              : "Awaiting Payment"}
          </span>
        )}
      </div>

      <div className="relative">
        {/* Progress line */}
        <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-gray-200" />
        <div
          className="absolute left-[15px] top-0 w-0.5 bg-[#246EB9] transition-all duration-500"
          style={{
            height: `${Math.min(100, (currentIndex / (STEPS.length - 1)) * 100)}%`,
          }}
        />

        {/* Steps */}
        <div className="space-y-4 relative">
          {STEPS.map((step, i) => {
            const isComplete = i < currentIndex;
            const isCurrent = i === currentIndex;
            const Icon = step.icon;

            return (
              <div key={step.key} className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-all ${
                    isComplete
                      ? "bg-green-500 text-white"
                      : isCurrent
                      ? "bg-[#246EB9] text-white ring-4 ring-[#246EB9]/15"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="pt-1">
                  <p
                    className={`text-sm font-medium ${
                      isComplete
                        ? "text-green-700"
                        : isCurrent
                        ? "text-[#246EB9]"
                        : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p
                    className={`text-xs ${
                      isCurrent ? "text-[#246EB9]" : "text-gray-400"
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
