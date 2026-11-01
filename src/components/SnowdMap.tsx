"use client";

import { Circle, GoogleMap, OverlayView, Polyline, useJsApiLoader } from "@react-google-maps/api";
import { useEffect, useId, useMemo, useState } from "react";
import { Car, House, Shovel, Snowflake } from "lucide-react";
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
/** Other work orders shown alongside the main property; the active one pings. */
export type MapPin = { id: string; lat: number; lng: number; address?: string; active?: boolean; isNew?: boolean };
type Props = { pins?: MapPin[]; pingMain?: boolean; offer?: MapOffer; markerAddress?: string; onLocationResolved?: (point: google.maps.LatLngLiteral) => void; location: string; origin?: string; client?: boolean; label?: string; onRoute?: (route: Route | null) => void; compact?: boolean; approximateArea?: { lat: number; lng: number; radius: number } };
type RoutePath = { path: google.maps.LatLngLiteral[]; summary: Route; estimated: boolean };
type RoutesLibrary = { Route: { computeRoutes: (request: Record<string, unknown>) => Promise<{ routes?: Array<{ path?: Array<{ lat: number; lng: number }>; durationMillis?: number | null; distanceMeters?: number | null }> }> } };

const parsePoint = (value: string) => {
  const parts = value.split(",").map(Number);
  return parts.length === 2 && parts.every(Number.isFinite) && Math.abs(parts[0]) <= 90 && Math.abs(parts[1]) <= 180 ? { lat: parts[0], lng: parts[1] } : null;
};
const toPoint = async (value: string) => {
  const parsed = parsePoint(value);
  if (parsed) return parsed;
  const place = (await new google.maps.Geocoder().geocode({ address: value })).results[0]?.geometry.location;
  return place ? place.toJSON() : null;
};

/** Routes library (replaces the deprecated DirectionsService); falls back to a straight-line estimate so the map always shows the trip. */
async function computeRoute(origin: string, destination: google.maps.LatLngLiteral, travelMode: "DRIVING" | "WALKING"): Promise<RoutePath | null> {
  try {
    const { Route } = await google.maps.importLibrary("routes") as unknown as RoutesLibrary;
    const { routes } = await Route.computeRoutes({
      origin: parsePoint(origin) || origin, destination, travelMode,
      ...(travelMode === "DRIVING" ? { routingPreference: "TRAFFIC_AWARE" } : {}),
      fields: ["path", "durationMillis", "distanceMeters"],
    });
    const best = routes?.[0];
    if (best?.path?.length && best.durationMillis) return {
      // Roads end at the curb; finish the line at the property itself.
      path: [...best.path.map(point => ({ lat: point.lat, lng: point.lng })), destination],
      summary: { minutes: Math.max(1, Math.ceil(best.durationMillis / 60000)), distanceKm: Math.round((best.distanceMeters || 0) / 100) / 10 },
      estimated: false,
    };
  } catch (error) {
    console.warn("Routes library unavailable; estimating the trip.", error);
  }
  const start = await toPoint(origin).catch(() => null);
  if (!start) return null;
  const roadKm = google.maps.geometry.spherical.computeDistanceBetween(start, destination) / 1000 * 1.25;
  const speed = travelMode === "DRIVING" ? 35 : 5;
  return { path: [start, destination], summary: { minutes: Math.max(travelMode === "DRIVING" ? 3 : 1, Math.ceil(roadKm / speed * 60 + (travelMode === "DRIVING" ? 2 : 0))), distanceKm: Math.round(roadKm * 10) / 10 }, estimated: true };
}

// Anchor markers in CSS: Google measures overlay size before React paints, which can report 0 and drop pins off the map.
const offset = () => ({ x: 0, y: 0 });

export default function SnowdMap(props: Props) {
  return <div className={styles.map}>
    {hasGoogleMapsApiKey ? <LiveMap key={`${props.location}|${props.origin || ""}`} {...props} /> : <div className={styles.unavailable}>Map preview unavailable</div>}
    <span className={styles.brand} aria-hidden="true"><Snowflake size={12} /> SNOWD</span>
  </div>;
}

