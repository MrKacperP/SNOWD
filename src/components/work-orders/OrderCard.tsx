"use client";
import { jobDisplayPrice } from "@/lib/marketplacePricing";
import CompanyIdentity from "@/components/CompanyIdentity";
import Link from "next/link";
import { ClientProfile, Job, OperatorProfile } from "@/lib/types";
import { isAsap, orderLabel, orderNumber, scheduleText } from "@/lib/workOrders";
import { useAuth } from "@/context/AuthContext";
import styles from "./work-orders.module.css";
import OrderGuide from "./OrderGuide";
import OrderActions from "./OrderActions";
const drivewayCapacity: Record<string, string> = { small: "Fits about 1–2 cars", medium: "Fits about 3–4 cars", large: "Fits about 5+ cars" };
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
  person?: OperatorProfile | ClientProfile;
  detail?: boolean;
  conflict?: boolean;
  onUpdated?: (message: string) => void;
}) {
  const { user } = useAuth();
  const operator = user?.uid === job.operatorId;
  const propertyPhotos = operator && person?.role === "client"
    ? (person as ClientProfile).propertyDetails?.photos || []
    : [];
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
        <div className={styles.priorityFacts} aria-label="Visit time and payment">
          <div>
            <span>Visit time</span>
            <strong>{job.status === "en-route" && job.eta ? `Arriving in about ${job.eta} ${job.eta === 1 ? "minute" : "minutes"}` : isAsap(job) ? "ASAP · As soon as possible" : scheduleText(job)}</strong>
          </div>
          <div>
            <span>Payment</span>
            <strong>${jobDisplayPrice(job, operator).toFixed(2)} CAD · {job.paymentMethod === "cash" ? "Cash" : "Card"}</strong>
            <small>{job.paymentStatus === "held" ? "Authorized" : job.paymentStatus === "paid" ? "Paid" : job.paymentStatus === "refunded" ? "Refunded / released" : "Pending"}</small>
          </div>
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
        <OrderGuide job={job} uid={user?.uid || ""} />
        <OrderActions job={job} onUpdated={onUpdated} />
        {job.chatId && (
          <Link className={styles.messageButton} href={`/dashboard/messages/${job.chatId}`}>
            Message {operator ? "customer" : "provider"}
          </Link>
        )}
        <section className={styles.orderDetails} aria-labelledby={`visit-details-${job.id}`}>
        <h3 id={`visit-details-${job.id}`} className={styles.detailSummary}>Visit details</h3>
        <dl className={styles.facts}>
          <div>
            <dt>Location</dt>
            <dd>
              {job.address ? <a className="font-semibold underline" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}&travelmode=driving&dir_action=navigate`} target="_blank" rel="noreferrer">{job.address} ↗</a> : <strong>Address to be confirmed</strong>}
            </dd>
          </div>
          <div>
            <dt>Driveway size</dt>
            <dd className="capitalize"><strong>{job.propertySize || "medium"} driveway</strong><small className="mt-1 block normal-case text-[var(--text-muted)]">{drivewayCapacity[job.propertySize || "medium"]}</small></dd>
          </div>
          <div>
            <dt>Expected clearing</dt>
            <dd>
              <strong className="capitalize">
                {job.serviceTypes
                  ?.map((s) => s.replaceAll("-", " "))
                  .join(" · ") || "Snow removal"}
              </strong>
              <p className={styles.secondary}>{job.specialInstructions || "Clear the selected areas of snow."}</p>
              {propertyPhotos.length > 0 && <p className={styles.photoLinks}>{propertyPhotos.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer">View property photo {index + 1} ↗</a>)}</p>}
            </dd>
          </div>
          {job.status === "en-route" && job.eta && <div><dt>Live arrival</dt><dd><strong>About {job.eta} {job.eta === 1 ? "minute" : "minutes"} away</strong>{Number.isFinite(job.operatorApproxLat) && Number.isFinite(job.operatorApproxLng) && <a className="mt-1 block font-semibold underline" href={`https://www.google.com/maps?q=${job.operatorApproxLat},${job.operatorApproxLng}`} target="_blank" rel="noreferrer">View approximate area ({job.operatorLocationRadiusKm || 1} km radius) ↗</a>}<p className={styles.secondary}>The operator’s exact location stays private.</p></dd></div>}
        </dl>
        </section>
        {conflict && (
          <p
            role="status"
            className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950"
          >
            This requested time overlaps a confirmed work order. Propose a
            different time before accepting.
          </p>
        )}
      </div>
      <div className={styles.footer}>
        {!detail && (
          <Link className={styles.button} href={`/dashboard/jobs/${job.id}`}>
            View work order
          </Link>
        )}
        {!detail && job.chatId && (
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
