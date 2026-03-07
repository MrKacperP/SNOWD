"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { format } from "date-fns";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { ClientProfile, Job, UserProfile } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import { ArrowRight, ClipboardList, LifeBuoy, MessageCircle, Plus } from "lucide-react";

const isValidDate = (date: unknown): boolean => {
  if (!date) return false;
  try {
    const d = date instanceof Date ? date : new Date(date as string);
    return d instanceof Date && !isNaN(d.getTime());
  } catch {
    return false;
  }
};

function SimpleJobRow({ job, operatorName }: { job: Job; operatorName: string }) {
  const scheduled =
    job.scheduledDate && isValidDate(job.scheduledDate)
      ? format(job.scheduledDate instanceof Date ? job.scheduledDate : new Date(job.scheduledDate), "MMM d, yyyy")
      : "TBD";

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-solid)] p-4">
      <p className="text-base font-semibold text-[var(--text-primary)]">{operatorName}</p>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{job.serviceTypes?.map((s) => s.replace("-", " ")).join(", ")}</p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
        <p className="text-[var(--text-secondary)]">Date: <span className="text-[var(--text-primary)] font-medium">{scheduled}</span></p>
        <p className="text-[var(--text-secondary)]">Price: <span className="text-[var(--text-primary)] font-medium">${job.price}</span></p>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <StatusBadge status={job.status} />
        <Link
          href={`/dashboard/messages/${job.chatId}`}
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-3 py-1.5 text-sm font-semibold text-[var(--accent)] hover:bg-[var(--accent-soft)] transition"
        >
          Message
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export default function SeniorClientDashboard() {
  const { profile } = useAuth();
  const clientProfile = profile as ClientProfile;
  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [operatorNames, setOperatorNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      if (!profile?.uid) return;
      try {
        const allJobsQuery = query(collection(db, "jobs"), where("clientId", "==", profile.uid));
        const allSnap = await getDocs(allJobsQuery);

        const allJobs = allSnap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
            scheduledDate: data.scheduledDate?.toDate?.() || data.scheduledDate,
            completionTime: data.completionTime?.toDate?.() || data.completionTime,
          } as Job;
        });

        const activeStatuses = ["pending", "accepted", "en-route", "in-progress"];
        const active = allJobs
          .filter((j) => activeStatuses.includes(j.status))
          .sort((a, b) => (b.createdAt instanceof Date ? b.createdAt.getTime() : 0) - (a.createdAt instanceof Date ? a.createdAt.getTime() : 0));

        const recent = allJobs
          .filter((j) => j.status === "completed")
          .sort((a, b) => (b.createdAt instanceof Date ? b.createdAt.getTime() : 0) - (a.createdAt instanceof Date ? a.createdAt.getTime() : 0))
          .slice(0, 5);

        setActiveJobs(active);
        setRecentJobs(recent);

        const operatorIds = [...new Set([...active, ...recent].map((j) => j.operatorId))];
        const names: Record<string, string> = {};

        await Promise.all(
          operatorIds.map(async (operatorId) => {
            try {
              const userDoc = await getDoc(doc(db, "users", operatorId));
              if (!userDoc.exists()) return;
              const data = userDoc.data() as UserProfile;
              names[operatorId] = data.displayName || "Operator";
            } catch {
              names[operatorId] = "Operator";
            }
          })
        );

        setOperatorNames(names);
      } catch (error) {
        console.error("Error fetching senior client jobs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [profile?.uid]);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card-solid)] p-5">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Welcome, {clientProfile?.displayName?.split(" ")[0] || "there"}</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Simple view enabled. Use the buttons below to book, track progress, and get help.</p>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Link href="/dashboard/find" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-base font-semibold text-white hover:bg-[var(--accent-dark)] transition">
            <Plus className="h-5 w-5" />
            Book Snow Help
          </Link>
          <Link href="/dashboard/log" className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-3 text-base font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition">
            <ClipboardList className="h-5 w-5 text-[var(--accent)]" />
            See Progress
          </Link>
          <Link href="/dashboard/messages" className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-3 text-base font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition">
            <MessageCircle className="h-5 w-5 text-[var(--accent)]" />
            Chat Operator
          </Link>
        </div>
        <div className="mt-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-secondary)]">
          <LifeBuoy className="mr-1 inline h-4 w-4 text-[var(--accent)]" />
          Need aid? Tap the blue support headset button in the bottom-right corner.
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card-solid)] p-5">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Active Jobs</h2>
        {loading ? (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Loading jobs...</p>
        ) : activeJobs.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">No active jobs right now.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {activeJobs.map((job) => (
              <SimpleJobRow key={job.id} job={job} operatorName={operatorNames[job.operatorId] || "Operator"} />
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card-solid)] p-5">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Recent Completions</h2>
        {loading ? (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Loading completed jobs...</p>
        ) : recentJobs.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">No completed jobs yet.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {recentJobs.map((job) => (
              <SimpleJobRow key={job.id} job={job} operatorName={operatorNames[job.operatorId] || "Operator"} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
