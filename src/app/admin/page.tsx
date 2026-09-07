"use client";

import React from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Bell, BriefcaseBusiness, MessageSquare, ShieldCheck, Users } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AdminCard, EmptyState, StatusTag } from "@/components/admin/AdminUI";
import { useAdminData } from "@/components/admin/AdminProvider";
import { relativeTime } from "@/lib/admin/utils";

export default function AdminOverviewPage() {
  const { users, jobs, pendingVerificationCount, transactions, activityChart, activityEvents, notifications, openSupportCount, chats } = useAdminData();

  const revenueThisMonth = transactions
    .filter((t) => t.status === "Completed" && t.type === "Payment")
    .reduce((sum, t) => sum + t.amount, 0);

  const statCards = [
    { label: "Total Users", value: String(users.length), trend: 12.4 },
    { label: "Active Jobs", value: String(jobs.filter((j) => j.status === "Open" || j.status === "In Progress").length), trend: 8.1 },
    { label: "Pending Verifications", value: String(pendingVerificationCount), trend: -4.2 },
    { label: "Revenue This Month", value: `$${revenueThisMonth.toFixed(2)}`, trend: 6.8 },
  ];

  const workQueue = [
    { label: "Unread notifications", value: notifications.filter((n) => !n.read).length, href: "/admin", icon: Bell, tone: "text-[#C2410C]" },
    { label: "Verifications to review", value: pendingVerificationCount, href: "/admin/verifications", icon: ShieldCheck, tone: "text-[#0369A1]" },
    { label: "Open support tickets", value: openSupportCount, href: "/admin/support-chats", icon: MessageSquare, tone: "text-[#7C3AED]" },
    { label: "Active conversations", value: chats.length, href: "/admin/chats", icon: Users, tone: "text-[#15803D]" },
  ];

  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-4">
      <header className="pb-1">
        <p className="text-sm text-[var(--text-secondary)]">{greeting}, SNOWD team</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Keep the day moving.</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">A simple view of the people, jobs, messages, and payments that need your attention.</p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const positive = card.trend >= 0;
          return (
            <AdminCard key={card.label} className="p-4">
              <p className="text-sm text-[var(--text-muted)]">{card.label}</p>
              <p className="text-2xl font-semibold mt-2 text-[var(--ink)]">{card.value}</p>
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold">
                {positive ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#16A34A]" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 text-[#DC2626]" />
                )}
                <span className={positive ? "text-[#16A34A]" : "text-[#DC2626]"}>{Math.abs(card.trend)}%</span>
                <span className="text-[var(--text-muted)]">vs last period</span>
              </div>
            </AdminCard>
          );
        })}
      </div>

      <AdminCard className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Command center</p>
            <h2 className="text-lg font-semibold text-[var(--ink)] mt-1">Work that needs attention</h2>
          </div>
          <BriefcaseBusiness className="w-5 h-5 text-[var(--text-muted)]" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {workQueue.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.label} href={item.href} className="rounded-lg border-[3px] border-[var(--border)] bg-[var(--bg-primary)] p-3 hover:border-[var(--accent)] transition-colors">
                <div className="flex items-center justify-between gap-2"><Icon className={`w-4 h-4 ${item.tone}`} /><span className="text-2xl font-semibold text-[var(--ink)]">{item.value}</span></div>
                <p className="text-sm text-[var(--text-secondary)] mt-2">{item.label}</p>
              </Link>
            );
          })}
        </div>
      </AdminCard>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <AdminCard className="p-4 h-[360px]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-[var(--ink)]">Platform Activity (30 days)</h2>
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
            <h2 className="font-semibold text-[var(--ink)]">Recent Activity</h2>
            <Link href="/admin/activity" className="text-xs font-medium text-[var(--accent)]">View all</Link>
          </div>
          <div className="space-y-2 overflow-y-auto max-h-[292px]">
            {activityEvents.slice(0, 10).map((event) => (
              <Link key={event.id} href={event.href} className="flex items-start gap-3 rounded-lg p-2 hover:bg-[var(--bg-primary)]">
                <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] text-[var(--accent)] flex items-center justify-center text-xs font-bold shrink-0">
                  {event.userAvatar}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-[var(--ink)]">
                    <span className="font-semibold">{event.userName}</span> {event.description}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{relativeTime(event.timestamp)}</p>
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
