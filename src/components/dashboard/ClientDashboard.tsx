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
  ExternalLink,
  ShieldCheck,
  Phone,
  ArrowRight,
  ClipboardList,
  MessageCircle,
  Search,
  Home,
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
    <div className="surface-panel min-w-0 p-4">
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
                ? "bg-[#111111] text-white font-bold"
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
        className="btn-secondary mt-4 w-full px-4 py-2.5 text-sm md:text-base"
      >
        View Full Calendar
        <ArrowRight className="w-4 h-4" />
      </Link>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <Link
          href="/dashboard/find"
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[#061321]/10 bg-[#ff820e] px-3 py-2 text-xs font-black text-[#061321] transition hover:bg-[#f59b3d] active:scale-[0.99]"
        >
          <Plus className="w-3.5 h-3.5" />
          Book help
        </Link>
        <Link
          href="/dashboard/log"
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[#061321]/12 bg-[#f3f8fb] px-3 py-2 text-xs font-black text-[#061321] transition hover:bg-white active:scale-[0.99]"
        >
          Job log
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
        label: "Add phone",
        done: !!ext.phone,
        icon: <Phone className="w-4 h-4" />,
        href: "/dashboard/settings",
        description: "For arrival updates",
      },
      {
        key: "address",
        label: "Add address",
        done: !!(ext.address && ext.city),
        icon: <MapPin className="w-4 h-4" />,
        href: "/dashboard/settings",
        description: "Unlock nearby matches",
      },
      {
        key: "verification",
        label: "Verify ID",
        done: !!ext.idPhotoUrl,
        icon: <ShieldCheck className="w-4 h-4" />,
        href: "/dashboard/settings?tab=verification",
        description: "Build booking trust",
      },
    ];
  }, [clientProfile]);

  const completedSetupCount = clientSetupSteps.filter((s) => s.done).length;
  const allSetupComplete = completedSetupCount === clientSetupSteps.length;
  const nextClientSetupStep = clientSetupSteps.find((step) => !step.done);
  const profileCompletionPercent = clientSetupSteps.length
    ? Math.round((completedSetupCount / clientSetupSteps.length) * 100)
    : 100;

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

        const operatorIds = [...new Set(active.map((j) => j.operatorId))];
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
  const firstName = clientProfile?.displayName?.split(" ")[0] || "there";
  const locationLabel =
    [clientProfile?.city, clientProfile?.province].filter(Boolean).join(", ") || "Your service area";
  const nextStepLabel = nextClientSetupStep?.label || "Book snow help";
  const nextStepDescription = nextClientSetupStep?.description || "Pick a nearby operator";
  const primaryAction = nextClientSetupStep
    ? {
        href: nextClientSetupStep.href,
        label: nextClientSetupStep.label,
        icon: nextClientSetupStep.icon,
      }
    : {
        href: "/dashboard/find",
        label: "Book snow help",
        icon: <Plus className="h-5 w-5" />,
      };
  const quickActions = [
    {
      href: primaryAction.href,
      label: primaryAction.label,
      detail: nextClientSetupStep ? nextClientSetupStep.description : "Start a request",
      icon: primaryAction.icon,
      variant: "primary",
    },
    {
      href: "/dashboard/find",
      label: "Find operators",
      detail: "Compare nearby help",
      icon: <Search className="h-5 w-5" />,
      variant: "secondary",
    },
    {
      href: "/dashboard/messages",
      label: "Messages",
      detail: "Keep jobs moving",
      icon: <MessageCircle className="h-5 w-5" />,
      variant: "secondary",
    },
  ];

  return (
    <div className="max-w-[1240px] mx-auto space-y-4 xl:min-h-[calc(100vh-6.75rem)] xl:flex xl:flex-col">
      <CelebrationOverlay type="booking" show={showCelebration} onComplete={() => setShowCelebration(false)} />

      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="surface-panel overflow-hidden text-[var(--text-primary)]"
      >
        <div className="grid grid-cols-1 gap-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(330px,0.85fr)]">
          <div className="p-5 md:p-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#061321]/10 bg-[#dfeef8] px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[#061321]/70">
              <Home className="h-4 w-4 text-[#061321]" strokeWidth={3} />
              Home base
            </div>
            <h1 className="mt-4 text-3xl md:text-[2.25rem] font-headline font-black leading-tight">
              {greeting()}, {firstName}
            </h1>
            <p className="mt-2 max-w-xl text-sm font-bold leading-5 text-[#061321]/62 md:text-base">
              Next: {nextStepLabel}. Then book local help and track the job here.
            </p>
            <p className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-black text-[#061321]/68">
              <MapPin className="h-4 w-4 text-[#ff820e]" strokeWidth={3} />
              {locationLabel}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className={`group flex min-h-[5.75rem] flex-col justify-between rounded-2xl border px-4 py-3 transition hover:-translate-y-0.5 active:scale-[0.99] ${
                    action.variant === "primary"
                      ? "border-[#061321]/18 bg-[#ff820e] text-[#061321] shadow-[0_14px_24px_rgba(255,130,14,0.2)]"
                      : "border-[#061321]/10 bg-white text-[#061321] hover:bg-[#dfeef8]"
                  }`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#061321]/8">{action.icon}</span>
                    <ArrowRight className="h-4 w-4 opacity-45 transition group-hover:translate-x-0.5 group-hover:opacity-80" />
                  </span>
                  <span>
                    <span className="block text-sm font-black leading-tight">{action.label}</span>
                    <span className="mt-1 block text-xs font-bold leading-4 text-[#061321]/56">{action.detail}</span>
                  </span>
                </Link>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                { icon: ShieldCheck, label: "Profile", value: `${profileCompletionPercent}% ready` },
                { icon: ClipboardList, label: "Jobs", value: activeJobs.length ? `${activeJobs.length} active` : "None active" },
                { icon: MessageCircle, label: "Messages", value: "Operator chats" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-2xl border border-[#061321]/8 bg-[#f8fbfd] px-4 py-3">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#061321]/48">
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </div>
                    <p className="mt-1 text-sm font-black text-[#061321]">{item.value}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-[#061321]/8 bg-[#eef5f9] p-5 md:p-6 lg:border-l lg:border-t-0">
            <div className="rounded-2xl border border-[#061321]/10 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#061321]/48">Next step</p>
                  <h2 className="mt-1 text-xl font-headline font-black text-[#061321]">
                    {nextStepLabel}
                  </h2>
                </div>
                <span className="rounded-full bg-[#ff820e]/18 px-2.5 py-1 text-xs font-black text-[#061321]">
                  {profileCompletionPercent}%
                </span>
              </div>
              <p className="mt-2 text-sm font-bold leading-5 text-[#061321]/62">
                {nextStepDescription}
              </p>
              <div className="mt-4 h-2 rounded-full bg-[#dfeef8]">
                <motion.div
                  className="h-full rounded-full bg-[#ff820e]"
                  initial={{ width: 0 }}
                  animate={{ width: `${profileCompletionPercent}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>

            <Link
              href="/dashboard/calendar"
              className="group mt-3 block rounded-2xl border border-[#061321]/10 bg-white px-4 py-4 transition hover:bg-[#f8fbfd]"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-[#061321]/52">Weather</p>
                <ArrowRight className="w-4 h-4 text-[#061321]/45 group-hover:translate-x-0.5 transition-transform" />
              </div>
              {weatherLoading ? (
                <p className="mt-2 text-sm font-bold text-[#061321]/48">Loading...</p>
              ) : weather ? (
                <div className="mt-2 flex items-end justify-between">
                  <div className="min-w-0">
                    <p className="text-4xl font-headline font-black leading-none">{weather.temp}°C</p>
                    <p className="mt-1 text-sm font-bold text-[#061321]/58">Feels {weather.feelsLike}°</p>
                    <p className="mt-1 truncate text-lg font-black">{weather.condition}</p>
                  </div>
                  <div className="text-4xl" aria-hidden>
                    {weather.icon}
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm font-bold text-[#061321]/48">Weather unavailable</p>
              )}
            </Link>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 xl:flex-1 xl:min-h-0">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_350px] gap-4 items-stretch xl:min-h-[320px]">
          {/* Active Jobs */}
          <div className="surface-panel overflow-hidden xl:min-h-[320px] xl:flex xl:flex-col">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] px-6 py-4">
              <h2 className="font-headline text-lg font-black">Active jobs</h2>
              <Link
                href="/dashboard/log"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#061321]/10 bg-[#f3f8fb] px-3 py-1.5 text-xs font-black text-[#061321] transition hover:bg-white active:scale-[0.99]"
              >
                View all
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {loading ? (
              <div className="p-8 text-center text-[var(--text-muted)] xl:flex-1 xl:flex xl:items-center xl:justify-center">Loading jobs...</div>
            ) : activeJobs.length === 0 ? (
              <div className="px-8 py-6 text-center flex flex-col items-center justify-center xl:flex-1">
                <Snowflake className="w-10 h-10 text-[var(--text-muted)]/40 mx-auto mb-3" />
                <p className="font-bold text-[#061321]/56">No active jobs</p>
                <Link
                  href="/dashboard/find"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-[#061321]/10 bg-[#ff820e] px-4 py-2 text-xs font-black text-[#061321] transition hover:bg-[#f59b3d] active:scale-[0.99]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Book help
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-soft)] xl:overflow-y-auto xl:min-h-0 xl:flex-1">
                {activeJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between px-6 py-4 transition hover:bg-[var(--bg-secondary)]">
                    <Link href={`/dashboard/messages/${job.chatId}`} className="flex-1 min-w-0 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <User className="w-4 h-4 text-[var(--text-primary)]" />
                          <p className="font-semibold text-[var(--text-primary)] truncate">{operatorNames[job.operatorId] || "Operator"}</p>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] truncate">{job.serviceTypes?.map((s) => s.replace("-", " ")).join(", ")}</p>
                        <p className="text-sm text-[var(--text-muted)] flex items-center gap-1 mt-0.5 truncate">
                          <Calendar className="w-3.5 h-3.5" />
                          {job.scheduledDate && isValidDate(job.scheduledDate) ? format(job.scheduledDate instanceof Date ? job.scheduledDate : new Date(job.scheduledDate), "MMM d, yyyy") : "TBD"}{" "}
                          {job.scheduledTime && `at ${job.scheduledTime}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-semibold text-[var(--text-secondary)]">${job.price}</span>
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
              className="surface-panel p-4 xl:flex-none"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-headline font-black text-[#061321]">Setup</h3>
                  <p className="mt-0.5 text-[11px] font-bold text-[#061321]/48">
                    {completedSetupCount} of {clientSetupSteps.length} complete
                  </p>
                </div>
                <span className="text-xs font-black text-[#061321]">
                  {Math.round((completedSetupCount / clientSetupSteps.length) * 100)}%
                </span>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-[#dfeef8]">
                <motion.div
                  className="h-full rounded-full bg-[#ff820e]"
                  initial={{ width: 0 }}
                  animate={{ width: `${(completedSetupCount / clientSetupSteps.length) * 100}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
              {clientSetupSteps.find((step) => !step.done) && (
                <div className="mt-3">
                  <Link
                    href={clientSetupSteps.find((step) => !step.done)?.href || "/dashboard/settings"}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#061321]/10 bg-[#f3f8fb] px-3 py-2.5 transition hover:bg-white"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[#061321]/45">Next</p>
                      <p className="truncate text-xs font-black text-[#061321]">
                        {clientSetupSteps.find((step) => !step.done)?.label}
                      </p>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[#061321]/45" />
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      </div>
    </div>
  );
}
