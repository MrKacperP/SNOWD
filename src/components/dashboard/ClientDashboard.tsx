"use client";

import { BookingAction, HomeActions } from "./HomeActions";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { useWorkOrders } from "@/hooks/useWorkOrders";
import { dateMillis, isAsap, scheduleText, orderActionNeeded } from "@/lib/workOrders";
import { ClientProfile,Job } from "@/lib/types";
import { Snowflake,User } from "lucide-react";
import Link from "next/link";

export default function ClientDashboard() {
  const { profile } = useAuth();
  const clientProfile = profile as ClientProfile;
  const { jobs, names: operatorNames, loading, error } = useWorkOrders();
  const activeJobs = jobs.filter(job => ["pending", "accepted", "en-route", "in-progress"].includes(job.status))
    .sort((a, b) => {
      const urgency = (job: Job) => ["en-route", "in-progress"].includes(job.status) ? 0 : orderActionNeeded(job, profile?.uid || "") ? 1 : 2;
      return urgency(a) - urgency(b) || (dateMillis(a.scheduledDate) || dateMillis(a.createdAt)) - (dateMillis(b.scheduledDate) || dateMillis(b.createdAt));
    }).slice(0, 3);
  const loadError = !!error;

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
                    <p className="mt-1 text-sm text-[var(--text-muted)]">{isAsap(job) ? "ASAP · Arrival time to be confirmed" : scheduleText(job)}</p>
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
