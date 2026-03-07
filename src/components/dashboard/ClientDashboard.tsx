"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Job, ClientProfile, UserProfile } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import CelebrationOverlay from "@/components/CelebrationOverlay";
import { useWeather } from "@/context/WeatherContext";
import { motion } from "framer-motion";
import {
  Snowflake,
  Plus,
  MapPin,
  Calendar,
  User,
  X,
  MessageCircle,
  Receipt,
  ExternalLink,
  ShieldCheck,
  Phone,
  CheckCircle,
  ArrowRight,
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

function MiniCalendar() {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  return (
    <div className="min-w-0 bg-[var(--bg-card-solid)] rounded-3xl border border-[var(--border-color)] p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="min-w-0 truncate pr-2 font-headline font-bold text-xl md:text-2xl text-[var(--text-primary)] leading-none">{format(currentMonth, "MMMM yyyy")}</h3>
        <div className="flex gap-1.5">
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            className="h-8 w-8 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
            aria-label="Previous month"
          >
            ◀
          </button>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            className="h-8 w-8 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
            aria-label="Next month"
          >
            ▶
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="py-1 text-[var(--text-muted)] font-semibold">
            {d}
          </div>
        ))}
        {days.map((day, i) => (
          <div
            key={i}
            className={`py-1.5 rounded-lg text-xs md:text-sm ${
              isToday(day)
                ? "bg-[#2F6FED] text-white font-bold"
                : isSameMonth(day, currentMonth)
                  ? "text-[var(--text-secondary)]"
                  : "text-[var(--text-muted)]/60"
            }`}
          >
            {format(day, "d")}
          </div>
        ))}
      </div>
      <Link
        href="/dashboard/calendar"
        className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm md:text-base font-semibold text-[var(--accent)] hover:bg-[var(--accent-soft)] active:scale-[0.99] transition"
      >
        View Full Calendar
        <ArrowRight className="w-4 h-4" />
      </Link>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <Link
          href="/dashboard/find"
          className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#2F6FED] px-3 py-2 text-[11px] font-semibold text-white shadow-sm hover:bg-[#2A63D5] active:scale-[0.99] transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Find Operator
        </Link>
        <Link
          href="/dashboard/log"
          className="inline-flex items-center justify-center gap-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-[11px] font-semibold text-[var(--accent)] hover:bg-[var(--accent-soft)] active:scale-[0.99] transition"
        >
          Open Log
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

