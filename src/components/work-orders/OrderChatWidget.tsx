"use client";
import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import ProgressTracker from "@/components/ProgressTracker";
import { Job } from "@/lib/types";
import {
  isOpenOrder,
  orderActionNeeded,
  orderLabel,
  orderNumber,
  propertySizeLabel,
  scheduleText,
  terminalOrderDateText,
} from "@/lib/workOrders";
import OrderActions from "./OrderActions";
import PaymentSummary from "./PaymentSummary";
import styles from "./order-chat.module.css";

const services = (job: Job) =>
  job.serviceTypes?.map((service) => service.replaceAll("-", " ")).join(" · ") || "Snow clearing";

/** A work order shown inside the conversation: live status, progress and actions. */
export function OrderChatWidget({
  job,
  uid,
  returnTo,
  onUpdated,
}: {
  job: Job;
  uid: string;
  returnTo: string;
  onUpdated?: (message: string) => void;
}) {
  const open = isOpenOrder(job);
  const [expanded, setExpanded] = useState(open);
  const operator = uid === job.operatorId;
  const needed = orderActionNeeded(job, uid);
  const showBody = open || expanded;
  const heading = (
    <>
      <span className="min-w-0">
        <small className={styles.reference}>Work order #{orderNumber(job)}</small>
        <strong className={styles.title}>{services(job)}</strong>
        <span className={styles.meta}>{open ? scheduleText(job) : terminalOrderDateText(job)}</span>
      </span>
      <span className={styles.badge} data-status={job.status}>{orderLabel(job)}</span>
    </>
  );
  return (
    <section id={`order-${job.id}`} className={styles.widget} data-open={open} aria-label={`Work order #${orderNumber(job)}`}>
      {open ? (
        <div className={styles.head}>{heading}</div>
      ) : (
        <button type="button" className={styles.head} onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
          {heading}
          <ChevronDown size={16} className={styles.chevron} data-expanded={expanded} aria-hidden="true" />
        </button>
      )}
      {showBody && (
        <div className={styles.body}>
          {job.status !== "cancelled" && (
            <ProgressTracker status={job.status} paymentStatus={job.paymentStatus} paymentMethod={job.paymentMethod} compact />
          )}
          <dl className={styles.facts}>
            <div><dt>Property</dt><dd>{propertySizeLabel(job.propertySize)}</dd></div>
            <div><dt>Address</dt><dd>{[job.address, job.city].filter(Boolean).join(", ") || "To be confirmed"}</dd></div>
          </dl>
          <PaymentSummary job={job} operator={operator} />
          {job.completionPhotoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.photo} src={job.completionPhotoUrl} alt={`Completion photo for order #${orderNumber(job)}`} />
          )}
          {needed && <p className={styles.needed} role="status">{needed}</p>}
          <OrderActions job={job} compact navigateOnUpdate={false} onUpdated={onUpdated} />
          <Link className={styles.detailLink} href={`/dashboard/jobs/${job.id}?returnTo=${encodeURIComponent(returnTo)}`}>
            Full work order <ExternalLink size={13} aria-hidden="true" />
          </Link>
        </div>
      )}
    </section>
  );
}

/** Closes a work order's section of the conversation. */
export function OrderChatEnd({ job }: { job: Job }) {
  return (
    <div className={styles.end} data-status={job.status} role="separator" aria-label={`End of work order #${orderNumber(job)}`}>
      <span>Order #{orderNumber(job)} · {terminalOrderDateText(job) || orderLabel(job)}</span>
    </div>
  );
}

/** Open work orders pinned above the conversation; tapping one jumps to its card. */
export function OrderChatPinned({ jobs, uid }: { jobs: Job[]; uid: string }) {
  if (!jobs.length) return null;
  return (
    <nav className={styles.pinned} aria-label="Open work orders">
      {jobs.map((job) => {
        const needed = orderActionNeeded(job, uid);
        return (
          <a
            key={job.id}
            href={`#order-${job.id}`}
            className={styles.pin}
            data-attention={!!needed}
            onClick={(event) => {
              event.preventDefault();
              document.getElementById(`order-${job.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            <span className="min-w-0">
              <small>Order #{orderNumber(job)}</small>
              <strong>{needed || orderLabel(job)}</strong>
            </span>
            <span className={styles.badge} data-status={job.status}>{orderLabel(job)}</span>
          </a>
        );
      })}
    </nav>
  );
}
