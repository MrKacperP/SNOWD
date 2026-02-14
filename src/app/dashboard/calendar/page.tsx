"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, getDocs, addDoc, Timestamp, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Job, UserProfile } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import BackButton from "@/components/BackButton";
import { motion } from "framer-motion";
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
} from "lucide-react";
import Link from "next/link";
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

// Mock weather data for the upcoming week
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
  const { profile } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [jobs, setJobs] = useState<Job[]>([]);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [weather] = useState<WeatherDay[]>(generateMockWeather);

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

        // Fetch names
        const otherField = isOperator ? "clientId" : "operatorId";
        const ids = [...new Set(allJobs.map((j) => (j as unknown as Record<string, string>)[otherField]))];
        const names: Record<string, string> = {};
        await Promise.all(
          ids.map(async (id) => {
            try {
              const userDoc = await getDoc(doc(db, "users", id));
              if (userDoc.exists()) {
                names[id] = (userDoc.data() as UserProfile).displayName || "User";
              }
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

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days: Date[] = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  // Jobs for a given day
  const getJobsForDay = (date: Date) => {
    return jobs.filter((j) => {
      const jobDate = j.scheduledDate instanceof Date ? j.scheduledDate : j.createdAt;
      if (!(jobDate instanceof Date)) return false;
      return isSameDay(jobDate, date);
    });
  };

  // Weather for a given day
  const getWeatherForDay = (date: Date) => {
    const key = format(date, "yyyy-MM-dd");
    return weather.find((w) => w.date === key);
  };

  const selectedDayJobs = getJobsForDay(selectedDate);
  const selectedWeather = getWeatherForDay(selectedDate);

  // Determine if operator is busy
  const isBusyDay = (date: Date) => {
    const dayJobs = getJobsForDay(date);
    return dayJobs.some((j) => ["accepted", "en-route", "in-progress"].includes(j.status));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <BackButton href="/dashboard" />
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-[#4361EE]" />
          Calendar
        </h1>
      </div>

      {/* Location & City Indicator */}
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4 text-[#4361EE]" />
          <span className="font-medium">{profile?.city || "Unknown city"}, {profile?.province || ""}</span>
          {profile?.address && <span className="text-gray-400 text-xs hidden sm:inline">• {profile.address}</span>}
        </div>
        <div className="text-xs text-gray-400">
          {format(new Date(), "EEEE, MMM d, yyyy")}
        </div>
      </div>

      {/* Weather Forecast Strip */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 overflow-hidden">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <CloudSnow className="w-4 h-4 text-[#4361EE]" />
          7-Day Snow Forecast
          <a
            href="https://www.google.com/search?q=snow+forecast+this+week"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-xs text-[#4361EE] hover:underline"
          >
            Full forecast →
          </a>
        </h3>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {weather.map((day) => {
            const WeatherIcon = WEATHER_ICONS[day.icon];
            const isSnowy = day.snowChance > 40;
            return (
              <button
                key={day.date}
                onClick={() => setSelectedDate(new Date(day.date + "T12:00:00"))}
                className={`flex-shrink-0 flex flex-col items-center gap-1 p-3 rounded-xl min-w-[72px] transition-all ${
                  isSnowy
                    ? "bg-[#4361EE]/10 border border-[#4361EE]/20"
                    : "bg-gray-50 border border-transparent hover:border-gray-200"
                }`}
              >
                <span className="text-[10px] font-semibold text-gray-500">
                  {format(new Date(day.date + "T12:00:00"), "EEE")}
                </span>
                <WeatherIcon className={`w-5 h-5 ${isSnowy ? "text-[#4361EE]" : "text-gray-400"}`} />
                <span className="text-xs font-bold text-gray-900">
                  {day.high}°/{day.low}°
                </span>
                {isSnowy && (
                  <span className="text-[9px] font-bold text-[#4361EE] bg-[#4361EE]/10 px-1.5 py-0.5 rounded-full">
                    {day.snowChance}% ❄️
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h2 className="text-lg font-bold text-gray-900">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              const dayJobs = getJobsForDay(day);
              const dayWeather = getWeatherForDay(day);
              const selected = isSameDay(day, selectedDate);
              const today = isToday(day);
              const inMonth = isSameMonth(day, currentMonth);
              const busy = isBusyDay(day);

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(day)}
                  className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all ${
                    selected
                      ? "bg-[#4361EE] text-white shadow-md"
                      : today
                      ? "bg-[#4361EE]/10 text-[#4361EE] font-bold"
                      : inMonth
                      ? "hover:bg-gray-50 text-gray-900"
                      : "text-gray-300"
                  }`}
                >
                  <span className="text-xs font-medium">{format(day, "d")}</span>
                  {/* Indicators */}
                  <div className="flex gap-0.5 mt-0.5">
                    {dayJobs.length > 0 && (
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        selected ? "bg-white" : busy ? "bg-green-500" : "bg-[#4361EE]"
                      }`} />
                    )}
                    {dayWeather && dayWeather.snowChance > 40 && (
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        selected ? "bg-white/60" : "bg-blue-300"
                      }`} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Detail */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 mb-1">
              {format(selectedDate, "EEEE, MMM d")}
            </h3>
            <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {profile?.city || "Your area"}, {profile?.province || ""}
              {selectedDayJobs.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-[#4361EE]/10 text-[#4361EE] rounded-full text-[10px] font-semibold">
                  {selectedDayJobs.length} job{selectedDayJobs.length !== 1 ? "s" : ""}
                </span>
              )}
            </p>

            {/* Weather for selected day */}
            {selectedWeather && (
              <div className={`p-3 rounded-xl mb-3 ${
                selectedWeather.snowChance > 40
                  ? "bg-[#4361EE]/10 border border-[#4361EE]/15"
                  : "bg-gray-50"
              }`}>
                <div className="flex items-center gap-2">
                  {React.createElement(WEATHER_ICONS[selectedWeather.icon], {
                    className: `w-5 h-5 ${selectedWeather.snowChance > 40 ? "text-[#4361EE]" : "text-gray-400"}`,
                  })}
                  <span className="text-sm font-semibold text-gray-900">{selectedWeather.description}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedWeather.high}°C / {selectedWeather.low}°C • {selectedWeather.snowChance}% snow chance
                </p>
                {selectedWeather.snowChance > 40 && (
                  <p className="text-xs font-medium text-[#4361EE] mt-1">
                    ❄️ {isOperator ? "Get ready for requests!" : "Consider booking snow removal!"}
                  </p>
                )}
              </div>
            )}

            {/* Jobs for selected day */}
            {selectedDayJobs.length === 0 ? (
              <div className="text-center py-6">
                <CalendarDays className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No jobs scheduled</p>
                {!isOperator && (
                  <Link
                    href="/dashboard/find"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-[#4361EE] hover:underline"
                  >
                    <Plus className="w-3 h-3" /> Book now
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDayJobs.map((job) => {
                  const otherId = isOperator ? job.clientId : job.operatorId;
                  return (
                    <Link
                      key={job.id}
                      href={`/dashboard/messages/${job.chatId}`}
                      className="block p-3 rounded-xl border border-gray-100 hover:border-[#4361EE]/20 hover:shadow-sm transition"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-900">
                          {userNames[otherId] || (isOperator ? "Client" : "Operator")}
                        </span>
                        <StatusBadge status={job.status} />
                      </div>
                      <p className="text-xs text-gray-500 capitalize">
                        {job.serviceTypes?.map((s) => s.replace("-", " ")).join(", ")}
                      </p>
                      {/* Address / Location */}
                      {job.address && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {job.address}{job.city ? `, ${job.city}` : ""}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {job.scheduledTime || "ASAP"}
                        </span>
                        <span className="text-xs font-bold text-green-600">${job.price}</span>
                      </div>
                      {job.status === "in-progress" && (
                        <div className="mt-1.5 text-[10px] font-semibold text-[#4361EE] bg-[#4361EE]/10 px-2 py-0.5 rounded-full inline-block">
                          🔵 Currently Working
                        </div>
                      )}
                      {job.status === "accepted" && (
                        <div className="mt-1.5 text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full inline-block">
                          ⏳ Queued — Tap for details
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Next available slot for operators */}
          {isOperator && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-2 text-sm">Next Available</h3>
              <p className="text-xs text-gray-500">
                {jobs.some((j) => ["in-progress", "en-route"].includes(j.status))
                  ? "You're currently working. Next opening after current job."
                  : "You're free and available for new bookings!"}
              </p>
              <div className="mt-2 p-2 bg-green-50 rounded-lg">
                <p className="text-xs font-semibold text-green-700">
                  ✅ {jobs.some((j) => ["in-progress", "en-route"].includes(j.status))
                    ? "Estimated: After current job completion"
                    : "Available now"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
