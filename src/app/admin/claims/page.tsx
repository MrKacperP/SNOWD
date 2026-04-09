"use client";

import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { AdminCard, ConfirmModal, EmptyState, StatusTag } from "@/components/admin/AdminUI";
import { useAdminData } from "@/components/admin/AdminProvider";

export default function AdminClaimsPage() {
  const { claims, resolveClaim } = useAdminData();
  const [tab, setTab] = useState<"Open Claims" | "Resolved Claims">("Open Claims");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ id: string; action: "Approve Claim" | "Reject Claim" | "Request More Info" } | null>(null);

  const rows = useMemo(() => {
    if (tab === "Open Claims") return claims.filter((c) => c.status === "Open");
    return claims.filter((c) => c.status === "Resolved");
  }, [claims, tab]);

  return (
    <div className="space-y-4">
      <AdminCard className="p-2 inline-flex gap-1">
        <button onClick={() => setTab("Open Claims")} className={`px-3 py-2 rounded-lg text-sm font-medium ${tab === "Open Claims" ? "bg-[#EFF6FF] text-[#3B82F6]" : "text-[#6B7280]"}`}>Open Claims</button>
        <button onClick={() => setTab("Resolved Claims")} className={`px-3 py-2 rounded-lg text-sm font-medium ${tab === "Resolved Claims" ? "bg-[#EFF6FF] text-[#3B82F6]" : "text-[#6B7280]"}`}>Resolved Claims</button>
      </AdminCard>

      <div className="space-y-3">
        {rows.map((claim) => (
          <AdminCard key={claim.id} className="p-4">
            <button onClick={() => setExpandedId((prev) => (prev === claim.id ? null : claim.id))} className="w-full text-left flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#DBEAFE] text-[#3B82F6] text-xs font-semibold flex items-center justify-center shrink-0">{claim.claimantAvatar}</div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[#1A1A2E]">{claim.claimantName}</p>
                <p className="text-sm text-[#6B7280]">{claim.claimType} • ${claim.amountDisputed.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusTag label={claim.status} tone={claim.status === "Open" ? "red" : "green"} />
                {expandedId === claim.id ? <ChevronUp className="w-4 h-4 text-[#6B7280]" /> : <ChevronDown className="w-4 h-4 text-[#6B7280]" />}
              </div>
            </button>

            {expandedId === claim.id && (
              <div className="mt-3 pt-3 border-t border-[#E5E7EB] space-y-3">
                <div>
                  <p className="text-xs text-[#6B7280]">Description</p>
                  <p className="text-sm text-[#374151] mt-1">{claim.description}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280]">Evidence</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {claim.evidence.map((ev) => (
                      <div key={ev} className="w-24 h-16 rounded-lg border border-[#E5E7EB] bg-[#F3F4F6] text-xs text-[#6B7280] flex items-center justify-center">{ev}</div>
                    ))}
                  </div>
                </div>
                {claim.status === "Open" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button onClick={() => setPendingAction({ id: claim.id, action: "Approve Claim" })} className="h-9 rounded-lg bg-[#16A34A] text-white text-sm font-semibold">Approve Claim</button>
                    <button onClick={() => setPendingAction({ id: claim.id, action: "Reject Claim" })} className="h-9 rounded-lg bg-[#DC2626] text-white text-sm font-semibold">Reject Claim</button>
                    <button onClick={() => setPendingAction({ id: claim.id, action: "Request More Info" })} className="h-9 rounded-lg border border-[#E5E7EB] text-sm font-semibold text-[#374151]">Request More Info</button>
                  </div>
                )}
              </div>
            )}
          </AdminCard>
        ))}
      </div>

      {rows.length === 0 && <EmptyState title="No claims found" subtitle="No claims in this section right now." />}

      <ConfirmModal
        open={!!pendingAction}
        title={pendingAction?.action || "Confirm action"}
        description="This action will update the claim workflow and notify relevant users."
        confirmLabel="Confirm"
        confirmTone={pendingAction?.action === "Approve Claim" ? "approve" : "danger"}
        onConfirm={() => {
          if (!pendingAction) return;
          resolveClaim(pendingAction.id, pendingAction.action);
          setPendingAction(null);
        }}
        onClose={() => setPendingAction(null)}
      />
    </div>
  );
}
