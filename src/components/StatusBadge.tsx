"use client";

import React from "react";
import { JobStatus } from "@/lib/types";

const statusConfig: Record<JobStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
  accepted: { label: "Accepted", color: "text-[#4361EE]", bg: "bg-[#4361EE]/10 border-[#4361EE]/20" },
  "en-route": { label: "En Route", color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  "in-progress": { label: "In Progress", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  completed: { label: "Completed", color: "text-green-700", bg: "bg-green-50 border-green-200" },
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
