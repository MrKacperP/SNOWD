"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
type Request = { uid: string; email: string | null; status: string; dueAt: string };
export default function AccountDeletions() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]), [error, setError] = useState("");
  useEffect(() => {
    if (!user) return;
    void user.getIdToken().then(token => fetch("/api/admin/account-deletions", { headers: { Authorization: `Bearer ${token}` } })).then(async response => {
      if (!response.ok) throw new Error("Could not load deletion requests.");
      setRequests((await response.json()).requests);
    }).catch(e => setError(e.message));
  }, [user]);
  return <main className="p-6 max-w-4xl"><h1 className="text-2xl font-semibold">Account deletion requests</h1><p className="my-4">Process each request within 30 days. Review outstanding jobs, disputes and financial retention before deleting records. Follow the mobile release runbook; deleting only the profile is insufficient.</p>
    {error && <p role="alert">{error}</p>}
    {requests.map(request => <section className="my-4 rounded-xl border p-4" key={request.uid}><h2 className="font-semibold">{request.email || request.uid}</h2><p>Status: {request.status} · Due: {new Date(request.dueAt).toLocaleDateString("en-CA", { timeZone: "America/Toronto" })}</p><Link className="inline-flex min-h-11 items-center underline" href={`/admin/account-deletions/${encodeURIComponent(request.uid)}`}>Review and process request</Link><p className="text-sm">Request reference: {request.uid}</p></section>)}
  </main>;
}
