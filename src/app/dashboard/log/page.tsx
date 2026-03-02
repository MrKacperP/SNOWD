"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, getDocs, orderBy, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Job, UserProfile } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import BackButton from "@/components/BackButton";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardList, MapPin, Calendar, DollarSign, User, MessageCircle, ExternalLink, RotateCcw } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

const safeFormatDate = (date: unknown): string => {
  try {
    if (!date) return "Unknown date";
    const d =
      typeof date === "object" && date !== null && "toDate" in date
        ? (date as { toDate: () => Date }).toDate()
        : date instanceof Date
        ? date
        : new Date(date as string);
    return isNaN(d.getTime()) ? "Unknown date" : format(d, "MMM d, yyyy 'at' h:mm a");
  } catch {
    return "Unknown date";
  }
};

type LogFilter = "all" | "pending" | "accepted" | "active" | "completed" | "cancelled";

export default function JobLogPage() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filter, setFilter] = useState<LogFilter>("all");
  const [loading, setLoading] = useState(true);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [reactivating, setReactivating] = useState<string | null>(null);

  const isOperator = profile?.role === "operator";

  const reactivateJob = async (jobId: string) => {
    if (!confirm("Reactivate this cancelled job? It will be set back to pending.")) return;
    setReactivating(jobId);
    try {
      await updateDoc(doc(db, "jobs", jobId), {
        status: "pending",
        updatedAt: new Date(),
      });
      setJobs(jobs.map(j => j.id === jobId ? { ...j, status: "pending" as const } : j));
    } catch (error) {
      console.error("Error reactivating job:", error);
      alert("Failed to reactivate job.");
    } finally {
      setReactivating(null);
    }
  };

  useEffect(() => {
    const fetchJobs = async () => {
      if (!profile?.uid) return;
      try {
        const field = isOperator ? "operatorId" : "clientId";
        const q = query(
          collection(db, "jobs"),
          where(field, "==", profile.uid)
        );
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

        // Sort by createdAt desc
        allJobs.sort((a, b) => {
          const aT = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
          const bT = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
          return bT - aT;
        });
        setJobs(allJobs);

        // Fetch other user names
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
        console.error("Error fetching job log:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [profile?.uid, isOperator]);

  const filteredJobs = jobs.filter((j) => {
    if (filter === "all") return true;
    if (filter === "active") return ["en-route", "in-progress"].includes(j.status);
    return j.status === filter;
  });

  const filters: { key: LogFilter; label: string; color: string }[] = [
    { key: "all", label: "All", color: "text-gray-600" },
    { key: "pending", label: "Pending", color: "text-yellow-600" },
    { key: "accepted", label: "Accepted", color: "text-[#246EB9]" },
    { key: "active", label: "Active", color: "text-green-600" },
    { key: "completed", label: "Completed", color: "text-emerald-600" },
    { key: "cancelled", label: "Cancelled", color: "text-red-500" },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <BackButton href="/dashboard" />
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-[#246EB9]" />
          Job Log
        </h1>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition capitalize whitespace-nowrap ${
              filter === f.key
                ? "bg-white text-[#246EB9] shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {f.label} ({jobs.filter((j) => {
              if (f.key === "all") return true;
              if (f.key === "active") return ["en-route", "in-progress"].includes(j.status);
              return j.status === f.key;
            }).length})
          </button>
        ))}
      </div>

      {/* Job List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading job history...</div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600">No jobs found</h3>
          <p className="text-gray-400 mt-1">No jobs match this filter.</p>
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-3">
            {filteredJobs.map((job, i) => {
              const otherId = isOperator ? job.clientId : job.operatorId;
              return (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-all interactive-card"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-4 h-4 text-[#246EB9]" />
                        <Link href={`/dashboard/u/${otherId}`} className="font-semibold text-gray-900 hover:text-[#246EB9] transition">
                          {userNames[otherId] || (isOperator ? "Client" : "Operator")}
                        </Link>
                        <StatusBadge status={job.status} />
                      </div>
                      <p className="text-sm text-gray-700 capitalize">
                        {job.serviceTypes?.map((s) => s.replace("-", " ")).join(", ")}
                      </p>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {job.address}, {job.city}, {job.province}
                      </p>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {safeFormatDate(job.createdAt)}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <p className="text-lg font-bold text-green-600">${job.price}</p>
                      <div className="flex gap-1.5">
                        {job.chatId && (
                          <Link
                            href={`/dashboard/messages/${job.chatId}`}
                            className="p-1.5 text-[#246EB9] hover:bg-[#246EB9]/10 rounded-lg transition"
                            title="Open chat"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Link>
                        )}
                        <Link
                          href={`/dashboard/u/${otherId}`}
                          className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition"
                          title="View profile"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        {job.status === "cancelled" && (
                          <button
                            onClick={() => reactivateJob(job.id)}
                            disabled={reactivating === job.id}
                            className="p-1.5 text-[#246EB9] hover:bg-[#246EB9]/10 rounded-lg transition disabled:opacity-50"
                            title="Reactivate Job"
                          >
                            <RotateCcw className={`w-4 h-4 ${reactivating === job.id ? "animate-spin" : ""}`} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
