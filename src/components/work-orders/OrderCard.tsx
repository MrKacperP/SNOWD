"use client";
import { jobDisplayPrice } from "@/lib/marketplacePricing";
import CompanyIdentity from "@/components/CompanyIdentity";
import Link from "next/link";
import { Job, OperatorProfile } from "@/lib/types";
import { isAsap, orderLabel, orderNumber, scheduleText } from "@/lib/workOrders";
import { useAuth } from "@/context/AuthContext";
import styles from "./work-orders.module.css";
import OrderActions from "./OrderActions";
export default function OrderCard({
  job,
  name,
  person,
  detail = false,
  conflict = false,
  onUpdated,
}: {
  job: Job;
  name: string;
  person?: OperatorProfile;
  detail?: boolean;
  conflict?: boolean;
  onUpdated?: (message: string) => void;
}) {
  const { user } = useAuth();
  const operator = user?.uid === job.operatorId;
  return (
    <article className={styles.card}>
      <div className={styles.body}>
        <div className={styles.cardHeader}>
          <div className="min-w-0">
            <p className={styles.reference}>Work order #{orderNumber(job)}</p>
            <h2 className={styles.title}><CompanyIdentity person={person} name={name} /></h2>
            <p className={styles.secondary}>
              {operator ? "Customer" : "Service provider"}
            </p>
          </div>
          <span className={styles.badge} data-status={job.status}>
            {orderLabel(job)}
          </span>
        </div>
        {detail && job.status !== "cancelled" && (
          <ol className={styles.progress} aria-label="Work order progress">
            {["Requested", "Confirmed", "On the way", "Working", "Completed"].map((label, index) => {
              const current = ["pending", "accepted", "en-route", "in-progress", "completed"].indexOf(job.status);
              return <li key={label} data-reached={index <= current} aria-current={index === current ? "step" : undefined}>
                <span aria-hidden="true">{index + 1}</span>{label}
              </li>;
            })}
          </ol>
        )}
        <dl className={styles.facts}>
          <div>
            <dt>{job.status === "pending" ? "Requested visit" : "Visit"}</dt>
            <dd><span className="visit-timing" data-asap={isAsap(job)}>{isAsap(job) ? "ASAP · As soon as possible" : `Scheduled · ${scheduleText(job)}`}</span>{isAsap(job) && !["completed", "cancelled"].includes(job.status) && <p className={styles.secondary}>Arrival time to be confirmed</p>}</dd>
          </div>
          <div>
            <dt>Location & service</dt>
            <dd>
              <strong>{job.address || "Address to be confirmed"}</strong>
              {job.address && <a className="ml-3 inline-flex min-h-11 items-center underline" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}&travelmode=driving&dir_action=navigate`} target="_blank" rel="noreferrer">Google Maps directions ↗</a>}
              <p className="capitalize">{job.propertySize || "medium"} driveway</p>
              <p className={`${styles.secondary} capitalize`}>
                {job.serviceTypes
                  ?.map((s) => s.replaceAll("-", " "))
                  .join(" · ") || "Snow removal"}
              </p>
            </dd>
          </div>
          <div>
            <dt>Payment</dt>
            <dd>
              <strong>${jobDisplayPrice(job, operator).toFixed(2)} CAD</strong>
              <p className={styles.secondary}>
                {job.paymentMethod === "cash" ? "Cash" : "Card"} ·{" "}
                {job.paymentStatus === "held"
                  ? "Authorized"
                  : job.paymentStatus === "paid"
                    ? "Paid"
                    : job.paymentStatus === "refunded"
                      ? "Refunded / released"
                      : "Pending"}
              </p>
            </dd>
          </div>
        </dl>
        {conflict && (
          <p
            role="status"
            className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950"
          >
            This requested time overlaps a confirmed work order. Propose a
            different time before accepting.
          </p>
        )}
        <OrderActions job={job} onUpdated={onUpdated} />
      </div>
      <div className={styles.footer}>
        {!detail && (
          <Link className={styles.button} href={`/dashboard/jobs/${job.id}`}>
            View work order
          </Link>
        )}
        {job.chatId && (
          <Link
            className={styles.button}
            href={`/dashboard/messages/${job.chatId}`}
          >
            Message {operator ? "customer" : "provider"}
          </Link>
        )}
        {job.previousOrderId && (
          <Link
            className={styles.button}
            href={`/dashboard/jobs/${job.previousOrderId}`}
          >
            Previous order
          </Link>
        )}
      </div>
    </article>
  );
}
