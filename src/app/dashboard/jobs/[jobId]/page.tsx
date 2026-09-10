"use client";
import BackButton from "@/components/BackButton";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { Job, OperatorProfile } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { dateMillis } from "@/lib/workOrders";
import OrderCard from "@/components/work-orders/OrderCard";
import styles from "@/components/work-orders/work-orders.module.css";
export default function WorkOrderPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null),
    [name, setName] = useState("Company / customer"),
    [error, setError] = useState("");
  const [events, setEvents] = useState<
    { id: string; title: string; createdAt: unknown }[]
  >([]);
  const [eventError, setEventError] = useState("");
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
        if (active)
          setName(p?.businessName || p?.displayName || "Company / customer");
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [job, user]);
  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      query(
        collection(db, "jobs", jobId, "events"),
        orderBy("createdAt", "asc"),
      ),
      (snap) => {
        setEvents(
          snap.docs.map(
            (d) =>
              ({ ...d.data(), id: d.id }) as {
                id: string;
                title: string;
                createdAt: unknown;
              },
          ),
        );
        setEventError("");
      },
      () => setEventError("The activity timeline is temporarily unavailable."),
    );
  }, [jobId, user]);
  return (
    <div className={styles.detailPage}>
      <BackButton href="/dashboard/jobs" label="Back" />
      {error ? (
        <p role="alert">{error}</p>
      ) : !job ? (
        <p role="status">Loading work order…</p>
      ) : (
        <>
          <header className={styles.detailIntro}>
            <h1>Work order</h1>
            <p>
              {name} · Order #{job.orderNumber || job.id}
            </p>
          </header>
          {notice && (
            <p role="status" className="text-sm text-[var(--text-secondary)]">
              {notice}
            </p>
          )}
          <OrderCard job={job} name={name} detail onUpdated={setNotice} />
          <section className={styles.detailSection}>
            <h2 className="text-xl font-bold">Service details</h2>
            <p className="mt-3">
              {job.specialInstructions || "No special instructions."}
            </p>
            <p className="mt-2">
              Estimated duration: {job.estimatedDuration || 45} minutes
            </p>
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
          </section>
          <section className={styles.detailSection}>
            <h2 className="text-xl font-bold">Activity</h2>
            {eventError && <p role="alert">{eventError}</p>}
            <ol className={styles.timeline}>
              {events.map((event) => (
                <li key={event.id} className={styles.timelineItem}>
                  <p className="font-semibold">{event.title}</p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {dateMillis(event.createdAt)
                      ? new Date(dateMillis(event.createdAt)).toLocaleString()
                      : "Just now"}
                  </p>
                </li>
              ))}
            </ol>
            {!events.length && !eventError && (
              <p className="mt-3">
                This order predates the activity timeline. Earlier updates
                remain in its conversation.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