export default function ClientDashboard() {
  const { profile } = useAuth();
  const { weather, loading: weatherLoading } = useWeather();
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
          .slice(0, 3);
        setActiveJobs(active);

        const recent = allJobs
          .filter((j) => j.status === "completed")
          .sort((a, b) => {
            const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
            const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
            return bTime - aTime;
          })
          .slice(0, 3);
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
    <div className="max-w-[1240px] mx-auto space-y-4 xl:min-h-[calc(100vh-6.75rem)] xl:flex xl:flex-col">
      <CelebrationOverlay type="booking" show={showCelebration} onComplete={() => setShowCelebration(false)} />

      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[linear-gradient(118deg,#2F6FED_0%,#4D8BFB_42%,#6EA7F4_100%)] rounded-3xl p-5 md:p-6 text-white shadow-[0_16px_30px_rgba(47,111,237,0.24)] relative overflow-hidden border border-white/20"
      >
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute -top-14 right-6 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute -bottom-12 left-[35%] h-32 w-48 rounded-full bg-white/10 blur-2xl" />
        </div>
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-4 md:gap-6 items-stretch">
          <div className="min-w-0">
            <h1 className="text-3xl md:text-[2.2rem] font-headline font-extrabold drop-shadow-sm leading-tight">
              {greeting()}, {clientProfile?.displayName?.split(" ")[0] || "there"}!
            </h1>
            <p className="mt-1.5 text-white/90 text-sm md:text-base">Book trusted local help in a few taps.</p>
            <p className="mt-1.5 text-white/80 text-base md:text-lg">
              <MapPin className="w-4 h-4 inline mr-1" />
              {clientProfile?.city}, {clientProfile?.province}
            </p>
            <Link
              href="/dashboard/find"
              className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-white text-[#2F6FED] rounded-2xl font-bold text-base md:text-lg leading-none transition shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99]"
            >
              <Plus className="w-5 h-5" />
              Book Snow Help
            </Link>
          </div>

          <Link
            href="/dashboard/calendar"
            className="group w-full rounded-2xl border border-white/30 bg-[linear-gradient(145deg,rgba(123,166,255,0.33),rgba(59,117,240,0.56))] px-5 py-4 backdrop-blur-sm hover:border-white/50 transition"
          >
            <div className="flex items-center justify-between">
              <p className="text-white/80 text-sm md:text-base font-medium">Today&apos;s Weather</p>
              <ArrowRight className="w-4 h-4 text-white/80 group-hover:translate-x-0.5 transition-transform" />
            </div>
            {weatherLoading ? (
              <p className="mt-2 text-white/80">Loading weather...</p>
            ) : weather ? (
              <>
                <div className="mt-1 flex items-end justify-between">
                  <div>
                    <p className="text-5xl font-headline font-bold leading-none">{weather.temp}°C</p>
                    <p className="text-lg text-white/90 mt-0.5">Feels {weather.feelsLike}°</p>
                    <p className="text-2xl font-semibold mt-1.5">{weather.condition}</p>
                  </div>
                  <div className="text-5xl" aria-hidden>
                    {weather.icon}
                  </div>
                </div>
              </>
            ) : (
              <p className="mt-2 text-white/80">Weather unavailable</p>
            )}
          </Link>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 xl:flex-1 xl:min-h-0">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_350px] gap-4 items-stretch xl:min-h-[320px]">
          {/* Active Jobs */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden xl:min-h-[320px] xl:flex xl:flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-lg">Active Jobs</h2>
              <Link
                href="/dashboard/log"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8E3F7] bg-[#F8FBFF] px-3 py-1.5 text-xs font-semibold text-[#3B6FE2] hover:bg-[#EEF4FF] active:scale-[0.99] transition"
              >
                View All
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {loading ? (
              <div className="p-8 text-center text-gray-400 xl:flex-1 xl:flex xl:items-center xl:justify-center">Loading jobs...</div>
            ) : activeJobs.length === 0 ? (
              <div className="px-8 py-6 text-center flex flex-col items-center justify-center xl:flex-1">
                <Snowflake className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No active jobs right now</p>
                <Link
                  href="/dashboard/find"
                  className="inline-flex items-center gap-1.5 mt-3 rounded-lg border border-[#D8E3F7] bg-[#F8FBFF] px-3 py-1.5 text-xs font-semibold text-[#3B6FE2] hover:bg-[#EEF4FF] active:scale-[0.99] transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Find an Operator
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 xl:overflow-y-auto xl:min-h-0 xl:flex-1">
                {activeJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition">
                    <Link href={`/dashboard/messages/${job.chatId}`} className="flex-1 min-w-0 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <User className="w-4 h-4 text-[#2F6FED]" />
                          <p className="font-semibold text-gray-900 truncate">{operatorNames[job.operatorId] || "Operator"}</p>
                        </div>
                        <p className="text-sm text-gray-700 truncate">{job.serviceTypes?.map((s) => s.replace("-", " ")).join(", ")}</p>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                          <Calendar className="w-3.5 h-3.5" />
                          {job.scheduledDate && isValidDate(job.scheduledDate) ? format(job.scheduledDate instanceof Date ? job.scheduledDate : new Date(job.scheduledDate), "MMM d, yyyy") : "TBD"}{" "}
                          {job.scheduledTime && `at ${job.scheduledTime}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
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

          <div className="space-y-4 xl:min-h-[320px] xl:flex xl:flex-col">
          <div className="shrink-0">
            <MiniCalendar />
          </div>

          {/* Profile Setup Widget — shown until all steps complete */}
          {!allSetupComplete && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden xl:min-h-0 xl:flex xl:flex-col xl:flex-1"
            >
              <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Profile Setup</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {completedSetupCount}/{clientSetupSteps.length} complete
                  </p>
                </div>
                <span className="text-xs font-bold text-[#2F6FED]">
                  {Math.round((completedSetupCount / clientSetupSteps.length) * 100)}%
                </span>
              </div>
              <div className="px-4 pt-2">
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[#2F6FED] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(completedSetupCount / clientSetupSteps.length) * 100}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>
              <div className="divide-y divide-gray-50 mt-2 xl:overflow-y-auto xl:min-h-0 xl:flex-1">
                {clientSetupSteps.map((step) => (
                  <Link
                    key={step.key}
                    href={step.href}
                    className={`flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition ${step.done ? "opacity-60" : ""}`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      step.done ? "bg-green-100 text-green-600" : "bg-[#2F6FED]/10 text-[#2F6FED]"
                    }`}>
                      {step.done ? <CheckCircle className="w-3.5 h-3.5" /> : step.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${step.done ? "line-through text-gray-400" : "text-gray-900"}`}>
                        {step.label}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">{step.description}</p>
                    </div>
                    {!step.done && <ExternalLink className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

        {/* Recent Jobs Bottom Dock */}
        <div className="bg-white rounded-2xl border border-[#DCE6F7] overflow-hidden xl:min-h-[230px] xl:flex xl:flex-col shadow-sm relative z-10">
          <div className="px-6 py-3.5 border-b border-[#E8EEF9] bg-[linear-gradient(180deg,#F8FBFF_0%,#FFFFFF_100%)] flex items-center justify-between">
            <h2 className="font-semibold text-lg text-[#1F2A44]">Recent Completions</h2>
            <Link
              href="/dashboard/log"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8E3F7] bg-white px-3 py-1.5 text-xs font-semibold text-[#3B6FE2] hover:bg-[#EEF4FF] active:scale-[0.99] transition"
            >
              Open
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {recentJobs.length === 0 ? (
            <div className="p-8 text-sm text-center text-gray-500">No completed jobs yet.</div>
          ) : (
            <div className="divide-y divide-gray-50 xl:overflow-y-auto xl:min-h-0 xl:flex-1">
              {recentJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 transition group gap-3">
                  <Link href={`/dashboard/u/${job.operatorId}`} className="flex-1 min-w-0 flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#2F6FED]/10 rounded-full flex items-center justify-center text-[#2F6FED] font-bold shrink-0">
                      {operatorNames[job.operatorId]?.charAt(0)?.toUpperCase() || "O"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-gray-900 truncate">{operatorNames[job.operatorId] || "Operator"}</p>
                        <ExternalLink className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition" />
                      </div>
                      <p className="text-sm text-gray-700 truncate">{job.serviceTypes?.map((s) => s.replace("-", " ")).join(", ")}</p>
                      <p className="text-sm text-gray-500">
                        {job.completionTime && isValidDate(job.completionTime) ? format(job.completionTime instanceof Date ? job.completionTime : new Date(job.completionTime), "MMM d, yyyy") : "Recently completed"}
                      </p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="font-semibold">${job.price}</p>
                      <StatusBadge status="completed" />
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/dashboard/messages/${job.chatId}`} className="p-2 text-[#2F6FED] hover:bg-[#2F6FED]/10 rounded-lg transition" title="View chat">
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
          )}
        </div>
      </div>
    </div>
  );
}
