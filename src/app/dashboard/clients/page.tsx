"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import { stripeConnectFetch } from "@/lib/stripeConnectClient";
import { useAuth } from "@/context/AuthContext";
type NearbyClient = { uid: string; displayName: string; city: string; distanceKm: number | null };
export default function NearbyClientsPage() {
  const { profile } = useAuth();
  const [clients, setClients] = useState<NearbyClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [invited, setInvited] = useState<string[]>([]);
  useEffect(() => {
    if (!profile) return;
    let active = true;
    stripeConnectFetch("/api/operators/nearby-clients").then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (active) setClients(result.clients);
    }).catch(error => { if (active) setError(error.message || "Could not load nearby clients."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [profile]);
  async function invite(clientId: string) {
    setBusy(clientId); setError("");
    try {
      const response = await stripeConnectFetch("/api/operators/nearby-clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setInvited(previous => [...previous, clientId]);
    } catch (error) { setError(error instanceof Error ? error.message : "Could not send invitation."); }
    finally { setBusy(null); }
  }
  return <div className="mx-auto max-w-4xl space-y-5"><PageHeader title="Nearby clients" description="Clients inside your service radius can see you too. Invite them to choose a service, date and payment method." />
    <Link href="/dashboard/settings" className="inline-block underline">Update your service area</Link>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
    {loading ? <p role="status">Loading nearby clients…</p> : !error && !clients.length ? <p>No clients found in your service area. Check your address and service radius.</p> : null}
    {clients.map(client => <div key={client.uid} className="surface-card flex flex-wrap items-center justify-between gap-4 p-5"><div><Link className="text-lg font-semibold underline" href={`/dashboard/u/${client.uid}`}>{client.displayName || "Client"}</Link><p>{client.city}{client.distanceKm !== null ? ` · ${client.distanceKm.toFixed(1)} km away` : ""}</p></div><button disabled={busy !== null || invited.includes(client.uid)} onClick={() => invite(client.uid)} className="btn-primary px-4 py-3">{invited.includes(client.uid) ? "Invitation sent" : busy === client.uid ? "Sending…" : "Invite to book"}</button></div>)}
  </div>;
}
