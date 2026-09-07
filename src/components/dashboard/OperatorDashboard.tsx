"use client";

import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { Job,OperatorProfile } from "@/lib/types";
import { collection,doc,onSnapshot,query,updateDoc,where } from "firebase/firestore";
import { ArrowRight,Calendar,CreditCard,MessageCircle } from "lucide-react";
import Link from "next/link";
import { useEffect,useState } from "react";

export default function OperatorDashboard() {
  const { profile, refreshProfile } = useAuth();
  const operator = profile as OperatorProfile | null;
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const available = operator?.isAvailable ?? true;

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

  return (
    <div className="mx-auto max-w-[1040px] space-y-5 pb-6 text-[var(--text-primary)]">
      <header>
        <p className="text-sm text-[var(--text-secondary)]">Welcome, {operator?.displayName?.split(" ")[0] || "there"}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Your day, at a glance.</h1>
      </header>

      <section aria-labelledby="availability-heading" className="rounded-3xl bg-[#eaf1ee] p-6 text-[#17251e]">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <h2 id="availability-heading" className="text-lg font-medium">Availability</h2>
            <p className="mt-2 text-3xl font-semibold">{available ? "Ready for requests" : "Taking a break"}</p>
            <p className="mt-2 text-base text-[#43574b]">{available ? "Clients can request your help." : "Turn on availability when you’re ready."}</p>
          </div>
          <button type="button" role="switch" aria-checked={available} aria-label="Available for job requests" disabled={saving} onClick={toggleAvailability} className="min-h-12 rounded-full bg-[#17251e] px-6 py-3 text-base font-semibold text-white disabled:opacity-50">
            {saving ? "Saving…" : available ? "Go unavailable" : "Go available"}
          </button>
        </div>
        {!operator?.idVerified && <Link href="/dashboard/settings?tab=verification" className="mt-4 inline-block font-semibold underline">Verify your ID to receive jobs</Link>}
        {availabilityError && <p role="alert" className="mt-3 text-red-700">{availabilityError}</p>}
      </section>

      <section aria-labelledby="work-heading" className="rounded-2xl bg-[var(--bg-card)] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="work-heading" className="text-xl font-semibold">Current work</h2>
          <Link href="/dashboard/jobs" className="min-h-11 content-center text-base font-semibold underline underline-offset-4">View jobs</Link>
        </div>
        {loadError ? <p role="alert" className="mt-3">Could not load jobs. <Link href="/dashboard/jobs" className="underline">Open jobs to try again.</Link></p> : loading ? <p role="status" className="mt-3">Loading jobs…</p> : <>
          <Link href="/dashboard/jobs" className="mt-3 flex min-h-12 items-center justify-between gap-3 rounded-xl bg-[var(--bg-secondary)] p-4">
            <span className="text-lg font-medium">{pending.length} new request{pending.length === 1 ? "" : "s"}</span><ArrowRight className="h-5 w-5 shrink-0" />
          </Link>
          {nextJob ? <Link href={nextJob.chatId ? `/dashboard/messages/${nextJob.chatId}` : "/dashboard/log"} className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl py-2">
            <div className="min-w-0 flex-1"><p className="text-lg font-semibold break-words">{nextJob.address || "Your next job"}</p><p className="mt-1 text-base text-[var(--text-secondary)]">{active.length} active job{active.length === 1 ? "" : "s"} · Open job details</p></div>
            <StatusBadge status={nextJob.status} />
          </Link> : <p className="mt-4 text-base text-[var(--text-secondary)]">No active jobs. Your next job will appear here.</p>}
        </>}
      </section>

      <nav aria-label="Dashboard shortcuts" className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { href: "/dashboard/messages", label: "Messages", description: "Talk to your clients", icon: MessageCircle, color: "bg-[#fff0e2] text-[#9b5420]" },
          { href: "/dashboard/calendar", label: "Calendar", description: "Plan your schedule", icon: Calendar, color: "bg-[#eaf0fa] text-[#46628d]" },
          { href: "/dashboard/transactions", label: "Payments", description: "See earnings & payouts", icon: CreditCard, color: "bg-[#eaf1ee] text-[#43574b]" },
        ].map(({ href, label, description, icon: Icon, color }) => <Link key={href} href={href} className="flex min-w-0 flex-col sm:flex-row items-center gap-2 rounded-2xl bg-[var(--bg-card)] p-3 sm:p-5 transition hover:bg-[var(--bg-secondary)]">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${color}`}><Icon className="h-5 w-5" /></span>
          <div className="min-w-0"><h2 className="text-base sm:text-lg font-semibold">{label}</h2><p className="mt-1 hidden sm:block text-sm text-[var(--text-secondary)]">{description}</p></div>
        </Link>)}
      </nav>
    </div>
  );
}
