"use client";
import DashboardMap from "@/components/dashboard/DashboardMap";
import { RequestWhen, fullAddress, paymentLabel, serviceSummary } from "@/components/dashboard/OperatorOrderCard";
import CompanyIdentity from "@/components/CompanyIdentity";
import { useAuth } from "@/context/AuthContext";
import { useArrivalLabel } from "@/hooks/useArrivalLabel";
import { ClientProfile, Job, OperatorProfile } from "@/lib/types";
import { orderActionNeeded, orderLabel, orderNumber } from "@/lib/workOrders";
import { Banknote, CalendarClock, CreditCard, MapPin, MessageCircle, Shovel } from "lucide-react";
import Link from "next/link";
import OrderActions from "./OrderActions";
import PhotoViewer from "./PhotoViewer";
import WorkOrderTimeline from "./WorkOrderTimeline";
import styles from "./operator-order.module.css";

/**
 * The client's open work order, laid out like the operator's: the map on its own,
 * then one sheet with who, when, cost and the job, and the next step at the bottom.
 */
export default function ClientWorkOrder({ job, name, person }: { job: Job; name: string; person?: OperatorProfile | ClientProfile }) {
  const { profile } = useAuth();
  const arrival = useArrivalLabel(job);
  const open = !["completed", "cancelled"].includes(job.status);
  const needsReply = !!orderActionNeeded(job, job.clientId);
  const chatHref = job.chatId ? `/dashboard/messages/${job.chatId}#order-${job.id}` : "";

  return <div className={styles.page} data-reply={needsReply || undefined}>
    {open && job.completionPhotoUrl ? <div className={`${styles.map} ${styles.proof}`}><PhotoViewer src={job.completionPhotoUrl} /></div> : open && <div className={styles.map}><DashboardMap profile={profile as ClientProfile | null} job={job} role="client" showVisitLink={false} /></div>}

    <article className={styles.sheet} aria-labelledby="work-order-provider">
      <header className={styles.head}>
        <p className={styles.ref}>Work order #{orderNumber(job)}</p>
        <span className={styles.status} data-status={job.status}>{orderLabel(job)}</span>
      </header>
      <h1 id="work-order-provider" className={styles.client}><CompanyIdentity person={person} name={name} /></h1>
      {chatHref && <Link className={styles.message} href={chatHref}><MessageCircle size={22} aria-hidden="true" />Message {name.split(" ")[0] || "your shoveler"}</Link>}

      <dl className={styles.facts}>
        <div className={styles.when}>
          <dt><CalendarClock size={16} aria-hidden="true" />When</dt>
          <dd>{job.status === "en-route" || job.status === "in-progress" ? <p className={styles.live}>{arrival}</p> : <RequestWhen job={job} className={styles.whenValue} />}</dd>
        </div>
        <div className={styles.pay}>
          <dt>{job.paymentMethod === "cash" ? <Banknote size={16} aria-hidden="true" /> : <CreditCard size={16} aria-hidden="true" />}You pay</dt>
          <dd><strong>${job.price.toFixed(2)}<small>CAD</small></strong><span>{paymentLabel(job)}</span></dd>
        </div>
        <div className={styles.wide}>
          <dt><Shovel size={16} aria-hidden="true" />Job</dt>
          <dd className={styles.job}>{serviceSummary(job)}</dd>
        </div>
        <div className={styles.wide}>
          <dt><MapPin size={16} aria-hidden="true" />Address</dt>
          <dd>{job.address ? fullAddress(job) : "Address to be confirmed"}</dd>
        </div>
        {job.specialInstructions && <div className={styles.wide}>
          <dt>Your notes</dt>
          <dd><p>{job.specialInstructions}</p></dd>
        </div>}
        {job.completionPhotoUrl && <div className={styles.wide}>
          <dt>Completion photo</dt>
          <dd><PhotoViewer src={job.completionPhotoUrl} /></dd>
        </div>}
      </dl>

      <div className={styles.progress}><WorkOrderTimeline job={job} /></div>

      <footer className={styles.actions}>
        <div className={styles.next}><OrderActions job={job} /></div>
      </footer>
    </article>
  </div>;
}
