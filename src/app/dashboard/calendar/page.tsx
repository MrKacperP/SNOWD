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

function generateMockWeather(): WeatherDay[] {
  const days: WeatherDay[] = [];
  const today = new Date();
  const conditions: Array<{ icon: "snow" | "cloud" | "sun" | "mix"; desc: string; snowChance: number }> = [
    { icon: "snow", desc: "Heavy snow expected", snowChance: 85 },
    { icon: "snow", desc: "Light snow showers", snowChance: 60 },
    { icon: "mix", desc: "Rain/snow mix", snowChance: 40 },
    { icon: "cloud", desc: "Overcast", snowChance: 15 },
    { icon: "sun", desc: "Clear skies", snowChance: 5 },
    { icon: "cloud", desc: "Partly cloudy", snowChance: 10 },
    { icon: "snow", desc: "Snow flurries", snowChance: 55 },
  ];
  for (let i = 0; i < 7; i++) {
    const date = addDays(today, i);
    const c = conditions[i % conditions.length];
    days.push({
      date: format(date, "yyyy-MM-dd"),
      icon: c.icon,
      high: Math.round(-5 + Math.random() * 10),
      low: Math.round(-15 + Math.random() * 8),
      snowChance: c.snowChance,
      description: c.desc,
    });
  }
  return days;
}

