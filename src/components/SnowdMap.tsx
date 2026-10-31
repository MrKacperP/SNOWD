"use client";

import { Circle, DirectionsRenderer, GoogleMap, OverlayView, useJsApiLoader } from "@react-google-maps/api";
import { useEffect, useId, useMemo, useState } from "react";
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
export type Route = { minutes: number; distanceKm: number; walkingMinutes?: number };
export type MapOffer = { selected: boolean; detailsId: string; onSelect: () => void };
type Props = { offer?: MapOffer; markerAddress?: string; onLocationResolved?: (point: google.maps.LatLngLiteral) => void; location: string; origin?: string; client?: boolean; label?: string; onRoute?: (route: Route | null) => void; compact?: boolean; approximateArea?: { lat: number; lng: number; radius: number } };
// Anchor markers in CSS: Google measures overlay size before React paints, which can report 0 and drop pins off the map.
const offset = () => ({ x: 0, y: 0 });

export default function SnowdMap(props: Props) {
  return <div className={styles.map}>
    {hasGoogleMapsApiKey ? <LiveMap key={`${props.location}|${props.origin || ""}`} {...props} /> : <div className={styles.unavailable}>Map preview unavailable</div>}
    <span className={styles.brand} aria-hidden="true"><Snowflake size={12} /> SNOWD</span>
  </div>;
}

function LiveMap({ location, origin, client, label = "Your home", onRoute, compact, approximateArea, markerAddress, onLocationResolved, offer }: Props) {
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY, libraries: GOOGLE_MAPS_LIBRARIES });
  const coordinates = useMemo(() => {
    const parts = location.split(",").map(Number);
    return parts.length === 2 && parts.every(Number.isFinite) && Math.abs(parts[0]) <= 90 && Math.abs(parts[1]) <= 180 ? { lat: parts[0], lng: parts[1] } : null;
  }, [location]);
  const [resolved, setResolved] = useState<google.maps.LatLngLiteral | null>(null);
  const point = coordinates || resolved;
  useEffect(() => { if (point) onLocationResolved?.(point); }, [point, onLocationResolved]);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  useEffect(() => {
    if (!map || !point || !approximateArea) return;
    const bounds = new google.maps.Circle({ center: approximateArea, radius: approximateArea.radius }).getBounds();
    if (bounds) { bounds.extend(point); map.fitBounds(bounds, 32); }
  }, [map, point, approximateArea]);
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
      const summary = duration ? { minutes: Math.ceil(duration / 60), distanceKm: Math.round((leg?.distance?.value || 0) / 100) / 10 } : null;
      onRoute?.(summary);
      if (compact && summary) new google.maps.DirectionsService().route({ origin, destination: location, travelMode: google.maps.TravelMode.WALKING }).then(walking => {
        if (active) onRoute?.({ ...summary, walkingMinutes: Math.ceil((walking.routes[0]?.legs[0]?.duration?.value || 0) / 60) || undefined });
      }).catch(() => {});
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [isLoaded, origin, location, client, onRoute, compact]);
  if (loadError || (!point && failed)) return <div className={styles.unavailable}>Map preview unavailable</div>;
  if (!isLoaded || !point) return <div className={styles.unavailable} role="status">Finding your location…</div>;
  const start = route?.routes[0]?.legs[0]?.start_location;
  return <>
    <GoogleMap mapContainerStyle={containerStyle} center={point} zoom={16} onLoad={setMap} options={compact ? { ...SNOWD_MAP_OPTIONS, zoomControl: false, keyboardShortcuts: false, gestureHandling: "none" } : SNOWD_MAP_OPTIONS}>
      {client && approximateArea && <PulsingArea area={approximateArea} />}
      {!client && route && <DirectionsRenderer directions={route} options={{ suppressMarkers: true, polylineOptions: { strokeColor: "#287057", strokeWeight: 5, strokeOpacity: .8 } }} />}
      <OverlayView position={point} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET} getPixelPositionOffset={offset}>
        <div className={`${styles.anchor} ${styles.marker}`}>
          {client && !compact ? <><span className={styles.eta} role="status" key={label}>{label}</span><span className={styles.ping} aria-label="Your service location" /></> : offer ? <OfferPin offer={offer} address={markerAddress} /> : <AddressPin address={markerAddress} />}
        </div>
      </OverlayView>
      {!client && start && <OverlayView position={start} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET} getPixelPositionOffset={offset}><div className={styles.anchor}><span className={styles.operatorPin} aria-label="Route starting point"><Shovel size={20} /></span></div></OverlayView>}
    </GoogleMap>
    {!compact && <div className={styles.snow} aria-hidden="true"><i /><i /><i /><i /><i /></div>}
    {failed && origin && <span className={styles.notice}>Travel estimate unavailable</span>}
  </>;
}

function AddressPin({address}:{address?:string}) {
  const [open,setOpen]=useState(false);
  const id=useId();
  return <div className={styles.addressMarker} onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)}>
    <button type="button" className={styles.operatorPin} aria-label={address ? `Show address: ${address}` : "Service property"} aria-expanded={open} aria-describedby={open && address ? id : undefined} onClick={()=>setOpen(true)} onFocus={()=>setOpen(true)} onBlur={()=>setOpen(false)} onKeyDown={e=>{if(e.key === "Escape"){e.stopPropagation();setOpen(false);}}}><House size={20} /></button>
    {open && address && <span id={id} role="tooltip" className={styles.addressTooltip}>{address}</span>}
  </div>;
}

function OfferPin({offer,address}:{offer:MapOffer;address?:string}) {
  return <div className={styles.addressMarker}>
    {!offer.selected && <span className={styles.offerChip} aria-hidden="true">New offer</span>}
    <button type="button" className={`${styles.operatorPin} ${styles.offerPin}`} aria-label={`New offer${address ? ` at ${address}` : ""}. Show details`} aria-expanded={offer.selected} aria-controls={offer.detailsId} onClick={offer.onSelect}><House size={20} /></button>
  </div>;
}

// Google circles can't use CSS animation, so the operator's area breathes and sends out a fading ring frame by frame.
function PulsingArea({area}:{area:{lat:number;lng:number;radius:number}}) {
  const [phase,setPhase]=useState(0);
  useEffect(()=>{
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame=0;
    const start=performance.now();
    const tick=(now:number)=>{setPhase(((now-start)%1800)/1800);frame=requestAnimationFrame(tick);};
    frame=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(frame);
  },[]);
  const breathe=(1-Math.cos(phase*Math.PI*2))/2;
  return <>
    <Circle center={area} radius={area.radius} options={{ strokeColor:"#287057", strokeWeight:2, strokeOpacity:.6+.4*breathe, fillColor:"#287057", fillOpacity:.12+.12*breathe, clickable:false }} />
    {phase > 0 && <Circle center={area} radius={area.radius*(1+.6*phase)} options={{ strokeColor:"#287057", strokeWeight:2, strokeOpacity:.7*(1-phase), fillOpacity:0, clickable:false }} />}
  </>;
}
