"use client";

import { Circle, GoogleMap, OverlayView, useGoogleMap, useJsApiLoader } from "@react-google-maps/api";
import { useEffect, useId, useMemo, useState } from "react";
import { ArrowUp, Car, House, Snowflake } from "lucide-react";
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LIBRARIES, hasGoogleMapsApiKey } from "@/lib/googleMaps";
import type { OperatorServiceArea } from "@/lib/types";
import styles from "./snowd-map.module.css";

/** Where an operator works: a radius around their home, or a set of cities. Drawn in the map's own green. */
export type ServiceAreaShape = { mode: "radius" | "cities"; center?: google.maps.LatLngLiteral | null; radiusKm?: number; cities?: OperatorServiceArea[]; outside?: boolean };
const AREA_GREEN = "#287057", AREA_RED = "#c42b1c";

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
export type Route = { minutes: number; distanceKm: number; walkingMinutes?: number; to?: { lat: number; lng: number } };
export type MapOffer = { selected: boolean; detailsId: string; onSelect: () => void };
/** Other work orders shown alongside the main property; the active one pings. */
export type MapPin = { id: string; lat: number; lng: number; address?: string; active?: boolean; isNew?: boolean };
type Props = { onSelect?: (id?: string) => void; selectedId?: string | null; mainId?: string; pins?: MapPin[]; pingMain?: boolean; offer?: MapOffer; markerAddress?: string; onLocationResolved?: (point: google.maps.LatLngLiteral) => void; location: string; origin?: string; client?: boolean; label?: string; onRoute?: (route: Route | null) => void; compact?: boolean; approximateArea?: { lat: number; lng: number; radius: number }; serviceArea?: ServiceAreaShape };
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
      summary: { minutes: Math.max(1, Math.ceil(best.durationMillis / 60000)), distanceKm: Math.round((best.distanceMeters || 0) / 100) / 10, to: destination },
      estimated: false,
    };
  } catch (error) {
    console.warn("Routes library unavailable; estimating the trip.", error);
  }
  const start = await toPoint(origin).catch(() => null);
  if (!start) return null;
  const roadKm = google.maps.geometry.spherical.computeDistanceBetween(start, destination) / 1000 * 1.25;
  const speed = travelMode === "DRIVING" ? 35 : 5;
  return { path: [start, destination], summary: { minutes: Math.max(travelMode === "DRIVING" ? 3 : 1, Math.ceil(roadKm / speed * 60 + (travelMode === "DRIVING" ? 2 : 0))), distanceKm: Math.round(roadKm * 10) / 10, to: destination }, estimated: true };
}

/** The point halfway along the route's length, where the ETA label sits. */
function routeMidpoint(path: google.maps.LatLngLiteral[], t0 = .5) {
  const lengths = path.slice(1).map((step, i) => Math.hypot(step.lat - path[i].lat, step.lng - path[i].lng));
  let left = lengths.reduce((sum, length) => sum + length, 0) * t0;
  for (let i = 0; i < lengths.length; i++) {
    if (left <= lengths[i] || i === lengths.length - 1) {
      const t = lengths[i] ? Math.min(1, left / lengths[i]) : 0;
      return { lat: path[i].lat + (path[i + 1].lat - path[i].lat) * t, lng: path[i].lng + (path[i + 1].lng - path[i].lng) * t };
    }
    left -= lengths[i];
  }
  return path[0];
}

// Anchor markers in CSS: Google measures overlay size before React paints, which can report 0 and drop pins off the map.
const offset = () => ({ x: 0, y: 0 });

export default function SnowdMap(props: Props) {
  return <div className={styles.map}>
    {hasGoogleMapsApiKey ? <LiveMap {...props} /> : <div className={styles.unavailable}>Map preview unavailable</div>}
    <span className={styles.brand} aria-hidden="true"><Snowflake size={12} /> SNOWD</span>
  </div>;
}

