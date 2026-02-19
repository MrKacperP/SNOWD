"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Job, OperatorProfile, UserProfile } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import ProgressTracker from "@/components/ProgressTracker";
import CelebrationOverlay from "@/components/CelebrationOverlay";
import CancellationPopup from "@/components/CancellationPopup";
import { WeatherCard } from "@/context/WeatherContext";
import { motion } from "framer-motion";
import {
  Snowflake,
  CheckCircle2,
  Star,
  DollarSign,
  Clock,
  BarChart3,
  MapPin,
  Calendar,
  User,
  Check,
  X,
  TrendingUp,
  CalendarDays,
  ClipboardList,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isToday } from "date-fns";

const isValidDate = (date: unknown): boolean => {
  if (!date) return false;
  try {
    const d = date instanceof Date ? date : new Date(date as string);
    return d instanceof Date && !isNaN(d.getTime());
  } catch {
    return false;
  }
};

function OperatorMiniCalendar() {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  return (
    <div className="bg-[var(--bg-card-solid)] rounded-2xl border border-[var(--border-color)] p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm text-[var(--text-primary)]">{format(currentMonth, "MMMM yyyy")}</h3>
        <div className="flex gap-1">
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-1 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-secondary)] text-xs">◀</button>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-1 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-secondary)] text-xs">▶</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => <div key={d} className="py-1 text-[var(--text-muted)] font-medium">{d}</div>)}
        {days.map((day, i) => (
          <div key={i} className={`py-1.5 rounded-lg text-xs ${
            isToday(day) ? "bg-[#4361EE] text-white font-bold" :
            isSameMonth(day, currentMonth) ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
          }`}>
            {format(day, "d")}
          </div>
        ))}
      </div>
      <Link href="/dashboard/calendar" className="block text-center text-xs text-[#4361EE] font-medium mt-2 hover:underline">View Full Calendar</Link>
    </div>
  );
}

