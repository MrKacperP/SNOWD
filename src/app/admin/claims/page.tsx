"use client";

import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Claim, UserProfile } from "@/lib/types";
import { Shield, Search, Eye, X, Check, MessageSquare, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

export default function AdminClaimsPage() {
  const [claims, setClaims] = useState<(Claim & { reporterName?: string; reportedName?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedClaim, setSelectedClaim] = useState<Claim & { reporterName?: string; reportedName?: string } | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [newStatus, setNewStatus] = useState<Claim["status"]>("open");

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    try {
      const snap = await getDocs(collection(db, "claims"));
      const claimList = snap.docs.map(d => ({ id: d.id, ...d.data() } as Claim));

      const userCache: Record<string, string> = {};
      const resolveUser = async (uid: string) => {
        if (!uid) return "Unknown";
        if (userCache[uid]) return userCache[uid];
        try {
          const userDoc = await getDoc(doc(db, "users", uid));
          const name = userDoc.exists() ? (userDoc.data() as UserProfile).displayName || uid : uid;
          userCache[uid] = name;
          return name;
        } catch { return uid; }
      };

      const enriched = await Promise.all(claimList.map(async claim => ({
        ...claim,
        reporterName: await resolveUser(claim.claimantId),
        reportedName: await resolveUser(claim.againstId),
      })));

      enriched.sort((a, b) => {
        const toMs = (t: unknown) => typeof t === "object" && t !== null && "seconds" in t ? (t as { seconds: number }).seconds * 1000 : 0;
        return toMs(b.createdAt) - toMs(a.createdAt);
      });

      setClaims(enriched);
    } catch (error) {
      console.error("Error fetching claims:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ts: unknown) => {
    try {
      if (typeof ts === "object" && ts !== null && "seconds" in ts)
        return format(new Date((ts as { seconds: number }).seconds * 1000), "MMM d, yyyy h:mm a");
    } catch {}
    return "—";
  };

  const handleUpdateClaim = async () => {
    if (!selectedClaim) return;
    try {
      await updateDoc(doc(db, "claims", selectedClaim.id), {
        status: newStatus,
        adminNotes,
        resolvedAt: newStatus === "resolved" || newStatus === "dismissed" ? new Date() : null,
      });
      setSelectedClaim(null);
      fetchClaims();
    } catch (error) {
      console.error("Error updating claim:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this claim permanently?")) return;
    try {
      await deleteDoc(doc(db, "claims", id));
      setClaims(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error("Error deleting claim:", error);
    }
  };

  const statusColors: Record<string, string> = {
    open: "bg-red-100 text-red-700",
    "under-review": "bg-yellow-100 text-yellow-700",
    resolved: "bg-green-100 text-green-700",
    dismissed: "bg-gray-100 text-gray-600",
  };

  const typeIcons: Record<string, React.ReactNode> = {
    "property-damage": <AlertTriangle className="w-4 h-4" />,
    "no-show": <X className="w-4 h-4" />,
    "bad-service": <Shield className="w-4 h-4" />,
    "payment-dispute": <MessageSquare className="w-4 h-4" />,
    other: <Shield className="w-4 h-4" />,
  };

  const filtered = claims.filter(c => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return c.reporterName?.toLowerCase().includes(term) || c.reportedName?.toLowerCase().includes(term) || c.description?.toLowerCase().includes(term);
    }
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-[#246EB9]" />
        <h1 className="text-2xl font-bold">Claims & Disputes</h1>
        <span className="text-sm text-gray-400">({claims.length} total)</span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["open", "under-review", "resolved", "dismissed"] as const).map(status => (
          <div key={status} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold">{claims.filter(c => c.status === status).length}</p>
            <p className="text-xs text-gray-500 capitalize">{status}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search claims..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#246EB9]/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="under-review">In Review</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading claims...</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(claim => (
            <div key={claim.id} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-red-500 shrink-0">
                  {typeIcons[claim.type] || <Shield className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold capitalize">{claim.type.replace("-", " ")}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[claim.status]}`}>{claim.status}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{claim.description}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Filed by <span className="font-medium text-gray-600">{claim.reporterName}</span> against{" "}
                    <span className="font-medium text-gray-600">{claim.reportedName}</span>
                  </p>
                  {claim.adminNotes && <p className="text-xs text-[#246EB9] mt-1">Admin notes: {claim.adminNotes}</p>}
                  <p className="text-xs text-gray-400 mt-1">{formatTime(claim.createdAt)}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => { setSelectedClaim(claim); setAdminNotes(claim.adminNotes || ""); setNewStatus(claim.status); }}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#246EB9] transition"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(claim.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-red-500 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-center py-12 text-gray-400">No claims found.</div>}
        </div>
      )}

      {/* Review Modal */}
      {selectedClaim && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedClaim(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg">Review Claim</h3>
              <button onClick={() => setSelectedClaim(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">Type:</span> <span className="font-medium capitalize">{selectedClaim.type.replace("-", " ")}</span></p>
              <p><span className="text-gray-500">Reporter:</span> {selectedClaim.reporterName}</p>
              <p><span className="text-gray-500">Reported:</span> {selectedClaim.reportedName}</p>
              <p><span className="text-gray-500">Description:</span> {selectedClaim.description}</p>
              {selectedClaim.photoUrls && selectedClaim.photoUrls.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {selectedClaim.photoUrls.map((url, i) => (
                    <img key={i} src={url} alt={`Evidence ${i + 1}`} className="w-20 h-20 object-cover rounded-lg" />
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Status</label>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value as Claim["status"])} className="w-full px-3 py-2 border rounded-lg text-sm mt-1">
                <option value="open">Open</option>
                <option value="under-review">In Review</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Admin Notes</label>
              <textarea
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
                rows={3}
                placeholder="Add notes about this claim..."
              />
            </div>
            <button
              onClick={handleUpdateClaim}
              className="w-full py-2.5 bg-[#246EB9] text-white rounded-xl text-sm font-medium hover:bg-[#3651DE] transition"
            >
              Update Claim
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
