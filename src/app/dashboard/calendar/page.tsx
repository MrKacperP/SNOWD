"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Job, UserProfile, OperatorProfile, ClientProfile } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import StarRating from "@/components/StarRating";
import BackButton from "@/components/BackButton";
import { useWeather } from "@/context/WeatherContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CloudSnow,
  Sun,
  Cloud,
  Snowflake,
  Clock,
  MapPin,
  Plus,
  X,
  MessageSquare,
  Zap,
  GraduationCap,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";

interface WeatherDay {
  date: string;
  icon: "snow" | "cloud" | "sun" | "mix";
  high: number;
  low: number;
  snowChance: number;
  description: string;
}

const WEATHER_ICONS = {
  snow: CloudSnow,
  cloud: Cloud,
  sun: Sun,
  mix: Snowflake,
};

function generateSeasonalWeather(): WeatherDay[] {
  const days: WeatherDay[] = [];
  const today = new Date();
  const month = today.getMonth();
  const isWinter = month <= 2 || month >= 10;
  const conditions: Array<{ icon: "snow" | "cloud" | "sun" | "mix"; desc: string; snowChance: number }> = isWinter
    ? [
        { icon: "snow", desc: "Snow possible", snowChance: 55 },
        { icon: "cloud", desc: "Cloudy", snowChance: 20 },
        { icon: "mix", desc: "Mixed precipitation", snowChance: 35 },
        { icon: "sun", desc: "Clear and cold", snowChance: 5 },
      ]
    : [
        { icon: "sun", desc: "Sunny", snowChance: 0 },
        { icon: "cloud", desc: "Partly cloudy", snowChance: 0 },
        { icon: "cloud", desc: "Warm with clouds", snowChance: 0 },
        { icon: "sun", desc: "Clear", snowChance: 0 },
      ];
  for (let i = 0; i < 7; i++) {
    const date = addDays(today, i);
    const c = conditions[i % conditions.length];
    const highBase = isWinter ? -2 : month >= 5 && month <= 8 ? 24 : 12;
    const lowBase = isWinter ? -9 : month >= 5 && month <= 8 ? 15 : 5;
    days.push({
      date: format(date, "yyyy-MM-dd"),
      icon: c.icon,
      high: highBase + (i % 4),
      low: lowBase + (i % 3),
      snowChance: c.snowChance,
      description: c.desc,
    });
  }
  return days;
}

const weatherCodeToDay = (code: number, high: number, snow: number, precipitationChance: number): Pick<WeatherDay, "icon" | "description" | "snowChance"> => {
  if (snow > 0 || [71, 73, 75, 77, 85, 86].includes(code)) {
    return { icon: "snow", description: "Snow possible", snowChance: Math.max(35, precipitationChance) };
  }
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
    return { icon: "cloud", description: high > 0 ? "Rain possible" : "Precipitation possible", snowChance: 0 };
  }
  if ([1, 2].includes(code)) return { icon: "sun", description: "Partly sunny", snowChance: 0 };
  if ([3, 45, 48].includes(code)) return { icon: "cloud", description: "Cloudy", snowChance: 0 };
  return { icon: "sun", description: "Clear", snowChance: 0 };
};

