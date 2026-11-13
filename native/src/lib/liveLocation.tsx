import * as Location from "expo-location";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { dateMillis } from "@/lib/workOrders";
import type { Job } from "@/lib/types";
import { useAuth } from "~/context/auth";
import { api } from "./api";
import { useJobs } from "./data";

export type Point = { latitude: number; longitude: number };
type Live = { position: Point | null; jobId: string };
const LiveContext = createContext<Live>({ position: null, jobId: "" });

/** The shoveler's own position while they're sharing it with a confirmed job (null otherwise). */
export const useOperatorPosition = () => useContext(LiveContext);

/**
 * Like the website's tracker: while a shoveler has a confirmed job (accepted or on the way) and
 * the app is open, their position is sent every ~20 seconds. The server rounds it to about 100 m
 * before the customer can see it, so their exact spot stays private.
 */
export function LiveLocationProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const operator = profile?.role === "operator";
  const { jobs } = useJobs(operator ? user?.uid : undefined, operator ? "operator" : undefined);
  const jobId = useMemo(() => {
    const active = jobs.filter((j) => ["accepted", "en-route"].includes(j.status));
    const next = active.find((j) => j.status === "en-route") || active.sort((a, b) => (dateMillis(a.scheduledDate) || dateMillis(a.createdAt)) - (dateMillis(b.scheduledDate) || dateMillis(b.createdAt)))[0];
    return next?.id || "";
  }, [jobs]);
  const [position, setPosition] = useState<Point | null>(null);

  useEffect(() => {
    if (!jobId) return;
    let active = true;
    let lastSent = 0;
    let sending = false;
    let sub: Location.LocationSubscription | undefined;
    void (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted" || !active) return;
      sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 25, timeInterval: 10000 }, (p) => {
        if (!active) return;
        setPosition({ latitude: p.coords.latitude, longitude: p.coords.longitude });
        if (sending || Date.now() - lastSent < 20000) return;
        sending = true;
        api("/api/jobs/location", { jobId, lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy ?? 50 })
          .then(() => (lastSent = Date.now()))
          .catch(() => {})
          .finally(() => (sending = false));
      });
      if (!active) sub.remove();
    })();
    return () => {
      active = false;
      sub?.remove();
    };
  }, [jobId]);

  return <LiveContext.Provider value={{ position: jobId ? position : null, jobId }}>{children}</LiveContext.Provider>;
}

/** Straight-line trip estimate, the same one the website falls back to: road ≈ 1.25× the distance at 35 km/h. */
export function estimateTrip(from: Point, to: Point) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(rad(to.latitude - from.latitude) / 2) ** 2 + Math.cos(rad(from.latitude)) * Math.cos(rad(to.latitude)) * Math.sin(rad(to.longitude - from.longitude) / 2) ** 2;
  const km = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.25;
  return { minutes: Math.max(3, Math.ceil((km / 35) * 60 + 2)), km: Math.round(km * 10) / 10 };
}

export const distanceText = (km: number) => (km < 1 ? `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m` : `${km} km`);

/** The shoveler's shared (approximate) spot, only while it's fresh: under two minutes old. */
export function sharedOperatorSpot(job: Job, now: number) {
  if (!["accepted", "en-route"].includes(job.status)) return null;
  if (typeof job.operatorApproxLat !== "number" || typeof job.operatorApproxLng !== "number") return null;
  if (now - dateMillis(job.operatorLocationUpdatedAt) > 120000) return null;
  return { latitude: job.operatorApproxLat, longitude: job.operatorApproxLng, radiusM: Math.max(100, (job.operatorLocationRadiusKm || 0.1) * 1000) };
}
