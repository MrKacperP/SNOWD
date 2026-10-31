"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Camera, Check, MousePointer2, Send } from "lucide-react";
import WorkOrderTimeline from "@/components/work-orders/WorkOrderTimeline";
import type { Job, JobStatus } from "@/lib/types";
import styles from "./LandingStepVisuals.module.css";

/** A cursor glides in and presses "Book a shoveler", which flips to a green "Booked". */
export function BookVisual({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`${styles.stepStage} ${styles.bookStage} ${compact ? styles.compact : ""}`} aria-hidden="true">
      <span className={styles.bookBtn}>
        <span className={styles.bookIdle}>Book a shoveler</span>
        <span className={styles.bookDone}><Check size={17} strokeWidth={3} />Booked</span>
      </span>
      <MousePointer2 className={styles.bookCursor} size={26} fill="#123346" color="#fff" strokeWidth={1.5} />
    </div>
  );
}

const statuses: JobStatus[] = ["pending", "accepted", "en-route", "in-progress", "completed"];

/** The dashboard's work-order timeline, stepping itself from Requested to Done on a loop. */
export function FollowVisual({ compact = false }: { compact?: boolean }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const last = statuses.length - 1;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still && step === last) return;
    const timer = window.setTimeout(() => setStep(still ? last : (step + 1) % statuses.length), still ? 0 : step === last ? 2600 : 1400);
    return () => window.clearTimeout(timer);
  }, [step]);
  return (
    <div className={`${styles.stepStage} ${styles.followStage} ${compact ? styles.compact : ""}`}>
      <span className={styles.followHead}><span className={styles.followDot} data-step={statuses[step]} aria-hidden="true" />Your visit</span>
      <WorkOrderTimeline job={{ status: statuses[step] } as Job} />
    </div>
  );
}

/** Camera app opens, snaps the cleared driveway, and the photo is sent to the homeowner. */
export function PhotoVisual({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`${styles.stepStage} ${styles.photoStage} ${compact ? styles.compact : ""}`} aria-hidden="true">
      <Image className={styles.photoShot} src="/landing/snowd-cleared-driveway.png" alt="" width={941} height={1672} sizes="320px" />
      <span className={styles.photoFlash} />
      <span className={styles.cameraApp}><Camera size={30} /></span>
      <span className={styles.photoSubmit}>
        <span className={styles.photoSending}><Send size={14} />Submitting photo…</span>
        <span className={styles.photoSent}><Check size={15} strokeWidth={3} />Sent to homeowner</span>
      </span>
    </div>
  );
}
