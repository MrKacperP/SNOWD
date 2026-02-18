"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
    iconBg: "bg-[#4361EE]/10",
    iconColor: "text-[#4361EE]",
    accentGlow: "rgba(67, 97, 238, 0.15)",
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
    iconBg: "bg-blue-50 dark:bg-blue-500/10",
    iconColor: "text-blue-500",
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

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
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
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => {
            if (e.target === overlayRef.current) onClose();
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            className={`relative w-full ${sizeStyles[size]} bg-[var(--bg-card-solid)] rounded-2xl shadow-2xl border border-[var(--border-color)] overflow-hidden`}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top accent line */}
            <div
              className="absolute top-0 left-0 right-0 h-1"
              style={{
                background: variant === "danger"
                  ? "linear-gradient(90deg, #EF4444, #F87171)"
                  : variant === "success"
                  ? "linear-gradient(90deg, #10B981, #34D399)"
                  : "linear-gradient(90deg, #4361EE, #6B83F2)",
              }}
            />

            {/* Close button */}
            {showClose && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-all z-10"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            <div className="p-6 pt-8">
              {/* Icon */}
              {icon && (
                <div className={`w-14 h-14 ${style.iconBg} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <div className={style.iconColor}>{icon}</div>
                </div>
              )}

              {/* Title */}
              {title && (
                <h2 className="text-xl font-bold text-[var(--text-primary)] text-center">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-sm text-[var(--text-secondary)] text-center mt-1.5">
                  {subtitle}
                </p>
              )}

              {/* Content */}
              <div className="mt-5">{children}</div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
