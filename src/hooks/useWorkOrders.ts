"use client";
import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Job, UserProfile, OperatorProfile } from "@/lib/types";
export function useWorkOrders() {
  const { user, profile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]),
    [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    if (!user || !profile) return;
    return onSnapshot(
      query(
        collection(db, "jobs"),
        where(
          profile.role === "operator" ? "operatorId" : "clientId",
          "==",
          user.uid,
        ),
      ),
      (snap) => {
        setJobs(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Job));
        setLoading(false);
        setError("");
      },
      () => {
        setError(
          "Could not load work orders. Check your connection and reload.",
        );
        setLoading(false);
      },
    );
  }, [user, profile]);
  useEffect(() => {
    let active = true;
    const ids = [
      ...new Set(
        jobs.map((j) =>
          profile?.role === "operator" ? j.clientId : j.operatorId,
        ),
      ),
    ];
    void Promise.all(
      ids.map(async (id) => {
        try {
          const data = (
            await getDoc(doc(db, "users", id))
          ).data() as UserProfile & OperatorProfile;
          return [
            id,
            data?.businessName || data?.displayName || "Company / customer",
          ] as const;
        } catch {
          return [id, "Company / customer"] as const;
        }
      }),
    ).then((entries) => {
      if (active) setNames(Object.fromEntries(entries));
    });
    return () => {
      active = false;
    };
  }, [jobs, profile?.role]);
  return {
    jobs,
    names,
    loading,
    error,
    uid: user?.uid || "",
    isOperator: profile?.role === "operator",
  };
}
