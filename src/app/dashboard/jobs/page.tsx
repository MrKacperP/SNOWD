"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Job, UserProfile } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import {
  Briefcase,
  MapPin,
  Calendar,
  Snowflake,
  ArrowLeft,
  Clock,
  Zap,
  ListOrdered,
  CheckCircle,
  Navigation,
  AlertTriangle,
  Compass,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type QueueSort = "time" | "distance";

export default function JobsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [clientLocations, setClientLocations] = useState<Record<string, { lat: number; lng: number }>>({});
  const [filter, setFilter] = useState<"all" | "queue" | "active" | "completed">("all");
  const [queueSort, setQueueSort] = useState<QueueSort>("time");
  const [loading, setLoading] = useState(true);

  // Real-time job listener
  useEffect(() => {
    if (!profile?.uid) return;
    const q = query(
      collection(db, "jobs"),
      where("operatorId", "==", profile.uid)
    );
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const allJobs = snapshot.docs.map((d) => {
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

      // Fetch client names for all jobs
      const clientIds = [...new Set(allJobs.map((j) => j.clientId))];
      const names: Record<string, string> = {};
      const locs: Record<string, { lat: number; lng: number }> = {};
      await Promise.all(
        clientIds.map(async (id) => {
          try {
            const userDoc = await getDoc(doc(db, "users", id));
            if (userDoc.exists()) {
              const data = userDoc.data() as UserProfile;
              names[id] = data.displayName || "Client";
              if (data.lat && data.lng) locs[id] = { lat: data.lat, lng: data.lng };
            }
          } catch {}
        })
      );
      setClientNames(names);
      setClientLocations(locs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [profile?.uid]);

  // Categorize jobs
  const activeJob = useMemo(
    () => jobs.find((j) => ["en-route", "in-progress"].includes(j.status)),
    [jobs]
  );
  const acceptedJobs = useMemo(
    () => jobs.filter((j) => j.status === "accepted"),
    [jobs]
  );
  const pendingJobs = useMemo(
    () => jobs.filter((j) => j.status === "pending"),
    [jobs]
  );
  const completedJobs = useMemo(
    () => jobs.filter((j) => j.status === "completed"),
    [jobs]
  );
  const cancelledJobs = useMemo(
    () => jobs.filter((j) => j.status === "cancelled"),
    [jobs]
  );

  // Queue = pending + accepted, sorted by time or distance
  const queueJobs = useMemo(() => {
    const queue = [...pendingJobs, ...acceptedJobs];
    if (queueSort === "distance" && profile?.lat && profile?.lng) {
      return queue.sort((a, b) => {
        const aLoc = clientLocations[a.clientId];
        const bLoc = clientLocations[b.clientId];
        const aDist = aLoc ? getDistanceKm(profile.lat!, profile.lng!, aLoc.lat, aLoc.lng) : 9999;
        const bDist = bLoc ? getDistanceKm(profile.lat!, profile.lng!, bLoc.lat, bLoc.lng) : 9999;
        return aDist - bDist;
      });
    }
    // FCFS - sort by creation time
    return queue.sort((a, b) => {
      const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
      const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
      return aTime - bTime;
    });
  }, [pendingJobs, acceptedJobs, queueSort, profile?.lat, profile?.lng, clientLocations]);

  const filteredJobs = useMemo(() => {
    if (filter === "queue") return queueJobs;
    if (filter === "active") return activeJob ? [activeJob] : [];
    if (filter === "completed") return completedJobs;
    return jobs.sort((a, b) => {
      const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
      const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
      return bTime - aTime;
    });
  }, [filter, jobs, queueJobs, activeJob, completedJobs]);

  const getJobDistance = (job: Job): number | null => {
    if (!profile?.lat || !profile?.lng) return null;
    const loc = clientLocations[job.clientId];
    if (!loc) return null;
    return getDistanceKm(profile.lat, profile.lng, loc.lat, loc.lng);
  };

  const formatJobDate = (job: Job): string => {
    try {
      if (!job.createdAt) return "Unknown date";
      const date = job.createdAt instanceof Date ? job.createdAt : new Date(job.createdAt as unknown as string);
      return isNaN(date.getTime()) ? "Unknown date" : format(date, "MMM d, yyyy 'at' h:mm a");
    } catch {
      return "Unknown date";
    }
  };

  const totalEarnings = completedJobs.reduce((sum, j) => sum + (j.price || 0), 0);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Briefcase className="w-6 h-6 text-[#4361EE]" />
          My Jobs
        </h1>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
          <Zap className="w-4 h-4 text-orange-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-gray-900">{activeJob ? 1 : 0}</p>
          <p className="text-[10px] text-gray-500">Active</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
          <ListOrdered className="w-4 h-4 text-[#4361EE] mx-auto mb-1" />
          <p className="text-lg font-bold text-gray-900">{queueJobs.length}</p>
          <p className="text-[10px] text-gray-500">In Queue</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
          <CheckCircle className="w-4 h-4 text-green-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-gray-900">{completedJobs.length}</p>
          <p className="text-[10px] text-gray-500">Done</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
          <TrendingUp className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-gray-900">${totalEarnings}</p>
          <p className="text-[10px] text-gray-500">Earned</p>
        </div>
      </div>

      {/* Active Job Banner */}
      {activeJob && (
        <Link
          href={`/dashboard/messages/${activeJob.chatId}`}
          className="block bg-gradient-to-r from-[#4361EE] to-[#7C3AED] rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            <span className="text-sm font-bold uppercase tracking-wider opacity-90">
              {activeJob.status === "in-progress" ? "Currently Working" : "En Route"}
            </span>
          </div>
          <p className="text-lg font-bold capitalize">
            {activeJob.serviceTypes?.map((s) => s.replace("-", " ")).join(", ")}
          </p>
          <div className="flex items-center gap-4 mt-2 text-sm opacity-90">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {activeJob.address}, {activeJob.city}
            </span>
            <span className="flex items-center gap-1">
              <Navigation className="w-3.5 h-3.5" />
              {clientNames[activeJob.clientId] || "Client"}
            </span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/20">
            <span className="text-2xl font-bold">${activeJob.price} CAD</span>
            <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold backdrop-blur-sm">
              Tap to view →
            </span>
          </div>
        </Link>
      )}

      {/* Max 1 Active Job Notice */}
      {activeJob && queueJobs.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700">
            <span className="font-semibold">One job at a time.</span> Complete your current job to start the next one in your queue.
          </p>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
        {([
          { key: "all" as const, label: "All", count: jobs.length },
          { key: "queue" as const, label: "Queue", count: queueJobs.length },
          { key: "active" as const, label: "Active", count: activeJob ? 1 : 0 },
          { key: "completed" as const, label: "Done", count: completedJobs.length },
        ]).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
              filter === f.key ? "bg-white text-[#4361EE] shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Queue Sort Options */}
      {filter === "queue" && queueJobs.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Sort by:</span>
          <button
            onClick={() => setQueueSort("time")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              queueSort === "time" ? "bg-[#4361EE] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Clock className="w-3 h-3 inline mr-1" />
            First Come
          </button>
          <button
            onClick={() => setQueueSort("distance")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              queueSort === "distance" ? "bg-[#4361EE] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Compass className="w-3 h-3 inline mr-1" />
            Nearest
          </button>
        </div>
      )}

      {/* Job List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading jobs...</div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Snowflake className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600">
            {filter === "queue" ? "Queue is empty" : filter === "active" ? "No active job" : filter === "completed" ? "No completed jobs yet" : "No jobs yet"}
          </h3>
          <p className="text-gray-400 mt-1">
            {filter === "queue"
              ? "New requests will appear here when clients book you."
              : filter === "active"
              ? "Start a job from your queue to see it here."
              : "Jobs will appear when clients book you."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job, index) => {
            const dist = getJobDistance(job);
            const isQueued = ["pending", "accepted"].includes(job.status);
            return (
              <Link
                key={job.id}
                href={`/dashboard/messages/${job.chatId}`}
                className="block bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition relative"
              >
                {/* Queue position badge */}
                {filter === "queue" && isQueued && (
                  <div className="absolute -top-2 -left-2 w-7 h-7 bg-[#4361EE] rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
                    #{index + 1}
                  </div>
                )}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900">
                        {clientNames[job.clientId] || "Client"}
                      </p>
                      {dist !== null && (
                        <span className="px-2 py-0.5 bg-[#4361EE]/10 text-[#4361EE] rounded-full text-[10px] font-bold">
                          {dist.toFixed(1)} km
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 capitalize">
                      {job.serviceTypes?.map((s) => s.replace("-", " ")).join(", ")}
                    </p>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {job.address}, {job.city}
                    </p>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatJobDate(job)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">${job.price}</p>
                    <StatusBadge status={job.status} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
