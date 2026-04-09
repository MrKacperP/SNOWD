"use client";

import React, { useEffect } from "react";
import { ArrowDown, ArrowUp, X } from "lucide-react";

const baseCard =
  "rounded-xl bg-white border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.08)]";

export function AdminCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`${baseCard} ${className}`}>{children}</div>;
}

export function StatusTag({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "green" | "red" | "yellow" | "blue" | "purple" }) {
  const styles: Record<string, string> = {
    neutral: "bg-[#F3F4F6] text-[#6B7280]",
    green: "bg-[#ECFDF3] text-[#16A34A]",
    red: "bg-[#FEF2F2] text-[#DC2626]",
    yellow: "bg-[#FFFBEB] text-[#D97706]",
    blue: "bg-[#EFF6FF] text-[#3B82F6]",
    purple: "bg-[#F5F3FF] text-[#7C3AED]",
  };

  return <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${styles[tone]}`}>{label}</span>;
}

export function SortHeader({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 font-semibold text-left text-[#1A1A2E] hover:text-[#3B82F6]">
      <span>{label}</span>
      {active && (direction === "asc" ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />)}
    </button>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center text-[#6B7280]">
      <svg width="84" height="84" viewBox="0 0 84 84" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <rect x="6" y="12" width="72" height="60" rx="12" fill="#F3F4F6" stroke="#E5E7EB" />
        <rect x="18" y="28" width="48" height="8" rx="4" fill="#E5E7EB" />
        <rect x="18" y="42" width="36" height="8" rx="4" fill="#E5E7EB" />
      </svg>
      <p className="mt-4 text-sm font-semibold text-[#374151]">{title}</p>
      <p className="text-sm mt-1">{subtitle}</p>
    </div>
  );
}

export function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 rounded-lg bg-[#EEF2F7] animate-pulse" />
      ))}
    </div>
  );
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  confirmTone,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmTone: "danger" | "approve";
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/35" />
      <div className="relative w-full max-w-md rounded-xl bg-white border border-[#E5E7EB] shadow-[0_20px_40px_rgba(0,0,0,0.18)] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-[#1A1A2E]">{title}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-[#F3F4F6]">
            <X className="w-4 h-4 text-[#6B7280]" />
          </button>
        </div>
        <p className="text-sm text-[#6B7280] mt-2">{description}</p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 text-sm rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]">Cancel</button>
          <button
            onClick={onConfirm}
            className={`px-3 py-2 text-sm rounded-lg text-white font-semibold ${confirmTone === "danger" ? "bg-[#DC2626] hover:bg-[#B91C1C]" : "bg-[#16A34A] hover:bg-[#15803D]"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SideDrawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <>
      <div
        className={`fixed inset-0 z-[70] bg-black/25 transition-opacity ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      <aside
        className={`fixed top-0 right-0 z-[75] h-full w-[540px] max-w-[92vw] bg-white border-l border-[#E5E7EB] shadow-2xl transition-transform ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between">
            <h3 className="font-semibold text-[#1A1A2E]">{title}</h3>
            <button onClick={onClose} className="p-1 rounded hover:bg-[#F3F4F6]"><X className="w-4 h-4 text-[#6B7280]" /></button>
          </div>
          <div className="p-4 overflow-y-auto flex-1">{children}</div>
        </div>
      </aside>
    </>
  );
}

export const tableCell = "px-3 py-2 text-sm text-[#374151]";
export const tableHead = "px-3 py-2 text-xs uppercase tracking-wide text-[#6B7280] border-b border-[#E5E7EB] text-left";
