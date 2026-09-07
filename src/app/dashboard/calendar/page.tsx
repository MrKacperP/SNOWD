"use client";

import StatusBadge from "@/components/StatusBadge";
import ActionGroup from "@/components/ui/ActionGroup";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { Job } from "@/lib/types";
import { addDays,addMonths,endOfMonth,endOfWeek,format,isSameDay,isSameMonth,isToday,startOfMonth,startOfWeek,subMonths } from "date-fns";
import { collection,doc,getDoc,onSnapshot,query,where } from "firebase/firestore";
import { ChevronLeft,ChevronRight,Plus } from "lucide-react";
import Link from "next/link";
import { useEffect,useState } from "react";

function jobDate(job: Job): Date | null {
  const value = job.scheduledDate || job.completionTime || job.createdAt;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default function CalendarPage() {
  const { profile } = useAuth();
  const isOperator = profile?.role === "operator";
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState(new Date());
  const [jobs, setJobs] = useState<Job[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!profile?.uid) return;
    let active = true;
    return (() => {
      const stop = onSnapshot(query(collection(db, "jobs"), where(isOperator ? "operatorId" : "clientId", "==", profile.uid)), async snapshot => {
        const list = snapshot.docs.map(item => {
          const data = item.data();
          return { ...data, id: item.id, scheduledDate: data.scheduledDate?.toDate?.() || data.scheduledDate, createdAt: data.createdAt?.toDate?.() || data.createdAt, completionTime: data.completionTime?.toDate?.() || data.completionTime } as Job;
        });
        setJobs(list); setLoading(false); setError(false);
        const ids = [...new Set(list.map(job => isOperator ? job.clientId : job.operatorId))];
        const entries = await Promise.all(ids.map(async id => {
          try { const user = await getDoc(doc(db, "users", id)); return [id, user.data()?.displayName || "User"] as const; }
          catch { return [id, "User"] as const; }
        }));
        if (active) setNames(Object.fromEntries(entries));
      }, () => { setError(true); setLoading(false); });
      return () => { active = false; stop(); };
    })();
  }, [profile?.uid, isOperator, retry]);

  const days: Date[] = [];
  const last = endOfWeek(endOfMonth(month));
  for (let day = startOfWeek(startOfMonth(month)); day <= last; day = addDays(day, 1)) days.push(day);
  const forDay = (day: Date) => jobs.filter(job => { const date = jobDate(job); return date && isSameDay(date, day) && job.status !== "cancelled"; });
  const selectedJobs = forDay(selected);
  const upcoming = jobs.filter(job => !["completed", "cancelled"].includes(job.status)).sort((a,b) => (jobDate(a)?.getTime() || 0) - (jobDate(b)?.getTime() || 0));
  const canBook = !isOperator && format(selected,"yyyy-MM-dd") >= format(new Date(),"yyyy-MM-dd");
  const bookingLink = `/dashboard/find?date=${format(selected, "yyyy-MM-dd")}`;
  const row = (job: Job) => <Link key={job.id} href={job.chatId ? `/dashboard/messages/${job.chatId}` : "/dashboard/log"} className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--bg-secondary)] p-4">
    <div className="min-w-0 flex-1"><p className="text-base font-semibold break-words">{names[isOperator ? job.clientId : job.operatorId] || (isOperator ? "Client" : "Operator")}</p><p className="mt-1 text-sm text-[var(--text-secondary)]">{jobDate(job) ? format(jobDate(job)!, "MMM d") : "Date pending"} · {job.scheduledTime || "Time to be confirmed"}</p><p className="mt-1 text-sm break-words text-[var(--text-muted)]">{job.address}</p></div><StatusBadge status={job.status} />
  </Link>;

  return <div className="mx-auto max-w-[1040px] space-y-5">
    <PageHeader title="Calendar" description="Your jobs, one day at a time." />
    {error && <div role="alert" className="rounded-2xl bg-red-50 p-4">Could not load your schedule. <button onClick={() => setRetry(value => value + 1)} className="underline">Try again</button></div>}
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <section aria-label="Month calendar" className="overflow-hidden rounded-3xl border border-[var(--border-color)] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 p-4">
          <h2 className="text-xl font-semibold">{format(month,"MMMM yyyy")}</h2>
          <div className="flex items-center gap-1"><button aria-label="Previous month" onClick={() => setMonth(subMonths(month,1))} className="rounded-xl p-3 hover:bg-[var(--bg-secondary)]"><ChevronLeft size={20} /></button><button onClick={() => { const now = new Date(); setMonth(now); setSelected(now); }} className="rounded-xl px-3 py-3 text-sm">Today</button><button aria-label="Next month" onClick={() => setMonth(addMonths(month,1))} className="rounded-xl p-3 hover:bg-[var(--bg-secondary)]"><ChevronRight size={20} /></button></div>
        </div>
        <div className="grid grid-cols-7 px-2 text-center">{["S","M","T","W","T","F","S"].map((day,index) => <span key={index} className="py-2 text-xs text-[var(--text-muted)]">{day}</span>)}</div>
        <div className="grid grid-cols-7 gap-1 px-2 pb-3">{days.map(day => {
          const count = forDay(day).length;
          return <button key={day.toISOString()} aria-label={`${format(day,"EEEE, MMMM d, yyyy")}, ${count} jobs`} aria-pressed={isSameDay(day,selected)} aria-current={isToday(day) ? "date" : undefined} onClick={() => setSelected(day)} className={`relative min-h-11 min-w-0 rounded-xl py-3 text-base transition ${isSameDay(day,selected) ? "bg-[#17251e] text-white" : isSameMonth(day,month) ? "hover:bg-[#eaf1ee]" : "text-[var(--text-muted)]"}`}>
            {format(day,"d")}{count > 0 && <span aria-hidden="true" className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${isSameDay(day,selected) ? "bg-white" : "bg-[#43574b]"}`} />}
          </button>;
        })}</div>
      </section>
      <section aria-live="polite" className="rounded-3xl bg-white p-5 sm:p-6">
        <h2 className="text-xl font-semibold">{format(selected,"EEEE, MMM d")}</h2>
        <div className="mt-4 space-y-3">{loading ? <p role="status">Loading your schedule…</p> : selectedJobs.length ? selectedJobs.map(row) : <p className="py-5 text-base text-[var(--text-secondary)]">Nothing scheduled. Your day is clear.</p>}</div>
        {canBook && <Link href={bookingLink} className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#17251e] px-5 py-3 font-semibold text-white"><Plus size={18} />Book help for this day</Link>}
      </section>
    </div>
    <ActionGroup title={`Upcoming jobs (${upcoming.length})`}><div className="space-y-3">{upcoming.length ? upcoming.map(row) : <p className="text-[var(--text-secondary)]">No upcoming jobs.</p>}</div></ActionGroup>
  </div>;
}
