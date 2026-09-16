"use client";

import AvailabilityToggle from "./AvailabilityToggle";
import { HomeActions } from "./HomeActions";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { Job,OperatorProfile } from "@/lib/types";
import { orderActionNeeded, scheduleText } from "@/lib/workOrders";
import { workOrderPresentation } from "@/lib/workOrderPresentation";
import { collection,doc,onSnapshot,query,updateDoc,where } from "firebase/firestore";
import Link from "next/link";
import { useEffect,useState } from "react";
import OrderActions from "@/components/work-orders/OrderActions";

export default function OperatorDashboard() {
  const { profile, refreshProfile } = useAuth();
  const operator = profile as OperatorProfile | null;
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const available = operator?.isAvailable !== false;

  useEffect(() => {
    if (!profile?.uid) return;
    return onSnapshot(query(collection(db, "jobs"), where("operatorId", "==", profile.uid)), snapshot => {
      setJobs(snapshot.docs.map(document => ({ ...document.data(), id: document.id } as Job)));
      setLoading(false);
      setLoadError(false);
    }, () => { setLoadError(true); setLoading(false); });
  }, [profile?.uid]);

  async function toggleAvailability() {
    if (!profile?.uid || saving) return;
    setSaving(true);
    setAvailabilityError("");
    try {
      await updateDoc(doc(db, "users", profile.uid), { isAvailable: !available });
      await refreshProfile();
    } catch {
      setAvailabilityError("Could not update availability. Please try again.");
    } finally { setSaving(false); }
  }

  const pending = jobs.filter(job => job.status === "pending");
  const active = jobs.filter(job => ["accepted", "en-route", "in-progress"].includes(job.status));
  const nextJob = active.find(job => job.status === "in-progress") ?? active.find(job => job.status === "en-route") ?? active[0];
  const attentionJob = pending.find(job => orderActionNeeded(job, operator?.uid || "")) ?? (nextJob && orderActionNeeded(nextJob, operator?.uid || "") ? nextJob : undefined);

  return (
    <div className="app-page text-[var(--text-primary)]">
      <header>
        <p className="app-eyebrow">Your snow day</p>
        <h1 className="text-3xl font-semibold tracking-[-.04em] sm:text-5xl">Good to see you,<br className="sm:hidden" /> {operator?.displayName?.split(" ")[0] || "there"}.</h1>
      </header>

      <section aria-labelledby="availability-heading" className="next-action">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="app-eyebrow">Availability</p>
            <h2 id="availability-heading">{available ? "You’re ready for work." : "Requests are paused."}</h2>
            <p>{available ? "Nearby clients can request your help." : "Turn availability on when you’re ready."}</p>
          </div>
          <AvailabilityToggle online={available} saving={saving} error={availabilityError} onToggle={toggleAvailability} />
        </div>
        {!operator?.idVerified && <Link href="/dashboard/settings?tab=verification" className="mt-4 inline-block font-semibold underline">Verify your ID to receive jobs</Link>}
        {availabilityError && <p role="alert" className="mt-3 text-red-700">{availabilityError}</p>}
      </section>

      <section aria-labelledby="work-heading" className="app-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="work-heading" className="text-xl font-semibold">Current work</h2>
          <Link href="/dashboard/jobs" className="min-h-11 content-center text-base font-semibold underline underline-offset-4">View jobs</Link>
        </div>
        {loadError ? <p role="alert" className="mt-3">Could not load jobs. <Link href="/dashboard/jobs" className="underline">Open jobs to try again.</Link></p> : loading ? <p role="status" className="mt-3">Loading jobs…</p> : <>
          {pending.length > 0 && <div className="mt-3 rounded-xl border border-[var(--surface-blue-border)] bg-[var(--surface-blue)] p-4">
            <div className="flex min-h-8 items-center justify-between gap-3"><span className="text-lg font-medium">{pending.length} new request{pending.length === 1 ? "" : "s"}</span>{pending.length > 1 && <Link href="/dashboard/jobs?view=attention" className="font-semibold underline">View all</Link>}</div>
            {attentionJob?.status === "pending" && <OrderActions job={attentionJob} compact navigateOnUpdate={false} />}
          </div>}
          {nextJob ? <Link href={`/dashboard/jobs/${nextJob.id}`} className={`job-widget job-widget--${nextJob.status} mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4`}>
            <div className="min-w-0 flex-1"><p className="app-eyebrow">Up next</p><p className="text-lg font-semibold break-words">{workOrderPresentation(nextJob, operator?.uid || "").title}</p><p className="mt-1 text-sm text-[var(--text-secondary)]">{nextJob.address || "Job address"} · {scheduleText(nextJob)}</p></div>
            <StatusBadge status={nextJob.status} />
          </Link> : <p className="mt-4 text-base text-[var(--text-secondary)]">No active jobs. Your next job will appear here.</p>}
          {nextJob && attentionJob?.id === nextJob.id && <OrderActions job={nextJob} compact navigateOnUpdate={false} />}
        </>}
      </section>

      <HomeActions operator />
    </div>
  );
}
