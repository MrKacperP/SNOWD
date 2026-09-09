"use client";
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
    <div className="mx-auto max-w-3xl space-y-5 py-3">
      <Link
        className="inline-flex min-h-11 items-center font-semibold underline"
        href="/dashboard/jobs"
      >
        ← Work orders
      </Link>
      <h1 className="text-3xl font-bold">Work order</h1>
      {error ? (
        <p role="alert">{error}</p>
      ) : !job ? (
        <p role="status">Loading work order…</p>
      ) : (
        <>
          <OrderCard job={job} name={name} detail />
          <section className="surface-card rounded-3xl p-6">
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
                  Earlier shared conversation · legacy history
                </Link>
              </p>
            )}
          </section>
          <section className="surface-card rounded-3xl p-6">
            <h2 className="text-xl font-bold">Order activity</h2>
            {eventError && <p role="alert">{eventError}</p>}
            <ol className="mt-4 space-y-4">
              {events.map((event) => (
                <li
                  key={event.id}
                  className="border-l-2 border-[var(--border-color)] pl-4"
                >
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
