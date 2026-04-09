"use client";

import React, { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { AdminCard, ConfirmModal, EmptyState, StatusTag, tableCell, tableHead } from "@/components/admin/AdminUI";
import { useAdminData } from "@/components/admin/AdminProvider";

type RejectionReasonCategory = "document-quality" | "name-mismatch" | "expired-id" | "unsupported-document" | "other";

export default function AdminVerificationsPage() {
  const { verifications, reviewVerification } = useAdminData();
  const [tab, setTab] = useState<"Pending" | "Reviewed">("Pending");
  const [approveTargetId, setApproveTargetId] = useState<string | null>(null);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectCategory, setRejectCategory] = useState<RejectionReasonCategory>("document-quality");
  const [rejectNote, setRejectNote] = useState("");
  const [rejectError, setRejectError] = useState("");

  const pending = useMemo(() => verifications.filter((v) => v.status === "Pending"), [verifications]);
  const reviewed = useMemo(() => verifications.filter((v) => v.status !== "Pending"), [verifications]);

  return (
    <div className="space-y-4">
      <AdminCard className="p-2 inline-flex gap-1">
        <button
          onClick={() => setTab("Pending")}
          className={`px-3 py-2 rounded-lg text-sm font-medium ${tab === "Pending" ? "bg-[#EFF6FF] text-[#3B82F6]" : "text-[#6B7280]"}`}
        >
          Pending ({pending.length})
        </button>
        <button
          onClick={() => setTab("Reviewed")}
          className={`px-3 py-2 rounded-lg text-sm font-medium ${tab === "Reviewed" ? "bg-[#EFF6FF] text-[#3B82F6]" : "text-[#6B7280]"}`}
        >
          Reviewed ({reviewed.length})
        </button>
      </AdminCard>

      {tab === "Pending" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {pending.map((item) => (
            <AdminCard key={item.id} className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#DBEAFE] text-[#3B82F6] font-bold text-xs flex items-center justify-center">{item.userAvatar}</div>
                <div>
                  <p className="font-semibold text-[#1A1A2E]">{item.userName}</p>
                  <p className="text-xs text-[#6B7280]">{item.type} verification</p>
                </div>
              </div>
              <div className="text-sm text-[#374151]">
                <p>Type: {item.type}</p>
                <p>Submission date: {item.submissionDate}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setApproveTargetId(item.id)}
                  className="flex-1 h-9 rounded-lg bg-[#16A34A] text-white text-sm font-semibold inline-flex items-center justify-center gap-1"
                >
                  <Check className="w-4 h-4" /> Approve
                </button>
                <button
                  onClick={() => {
                    setRejectTargetId(item.id);
                    setRejectCategory("document-quality");
                    setRejectNote("");
                    setRejectError("");
                  }}
                  className="flex-1 h-9 rounded-lg bg-[#DC2626] text-white text-sm font-semibold inline-flex items-center justify-center gap-1"
                >
                  <X className="w-4 h-4" /> Reject
                </button>
              </div>
              {item.idPhotoUrl && (
                <a
                  href={item.idPhotoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex text-xs text-[#2563EB] hover:text-[#1D4ED8]"
                >
                  Open ID evidence
                </a>
              )}
            </AdminCard>
          ))}
          {pending.length === 0 && <EmptyState title="No pending verifications" subtitle="New submissions will appear here in real time." />}
        </div>
      ) : (
        <AdminCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr>
                  <th className={tableHead}>User</th>
                  <th className={tableHead}>Type</th>
                  <th className={tableHead}>Decision</th>
                  <th className={tableHead}>Reviewed By</th>
                  <th className={tableHead}>Date</th>
                </tr>
              </thead>
              <tbody>
                {reviewed.map((item) => (
                  <tr key={item.id} className="border-b border-[#E5E7EB]">
                    <td className={tableCell}>{item.userName}</td>
                    <td className={tableCell}>{item.type}</td>
                    <td className={tableCell}>
                      <StatusTag label={item.status} tone={item.status === "Approved" ? "green" : "red"} />
                      {item.status === "Rejected" && item.rejectionReasonNote && (
                        <p className="mt-1 text-xs text-[#B91C1C] max-w-[280px]">{item.rejectionReasonNote}</p>
                      )}
                    </td>
                    <td className={tableCell}>{item.reviewedBy || "-"}</td>
                    <td className={tableCell}>{item.reviewedDate || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {reviewed.length === 0 && <EmptyState title="No reviewed decisions" subtitle="Approved and rejected verifications appear here." />}
        </AdminCard>
      )}

      <ConfirmModal
        open={!!approveTargetId}
        title="Approve verification"
        description="This will approve the submitted verification and make the operator publicly discoverable if all other profile gates are met."
        confirmLabel="Approve"
        confirmTone="approve"
        onConfirm={() => {
          if (!approveTargetId) return;
          reviewVerification(approveTargetId, "Approved", "Admin", {
            reviewedByUid: "admin",
            where: "/admin/verifications",
          });
          setApproveTargetId(null);
        }}
        onClose={() => setApproveTargetId(null)}
      />

      {rejectTargetId && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-4" onClick={() => setRejectTargetId(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-lg rounded-xl bg-white border border-[#E5E7EB] shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[#1A1A2E]">Reject verification</h3>
            <p className="text-sm text-[#6B7280] mt-1">Provide structured reason and guidance for resubmission.</p>

            <div className="mt-4">
              <label className="text-sm font-medium text-[#1A1A2E]">Reason category</label>
              <select
                value={rejectCategory}
                onChange={(e) => setRejectCategory(e.target.value as RejectionReasonCategory)}
                className="mt-1 w-full h-10 rounded-lg border border-[#E5E7EB] px-3 text-sm"
              >
                <option value="document-quality">Document quality issue</option>
                <option value="name-mismatch">Name mismatch</option>
                <option value="expired-id">Expired ID</option>
                <option value="unsupported-document">Unsupported document</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="mt-3">
              <label className="text-sm font-medium text-[#1A1A2E]">Admin note</label>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Explain exactly what to fix for the next submission."
                className="mt-1 w-full min-h-[110px] rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm"
              />
            </div>

            {rejectError && <p className="mt-2 text-sm text-[#DC2626]">{rejectError}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setRejectTargetId(null)} className="h-9 px-3 rounded-lg border border-[#E5E7EB] text-sm">Cancel</button>
              <button
                onClick={() => {
                  const note = rejectNote.trim();
                  if (!note) {
                    setRejectError("Admin note is required for rejected verifications.");
                    return;
                  }
                  reviewVerification(rejectTargetId, "Rejected", "Admin", {
                    reasonCategory: rejectCategory,
                    reasonNote: note,
                    reviewedByUid: "admin",
                    where: "/admin/verifications",
                  });
                  setRejectTargetId(null);
                }}
                className="h-9 px-3 rounded-lg bg-[#DC2626] text-white text-sm font-semibold"
              >
                Reject verification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
