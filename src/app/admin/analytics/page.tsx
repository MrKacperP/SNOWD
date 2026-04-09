"use client";

import React, { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AdminCard } from "@/components/admin/AdminUI";
import { useAdminData } from "@/components/admin/AdminProvider";

const donutColors = ["#3B82F6", "#E5E7EB"];

export default function AdminAnalyticsPage() {
  const {
    analyticsUsers,
    analyticsCategories,
    analyticsRevenue,
    analyticsSupportResolution,
  } = useAdminData();
  const [range, setRange] = useState("Last 30 days");

  const summary = useMemo(() => {
    return {
      users: analyticsUsers[analyticsUsers.length - 1]?.value || 0,
      jobsByCategory: analyticsCategories.reduce((sum, item) => sum + item.value, 0),
      revenue: analyticsRevenue.reduce((sum, item) => sum + item.value, 0),
      resolution: analyticsSupportResolution[0]?.value || 0,
    };
  }, [analyticsCategories, analyticsRevenue, analyticsSupportResolution, analyticsUsers]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <select value={range} onChange={(e) => setRange(e.target.value)} className="h-10 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm">
          <option>Last 7 days</option>
          <option>Last 30 days</option>
          <option>Last 90 days</option>
          <option>Custom</option>
        </select>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <AdminCard className="p-4 h-[340px]">
          <h3 className="font-semibold text-[#1A1A2E]">New Users Over Time</h3>
          <ResponsiveContainer width="100%" height="80%">
            <LineChart data={analyticsUsers}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-sm text-[#6B7280]">Summary: {summary.users} new users in selected range.</p>
        </AdminCard>

        <AdminCard className="p-4 h-[340px]">
          <h3 className="font-semibold text-[#1A1A2E]">Jobs Posted by Category</h3>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={analyticsCategories}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="category" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-sm text-[#6B7280]">Summary: {summary.jobsByCategory} total jobs across categories.</p>
        </AdminCard>

        <AdminCard className="p-4 h-[340px]">
          <h3 className="font-semibold text-[#1A1A2E]">Revenue Over Time</h3>
          <ResponsiveContainer width="100%" height="80%">
            <AreaChart data={analyticsRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#3B82F6" fill="#93C5FD" fillOpacity={0.45} />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-sm text-[#6B7280]">Summary: ${summary.revenue.toFixed(2)} in revenue.</p>
        </AdminCard>

        <AdminCard className="p-4 h-[340px]">
          <h3 className="font-semibold text-[#1A1A2E]">Support Ticket Resolution Rate</h3>
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
          <p className="text-sm text-[#6B7280]">Summary: {summary.resolution}% resolved in selected range.</p>
        </AdminCard>
      </div>
    </div>
  );
}
