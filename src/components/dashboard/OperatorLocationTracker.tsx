"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { dateMillis } from "@/lib/workOrders";
import type { Job } from "@/lib/types";

type Position = { lat: number; lng: number };
const LocationContext = createContext<{ position: Position | null; message: string }>({ position: null, message: "" });
export const useOperatorPosition = () => useContext(LocationContext);

export default function OperatorLocationTracker({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const [jobId, setJobId] = useState<string>();
  const [position, setPosition] = useState<Position | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!user || profile?.role !== "operator") return;
    return onSnapshot(query(collection(db, "jobs"), where("operatorId", "==", user.uid)), snap => {
      const jobs = snap.docs.map(d => ({ ...d.data(), id: d.id } as Job));
      const active = jobs.filter(j => ["accepted", "en-route", "in-progress"].includes(j.status)).sort((a, b) => (dateMillis(a.scheduledDate) || dateMillis(a.createdAt)) - (dateMillis(b.scheduledDate) || dateMillis(b.createdAt)));
      const next = active.find(j => j.status === "in-progress") || active.find(j => j.status === "en-route") || active[0];
      setJobId(next?.status === "in-progress" ? undefined : next?.id);
    }, () => { setJobId(undefined); setMessage("Location sharing unavailable."); });
  }, [user, profile?.role]);
  useEffect(() => {
    if (!jobId || !user || profile?.role !== "operator") return;
    let active = true, lastSent = 0, pending = false;
    if (!navigator.geolocation) return;
    const watch = navigator.geolocation.watchPosition(async p => {
      if (!active) return;
      if (pending || Date.now() - lastSent < 20000) return;
      setPosition({ lat: p.coords.latitude, lng: p.coords.longitude });
      pending = true;
      try {
        const token = await user.getIdToken();
        if (!active) return;
        const response = await fetch("/api/jobs/location", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ jobId, lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }) });
        if (!response.ok) throw new Error();
        lastSent = Date.now();
        if (active) setMessage("Approximate location shared while this app is open.");
      } catch { if (active) setMessage("Location update failed. Retrying as you move."); }
      finally { pending = false; }
    }, () => { if (active) setMessage("Location unavailable. Allow location access to share your approach."); }, { enableHighAccuracy: true, maximumAge: 15000, timeout: 15000 });
    return () => { active = false; navigator.geolocation.clearWatch(watch); };
  }, [jobId, user, profile?.role]);
  return <LocationContext.Provider value={{ position: jobId && profile?.role === "operator" ? position : null, message: jobId ? message : "" }}>{children}</LocationContext.Provider>;
}
