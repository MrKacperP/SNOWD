"use client";

import { motion, useReducedMotion } from 'framer-motion';
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
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      role={type === 'error' ? 'alert' : 'status'}
      aria-atomic="true"
      data-type={type}
      initial={reduceMotion ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="app-toast fixed z-[10000] flex items-start gap-3 text-[var(--text-primary)]"
    >
      <span className={`app-toast-icon ${color}`}><Icon className="h-5 w-5" aria-hidden="true" /></span>
      <p className="min-w-0 flex-1 break-words text-sm leading-relaxed">{message}</p>
      <button type="button" onClick={onClose} aria-label="Dismiss notification" className="-mr-1 -mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"><X className="h-4 w-4" /></button>
    </motion.div>
  );
}
