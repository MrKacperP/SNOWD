"use client";

import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { ClientProfile,Job,UserProfile } from "@/lib/types";
import { stripeConnectFetch } from "@/lib/stripeConnectClient";
import { format } from "date-fns";
import { collection,doc,getDoc,getDocs,query,where } from "firebase/firestore";
import { ArrowRight,Calendar,CreditCard,MapPin,MessageCircle,Snowflake,User,X } from "lucide-react";
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
  const [cancellingJob, setCancellingJob] = useState<string | null>(null);

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

  const cancelJob = async (jobId: string) => {
    const job = activeJobs.find((item) => item.id === jobId);
    if (!job || ["completed", "cancelled"].includes(job.status)) return;
    if (!job || !confirm("Are you sure you want to cancel this job? Any held card payment will be released. Cash already exchanged must be settled directly with the operator.")) return;
    setCancellingJob(jobId);
    try {
      const response = await stripeConnectFetch("/api/jobs/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not cancel this job.");
      if (result.warning) alert(result.warning);
      setActiveJobs((jobs) => jobs.filter((j) => j.id !== jobId));
    } catch (error) {
      console.error("Error cancelling job:", error);
      alert(error instanceof Error ? error.message : "Failed to cancel job. Please try again.");
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

  return (
    <div className="mx-auto max-w-[1040px] space-y-5 pb-6 text-[var(--text-primary)]">
      <header>
        <p className="text-sm text-[var(--text-secondary)]">{greeting()}, {firstName}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-4xl">A little help. A lighter day.</h1>
      </header>

      <section aria-labelledby="booking-heading" className="relative overflow-hidden rounded-[2rem] bg-[#eaf1ee] p-6 text-[#17251e] sm:p-6">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 grid h-60 w-60 rotate-12 place-items-center rounded-[45%] bg-[#dce8df] sm:right-8 sm:top-4">
          <Snowflake className="h-28 w-28 text-[#91b29c]" strokeWidth={1} />
        </div>
        <div className="relative max-w-lg">
          <span className="inline-flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 shrink-0" />{locationLabel}</span>
          <h2 id="booking-heading" className="hidden sm:block mt-4 max-w-xs text-3xl font-semibold tracking-tight sm:text-4xl">Snow day?<br />We’ve got you.</h2>
          <p className="hidden sm:block mt-3 max-w-[240px] text-sm leading-6 text-[#43574b]">Find local help. Enjoy your day.</p>
          <Link href="/dashboard/find" className="mt-4 sm:mt-6 inline-flex min-h-12 items-center gap-6 rounded-full bg-[#17251e] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2c4335] focus-visible:outline-2 focus-visible:outline-offset-4">
            Book snow help <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <nav aria-label="Dashboard shortcuts" className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { href: "/dashboard/messages", label: "Messages", icon: MessageCircle, color: "bg-[#fff0e2] text-[#9b5420]" },
          { href: "/dashboard/calendar", label: "Calendar", icon: Calendar, color: "bg-[#eaf0fa] text-[#46628d]" },
          { href: "/dashboard/transactions", label: "Payments", icon: CreditCard, color: "bg-[#eaf1ee] text-[#43574b]" },
        ].map(({ href, label, icon: Icon, color }) => (
          <Link key={href} href={href} className="group flex flex-col sm:flex-row items-center gap-2 rounded-2xl bg-[var(--bg-card)] p-3 transition hover:bg-[var(--bg-secondary)] sm:p-5">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${color}`}><Icon className="h-5 w-5" strokeWidth={1.7} /></span>
            <span className="text-base sm:text-lg font-semibold">{label}</span>
            <ArrowRight className="ml-auto hidden h-4 w-4 text-[var(--text-muted)] transition group-hover:translate-x-1 sm:block" />
          </Link>
        ))}
      </nav>

      <section aria-labelledby="jobs-heading">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="jobs-heading" className="text-xl font-semibold tracking-tight">Current jobs</h2>
          <Link href="/dashboard/log" className="text-sm font-medium underline decoration-[var(--border-color)] underline-offset-4 hover:decoration-current">View all</Link>
        </div>
        {loadError ? (<p role="alert">Could not load jobs. <Link className="underline" href="/dashboard/log">Open job log to try again</Link></p>) : loading ? (
          <p role="status" className="py-8 text-sm text-[var(--text-muted)]">Loading your jobs…</p>
        ) : activeJobs.length === 0 ? (
          <div className="flex items-center gap-4 rounded-2xl bg-[var(--bg-card)] p-6">
            <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#fff0e2] text-[#b3652e]"><Snowflake className="h-6 w-6" strokeWidth={1.5} /></span>
            <div><p className="font-medium">All clear for now</p><p className="mt-1 text-sm text-[var(--text-secondary)]">Your next snow job will show up here.</p></div>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-color)]">
            {activeJobs.slice(0, 1).map((job) => (
              <div key={job.id} className="flex items-center gap-2 py-5 pr-16 sm:pr-0">
                <Link href={job.chatId ? `/dashboard/messages/${job.chatId}` : "/dashboard/log"} className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium"><User className="h-4 w-4 shrink-0" /><span className="truncate">{operatorNames[job.operatorId] || "Operator"}</span></p>
                    <p className="mt-1 text-sm capitalize text-[var(--text-secondary)]">{job.serviceTypes?.map((service) => service.replaceAll("-", " ")).join(", ")}</p>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">{job.scheduledDate && isValidDate(job.scheduledDate) ? format(new Date(job.scheduledDate), "MMM d") : "Date to be confirmed"}{job.scheduledTime ? ` · ${job.scheduledTime}` : ""}</p>
                  </div>
                  <StatusBadge status={job.status} />
                </Link>
                {!["completed", "cancelled"].includes(job.status) && (
                  <button onClick={() => cancelJob(job.id)} disabled={cancellingJob === job.id} aria-label="Cancel job" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[var(--text-muted)] transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"><X className="h-4 w-4" /></button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>


    </div>
  );
}
