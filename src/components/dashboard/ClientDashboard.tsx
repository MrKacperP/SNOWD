"use client";
import { useServiceLocation } from "@/context/ServiceLocationContext";
import { useArrivalLabel } from "@/hooks/useArrivalLabel";
import IconSwap from "@/components/ui/IconSwap";
import DashboardMap from "./DashboardMap";


import { estimatedTimeSaved } from "@/lib/clientValue";
import styles from "./home.module.css";
import { BookingAction } from "./HomeActions";
import PaymentSummary from "@/components/work-orders/PaymentSummary";
import StatusBadge from "@/components/StatusBadge";
import WorkOrderTimeline from "@/components/work-orders/WorkOrderTimeline";
import { useCancellationNotices } from "@/hooks/useCancellationNotices";
import { useAuth } from "@/context/AuthContext";
import { useWorkOrders } from "@/hooks/useWorkOrders";
import { dateMillis, isAsap, scheduleText, orderActionNeeded } from "@/lib/workOrders";
import { workOrderPresentation } from "@/lib/workOrderPresentation";
import { ClientProfile,Job,OperatorProfile } from "@/lib/types";
import TimeBack from "./TimeBack";
import { ArrowRight, MapPin, User } from "lucide-react";
import Link from "next/link";

import OrderActions from "@/components/work-orders/OrderActions";

export default function ClientDashboard() {
  const { profile } = useAuth();
  const clientProfile = profile as ClientProfile;
  const serviceLocation = useServiceLocation()?.location || clientProfile;
  const { jobs, names: operatorNames, people: operators, loading, error } = useWorkOrders();
  const cancellations = useCancellationNotices(jobs, profile?.uid);
  const activeJobs = [...cancellations, ...jobs.filter(job => !cancellations.includes(job) && (["pending", "accepted", "en-route", "in-progress"].includes(job.status) || !!orderActionNeeded(job, profile?.uid || "")))]
    .sort((a, b) => {
      const urgency = (job: Job) => ["en-route", "in-progress"].includes(job.status) ? 0 : job.status === "cancelled" && cancellations.includes(job) ? 1 : orderActionNeeded(job, profile?.uid || "") ? 2 : 3;
      return urgency(a) - urgency(b) || (dateMillis(a.scheduledDate) || dateMillis(a.createdAt)) - (dateMillis(b.scheduledDate) || dateMillis(b.createdAt));
    }).slice(0, 3);
  const loadError = !!error;
  const locationLabel =
    [serviceLocation?.city, serviceLocation?.province].filter(Boolean).join(", ") || "Your service area";

  return <ClientHomeView locationLabel={locationLabel} activeJobs={activeJobs} profile={clientProfile} operatorNames={operatorNames} operators={operators} loading={loading} loadError={loadError} savedMinutes={estimatedTimeSaved(jobs)} />;
}

export function ClientHomeView({ locationLabel, activeJobs, profile, operatorNames, operators = {}, loading, loadError, savedMinutes = 0 }: {
  locationLabel: string; activeJobs: Job[]; profile?: ClientProfile | null;
  operatorNames: Record<string, string>; operators?: Record<string, OperatorProfile>; loading: boolean; loadError: boolean; savedMinutes?: number;
}) {
  const nextJob = activeJobs[0];
  const arrival = useArrivalLabel(nextJob);
  const next = nextJob ? workOrderPresentation(nextJob, nextJob.clientId) : null;
  const operator = nextJob ? operators[nextJob.operatorId] : undefined;
  const business = operator?.businessName?.trim();
  const person = operator?.displayName?.trim();
  return (
    <div className={`app-page client-home dashboard-home ${styles.home} text-[var(--text-primary)]`}><header className="dashboard-overview"><div><h1>Your snow day</h1></div></header>
      <DashboardMap profile={profile || null} job={activeJobs.find(job => ["en-route", "in-progress"].includes(job.status)) || activeJobs.find(job => job.status === "accepted")} role="client" />
      <div className={nextJob ? "client-home-current" : "client-home-grid"}>
      {loading ? <p role="status">Loading your work orders…</p> : loadError ? <p role="alert">Could not load work orders. <Link href="/dashboard/jobs">Try again</Link></p> : nextJob && next ? <section className={`next-action job-widget job-widget--${nextJob.status}`}>
        <WorkOrderTimeline job={nextJob} />
        <h2>{next.title}</h2>
        {next.description && <p>{next.description}</p>}
        <div className="visit-summary mt-5 grid grid-cols-2 gap-3 rounded-xl bg-white/75 p-4 sm:grid-cols-3">
          <div><span className="text-xs text-[var(--text-muted)]">Your shoveler</span><strong className="mt-1 block">{business || person || operatorNames[nextJob.operatorId] || "Operator"}</strong>{business && person && business !== person && <span className="visit-person">{person}</span>}</div>
          <div className="col-span-2 sm:col-span-1"><span className="text-xs text-[var(--text-muted)]">When</span>{nextJob.status === "en-route" ? <strong className="eta-live mt-1"><span className="eta-live-badge"><span aria-hidden="true" />Live</span>{arrival}</strong> : <strong className="mt-1 block">{nextJob.status === "cancelled" ? "Cancelled" : nextJob.status === "in-progress" ? "Clearing now" : isAsap(nextJob) ? "As soon as possible" : scheduleText(nextJob)}</strong>}</div>
          <PaymentSummary job={nextJob} />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {orderActionNeeded(nextJob, nextJob.clientId) ? <>
            <OrderActions job={nextJob} compact navigateOnUpdate={false} />
            <Link className="inline-flex min-h-11 items-center px-2 font-semibold text-[var(--text-secondary)]" href={`/dashboard/jobs/${nextJob.id}`}>View work order</Link>
          </> : <Link className="btn-primary min-h-12" href={`/dashboard/jobs/${nextJob.id}`}><IconSwap icon={<ArrowRight size={18} />}>{next.nextAction || "View visit"}<ArrowRight size={18} /></IconSwap></Link>}

        </div>
      </section> : <BookingAction location={locationLabel} />}

      {(!loading && !loadError && activeJobs.length > 1) && <section className="client-orders-panel" aria-labelledby="jobs-heading">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="jobs-heading" className="text-xl font-semibold tracking-tight">{nextJob ? "Other visits" : "Current work orders"}</h2>
          <Link href="/dashboard/jobs" className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]">View all</Link>
        </div>
        {loadError ? (<p role="alert">Could not load jobs. <Link className="underline" href="/dashboard/jobs">Open job log to try again</Link></p>) : loading ? (
          <p role="status" className="py-8 text-sm text-[var(--text-muted)]">Loading your work orders…</p>
        ) : activeJobs.length === 0 ? (
          <div className="client-orders-empty"><span><MapPin size={25} strokeWidth={1.5} aria-hidden="true" /></span><div><h3>All clear for now</h3><p>Your next visit will appear here.</p></div></div>
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

      </div>
      <TimeBack minutes={savedMinutes} loading={loading} loadError={loadError} />
    </div>
  );
}
