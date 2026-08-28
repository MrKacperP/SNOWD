"use client";

import React from "react";
import { JobStatus } from "@/lib/types";

const statusConfig: Record<JobStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "text-[#7a4b00]", bg: "bg-[var(--accent-sun-soft)] border-[#f5c58f]" },
  accepted: { label: "Accepted", color: "text-[var(--text-primary)]", bg: "bg-[var(--accent-soft)] border-[var(--border-color)]" },
  "en-route": { label: "En Route", color: "text-[var(--text-primary)]", bg: "bg-[var(--bg-secondary)] border-[var(--border-color)]" },
  "in-progress": { label: "In Progress", color: "text-[var(--text-primary)]", bg: "bg-[var(--bg-secondary)] border-[var(--border-color)]" },
  completed: { label: "Completed", color: "text-[var(--accent-mint)]", bg: "bg-[#eaf7ef] border-[#bde4cb]" },
  cancelled: { label: "Cancelled", color: "text-red-700", bg: "bg-red-50 border-red-200" },
};

export default function StatusBadge({ status }: { status: JobStatus }) {
  const config = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.color}`}
    >
      {config.label}
    </span>
  );
}
