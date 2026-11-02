"use client";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Job } from "@/lib/types";
import {
  isOpenOrder,
  orderActionNeeded,
  orderLabel,
  orderNumber,
  terminalOrderDateText,
} from "@/lib/workOrders";
import styles from "./order-chat.module.css";

const services = (job: Job) =>
  job.serviceTypes?.map((service) => service.replaceAll("-", " ")).join(" · ") || "Snow clearing";

const STAGES = ["pending", "accepted", "en-route", "in-progress", "completed"];

/** A compact work order card in the conversation; the whole card opens the work order. */
export function OrderChatWidget({
  job,
  returnTo,
}: {
  job: Job;
  uid?: string;
  returnTo: string;
  onUpdated?: (message: string) => void;
}) {
  const stage = STAGES.indexOf(job.status);
  const cancelled = job.status === "cancelled";
  return (
    <Link
      id={`order-${job.id}`}
      href={`/dashboard/jobs/${job.id}?returnTo=${encodeURIComponent(returnTo)}`}
      className={styles.simple}
      data-open={isOpenOrder(job)}
      aria-label={`Open work order #${orderNumber(job)}, ${orderLabel(job)}`}
    >
      <span className={styles.simpleTop}>
        <span className="min-w-0">
          <small className={styles.reference}>Work order #{orderNumber(job)}</small>
          <strong className={styles.title}>{services(job)}</strong>
          <span className={styles.meta}>{[job.address, job.city].filter(Boolean).join(", ") || "Address to be confirmed"}</span>
        </span>
        <ChevronRight size={18} className={styles.chevron} aria-hidden="true" />
      </span>
      {cancelled ? (
        <span className={styles.cancelled}>{orderLabel(job)}</span>
      ) : (
        <span className={styles.bar} aria-hidden="true">
          {STAGES.map((key, i) => <i key={key} data-on={i <= stage} />)}
        </span>
      )}
    </Link>
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
