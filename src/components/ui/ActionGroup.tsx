import React from "react";

/** Actions remain visible so users never have to discover a collapsed control. */
export default function ActionGroup({ title, children }: { title: string; children: React.ReactNode; open?: boolean }) {
  return <section className="action-group">
    <h2>{title}</h2>
    <div className="action-group-content">{children}</div>
  </section>;
}
