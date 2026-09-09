"use client";

import { motion } from 'framer-motion';
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';

interface NotificationProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const appearances = {
  success: { icon: CheckCircle2, color: 'text-[var(--success)]' },
  error: { icon: CircleAlert, color: 'text-[var(--danger)]' },
  info: { icon: Info, color: 'text-[var(--accent)]' },
};

export default function Notification({ message, type, onClose }: NotificationProps) {
  const { icon: Icon, color } = appearances[type];
  return (
    <motion.div
      role={type === 'error' ? 'alert' : 'status'}
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.18 }}
      className="fixed top-5 right-4 z-[10000] flex w-[calc(100%-2rem)] max-w-sm items-start gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card-solid)] p-4 text-[var(--text-primary)] shadow-[var(--surface-shadow-strong)]"
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${color}`} aria-hidden="true" />
      <p className="flex-1 text-sm leading-relaxed">{message}</p>
      <button type="button" onClick={onClose} aria-label="Dismiss notification" className="-m-2 ml-0 rounded-lg p-3 text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"><X className="h-4 w-4" /></button>
    </motion.div>
  );
}
