"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Bell, BriefcaseBusiness, CreditCard, MessageSquare, ShieldCheck, Users } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AdminCard, EmptyState, StatusTag } from "@/components/admin/AdminUI";
import type { useAdminData } from "@/components/admin/AdminProvider";
import { relativeTime } from "@/lib/admin/utils";

type OverviewData = Pick<ReturnType<typeof useAdminData>, "users" | "jobs" | "pendingVerificationCount" | "transactions" | "activityChart" | "activityEvents" | "notifications" | "openSupportCount" | "chats">;

export default function AdminOverview({ data }: { data: OverviewData }) {
  const { users, jobs, pendingVerificationCount, transactions, activityChart, activityEvents, notifications, openSupportCount, chats } = data;

  const revenueThisMonth = transactions
    .filter((t) => t.status === "Completed" && t.type === "Payment" && t.date.slice(0, 7) === new Date().toISOString().slice(0, 7))
    .reduce((sum, t) => sum + t.amount, 0);

  const statCards = [
    { label: "Accounts", value: String(users.length), icon: Users, tone: "sage", href: "/admin/users" },
    { label: "Active jobs", value: String(jobs.filter((j) => j.status === "Open" || j.status === "In Progress").length), icon: BriefcaseBusiness, tone: "blue", href: "/admin/jobs" },
    { label: "Awaiting review", value: String(pendingVerificationCount), icon: ShieldCheck, tone: "amber", href: "/admin/verifications" },
    { label: "Collected this month (CAD)", value: `$${revenueThisMonth.toFixed(2)}`, icon: CreditCard, tone: "sage", href: "/admin/transactions" },
  ];

  const workQueue = [
    { label: "Unread notifications", value: notifications.filter((n) => !n.read).length, href: "/admin/notifications", icon: Bell, tone: "amber" },
    { label: "Verifications to review", value: pendingVerificationCount, href: "/admin/verifications", icon: ShieldCheck, tone: "blue" },
    { label: "Open support tickets", value: openSupportCount, href: "/admin/support-chats", icon: MessageSquare, tone: "lavender" },
    { label: "Conversations", value: chats.length, href: "/admin/chats", icon: Users, tone: "sage" },
  ];

  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      <header className="admin-overview-heading">
        <p className="text-sm text-[var(--text-secondary)]">{greeting}, SNOWD team</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Keep the day moving.</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">A simple view of the people, jobs, messages, and payments that need your attention.</p>
      </header>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} href={card.href} className="admin-stat admin-card p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3"><span className="admin-icon" data-tone={card.tone}><Icon size={20} aria-hidden="true" /></span><ArrowRight size={16} aria-hidden="true" className="text-[var(--text-muted)]" /></div>
              <p className="text-2xl sm:text-3xl font-semibold mt-4 break-words tabular-nums">{card.value}</p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">{card.label}</p>
            </Link>
          );
        })}
      </div>

      <AdminCard className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-sm text-[var(--text-muted)]">Your work queue</p>
            <h2 className="text-lg font-semibold text-[var(--ink)] mt-1">Work that needs attention</h2>
          </div>
          <BriefcaseBusiness className="w-5 h-5 text-[var(--text-muted)]" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {workQueue.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.label} href={item.href} className="admin-queue-link rounded-xl border border-[var(--border)] p-4">
                <div className="flex items-center justify-between gap-2"><span className="admin-icon" data-tone={item.tone}><Icon size={20} aria-hidden="true" /></span><span className="text-2xl font-semibold text-[var(--ink)]">{item.value}</span></div>
                <p className="text-sm text-[var(--text-secondary)] mt-2">{item.label}</p>
              </Link>
            );
          })}
        </div>
      </AdminCard>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <AdminCard className="p-4 h-[360px]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-[var(--ink)]">Platform activity · 30 days</h2>
            <StatusTag label="Live" tone="green" />
          </div>
          <ResponsiveContainer width="100%" height="88%">
            <AreaChart data={activityChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6B7280" }} />
              <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#36704e" fill="#d9eade" fillOpacity={0.45} />
            </AreaChart>
          </ResponsiveContainer>
        </AdminCard>

        <AdminCard className="p-4 h-[360px]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-[var(--ink)]">Recent activity</h2>
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
