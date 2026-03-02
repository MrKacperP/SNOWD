"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  startAfter,
  DocumentSnapshot,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AdminNotifType } from "@/lib/adminNotifications";
import { UserProfile } from "@/lib/types";
import {
  Activity,
  Eye,
  UserPlus,
  Briefcase,
  DollarSign,
  FileText,
  LogIn,
  User,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  TrendingUp,
  MapPin,
  Filter,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NotifDoc {
  id: string;
  type: AdminNotifType;
  message: string;
  uid?: string | null;
  meta?: Record<string, string | number | boolean | null>;
  createdAt: { seconds: number; nanoseconds: number } | null;
  read: boolean;
}

// ─── Config: icon + colour per event type ────────────────────────────────────

const TYPE_CONFIG: Record<
  AdminNotifType,
  { label: string; icon: React.ReactNode; bg: string; text: string; dot: string }
> = {
  visit: {
    label: "Page Visit",
    icon: <Eye className="w-4 h-4" />,
    bg: "bg-blue-50",
    text: "text-blue-600",
    dot: "bg-blue-400",
  },
  signup: {
    label: "Sign Up",
    icon: <UserPlus className="w-4 h-4" />,
    bg: "bg-green-50",
    text: "text-green-600",
    dot: "bg-green-500",
  },
  login: {
    label: "Login",
    icon: <LogIn className="w-4 h-4" />,
    bg: "bg-indigo-50",
    text: "text-indigo-600",
    dot: "bg-indigo-400",
  },
  job_created: {
    label: "Job Created",
    icon: <Briefcase className="w-4 h-4" />,
    bg: "bg-purple-50",
    text: "text-purple-600",
    dot: "bg-purple-500",
  },
  payment: {
    label: "Payment",
    icon: <DollarSign className="w-4 h-4" />,
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    dot: "bg-emerald-500",
  },
  document_uploaded: {
    label: "Document",
    icon: <FileText className="w-4 h-4" />,
    bg: "bg-amber-50",
    text: "text-amber-600",
    dot: "bg-amber-500",
  },
  profile_saved: {
    label: "Profile Update",
    icon: <User className="w-4 h-4" />,
    bg: "bg-gray-50",
    text: "text-gray-600",
    dot: "bg-gray-400",
  },
  job_status_change: {
    label: "Job Update",
    icon: <CheckCircle2 className="w-4 h-4" />,
    bg: "bg-cyan-50",
    text: "text-cyan-600",
    dot: "bg-cyan-500",
  },
  account_approved: {
    label: "Approved",
    icon: <CheckCircle2 className="w-4 h-4" />,
    bg: "bg-green-50",
    text: "text-green-700",
    dot: "bg-green-600",
  },
};

const FILTER_TABS: { key: AdminNotifType | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "visit", label: "Page Visits" },
  { key: "signup", label: "Sign Ups" },
  { key: "login", label: "Logins" },
  { key: "job_created", label: "Jobs" },
  { key: "payment", label: "Payments" },
  { key: "document_uploaded", label: "Documents" },
];

const PAGE_SIZE = 50;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toMs(t: { seconds: number; nanoseconds: number } | null): number {
  if (!t) return 0;
  return t.seconds * 1000;
}

function formatTime(t: { seconds: number; nanoseconds: number } | null): string {
  if (!t) return "—";
  const d = new Date(toMs(t));
  if (isToday(d)) return formatDistanceToNow(d, { addSuffix: true });
  if (isYesterday(d)) return `Yesterday ${format(d, "h:mm a")}`;
  return format(d, "MMM d, h:mm a");
}