function LiveMap({ onSelect, selectedId, mainId, pins = [], pingMain = false, location, origin, client, label = "Your home", onRoute, compact, approximateArea, serviceArea, markerAddress, onLocationResolved, offer }: Props) {
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY, libraries: GOOGLE_MAPS_LIBRARIES });
  const coordinates = useMemo(() => {
    const parts = location.split(",").map(Number);
    return parts.length === 2 && parts.every(Number.isFinite) && Math.abs(parts[0]) <= 90 && Math.abs(parts[1]) <= 180 ? { lat: parts[0], lng: parts[1] } : null;
  }, [location]);
  const [resolved, setResolved] = useState<{ for: string; point: google.maps.LatLngLiteral } | null>(null);
  // A geocoded point only counts for the address it was found for, so switching orders never keeps the old location.
  const point = coordinates || (resolved?.for === location ? resolved.point : null);
  useEffect(() => { if (point) onLocationResolved?.(point); }, [point, onLocationResolved]);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  useEffect(() => {
    if (!map || !point || !approximateArea) return;
    const bounds = new google.maps.Circle({ center: approximateArea, radius: approximateArea.radius }).getBounds();
    if (bounds) { bounds.extend(point); map.fitBounds(bounds, 32); }
  }, [map, point, approximateArea]);
  // Frame the property together with the operator's coverage, so the client sees where it sits.
  const areaKey = serviceArea ? `${serviceArea.mode}:${serviceArea.center?.lat},${serviceArea.center?.lng}:${serviceArea.radiusKm}:${serviceArea.cities?.map(city => city.placeId).join(",")}` : "";
  useEffect(() => {
    if (!map || !point || !serviceArea) return;
    const bounds = serviceAreaBounds(serviceArea);
    if (!bounds) return;
    bounds.extend(point);
    map.fitBounds(bounds, { top: 44, right: 20, bottom: 20, left: 20 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, point, areaKey]);
  const pinKey = pins.map(pin => `${pin.id}:${pin.lat},${pin.lng}`).join("|");
  const [failed, setFailed] = useState(false);
  const [routeState, setRoute] = useState<RoutePath | null>(null);
  // Only ever draw the route that ends at the order on screen; a leftover from another order is dropped.
  const route = routeState && point && routeState.summary.to && Math.abs(routeState.summary.to.lat - point.lat) < 1e-6 && Math.abs(routeState.summary.to.lng - point.lng) < 1e-6 ? routeState : null;
  useEffect(() => {
    if (!isLoaded || coordinates) return;
    setFailed(false);
    let active = true;
      new google.maps.Geocoder().geocode({ address: location }).then(result => {
        const place = result.results[0]?.geometry.location;
        if (active) { setResolved(place ? { for: location, point: place.toJSON() } : null); setFailed(!place); }
      }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [isLoaded, location, coordinates]);
  useEffect(() => {
    onRoute?.(null);
    setRoute(null);
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
  // Zoom to just the trip so the operator and the property fill the map. Pins stand above their
  // point, so the top gets extra room; very short trips zoom in (capped) so the line still shows between them.
  useEffect(() => {
    if (!map || !route || route.path.length < 2 || !point) return;
    const bounds = new google.maps.LatLngBounds();
    route.path.forEach(step => bounds.extend(step));
    bounds.extend(point);
    map.fitBounds(bounds, compact ? { top: 56, right: 28, bottom: 14, left: 28 } : { top: 80, right: 64, bottom: 40, left: 64 });
    // Close by, both pins can land on top of each other: zoom in until the operator and the property sit a pin apart.
    // Other orders stay out of the frame; arrows at the edge point to them instead.
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
  }, [map, route, compact, point]);
  // Without a route, still frame every order on the map.
  useEffect(() => {
    if (!map || route || !point || !pins.length) return;
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(point);
    pins.forEach(pin => bounds.extend(pin));
    map.fitBounds(bounds, { top: 56, right: 28, bottom: 14, left: 28 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, route, point, pinKey]);
  // Spacing: pins that land on top of each other at this zoom are nudged apart in pixel space (the route and
  // ETA stay anchored to the real points), and the ETA label slides along the route to the clearest spot.
  const [tick, setTick] = useState(0);
  useEffect(() => { if (!map) return; const l = google.maps.event.addListener(map, "idle", () => setTick(t => t + 1)); return () => l.remove(); }, [map]);
  const layout = useMemo(() => {
    const projection = map?.getProjection(), zoom = map?.getZoom();
    type Arrow = { id: string; address?: string; active?: boolean; isNew?: boolean; x: number; y: number; angle: number };
    if (!projection || !zoom || !point) return { offsets: {} as Record<string, { x: number; y: number }>, mid: null as google.maps.LatLngLiteral | null, arrows: [] as Arrow[], hidden: new Set<string>() };
    const px = (ll: google.maps.LatLngLiteral) => { const p = projection.fromLatLngToPoint(ll)!, k = 2 ** zoom; return { x: p.x * k, y: p.y * k }; };
    // Zoomed in on a trip, orders outside the frame become edge arrows instead of pins.
    const arrows: Arrow[] = [], hidden = new Set<string>();
    const div = map?.getDiv(), center = map?.getCenter();
    if (route && !client && div?.clientWidth && center) {
      const w = div.clientWidth, h = div.clientHeight, m = 30, c = px(center.toJSON());
      for (const pin of pins) {
        const p = px(pin), rx = p.x - c.x, ry = p.y - c.y;
        if (Math.abs(rx) <= w / 2 - 16 && ry >= -h / 2 + 56 && ry <= h / 2 - 8) continue;
        const k = Math.min((w / 2 - m) / (Math.abs(rx) || 1e-6), (h / 2 - m) / (Math.abs(ry) || 1e-6));
        hidden.add(pin.id);
        arrows.push({ id: pin.id, address: pin.address, active: pin.active, isNew: pin.isNew, x: w / 2 + rx * k, y: h / 2 + ry * k, angle: Math.atan2(ry, rx) * 180 / Math.PI + 90 });
      }
    }
    const items = [{ key: "main", at: point }, ...(route?.path[0] && !client ? [{ key: "start", at: route.path[0] }] : []), ...(client ? [] : pins.filter(pin => !hidden.has(pin.id)).map(pin => ({ key: pin.id, at: { lat: pin.lat, lng: pin.lng } })))].map(item => ({ key: item.key, ...px(item.at), dx: 0, dy: 0 }));
    const W = 46, H = 52;
    for (let pass = 0; pass < 40; pass++) {
      let moved = false;
      for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
        const a = items[i], b = items[j];
        let vx = (b.x + b.dx) - (a.x + a.dx), vy = (b.y + b.dy) - (a.y + a.dy);
        if (Math.abs(vx) >= W || Math.abs(vy) >= H) continue;
        if (!vx && !vy) { vx = Math.cos(j * 2.4); vy = Math.sin(j * 2.4); }
        // Push along the shorter way out of the overlap.
        const px2 = W - Math.abs(vx), py2 = H - Math.abs(vy);
        const [sx, sy] = px2 <= py2 ? [Math.sign(vx || 1) * (px2 / 2 + 1), 0] : [0, Math.sign(vy || 1) * (py2 / 2 + 1)];
        a.dx -= sx; a.dy -= sy; b.dx += sx; b.dy += sy; moved = true;
      }
      if (!moved) break;
    }
    const offsets = Object.fromEntries(items.map(item => [item.key, { x: Math.round(item.dx), y: Math.round(item.dy) }]));
    let mid: google.maps.LatLngLiteral | null = null;
    if (route && route.path.length > 1) {
      const spots = [.5, .4, .6, .3, .7].map(t => routeMidpoint(route.path, t));
      const clearance = (ll: google.maps.LatLngLiteral) => { const c = px(ll); return Math.min(...items.map(item => Math.hypot(item.x + item.dx - c.x, item.y + item.dy - 20 - c.y)), 999); };
      mid = spots.find(spot => clearance(spot) > 80) || spots.reduce((best, spot) => clearance(spot) > clearance(best) ? spot : best);
    }
    return { offsets, mid, arrows, hidden };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, map, point, route, client, pinKey]);
  const nudge = (key: string) => { const o = layout.offsets[key]; return o && (o.x || o.y) ? { translate: `${o.x}px ${o.y}px` } : undefined; };
  if (loadError || (!point && failed)) return <div className={styles.unavailable}>Map preview unavailable</div>;
  if (!isLoaded || !point) return <div className={styles.unavailable} role="status">Finding your location…</div>;
  const start = route?.path[0];
  const mid = layout.mid;
  return <>
    <GoogleMap mapContainerStyle={containerStyle} center={point} zoom={16} onLoad={setMap} options={compact ? { ...SNOWD_MAP_OPTIONS, zoomControl: false, keyboardShortcuts: false, gestureHandling: "none" } : SNOWD_MAP_OPTIONS}>
      {client && approximateArea && <PulsingArea area={approximateArea} />}
      {serviceArea && <ServiceAreaShapes area={serviceArea} />}
      {!client && map && route && <RouteLine map={map} route={route} />}
      <OverlayView position={point} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET} getPixelPositionOffset={offset}>
        <div className={`${styles.anchor} ${styles.marker}`} data-ping={pingMain || undefined} style={nudge("main")}>
          {client && !compact ? <><span className={styles.eta} role="status" key={label}>{label}</span><span className={styles.ping} aria-label="Your service location" /></> : offer ? <OfferPin offer={offer} address={markerAddress} quiet={pins.length > 0} onSelect={onSelect && mainId ? () => onSelect(mainId) : undefined} /> : <AddressPin address={markerAddress} selected={!!mainId && mainId === selectedId} onSelect={onSelect && mainId ? () => onSelect(mainId) : undefined} />}
        </div>
      </OverlayView>
      {!client && pins.filter(pin => !layout.hidden.has(pin.id)).map(pin => <OverlayView key={pin.id} position={pin} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET} getPixelPositionOffset={offset}>
        <div className={`${styles.anchor} ${styles.marker}`} data-ping={pin.active || undefined} style={nudge(pin.id)}><AddressPin address={pin.address} small isNew={pin.isNew} onSelect={onSelect ? () => onSelect(pin.id) : undefined} /></div>
      </OverlayView>)}
      {!client && route && mid && <OverlayView position={mid} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET} getPixelPositionOffset={offset}><div className={styles.anchor}><span className={styles.etaOnRoute} role="status"><Car size={12} aria-hidden="true" />{route.estimated ? "~" : ""}{route.summary.minutes} min · {route.summary.distanceKm} km</span></div></OverlayView>}
      {!client && start && <OverlayView position={start} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET} getPixelPositionOffset={offset}><div className={styles.anchor} style={nudge("start")}><span className={styles.youDot} aria-label="Your location" /></div></OverlayView>}
    </GoogleMap>
    {!client && layout.arrows.map(arrow => <button key={arrow.id} type="button" className={styles.edgeArrow} data-new={arrow.isNew || undefined} data-active={arrow.active || undefined} style={{ left: arrow.x, top: arrow.y }} aria-label={`Another work order${arrow.address ? ` at ${arrow.address}` : ""}. Show route`} title={arrow.address} onClick={() => onSelect?.(arrow.id)}><ArrowUp size={16} strokeWidth={3} style={{ transform: `rotate(${arrow.angle}deg)` }} aria-hidden="true" /></button>)}
    {!compact && <div className={styles.snow} aria-hidden="true"><i /><i /><i /><i /><i /></div>}
    {!client && route && !compact && <span className={styles.routeChip} role="status"><Car size={14} aria-hidden="true" />{route.estimated ? "~" : ""}{route.summary.minutes} min · {route.summary.distanceKm} km</span>}
    {!client && origin && !route && failed && <span className={styles.notice}>Travel estimate unavailable</span>}
  </>;
}

/** Exactly one line on the map: made imperatively and removed on cleanup, so a route to another order can never linger. */
const routeLines = new WeakMap<google.maps.Map, google.maps.Polyline>();
function RouteLine({ map, route }: { map: google.maps.Map; route: RoutePath }) {
  useEffect(() => {
    routeLines.get(map)?.setMap(null);
    const line = new google.maps.Polyline(route.estimated
      ? { path: route.path, strokeOpacity: 0, icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: .85, strokeColor: "#287057", scale: 3 }, offset: "0", repeat: "14px" }], clickable: false }
      : { path: route.path, strokeColor: "#287057", strokeWeight: 5, strokeOpacity: .85, clickable: false });
    line.setMap(map);
    routeLines.set(map, line);
    return () => { line.setMap(null); if (routeLines.get(map) === line) routeLines.delete(map); };
  }, [map, route]);
  return null;
}