function LiveMap({ pins = [], pingMain = false, location, origin, client, label = "Your home", onRoute, compact, approximateArea, markerAddress, onLocationResolved, offer }: Props) {
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
  const pinKey = pins.map(pin => `${pin.id}:${pin.lat},${pin.lng}`).join("|");
  const [failed, setFailed] = useState(false);
  const [route, setRoute] = useState<RoutePath | null>(null);
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
    if (!isLoaded || !origin || client || !point) return;
    let active = true;
    void computeRoute(origin, point, "DRIVING").then(result => {
      if (!active) return;
      setRoute(result);
      onRoute?.(result?.summary || null);
      if (compact && result && onRoute) void computeRoute(origin, point, "WALKING").then(walking => {
        if (active && walking) onRoute({ ...result.summary, walkingMinutes: walking.summary.minutes });
      });
    });
    return () => { active = false; };
  }, [isLoaded, origin, point, client, onRoute, compact]);
  // Frame the whole trip so both the operator and the property are visible. Pins stand above their
  // point, so the top gets extra room; very short trips zoom in (capped) so the line still shows between them.
  useEffect(() => {
    if (!map || !route || route.path.length < 2 || !point) return;
    const bounds = new google.maps.LatLngBounds();
    route.path.forEach(step => bounds.extend(step));
    bounds.extend(point);
    pins.forEach(pin => bounds.extend(pin));
    map.fitBounds(bounds, compact ? { top: 64, right: 44, bottom: 20, left: 44 } : { top: 80, right: 64, bottom: 40, left: 64 });
    // Close by, both pins can land on top of each other: zoom in until the operator and the property sit a pin apart.
    const settle = google.maps.event.addListenerOnce(map, "idle", () => {
      const projection = map.getProjection();
      const start = route.path[0];
      let zoom = Math.min(19, map.getZoom() || 16);
      if (projection) {
        const a = projection.fromLatLngToPoint(start)!, b = projection.fromLatLngToPoint(point)!;
        const gap = Math.hypot(a.x - b.x, a.y - b.y);
        while (gap * 2 ** zoom < 80 && zoom < 20) zoom++;
        if (gap * 2 ** (map.getZoom() || 16) < 80) map.setCenter({ lat: (start.lat + point.lat) / 2, lng: (start.lng + point.lng) / 2 });
      }
      if (zoom !== map.getZoom()) map.setZoom(zoom);
    });
    return () => settle.remove();
    // Pins only move the frame when an order is added or removed, not on hover.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, route, compact, point, pinKey]);
  // Without a route, still frame every order on the map.
  useEffect(() => {
    if (!map || route || !point || !pins.length) return;
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(point);
    pins.forEach(pin => bounds.extend(pin));
    map.fitBounds(bounds, { top: 64, right: 44, bottom: 20, left: 44 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, route, point, pinKey]);
  if (loadError || (!point && failed)) return <div className={styles.unavailable}>Map preview unavailable</div>;
  if (!isLoaded || !point) return <div className={styles.unavailable} role="status">Finding your location…</div>;
  const start = route?.path[0];
  return <>
    <GoogleMap mapContainerStyle={containerStyle} center={point} zoom={16} onLoad={setMap} options={compact ? { ...SNOWD_MAP_OPTIONS, zoomControl: false, keyboardShortcuts: false, gestureHandling: "none" } : SNOWD_MAP_OPTIONS}>
      {client && approximateArea && <PulsingArea area={approximateArea} />}
      {!client && route && <Polyline path={route.path} options={route.estimated
        ? { strokeOpacity: 0, icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: .85, strokeColor: "#287057", scale: 3 }, offset: "0", repeat: "14px" }], clickable: false }
        : { strokeColor: "#287057", strokeWeight: 5, strokeOpacity: .85, clickable: false }} />}
      <OverlayView position={point} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET} getPixelPositionOffset={offset}>
        <div className={`${styles.anchor} ${styles.marker}`} data-ping={pingMain || undefined}>
          {client && !compact ? <><span className={styles.eta} role="status" key={label}>{label}</span><span className={styles.ping} aria-label="Your service location" /></> : offer ? <OfferPin offer={offer} address={markerAddress} /> : <AddressPin address={markerAddress} />}
        </div>
      </OverlayView>
      {!client && pins.map(pin => <OverlayView key={pin.id} position={pin} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET} getPixelPositionOffset={offset}>
        <div className={`${styles.anchor} ${styles.marker}`} data-ping={pin.active || undefined}><AddressPin address={pin.address} small isNew={pin.isNew} /></div>
      </OverlayView>)}
      {!client && start && <OverlayView position={start} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET} getPixelPositionOffset={offset}><div className={styles.anchor}><span className={styles.operatorPin} aria-label="Route starting point"><Shovel size={20} /></span></div></OverlayView>}
    </GoogleMap>
    {!compact && <div className={styles.snow} aria-hidden="true"><i /><i /><i /><i /><i /></div>}
    {!client && route && <span className={styles.routeChip} role="status"><Car size={14} aria-hidden="true" />{route.estimated ? "~" : ""}{route.summary.minutes} min · {route.summary.distanceKm} km</span>}
    {!client && origin && !route && failed && <span className={styles.notice}>Travel estimate unavailable</span>}
  </>;
}

function AddressPin({address,small,isNew}:{address?:string;small?:boolean;isNew?:boolean}) {
  const [open,setOpen]=useState(false);
  const id=useId();
  return <div className={styles.addressMarker} onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)}>
    <button type="button" className={`${styles.operatorPin} ${small ? styles.smallPin : ""}`} data-new={isNew || undefined} aria-label={address ? `Show address: ${address}` : "Service property"} aria-expanded={open} aria-describedby={open && address ? id : undefined} onClick={()=>setOpen(true)} onFocus={()=>setOpen(true)} onBlur={()=>setOpen(false)} onKeyDown={e=>{if(e.key === "Escape"){e.stopPropagation();setOpen(false);}}}><House size={small ? 16 : 20} /></button>
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
