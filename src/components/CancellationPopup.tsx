"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import Modal from "@/components/ui/Modal";

interface CancellationPopupProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
}

export default function CancellationPopup({
  isOpen,
  onConfirm,
  onCancel,
  title = "Cancel this job?",
  message = "This action cannot be undone. The operator will be notified and any held payment will be refunded.",
  confirmLabel = "Yes, Cancel",
  cancelLabel = "Keep It",
  loading = false,
}: CancellationPopupProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} subtitle={message} icon={<AlertTriangle className="h-6 w-6" />} variant="danger" size="sm">

      <div className="flex gap-3">
        <button type="button" onClick={onCancel} className="min-h-11 flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-solid)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-primary)]">
          {cancelLabel}
        </button>
        <button type="button" onClick={onConfirm} disabled={loading} aria-busy={loading} className="min-h-11 flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50">
          {loading ? "Please wait…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
