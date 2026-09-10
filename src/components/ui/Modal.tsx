"use client";

import { useDialogFocus } from "@/hooks/useDialogFocus";
import { AnimatePresence,motion } from "framer-motion";
import { X } from "lucide-react";
import React,{ useEffect,useId,useRef } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  showClose?: boolean;
  variant?: "default" | "danger" | "success" | "info";
}

const variantStyles = {
  default: {
    iconBg: "bg-[var(--accent-soft)]",
    iconColor: "text-[var(--accent)]",
    accentGlow: "rgba(36, 110, 185, 0.15)",
  },
  danger: {
    iconBg: "bg-red-50 dark:bg-red-500/10",
    iconColor: "text-red-500",
    accentGlow: "rgba(239, 68, 68, 0.15)",
  },
  success: {
    iconBg: "bg-emerald-50 dark:bg-emerald-500/10",
    iconColor: "text-emerald-500",
    accentGlow: "rgba(16, 185, 129, 0.15)",
  },
  info: {
    iconBg: "bg-[var(--accent-soft)]",
    iconColor: "text-[var(--accent)]",
    accentGlow: "rgba(59, 130, 246, 0.15)",
  },
};

const sizeStyles = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  size = "md",
  showClose = true,
  variant = "default",
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const style = variantStyles[variant];

  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const subtitleId = useId();
  useDialogFocus(isOpen, dialogRef);

  useEffect(() => {
    if (!isOpen || !window.visualViewport) return;
    const viewport = window.visualViewport;
    const update = () => {
      const overlay = overlayRef.current;
      if (!overlay) return;
      overlay.style.top = `${viewport.offsetTop}px`;
      overlay.style.left = `${viewport.offsetLeft}px`;
      overlay.style.width = `${viewport.width}px`;
      overlay.style.height = `${viewport.height}px`;
      overlay.style.bottom = "auto";
      overlay.style.setProperty("--modal-viewport-height", `${viewport.height}px`);
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={overlayRef}
          className="app-modal-overlay fixed inset-0 z-[9999] flex items-end justify-center p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => {
            if (e.target === overlayRef.current) onClose();
          }}
        >
          {/* Backdrop */}
          <div className="pointer-events-none absolute inset-0 bg-[var(--ink)]/35 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            ref={dialogRef}
            style={{ maxHeight: "calc(var(--modal-viewport-height, 100dvh) - 2rem)" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-label={title ? undefined : "Dialog"}
            aria-describedby={subtitle ? subtitleId : undefined}
            tabIndex={-1}
            className={`app-modal-panel relative max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] overflow-y-auto w-full ${sizeStyles[size]} bg-[var(--bg-card-solid)] rounded-t-3xl sm:rounded-3xl shadow-[var(--surface-shadow-strong)] border border-[var(--border-color)]`}
            initial={{ scale: 0.98, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.98, opacity: 0, y: 12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            {showClose && (
              <button
                onClick={onClose}
                type="button"
                aria-label="Close dialog"
                className="absolute top-4 right-4 p-3 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-all z-10"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            <div className="p-5 pt-8 pb-[max(20px,env(safe-area-inset-bottom))] sm:p-6 sm:pt-8">
              {/* Icon */}
              {icon && (
                <div className={`w-14 h-14 ${style.iconBg} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <div className={style.iconColor}>{icon}</div>
                </div>
              )}

              {/* Title */}
              {title && (
                <h2 id={titleId} className="text-xl font-semibold text-[var(--text-primary)] text-center px-10 break-words">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p id={subtitleId} className="text-sm text-[var(--text-secondary)] text-center mt-2 leading-relaxed break-words">
                  {subtitle}
                </p>
              )}

              {/* Content */}
              <div className={title || subtitle || icon ? "mt-6" : ""}>{children}</div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
