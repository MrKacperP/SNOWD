"use client";
import Link from "next/link";
import { Job } from "@/lib/types";
import { orderLabel, orderNumber, scheduleText } from "@/lib/workOrders";
import { useAuth } from "@/context/AuthContext";
import styles from "./work-orders.module.css";
import OrderActions from "./OrderActions";
export default function OrderCard({
  job,
  name,
  detail = false,
  conflict = false,
  onUpdated,
}: {
  job: Job;
  name: string;
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
            <h2 className={styles.title}>{name}</h2>
            <p className={styles.secondary}>
              {operator ? "Customer" : "Service provider"}
            </p>
          </div>
          <span className={styles.badge} data-status={job.status}>
            {orderLabel(job)}
          </span>
        </div>
        <dl className={styles.facts}>
          <div>
            <dt>{job.status === "pending" ? "Requested visit" : "Visit"}</dt>
            <dd>{scheduleText(job)}</dd>
          </div>
          <div>
            <dt>Location & service</dt>
            <dd>
              <strong>{job.address || "Address to be confirmed"}</strong>
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
              <strong>${Number(job.price || 0).toFixed(2)} CAD</strong>
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
            Message contact
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
