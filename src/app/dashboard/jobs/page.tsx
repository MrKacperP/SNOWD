"use client";

import StatusBadge from "@/components/StatusBadge";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { getDistanceKm } from "@/lib/operatorDiscovery";
import { Job,UserProfile } from "@/lib/types";
import { format } from "date-fns";
import { collection,doc,getDoc,onSnapshot,query,where } from "firebase/firestore";
import {
Calendar,
Clock,
Compass,
MapPin,
Navigation,
Snowflake
} from "lucide-react";
import Link from "next/link";
import { useCallback,useEffect,useMemo,useState } from "react";

type QueueSort = "time" | "distance";

export default function JobsPage() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [clientLocations, setClientLocations] = useState<Record<string, { lat: number; lng: number }>>({});
  const [filter, setFilter] = useState<"all" | "queue" | "active" | "completed">("all");
  const [queueSort, setQueueSort] = useState<QueueSort>("time");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) return;
    const q = query(collection(db, "jobs"), where("operatorId", "==", profile.uid));
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

      const clientIds = [...new Set(allJobs.map((job) => job.clientId))];
      const names: Record<string, string> = {};
      const locations: Record<string, { lat: number; lng: number }> = {};
      await Promise.all(
        clientIds.map(async (id) => {
          try {
            const userDoc = await getDoc(doc(db, "users", id));
            if (userDoc.exists()) {
              const data = userDoc.data() as UserProfile;
              names[id] = data.displayName || "Client";
              if (data.lat && data.lng) locations[id] = { lat: data.lat, lng: data.lng };
            }
          } catch {}
        })
      );
      setClientNames(names);
      setClientLocations(locations);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [profile?.uid]);

  const activeJobs = useMemo(() => jobs.filter((job) => ["en-route", "in-progress"].includes(job.status)), [jobs]);
  const activeJob = activeJobs[0];
  const acceptedJobs = useMemo(() => jobs.filter((job) => job.status === "accepted"), [jobs]);
  const pendingJobs = useMemo(() => jobs.filter((job) => job.status === "pending"), [jobs]);
  const completedJobs = useMemo(() => jobs.filter((job) => job.status === "completed"), [jobs]);

  const getClientCoords = useCallback((job: Job): { lat: number; lng: number } | null => {
    if (
      typeof job.clientLat === "number" &&
      Number.isFinite(job.clientLat) &&
      typeof job.clientLng === "number" &&
      Number.isFinite(job.clientLng)
    ) {
      return { lat: job.clientLat, lng: job.clientLng };
    }
    return clientLocations[job.clientId] || null;
  }, [clientLocations]);

  const queueJobs = useMemo(() => {
    const queue = [...pendingJobs, ...acceptedJobs];
    if (queueSort === "distance" && profile?.lat && profile?.lng) {
      return queue.sort((a, b) => {
        const aLoc = getClientCoords(a);
        const bLoc = getClientCoords(b);
        const aDist = aLoc ? getDistanceKm({ lat: profile.lat, lng: profile.lng }, aLoc) ?? 9999 : 9999;
        const bDist = bLoc ? getDistanceKm({ lat: profile.lat, lng: profile.lng }, bLoc) ?? 9999 : 9999;
        return aDist - bDist;
      });
    }
    return queue.sort((a, b) => {
      const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
      const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
      return aTime - bTime;
    });
  }, [acceptedJobs, pendingJobs, queueSort, profile, getClientCoords]);

  const filteredJobs = useMemo(() => {
    if (filter === "queue") return queueJobs;
    if (filter === "active") return activeJobs;
    if (filter === "completed") return completedJobs;
    return [...jobs].sort((a, b) => {
      const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
      const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
      return bTime - aTime;
    });
  }, [activeJobs, completedJobs, filter, jobs, queueJobs]);

  const getJobDistance = (job: Job): number | null => {
    if (!profile?.lat || !profile?.lng) return null;
    const loc = getClientCoords(job);
    if (!loc) return null;
    return getDistanceKm({ lat: profile.lat, lng: profile.lng }, loc);
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


  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader title="Work orders" description="Your current work and next requests." />
      <Link href="/dashboard/clients" className="inline-block rounded-xl bg-[#eaf1ee] px-4 py-3 font-semibold">Find nearby clients</Link>

      {activeJob ? (
        <Link href={`/dashboard/messages/${activeJob.chatId}`} className="surface-card block overflow-hidden p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-[#17994f]" />
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#17994f]">
                  {activeJob.status === "in-progress" ? "in service" : "en route"}
                </span>
              </div>
              <p className="mt-3 text-2xl font-headline font-bold capitalize text-[var(--text-primary)]">
                {activeJob.serviceTypes?.map((service) => service.replace("-", " ")).join(", ")}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[var(--text-muted)]">
                <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{activeJob.address}, {activeJob.city}</span>
                <span className="inline-flex items-center gap-1"><Navigation className="h-3.5 w-3.5" />{clientNames[activeJob.clientId] || "Client"}</span>
              </div>
            </div>
            <div className="rounded-[1.4rem] bg-[var(--ink)] px-5 py-4 text-white">
              <p className="text-xs uppercase tracking-[0.14em] text-white/48">Work order value</p>
              <p className="mt-1 text-3xl font-headline font-bold">${activeJob.price}</p>
              <p className="mt-1 text-xs text-white/62">Open the job thread to continue</p>
            </div>
          </div>
        </Link>
      ) : null}

      {activeJobs.length > 1 ? (
        <div className="rounded-[1.4rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <span className="font-semibold">{activeJobs.length} active work orders.</span> Each order has its own schedule and conversation.
        </div>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2 rounded-[1.3rem] bg-[var(--bg-secondary)] p-1">
          {([
            { key: "all" as const, label: "All", count: jobs.length },
            { key: "queue" as const, label: "Queue", count: queueJobs.length },
            { key: "active" as const, label: "Active", count: activeJobs.length },
            { key: "completed" as const, label: "Done", count: completedJobs.length },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`rounded-[1rem] px-4 py-2 text-sm font-semibold transition ${
                filter === tab.key ? "bg-white text-[var(--text-primary)] shadow-[var(--surface-shadow)]" : "text-[var(--text-muted)]"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {filter === "queue" && queueJobs.length > 1 ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Sort</span>
            <button
              onClick={() => setQueueSort("time")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${queueSort === "time" ? "bg-[var(--ink)] text-white" : "bg-white text-[var(--text-muted)]"}`}
            >
              <Clock className="mr-1 inline h-3 w-3" />
              First come
            </button>
            <button
              onClick={() => setQueueSort("distance")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${queueSort === "distance" ? "bg-[var(--ink)] text-white" : "bg-white text-[var(--text-muted)]"}`}
            >
              <Compass className="mr-1 inline h-3 w-3" />
              Nearest
            </button>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="surface-panel py-14 text-center text-[var(--text-muted)]">Loading jobs...</div>
      ) : filteredJobs.length === 0 ? (
        <div className="surface-panel p-12 text-center">
          <Snowflake className="mx-auto mb-4 h-12 w-12 text-[var(--text-muted)]/35" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            {filter === "queue" ? "Queue is empty" : filter === "active" ? "No active job" : filter === "completed" ? "No completed jobs yet" : "No jobs yet"}
          </h3>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {filter === "queue"
              ? "New requests will appear here when clients book you."
              : filter === "active"
              ? "Start a job from your queue to see it here."
              : "Jobs will appear when clients book you."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job, index) => {
            const dist = getJobDistance(job);
            const isQueued = ["pending", "accepted"].includes(job.status);
            return (
              <Link key={job.id} href={`/dashboard/messages/${job.chatId}`} className="surface-panel relative block overflow-hidden p-5 transition hover:-translate-y-0.5">
                {filter === "queue" && isQueued ? (
                  <div className="absolute left-5 top-5 flex h-7 min-w-7 items-center justify-center rounded-full bg-[var(--ink)] px-2 text-xs font-bold text-white">
                    #{index + 1}
                  </div>
                ) : null}
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`font-semibold text-[var(--text-primary)] ${filter === "queue" && isQueued ? "ml-12" : ""}`}>
                        {clientNames[job.clientId] || "Client"}
                      </p>
                      {dist !== null ? (
                        <span className="rounded-full bg-[var(--bg-secondary)] px-2.5 py-1 text-[10px] font-bold text-[var(--text-primary)]">
                          {dist.toFixed(1)} km
                        </span>
                      ) : null}
                      <StatusBadge status={job.status} />
                    </div>
                    <p className="mt-2 text-base font-headline font-bold capitalize text-[var(--text-primary)]">
                      {job.serviceTypes?.map((service) => service.replace("-", " ")).join(", ")}
                    </p>
                    <p className="mt-2 flex items-center gap-1 text-sm text-[var(--text-muted)]">
                      <MapPin className="h-3.5 w-3.5" />
                      {job.address}, {job.city}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-sm text-[var(--text-muted)]">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatJobDate(job)}
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] bg-[var(--bg-secondary)] px-4 py-4 text-left md:min-w-[160px] md:text-right">
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Payout</p>
                    <p className="mt-1 text-2xl font-headline font-bold text-[#17994f]">${job.price}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {job.paymentMethod === "cash" ? "Cash collection" : "Platform payment"}
                    </p>
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
