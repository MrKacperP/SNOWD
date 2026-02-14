"use client";

import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile, Transaction, Job } from "@/lib/types";
import { BarChart3, Users, DollarSign, MapPin, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line } from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

const COLORS = ["#4361EE", "#7C3AED", "#10B981", "#F59E0B", "#EF4444", "#6366F1"];

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [chartType, setChartType] = useState<"area" | "bar" | "line">("area");
  const [timeRange, setTimeRange] = useState(30); // days

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [uSnap, tSnap, jSnap] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "transactions")),
          getDocs(collection(db, "jobs")),
        ]);
        setUsers(uSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
        setTransactions(tSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
        setJobs(jSnap.docs.map(d => ({ id: d.id, ...d.data() } as Job)));
      } catch (error) {
        console.error("Error loading analytics:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const toMs = (t: unknown) => typeof t === "object" && t !== null && "seconds" in t ? (t as { seconds: number }).seconds * 1000 : 0;

  // Revenue over time
  const revenueData = (() => {
    const now = Date.now();
    const days: Record<string, number> = {};
    for (let i = timeRange - 1; i >= 0; i--) {
      const d = format(subDays(now, i), "MMM d");
      days[d] = 0;
    }
    transactions.forEach(tx => {
      if (tx.status !== "paid") return;
      const ms = toMs(tx.createdAt);
      if (ms > now - timeRange * 86400000) {
        const key = format(new Date(ms), "MMM d");
        if (days[key] !== undefined) days[key] += tx.amount || 0;
      }
    });
    return Object.entries(days).map(([date, revenue]) => ({ date, revenue: Math.round(revenue * 100) / 100 }));
  })();

  // User role breakdown
  const roleData = (() => {
    const counts: Record<string, number> = { client: 0, operator: 0, admin: 0 };
    users.forEach(u => { counts[u.role] = (counts[u.role] || 0) + 1; });
    return Object.entries(counts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  })();

  // Jobs by status
  const jobStatusData = (() => {
    const counts: Record<string, number> = {};
    jobs.forEach(j => { counts[j.status] = (counts[j.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  // City distribution
  const cityData = (() => {
    const counts: Record<string, number> = {};
    users.forEach(u => {
      const city = u.city || "Unknown";
      counts[city] = (counts[city] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }));
  })();

  // Summary stats
  const totalRevenue = transactions.filter(t => t.status === "paid").reduce((sum, t) => sum + (t.amount || 0), 0);
  const avgJobValue = transactions.length > 0 ? totalRevenue / transactions.filter(t => t.status === "paid").length : 0;

  const RevenueChart = () => {
    const commonProps = { data: revenueData };
    if (chartType === "bar") {
      return (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="revenue" fill="#4361EE" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }
    if (chartType === "line") {
      return (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="revenue" stroke="#4361EE" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      );
    }
    return (
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Area type="monotone" dataKey="revenue" stroke="#4361EE" fill="#4361EE" fillOpacity={0.15} />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading analytics...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="w-6 h-6 text-[#4361EE]" />
        <h1 className="text-2xl font-bold">Platform Analytics</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Users", value: users.length, icon: <Users className="w-5 h-5" />, color: "bg-blue-50 text-blue-600" },
          { label: "Total Revenue", value: `$${totalRevenue.toFixed(2)}`, icon: <DollarSign className="w-5 h-5" />, color: "bg-green-50 text-green-600" },
          { label: "Total Jobs", value: jobs.length, icon: <MapPin className="w-5 h-5" />, color: "bg-purple-50 text-purple-600" },
          { label: "Avg Job Value", value: `$${avgJobValue.toFixed(2)}`, icon: <TrendingUp className="w-5 h-5" />, color: "bg-amber-50 text-amber-600" },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className={`w-8 h-8 ${stat.color} rounded-lg flex items-center justify-center mb-2`}>{stat.icon}</div>
            <p className="text-xl font-bold">{stat.value}</p>
            <p className="text-xs text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="font-bold">Revenue Over Time</h2>
          <div className="flex gap-2">
            <select value={timeRange} onChange={e => setTimeRange(Number(e.target.value))} className="text-sm border rounded-lg px-3 py-1.5">
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {(["area", "bar", "line"] as const).map(t => (
                <button key={t} onClick={() => setChartType(t)} className={`px-3 py-1 text-xs rounded-md capitalize transition ${chartType === t ? "bg-white text-[#4361EE] font-medium shadow-sm" : "text-gray-500"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
        <RevenueChart />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* User Roles */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-bold mb-4">User Roles</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={roleData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                {roleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Job Status */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-bold mb-4">Jobs by Status</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={jobStatusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#7C3AED" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* City Distribution */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-bold mb-4">Users by City</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={cityData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
            <Tooltip />
            <Bar dataKey="count" fill="#10B981" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
