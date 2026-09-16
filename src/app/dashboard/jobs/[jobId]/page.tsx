"use client";
import BackButton from "@/components/BackButton";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  doc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { ClientProfile, Job, OperatorProfile } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import OrderCard from "@/components/work-orders/OrderCard";
import styles from "@/components/work-orders/work-orders.module.css";
export default function WorkOrderPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null),
    [name, setName] = useState("Company / customer"),
    [error, setError] = useState("");
  const [person, setPerson] = useState<OperatorProfile | ClientProfile>();
  const [notice, setNotice] = useState("");
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
  return (
    <div className={styles.detailPage}>
      <BackButton href="/dashboard/jobs" label="Back" />
      {error ? (
        <p role="alert">{error}</p>
      ) : !job ? (
        <p role="status">Loading work order…</p>
      ) : (
        <>
          {notice && (
            <p role="status" className="text-sm text-[var(--text-secondary)]">
              {notice}
            </p>
          )}
          <OrderCard job={job} name={name} person={person} detail onUpdated={setNotice} />
          {(job.specialInstructions || job.completionPhotoUrl || job.legacyChatId) && <section className={styles.detailSection} aria-labelledby="visit-notes-heading">
            <h2 id="visit-notes-heading" className={styles.detailSummary}>Notes & proof</h2>
            {job.specialInstructions && <p className="mt-3">{job.specialInstructions}</p>}
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
            {job.legacyChatId && (
              <p className="mt-3">
                <Link
                  className="underline"
                  href={`/dashboard/messages/${job.legacyChatId}`}
                >
                  Earlier conversation
                </Link>
              </p>
            )}
          </section>}
        </>
      )}
    </div>
  );
}
