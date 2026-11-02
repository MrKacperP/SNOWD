"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Check, MapPin, X } from "lucide-react";
import DashboardMap from "@/components/dashboard/DashboardMap";
import EarningsChart, { earningPointsFrom } from "@/components/dashboard/EarningsChart";
import { RequestWhen, distanceText, estimateTrip, paymentLabel, serviceSummary } from "@/components/dashboard/OperatorOrderCard";
import WorkOrderTimeline from "@/components/work-orders/WorkOrderTimeline";
import IconSwap from "@/components/ui/IconSwap";
import Modal from "@/components/ui/Modal";
import { arrivalLabel } from "@/lib/clientValue";
import type { JobStatus, OperatorProfile, Transaction } from "@/lib/types";
import css from "@/components/dashboard/operator-orders.module.css";
import home from "@/components/dashboard/home.module.css";
import DemoShell from "./DemoShell";
import { ADDRESS, CLIENT_NAME, demoJob, tellParent, type DemoState } from "./demoData";

// Same look as the real progress buttons in OrderActions.
const button = "motion-safe:transition motion-safe:active:scale-[0.98] min-h-11 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card-solid)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] px-4 py-3 text-sm font-semibold disabled:opacity-50";
const attentionButton = `${button} action-shine !border-[var(--ink)] !bg-[var(--ink)] !bg-none !text-white enabled:hover:!bg-[#0a1c27]`;
const DAY = 86400000;

