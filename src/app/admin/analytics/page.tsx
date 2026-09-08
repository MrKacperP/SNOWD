"use client";

import React, { useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AdminCard } from "@/components/admin/AdminUI";
import { dailySeries } from "@/lib/admin/metrics";
import { useAdminData } from "@/components/admin/AdminProvider";

const donutColors = ["#061321", "#E5E7EB"];

export default function AdminAnalyticsPage() {
  const { users, jobs, transactions, supportTickets } = useAdminData();
  const [range, setRange] = useState("Last 30 days");
  const days = Number(range.match(/\d+/)?.[0] || 30);
  const start = new Date(); start.setUTCHours(0, 0, 0, 0); start.setUTCDate(start.getUTCDate() - days + 1);
  const inRange = (date: string) => !!date && new Date(date) >= start && new Date(date) <= new Date();
  const analyticsUsers = dailySeries(users.map(u => ({ date: u.joinDate, value: 1 })), days);
  const analyticsRevenue = dailySeries(transactions.filter(t => t.status === "Completed" && t.type === "Payment").map(t => ({ date: t.date, value: t.amount })), days);
  const categories = jobs.filter(j => inRange(j.datePosted)).reduce<Record<string, number>>((acc, j) => { acc[j.category] = (acc[j.category] || 0) + 1; return acc; }, {});
  const analyticsCategories = Object.entries(categories).map(([category, value]) => ({ category, value }));
  const tickets = supportTickets.filter(t => inRange(t.createdAt || ""));
  const analyticsSupportResolution = [{ name: "Resolved", value: tickets.filter(t => t.status === "Resolved").length }, { name: "Open", value: tickets.filter(t => t.status !== "Resolved").length }];
  const summary = {
      users: analyticsUsers.reduce((sum, item) => sum + item.value, 0),
      jobsByCategory: analyticsCategories.reduce((sum, item) => sum + item.value, 0),
      revenue: analyticsRevenue.reduce((sum, item) => sum + item.value, 0),
      resolution: analyticsSupportResolution.reduce((sum, t) => sum + t.value, 0) ? Math.round(100 * analyticsSupportResolution[0].value / analyticsSupportResolution.reduce((sum, t) => sum + t.value, 0)) : 0,
    };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <select value={range} onChange={(e) => setRange(e.target.value)} className="h-10 px-3 rounded-lg border-[3px] border-[var(--border)] bg-white text-sm">
          <option>Last 7 days</option>
          <option>Last 30 days</option>
          <option>Last 90 days</option>
        </select>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <AdminCard className="p-4 h-[340px]">
          <h3 className="font-semibold text-[var(--ink)]">New Users Over Time</h3>
          <ResponsiveContainer width="100%" height="80%">
            <LineChart data={analyticsUsers}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#061321" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-sm text-[var(--text-muted)]">Summary: {summary.users} new users in selected range.</p>
        </AdminCard>

        <AdminCard className="p-4 h-[340px]">
          <h3 className="font-semibold text-[var(--ink)]">Jobs Posted by Category</h3>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={analyticsCategories}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="category" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#061321" />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-sm text-[var(--text-muted)]">Summary: {summary.jobsByCategory} total jobs across categories.</p>
        </AdminCard>

        <AdminCard className="p-4 h-[340px]">
          <h3 className="font-semibold text-[var(--ink)]">Collected payments (CAD)</h3>
          <ResponsiveContainer width="100%" height="80%">
            <AreaChart data={analyticsRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#061321" fill="#dfeef8" fillOpacity={0.45} />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-sm text-[var(--text-muted)]">Summary: ${summary.revenue.toFixed(2)} collected; excludes holds, released authorizations, and platform fee estimates.</p>
        </AdminCard>

        <AdminCard className="p-4 h-[340px]">
          <h3 className="font-semibold text-[var(--ink)]">Support Ticket Resolution Rate</h3>
          <ResponsiveContainer width="100%" height="80%">
            <PieChart>
              <Pie data={analyticsSupportResolution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90}>
                {analyticsSupportResolution.map((entry, index) => (
                  <Cell key={entry.name} fill={donutColors[index % donutColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <p className="text-sm text-[var(--text-muted)]">Summary: {summary.resolution}% resolved in selected range.</p>
        </AdminCard>
      </div>
    </div>
  );
}
