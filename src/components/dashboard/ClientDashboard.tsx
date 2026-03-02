"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Job, ClientProfile, UserProfile } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import CelebrationOverlay from "@/components/CelebrationOverlay";
import { WeatherCard } from "@/context/WeatherContext";
import { motion } from "framer-motion";
import {
  Snowflake,
  Plus,
  Clock,
  CheckCircle2,
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
  User,
  X,
  MessageCircle,
  Receipt,
  ExternalLink,
  ClipboardList,
  CalendarDays,
  Camera,
  ShieldCheck,
  Phone,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isToday, isSameDay } from "date-fns";

const isValidDate = (date: unknown): boolean => {
  if (!date) return false;
  try {
    const d = date instanceof Date ? date : new Date(date as string);
    return d instanceof Date && !isNaN(d.getTime());
  } catch {
    return false;
  }
};

function MiniCalendar() {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });
  const today = new Date();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm">{format(currentMonth, "MMMM yyyy")}</h3>
        <div className="flex gap-1">
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-1 hover:bg-gray-100 rounded text-gray-500 text-xs">◀</button>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-1 hover:bg-gray-100 rounded text-gray-500 text-xs">▶</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => <div key={d} className="py-1 text-gray-400 font-medium">{d}</div>)}
        {days.map((day, i) => (
          <div key={i} className={`py-1.5 rounded-lg text-xs ${
            isToday(day) ? "bg-[#246EB9] text-white font-bold" :
            isSameMonth(day, currentMonth) ? "text-gray-900" : "text-gray-300"
          }`}>
            {format(day, "d")}
          </div>
        ))}
      </div>
      <Link href="/dashboard/calendar" className="block text-center text-xs text-[#246EB9] font-medium mt-2 hover:underline">View Full Calendar</Link>
    </div>
  );
}

