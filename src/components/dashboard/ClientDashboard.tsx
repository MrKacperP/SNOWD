"use client";

import { BookingAction, HomeActions } from "./HomeActions";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { ClientProfile,Job,UserProfile } from "@/lib/types";
import { format } from "date-fns";
import { collection,doc,getDoc,getDocs,query,where } from "firebase/firestore";
import { Snowflake,User } from "lucide-react";
import Link from "next/link";
import { useEffect,useState } from "react";

const isValidDate = (date: unknown): boolean => {
  if (!date) return false;
  try {
    const d = date instanceof Date ? date : new Date(date as string);
    return d instanceof Date && !isNaN(d.getTime());
  } catch {
    return false;
  }
};

export default function ClientDashboard() {
  const { profile } = useAuth();
  const clientProfile = profile as ClientProfile;
  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [operatorNames, setOperatorNames] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);

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
        setLoadError(true);
        console.error("Error fetching jobs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [profile?.uid]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };
  const firstName = clientProfile?.displayName?.split(" ")[0] || "there";
  const locationLabel =
    [clientProfile?.city, clientProfile?.province].filter(Boolean).join(", ") || "Your service area";

  return <ClientHomeView greeting={greeting()} firstName={firstName} locationLabel={locationLabel} activeJobs={activeJobs} operatorNames={operatorNames} loading={loading} loadError={loadError} />;
}

export function ClientHomeView({ greeting, firstName, locationLabel, activeJobs, operatorNames, loading, loadError }: {
  greeting: string; firstName: string; locationLabel: string; activeJobs: Job[];
  operatorNames: Record<string, string>; loading: boolean; loadError: boolean;
}) {
  return (
    <div className="mx-auto max-w-[1040px] space-y-5 pb-6 text-[var(--text-primary)]">
      <header>
        <p className="text-sm text-[var(--text-secondary)]">{greeting}, {firstName}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-4xl">Your home</h1>
      </header>

      <BookingAction location={locationLabel} />

      <section aria-labelledby="jobs-heading">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="jobs-heading" className="text-xl font-semibold tracking-tight">Current jobs</h2>
          <Link href="/dashboard/jobs" className="inline-flex min-h-11 items-center text-sm font-medium underline decoration-[var(--border-color)] underline-offset-4 hover:decoration-current">View all</Link>
        </div>
        {loadError ? (<p role="alert">Could not load jobs. <Link className="underline" href="/dashboard/jobs">Open job log to try again</Link></p>) : loading ? (
          <p role="status" className="py-8 text-sm text-[var(--text-muted)]">Loading your jobs…</p>
        ) : activeJobs.length === 0 ? (
          <div className="flex items-center gap-4 rounded-2xl bg-[var(--bg-card)] p-6">
            <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#fff0e2] text-[#b3652e]"><Snowflake className="h-6 w-6" strokeWidth={1.5} /></span>
            <div><p className="font-medium">All clear for now</p><p className="mt-1 text-sm text-[var(--text-secondary)]">When you book a shoveler, follow your job here.</p></div>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-color)]">
            {activeJobs.map((job) => (
              <div key={job.id} className="flex items-center gap-2 py-5">
                <Link href={`/dashboard/jobs/${job.id}`} className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium"><User className="h-4 w-4 shrink-0" /><span className="truncate">{operatorNames[job.operatorId] || "Operator"}</span></p>
                    <p className="mt-1 text-sm capitalize text-[var(--text-secondary)]">{job.serviceTypes?.map((service) => service.replaceAll("-", " ")).join(", ")}</p>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">{job.scheduledDate && isValidDate(job.scheduledDate) ? format(new Date(job.scheduledDate), "MMM d") : "Date to be confirmed"}{job.scheduledTime ? ` · ${job.scheduledTime}` : ""}</p>
                  </div>
                  <StatusBadge status={job.status} />
                </Link>

              </div>
            ))}
          </div>
        )}
      </section>

      <HomeActions />
    </div>
  );
}