export default function OperatorDashboard() {
  const { profile } = useAuth();
  const operatorProfile = profile as OperatorProfile;
  const [pendingJobs, setPendingJobs] = useState<Job[]>([]);
  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [completedJobs, setCompletedJobs] = useState<Job[]>([]);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(operatorProfile?.isAvailable ?? true);
  const [celebration, setCelebration] = useState<{ show: boolean; type: "accepted" | "completion" }>({ show: false, type: "accepted" });
  const [declineJobId, setDeclineJobId] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);

  useEffect(() => {
    const fetchJobs = async () => {
      if (!profile?.uid) return;
      try {
        const allQuery = query(
          collection(db, "jobs"),
          where("operatorId", "==", profile.uid)
        );
        const snap = await getDocs(allQuery);
        const allJobs = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
            scheduledDate: data.scheduledDate?.toDate?.() || data.scheduledDate,
            startTime: data.startTime?.toDate?.() || data.startTime,
            completionTime: data.completionTime?.toDate?.() || data.completionTime,
          } as Job;
        });

        const pending = allJobs
          .filter((j) => j.status === "pending")
          .sort((a, b) => {
            const aT = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
            const bT = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
            return bT - aT;
          });
        setPendingJobs(pending);

        const active = allJobs
          .filter((j) => ["accepted", "en-route", "in-progress"].includes(j.status))
          .sort((a, b) => {
            const aT = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
            const bT = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
            return bT - aT;
          });
        setActiveJobs(active);

        const completed = allJobs
          .filter((j) => j.status === "completed")
          .sort((a, b) => {
            const aT = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
            const bT = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
            return bT - aT;
          })
          .slice(0, 5);
        setCompletedJobs(completed);

        const clientIds = [...new Set(allJobs.map((j) => j.clientId))];
        const names: Record<string, string> = {};
        await Promise.all(
          clientIds.map(async (cid) => {
            try {
              const userDoc = await getDoc(doc(db, "users", cid));
              if (userDoc.exists()) {
                const data = userDoc.data() as UserProfile;
                names[cid] = data.displayName || "Client";
              }
            } catch {}
          })
        );
        setClientNames(names);
      } catch (error) {
        console.error("Error fetching jobs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [profile?.uid]);

  const toggleAvailability = async () => {
    if (!profile?.uid) return;
    const newVal = !isAvailable;
    setIsAvailable(newVal);
    try {
      await updateDoc(doc(db, "users", profile.uid), { isAvailable: newVal });
    } catch {
      setIsAvailable(!newVal);
    }
  };

  const handleAcceptJob = async (jobId: string) => {
    setActionLoading(jobId);
    try {
      // Enforce one active job at a time
      const inProgressJob = activeJobs.find((j) => ["in-progress", "en-route"].includes(j.status));
      if (inProgressJob) {
        alert("You already have an active job in progress. Please complete it before accepting a new one.");
        setActionLoading(null);
        return;
      }
      const acceptedJob = activeJobs.find((j) => j.status === "accepted");
      if (acceptedJob) {
        alert("You already have an accepted job. Please complete or start it before accepting another.");
        setActionLoading(null);
        return;
      }

      await updateDoc(doc(db, "jobs", jobId), {
        status: "accepted",
        updatedAt: new Date(),
      });

      // Send system message to notify client
      const job = pendingJobs.find((j) => j.id === jobId);
      if (job?.chatId) {
        const { addDoc, collection: fbCollection, Timestamp } = await import("firebase/firestore");
        const systemMessage = `${operatorProfile?.displayName || "Operator"} accepted your job!`;

        await addDoc(fbCollection(db, "messages"), {
          chatId: job.chatId,
          senderId: "system",
          senderName: "System",
          type: "status-update",
          content: systemMessage,
          read: false,
          createdAt: Timestamp.now(),
        });

        // Update chat lastMessage
        await updateDoc(doc(db, "chats", job.chatId), {
          lastMessage: systemMessage,
          lastMessageTime: Timestamp.now(),
          [`unreadCount.${job.clientId}`]: (job as unknown as Record<string, unknown>).unreadClient
            ? Number((job as unknown as Record<string, unknown>).unreadClient) + 1
            : 1,
        });
      }

      if (job) {
        setPendingJobs(pendingJobs.filter((j) => j.id !== jobId));
        setActiveJobs([{ ...job, status: "accepted" as const }, ...activeJobs]);
      }
      setCelebration({ show: true, type: "accepted" });
    } catch {
      alert("Failed to accept job.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineJob = async (jobId: string) => {
    setDeclineJobId(jobId);
  };

  const confirmDeclineJob = async () => {
    if (!declineJobId) return;
    setDeclining(true);
    try {
      await updateDoc(doc(db, "jobs", declineJobId), {
        status: "cancelled",
        cancelledBy: profile?.uid,
        updatedAt: new Date(),
      });
      setPendingJobs(pendingJobs.filter((j) => j.id !== declineJobId));
    } catch {
      alert("Failed to decline job.");
    } finally {
      setDeclining(false);
      setDeclineJobId(null);
    }
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const totalEarnings = completedJobs.reduce((sum, j) => sum + (j.price || 0), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <CelebrationOverlay
        type={celebration.type}
        show={celebration.show}
        onComplete={() => setCelebration({ ...celebration, show: false })}
      />
      <CancellationPopup
        isOpen={!!declineJobId}
        onConfirm={confirmDeclineJob}
        onCancel={() => setDeclineJobId(null)}
        title="Decline this job?"
        message="The client will be notified that their request was declined. This cannot be undone."
        confirmLabel="Yes, Decline"
        cancelLabel="Keep It"
        loading={declining}
      />

      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#4361EE] rounded-2xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg"
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-8 text-6xl">❄️</div>
          <div className="absolute bottom-4 left-12 text-3xl">❄️</div>
        </div>
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold drop-shadow-sm">
                {greeting()}, {operatorProfile?.displayName?.split(" ")[0] || "there"}!
              </h1>
              <p className="mt-1 text-white/80 flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {operatorProfile?.city}, {operatorProfile?.province}
              </p>
            </div>
            <Snowflake className="w-10 h-10 text-white/20" />
          </div>

          {/* Availability Toggle */}
          <div className="mt-5 flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
            <button
              onClick={toggleAvailability}
              className={`relative w-14 h-7 rounded-full transition-colors ${isAvailable ? "bg-green-400" : "bg-gray-400"}`}
            >
              <span
                className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${isAvailable ? "left-7" : "left-0.5"}`}
              />
            </button>
            <span className="text-sm font-medium">
              {isAvailable ? "Available for Jobs" : "Unavailable"}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Stripe Requirement Banner */}
      {!((operatorProfile as OperatorProfile & { stripeConnectAccountId?: string })?.stripeConnectAccountId) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-5"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-amber-900">Set Up Stripe to Start Earning</h3>
              <p className="text-sm text-amber-700 mt-1">
                You need a verified Stripe account before you can receive payments and go public. This includes ID verification for everyone&apos;s safety.
              </p>
              <Link
                href="/dashboard/settings?tab=payment"
                className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition"
              >
                <ExternalLink className="w-4 h-4" />
                Set Up Stripe Account
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {/* Weather + Calendar Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WeatherCard />
        <OperatorMiniCalendar />
      </div>

      {/* Stats Grid — Clickable */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Clock, label: "Pending", value: pendingJobs.length, color: "text-[#4361EE]", bg: "bg-[#4361EE]/10", href: "/dashboard/jobs" },
          { icon: CheckCircle2, label: "Active", value: activeJobs.length, color: "text-green-600", bg: "bg-green-50", href: "/dashboard/log" },
          { icon: DollarSign, label: "Earnings", value: `$${totalEarnings}`, color: "text-orange-500", bg: "bg-orange-50", href: "/dashboard/transactions" },
          { icon: Star, label: "Rating", value: operatorProfile?.rating?.toFixed(1) || "—", color: "text-yellow-500", bg: "bg-yellow-50", href: "/dashboard/analytics" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
          >
            <Link href={stat.href} className="block bg-[var(--bg-card-solid)] rounded-xl p-4 border border-[var(--border-subtle)] hover-lift interactive-card">
              <div className={`w-8 h-8 ${stat.bg} rounded-lg flex items-center justify-center mb-2`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-[var(--text-secondary)]">{stat.label}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        <Link
          href="/dashboard/calendar"
          className="flex flex-col items-center gap-2 p-4 bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-subtle)] hover-lift interactive-card"
        >
          <CalendarDays className="w-5 h-5 text-[#4361EE]" />
          <p className="text-xs font-medium text-[var(--text-secondary)]">Calendar</p>
        </Link>
        <Link
          href="/dashboard/log"
          className="flex flex-col items-center gap-2 p-4 bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-subtle)] hover-lift interactive-card"
        >
          <ClipboardList className="w-5 h-5 text-purple-600" />
          <p className="text-xs font-medium text-[var(--text-secondary)]">Job Log</p>
        </Link>
        <Link
          href="/dashboard/analytics"
          className="flex flex-col items-center gap-2 p-4 bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-subtle)] hover-lift interactive-card"
        >
          <BarChart3 className="w-5 h-5 text-green-600" />
          <p className="text-xs font-medium text-[var(--text-secondary)]">Analytics</p>
        </Link>
      </div>

      {/* Pending Requests */}
      {pendingJobs.length > 0 && (
        <div className="bg-[var(--bg-card-solid)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-lg">New Requests</h2>
              <span className="bg-[#4361EE] text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                {pendingJobs.length}
              </span>
            </div>
            <Link href="/dashboard/jobs" className="text-sm text-[#4361EE] hover:underline font-medium">
              View All
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {pendingJobs.slice(0, 3).map((job) => (
              <div key={job.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <Link href={`/dashboard/u/${job.clientId}`} className="flex-1 group">
                    <div className="flex items-center gap-2 mb-0.5">
                      <User className="w-4 h-4 text-[#4361EE]" />
                      <p className="font-semibold text-[var(--text-primary)]">{clientNames[job.clientId] || "Client"}</p>
                      <ExternalLink className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition" />
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">{job.serviceTypes?.map((s) => s.replace("-", " ")).join(", ")}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-[var(--text-muted)]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {job.scheduledDate && isValidDate(job.scheduledDate)
                          ? format(job.scheduledDate instanceof Date ? job.scheduledDate : new Date(job.scheduledDate), "MMM d, yyyy")
                          : "TBD"}
                        {job.scheduledTime && ` at ${job.scheduledTime}`}
                      </span>
                      <span className="font-semibold text-[var(--text-primary)]">${job.price}</span>
                    </div>
                  </Link>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleDeclineJob(job.id)}
                      disabled={actionLoading === job.id}
                      className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg border border-red-200 transition disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleAcceptJob(job.id)}
                      disabled={actionLoading === job.id}
                      className="p-2.5 text-green-600 hover:bg-green-50 rounded-lg border border-green-200 transition disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Jobs */}
      <div className="bg-[var(--bg-card-solid)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <h2 className="font-semibold text-lg">Active Jobs</h2>
          <Link href="/dashboard/log" className="text-sm text-[#4361EE] hover:underline font-medium">
            View All
          </Link>
        </div>
        {loading ? (
          <div className="p-8 text-center text-[var(--text-muted)]">Loading jobs...</div>
        ) : activeJobs.length === 0 && pendingJobs.length === 0 ? (
          <div className="p-8 text-center">
            <Snowflake className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-[var(--text-secondary)]">No active jobs right now</p>
          </div>
        ) : activeJobs.length === 0 ? (
          <div className="p-8 text-center text-[var(--text-muted)] text-sm">No accepted jobs yet. Check your requests above!</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {activeJobs.map((job) => (
              <div key={job.id} className="px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                  <Link href={`/dashboard/u/${job.clientId}`} className="flex items-center gap-2 group">
                    <User className="w-4 h-4 text-[#4361EE]" />
                    <span className="font-semibold text-[var(--text-primary)]">{clientNames[job.clientId] || "Client"}</span>
                    <ExternalLink className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition" />
                  </Link>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">${job.price}</span>
                    <StatusBadge status={job.status} />
                  </div>
                </div>
                <ProgressTracker status={job.status} />
                {/* Queue indicator */}
                {job.status === "accepted" && activeJobs.some((j) => j.status === "in-progress") && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-100">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-xs font-medium text-amber-700">
                      Queued — will start after current job
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between mt-3">
                  <p className="text-sm text-[var(--text-muted)]">
                    {job.serviceTypes?.map((s) => s.replace("-", " ")).join(", ")}
                  </p>
                  <Link
                    href={`/dashboard/messages/${job.chatId}`}
                    className="flex items-center gap-1 text-sm text-[#4361EE] hover:underline"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Chat
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Performance Card */}
      <div className="bg-[var(--bg-card-solid)] rounded-2xl border border-[var(--border-subtle)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Performance</h2>
          <Link href="/dashboard/analytics" className="text-sm text-[#4361EE] hover:underline font-medium flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            Full Analytics
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-[#4361EE]/10 rounded-xl">
            <p className="text-2xl font-bold text-[#4361EE]">
              {operatorProfile?.totalJobsCompleted || 0}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Jobs Done</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-xl">
            <p className="text-2xl font-bold text-yellow-600">
              {operatorProfile?.rating?.toFixed(1) || "—"}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Avg Rating</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-xl">
            <p className="text-2xl font-bold text-green-600">
              ${totalEarnings}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Earned</p>
          </div>
        </div>
      </div>
    </div>
  );
}
