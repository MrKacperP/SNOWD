"use client";

import { Check, Clock3 } from "lucide-react";
import Image from "next/image";
import { Job } from "@/lib/types";
import { workOrderPresentation } from "@/lib/workOrderPresentation";
import styles from "./work-orders.module.css";

export default function OrderGuide({ job, uid }: { job: Job; uid: string }) {
  const finished = job.status === "completed";
  const view = workOrderPresentation(job, uid);
  return <section className={styles.guide} data-tone={view.tone} aria-label="Current task" aria-live="polite">
    {finished ? <Check size={30} aria-hidden="true" /> : <Clock3 size={24} aria-hidden="true" />}
    <h2>{view.title}</h2><p>{view.description}</p>
    <p className={styles.paymentNote}>{view.paymentMessage}</p>
    {finished && job.completionPhotoUrl && <figure className={styles.completionPhoto}><Image src={job.completionPhotoUrl} alt="Completed snow clearing" width={1200} height={800} unoptimized /><figcaption><Check size={15} /> Completion photo</figcaption></figure>}
  </section>;
}
