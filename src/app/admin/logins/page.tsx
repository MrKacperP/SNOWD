"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AdminCard, EmptyState, SkeletonRows, StatusTag, tableCell, tableHead } from "@/components/admin/AdminUI";

type Login = {
  id: string; name: string; email: string | null; phone: string | null; provider: string; role: string | null;
  verificationStatus: string | null; disabled: boolean; lastSignIn: number | null; lastRefresh: number | null; createdAt: number | null;
};
type Window = "24h" | "7d" | "30d" | "all";
const windows: Record<Window, number> = { "24h": 86_400_000, "7d": 7 * 86_400_000, "30d": 30 * 86_400_000, all: Infinity };

function ago(ms: number | null) {
  if (!ms) return "Never";
  const mins = Math.floor((Date.now() - ms) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days} d ago` : new Date(ms).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminLoginsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Login[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<Window>("7d");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/monitor?view=logins", { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load sign-ins.");
      setItems(data.items);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load sign-ins."); }
    finally { setLoading(false); }
  }, [user]);
  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(i => (Date.now() - (i.lastSignIn || 0)) < windows[range] && (!q || [i.name, i.email, i.phone, i.id, i.provider, i.role].join(" ").toLowerCase().includes(q)));
  }, [items, range, search]);
  const today = items.filter(i => Date.now() - (i.lastSignIn || 0) < windows["24h"]).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[["Signed in today", today], ["Signed in this week", items.filter(i => Date.now() - (i.lastSignIn || 0) < windows["7d"]).length], ["Accounts with logins", items.length], ["Suspended", items.filter(i => i.disabled).length]].map(([label, value]) => (
          <AdminCard key={label} className="p-4"><p className="text-xs text-[var(--text-muted)]">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></AdminCard>
        ))}
      </div>
      <AdminCard className="p-3 flex flex-wrap items-center gap-2">
        {(Object.keys(windows) as Window[]).map(w => (
          <button key={w} onClick={() => setRange(w)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${range === w ? "bg-[var(--bg-secondary)] text-[var(--accent)]" : "text-[var(--text-muted)]"}`}>{w === "all" ? "All time" : `Last ${w}`}</button>
        ))}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email or provider" className="ml-auto min-w-0 flex-1 sm:flex-none sm:w-72 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm" />
        <button onClick={() => void load()} aria-label="Refresh" className="w-9 h-9 grid place-items-center rounded-lg border border-[var(--border)]"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
      </AdminCard>
      {error ? <p role="alert" className="p-3 border border-red-200 rounded-xl text-red-700">{error}</p> : null}
      <AdminCard className="overflow-x-auto">
        {loading && !items.length ? <SkeletonRows /> : !visible.length ? <EmptyState title="No sign-ins" subtitle="Nobody matches this time range or search." /> : (
          <table className="w-full min-w-[720px]">
            <thead><tr><th className={tableHead}>Account</th><th className={tableHead}>Method</th><th className={tableHead}>Role</th><th className={tableHead}>Last sign-in</th><th className={tableHead}>Last active</th><th className={tableHead}>Joined</th></tr></thead>
            <tbody>
              {visible.map(i => (
                <tr key={i.id} className="border-b border-[var(--border)] last:border-0">
                  <td className={tableCell}><Link href={`/admin/users/${i.id}`} className="font-medium text-[var(--ink)] hover:text-[var(--accent)]">{i.name}</Link><p className="text-xs text-[var(--text-muted)]">{i.email || i.phone || i.id}</p></td>
                  <td className={tableCell}><StatusTag label={i.provider} tone="blue" /></td>
                  <td className={tableCell}>{i.disabled ? <StatusTag label="Suspended" tone="red" /> : <StatusTag label={i.role || "No profile"} tone={i.role === "admin" ? "purple" : "neutral"} />}</td>
                  <td className={tableCell} title={i.lastSignIn ? new Date(i.lastSignIn).toLocaleString() : ""}>{ago(i.lastSignIn)}</td>
                  <td className={tableCell}>{ago(i.lastRefresh)}</td>
                  <td className={tableCell}>{i.createdAt ? new Date(i.createdAt).toLocaleDateString("en-CA") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminCard>
    </div>
  );
}
