"use client";

import React from "react";
import { AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-[var(--ink)]/35 backdrop-blur-sm" onClick={onCancel} />
          <motion.div
            className="relative max-h-[calc(100dvh-2rem)] overflow-y-auto w-full max-w-sm bg-[var(--bg-card-solid)] rounded-3xl shadow-[var(--surface-shadow-strong)] border border-[var(--border-color)]"
            initial={{ opacity: 0, scale: 0.98, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >

            {/* Close button */}
            <button
              onClick={onCancel}
              aria-label="Close dialog"
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition z-10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-6 pt-8">
              {/* Warning icon */}
              <motion.div
                className="w-14 h-14 bg-red-50 dark:bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4"
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", delay: 0.1, bounce: 0.4 }}
              >
                <motion.div
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </motion.div>
              </motion.div>

              <h2 className="text-xl font-semibold text-[var(--text-primary)] text-center">
                {title}
              </h2>
              <p className="text-sm text-[var(--text-secondary)] text-center mt-2 leading-relaxed">
                {message}
              </p>

              {/* Info box */}
              <motion.div
                className="mt-4 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <p className="text-xs text-amber-700 dark:text-amber-300 text-center font-medium">
                  ⚠️ Frequent cancellations may affect your account standing
                </p>
              </motion.div>

              {/* Buttons */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={onCancel}
                  className="flex-1 py-3 bg-[var(--bg-secondary)] hover:bg-[var(--accent-soft)] text-[var(--text-primary)] rounded-xl font-semibold text-sm transition-all duration-200"
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={loading}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-[var(--surface-shadow-strong)] shadow-red-500/20"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    confirmLabel
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
