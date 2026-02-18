"use client";

import React, { useState, useEffect, useRef } from "react";
import { collection, getDocs, onSnapshot, query, orderBy, limit, updateDoc, doc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile, Transaction, Job } from "@/lib/types";
import {
  Users,
  MessageSquare,
  DollarSign,
  AlertTriangle,
  Briefcase,
  TrendingUp,
  Shield,
  Activity,
  UserCheck,
  Zap,
  BarChart3,
  ArrowUpRight,
  RefreshCw,
  Bell,
  X,
  Globe,
  UserPlus,
  FileText,
  CheckCheck,
} from "lucide-react";
import Link from "next/link";
import { format, subDays } from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#4361EE", "#7C3AED", "#10B981", "#F59E0B", "#EF4444"];

export default function AdminOverviewPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalClients: 0,
    totalOperators: 0,
    totalJobs: 0,
    activeJobs: 0,
    completedJobs: 0,
    totalTransactions: 0,
    totalRevenue: 0,
    openClaims: 0,
    totalChats: 0,
    onlineUsers: 0,
    newUsersWeek: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<
    { type: string; message: string; time: string; icon: React.ReactNode; color: string }[]
  >([]);
  const [recentUsers, setRecentUsers] = useState<UserProfile[]>([]);
  const [activeJobsList, setActiveJobsList] = useState<(Job & { clientName?: string; operatorName?: string })[]>([]);
  const [revenueData, setRevenueData] = useState<{ date: string; revenue: number }[]>([]);
  const [roleData, setRoleData] = useState<{ name: string; value: number }[]>([]);

  // ── Admin Notifications ─────────────────────────────────────────────────
  type AdminNotif = {
    id: string;
    type: "signup" | "visit" | "document_uploaded";
    message: string;
    uid?: string | null;
    meta?: Record<string, string | number | boolean | null>;
    createdAt: { seconds: number } | null;
    read: boolean;
  };
  const [notifs, setNotifs] = useState<AdminNotif[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifs.filter((n) => !n.read).length;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Real-time listener for the latest 40 notifications
  useEffect(() => {
    const q = query(
      collection(db, "adminNotifications"),
      orderBy("createdAt", "desc"),
      limit(40)
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifs(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as AdminNotif))
      );
    });
    return () => unsub();
  }, []);

  const markAllNotifsRead = async () => {
    const unread = notifs.filter((n) => !n.read);
    if (!unread.length) return;
    const batch = writeBatch(db);
    unread.forEach((n) => batch.update(doc(db, "adminNotifications", n.id), { read: true }));
    await batch.commit();
  };

  const markNotifRead = async (id: string) => {
    await updateDoc(doc(db, "adminNotifications", id), { read: true });
  };

  const notifIcon = (type: AdminNotif["type"]) => {
    if (type === "signup") return <UserPlus className="w-3.5 h-3.5" />;
    if (type === "document_uploaded") return <FileText className="w-3.5 h-3.5" />;
    return <Globe className="w-3.5 h-3.5" />;
  };
  const notifColor = (type: AdminNotif["type"]) => {
    if (type === "signup") return "text-green-600 bg-green-50";
    if (type === "document_uploaded") return "text-purple-600 bg-purple-50";
    return "text-blue-500 bg-blue-50";
  };
  const notifTime = (n: AdminNotif) => {
    if (!n.createdAt?.seconds) return "";
    return format(new Date(n.createdAt.seconds * 1000), "MMM d, h:mm a");
  };

  const toMs = (t: unknown) =>
    typeof t === "object" && t !== null && "seconds" in t
      ? (t as { seconds: number }).seconds * 1000
      : 0;

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersSnap, jobsSnap, txnSnap, claimsSnap, chatsSnap] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "jobs")),
          getDocs(collection(db, "transactions")),
          getDocs(collection(db, "claims")).catch(() => ({ docs: [] as never[] })),
          getDocs(collection(db, "chats")),
        ]);

        const users = usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile));
        const jobs = jobsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Job));
        const txns = txnSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction));
        const openClaims = (claimsSnap.docs || []).filter((d) => {
          const data = d.data();
          return data.status === "open" || data.status === "under-review";
        });

        const now = Date.now();
        const weekAgo = subDays(new Date(), 7);

        const onlineUsers = users.filter((u) => {
          if (u.isOnline) return true;
          const lastSeen = toMs(u.lastSeen);
          return lastSeen > 0 && now - lastSeen < 5 * 60 * 1000;
        }).length;

        const newUsersWeek = users.filter((u) => {
          const created = toMs(u.createdAt);
          return created >= weekAgo.getTime();
        }).length;

        const totalRevenue = txns
          .filter((t) => t.status === "paid")
          .reduce((sum, t) => sum + (t.amount || 0), 0);

        // Revenue chart (14 days)
        const revDays: Record<string, number> = {};
        for (let i = 13; i >= 0; i--) {
          revDays[format(subDays(now, i), "MMM d")] = 0;
        }
        txns.forEach((tx) => {
          if (tx.status !== "paid") return;
          const ms = toMs(tx.createdAt);
          if (ms > now - 14 * 86400000) {
            const key = format(new Date(ms), "MMM d");
            if (revDays[key] !== undefined) revDays[key] += tx.amount || 0;
          }
        });
        setRevenueData(Object.entries(revDays).map(([date, revenue]) => ({ date, revenue: Math.round(revenue * 100) / 100 })));

        // Role breakdown
        const counts: Record<string, number> = { Client: 0, Operator: 0, Admin: 0 };
        users.forEach((u) => { const key = u.role.charAt(0).toUpperCase() + u.role.slice(1); counts[key] = (counts[key] || 0) + 1; });
        setRoleData(Object.entries(counts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value })));

        // Active jobs with names
        const activeStatuses = ["pending", "accepted", "en-route", "in-progress"];
        const active = jobs.filter((j) => activeStatuses.includes(j.status));
        const userCache: Record<string, string> = {};
        users.forEach((u) => (userCache[u.uid] = u.displayName));
        setActiveJobsList(active.slice(0, 10).map((j) => ({ ...j, clientName: userCache[j.clientId] || "Unknown", operatorName: userCache[j.operatorId] || "Unassigned" })));

        // Recent users
        const sortedUsers = [...users].sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
        setRecentUsers(sortedUsers.slice(0, 8));

        // Activity feed
        const activities: { type: string; message: string; time: string; icon: React.ReactNode; color: string; ts: number }[] = [];
        sortedUsers.slice(0, 5).forEach((u) => { const ts = toMs(u.createdAt); if (ts > 0) activities.push({ type: "user", message: `${u.displayName} joined as ${u.role}`, time: format(new Date(ts), "MMM d, h:mm a"), icon: <UserCheck className="w-4 h-4" />, color: "text-green-600 bg-green-50", ts }); });
        jobs.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt)).slice(0, 5).forEach((j) => { const ts = toMs(j.createdAt); if (ts > 0) activities.push({ type: "job", message: `Job ${j.status} — ${j.serviceTypes?.join(", ")} at ${j.city || j.address}`, time: format(new Date(ts), "MMM d, h:mm a"), icon: <Briefcase className="w-4 h-4" />, color: j.status === "completed" ? "text-green-600 bg-green-50" : j.status === "cancelled" ? "text-red-600 bg-red-50" : "text-blue-600 bg-blue-50", ts }); });
        txns.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt)).slice(0, 3).forEach((tx) => { const ts = toMs(tx.createdAt); if (ts > 0) activities.push({ type: "txn", message: `$${tx.amount?.toFixed(2)} payment ${tx.status}`, time: format(new Date(ts), "MMM d, h:mm a"), icon: <DollarSign className="w-4 h-4" />, color: tx.status === "paid" ? "text-green-600 bg-green-50" : "text-yellow-600 bg-yellow-50", ts }); });
        activities.sort((a, b) => b.ts - a.ts);
        setRecentActivity(activities.slice(0, 12));

        setStats({
          totalUsers: users.length, totalClients: users.filter((u) => u.role === "client").length, totalOperators: users.filter((u) => u.role === "operator").length,
          totalJobs: jobs.length, activeJobs: active.length, completedJobs: jobs.filter((j) => j.status === "completed").length,
          totalTransactions: txnSnap.docs.length, totalRevenue, openClaims: openClaims.length, totalChats: chatsSnap.docs.length, onlineUsers, newUsersWeek,
        });
      } catch (error) {
        console.error("Error fetching admin stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const topCards = [
    { label: "Total Users", value: stats.totalUsers, sub: `${stats.onlineUsers} online now`, icon: Users, color: "text-[#4361EE]", bg: "bg-[#4361EE]/10", href: "/admin/users" },
    { label: "Active Jobs", value: stats.activeJobs, sub: `${stats.completedJobs} completed`, icon: Briefcase, color: "text-orange-500", bg: "bg-orange-50", href: "/admin/analytics" },
    { label: "Total Revenue", value: `$${stats.totalRevenue.toFixed(2)}`, sub: `${stats.totalTransactions} transactions`, icon: DollarSign, color: "text-green-600", bg: "bg-green-50", href: "/admin/transactions" },
    { label: "Open Claims", value: stats.openClaims, sub: "Needs attention", icon: AlertTriangle, color: stats.openClaims > 0 ? "text-red-500" : "text-gray-400", bg: stats.openClaims > 0 ? "bg-red-50" : "bg-gray-50", href: "/admin/claims" },
  ];

  const secondaryCards = [
    { label: "Clients", value: stats.totalClients, icon: Users, color: "text-[#4361EE]", bg: "bg-[#4361EE]/10", href: "/admin/users" },
    { label: "Operators", value: stats.totalOperators, icon: Users, color: "text-purple-600", bg: "bg-purple-50", href: "/admin/users" },
    { label: "Chats", value: stats.totalChats, icon: MessageSquare, color: "text-[#4361EE]", bg: "bg-[#4361EE]/10", href: "/admin/chats" },
    { label: "New This Week", value: stats.newUsersWeek, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50", href: "/admin/users" },
  ];

  if (loading) return <div className="flex items-center justify-center h-96"><div className="flex flex-col items-center gap-3"><RefreshCw className="w-8 h-8 text-[#4361EE] animate-spin" /><p className="text-gray-400 text-sm">Loading admin dashboard...</p></div></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#4361EE] to-[#7C3AED] rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Command Center</h1>
            <p className="text-xs text-gray-500">Full platform oversight • {stats.onlineUsers} users online • {format(new Date(), "EEEE, MMM d, yyyy")}</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {/* Notifications Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setShowNotifs((v) => !v); if (!showNotifs) markAllNotifsRead(); }}
              className="relative p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4.5 h-4.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none px-0.5">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 top-full mt-2 w-[340px] bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <span className="font-semibold text-gray-900 text-sm">Notifications</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={markAllNotifsRead}
                      className="text-[11px] text-[#4361EE] hover:underline flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                    </button>
                    <button onClick={() => setShowNotifs(false)}>
                      <X className="w-4 h-4 text-gray-400 hover:text-gray-700" />
                    </button>
                  </div>
                </div>
                <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-50">
                  {notifs.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-8">No notifications yet</p>
                  )}
                  {notifs.map((n) => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition cursor-default ${!n.read ? "bg-blue-50/40" : ""}`}
                      onClick={() => markNotifRead(n.id)}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${notifColor(n.type)}`}>
                        {notifIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${!n.read ? "font-semibold text-gray-900" : "text-gray-700"}`}>{n.message}</p>
                        {n.meta?.path && (
                          <p className="text-[10px] text-gray-400 truncate">{String(n.meta.path)}</p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-0.5">{notifTime(n)}</p>
                      </div>
                      {!n.read && <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Link href="/admin/users" className="px-4 py-2 bg-[#4361EE] text-white rounded-xl text-sm font-medium hover:bg-[#3651D4] transition flex items-center gap-2"><Users className="w-4 h-4" /> Manage Users</Link>
          <Link href="/admin/analytics" className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Analytics</Link>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {topCards.map((card) => (
          <Link key={card.label} href={card.href} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center`}><card.icon className={`w-5 h-5 ${card.color}`} /></div>
              <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-[#4361EE] transition" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{card.sub}</p>
          </Link>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {secondaryCards.map((card) => (
          <Link key={card.label} href={card.href} className="bg-white rounded-xl border border-gray-100 p-3 hover:shadow-md transition flex items-center gap-3">
            <div className={`w-8 h-8 ${card.bg} rounded-lg flex items-center justify-center`}><card.icon className={`w-4 h-4 ${card.color}`} /></div>
            <div><p className="text-lg font-bold text-gray-900">{card.value}</p><p className="text-[10px] text-gray-500">{card.label}</p></div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Revenue (14 days)</h2>
            <Link href="/admin/analytics" className="text-xs text-[#4361EE] hover:underline">Full analytics →</Link>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stroke="#4361EE" fill="#4361EE" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* User Role Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-bold text-gray-900 mb-4">User Breakdown</h2>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={roleData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {roleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {roleData.map((entry, i) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />{entry.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Activity Feed */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-4"><Activity className="w-4 h-4 text-[#4361EE]" /> Live Activity</h2>
          <div className="space-y-2.5 max-h-[350px] overflow-y-auto">
            {recentActivity.map((act, i) => (
              <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${act.color}`}>{act.icon}</div>
                <div className="min-w-0 flex-1"><p className="text-sm text-gray-800 truncate">{act.message}</p><p className="text-[10px] text-gray-400">{act.time}</p></div>
              </div>
            ))}
            {recentActivity.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No recent activity</p>}
          </div>
        </div>

        {/* Active Jobs */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 flex items-center gap-2"><Zap className="w-4 h-4 text-orange-500" /> Active Jobs</h2>
            <span className="px-2 py-0.5 bg-orange-50 text-orange-600 text-xs rounded-full font-medium">{stats.activeJobs} live</span>
          </div>
          <div className="space-y-2 max-h-[350px] overflow-y-auto">
            {activeJobsList.map((job) => (
              <div key={job.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-50 hover:border-[#4361EE]/20 hover:shadow-sm transition">
                <div className={`w-2 h-8 rounded-full ${job.status === "in-progress" ? "bg-green-500" : job.status === "en-route" ? "bg-blue-500" : job.status === "accepted" ? "bg-purple-500" : "bg-yellow-500"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{job.clientName} → {job.operatorName}</p>
                  <p className="text-[10px] text-gray-500 capitalize">{job.serviceTypes?.map((s) => s.replace("-", " ")).join(", ")} • <span className="font-semibold text-green-600">${job.price}</span></p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${job.status === "in-progress" ? "bg-green-100 text-green-700" : job.status === "en-route" ? "bg-blue-100 text-blue-700" : job.status === "accepted" ? "bg-purple-100 text-purple-700" : "bg-yellow-100 text-yellow-700"}`}>{job.status.replace("-", " ")}</span>
              </div>
            ))}
            {activeJobsList.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No active jobs right now</p>}
          </div>
        </div>
      </div>

      {/* Recent Users */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><UserCheck className="w-4 h-4 text-green-600" /> New Users</h2>
          <Link href="/admin/users" className="text-xs text-[#4361EE] hover:underline">View all →</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {recentUsers.map((u) => (
            <Link key={u.uid} href={`/dashboard/u/${u.uid}`} className="flex items-center gap-3 p-3 rounded-xl border border-gray-50 hover:border-[#4361EE]/20 hover:shadow-sm transition">
              <div className="w-9 h-9 bg-[#4361EE]/10 rounded-full flex items-center justify-center text-[#4361EE] font-bold text-sm shrink-0">{u.displayName?.charAt(0)?.toUpperCase() || "?"}</div>
              <div className="min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{u.displayName}</p><p className="text-[10px] text-gray-400 capitalize">{u.role} • {u.city || "—"}</p></div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
