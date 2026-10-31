/** One unread treatment for the whole app: a count pill, or a dot when the number doesn't matter. */
export function UnreadBadge({ count, label, className = "" }: { count: number; label?: string; className?: string }) {
  if (count <= 0) return null;
  return <span key={count} className={`unread-badge ${className}`} aria-label={label ?? `${count} unread`}>{count > 9 ? "9+" : count}</span>;
}

export function UnreadDot({ className = "", label }: { className?: string; label?: string }) {
  return <span className={`unread-dot ${className}`} aria-hidden={label ? undefined : true} aria-label={label} role={label ? "img" : undefined} />;
}

/** Small "New" chip used on rows that have unseen activity. */
export function NewChip({ children = "New" }: { children?: React.ReactNode }) {
  return <span className="new-chip"><UnreadDot />{children}</span>;
}
