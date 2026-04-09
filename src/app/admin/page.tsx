"use client";

import React from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AdminCard, EmptyState, StatusTag } from "@/components/admin/AdminUI";
import { useAdminData } from "@/components/admin/AdminProvider";
import { relativeTime } from "@/lib/admin/utils";

export default function AdminOverviewPage() {
  const { users, jobs, pendingVerificationCount, transactions, activityChart, activityEvents } = useAdminData();

  const revenueThisMonth = transactions
    .filter((t) => t.status === "Completed" && t.type === "Payment")
    .reduce((sum, t) => sum + t.amount, 0);

  const statCards = [
    { label: "Total Users", value: String(users.length), trend: 12.4 },
    { label: "Active Jobs", value: String(jobs.filter((j) => j.status === "Open" || j.status === "In Progress").length), trend: 8.1 },
    { label: "Pending Verifications", value: String(pendingVerificationCount), trend: -4.2 },
    { label: "Revenue This Month", value: `$${revenueThisMonth.toFixed(2)}`, trend: 6.8 },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const positive = card.trend >= 0;
          return (
            <AdminCard key={card.label} className="p-4">
              <p className="text-sm text-[#6B7280]">{card.label}</p>
              <p className="text-2xl font-semibold mt-2 text-[#1A1A2E]">{card.value}</p>
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold">
                {positive ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#16A34A]" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 text-[#DC2626]" />
                )}
                <span className={positive ? "text-[#16A34A]" : "text-[#DC2626]"}>{Math.abs(card.trend)}%</span>
                <span className="text-[#9CA3AF]">vs last period</span>
              </div>
            </AdminCard>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <AdminCard className="p-4 h-[360px]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-[#1A1A2E]">Platform Activity (30 days)</h2>
            <StatusTag label="Live" tone="green" />
          </div>
          <ResponsiveContainer width="100%" height="88%">
            <AreaChart data={activityChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6B7280" }} />
              <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#3B82F6" fill="#93C5FD" fillOpacity={0.45} />
            </AreaChart>
          </ResponsiveContainer>
        </AdminCard>

        <AdminCard className="p-4 h-[360px]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-[#1A1A2E]">Recent Activity</h2>
            <Link href="/admin/activity" className="text-xs font-medium text-[#3B82F6]">View all</Link>
          </div>
          <div className="space-y-2 overflow-y-auto max-h-[292px]">
            {activityEvents.slice(0, 10).map((event) => (
              <Link key={event.id} href={event.href} className="flex items-start gap-3 rounded-lg p-2 hover:bg-[#F9FAFB]">
                <div className="w-8 h-8 rounded-full bg-[#DBEAFE] text-[#3B82F6] flex items-center justify-center text-xs font-bold shrink-0">
                  {event.userAvatar}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-[#1A1A2E]">
                    <span className="font-semibold">{event.userName}</span> {event.description}
                  </p>
                  <p className="text-xs text-[#6B7280] mt-0.5">{relativeTime(event.timestamp)}</p>
                </div>
              </Link>
            ))}
            {activityEvents.length === 0 && <EmptyState title="No activity yet" subtitle="New events will appear here." />}
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
