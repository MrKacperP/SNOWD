"use client";
import BackButton from "@/components/BackButton";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  doc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ClientProfile, Job, OperatorProfile } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import OrderCard from "@/components/work-orders/OrderCard";
import OperatorWorkOrder from "@/components/work-orders/OperatorWorkOrder";
import styles from "@/components/work-orders/work-orders.module.css";
export default function WorkOrderPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null),
    [name, setName] = useState("Company / customer"),
    [error, setError] = useState("");
  const [person, setPerson] = useState<OperatorProfile | ClientProfile>();
  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      doc(db, "jobs", jobId),
      (snap) => {
        if (!snap.exists()) setError("Work order not found.");
        else {
          setJob({ ...snap.data(), id: snap.id } as Job);
          setError("");
        }
      },
      () =>
        setError(
          "This work order is unavailable or belongs to another account.",
        ),
    );
  }, [jobId, user]);
  useEffect(() => {
    if (!job || !user) return;
    let active = true;
    void getDoc(
      doc(
        db,
        "users",
        user.uid === job.operatorId ? job.clientId : job.operatorId,
      ),
    )
      .then((snap) => {
        const p = snap.data() as OperatorProfile;
        if (active) {
          setPerson({ ...p, uid: snap.id } as OperatorProfile | ClientProfile);
          setName(p?.businessName || p?.displayName || "Company / customer");
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [job, user]);
  // Operators get the focused work order: map, one sheet, large reply or message buttons.
  if (job && user?.uid === job.operatorId && !error) return (
    <div className={styles.operatorDetail}>
      <BackButton href="/dashboard/jobs" label="Back" />
      <OperatorWorkOrder job={job} name={name === "Company / customer" ? "Homeowner" : name} person={person} />
      {job.completionPhotoUrl && <a className="inline-flex min-h-11 items-center underline" href={job.completionPhotoUrl} target="_blank" rel="noreferrer">View completion photo</a>}
    </div>
  );
  return (
    <div className={`${styles.detailPage} ${styles.openWorkOrder}`}>
      <BackButton href="/dashboard/jobs" label="Back" />
      {error ? (
        <p role="alert">{error}</p>
      ) : !job ? (
        <p role="status">Loading work order…</p>
      ) : (
        <>
          <OrderCard job={job} name={name} person={person} detail />
          {job.completionPhotoUrl && <section className={styles.detailSection} aria-labelledby="visit-notes-heading">
            <h2 id="visit-notes-heading" className={styles.detailSummary}>Completion & history</h2>
            {job.completionPhotoUrl && (
              <a
                className="mt-3 inline-flex min-h-11 items-center underline"
                href={job.completionPhotoUrl}
                target="_blank"
                rel="noreferrer"
              >
                View completion photo
              </a>
            )}
          </section>}
        </>
      )}
    </div>
  );
}
