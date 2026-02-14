"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Job } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import { Briefcase, MapPin, Calendar, Snowflake, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

export default function JobsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      if (!profile?.uid) return;
      try {
        const q = query(
          collection(db, "jobs"),
          where("operatorId", "==", profile.uid),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        setJobs(
          snap.docs.map((d) => {
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
          })
        );
      } catch (error) {
        console.error("Error fetching jobs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [profile?.uid]);

  const filteredJobs = jobs.filter((j) => {
    if (filter === "active")
      return ["pending", "accepted", "en-route", "in-progress"].includes(j.status);
    if (filter === "completed") return j.status === "completed";
    return true;
  });

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

      {/* Filter Tabs */}
      <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
        {(["all", "active", "completed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition capitalize ${
              filter === f ? "bg-white text-[#4361EE] shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {f} ({jobs.filter((j) => {
              if (f === "active") return ["pending", "accepted", "en-route", "in-progress"].includes(j.status);
              if (f === "completed") return j.status === "completed";
              return true;
            }).length})
          </button>
        ))}
      </div>

      {/* Job List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading jobs...</div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Snowflake className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600">No jobs found</h3>
          <p className="text-gray-400 mt-1">
            {filter === "active"
              ? "No active jobs right now."
              : filter === "completed"
              ? "No completed jobs yet."
              : "No jobs yet. They'll appear when clients book you."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job) => (
            <Link
              key={job.id}
              href={`/dashboard/messages/${job.chatId}`}
              className="block bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900 capitalize">
                    {job.serviceTypes?.map((s) => s.replace("-", " ")).join(", ")}
                  </p>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {job.address}, {job.city}, {job.province}
                  </p>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {(() => {
                      try {
                        if (!job.createdAt) return "Unknown date";
                        const date = job.createdAt instanceof Date ? job.createdAt : new Date(job.createdAt);
                        return isNaN(date.getTime()) ? "Unknown date" : format(date, "MMM d, yyyy 'at' h:mm a");
                      } catch {
                        return "Unknown date";
                      }
                    })()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">${job.price}</p>
                  <StatusBadge status={job.status} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
