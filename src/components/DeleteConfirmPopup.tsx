"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import Modal from "@/components/ui/Modal";

interface DeleteConfirmPopupProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
  itemName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
}

export default function DeleteConfirmPopup({
  isOpen,
  onConfirm,
  onCancel,
  title = "Delete this item?",
  message = "This action is permanent and cannot be undone.",
  itemName,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  loading = false,
}: DeleteConfirmPopupProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} subtitle={message} icon={<Trash2 className="h-6 w-6" />} variant="danger" size="sm">
      {itemName && <p className="mb-5 break-words rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-3 text-center text-sm font-medium">{itemName}</p>}
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
