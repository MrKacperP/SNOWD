"use client";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import ServiceLocationPicker from "@/components/ServiceLocationPicker";
import { useServiceLocation } from "@/context/ServiceLocationContext";
import { formatServiceAddress, type ServiceLocation } from "@/lib/serviceLocations";
import styles from "@/components/service-location.module.css";
import SnowdMap, { type MapPin, type Route } from "@/components/SnowdMap";
import { useOperatorPosition } from "./OperatorLocationTracker";
import { dateMillis } from "@/lib/workOrders";
import { Job, UserProfile } from "@/lib/types";

const addressOf = (value: Pick<UserProfile, "address" | "city" | "province" | "postalCode">) => [value.address, value.city, value.province, value.postalCode].filter(Boolean).join(", ");
const locationOf = (lat?: number | null, lng?: number | null) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat!) <= 90 && Math.abs(lng!) <= 180 ? `${lat},${lng}` : "";

export default function DashboardMap({ profile, job, role, showVisitLink = true, offer, onRoute, others = [], activeJobId, newJobIds = [], routeEnabled = true, selectedId, onSelect }: { profile: UserProfile | null; job?: Job; role: "client" | "operator"; showVisitLink?: boolean; others?: Job[]; activeJobId?: string | null; newJobIds?: string[]; routeEnabled?: boolean; selectedId?: string | null; onSelect?: (id?: string) => void; offer?: { href: string; title: string; detail: string; more?: number }; onRoute?: (route: Route | null) => void }) {
  const locations = useServiceLocation();
  const [editing,setEditing] = useState(false);
  const [preview,setPreview] = useState<ServiceLocation | null>(null);
  const [offerOpen,setOfferOpen] = useState(false);
  const offerId = useId();
  const { position } = useOperatorPosition();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  const client = role === "client";
  const selected = client ? locations?.location || profile : profile;
  const home = locationOf(selected?.lat, selected?.lng) || (selected?.address ? addressOf(selected) : "");
  const service = job ? locationOf(job.clientLat, job.clientLng) || (job.address ? addressOf(job) : "") : "";
  const live = !client && position ? locationOf(position.lat, position.lng) : "";
  const previewLocation = preview ? locationOf(preview.lat,preview.lng) || (preview.city && preview.postalCode ? formatServiceAddress(preview) : "") : "";
  const location = editing && previewLocation ? previewLocation : service || live || home;
  const markerAddress = editing && previewLocation ? formatServiceAddress(preview) : job ? addressOf(job) : formatServiceAddress(selected);
  const origin = !client && routeEnabled && job && service ? live || home : "";
  const recent = now - dateMillis(job?.operatorLocationUpdatedAt) < 120000;
  const sharing = client && job && ["accepted", "en-route"].includes(job.status);
  const approximateArea = sharing && recent && locationOf(job.operatorApproxLat, job.operatorApproxLng) ? { lat: job.operatorApproxLat!, lng: job.operatorApproxLng!, radius: Math.max(100, (job.operatorLocationRadiusKm || 0.1) * 1000) } : undefined;
  // Every other open order gets its own pin; the one being hovered in the list pings.
  const pins: MapPin[] = client ? [] : others.filter(other => other.id !== job?.id && Number.isFinite(other.clientLat) && Number.isFinite(other.clientLng)).map(other => ({ id: other.id, lat: other.clientLat!, lng: other.clientLng!, address: addressOf(other), active: other.id === activeJobId, isNew: newJobIds.includes(other.id) }));
  const label = client ? "Your home" : offer ? "New offer · reply needed" : job ? "Your next property" : "Your location";
  return <section className="dashboard-location" aria-label={client ? "Home and approximate operator area" : "Your location and assigned property"}>
    <div className="dashboard-location-map">{location ? <SnowdMap location={location} origin={origin || undefined} client={client} label={label} compact onRoute={origin ? onRoute : undefined} markerAddress={markerAddress} offer={!client && offer ? { selected: offerOpen, detailsId: offerId, onSelect: () => setOfferOpen(open => !open) } : undefined} approximateArea={editing ? undefined : approximateArea} pins={pins} mainId={job?.id} selectedId={selectedId} onSelect={client ? undefined : onSelect} pingMain={!!job && job.id === activeJobId} /> : <div className="dashboard-location-unset">Choose a service address to see its location.</div>}{client && showVisitLink && <button type="button" className={styles.mapAction} onClick={()=>{setPreview(null);setEditing(true);}}>Change address</button>}</div>
    {!client && offer && offerOpen && <div id={offerId} className={styles.offerDetails}><div><strong>{offer.title}</strong><span>{markerAddress}</span><span>{offer.detail}</span></div><Link href={offer.href} className={styles.offerLink}>View work order</Link></div>}
    {editing && <ServiceLocationPicker onPreview={setPreview} existingOrder={!!job} onClose={()=>{setEditing(false);setPreview(null);}} />}
  </section>;
}
