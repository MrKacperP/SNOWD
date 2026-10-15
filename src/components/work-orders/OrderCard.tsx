"use client";
import PaymentSummary from "./PaymentSummary";
import PropertyMap from "@/components/PropertyMap";
import CompanyIdentity from "@/components/CompanyIdentity";
import Link from "next/link";
import { ClientProfile, Job, OperatorProfile } from "@/lib/types";
import { isAsap, orderLabel, orderNumber, propertySizeLabel, scheduleText } from "@/lib/workOrders";
import { useAuth } from "@/context/AuthContext";
import { Clock3 } from "lucide-react";
import styles from "./work-orders.module.css";
import OrderGuide from "./OrderGuide";
import OrderActions from "./OrderActions";
import { useCallback, useState } from "react";
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
  const { user, profile } = useAuth();
  const operator = user?.uid === job.operatorId;
  const [route, setRoute] = useState<{ minutes: number; distanceKm: number } | null>(null);
  const onRoute = useCallback((nextRoute: { minutes: number; distanceKm: number } | null) => setRoute(nextRoute), []);
  const operatorProfile = operator ? profile : person?.role === "operator" ? person : null;
  const operatorAddress = operatorProfile ? [operatorProfile.address, operatorProfile.city, operatorProfile.province, operatorProfile.postalCode].filter(Boolean).join(", ") : "";
  const routeOrigin = job.status === "en-route" && Number.isFinite(job.operatorApproxLat) && Number.isFinite(job.operatorApproxLng)
    ? `${job.operatorApproxLat},${job.operatorApproxLng}`
    : operatorAddress;
  const travelTime = job.status === "en-route" && job.etaSource === "route" ? job.eta : route?.minutes;
  const propertyPhotos = operator && person?.role === "client"
    ? (person as ClientProfile).propertyDetails?.photos || []
    : [];
  return (
    <article className={styles.card}>
      <div className={styles.body}>
        {detail && <section className="order-property">{job.address ? <PropertyMap address={[job.address, job.city, job.province, job.postalCode].filter(Boolean).join(", ")} origin={routeOrigin || undefined} title={routeOrigin ? "Driving route to the service location" : "Service location"} onRoute={onRoute} /> : null}{routeOrigin && <small className="block mt-2 text-[var(--text-secondary)]">{job.status === "en-route" && Number.isFinite(job.operatorApproxLat) ? "Route starts at the operator’s shared approximate location." : "Route starts at the operator’s saved address."}</small>}<p>{job.address || "Address to be confirmed"}{job.city ? `, ${job.city}` : ""}</p></section>}
        <div className={styles.cardHeader}>
          <div className="min-w-0">
            <p className={styles.reference}>Work order #{orderNumber(job)}</p>
            {detail ? <h1 className={styles.title}><CompanyIdentity person={person} name={name} /></h1> : <h3 className={`${styles.title} capitalize`}>{job.serviceTypes?.map(service => service.replaceAll("-", " ")).join(" · ") || "Snow clearing"}</h3>}
            {detail && <p className={styles.secondary}>{operator ? "Customer" : "Service provider"}</p>}
          </div>
          <span className={styles.badge} data-status={job.status}>
            {orderLabel(job)}
          </span>
        </div>
        <div className={styles.priorityFacts} aria-label="Visit time and payment">
          <div>
            <span><Clock3 size={13} /> {isAsap(job) ? "Arrival" : "Scheduled"}</span>
            <strong className={isAsap(job) ? styles.arrivalChip : ""}>{detail && travelTime ? `About ${travelTime} min drive${route?.distanceKm ? ` · ${route.distanceKm} km` : ""}` : job.status === "en-route" && job.etaSource === "route" && job.eta ? `About ${job.eta} min away` : isAsap(job) ? "ASAP · time to confirm" : scheduleText(job)}</strong>
          </div>
          <PaymentSummary job={job} operator={operator} />
        </div>
        {detail && <section className={styles.serviceSummary} aria-label="Requested service"><strong>{propertySizeLabel(job.propertySize)}</strong><span>{job.serviceTypes?.filter((service) => service !== "driveway").map((service) => service.replaceAll("-", " ")).join(" · ") || "Driveway clearing"}</span></section>}
        {!detail && <OrderGuide job={job} uid={user?.uid || ""} />}
        {detail && job.chatId && (
          <Link className={styles.messageButton} href={`/dashboard/messages/${job.chatId}`}>
            Message {operator ? "customer" : "provider"}
          </Link>
        )}
        <OrderActions job={job} compact={!detail} onUpdated={onUpdated} />
        {detail && <details className={styles.orderDetails} aria-labelledby={`visit-details-${job.id}`}>
        <summary id={`visit-details-${job.id}`} className={styles.detailSummary}>Notes & photos</summary>
        <dl className={styles.facts}>
          {(job.specialInstructions || propertyPhotos.length > 0) && <div><dt>Visit notes</dt><dd>{job.specialInstructions && <p>{job.specialInstructions}</p>}{propertyPhotos.length > 0 && <p className={styles.photoLinks}>{propertyPhotos.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer">Property photo {index + 1} ↗</a>)}</p>}</dd></div>}
          {job.status === "en-route" && (travelTime || job.etaSource === "route") && <div><dt>Driving time</dt><dd><strong>About {travelTime || job.eta} minutes away</strong>{Number.isFinite(job.operatorApproxLat) && Number.isFinite(job.operatorApproxLng) && <a className="mt-1 block font-semibold underline" href={`https://www.google.com/maps?q=${job.operatorApproxLat},${job.operatorApproxLng}`} target="_blank" rel="noreferrer">View approximate area ({job.operatorLocationRadiusKm || 1} km radius) ↗</a>}<p className={styles.secondary}>The operator’s exact location stays private.</p></dd></div>}
        </dl>
        </details>}
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
      {(!detail || job.previousOrderId) && <div className={styles.footer}>
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
      </div>}
    </article>
  );
}
