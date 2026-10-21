"use client";

import Link from "next/link";
import SnowdMap from "@/components/SnowdMap";
import { useArrivalLabel } from "@/hooks/useArrivalLabel";
import { Job, UserProfile } from "@/lib/types";

const addressOf = (value: Pick<UserProfile, "address" | "city" | "province" | "postalCode">) => [value.address, value.city, value.province, value.postalCode].filter(Boolean).join(", ");
const locationOf = (lat?: number | null, lng?: number | null) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat!) <= 90 && Math.abs(lng!) <= 180 ? `${lat},${lng}` : "";

export default function DashboardMap({ profile, job, role, showVisitLink = true }: { profile: UserProfile | null; job?: Job; role: "client" | "operator"; showVisitLink?: boolean }) {
  const arrival = useArrivalLabel(job);
  const client = role === "client";
  const home = locationOf(profile?.lat, profile?.lng) || (profile?.address ? addressOf(profile) : "");
  const service = job ? locationOf(job.clientLat, job.clientLng) || (job.address ? addressOf(job) : "") : "";
  const location = service || home;
  const origin = !client && job && job.status !== "pending" && service && home !== service ? locationOf(job.operatorApproxLat, job.operatorApproxLng) || home : "";
  const label = client ? arrival : job ? (job.status === "pending" ? "Request location" : "Next visit") : "Your base location";
  const mapLink = origin ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(location)}&travelmode=driving` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  return <section className={`dashboard-location${client ? " dashboard-location-client" : ""}`} aria-label={client ? "Your visit map" : label}>
    <div className="dashboard-location-map">{location ? <SnowdMap location={location} origin={origin || undefined} client={client} label={label} /> : <div className="dashboard-location-unset">Add your address in Profile to see your location.</div>}</div>
    <div className="dashboard-location-footer"><div><strong>{client ? job?.status === "en-route" ? "Your operator is on the way" : job?.status === "in-progress" ? "Your visit is underway" : job?.status === "completed" ? "Your completed visit" : job?.status === "cancelled" ? "Visit cancelled" : job ? "Your upcoming visit" : "Ready for the next snowfall" : label}</strong><span>{client ? job?.status === "accepted" ? "Arrival time appears when your operator leaves." : job?.status === "en-route" ? "Estimated arrival · updates from your operator" : "Your home, taken care of." : service && job ? addressOf(job) : profile?.address || "Location unavailable"}</span></div>{client ? job && showVisitLink ? <Link href={`/dashboard/jobs/${job.id}`}>View visit →</Link> : !location ? <Link href="/dashboard/profile">Add address</Link> : null : location ? <a href={mapLink} target="_blank" rel="noreferrer">{origin ? "Directions" : "Open map"} ↗</a> : <Link href="/dashboard/profile">Add address</Link>}</div>
  </section>;
}
