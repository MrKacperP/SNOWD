"use client";

import React, { useMemo, useState } from "react";
import { Check, Eye, RotateCcw, X } from "lucide-react";
import { AdminCard, ConfirmModal, EmptyState, SideDrawer, StatusTag, tableCell, tableHead } from "@/components/admin/AdminUI";
import { useAdminData } from "@/components/admin/AdminProvider";

type RejectionReasonCategory = "document-quality" | "name-mismatch" | "expired-id" | "unsupported-document" | "other";

export default function AdminVerificationsPage() {
  const { verifications, reviewVerification, reopenVerification } = useAdminData();
  const [tab, setTab] = useState<"Pending" | "Reviewed">("Pending");
  const [approveTargetId, setApproveTargetId] = useState<string | null>(null);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectCategory, setRejectCategory] = useState<RejectionReasonCategory>("document-quality");
  const [rejectNote, setRejectNote] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [reopenTargetId, setReopenTargetId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const pending = useMemo(() => verifications.filter((v) => v.status === "Pending"), [verifications]);
  const reviewed = useMemo(() => verifications.filter((v) => v.status !== "Pending"), [verifications]);
  const selected = verifications.find((item) => item.id === selectedId) || null;

  return (
    <div className="space-y-4">
      <AdminCard className="p-2 inline-flex gap-1">
        <button
          onClick={() => setTab("Pending")}
          className={`px-3 py-2 rounded-lg text-sm font-medium ${tab === "Pending" ? "bg-[var(--bg-secondary)] text-[var(--accent)]" : "text-[var(--text-muted)]"}`}
        >
          Pending ({pending.length})
        </button>
        <button
          onClick={() => setTab("Reviewed")}
          className={`px-3 py-2 rounded-lg text-sm font-medium ${tab === "Reviewed" ? "bg-[var(--bg-secondary)] text-[var(--accent)]" : "text-[var(--text-muted)]"}`}
        >
          Reviewed ({reviewed.length})
        </button>
      </AdminCard>

      {tab === "Pending" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {pending.map((item) => (
            <AdminCard key={item.id} className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] text-[var(--accent)] font-bold text-xs flex items-center justify-center">{item.userAvatar}</div>
                <div>
                  <p className="font-semibold text-[var(--ink)]">{item.userName}</p>
                  <p className="text-xs text-[var(--text-muted)]">{item.type} verification</p>
                </div>
              </div>
              <div className="text-sm text-[var(--text-secondary)]">
                <p>{item.email || "No email on profile"}</p>
                <p>{[item.address, item.city, item.province, item.postalCode].filter(Boolean).join(", ") || "No address on profile"}</p>
                <p>Submitted {item.submissionDate}</p>
              </div>
              {item.idPhotoUrl && <img src={item.idPhotoUrl} alt={`${item.userName} identity document`} className="h-28 w-full rounded-xl border border-[var(--border)] object-cover" />}
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedId(item.id)} className="h-9 rounded-xl border border-[var(--border)] px-3 text-sm font-semibold inline-flex items-center gap-1"><Eye className="w-4 h-4" /> Details</button>
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
                  className="inline-flex text-xs text-[var(--accent)] hover:text-[var(--accent-dark)]"
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
                  <th className={tableHead}>Action</th>
                </tr>
              </thead>
              <tbody>
                {reviewed.map((item) => (
                  <tr key={item.id} className="border-b border-[var(--border)]">
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
                    <td className={tableCell}>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSelectedId(item.id)} className="h-8 rounded-xl border border-[var(--border)] px-2 text-xs inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> View</button>
                        <button onClick={() => setReopenTargetId(item.id)} className="h-8 rounded-xl border border-[var(--border)] px-2 text-xs inline-flex items-center gap-1"><RotateCcw className="w-3.5 h-3.5" /> Reopen</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {reviewed.length === 0 && <EmptyState title="No reviewed decisions" subtitle="Approved and rejected verifications appear here." />}
        </AdminCard>
      )}

      <SideDrawer open={!!selected} title="Review account" onClose={() => setSelectedId(null)}>
        {selected && <div className="space-y-4">
          <div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--bg-secondary)] text-sm font-bold text-[var(--accent)]">{selected.userAvatar}</div><div><h3 className="font-semibold text-[var(--ink)]">{selected.userName}</h3><p className="text-xs text-[var(--text-muted)]">{selected.role} · {selected.status}</p></div></div>
          <AdminCard className="p-3"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Account information</p><dl className="mt-2 space-y-2 text-sm"><div className="flex justify-between gap-3"><dt className="text-[var(--text-muted)]">Email</dt><dd className="text-right">{selected.email || "-"}</dd></div><div className="flex justify-between gap-3"><dt className="text-[var(--text-muted)]">Phone</dt><dd className="text-right">{selected.phone || "-"}</dd></div><div className="flex justify-between gap-3"><dt className="text-[var(--text-muted)]">Address</dt><dd className="text-right">{[selected.address, selected.city, selected.province, selected.postalCode].filter(Boolean).join(", ") || "-"}</dd></div></dl></AdminCard>
          <div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Submitted identity document</p>{selected.idPhotoUrl ? <a href={selected.idPhotoUrl} target="_blank" rel="noreferrer"><img src={selected.idPhotoUrl} alt={`${selected.userName} identity document`} className="max-h-[360px] w-full rounded-2xl border border-[var(--border)] object-contain bg-[var(--bg-primary)]" /></a> : <EmptyState title="No ID uploaded" subtitle="This account has no identity document attached." />}</div>
          {selected.status !== "Pending" && <button onClick={() => setReopenTargetId(selected.id)} className="h-10 w-full rounded-xl bg-[var(--accent)] text-sm font-semibold text-white inline-flex items-center justify-center gap-2"><RotateCcw className="w-4 h-4" /> Reopen for review</button>}
        </div>}
      </SideDrawer>

      <ConfirmModal open={!!reopenTargetId} title="Reopen verification" description="This returns the account to the pending review queue without deleting the submitted identity document." confirmLabel="Reopen" confirmTone="approve" onConfirm={async () => { if (reopenTargetId) await reopenVerification(reopenTargetId); setReopenTargetId(null); setTab("Pending"); }} onClose={() => setReopenTargetId(null)} />

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
          <div className="relative w-full max-w-lg rounded-xl bg-white border-[3px] border-[var(--border)] shadow-[var(--surface-shadow)] p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[var(--ink)]">Reject verification</h3>
            <p className="text-sm text-[var(--text-muted)] mt-1">Provide structured reason and guidance for resubmission.</p>

            <div className="mt-4">
              <label className="text-sm font-medium text-[var(--ink)]">Reason category</label>
              <select
                value={rejectCategory}
                onChange={(e) => setRejectCategory(e.target.value as RejectionReasonCategory)}
                className="mt-1 w-full h-10 rounded-lg border-[3px] border-[var(--border)] px-3 text-sm"
              >
                <option value="document-quality">Document quality issue</option>
                <option value="name-mismatch">Name mismatch</option>
                <option value="expired-id">Expired ID</option>
                <option value="unsupported-document">Unsupported document</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="mt-3">
              <label className="text-sm font-medium text-[var(--ink)]">Admin note</label>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Explain exactly what to fix for the next submission."
                className="mt-1 w-full min-h-[110px] rounded-lg border-[3px] border-[var(--border)] px-3 py-2 text-sm"
              />
            </div>

            {rejectError && <p className="mt-2 text-sm text-[#DC2626]">{rejectError}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setRejectTargetId(null)} className="h-9 px-3 rounded-lg border-[3px] border-[var(--border)] text-sm">Cancel</button>
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