export default function ClientDashboard() {
  const { profile } = useAuth();
  const clientProfile = profile as ClientProfile;
  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [operatorNames, setOperatorNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [cancellingJob, setCancellingJob] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  // Client profile setup steps
  const clientSetupSteps = React.useMemo(() => {
    if (!clientProfile) return [];
    const ext = clientProfile as ClientProfile & { idPhotoUrl?: string; avatar?: string };
    return [
      {
        key: "phone",
        label: "Add Phone Number",
        done: !!ext.phone,
        icon: <Phone className="w-4 h-4" />,
        href: "/dashboard/settings",
        description: "So operators can reach you",
      },
      {
        key: "address",
        label: "Add Home Address",
        done: !!(ext.address && ext.city),
        icon: <MapPin className="w-4 h-4" />,
        href: "/dashboard/settings",
        description: "Operators need your location",
      },
      {
        key: "verification",
        label: "Upload Government ID",
        done: !!ext.idPhotoUrl,
        icon: <ShieldCheck className="w-4 h-4" />,
        href: "/dashboard/settings?tab=verification",
        description: "Build trust with operators",
      },
    ];
  }, [clientProfile]);

  const completedSetupCount = clientSetupSteps.filter((s) => s.done).length;
  const allSetupComplete = completedSetupCount === clientSetupSteps.length;

  useEffect(() => {
    const fetchJobs = async () => {
      if (!profile?.uid) return;
      try {
        const allJobsQuery = query(
          collection(db, "jobs"),
          where("clientId", "==", profile.uid)
        );
        const allSnap = await getDocs(allJobsQuery);
        const allJobs = allSnap.docs.map((d) => {
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

        const activeStatuses = ["pending", "accepted", "en-route", "in-progress"];
        const active = allJobs
          .filter((j) => activeStatuses.includes(j.status))
          .sort((a, b) => {
            const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
            const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
            return bTime - aTime;
          })
          .slice(0, 5);
        setActiveJobs(active);

        const recent = allJobs
          .filter((j) => j.status === "completed")
          .sort((a, b) => {
            const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
            const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
            return bTime - aTime;
          })
          .slice(0, 5);
        setRecentJobs(recent);

        const operatorIds = [...new Set([...active, ...recent].map((j) => j.operatorId))];
        const names: Record<string, string> = {};
        await Promise.all(
          operatorIds.map(async (oid) => {
            try {
              const userDoc = await getDoc(doc(db, "users", oid));
              if (userDoc.exists()) {
                const data = userDoc.data() as UserProfile;
                names[oid] = data.displayName || "Operator";
              }
            } catch {}
          })
        );
        setOperatorNames(names);
      } catch (error) {
        console.error("Error fetching jobs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [profile?.uid]);

  const cancelJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to cancel this job?")) return;
    setCancellingJob(jobId);
    try {
      await updateDoc(doc(db, "jobs", jobId), {
        status: "cancelled",
        updatedAt: new Date(),
      });
      setActiveJobs(activeJobs.filter((j) => j.id !== jobId));
    } catch (error) {
      console.error("Error cancelling job:", error);
      alert("Failed to cancel job. Please try again.");
    } finally {
      setCancellingJob(null);
    }
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <CelebrationOverlay type="booking" show={showCelebration} onComplete={() => setShowCelebration(false)} />

      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#246EB9] rounded-2xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden"
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-8 text-6xl">❄️</div>
          <div className="absolute bottom-4 right-24 text-4xl">❄️</div>
        </div>
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold drop-shadow-sm">
              {greeting()}, {clientProfile?.displayName?.split(" ")[0] || "there"}!
            </h1>
            <p className="mt-1 text-white/80">
              <MapPin className="w-4 h-4 inline mr-1" />
              {clientProfile?.city}, {clientProfile?.province}
            </p>
          </div>
          <Snowflake className="w-10 h-10 text-white/20" />
        </div>
        <Link
          href="/dashboard/find"
          className="inline-flex items-center gap-2 mt-5 px-6 py-3 bg-white text-[#246EB9] rounded-xl font-bold transition shadow-lg hover:shadow-xl hover:-translate-y-0.5 relative z-10"
        >
          <Plus className="w-5 h-5" />
          Request Snow Removal
        </Link>
      </motion.div>

      {/* Profile Setup Widget — shown until all steps complete */}
      {!allSetupComplete && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">Complete Your Profile</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {completedSetupCount} of {clientSetupSteps.length} steps done
                </p>
              </div>
              <span className="text-sm font-bold text-[#246EB9]">
                {Math.round((completedSetupCount / clientSetupSteps.length) * 100)}%
              </span>
            </div>
            <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#246EB9] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(completedSetupCount / clientSetupSteps.length) * 100}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {clientSetupSteps.map((step) => (
              <Link
                key={step.key}
                href={step.href}
                className={`flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition ${step.done ? "opacity-60" : ""}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  step.done ? "bg-green-100 text-green-600" : "bg-[#246EB9]/10 text-[#246EB9]"
                }`}>
                  {step.done ? <CheckCircle className="w-4 h-4" /> : step.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${step.done ? "line-through text-gray-400" : "text-gray-900"}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
                {!step.done && <ExternalLink className="w-4 h-4 text-gray-400 shrink-0" />}
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* Weather + Calendar Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WeatherCard />
        <MiniCalendar />
      </div>

      {/* Stats Row — Clickable */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Clock, label: "Active Jobs", value: activeJobs.length, color: "text-[#246EB9]", bg: "bg-[#246EB9]/10", href: "/dashboard/log" },
          { icon: CheckCircle2, label: "Completed", value: recentJobs.length, color: "text-green-600", bg: "bg-green-50", href: "/dashboard/log" },
          { icon: DollarSign, label: "Total Spent", value: `$${recentJobs.reduce((sum, j) => sum + (j.price || 0), 0)}`, color: "text-orange-500", bg: "bg-orange-50", href: "/dashboard/transactions" },
          { icon: TrendingUp, label: "Saved Ops", value: clientProfile?.savedOperators?.length || 0, color: "text-purple-600", bg: "bg-purple-50", href: "/dashboard/find" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
          >
            <Link href={stat.href} className="block bg-white rounded-xl p-4 border border-gray-100 hover-lift interactive-card">
              <div className={`w-8 h-8 ${stat.bg} rounded-lg flex items-center justify-center mb-2`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/dashboard/calendar"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover-lift interactive-card"
        >
          <div className="w-10 h-10 bg-[#246EB9]/10 rounded-xl flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-[#246EB9]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Calendar</p>
            <p className="text-xs text-gray-500">Schedule & weather</p>
          </div>
        </Link>
        <Link
          href="/dashboard/log"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover-lift interactive-card"
        >
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Job Log</p>
            <p className="text-xs text-gray-500">All job history</p>
          </div>
        </Link>
      </div>

      {/* Active Jobs */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-lg">Active Jobs</h2>
          <Link href="/dashboard/log" className="text-sm text-[#246EB9] hover:underline font-medium">
            View All
          </Link>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading jobs...</div>
        ) : activeJobs.length === 0 ? (
          <div className="p-8 text-center">
            <Snowflake className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No active jobs right now</p>
            <Link href="/dashboard/find" className="inline-flex items-center gap-1 mt-3 text-sm text-[#246EB9] hover:underline">
              <Plus className="w-4 h-4" /> Find an operator
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {activeJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition">
                <Link href={`/dashboard/messages/${job.chatId}`} className="flex-1 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <User className="w-4 h-4 text-[#246EB9]" />
                      <p className="font-semibold text-gray-900">{operatorNames[job.operatorId] || "Operator"}</p>
                    </div>
                    <p className="text-sm text-gray-700">{job.serviceTypes?.map((s) => s.replace("-", " ")).join(", ")}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {job.scheduledDate && isValidDate(job.scheduledDate) ? format(job.scheduledDate instanceof Date ? job.scheduledDate : new Date(job.scheduledDate), "MMM d, yyyy") : "TBD"}{" "}
                      {job.scheduledTime && `at ${job.scheduledTime}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-700">${job.price}</span>
                    <StatusBadge status={job.status} />
                  </div>
                </Link>
                {job.status === "pending" && (
                  <button
                    onClick={() => cancelJob(job.id)}
                    disabled={cancellingJob === job.id}
                    className="ml-3 p-2 text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                    title="Cancel job"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Jobs */}
      {recentJobs.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-lg">Recent Completions</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {recentJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition group">
                <Link href={`/dashboard/u/${job.operatorId}`} className="flex-1 flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#246EB9]/10 rounded-full flex items-center justify-center text-[#246EB9] font-bold shrink-0">
                    {operatorNames[job.operatorId]?.charAt(0)?.toUpperCase() || "O"}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-gray-900">{operatorNames[job.operatorId] || "Operator"}</p>
                      <ExternalLink className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition" />
                    </div>
                    <p className="text-sm text-gray-700">{job.serviceTypes?.map((s) => s.replace("-", " ")).join(", ")}</p>
                    <p className="text-sm text-gray-500">
                      {job.completionTime && isValidDate(job.completionTime) ? format(job.completionTime instanceof Date ? job.completionTime : new Date(job.completionTime), "MMM d, yyyy") : "Recently completed"}
                    </p>
                  </div>
                </Link>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold">${job.price}</p>
                    <StatusBadge status="completed" />
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/dashboard/messages/${job.chatId}`} className="p-2 text-[#246EB9] hover:bg-[#246EB9]/10 rounded-lg transition" title="View chat">
                      <MessageCircle className="w-5 h-5" />
                    </Link>
                    <Link href="/dashboard/transactions" className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition" title="View transaction">
                      <Receipt className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
