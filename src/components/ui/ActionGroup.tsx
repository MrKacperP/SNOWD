import React from "react";

/** The trigger and its expanded actions share one continuous surface. */
export default function ActionGroup({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  return <details className="action-group" open={open || undefined}>
    <summary>{title}</summary>
    <div className="action-group-content">{children}</div>
  </details>;
}