/** The operator dashboard with the sample order; every button here moves the order on for real in the demo. */
export default function OperatorDemo({ state }: { state: DemoState }) {
  const { spot, paid } = state;
  const job = useMemo(() => demoJob(state), [state]);
  const [confirmDecline, setConfirmDecline] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [now] = useState(() => Date.now());
  const operator = useMemo(() => ({ uid: "demo-op", role: "operator", displayName: "Jamie Morgan", businessName: "Northside Snow Co.", idVerified: true, lat: spot.lat - 0.006, lng: spot.lng + 0.008, city: spot.city, province: spot.province } as unknown as OperatorProfile), [spot]);
  // A few earlier visits so the chart has a shape; this one joins the line once the cash is in.
  const transactions = useMemo(() => {
    const past = [[9, 4000], [6, 5500], [3, 4500]].map(([days, amount], index) => ({ id: `t${index}`, jobId: `past${index}`, status: "paid", amount, paymentMethod: "cash", createdAt: new Date(now - days * DAY) }));
    if (paid && job) past.push({ id: "t-demo", jobId: "demo", status: "paid", amount: job.price * 100, paymentMethod: "cash", createdAt: new Date(now) });
    return past as unknown as Transaction[];
  }, [paid, job, now]);
  const earned = transactions.reduce((sum, item) => sum + item.amount, 0);
  const advance = (to: JobStatus) => tellParent("snowd-demo-advance", { to });

  const open = job && job.status !== "cancelled";
  const live = open && job.status !== "completed";
  const isNew = job?.status === "pending";
  const trip = job ? estimateTrip({ lat: operator.lat!, lng: operator.lng! }, { lat: spot.lat, lng: spot.lng }) : null;
  const showTrip = open && !["en-route", "in-progress", "completed"].includes(job.status);
  const title = !job ? "Ready for your next request" : isNew ? "1 work order needs your reply" : job.status === "completed" && !paid ? "Collect the cash" : ["completed", "cancelled"].includes(job.status) ? "Ready for your next request" : "Your next visit";

  return <DemoShell role="operator" spot={spot} pathname="/dashboard">
    <div className={`app-page dashboard-home ${home.home} ${home.operatorHome} text-[var(--text-primary)]`}>
      <header className="dashboard-overview"><div><h1>{title}</h1></div></header>
      <div><DashboardMap profile={operator} job={open ? job : undefined} role="operator" others={open ? [job] : []} newJobIds={isNew ? ["demo"] : []} offer={isNew ? { href: "/dashboard/jobs/demo", title: serviceSummary(job), detail: `$${job.price.toFixed(2)} CAD · ASAP` } : undefined} /></div>

      {!job || (job.status === "completed" && paid) ? <div className="client-orders-empty"><div><h3>No jobs requested</h3><p>Your queue is clear.</p></div></div> : (
        <div className={css.listWrap}>
          <section className={css.list} aria-label="Work orders">
            <article className={css.order} data-new={isNew || undefined} data-cancelled={!open || undefined} aria-label={`${isNew ? "New request" : "Work order"}: ${CLIENT_NAME}`}>
              <div className={css.head}>
                {isNew ? <span className={css.tag} data-tone="new">New request</span> : !open && <span className={css.tag} data-tone="cancelled">Request declined</span>}
                <h3 className={css.name}>{CLIENT_NAME}</h3>
                <p className={css.service}>{serviceSummary(job)}</p>
              </div>
              <div className={css.pay}><strong>${job.price.toFixed(2)}<small> CAD</small></strong><span>{paymentLabel(job)}</span></div>
              {live && (job.status === "en-route" ? <p className={css.meta}><strong className={css.asap}>{arrivalLabel(job)}</strong></p> : <RequestWhen job={job} className={css.meta} />)}
              {live && <p className={css.address}><a href="#"><MapPin size={14} aria-hidden="true" />{ADDRESS}</a>{showTrip && trip && <span className={css.trip}>ETA ~{trip.minutes} min · ~{distanceText(trip.distanceKm)}</span>}</p>}
              {isNew ? <div className={css.reply}>
                {confirmDecline && <p className={css.confirm}>Decline this request? It moves to your history.</p>}
                <div className={css.replyButtons}>
                  {confirmDecline ? <>
                    <button type="button" className={`${css.replyButton} ${css.keep}`} onClick={() => setConfirmDecline(false)}>Keep it</button>
                    <button type="button" className={`${css.replyButton} ${css.decline}`} onClick={() => advance("cancelled")}><IconSwap icon={<X strokeWidth={3} />}>Yes, decline</IconSwap></button>
                  </> : <>
                    <button type="button" className={`${css.replyButton} ${css.accept}`} onClick={() => advance("accepted")}><IconSwap icon={<Check strokeWidth={3} />}>Accept</IconSwap></button>
                    <button type="button" className={`${css.replyButton} ${css.decline}`} onClick={() => setConfirmDecline(true)}><IconSwap icon={<X strokeWidth={3} />}>Decline</IconSwap></button>
                  </>}
                </div>
              </div> : <div className={css.progress}><WorkOrderTimeline job={job} /></div>}
              {open && !isNew && <div className={css.actions}><div className="mt-4"><div className="flex flex-wrap gap-2">
                {job.status === "accepted" && <button type="button" className={attentionButton} onClick={() => advance("en-route")}>On my way</button>}
                {job.status === "en-route" && <>
                  <button type="button" className={attentionButton} onClick={() => advance("in-progress")}>Start work</button>
                  <button type="button" className={button} onClick={() => advance("accepted")}>Go back to confirmed</button>
                </>}
                {job.status === "in-progress" && <button type="button" className={attentionButton} onClick={() => setPhotoOpen(true)}>Add photo &amp; complete work</button>}
                {job.status === "completed" && <button type="button" className={attentionButton} onClick={() => tellParent("snowd-demo-paid")}>Confirm cash received</button>}
              </div></div></div>}
            </article>
          </section>
        </div>
      )}

      <section className="dashboard-earnings" aria-labelledby="earnings-heading">
        <div className="dashboard-earnings-head">
          <div>
            <h2 id="earnings-heading">Total earned</h2>
            <p className="dashboard-earnings-value"><strong>{new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(earned / 100)}</strong><small>CAD</small></p>
            <p className="dashboard-earnings-meta">From {transactions.length} jobs</p>
          </div>
        </div>
        <EarningsChart points={earningPointsFrom(transactions)} />
      </section>
    </div>

    <Modal isOpen={photoOpen} onClose={() => setPhotoOpen(false)} title="Completion photo" size="md">
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">Add a photo of the cleared areas. The homeowner gets it the moment you finish.</p>
        <Image src="/landing/snowd-cleared-driveway.png" alt="Sample photo of a cleared driveway" width={941} height={1672} className="h-56 w-full rounded-xl object-cover" style={{ objectPosition: "center 62%" }} />
        <button type="button" className="btn-primary action-shine w-full min-h-12" onClick={() => { setPhotoOpen(false); advance("completed"); }}>Use this photo &amp; complete work</button>
      </div>
    </Modal>
  </DemoShell>;
}
