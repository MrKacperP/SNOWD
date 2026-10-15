"use client";

import { DirectionsRenderer, GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { House, Shovel } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LIBRARIES, hasGoogleMapsApiKey } from "@/lib/googleMaps";
import { Job, UserProfile } from "@/lib/types";

const mapStyle = { width: "100%", height: "100%" };
const mapOptions: google.maps.MapOptions = { disableDefaultUI: true, zoomControl: true, clickableIcons: false, gestureHandling: "cooperative" };
const coords = (lat?: number | null, lng?: number | null) => Number.isFinite(lat) && Number.isFinite(lng) ? { lat: lat as number, lng: lng as number } : null;
const addressOf = (value: Pick<UserProfile, "address" | "city" | "province" | "postalCode">) => [value.address, value.city, value.province, value.postalCode].filter(Boolean).join(", ");
const jobAddress = (job: Job) => [job.address, job.city, job.province, job.postalCode].filter(Boolean).join(", ");

export default function DashboardMap({ profile, job, role }: { profile: UserProfile | null; job?: Job; role: "client" | "operator" }) {
  const home = coords(profile?.lat, profile?.lng);
  const origin = home || (profile?.address ? addressOf(profile) : "");
  const destination = job ? coords(job.clientLat, job.clientLng) || jobAddress(job) : null;
  const sameProperty = role === "client" && job && addressOf(profile || { address: "", city: "", province: "", postalCode: "" }).toLowerCase() === jobAddress(job).toLowerCase();
  const hasRoute = Boolean(origin && destination && job && !sameProperty);
  const label = role === "client" ? "Your home" : "Your location";
  const routeLabel = job?.status === "pending" ? "Work order route" : "Next visit route";
  const Icon = role === "client" ? House : Shovel;
  const mapLink = hasRoute
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(typeof origin === "string" ? origin : `${origin.lat},${origin.lng}`)}&destination=${encodeURIComponent(typeof destination === "string" ? destination : `${destination?.lat},${destination?.lng}`)}`
    : origin ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(typeof origin === "string" ? origin : `${origin.lat},${origin.lng}`)}` : null;

  return <section className="dashboard-location" aria-label={hasRoute ? "Route to your next visit" : label}>
    <div className="dashboard-location-map">
      {origin ? hasGoogleMapsApiKey
        ? <LiveDashboardMap origin={origin} destination={hasRoute ? destination : null} role={role} />
        : <iframe title={hasRoute ? "Route to your next visit" : label} loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={hasRoute ? `https://maps.google.com/maps?saddr=${encodeURIComponent(typeof origin === "string" ? origin : `${origin.lat},${origin.lng}`)}&daddr=${encodeURIComponent(typeof destination === "string" ? destination as string : `${destination?.lat},${destination?.lng}`)}&output=embed` : `https://maps.google.com/maps?q=${encodeURIComponent(typeof origin === "string" ? origin : `${origin.lat},${origin.lng}`)}&z=15&output=embed`} />
        : <div className="dashboard-location-unset">Add your address in Profile to see your location.</div>}
      <span className="dashboard-location-pin" aria-hidden="true"><Icon size={19} strokeWidth={2.1} /></span>
    </div>
    <div className="dashboard-location-footer"><div><strong>{hasRoute ? routeLabel : label}</strong><span>{hasRoute ? jobAddress(job as Job) : origin ? (profile?.address || [profile?.city, profile?.province].filter(Boolean).join(", ")) : "Location unavailable"}</span></div>{mapLink && <a href={mapLink} target="_blank" rel="noreferrer">{hasRoute ? "Directions" : "Open map"} ↗</a>}</div>
  </section>;
}

function LiveDashboardMap({ origin, destination, role }: { origin: string | google.maps.LatLngLiteral; destination: string | google.maps.LatLngLiteral | null; role: "client" | "operator" }) {
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY, libraries: GOOGLE_MAPS_LIBRARIES });
  const [point, setPoint] = useState<google.maps.LatLngLiteral | null>(typeof origin === "string" ? null : origin);
  const [routeState, setRouteState] = useState<{ key: string; result: google.maps.DirectionsResult } | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const originKey = typeof origin === "string" ? origin : `${origin.lat},${origin.lng}`;
  const destinationKey = typeof destination === "string" ? destination : destination ? `${destination.lat},${destination.lng}` : "";
  useEffect(() => {
    if (!isLoaded) return;
    if (typeof origin !== "string") return;
    new google.maps.Geocoder().geocode({ address: origin }).then(result => {
      const place = result.results[0]?.geometry.location;
      setPoint(place ? { lat: place.lat(), lng: place.lng() } : null);
    }).catch(() => setPoint(null));
  }, [isLoaded, originKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const routeKey = `${originKey}|${destinationKey}`;
  const route = destination && routeState?.key === routeKey ? routeState.result : null;
  useEffect(() => {
    if (!isLoaded || !destination || !point) return;
    let active = true;
    new google.maps.DirectionsService().route({ origin: point, destination, travelMode: google.maps.TravelMode.DRIVING }).then(result => { if (active) setRouteState({ key: routeKey, result }); }).catch(() => {});
    return () => { active = false; };
  }, [isLoaded, point, routeKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (map && point && !route) { map.panTo(point); map.setZoom(15); } }, [map, point, route]);
  const markerIcon = useMemo(() => isLoaded ? { url: `data:image/svg+xml,${encodeURIComponent(role === "client" ? '<svg xmlns="http://www.w3.org/2000/svg" width="44" height="48" viewBox="0 0 44 48"><path d="M22 46S3 28 3 20a19 19 0 0 1 38 0c0 8-19 26-19 26Z" fill="#28516b" stroke="white" stroke-width="3"/><path d="m13 21 9-8 9 8M16 20v11h12V20M20 31v-8h4v8" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" width="44" height="48" viewBox="0 0 44 48"><path d="M22 46S3 28 3 20a19 19 0 0 1 38 0c0 8-19 26-19 26Z" fill="#28516b" stroke="white" stroke-width="3"/><path d="m17 13 12 14m-8-10-7 7m-1-3 5 5m11-1-4 4" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>')}`, scaledSize: new google.maps.Size(44, 48), anchor: new google.maps.Point(22, 46) } : undefined, [isLoaded, role]);
  if (!isLoaded || loadError || !point) return <div className="dashboard-location-unset">{loadError ? "Map unavailable" : "Loading map…"}</div>;
  return <GoogleMap mapContainerStyle={mapStyle} center={point || { lat: 43.6532, lng: -79.3832 }} zoom={15} options={mapOptions} onLoad={setMap} onUnmount={() => setMap(null)}>
    {route && <DirectionsRenderer directions={route} options={{ suppressMarkers: true, polylineOptions: { strokeColor: "#28516b", strokeWeight: 5, strokeOpacity: .88 } }} />}
    {point && <Marker position={point} title={role === "client" ? "Your home" : "Your location"} icon={markerIcon} />}
    {route && destination && <Marker position={route.routes[0].legs[0].end_location} title="Next visit" />}
  </GoogleMap>;
}
