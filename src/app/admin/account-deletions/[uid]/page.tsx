"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
type Review = { uid: string; status: string; appleLinked: boolean; appleRevocationReported: boolean; jobCount: number; claimCount: number; activeJobs: string[]; openClaims: string[] };
export default function DeletionReviewPage() {
  const { uid } = useParams<{ uid: string }>(), { user } = useAuth();
  const [review, setReview] = useState<Review | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState(""), [retentionReason, setRetentionReason] = useState("");
  const [externalRecordsReviewed, setExternalRecordsReviewed] = useState(false), [providerRevocationConfirmed, setProviderRevocationConfirmed] = useState(false);
  useEffect(() => {
    if (!user) return;
    let current = true;
    void user.getIdToken().then(token => fetch(`/api/admin/account-deletions/${encodeURIComponent(uid)}`, { headers: { Authorization: `Bearer ${token}` } })).then(async response => {
      const data = await response.json(); if (!response.ok) throw new Error(data.error); if (current) setReview(data);
    }).catch(e => { if (current) setError(e.message); });
    return () => { current = false; };
  }, [uid, user]);
  const blocked = !review || review.status === "completed" || review.activeJobs.length > 0 || review.openClaims.length > 0;
  return <main className="max-w-3xl p-6"><Link className="inline-flex min-h-11 items-center underline" href="/admin/account-deletions">← Deletion requests</Link><h1 className="mt-4 text-2xl font-semibold">Review permanent deletion</h1>
    <p className="my-4 break-all">Account reference: {uid}</p>
    {error && <p role="alert" className="my-4 text-red-700">{error}</p>}
    {review && <>
      <p>Status: {review.status}. Historical jobs: {review.jobCount}. Claims: {review.claimCount}.</p>
      {review.activeJobs.length > 0 && <p className="my-3">Resolve active jobs or held payments first: {review.activeJobs.join(", ")}</p>}
      {review.openClaims.length > 0 && <p className="my-3">Resolve open claims first: {review.openClaims.join(", ")}</p>}
      <section className="my-5 rounded-xl border p-4"><h2 className="font-semibold">What processing removes</h2><p className="my-2">The login, private profile, personal uploads, authored messages and reviews, notifications, support conversation, owned block list, saved-operator references and account-history email record.</p><p>Historical jobs, transactions and claim records remain only under your documented retention review. Review other participants’ messages, legacy uploads, Stripe data and backups separately. Do not use this action until those checks are complete.</p></section>
      {review.status !== "completed" && <form onSubmit={async e => {
        e.preventDefault(); if (!user || busy || blocked) return; setBusy(true); setError("");
        try {
          const response = await fetch(`/api/admin/account-deletions/${encodeURIComponent(uid)}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ confirmation, retentionReason, externalRecordsReviewed, providerRevocationConfirmed }) });
          const data = await response.json(); if (!response.ok) throw new Error(data.error); setReview({ ...review, status: data.status });
        } catch (e) { setError(e instanceof Error ? e.message : "Deletion could not finish."); }
        finally { setBusy(false); }
      }}>
        <label className="block font-semibold" htmlFor="retention">Retention grounds and completion evidence</label><p className="my-2 text-sm">Explain retained record categories, purpose and period. Reference your legacy/provider cleanup evidence. Do not paste identity documents, tokens or deleted content.</p><textarea id="retention" className="min-h-32 w-full rounded-xl border p-3" value={retentionReason} onChange={e => setRetentionReason(e.target.value)} maxLength={2000} required/>
        <label className="my-4 flex min-h-11 gap-3 items-start"><input className="mt-1" type="checkbox" checked={externalRecordsReviewed} onChange={e => setExternalRecordsReviewed(e.target.checked)}/><span>I have reviewed retention and completed any necessary legacy, processor and backup actions.</span></label>
        {review.appleLinked && <><p className="text-sm">Native app reported Apple revocation: {review.appleRevocationReported ? "yes" : "no"}. A client report alone is not independent proof.</p><label className="my-4 flex min-h-11 gap-3 items-start"><input className="mt-1" type="checkbox" checked={providerRevocationConfirmed} onChange={e => setProviderRevocationConfirmed(e.target.checked)}/><span>I verified that Sign in with Apple access has been revoked for this account.</span></label></>}
        <label className="block font-semibold" htmlFor="uid-confirm">Enter the account reference to confirm permanent removal</label><input id="uid-confirm" className="my-2 w-full rounded-xl border p-3" autoComplete="off" value={confirmation} onChange={e => setConfirmation(e.target.value)}/>
        <button className="my-4 min-h-12 rounded-xl bg-red-700 px-5 py-3 font-semibold text-white disabled:opacity-50" disabled={busy || blocked || confirmation !== uid || retentionReason.trim().length < 20 || !externalRecordsReviewed || (review.appleLinked && !providerRevocationConfirmed)}>{busy ? "Removing personal data…" : "Permanently process deletion"}</button>
      </form>}
      {review.status === "completed" && <p role="status" className="my-5 font-semibold">App-owned personal-data cleanup completed. Send the requester the completion notice through your approved support process, including any retention explanation.</p>}
    </>}
  </main>;
}
