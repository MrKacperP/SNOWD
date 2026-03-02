"use client";

import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc, updateDoc, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Job, UserProfile } from "@/lib/types";
import {
  Briefcase,
  Search,
  Filter,
  RefreshCw,
  MapPin,
  Calendar,
  DollarSign,
  User,
  ArrowRight,
  XCircle,
  CheckCircle,
  Clock,
  Truck,
  Play,
  AlertTriangle,
  ChevronDown,
  MessageSquare,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", color: "text-yellow-700", bg: "bg-yellow-100", icon: <Clock className="w-3.5 h-3.5" /> },
  accepted: { label: "Accepted", color: "text-purple-700", bg: "bg-purple-100", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  "en-route": { label: "En Route", color: "text-blue-700", bg: "bg-blue-100", icon: <Truck className="w-3.5 h-3.5" /> },
  "in-progress": { label: "In Progress", color: "text-green-700", bg: "bg-green-100", icon: <Play className="w-3.5 h-3.5" /> },
  completed: { label: "Completed", color: "text-gray-700", bg: "bg-gray-100", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  cancelled: { label: "Cancelled", color: "text-red-700", bg: "bg-red-100", icon: <XCircle className="w-3.5 h-3.5" /> },
};

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<(Job & { clientName?: string; operatorName?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedJob, setSelectedJob] = useState<(Job & { clientName?: string; operatorName?: string }) | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [operators, setOperators] = useState<UserProfile[]>([]);
  const [reassignModal, setReassignModal] = useState(false);
  const [reassignSearch, setReassignSearch] = useState("");
  const [statusChangeModal, setStatusChangeModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  const toMs = (t: unknown) =>
    typeof t === "object" && t !== null && "seconds" in t
      ? (t as { seconds: number }).seconds * 1000
      : 0;

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const [jobsSnap, usersSnap] = await Promise.all([
        getDocs(collection(db, "jobs")),
        getDocs(collection(db, "users")),
      ]);

      const userMap: Record<string, string> = {};
      const userObjects: UserProfile[] = [];
      usersSnap.docs.forEach(d => {
        const data = d.data() as UserProfile;
        userMap[d.id] = data.displayName || "Unknown";
        if (data.role === "operator") userObjects.push({ ...data, uid: d.id });
      });
      setOperators(userObjects);

      const jobList = jobsSnap.docs
        .map(d => ({
          id: d.id,
          ...d.data(),
          clientName: userMap[(d.data() as Job).clientId] || "Unknown",
          operatorName: userMap[(d.data() as Job).operatorId] || "Unassigned",
        } as Job & { clientName?: string; operatorName?: string }))
        .sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));

      setJobs(jobList);
    } catch (e) {
      console.error("Error fetching jobs:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelJob = async (jobId: string) => {
    if (!confirm("Cancel this job? This will update the job status to cancelled.")) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "jobs", jobId), {
        status: "cancelled",
        cancelledAt: new Date(),
        updatedAt: new Date(),
      });
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: "cancelled" as const } : j));
      if (selectedJob?.id === jobId) setSelectedJob(prev => prev ? { ...prev, status: "cancelled" as const } : null);
    } catch (e) {
      console.error("Error cancelling job:", e);
      alert("Failed to cancel job");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReassign = async (jobId: string, newOperatorId: string, newOperatorName: string) => {
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "jobs", jobId), {
        operatorId: newOperatorId,
        updatedAt: new Date(),
      });
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, operatorId: newOperatorId, operatorName: newOperatorName } : j));
      if (selectedJob?.id === jobId) setSelectedJob(prev => prev ? { ...prev, operatorId: newOperatorId, operatorName: newOperatorName } : null);
      setReassignModal(false);
    } catch (e) {
      console.error("Error reassigning job:", e);
      alert("Failed to reassign job");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (jobId: string, status: string) => {
    setActionLoading(true);
    try {
      const update: Record<string, unknown> = { status, updatedAt: new Date() };
      if (status === "cancelled") update.cancelledAt = new Date();
      if (status === "completed") update.completionTime = new Date();
      await updateDoc(doc(db, "jobs", jobId), update);
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: status as Job["status"] } : j));
      if (selectedJob?.id === jobId) setSelectedJob(prev => prev ? { ...prev, status: status as Job["status"] } : null);
      setStatusChangeModal(false);
    } catch (e) {
      console.error("Error changing status:", e);
      alert("Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = jobs.filter(j => {
    if (statusFilter !== "all" && j.status !== statusFilter) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      j.clientName?.toLowerCase().includes(term) ||
      j.operatorName?.toLowerCase().includes(term) ||
      j.address?.toLowerCase().includes(term) ||
      j.city?.toLowerCase().includes(term) ||
      j.id.toLowerCase().includes(term) ||
      j.serviceTypes?.some(s => s.toLowerCase().includes(term))
    );
  });

  const statusCounts = jobs.reduce((acc, j) => {
    acc[j.status] = (acc[j.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-[#246EB9] animate-spin" />
          <p className="text-sm text-gray-400">Loading jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Briefcase className="w-6 h-6 text-[#246EB9]" />
          <h1 className="text-2xl font-bold">Job Management</h1>
          <span className="text-sm text-gray-400">{jobs.length} total</span>
        </div>
        <button onClick={fetchJobs} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium transition">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(statusFilter === key ? "all" : key)}
            className={`p-3 rounded-xl border transition text-center ${
              statusFilter === key ? "border-[#246EB9] bg-[#246EB9]/5" : "border-gray-100 bg-white hover:border-gray-200"
            }`}
          >
            <div className={`text-xl font-bold ${cfg.color}`}>{statusCounts[key] || 0}</div>
            <div className="text-[10px] text-gray-500 font-medium mt-0.5">{cfg.label}</div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by client, operator, address, city, or job ID..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#246EB9]/20"
        />
      </div>

      {/* Job Detail View */}
      {selectedJob && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <button onClick={() => setSelectedJob(null)} className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
              ← Back to list
            </button>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${STATUS_CONFIG[selectedJob.status]?.bg} ${STATUS_CONFIG[selectedJob.status]?.color}`}>
              {STATUS_CONFIG[selectedJob.status]?.icon}
              {STATUS_CONFIG[selectedJob.status]?.label}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1 font-medium">Client</p>
              <p className="font-semibold text-gray-900">{selectedJob.clientName}</p>
              <Link href={`/admin/users/${selectedJob.clientId}`} className="text-xs text-[#246EB9] hover:underline">View profile →</Link>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1 font-medium">Operator</p>
              <p className="font-semibold text-gray-900">{selectedJob.operatorName}</p>
              <Link href={`/admin/users/${selectedJob.operatorId}`} className="text-xs text-[#246EB9] hover:underline">View profile →</Link>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1 font-medium">Price</p>
              <p className="text-xl font-bold text-green-600">${selectedJob.price}</p>
              <p className="text-xs text-gray-400 capitalize">{selectedJob.paymentMethod} · {selectedJob.paymentStatus}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1 font-medium">Location</p>
              <p className="text-sm font-medium text-gray-900">{selectedJob.address}</p>
              <p className="text-xs text-gray-400">{selectedJob.city}, {selectedJob.province}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1 font-medium">Services</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedJob.serviceTypes?.map(s => (
                  <span key={s} className="px-2 py-0.5 bg-[#246EB9]/10 text-[#246EB9] text-xs rounded-full capitalize">{s.replace("-", " ")}</span>
                ))}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1 font-medium">Scheduled</p>
              <p className="text-sm font-medium text-gray-900">
                {toMs(selectedJob.scheduledDate) ? format(new Date(toMs(selectedJob.scheduledDate)), "MMM d, yyyy") : "—"}
              </p>
              <p className="text-xs text-gray-400">{selectedJob.scheduledTime || "No time set"}</p>
            </div>
          </div>

          {selectedJob.specialInstructions && (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
              <p className="text-xs text-amber-700 font-medium mb-1">Special Instructions</p>
              <p className="text-sm text-amber-900">{selectedJob.specialInstructions}</p>
            </div>
          )}

          {/* Job Actions */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            <button
              onClick={() => { setStatusChangeModal(true); setNewStatus(selectedJob.status); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#246EB9] text-white rounded-xl text-sm font-semibold hover:bg-[#1B5A9A] transition"
            >
              <ArrowRight className="w-4 h-4" /> Change Status
            </button>
            <button
              onClick={() => { setReassignModal(true); setReassignSearch(""); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition"
            >
              <User className="w-4 h-4" /> Reassign Operator
            </button>
            {selectedJob.chatId && (
              <Link
                href={`/dashboard/messages/${selectedJob.chatId}`}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition"
              >
                <MessageSquare className="w-4 h-4" /> View Chat
              </Link>
            )}
            {selectedJob.status !== "cancelled" && selectedJob.status !== "completed" && (
              <button
                onClick={() => handleCancelJob(selectedJob.id)}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50 ml-auto"
              >
                <XCircle className="w-4 h-4" /> Cancel Job
              </button>
            )}
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {statusChangeModal && selectedJob && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setStatusChangeModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900">Change Job Status</h3>
            <div className="space-y-2">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setNewStatus(key)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition text-left ${
                    newStatus === key ? "border-[#246EB9] bg-[#246EB9]/5" : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${cfg.bg} ${cfg.color}`}>{cfg.icon}</span>
                  <span className="text-sm font-medium text-gray-900">{cfg.label}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStatusChangeModal(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleStatusChange(selectedJob.id, newStatus)}
                disabled={newStatus === selectedJob.status || actionLoading}
                className="flex-1 px-4 py-2.5 bg-[#246EB9] text-white rounded-xl text-sm font-semibold hover:bg-[#1B5A9A] transition disabled:opacity-50"
              >
                {actionLoading ? "Updating..." : "Update Status"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reassign Modal */}
      {reassignModal && selectedJob && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setReassignModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900">Reassign Operator</h3>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search operators..."
                value={reassignSearch}
                onChange={e => setReassignSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#246EB9]/20"
              />
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {operators
                .filter(op => !reassignSearch || op.displayName?.toLowerCase().includes(reassignSearch.toLowerCase()) || op.city?.toLowerCase().includes(reassignSearch.toLowerCase()))
                .map(op => (
                  <button
                    key={op.uid}
                    onClick={() => handleReassign(selectedJob.id, op.uid, op.displayName)}
                    disabled={op.uid === selectedJob.operatorId || actionLoading}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition text-left ${
                      op.uid === selectedJob.operatorId ? "border-green-200 bg-green-50 opacity-50" : "border-gray-100 hover:border-[#246EB9]/20 hover:shadow-sm"
                    }`}
                  >
                    <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-sm shrink-0">
                      {op.displayName?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{op.displayName}</p>
                      <p className="text-xs text-gray-400">{op.city || "—"}, {op.province || "—"}</p>
                    </div>
                    {op.uid === selectedJob.operatorId && (
                      <span className="text-xs text-green-600 font-medium">Current</span>
                    )}
                  </button>
                ))}
              {operators.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No operators found</p>}
            </div>
            <button
              onClick={() => setReassignModal(false)}
              className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Jobs List */}
      {!selectedJob && (
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400">No jobs found</p>
            </div>
          ) : (
            filtered.map(job => {
              const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
              return (
                <button
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition text-left"
                >
                  <div className={`w-1.5 h-12 rounded-full shrink-0 ${
                    job.status === "in-progress" ? "bg-green-500" :
                    job.status === "en-route" ? "bg-blue-500" :
                    job.status === "accepted" ? "bg-purple-500" :
                    job.status === "pending" ? "bg-yellow-500" :
                    job.status === "completed" ? "bg-gray-400" :
                    "bg-red-400"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-gray-900 text-sm truncate">{job.clientName} → {job.operatorName}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.bg} ${cfg.color}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {job.serviceTypes?.map(s => s.replace("-", " ")).join(", ")} · {job.city || job.address} · <span className="text-green-600 font-semibold">${job.price}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">{toMs(job.createdAt) ? format(new Date(toMs(job.createdAt)), "MMM d") : "—"}</p>
                    <Eye className="w-4 h-4 text-gray-300 mt-1 ml-auto" />
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
