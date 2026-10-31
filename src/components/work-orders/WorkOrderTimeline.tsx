import type { Job, JobStatus } from "@/lib/types";
import styles from "./timeline.module.css";

const steps: { status: JobStatus; label: string }[] = [
  { status: "pending", label: "Requested" },
  { status: "accepted", label: "Confirmed" },
  { status: "en-route", label: "On the way" },
  { status: "in-progress", label: "Clearing" },
  { status: "completed", label: "Done" },
];

/** Colour-coded progress across the life of a work order; cancellations strike through it. */
export default function WorkOrderTimeline({ job }: { job: Job }) {
  const cancelled = job.status === "cancelled";
  const current = cancelled ? -1 : steps.findIndex(step => step.status === job.status);
  const label = cancelled ? job.declinedBy ? "Declined" : "Cancelled" : steps[current]?.label;
  return <div className={styles.timeline} data-cancelled={cancelled || undefined} role="img" aria-label={cancelled ? `Work order ${label?.toLowerCase()}` : `Progress: step ${current + 1} of ${steps.length}, ${label}`}>
    <ol className={styles.steps} aria-hidden="true">
      {steps.map((step, index) => <li key={step.status} data-step={step.status} data-state={index < current ? "done" : index === current ? "current" : "todo"}>
        <span className={styles.bar} />
        <span className={styles.label}>{step.label}</span>
      </li>)}
    </ol>
    {!cancelled && <span className={styles.caption} data-step={job.status} aria-hidden="true">{label}</span>}
    {cancelled && <div className={styles.cancel} aria-hidden="true"><span className={styles.strike} /><span className={styles.stamp}>{label}</span></div>}
  </div>;
}
