"use client";
import DashboardMap from "@/components/dashboard/DashboardMap";
import { RequestReply, RequestWhen, directionsUrl, distanceText, estimateTrip, fullAddress, paymentLabel, pointOf, serviceSummary } from "@/components/dashboard/OperatorOrderCard";
import { useOperatorPosition } from "@/components/dashboard/OperatorLocationTracker";
import type { Route } from "@/components/SnowdMap";
import CompanyIdentity from "@/components/CompanyIdentity";
import { useAuth } from "@/context/AuthContext";
import { arrivalLabel } from "@/lib/clientValue";
import { jobDisplayPrice } from "@/lib/marketplacePricing";
import { ClientProfile, Job, OperatorProfile } from "@/lib/types";
import { orderActionNeeded, orderLabel, orderNumber } from "@/lib/workOrders";
import { Banknote, CalendarClock, Car, CreditCard, MessageCircle, Navigation, Shovel } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import OrderActions from "./OrderActions";
import WorkOrderTimeline from "./WorkOrderTimeline";
import styles from "./operator-order.module.css";

/**
 * The operator's open work order: the trip map on its own, then one sheet with
 * who, when, pay and the job. The next thing to do sits at the bottom as large,
 * glove-friendly buttons that stay in reach without scrolling.
 */
export default function OperatorWorkOrder({ job, name, person, operator }: { job: Job; name: string; person?: OperatorProfile | ClientProfile; operator?: OperatorProfile }) {
  const auth = useAuth();
  // Local review pages pass a sample operator; the app uses the signed-in one.
  const profile = operator || auth.profile;
  const uid = operator?.uid || auth.user?.uid || "";
  const { position } = useOperatorPosition();
  const [route, setRoute] = useState<Route | null>(null);
  const onRoute = useCallback((next: Route | null) => setRoute(next), []);
  const open = !["completed", "cancelled"].includes(job.status);
  const needsReply = job.status === "pending" && !!orderActionNeeded(job, uid) && !job.scheduleProposal;
  const start = pointOf(position?.lat, position?.lng) || pointOf(profile?.lat, profile?.lng);
  const site = pointOf(job.clientLat, job.clientLng);
  const trip = route ? { ...route, estimated: false } : start && site ? { ...estimateTrip(start, site), estimated: true } : null;
  const approx = trip?.estimated ? "~" : "";
  const notes = job.specialInstructions;
  const photos = person?.role === "client" ? (person as ClientProfile).propertyDetails?.photos || [] : [];
  const chatHref = job.chatId ? `/dashboard/messages/${job.chatId}#order-${job.id}` : "";

  return <div className={styles.page} data-reply={needsReply || undefined}>
    {open && <div className={styles.map}><DashboardMap profile={profile} job={job} role="operator" onRoute={onRoute} showVisitLink={false} /></div>}

    <article className={styles.sheet} aria-labelledby="work-order-client">
      <header className={styles.head}>
        <p className={styles.ref}>Work order #{orderNumber(job)}</p>
        <span className={styles.status} data-status={job.status}>{needsReply ? "New request" : orderLabel(job)}</span>
      </header>
      <h1 id="work-order-client" className={styles.client}><CompanyIdentity person={person} name={name} /></h1>
      {/* Once the request is answered, talking to the homeowner is the first thing in reach. */}
      {!needsReply && chatHref && <Link className={styles.message} href={chatHref}><MessageCircle size={22} aria-hidden="true" />Message {name.split(" ")[0] || "customer"}</Link>}

      <dl className={styles.facts}>
        <div className={styles.when}>
          <dt><CalendarClock size={16} aria-hidden="true" />When</dt>
          <dd>{job.status === "en-route" ? <p className={styles.live}>{arrivalLabel(job)}</p> : <RequestWhen job={job} className={styles.whenValue} />}</dd>
        </div>
        <div className={styles.pay}>
          <dt>{job.paymentMethod === "cash" ? <Banknote size={16} aria-hidden="true" /> : <CreditCard size={16} aria-hidden="true" />}You earn</dt>
          <dd><strong>${jobDisplayPrice(job, true).toFixed(2)}<small>CAD</small></strong><span>{paymentLabel(job)}</span></dd>
        </div>
        <div>
          <dt><Shovel size={16} aria-hidden="true" />Job</dt>
          <dd className={styles.job}>{serviceSummary(job)}</dd>
        </div>
        {open && <div>
          <dt><Car size={16} aria-hidden="true" />Trip</dt>
          <dd>{trip ? <><strong>{approx}{trip.minutes} min</strong> · {approx}{distanceText(trip.distanceKm)} away</> : "Share your location to see the drive"}</dd>
        </div>}
        <div className={styles.wide}>
          <dt><Navigation size={16} aria-hidden="true" />Address</dt>
          <dd>{job.address ? <a className={styles.address} href={directionsUrl(job)} target="_blank" rel="noopener noreferrer">{fullAddress(job)}<span className="sr-only"> (directions open in a new tab)</span></a> : "Address to be confirmed"}</dd>
        </div>
        {(notes || photos.length > 0) && <div className={styles.wide}>
          <dt>Notes from the homeowner</dt>
          <dd>{notes && <p>{notes}</p>}{photos.length > 0 && <p className={styles.photos}>{photos.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer">Property photo {index + 1} ↗</a>)}</p>}</dd>
        </div>}
      </dl>

      {!needsReply && <div className={styles.progress}><WorkOrderTimeline job={job} /></div>}

      <footer className={styles.actions}>
        {needsReply ? <RequestReply job={job} large /> : <div className={styles.next}><OrderActions job={job} /></div>}
      </footer>
    </article>
  </div>;
}
