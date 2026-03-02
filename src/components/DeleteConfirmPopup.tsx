"use client";

import React from "react";
import { Trash2, X, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onCancel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-sm bg-[var(--bg-card-solid)] rounded-3xl shadow-2xl border border-[var(--border-color)] overflow-hidden"
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
          >
            {/* Red gradient accent */}
            <div className="h-1.5 bg-red-500" />

            {/* Close button */}
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition z-10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-7 pt-8">
              {/* Animated trash icon */}
              <motion.div
                className="w-20 h-20 bg-red-50 dark:bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-red-100/50 dark:shadow-red-500/10"
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", delay: 0.1, bounce: 0.4 }}
              >
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.6, delay: 0.5, ease: "easeInOut" }}
                >
                  <Trash2 className="w-9 h-9 text-red-500" />
                </motion.div>
              </motion.div>

              {/* Title */}
              <h2 className="text-xl font-bold text-[var(--text-primary)] text-center">
                {title}
              </h2>

              {/* Item name highlight */}
              {itemName && (
                <motion.div
                  className="mt-3 px-4 py-2.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-center"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <p className="text-sm font-semibold text-red-700 dark:text-red-300 truncate">
                    {itemName}
                  </p>
                </motion.div>
              )}

              {/* Message */}
              <p className="text-sm text-[var(--text-secondary)] text-center mt-3 leading-relaxed">
                {message}
              </p>

              {/* Warning */}
              <motion.div
                className="mt-4 flex items-center gap-2.5 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                  This action is irreversible. All associated data will be permanently removed.
                </p>
              </motion.div>

              {/* Buttons */}
              <div className="mt-6 flex gap-3">
                <motion.button
                  onClick={onCancel}
                  className="flex-1 py-3.5 bg-[var(--bg-secondary)] hover:bg-[var(--border-color)] text-[var(--text-primary)] rounded-xl font-semibold text-sm transition-all duration-200 active:scale-[0.98]"
                  whileTap={{ scale: 0.98 }}
                >
                  {cancelLabel}
                </motion.button>
                <motion.button
                  onClick={onConfirm}
                  disabled={loading}
                  className="flex-1 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-500/25 active:scale-[0.98]"
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      {confirmLabel}
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
