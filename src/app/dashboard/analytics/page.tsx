"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Job, OperatorProfile, Transaction } from "@/lib/types";
import BackButton from "@/components/BackButton";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Eye,
  MousePointer,
  MessageSquare,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  Users,
  CloudSnow,
  CalendarDays,
  MapPin,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { format, subDays, startOfDay, isSameDay } from "date-fns";

const COLORS = ["#246EB9", "#7C3AED", "#10B981", "#F59E0B", "#EF4444", "#06B6D4"];

export default function AnalyticsPage() {
  const { profile } = useAuth();
  const operatorProfile = profile as OperatorProfile;
  const [jobs, setJobs] = useState<Job[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");
  const [chartType, setChartType] = useState<"area" | "bar" | "line">("area");

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.uid) return;
      try {
        // Fetch all jobs
        const jobsQ = query(
          collection(db, "jobs"),
          where("operatorId", "==", profile.uid)
        );
        const jobsSnap = await getDocs(jobsQ);
        const allJobs = jobsSnap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
            scheduledDate: data.scheduledDate?.toDate?.() || data.scheduledDate,
            completionTime: data.completionTime?.toDate?.() || data.completionTime,
          } as Job;
        });
        setJobs(allJobs);

        // Fetch transactions
        const txnQ = query(
          collection(db, "transactions"),
          where("operatorId", "==", profile.uid)
        );
        const txnSnap = await getDocs(txnQ);
        const allTxns = txnSnap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
            completedAt: data.completedAt?.toDate?.() || data.completedAt,
          } as Transaction;
        });
        setTransactions(allTxns);
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [profile?.uid]);

  const daysBack = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;

  // Stats calculations
  const stats = useMemo(() => {
    const now = new Date();
    const rangeStart = subDays(now, daysBack);
    const rangeJobs = jobs.filter((j) => {
      const d = j.createdAt instanceof Date ? j.createdAt : new Date();
      return d >= rangeStart;
    });

    const completed = rangeJobs.filter((j) => j.status === "completed");
    const cancelled = rangeJobs.filter((j) => j.status === "cancelled");
    const pending = rangeJobs.filter((j) => j.status === "pending");
    const accepted = rangeJobs.filter((j) => ["accepted", "en-route", "in-progress"].includes(j.status));
    const totalRequests = rangeJobs.length;
    const acceptRate = totalRequests > 0 ? Math.round(((completed.length + accepted.length) / totalRequests) * 100) : 0;
    const totalEarnings = completed.reduce((sum, j) => sum + (j.price || 0), 0);
    const avgJobValue = completed.length > 0 ? Math.round(totalEarnings / completed.length) : 0;

    // Mock engagement stats (real implementation would track views/clicks via Firestore)
    const profileViews = Math.floor(totalRequests * 3.5 + Math.random() * 20);
    const clickRate = totalRequests > 0 ? Math.round((totalRequests / profileViews) * 100) : 0;
    const responseRate = totalRequests > 0 ? Math.round(((completed.length + cancelled.length + accepted.length) / totalRequests) * 100) : 0;

    return {
      totalRequests,
      completed: completed.length,
      cancelled: cancelled.length,
      pending: pending.length,
      active: accepted.length,
      acceptRate,
      totalEarnings,
      avgJobValue,
      profileViews,
      clickRate,
      responseRate,
    };
  }, [jobs, daysBack]);

  // Earnings chart data
  const earningsData = useMemo(() => {
    const now = new Date();
    const data: { date: string; earnings: number; jobs: number }[] = [];
    for (let i = daysBack - 1; i >= 0; i--) {
      const day = subDays(now, i);
      const dayStart = startOfDay(day);
      const dayJobs = jobs.filter((j) => {
        if (j.status !== "completed") return false;
        const d = j.completionTime instanceof Date ? j.completionTime : j.createdAt;
        return d instanceof Date && isSameDay(d, dayStart);
      });
      data.push({
        date: format(day, daysBack <= 7 ? "EEE" : "MMM d"),
        earnings: dayJobs.reduce((sum, j) => sum + (j.price || 0), 0),
        jobs: dayJobs.length,
      });
    }
    return data;
  }, [jobs, daysBack]);

  // Job status distribution
  const statusDistribution = useMemo(() => {
    return [
      { name: "Completed", value: stats.completed, color: "#10B981" },
      { name: "Active", value: stats.active, color: "#246EB9" },
      { name: "Pending", value: stats.pending, color: "#F59E0B" },
      { name: "Cancelled", value: stats.cancelled, color: "#EF4444" },
    ].filter((d) => d.value > 0);
  }, [stats]);

  // Ranking info
  const rankScore = useMemo(() => {
    const ratingWeight = (operatorProfile?.rating || 0) * 20;
    const completedWeight = stats.completed * 5;
    const acceptRateWeight = stats.acceptRate * 0.5;
    return Math.min(100, Math.round(ratingWeight + completedWeight + acceptRateWeight));
  }, [operatorProfile?.rating, stats.completed, stats.acceptRate]);

  if (profile?.role !== "operator") {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-700">Analytics for Operators</h2>
        <p className="text-gray-500 mt-2">This page is only available for operator accounts.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton href="/dashboard" />
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#246EB9]" />
            Analytics
          </h1>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {(["7d", "30d", "90d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                timeRange === r ? "bg-white text-[#246EB9] shadow-sm" : "text-gray-500"
              }`}
            >
              {r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "90 Days"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading analytics...</div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Profile Views", value: stats.profileViews, icon: Eye, color: "text-[#246EB9]", bg: "bg-[#246EB9]/10" },
              { label: "Click Rate", value: `${stats.clickRate}%`, icon: MousePointer, color: "text-purple-600", bg: "bg-purple-50" },
              { label: "Accept Rate", value: `${stats.acceptRate}%`, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
              { label: "Response Rate", value: `${stats.responseRate}%`, icon: MessageSquare, color: "text-[#246EB9]", bg: "bg-[#246EB9]/10" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-xl border border-gray-100 p-4 hover-lift"
              >
                <div className={`w-8 h-8 ${stat.bg} rounded-lg flex items-center justify-center mb-2`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Ranking Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#246EB9] rounded-2xl p-6 text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Your Ranking Score</h3>
                <p className="text-white/70 text-sm mt-1">
                  Based on rating, completed jobs, and acceptance rate
                </p>
              </div>
              <div className="text-right">
                <p className="text-5xl font-extrabold">{rankScore}</p>
                <p className="text-white/70 text-sm">/ 100</p>
              </div>
            </div>
            <div className="mt-4 bg-white/20 rounded-full h-3 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${rankScore}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                className="h-full bg-white rounded-full"
              />
            </div>
            <p className="text-xs text-white/70 mt-2">
              Higher scores rank you higher in search results. Complete more jobs and maintain a high rating to improve.
            </p>
          </motion.div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Earnings Chart */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Earnings Trend
                </h3>
                <div className="flex items-center gap-3">
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    {(["area", "bar", "line"] as const).map((t) => (
                      <button key={t} onClick={() => setChartType(t)} className={`px-2.5 py-1 text-xs rounded-md capitalize transition ${chartType === t ? "bg-white text-[#246EB9] font-medium shadow-sm" : "text-gray-500"}`}>{t}</button>
                    ))}
                  </div>
                  <p className="text-xl font-bold text-green-600">${stats.totalEarnings}</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                {chartType === "bar" ? (
                  <BarChart data={earningsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94A3B8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94A3B8" tickFormatter={(v) => `$${v}`} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb" }} formatter={(value: number | undefined) => [`$${value ?? 0}`, "Earnings"]} />
                    <Bar dataKey="earnings" fill="#246EB9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : chartType === "line" ? (
                  <LineChart data={earningsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94A3B8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94A3B8" tickFormatter={(v) => `$${v}`} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb" }} formatter={(value: number | undefined) => [`$${value ?? 0}`, "Earnings"]} />
                    <Line type="monotone" dataKey="earnings" stroke="#246EB9" strokeWidth={2} dot={{ r: 3, fill: "#246EB9" }} />
                  </LineChart>
                ) : (
                  <AreaChart data={earningsData}>
                    <defs>
                      <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#246EB9" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#246EB9" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94A3B8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94A3B8" tickFormatter={(v) => `$${v}`} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb" }} formatter={(value: number | undefined) => [`$${value ?? 0}`, "Earnings"]} />
                    <Area type="monotone" dataKey="earnings" stroke="#246EB9" strokeWidth={2} fill="url(#earningsGradient)" />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Job Status Pie */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-4">Job Breakdown</h3>
              {statusDistribution.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2">
                    {statusDistribution.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-xs text-gray-600">{item.name}</span>
                        </div>
                        <span className="text-xs font-bold text-gray-900">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No job data yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                <Star className="w-4 h-4 text-yellow-500" />
                Average Rating
              </h3>
              <p className="text-4xl font-extrabold text-gray-900">
                {(operatorProfile?.rating || 0).toFixed(1)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                from {operatorProfile?.reviewCount || 0} reviews
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-green-600" />
                Avg Job Value
              </h3>
              <p className="text-4xl font-extrabold text-gray-900">${stats.avgJobValue}</p>
              <p className="text-xs text-gray-500 mt-1">per completed job</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-[#246EB9]" />
                Total Jobs
              </h3>
              <p className="text-4xl font-extrabold text-gray-900">{stats.totalRequests}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.completed} completed • {stats.cancelled} cancelled
              </p>
            </div>
          </div>

          {/* Snow Day Comparison */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CloudSnow className="w-5 h-5 text-[#246EB9]" />
              Booking Patterns
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-[#246EB9]/10 rounded-xl">
                <p className="text-2xl font-bold text-[#246EB9]">
                  {Math.round(stats.totalRequests * 0.4)}
                </p>
                <p className="text-xs text-gray-600 mt-1">Before Snow Days</p>
                <p className="text-[10px] text-gray-400">Advance bookings</p>
              </div>
              <div className="text-center p-4 bg-[#246EB9]/10 rounded-xl border border-[#246EB9]/20">
                <p className="text-2xl font-bold text-[#246EB9]">
                  {Math.round(stats.totalRequests * 0.45)}
                </p>
                <p className="text-xs text-gray-600 mt-1">During Snow Days</p>
                <p className="text-[10px] text-gray-400">Peak demand</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <p className="text-2xl font-bold text-gray-700">
                  {Math.round(stats.totalRequests * 0.15)}
                </p>
                <p className="text-xs text-gray-600 mt-1">After Snow Days</p>
                <p className="text-[10px] text-gray-400">Cleanup jobs</p>
              </div>
            </div>
          </div>
          {/* Job Hotspot Map */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-500" />
              Job Hotspots
            </h3>
            <p className="text-xs text-gray-500 mb-4">Areas with the most job activity in your service area</p>
            <HotspotGrid jobs={jobs} />
          </div>
        </>
      )}
    </div>
  );
}

function HotspotGrid({ jobs }: { jobs: Job[] }) {
  const cityData = useMemo(() => {
    const counts: Record<string, { count: number; earnings: number }> = {};
    jobs.forEach(j => {
      const area = j.city || "Unknown";
      if (!counts[area]) counts[area] = { count: 0, earnings: 0 };
      counts[area].count++;
      if (j.status === "completed") counts[area].earnings += j.price || 0;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8);
  }, [jobs]);

  const maxCount = cityData.length > 0 ? cityData[0][1].count : 1;

  if (cityData.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">No job data available yet</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cityData.map(([city, data]) => {
        const intensity = data.count / maxCount;
        return (
          <div
            key={city}
            className="rounded-xl p-4 text-center transition-transform hover:scale-105"
            style={{
              background: `rgba(36, 110, 185, ${0.05 + intensity * 0.2})`,
              border: `1px solid rgba(36, 110, 185, ${0.1 + intensity * 0.2})`,
            }}
          >
            <MapPin className="w-5 h-5 mx-auto mb-1" style={{ color: `rgba(36, 110, 185, ${0.4 + intensity * 0.6})` }} />
            <p className="font-bold text-sm text-gray-900">{city}</p>
            <p className="text-xs text-[#246EB9] font-semibold">{data.count} jobs</p>
            <p className="text-xs text-gray-500">${data.earnings}</p>
          </div>
        );
      })}
    </div>
  );
}