export function AddressPin({address,small,isNew,selected,onSelect}:{address?:string;small?:boolean;isNew?:boolean;selected?:boolean;onSelect?:()=>void}) {
  const [open,setOpen]=useState(false);
  const id=useId();
  return <div className={styles.addressMarker} onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)}>
    <button type="button" className={`${styles.operatorPin} ${small ? styles.smallPin : ""}`} data-new={isNew || undefined} aria-label={address ? `Show address: ${address}` : "Service property"} aria-expanded={open} aria-pressed={onSelect ? !!selected : undefined} aria-describedby={open && address ? id : undefined} onClick={()=>{setOpen(true);onSelect?.();}} onFocus={()=>setOpen(true)} onBlur={()=>setOpen(false)} onKeyDown={e=>{if(e.key === "Escape"){e.stopPropagation();setOpen(false);}}}><House size={small ? 16 : 20} /></button>
    {open && address && <span id={id} role="tooltip" className={styles.addressTooltip}>{address}</span>}
  </div>;
}

function OfferPin({offer,address,quiet,onSelect}:{offer:MapOffer;address?:string;quiet?:boolean;onSelect?:()=>void}) {
  return <div className={styles.addressMarker}>
    {!offer.selected && !quiet && <span className={styles.offerChip} aria-hidden="true">New offer</span>}
    <button type="button" className={`${styles.operatorPin} ${styles.offerPin}`} aria-label={`New offer${address ? ` at ${address}` : ""}. Show details`} aria-expanded={offer.selected} aria-controls={offer.detailsId} onClick={()=>{offer.onSelect();onSelect?.();}}><House size={20} /></button>
  </div>;
}

