"use client";

import { BookingAction, HomeActions } from "./HomeActions";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { useWorkOrders } from "@/hooks/useWorkOrders";
import { dateMillis, isAsap, scheduleText, orderActionNeeded } from "@/lib/workOrders";
import { workOrderPresentation } from "@/lib/workOrderPresentation";
import { ClientProfile,Job } from "@/lib/types";
import { ArrowRight, MapPin, User } from "lucide-react";
import Link from "next/link";

import OrderActions from "@/components/work-orders/OrderActions";

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
  const locationLabel =
    [clientProfile?.city, clientProfile?.province].filter(Boolean).join(", ") || "Your service area";

  return <ClientHomeView greeting={greeting()} locationLabel={locationLabel} activeJobs={activeJobs} operatorNames={operatorNames} loading={loading} loadError={loadError} />;
}

export function ClientHomeView({ greeting, locationLabel, activeJobs, operatorNames, loading, loadError }: {
  greeting: string; locationLabel: string; activeJobs: Job[];
  operatorNames: Record<string, string>; loading: boolean; loadError: boolean;
}) {
  const nextJob = activeJobs[0];
  const next = nextJob ? workOrderPresentation(nextJob, nextJob.clientId) : null;
  return (
    <div className="app-page text-[var(--text-primary)]">
      <header>
        <p className="app-eyebrow">{greeting}</p>
        <h1 className="text-3xl font-semibold tracking-[-.04em] sm:text-5xl">Your snow day</h1>
      </header>

      {!loading && !loadError && nextJob && next ? <section className={`next-action job-widget job-widget--${nextJob.status}`}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="app-eyebrow">Next step</p><h2>{next.title}</h2></div><StatusBadge status={nextJob.status} /></div>
        <p>{next.description}</p>
        <div className="visit-summary mt-5 grid grid-cols-2 gap-3 rounded-xl bg-white/75 p-4 sm:grid-cols-3">
          <div><span className="text-xs text-[var(--text-muted)]">Your shoveler</span><strong className="mt-1 block">{operatorNames[nextJob.operatorId] || "Operator"}</strong></div>
          <div className="col-span-2 sm:col-span-1"><span className="text-xs text-[var(--text-muted)]">When</span><strong className="mt-1 block text-sm">{isAsap(nextJob) ? "As soon as possible" : scheduleText(nextJob)}</strong></div>
          <div><span className="text-xs text-[var(--text-muted)]">Total</span><strong className="mt-1 block">${nextJob.price.toFixed(2)} CAD</strong></div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">{orderActionNeeded(nextJob, nextJob.clientId) ? <OrderActions job={nextJob} compact navigateOnUpdate={false} /> : <Link className="btn-primary min-h-12" href={`/dashboard/jobs/${nextJob.id}`}>{next.nextAction || "View visit"}<ArrowRight size={18} /></Link>}<Link className="inline-flex min-h-11 items-center px-2 font-semibold text-[var(--text-secondary)]" href="/dashboard/find">Book another</Link></div>
      </section> : <BookingAction location={locationLabel} />}

      {(loading || loadError || !nextJob || activeJobs.length > 1) && <section aria-labelledby="jobs-heading">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="jobs-heading" className="text-xl font-semibold tracking-tight">{nextJob ? "Other visits" : "Current work orders"}</h2>
          <Link href="/dashboard/jobs" className="inline-flex min-h-11 items-center text-sm font-medium underline decoration-[var(--border-color)] underline-offset-4 hover:decoration-current">View all</Link>
        </div>
        {loadError ? (<p role="alert">Could not load jobs. <Link className="underline" href="/dashboard/jobs">Open job log to try again</Link></p>) : loading ? (
          <p role="status" className="py-8 text-sm text-[var(--text-muted)]">Loading your work orders…</p>
        ) : activeJobs.length === 0 ? (
          <div className="app-card flex items-center gap-3 p-5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)]"><MapPin size={19} className="text-[var(--accent)]" /></span><div><p className="font-semibold">All clear for now</p><p className="mt-1 text-sm text-[var(--text-secondary)]">Your next visit will appear here.</p></div></div>
        ) : (
          <div className="divide-y divide-[var(--border-color)]">
            {activeJobs.filter(job => job.id !== nextJob?.id).map((job) => (
              <div key={job.id} className="py-5">
                <Link href={`/dashboard/jobs/${job.id}`} className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium"><User className="h-4 w-4 shrink-0" /><span className="truncate">{operatorNames[job.operatorId] || "Operator"}</span></p>
                    <p className="mt-1 text-sm capitalize text-[var(--text-secondary)]">{job.serviceTypes?.map((service) => service.replaceAll("-", " ")).join(", ")}</p>
                    <p className="mt-1 flex items-center gap-1 text-sm text-[var(--text-muted)]"><MapPin size={13} />{isAsap(job) ? "ASAP" : scheduleText(job)}</p>
                  </div>
                  <StatusBadge status={job.status} />
                </Link>
                {job.id !== nextJob?.id && orderActionNeeded(job, job.clientId) && <OrderActions job={job} compact navigateOnUpdate={false} />}
              </div>
            ))}
          </div>
        )}
      </section>}

      <HomeActions />
    </div>
  );
}
