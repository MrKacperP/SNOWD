"use client";

import Link from "next/link";
import { Download, FileText, Image as ImageIcon } from "lucide-react";
import { AdminCard, EmptyState, StatusTag, tableCell, tableHead } from "@/components/admin/AdminUI";
import { useAdminData } from "@/components/admin/AdminProvider";
import { csvFromRows, downloadCsv } from "@/lib/admin/utils";
import { useMemo, useState } from "react";

const ranges = ["All time", "Last 7 days", "Last 30 days", "Last 90 days"] as const;

function withinRange(date: string, range: string) {
  if (range === "All time") return true;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return false;
  const days = range === "Last 7 days" ? 7 : range === "Last 30 days" ? 30 : 90;
  return Date.now() - parsed.getTime() <= days * 86_400_000;
}

export default function AdminReportsPage() {
  const { jobs, transactions, claims, supportTickets } = useAdminData();
  const [range, setRange] = useState<(typeof ranges)[number]>("Last 30 days");
  const [serviceFilter, setServiceFilter] = useState("All");

  const rows = useMemo(() => jobs.filter((job) => withinRange(job.datePosted, range) && (serviceFilter === "All" || job.category === serviceFilter)), [jobs, range, serviceFilter]);
  const categories = useMemo(() => ["All", ...Array.from(new Set(jobs.map((job) => job.category).filter(Boolean))).sort()], [jobs]);
  const completed = rows.filter((job) => job.status === "Completed");
  const evidence = rows.filter((job) => Boolean(job.completionPhotoUrl));
  const revenue = transactions.filter((transaction) => transaction.status === "Completed" && withinRange(transaction.date, range)).reduce((sum, transaction) => sum + (transaction.type === "Refund" ? -transaction.amount : transaction.amount), 0);
  const openClaims = claims.filter((claim) => claim.status === "Open").length;
  const openSupport = supportTickets.filter((ticket) => ticket.status !== "Resolved").length;

  const exportReport = () => {
    const csv = csvFromRows(rows.map((job) => ({
      Job: job.id,
      Service: job.category,
      Client: job.postedBy,
      Address: job.address || "",
      Status: job.status,
      Price: job.price || 0,
      Payment: job.paymentStatus || "",
      Scheduled: job.scheduledDate || "",
      CompletionEvidence: job.completionPhotoUrl ? "Yes" : "No",
    })));
    downloadCsv("snowd-service-report.csv", csv);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Operations reporting</p>
          <h2 className="text-xl font-semibold text-[var(--ink)] mt-1">Service and revenue reports</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">Review the same job, payment, evidence, claim, and support records used across the CRM.</p>
        </div>
        <button onClick={exportReport} className="h-10 px-3 rounded-lg bg-[var(--accent)] text-white text-sm font-semibold inline-flex items-center gap-2"><Download className="w-4 h-4" /> Export service report</button>
      </div>

      <AdminCard className="p-4">
        <div className="flex flex-wrap gap-2">
          <select value={range} onChange={(event) => setRange(event.target.value as (typeof ranges)[number])} className="h-10 px-3 rounded-lg border-[3px] border-[var(--border)] bg-white text-sm">
            {ranges.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)} className="h-10 px-3 rounded-lg border-[3px] border-[var(--border)] bg-white text-sm">
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
      </AdminCard>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          ["Jobs in report", rows.length],
          ["Completed", completed.length],
          ["Evidence attached", evidence.length],
          ["Revenue", `$${revenue.toFixed(2)}`],
          ["Open follow-ups", openClaims + openSupport],
        ].map(([label, value]) => <AdminCard key={String(label)} className="p-3"><p className="text-xs text-[var(--text-muted)]">{label}</p><p className="text-xl font-semibold text-[var(--ink)] mt-1">{value}</p></AdminCard>)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <AdminCard className="p-4 xl:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-[var(--ink)]">Service delivery</h3><StatusTag label={`${completed.length}/${rows.length || 0} completed`} tone="blue" /></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[820px]"><thead><tr><th className={tableHead}>Job</th><th className={tableHead}>Service</th><th className={tableHead}>Client</th><th className={tableHead}>Status</th><th className={tableHead}>Evidence</th><th className={tableHead}>Open</th></tr></thead><tbody>
            {rows.map((job) => <tr key={job.id} className="border-b border-[var(--border)]"><td className={tableCell}><Link href={`/admin/jobs?job=${job.id}`} className="font-medium text-[var(--accent)]">{job.id.slice(0, 12)}</Link></td><td className={tableCell}>{job.category}</td><td className={tableCell}>{job.postedBy}</td><td className={tableCell}><StatusTag label={job.status} tone={job.status === "Completed" ? "green" : job.status === "Flagged" ? "red" : "yellow"} /></td><td className={tableCell}>{job.completionPhotoUrl ? <a href={job.completionPhotoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[var(--accent)]"><ImageIcon className="w-4 h-4" /> Open upload</a> : "Missing"}</td><td className={tableCell}>{job.price ? `$${job.price.toFixed(2)}` : "-"}</td></tr>)}
          </tbody></table></div>
          {rows.length === 0 && <EmptyState title="No jobs match this report" subtitle="Change the date or service filter." />}
        </AdminCard>

        <AdminCard className="p-4">
          <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-[var(--accent)]" /><h3 className="font-semibold text-[var(--ink)]">Follow-up queues</h3></div>
          <div className="mt-4 space-y-3 text-sm"><Link href="/admin/claims" className="flex items-center justify-between border-b border-[var(--border)] pb-3"><span>Open claims</span><strong>{openClaims}</strong></Link><Link href="/admin/support-chats" className="flex items-center justify-between border-b border-[var(--border)] pb-3"><span>Open support</span><strong>{openSupport}</strong></Link><Link href="/admin/verifications" className="flex items-center justify-between"><span>Evidence and identity review</span><strong>Open queue</strong></Link></div>
          <p className="text-xs text-[var(--text-muted)] mt-5">Reports are operational summaries. Payment disputes and refunds should still be reconciled against the linked transaction and Stripe record.</p>
        </AdminCard>
      </div>
    </div>
  );
}
