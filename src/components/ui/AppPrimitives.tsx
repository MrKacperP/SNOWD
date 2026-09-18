import Link from "next/link";
import type { ReactNode } from "react";
import { Check, ChevronRight, Snowflake } from "lucide-react";

export function AppPage({ eyebrow, title, description, action, children, className = "" }: {
  eyebrow?: string; title: string; description?: string; action?: ReactNode; children: ReactNode; className?: string;
}) {
  return <div className={`app-page ${className}`}>
    <header className="app-page-header">
      <div>{eyebrow && <p className="app-eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p>{description}</p>}</div>
      {action && <div className="app-page-action">{action}</div>}
    </header>
    {children}
  </div>;
}

export function ResultState({ title, description, children, actionHref, actionLabel, image }: {
  title: string; description?: string; children?: ReactNode; actionHref?: string; actionLabel?: string; image?: ReactNode;
}) {
  return <section className="result-state" aria-live="polite">
    <span className="result-icon"><Check aria-hidden="true" /></span>
    <h1>{title}</h1>
    {description && <p>{description}</p>}
    {image}
    {children}
    {actionHref && actionLabel && <Link className="btn-primary result-action" href={actionHref}>{actionLabel}<ChevronRight size={18} /></Link>}
  </section>;
}

export function EmptyState({ title, description, actionHref, actionLabel }: {
  title: string; description: string; actionHref?: string; actionLabel?: string;
}) {
  return <section className="empty-state"><span className="empty-mark" aria-hidden="true"><Snowflake size={22} strokeWidth={1.6} /></span><h2>{title}</h2><p>{description}</p>{actionHref && actionLabel && <Link className="btn-primary" href={actionHref}>{actionLabel}</Link>}</section>;
}