export default function CalendarPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const clientProfile = profile as ClientProfile;
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [jobs, setJobs] = useState<Job[]>([]);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [weather] = useState<WeatherDay[]>(generateMockWeather);

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
      } finally {
        setLoading(false);
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
        paymentMethod: "cash",
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
        content: `${clientProfile?.displayName} has requested snow removal service scheduled for ${format(selectedDate, "EEEE, MMM d")} at ${scheduleTime}.`,
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
      const jobDate = j.scheduledDate instanceof Date ? j.scheduledDate : j.createdAt;
      return jobDate instanceof Date && isSameDay(jobDate, date);
    });

  const getWeatherForDay = (date: Date) =>
    weather.find((w) => w.date === format(date, "yyyy-MM-dd"));

  const selectedDayJobs = getJobsForDay(selectedDate);
  const selectedWeather = getWeatherForDay(selectedDate);

  const isBusyDay = (date: Date) =>
    getJobsForDay(date).some((j) => ["accepted", "en-route", "in-progress"].includes(j.status));

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <BackButton href="/dashboard" />
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-[#4361EE]" />
          Calendar
        </h1>
      </div>

      {/* Location Bar */}
      <div className="bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <MapPin className="w-4 h-4 text-[#4361EE]" />
          <span className="font-medium text-[var(--text-primary)]">{profile?.city || "Unknown city"}, {profile?.province || ""}</span>
          {profile?.address && <span className="text-[var(--text-muted)] text-xs hidden sm:inline">• {profile.address}</span>}
        </div>
        <div className="text-xs text-[var(--text-muted)]">{format(new Date(), "EEEE, MMM d, yyyy")}</div>
      </div>

      {/* Weather Forecast */}
      <div className="bg-[var(--bg-card-solid)] rounded-2xl border border-[var(--border-color)] p-4 overflow-hidden">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
          <CloudSnow className="w-4 h-4 text-[#4361EE]" />
          7-Day Snow Forecast
          <a href="https://www.google.com/search?q=snow+forecast+this+week" target="_blank" rel="noopener noreferrer" className="ml-auto text-xs text-[#4361EE] hover:underline">
            Full forecast →
          </a>
        </h3>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {weather.map((day) => {
            const WeatherIcon = WEATHER_ICONS[day.icon];
            const isSnowy = day.snowChance > 40;
            return (
              <button key={day.date} onClick={() => setSelectedDate(new Date(day.date + "T12:00:00"))}
                className={`flex-shrink-0 flex flex-col items-center gap-1 p-3 rounded-xl min-w-[72px] transition-all ${isSnowy ? "bg-[#4361EE]/10 border border-[#4361EE]/20" : "bg-[var(--bg-secondary)] border border-transparent hover:border-[var(--border-color)]"}`}
              >
                <span className="text-[10px] font-semibold text-[var(--text-muted)]">{format(new Date(day.date + "T12:00:00"), "EEE")}</span>
                <WeatherIcon className={`w-5 h-5 ${isSnowy ? "text-[#4361EE]" : "text-[var(--text-muted)]"}`} />
                <span className="text-xs font-bold text-[var(--text-primary)]">{day.high}°/{day.low}°</span>
                {isSnowy && <span className="text-[9px] font-bold text-[#4361EE] bg-[#4361EE]/10 px-1.5 py-0.5 rounded-full">{day.snowChance}% ❄️</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-[var(--bg-card-solid)] rounded-2xl border border-[var(--border-color)] p-5">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition">
              <ChevronLeft className="w-5 h-5 text-[var(--text-secondary)]" />
            </button>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">{format(currentMonth, "MMMM yyyy")}</h2>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition">
              <ChevronRight className="w-5 h-5 text-[var(--text-secondary)]" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-[var(--text-muted)] py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              const dayJobs = getJobsForDay(day);
              const dayWeather = getWeatherForDay(day);
              const selected = isSameDay(day, selectedDate);
              const todayDay = isToday(day);
              const inMonth = isSameMonth(day, currentMonth);
              const busy = isBusyDay(day);
              return (
                <button key={i} onClick={() => setSelectedDate(day)}
                  className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all ${selected ? "bg-[#4361EE] text-white shadow-md" : todayDay ? "bg-[#4361EE]/10 text-[#4361EE] font-bold" : inMonth ? "hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}
                >
                  <span className="text-xs font-medium">{format(day, "d")}</span>
                  <div className="flex gap-0.5 mt-0.5">
                    {dayJobs.length > 0 && <span className={`w-1.5 h-1.5 rounded-full ${selected ? "bg-white" : busy ? "bg-green-500" : "bg-[#4361EE]"}`} />}
                    {dayWeather && dayWeather.snowChance > 40 && <span className={`w-1.5 h-1.5 rounded-full ${selected ? "bg-white/60" : "bg-blue-300"}`} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Panel */}
        <div className="space-y-4">
          <div className="bg-[var(--bg-card-solid)] rounded-2xl border border-[var(--border-color)] p-5">
            <h3 className="font-bold text-[var(--text-primary)] mb-1">{format(selectedDate, "EEEE, MMM d")}</h3>
            <p className="text-xs text-[var(--text-muted)] mb-3 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {profile?.city || "Your area"}, {profile?.province || ""}
              {selectedDayJobs.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-[#4361EE]/10 text-[#4361EE] rounded-full text-[10px] font-semibold">
                  {selectedDayJobs.length} job{selectedDayJobs.length !== 1 ? "s" : ""}
                </span>
              )}
            </p>

            {selectedWeather && (
              <div className={`p-3 rounded-xl mb-3 ${selectedWeather.snowChance > 40 ? "bg-[#4361EE]/10 border border-[#4361EE]/15" : "bg-[var(--bg-secondary)]"}`}>
                <div className="flex items-center gap-2">
                  {React.createElement(WEATHER_ICONS[selectedWeather.icon], { className: `w-5 h-5 ${selectedWeather.snowChance > 40 ? "text-[#4361EE]" : "text-[var(--text-muted)]"}` })}
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{selectedWeather.description}</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1">{selectedWeather.high}°C / {selectedWeather.low}°C • {selectedWeather.snowChance}% snow chance</p>
                {selectedWeather.snowChance > 40 && (
                  <p className="text-xs font-medium text-[#4361EE] mt-1">❄️ {isOperator ? "Get ready for requests!" : "Consider booking snow removal!"}</p>
                )}
              </div>
            )}

            {selectedDayJobs.length === 0 ? (
              <div className="text-center py-6">
                <CalendarDays className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
                <p className="text-sm text-[var(--text-secondary)]">No jobs scheduled</p>
                {!isOperator && (
                  <button onClick={openOperatorPicker} className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-[#4361EE] text-white rounded-lg text-sm font-semibold hover:bg-[#3651D4] transition">
                    <Plus className="w-4 h-4" /> Book for {format(selectedDate, "MMM d")}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDayJobs.map((job) => {
                  const otherId = isOperator ? job.clientId : job.operatorId;
                  return (
                    <Link key={job.id} href={`/dashboard/messages/${job.chatId}`}
                      className="block p-3 rounded-xl border border-[var(--border-color)] hover:border-[#4361EE]/20 hover:shadow-sm transition"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-[var(--text-primary)]">{userNames[otherId] || (isOperator ? "Client" : "Operator")}</span>
                        <StatusBadge status={job.status} />
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] capitalize">{job.serviceTypes?.map((s) => s.replace("-", " ")).join(", ")}</p>
                      {job.address && (
                        <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{job.address}{job.city ? `, ${job.city}` : ""}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-[var(--text-muted)] flex items-center gap-1"><Clock className="w-3 h-3" />{job.scheduledTime || "ASAP"}</span>
                        <span className="text-xs font-bold text-green-600">${job.price}</span>
                      </div>
                      {job.status === "in-progress" && <div className="mt-1.5 text-[10px] font-semibold text-[#4361EE] bg-[#4361EE]/10 px-2 py-0.5 rounded-full inline-block">🔵 Currently Working</div>}
                      {job.status === "accepted" && <div className="mt-1.5 text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full inline-block">⏳ Queued — Tap for details</div>}
                    </Link>
                  );
                })}
                {!isOperator && (
                  <button onClick={openOperatorPicker} className="w-full flex items-center justify-center gap-1.5 mt-1 py-2.5 border border-dashed border-[var(--border-color)] text-[var(--text-muted)] rounded-xl text-sm hover:border-[#4361EE]/50 hover:text-[#4361EE] transition">
                    <Plus className="w-4 h-4" /> Add booking for {format(selectedDate, "MMM d")}
                  </button>
                )}
              </div>
            )}
          </div>

          {isOperator && (
            <div className="bg-[var(--bg-card-solid)] rounded-2xl border border-[var(--border-color)] p-5">
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
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[85vh] flex flex-col"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-[#4361EE] to-[#3249D6] p-5 text-white shrink-0 relative">
                <button onClick={() => setShowOperatorPicker(false)} className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/20 transition">
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
                    <div className="w-14 h-14 bg-[#4361EE]/20 rounded-xl flex items-center justify-center text-[#4361EE] font-bold text-xl shrink-0">
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
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-[#4361EE] hover:bg-[#3651D4] text-white rounded-xl font-semibold transition disabled:opacity-50 text-sm"
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
                          className={`flex items-center justify-center gap-1 px-2 py-2.5 rounded-lg border text-xs font-medium transition ${scheduleTime === t ? "border-[#4361EE] bg-[#4361EE]/5 text-[#4361EE]" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
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
                      <input type="text" value={operatorSearch} onChange={(e) => setOperatorSearch(e.target.value)} placeholder="Search operators..."
                        className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4361EE]/20 focus:border-[#4361EE]"
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
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-[#4361EE]/30 hover:bg-[#4361EE]/5 transition text-left"
                      >
                        <div className="w-11 h-11 bg-[#4361EE]/20 rounded-xl flex items-center justify-center text-[#4361EE] font-bold text-lg shrink-0">
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
                        <Zap className="w-4 h-4 text-[#4361EE] shrink-0" />
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