function formatFull(t: { seconds: number; nanoseconds: number } | null): string {
  if (!t) return "";
  return format(new Date(toMs(t)), "MMM d, yyyy 'at' h:mm:ss a");
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function AdminActivityPage() {
  const [events, setEvents] = useState<NotifDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [users, setUsers] = useState<Record<string, UserProfile>>({});
  const [filter, setFilter] = useState<AdminNotifType | "all">("all");
  const [search, setSearch] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [todayStats, setTodayStats] = useState({
    visits: 0,
    signups: 0,
    actions: 0,
    total: 0,
  });
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch users once for name resolution
  useEffect(() => {
    getDocs(collection(db, "users")).then((snap) => {
      const map: Record<string, UserProfile> = {};
      snap.docs.forEach((d) => {
        map[d.id] = { uid: d.id, ...d.data() } as UserProfile;
      });
      setUsers(map);
    });
  }, []);

  const fetchEvents = useCallback(async (reset = true) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);

    try {
      const constraints: Parameters<typeof query>[1][] = [
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE),
      ];
      if (!reset && lastDoc) constraints.push(startAfter(lastDoc));

      const q = query(collection(db, "adminNotifications"), ...constraints);
      const snap = await getDocs(q);

      const docs = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<NotifDoc, "id">),
      }));

      // Compute today stats from first page
      if (reset) {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        // Fetch today stats separately
        const todaySnap = await getDocs(
          query(
            collection(db, "adminNotifications"),
            where("createdAt", ">=", Timestamp.fromDate(startOfToday)),
            orderBy("createdAt", "desc")
          )
        );
        const todayDocs = todaySnap.docs.map((d) => d.data() as NotifDoc);
        setTodayStats({
          visits: todayDocs.filter((d) => d.type === "visit").length,
          signups: todayDocs.filter((d) => d.type === "signup").length,
          actions: todayDocs.filter(
            (d) => d.type !== "visit" && d.type !== "signup"
          ).length,
          total: todayDocs.length,
        });
      }

      setHasMore(snap.docs.length === PAGE_SIZE);
      setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
      setEvents(reset ? docs : (prev) => [...prev, ...docs]);
      setLastRefresh(new Date());
    } catch (e) {
      console.error("Error fetching activity:", e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [lastDoc]);

  // Initial load
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchEvents(true); }, []);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(() => fetchEvents(true), 30000);
    } else {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    }
    return () => { if (autoRefreshRef.current) clearInterval(autoRefreshRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

  // ─── Derived data ─────────────────────────────────────────────────────────

  const filtered = events.filter((e) => {
    if (filter !== "all" && e.type !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const msg = e.message?.toLowerCase() || "";
      const uid = e.uid?.toLowerCase() || "";
      const name = (e.uid && users[e.uid]?.displayName?.toLowerCase()) || "";
      const path = String(e.meta?.path ?? "").toLowerCase();
      return msg.includes(q) || uid.includes(q) || name.includes(q) || path.includes(q);
    }
    return true;
  });

  // Group by date header
  type GroupedRow =
    | { kind: "header"; label: string; key: string }
    | { kind: "event"; event: NotifDoc };

  const grouped: GroupedRow[] = [];
  let lastLabel = "";
  filtered.forEach((e) => {
    const ms = toMs(e.createdAt);
    const d = new Date(ms);
    const label = ms === 0
      ? "Unknown Date"
      : isToday(d) ? "Today"
      : isYesterday(d) ? "Yesterday"
      : format(d, "MMMM d, yyyy");
    if (label !== lastLabel) {
      grouped.push({ kind: "header", label, key: label });
      lastLabel = label;
    }
    grouped.push({ kind: "event", event: e });
  });

  // Top pages
  const pageCounts: Record<string, number> = {};
  events.filter((e) => e.type === "visit" && e.meta?.path).forEach((e) => {
    const p = String(e.meta!.path);
    pageCounts[p] = (pageCounts[p] || 0) + 1;
  });
  const topPages = Object.entries(pageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Filter tab counts
  const typeCounts: Record<string, number> = { all: events.length };
  events.forEach((e) => {
    typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-[#246EB9]" />
          <h1 className="text-2xl font-bold">Activity Feed</h1>
          <span className="text-sm text-gray-400">
            {events.length} events loaded
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            Last updated {format(lastRefresh, "h:mm:ss a")}
          </span>
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              autoRefresh
                ? "bg-[#246EB9] text-white border-[#246EB9]"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? "animate-spin" : ""}`} />
            {autoRefresh ? "Auto: ON" : "Auto: OFF"}
          </button>
          <button
            onClick={() => fetchEvents(true)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Today Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Page Visits Today", value: todayStats.visits, icon: <Eye className="w-5 h-5" />, color: "bg-blue-50 text-blue-600" },
          { label: "New Sign Ups Today", value: todayStats.signups, icon: <UserPlus className="w-5 h-5" />, color: "bg-green-50 text-green-600" },
          { label: "Other Actions Today", value: todayStats.actions, icon: <TrendingUp className="w-5 h-5" />, color: "bg-purple-50 text-purple-600" },
          { label: "Total Events Today", value: todayStats.total, icon: <Activity className="w-5 h-5" />, color: "bg-[#246EB9]/5 text-[#246EB9]" },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className={`w-9 h-9 ${s.color} rounded-xl flex items-center justify-center mb-2`}>
              {s.icon}
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* ─── Main Feed ──────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Filters + Search */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by user, path, message..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#246EB9]/20 focus:border-[#246EB9]/40"
              />
            </div>

            {/* Type filter tabs — scrollable */}
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
              {FILTER_TABS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key as AdminNotifType | "all")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition shrink-0 ${
                    filter === key
                      ? "bg-[#246EB9] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {label}
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold leading-none ${
                    filter === key ? "bg-white/20 text-white" : "bg-white text-gray-500"
                  }`}>
                    {typeCounts[key === "all" ? "all" : key] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Event list */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
              <RefreshCw className="w-7 h-7 mx-auto mb-3 animate-spin opacity-40" />
              <p className="text-sm">Loading activity...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
              <Filter className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No events match your filters</p>
              <button
                onClick={() => { setFilter("all"); setSearch(""); }}
                className="mt-2 text-sm text-[#246EB9] hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="space-y-0.5">
              {grouped.map((row, idx) =>
                row.kind === "header" ? (
                  <div
                    key={row.key + idx}
                    className="flex items-center gap-3 py-3 px-1"
                  >
                    <div className="h-px flex-1 bg-gray-100" />
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {row.label}
                    </span>
                    <div className="h-px flex-1 bg-gray-100" />
                  </div>
                ) : (
                  <EventRow
                    key={row.event.id}
                    event={row.event}
                    userMap={users}
                    expanded={expandedId === row.event.id}
                    onToggle={() =>
                      setExpandedId((id) =>
                        id === row.event.id ? null : row.event.id
                      )
                    }
                    formatTime={formatTime}
                    formatFull={formatFull}
                  />
                )
              )}
            </div>
          )}

          {/* Load more */}
          {hasMore && !loading && (
            <button
              onClick={() => fetchEvents(false)}
              disabled={loadingMore}
              className="w-full py-3 text-sm text-[#246EB9] font-medium border border-[#246EB9]/20 rounded-xl hover:bg-[#246EB9]/5 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loadingMore ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Loading...
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" /> Load more events
                </>
              )}
            </button>
          )}
        </div>

        {/* ─── Sidebar ────────────────────────────────────────────── */}
        <div className="lg:w-64 shrink-0 space-y-4">
          {/* Top pages */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#246EB9]" /> Top Pages
            </h3>
            {topPages.length === 0 ? (
              <p className="text-xs text-gray-400">No visit data yet</p>
            ) : (
              <div className="space-y-2">
                {topPages.map(([path, count]) => (
                  <div key={path} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">{path}</p>
                      <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-[#246EB9] rounded-full"
                          style={{
                            width: `${Math.min(100, (count / (topPages[0]?.[1] || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-gray-500 shrink-0">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Event type breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#246EB9]" /> Event Breakdown
            </h3>
            <div className="space-y-2">
              {Object.entries(TYPE_CONFIG)
                .filter(([key]) => (typeCounts[key] ?? 0) > 0)
                .sort((a, b) => (typeCounts[b[0]] ?? 0) - (typeCounts[a[0]] ?? 0))
                .map(([key, cfg]) => (
                  <div key={key} className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot} shrink-0`} />
                    <span className="text-xs text-gray-600 flex-1">{cfg.label}</span>
                    <span className="text-xs font-bold text-gray-700">
                      {typeCounts[key] ?? 0}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Quick links */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Quick Links</h3>
            <div className="space-y-1">
              {[
                { href: "/admin/users", label: "View All Users" },
                { href: "/admin/verifications", label: "ID Verifications" },
                { href: "/admin/analytics", label: "Analytics" },
                { href: "/admin/jobs", label: "Jobs" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-xs text-gray-600 hover:bg-gray-50 hover:text-[#246EB9] transition"
                >
                  {link.label}
                  <ExternalLink className="w-3 h-3 opacity-40" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Event Row Component ──────────────────────────────────────────────────────

function EventRow({
  event,
  userMap,
  expanded,
  onToggle,
  formatTime,
  formatFull,
}: {
  event: NotifDoc;
  userMap: Record<string, UserProfile>;
  expanded: boolean;
  onToggle: () => void;
  formatTime: (t: { seconds: number; nanoseconds: number } | null) => string;
  formatFull: (t: { seconds: number; nanoseconds: number } | null) => string;
}) {
  const cfg = TYPE_CONFIG[event.type] ?? TYPE_CONFIG.visit;
  const user = event.uid ? userMap[event.uid] : null;

  return (
    <div
      className={`bg-white rounded-xl border transition cursor-pointer ${
        expanded ? "border-[#246EB9]/30 shadow-sm" : "border-gray-100 hover:border-gray-200"
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Icon */}
        <div className={`w-8 h-8 rounded-lg ${cfg.bg} ${cfg.text} flex items-center justify-center shrink-0 mt-0.5`}>
          {cfg.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-gray-800 leading-snug">{event.message}</p>
            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}
              >
                {cfg.label}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {user && (
              <Link
                href={`/admin/users/${event.uid}`}
                className="flex items-center gap-1 text-xs text-[#246EB9] hover:underline font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                <User className="w-3 h-3" />
                {user.displayName}
              </Link>
            )}
            {!user && event.uid && (
              <span className="text-xs text-gray-400 font-mono">{event.uid.slice(0, 8)}…</span>
            )}
            {event.meta?.path && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <MapPin className="w-3 h-3" />
                {String(event.meta.path)}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-gray-400 ml-auto">
              <Clock className="w-3 h-3" />
              {formatTime(event.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded metadata */}
      {expanded && (
        <div
          className="border-t border-gray-50 px-4 py-3 bg-gray-50/50 rounded-b-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Event Details
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <div>
              <span className="text-gray-400">Event ID</span>
              <p className="font-mono text-gray-700 break-all">{event.id}</p>
            </div>
            <div>
              <span className="text-gray-400">Timestamp</span>
              <p className="font-medium text-gray-700">{formatFull(event.createdAt)}</p>
            </div>
            {event.uid && (
              <div>
                <span className="text-gray-400">UID</span>
                <p className="font-mono text-gray-700 break-all">{event.uid}</p>
              </div>
            )}
            {event.uid && user && (
              <div>
                <span className="text-gray-400">User</span>
                <p className="font-medium text-gray-700">
                  {user.displayName} ({user.role})
                </p>
              </div>
            )}
            {event.meta &&
              Object.entries(event.meta)
                .filter(([k]) => k !== "path")
                .map(([k, v]) => (
                  <div key={k}>
                    <span className="text-gray-400 capitalize">{k.replace(/_/g, " ")}</span>
                    <p className="font-medium text-gray-700 break-all">{String(v)}</p>
                  </div>
                ))}
            {event.meta?.path && (
              <div>
                <span className="text-gray-400">Path</span>
                <p className="font-medium text-gray-700">{String(event.meta.path)}</p>
              </div>
            )}
          </div>
          {event.uid && (
            <div className="mt-3 pt-2 border-t border-gray-100 flex gap-2">
              <Link
                href={`/admin/users/${event.uid}`}
                className="flex items-center gap-1 text-xs text-[#246EB9] hover:underline font-medium"
              >
                <ExternalLink className="w-3 h-3" /> View user profile
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
