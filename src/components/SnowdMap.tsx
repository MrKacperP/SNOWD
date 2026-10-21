"use client";

import { DirectionsRenderer, GoogleMap, OverlayView, useJsApiLoader } from "@react-google-maps/api";
import { useEffect, useMemo, useState } from "react";
import { House, Shovel, Snowflake } from "lucide-react";
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LIBRARIES, hasGoogleMapsApiKey } from "@/lib/googleMaps";
import styles from "./snowd-map.module.css";

export const SNOWD_MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: true, zoomControl: true, clickableIcons: false, gestureHandling: "cooperative",
  styles: [
    { elementType: "geometry", stylers: [{ color: "#edf2ef" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#63766f" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#f8faf9" }] },
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#dce5df" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#d4dfd7" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#cbdfe5" }] },
    { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#e0eadd" }] },
  ],
};
const containerStyle = { width: "100%", height: "100%" };
type Route = { minutes: number; distanceKm: number };
type Props = { location: string; origin?: string; client?: boolean; label?: string; onRoute?: (route: Route | null) => void };
const offset = (width: number, height: number) => ({ x: -width / 2, y: -height + 9 });

export default function SnowdMap(props: Props) {
  return <div className={styles.map}>
    {hasGoogleMapsApiKey ? <LiveMap key={`${props.location}|${props.origin || ""}`} {...props} /> : <div className={styles.unavailable}>Map preview unavailable</div>}
    <span className={styles.brand} aria-hidden="true"><Snowflake size={12} /> SNOWD</span>
  </div>;
}

function LiveMap({ location, origin, client, label = "Your home", onRoute }: Props) {
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY, libraries: GOOGLE_MAPS_LIBRARIES });
  const coordinates = useMemo(() => {
    const parts = location.split(",").map(Number);
    return parts.length === 2 && parts.every(Number.isFinite) && Math.abs(parts[0]) <= 90 && Math.abs(parts[1]) <= 180 ? { lat: parts[0], lng: parts[1] } : null;
  }, [location]);
  const [resolved, setResolved] = useState<google.maps.LatLngLiteral | null>(null);
  const point = coordinates || resolved;
  const [failed, setFailed] = useState(false);
  const [route, setRoute] = useState<google.maps.DirectionsResult | null>(null);
  useEffect(() => {
    if (!isLoaded || coordinates) return;
    let active = true;
      new google.maps.Geocoder().geocode({ address: location }).then(result => {
        const place = result.results[0]?.geometry.location;
        if (active) { setResolved(place ? place.toJSON() : null); setFailed(!place); }
      }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [isLoaded, location, coordinates]);
  useEffect(() => {
    onRoute?.(null);
    if (!isLoaded || !origin || client) return;
    let active = true;
    new google.maps.DirectionsService().route({ origin, destination: location, travelMode: google.maps.TravelMode.DRIVING, drivingOptions: { departureTime: new Date() } }).then(result => {
      if (!active) return;
      setRoute(result);
      const leg = result.routes[0]?.legs[0];
      const duration = leg?.duration_in_traffic?.value || leg?.duration?.value;
      onRoute?.(duration ? { minutes: Math.ceil(duration / 60), distanceKm: Math.round((leg?.distance?.value || 0) / 100) / 10 } : null);
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [isLoaded, origin, location, client, onRoute]);
  if (loadError || (!point && failed)) return <div className={styles.unavailable}>Map preview unavailable</div>;
  if (!isLoaded || !point) return <div className={styles.unavailable} role="status">Finding your location…</div>;
  const start = route?.routes[0]?.legs[0]?.start_location;
  return <>
    <GoogleMap mapContainerStyle={containerStyle} center={point} zoom={16} options={SNOWD_MAP_OPTIONS}>
      {route && <DirectionsRenderer directions={route} options={{ suppressMarkers: true, polylineOptions: { strokeColor: "#287057", strokeWeight: 5, strokeOpacity: .8 } }} />}
      <OverlayView position={point} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET} getPixelPositionOffset={offset}>
        <div className={styles.marker}>
          {client ? <><span className={styles.eta} role="status" key={label}>{label}</span><span className={styles.ping} aria-label="Your service location" /></> : <span className={styles.operatorPin} aria-label="Service property"><House size={20} /></span>}
        </div>
      </OverlayView>
      {start && <OverlayView position={start} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET} getPixelPositionOffset={offset}><span className={styles.operatorPin} aria-label="Route starting point"><Shovel size={20} /></span></OverlayView>}
    </GoogleMap>
    <div className={styles.snow} aria-hidden="true"><i /><i /><i /><i /><i /></div>
    {failed && origin && <span className={styles.notice}>Route unavailable · use Directions</span>}
  </>;
}
