"use client";

import React from "react";
import { JobStatus } from "@/lib/types";

const statusConfig: Record<JobStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
  accepted: { label: "Accepted", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  "en-route": { label: "En Route", color: "text-gray-700", bg: "bg-gray-50 border-gray-200" },
  "in-progress": { label: "In Progress", color: "text-gray-700", bg: "bg-gray-50 border-gray-200" },
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
