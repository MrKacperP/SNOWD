import React from "react";

export default function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return <header className="page-heading">
    <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
    {action && <div className="page-heading-action">{action}</div>}
  </header>;
}