export function serviceAreaBounds(area: ServiceAreaShape) {
  if (area.mode === "cities") {
    const bounds = new google.maps.LatLngBounds();
    area.cities?.forEach(city => city.bounds ? bounds.union(city.bounds) : bounds.extend({ lat: city.lat, lng: city.lng }));
    return bounds.isEmpty() ? null : bounds;
  }
  return area.center && area.radiusKm ? new google.maps.Circle({ center: area.center, radius: area.radiusKm * 1000 }).getBounds() : null;
}

/** The operator's coverage: a soft radius ring, or each city's extent with a name chip. Red when the property falls outside. */
// Shapes are made imperatively and removed on cleanup, like the route line, so switching modes never leaves a ghost ring.
export function ServiceAreaShapes({ area }: { area: ServiceAreaShape }) {
  const map = useGoogleMap();
  const key = `${area.mode}:${area.center?.lat},${area.center?.lng}:${area.radiusKm}:${area.cities?.map(city => city.placeId).join(",")}:${area.outside}`;
  useEffect(() => {
    if (!map) return;
    const color = area.outside ? AREA_RED : AREA_GREEN;
    const shape = { map, strokeColor: color, strokeWeight: 2, strokeOpacity: .75, fillColor: color, fillOpacity: .08, clickable: false };
    const drawn: Array<google.maps.Circle | google.maps.Rectangle> = area.mode === "radius"
      ? area.center && area.radiusKm ? [
        new google.maps.Circle({ ...shape, center: area.center, radius: area.radiusKm * 1000 }),
        new google.maps.Circle({ ...shape, center: area.center, radius: area.radiusKm * 1000 * .985, strokeWeight: 6, strokeOpacity: .12, fillOpacity: 0 }),
      ] : []
      : (area.cities || []).filter(city => city.bounds).map(city => new google.maps.Rectangle({ ...shape, bounds: city.bounds! }));
    return () => drawn.forEach(item => item.setMap(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return area.mode === "cities" ? <>{area.cities?.map(city => <OverlayView key={city.placeId} position={{ lat: city.lat, lng: city.lng }} mapPaneName={OverlayView.OVERLAY_LAYER} getPixelPositionOffset={offset}>
    <span className={styles.cityChip} data-outside={area.outside || undefined}>{city.city}</span>
  </OverlayView>)}</> : null;
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