export default function CalendarPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const clientProfile = profile as ClientProfile;
  const { weather: currentWeather } = useWeather();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [jobs, setJobs] = useState<Job[]>([]);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [weather, setWeather] = useState<WeatherDay[]>(generateSeasonalWeather);

  // Operator picker modal
  const [showOperatorPicker, setShowOperatorPicker] = useState(false);
  const [operators, setOperators] = useState<OperatorProfile[]>([]);
  const [operatorSearch, setOperatorSearch] = useState("");
  const [operatorsLoading, setOperatorsLoading] = useState(false);
  const [bookingOperator, setBookingOperator] = useState<OperatorProfile | null>(null);
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [bookingInProgress, setBookingInProgress] = useState(false);

  const isOperator = profile?.role === "operator";

  useEffect(() => {
    const lat = profile?.lat;
    const lng = profile?.lng;
    if (!lat || !lng) return;

    let cancelled = false;

    const fetchForecast = async () => {
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,snowfall_sum&timezone=auto&forecast_days=7`,
          { cache: "no-store" }
        );
        if (!response.ok) throw new Error("Forecast unavailable");

        const data = await response.json();
        const daily = data.daily;
        const liveForecast: WeatherDay[] = daily.time.map((date: string, index: number) => {
          const high = Math.round(daily.temperature_2m_max[index]);
          const low = Math.round(daily.temperature_2m_min[index]);
          const snow = Number(daily.snowfall_sum?.[index] || 0);
          const precipitationChance = Number(daily.precipitation_probability_max?.[index] || 0);
          const mapped = weatherCodeToDay(Number(daily.weather_code[index]), high, snow, precipitationChance);

          return {
            date,
            high,
            low,
            ...mapped,
          };
        });

        if (!cancelled) setWeather(liveForecast);
      } catch {
        if (!cancelled) setWeather(generateSeasonalWeather());
      }
    };

    fetchForecast();

    return () => {
      cancelled = true;
    };
  }, [profile?.lat, profile?.lng]);

  useEffect(() => {
    const fetchJobs = async () => {
      if (!profile?.uid) return;
      try {
        const field = isOperator ? "operatorId" : "clientId";
        const q = query(collection(db, "jobs"), where(field, "==", profile.uid));
        const snap = await getDocs(q);
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
        setJobs(allJobs);

        const otherField = isOperator ? "clientId" : "operatorId";
        const ids = [...new Set(allJobs.map((j) => (j as unknown as Record<string, string>)[otherField]))];
        const names: Record<string, string> = {};
        await Promise.all(
          ids.map(async (id) => {
            try {
              const userDoc = await getDoc(doc(db, "users", id));
              if (userDoc.exists()) names[id] = (userDoc.data() as UserProfile).displayName || "User";
            } catch {}
          })
        );
        setUserNames(names);
      } catch (error) {
        console.error("Error fetching calendar jobs:", error);
      }
    };
    fetchJobs();
  }, [profile?.uid, isOperator]);

  const openOperatorPicker = async () => {
    setShowOperatorPicker(true);
    setOperatorSearch("");
    setBookingOperator(null);
    if (operators.length === 0) {
      setOperatorsLoading(true);
      try {
        const q = query(
          collection(db, "users"),
          where("role", "==", "operator"),
          where("onboardingComplete", "==", true)
        );
        const snap = await getDocs(q);
        const ops = snap.docs
          .map((d) => ({ ...d.data() } as OperatorProfile))
          .filter((op) => !!(op as OperatorProfile & { stripeConnectAccountId?: string }).stripeConnectAccountId);
        setOperators(ops.sort((a, b) => b.rating - a.rating));
      } catch (err) {
        console.error("Error loading operators:", err);
      } finally {
        setOperatorsLoading(false);
      }
    }
  };

  const filteredOperators = operators.filter((op) => {
    const term = operatorSearch.toLowerCase();
    return (
      !term ||
      op.displayName?.toLowerCase().includes(term) ||
      op.businessName?.toLowerCase().includes(term) ||
      op.city?.toLowerCase().includes(term)
    );
  });

  const bookOperatorForDate = async () => {
    if (!bookingOperator || !user?.uid || !profile) return;
    setBookingInProgress(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const scheduledTs = Timestamp.fromDate(new Date(dateStr + "T" + scheduleTime));
      const operatorRequiresCard =
        Boolean(bookingOperator.stripeConnectAccountId) && (bookingOperator.stripeEnabledJobsOnly ?? true);

      const chatsQuery = query(collection(db, "chats"), where("participants", "array-contains", user.uid));
      const chatsSnap = await getDocs(chatsQuery);
      const existingChat = chatsSnap.docs.find((d) => d.data().participants?.includes(bookingOperator.uid));

      if (existingChat) {
        setShowOperatorPicker(false);
        router.push(`/dashboard/messages/${existingChat.id}`);
        return;
      }

      const jobRef = await addDoc(collection(db, "jobs"), {
        clientId: user.uid,
        operatorId: bookingOperator.uid,
        status: "pending",
        serviceTypes: clientProfile?.propertyDetails?.serviceTypes || ["driveway"],
        propertySize: clientProfile?.propertyDetails?.propertySize || "medium",
        address: clientProfile?.address || "",
        city: clientProfile?.city || "",
        province: clientProfile?.province || "",
        postalCode: clientProfile?.postalCode || "",
        specialInstructions: clientProfile?.propertyDetails?.specialInstructions || "",
        scheduledDate: scheduledTs,
        scheduledTime: scheduleTime,
        estimatedDuration: 45,
        price:
          bookingOperator.pricing?.driveway?.[
            (clientProfile?.propertyDetails?.propertySize || "medium") as "small" | "medium" | "large"
          ] || 40,
        paymentMethod: operatorRequiresCard ? "credit" : "cash",
        requiresCardPayment: operatorRequiresCard,
        paymentStatus: "pending",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      const chatRef = await addDoc(collection(db, "chats"), {
        jobId: jobRef.id,
        participants: [user.uid, bookingOperator.uid],
        lastMessage: "Job request sent",
        lastMessageTime: Timestamp.now(),
        unreadCount: { [user.uid]: 0, [bookingOperator.uid]: 1 },
        createdAt: Timestamp.now(),
      });

      await updateDoc(doc(db, "jobs", jobRef.id), { chatId: chatRef.id });

      await addDoc(collection(db, "messages"), {
        chatId: chatRef.id,
        senderId: "system",
        senderName: "snowd.ca",
        type: "system",
        content: `${clientProfile?.displayName} has requested snow removal service scheduled for ${format(selectedDate, "EEEE, MMM d")} at ${scheduleTime}.${operatorRequiresCard ? " Card payment is required for this operator." : ""}`,
        read: false,
        createdAt: Timestamp.now(),
      });

      setShowOperatorPicker(false);
      router.push(`/dashboard/messages/${chatRef.id}`);
    } catch (error) {
      console.error("Error booking operator:", error);
    } finally {
      setBookingInProgress(false);
    }
  };

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const days: Date[] = [];
    let day = startDate;
    while (day <= endDate) { days.push(day); day = addDays(day, 1); }
    return days;
  }, [currentMonth]);

  const getJobsForDay = (date: Date) =>
    jobs.filter((j) => {
      const jobDate = getJobDisplayDate(j);
      return jobDate instanceof Date && isSameDay(jobDate, date);
    });

  const getWeatherForDay = (date: Date) =>
    weather.find((w) => w.date === format(date, "yyyy-MM-dd"));

  const selectedDayJobs = getJobsForDay(selectedDate);
  const selectedWeather = getWeatherForDay(selectedDate);
  const upcomingJobs = jobs
    .filter((j) => !["completed", "cancelled"].includes(j.status))
    .sort((a, b) => getJobDisplayDate(a).getTime() - getJobDisplayDate(b).getTime());
  const completedJobs = jobs
    .filter((j) => j.status === "completed")
    .sort((a, b) => getJobDisplayDate(b).getTime() - getJobDisplayDate(a).getTime());
  const selectedActiveJobs = selectedDayJobs.filter((j) => j.status !== "completed");
  const selectedCompletedJobs = selectedDayJobs.filter((j) => j.status === "completed");

  const isBusyDay = (date: Date) =>
    getJobsForDay(date).some((j) => ["accepted", "en-route", "in-progress"].includes(j.status));

  function getJobDisplayDate(job: Job): Date {
    const rawDate = job.scheduledDate || job.completionTime || job.createdAt;
    if (rawDate instanceof Date) return rawDate;
    return new Date(rawDate as string);
  }

  const getJobTime = (job: Job) =>
    job.scheduledTime || format(getJobDisplayDate(job), "h:mm a");

  const getOtherName = (job: Job) => {
    const otherId = isOperator ? job.clientId : job.operatorId;
    return userNames[otherId] || (isOperator ? "Client" : "Operator");
  };

  const renderService = (job: Job) =>
    job.serviceTypes?.map((s) => s.replace("-", " ")).join(", ") || "Snow removal";

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BackButton href="/dashboard" />
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-[var(--accent-sun)]" />
              Calendar
            </h1>
            <p className="text-sm text-[var(--text-muted)]">Bookings, completed work, and local weather by date</p>
          </div>
        </div>
        {!isOperator && (
          <button onClick={openOperatorPicker} className="inline-flex items-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black">
            <Plus className="h-4 w-4" />
            New Booking
          </button>
        )}
      </div>

      {/* Location Bar */}
      <div className="bg-[var(--bg-card-solid)] rounded-xl border-[3px] border-[var(--border-color)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <MapPin className="w-4 h-4 text-[var(--accent-sun)]" />
          <span className="font-medium text-[var(--text-primary)]">{profile?.city || "Unknown city"}, {profile?.province || ""}</span>
          {profile?.address && <span className="text-[var(--text-muted)] text-xs hidden sm:inline">• {profile.address}</span>}
        </div>
        <div className="text-xs text-[var(--text-muted)]">{format(new Date(), "EEEE, MMM d, yyyy")}</div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border-[3px] border-[var(--border-color)] bg-[var(--bg-card-solid)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Upcoming</p>
          <p className="mt-1 text-3xl font-bold text-[var(--text-primary)]">{upcomingJobs.length}</p>
        </div>
        <div className="rounded-2xl border-[3px] border-[var(--border-color)] bg-[var(--bg-card-solid)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Completed</p>
          <p className="mt-1 text-3xl font-bold text-[var(--text-primary)]">{completedJobs.length}</p>
        </div>
        <div className="rounded-2xl border-[3px] border-[var(--border-color)] bg-[var(--bg-card-solid)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Weather Now</p>
          <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">
            {currentWeather ? `${currentWeather.temp}°C, ${currentWeather.condition}` : "Forecast available by date"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* Calendar Grid */}
        <div className="bg-[var(--bg-card-solid)] rounded-2xl border-[3px] border-[var(--border-color)] overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-color)] px-4 py-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition" aria-label="Previous month">
                <ChevronLeft className="w-5 h-5 text-[var(--text-secondary)]" />
              </button>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition" aria-label="Next month">
                <ChevronRight className="w-5 h-5 text-[var(--text-secondary)]" />
              </button>
              <h2 className="ml-1 text-lg font-bold text-[var(--text-primary)]">{format(currentMonth, "MMMM yyyy")}</h2>
            </div>
            <button
              onClick={() => {
                const today = new Date();
                setSelectedDate(today);
                setCurrentMonth(today);
              }}
              className="rounded-lg border-[3px] border-[var(--border-color)] px-3 py-1.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
            >
              Today
            </button>
          </div>
          <div className="grid grid-cols-7 border-b border-[var(--border-color)]">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="px-2 py-2 text-center text-xs font-semibold text-[var(--text-muted)]">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              const dayJobs = getJobsForDay(day);
              const dayWeather = getWeatherForDay(day);
              const selected = isSameDay(day, selectedDate);
              const todayDay = isToday(day);
              const inMonth = isSameMonth(day, currentMonth);
              const busy = isBusyDay(day);
              const WeatherIcon = dayWeather ? WEATHER_ICONS[dayWeather.icon] : null;
              const completedCount = dayJobs.filter((j) => j.status === "completed").length;
              return (
                <button key={i} onClick={() => setSelectedDate(day)}
                  aria-label={`${format(day, "EEEE, MMMM d, yyyy")}, ${dayJobs.length} jobs${dayWeather ? `, high ${dayWeather.high} degrees` : ""}`}
                  aria-pressed={selected}
                  aria-current={todayDay ? "date" : undefined}
                  className={`relative min-w-0 min-h-[72px] sm:min-h-[108px] border-b border-r border-[var(--border-color)] p-1 sm:p-2 text-left text-sm transition-all ${selected ? "bg-[var(--accent-sun-soft)] shadow-[inset_0_0_0_3px_var(--ink)]" : inMonth ? "hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]" : "bg-[var(--bg-secondary)]/35 text-[var(--text-muted)]"}`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold ${todayDay ? "bg-[var(--accent)] text-white" : ""}`}>{format(day, "d")}</span>
                    {dayWeather && WeatherIcon && (
                      <span className="hidden sm:flex items-center gap-1 text-[10px] font-semibold text-[var(--text-muted)]">
                        <WeatherIcon className="h-3.5 w-3.5" />
                        {dayWeather.high}°
                      </span>
                    )}
                  </div>
                  {dayJobs.length > 0 && <span className="mt-1 block text-center text-[10px] font-semibold sm:hidden">{dayJobs.length} job{dayJobs.length === 1 ? "" : "s"}</span>}
                  <div className="mt-2 hidden sm:block space-y-1">
                    {dayJobs.slice(0, 2).map((job) => {
                      const done = job.status === "completed";
                      return (
                        <span key={job.id} className={`block truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${done ? "bg-gray-100 text-gray-600" : busy ? "bg-green-50 text-green-700" : "bg-[#F0F5FF] text-[var(--accent)]"}`}>
                          {getJobTime(job)} {getOtherName(job)}
                        </span>
                      );
                    })}
                    {dayJobs.length > 2 && <span className="block text-[10px] text-[var(--text-muted)]">+{dayJobs.length - 2} more</span>}
                    {completedCount > 0 && <span className="block text-[10px] font-medium text-[var(--text-muted)]">{completedCount} completed</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Panel */}
        <div className="space-y-4">
          <div className="bg-[var(--bg-card-solid)] rounded-2xl border-[3px] border-[var(--border-color)] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 aria-live="polite" className="font-bold text-[var(--text-primary)] mb-1">{format(selectedDate, "EEEE, MMM d")}</h3>
                <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {profile?.city || "Your area"}, {profile?.province || ""}
                </p>
              </div>
              <span className="rounded-full bg-[var(--bg-secondary)] px-2 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                {selectedDayJobs.length} item{selectedDayJobs.length !== 1 ? "s" : ""}
              </span>
            </div>

            {selectedWeather && (
              <div className="mt-4 rounded-xl border-[3px] border-[var(--border-color)] bg-[var(--bg-secondary)] p-3">
                <div className="flex items-center gap-2">
                    {React.createElement(WEATHER_ICONS[selectedWeather.icon], { className: "w-5 h-5 text-[var(--accent-sun)]" })}
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{selectedWeather.description}</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1">{selectedWeather.high}°C high / {selectedWeather.low}°C low • {selectedWeather.snowChance}% snow chance</p>
              </div>
            )}

            {selectedDayJobs.length === 0 ? (
              <div className="text-center py-6">
                <CalendarDays className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
                <p className="text-sm text-[var(--text-secondary)]">No jobs scheduled</p>
                {!isOperator && (
                  <button onClick={openOperatorPicker} className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-[var(--ink)] text-white rounded-lg text-sm font-semibold hover:bg-black transition">
                    <Plus className="w-4 h-4" /> Book for {format(selectedDate, "MMM d")}
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {selectedActiveJobs.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Bookings</p>
                    <div className="space-y-2">
                      {selectedActiveJobs.map((job) => (
                        <Link key={job.id} href={`/dashboard/messages/${job.chatId}`}
                          className="block rounded-xl border-[3px] border-[var(--border-color)] p-3 transition hover:border-[var(--accent)]/30 hover:shadow-[var(--surface-shadow)]"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{getOtherName(job)}</p>
                              <p className="mt-0.5 text-xs capitalize text-[var(--text-secondary)]">{renderService(job)}</p>
                            </div>
                            <StatusBadge status={job.status} />
                          </div>
                          <div className="mt-2 grid gap-1 text-xs text-[var(--text-muted)]">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{getJobTime(job)}</span>
                            {job.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.address}{job.city ? `, ${job.city}` : ""}</span>}
                          </div>
                          <p className="mt-2 text-sm font-bold text-[var(--text-primary)]">${job.price} CAD</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {selectedCompletedJobs.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Completed</p>
                    <div className="space-y-2">
                      {selectedCompletedJobs.map((job) => (
                        <Link key={job.id} href={`/dashboard/messages/${job.chatId}`}
                          className="block rounded-xl border-[3px] border-[var(--border-color)] bg-gray-50 p-3 transition hover:border-[var(--accent)]/30"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{getOtherName(job)}</p>
                              <p className="mt-0.5 text-xs capitalize text-[var(--text-secondary)]">{renderService(job)}</p>
                            </div>
                            <StatusBadge status={job.status} />
                          </div>
                          <p className="mt-2 text-xs text-[var(--text-muted)]">{getJobTime(job)} • ${job.price} CAD</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {!isOperator && (
                  <button onClick={openOperatorPicker} className="w-full flex items-center justify-center gap-1.5 mt-1 py-2.5 border border-dashed border-[var(--border-color)] text-[var(--text-muted)] rounded-xl text-sm hover:border-[var(--accent)]/50 hover:text-[var(--accent)] transition">
                    <Plus className="w-4 h-4" /> Add booking for {format(selectedDate, "MMM d")}
                  </button>
                )}
              </div>
            )}
          </div>

          {isOperator && (
            <div className="bg-[var(--bg-card-solid)] rounded-2xl border-[3px] border-[var(--border-color)] p-5">
              <h3 className="font-bold text-[var(--text-primary)] mb-2 text-sm">Next Available</h3>
              <p className="text-xs text-[var(--text-secondary)]">
                {jobs.some((j) => ["in-progress", "en-route"].includes(j.status)) ? "You're currently working. Next opening after current job." : "You're free and available for new bookings!"}
              </p>
              <div className="mt-2 p-2 bg-green-50 rounded-lg">
                <p className="text-xs font-semibold text-green-700">
                  ✅ {jobs.some((j) => ["in-progress", "en-route"].includes(j.status)) ? "Estimated: After current job completion" : "Available now"}
                </p>
              </div>
            </div>
          )}

          <div className="bg-[var(--bg-card-solid)] rounded-2xl border-[3px] border-[var(--border-color)] p-5">
            <h3 className="font-bold text-[var(--text-primary)] mb-3 text-sm">Upcoming Schedule</h3>
            {upcomingJobs.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No upcoming jobs.</p>
            ) : (
              <div className="space-y-2">
                {upcomingJobs.slice(0, 4).map((job) => (
                  <Link key={job.id} href={`/dashboard/messages/${job.chatId}`} className="flex items-center justify-between gap-3 rounded-xl border-[3px] border-[var(--border-color)] px-3 py-2.5 hover:bg-[var(--bg-secondary)]">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{getOtherName(job)}</p>
                      <p className="text-xs text-[var(--text-muted)]">{format(getJobDisplayDate(job), "MMM d")} at {getJobTime(job)}</p>
                    </div>
                    <StatusBadge status={job.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Operator Picker Modal */}
      <AnimatePresence>
        {showOperatorPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowOperatorPicker(false); }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white rounded-2xl shadow-[var(--surface-shadow)] w-full max-w-md overflow-hidden max-h-[85vh] flex flex-col"
            >
              {/* Header */}
              <div className="bg-[var(--ink)] p-5 text-white shrink-0 relative">
                <button aria-label="Close booking" onClick={() => setShowOperatorPicker(false)} className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/20 transition">
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">Book Snow Removal</h2>
                    <p className="text-white/80 text-sm">📅 {format(selectedDate, "EEEE, MMMM d")}</p>
                  </div>
                </div>
              </div>

              {bookingOperator ? (
                /* Confirm booking */
                <div className="p-5 flex flex-col gap-4">
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className="w-14 h-14 bg-[var(--accent)]/20 rounded-xl flex items-center justify-center text-[var(--accent)] font-bold text-xl shrink-0">
                      {bookingOperator.displayName?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{bookingOperator.businessName || bookingOperator.displayName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <StarRating rating={bookingOperator.rating} size="sm" />
                        <span className="text-xs text-gray-400">({bookingOperator.reviewCount})</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">📅 {format(selectedDate, "EEEE, MMM d")} at {scheduleTime}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setBookingOperator(null)} className="px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition text-sm">← Back</button>
                    <button onClick={bookOperatorForDate} disabled={bookingInProgress}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white rounded-xl font-semibold transition disabled:opacity-50 text-sm"
                    >
                      <MessageSquare className="w-4 h-4" />
                      {bookingInProgress ? "Booking..." : "Confirm & Chat"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Time picker */}
                  <div className="px-5 pt-4 pb-3 shrink-0 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Preferred Time</p>
                    <div className="grid grid-cols-3 gap-2">
                      {["07:00", "09:00", "12:00", "14:00", "16:00", "18:00"].map((t) => (
                        <button key={t} onClick={() => setScheduleTime(t)}
                          className={`flex items-center justify-center gap-1 px-2 py-2.5 rounded-lg border text-xs font-medium transition ${scheduleTime === t ? "border-[var(--accent)] bg-[var(--accent)]/5 text-[var(--accent)]" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                        >
                          <Clock className="w-3 h-3" />{t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Search */}
                  <div className="px-5 pt-3 pb-2 shrink-0">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="search" aria-label="Search operators" value={operatorSearch} onChange={(e) => setOperatorSearch(e.target.value)} placeholder="Search operators..."
                        className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
                      />
                    </div>
                  </div>

                  {/* Operator list */}
                  <div className="overflow-y-auto flex-1 px-5 pb-5 space-y-2">
                    {operatorsLoading ? (
                      <div className="text-center py-8 text-gray-400">
                        <Snowflake className="w-6 h-6 mx-auto mb-2 animate-spin" />
                        Loading operators...
                      </div>
                    ) : filteredOperators.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <Snowflake className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No operators found</p>
                      </div>
                    ) : filteredOperators.map((op) => (
                      <button key={op.uid} onClick={() => setBookingOperator(op)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-[var(--accent)]/30 hover:bg-[var(--accent)]/5 transition text-left"
                      >
                        <div className="w-11 h-11 bg-[var(--accent)]/20 rounded-xl flex items-center justify-center text-[var(--accent)] font-bold text-lg shrink-0">
                          {op.displayName?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-gray-900 text-sm truncate">{op.businessName || op.displayName}</p>
                            {op.isStudent && (
                              <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded-full text-[10px] font-medium">
                                <GraduationCap className="w-2.5 h-2.5" /> Student
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <StarRating rating={op.rating} size="sm" />
                            <span className="text-[10px] text-gray-400">({op.reviewCount})</span>
                            <span className="text-[10px] text-gray-400">• {op.city}</span>
                          </div>
                          <p className="text-xs text-green-600 font-semibold mt-0.5">From ${op.pricing?.driveway?.medium || "–"}</p>
                        </div>
                        <Zap className="w-4 h-4 text-[var(--accent)] shrink-0" />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
