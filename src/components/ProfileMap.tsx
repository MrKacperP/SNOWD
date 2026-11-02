"use client";

import { Circle, GoogleMap, OverlayView, Rectangle, useJsApiLoader } from "@react-google-maps/api";
import { useEffect, useMemo, useState } from "react";
import { Snowflake } from "lucide-react";
import { AddressPin, SNOWD_MAP_OPTIONS } from "@/components/SnowdMap";
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LIBRARIES, hasGoogleMapsApiKey } from "@/lib/googleMaps";
import type { OperatorServiceArea } from "@/lib/types";
import styles from "./snowd-map.module.css";

export type ProfilePlace = { id: string; label: string; address: string; lat?: number; lng?: number; home?: boolean };
type Props = {
  /** Client homes and saved properties, each as a pin. */
  places?: ProfilePlace[];
  /** An operator's radius, or a client's approximate area when the exact address is private. */
  area?: { lat?: number; lng?: number; address?: string; radiusKm: number };
  /** An operator's selected cities, outlined along their real borders. */
  cities?: OperatorServiceArea[];
};
type Geometry = { type: "Polygon" | "MultiPolygon"; coordinates: unknown };

const GREEN = "#287057";
const containerStyle = { width: "100%", height: "100%" };
const offset = () => ({ x: 0, y: 0 });
const valid = (lat?: number, lng?: number) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat!) <= 90 && Math.abs(lng!) <= 180;

/** City outlines come from OpenStreetMap's boundaries; kept per tab so the profile doesn't refetch them. */
const borders = new Map<string, Promise<Geometry | null>>();
function cityBorder(area: OperatorServiceArea) {
  const key = `${area.city}|${area.province}`.toLowerCase();
  if (!borders.has(key)) borders.set(key, (async () => {
    try { const cached = sessionStorage.getItem(`snowd-border:${key}`); if (cached) return JSON.parse(cached) as Geometry | null; } catch {}
    const params = new URLSearchParams({ city: area.city, state: area.province, country: "Canada", format: "jsonv2", polygon_geojson: "1", polygon_threshold: "0.0005", limit: "1" });
    const result = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { Accept: "application/json" } }).then(r => r.ok ? r.json() : []).catch(() => []);
    const geometry = result?.[0]?.geojson;
    const border = geometry && (geometry.type === "Polygon" || geometry.type === "MultiPolygon") ? geometry as Geometry : null;
    try { sessionStorage.setItem(`snowd-border:${key}`, JSON.stringify(border)); } catch {}
    return border;
  })());
  return borders.get(key)!;
}

export default function ProfileMap(props: Props) {
  return <div className={styles.map}>
    {hasGoogleMapsApiKey ? <LiveProfileMap {...props} /> : <div className={styles.unavailable}>Map preview unavailable</div>}
    <span className={styles.brand} aria-hidden="true"><Snowflake size={12} /> SNOWD</span>
  </div>;
}

function LiveProfileMap({ places = [], area: areaProp, cities = [] }: Props) {
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY, libraries: GOOGLE_MAPS_LIBRARIES });
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const placeKey = places.map(p => `${p.id}:${p.lat},${p.lng}:${p.address}`).join("|");
  const cityKey = cities.map(c => c.placeId).join("|");
  // Places saved without coordinates are found by address once the map loads.
  const [found, setFound] = useState<Record<string, google.maps.LatLngLiteral>>({});
  useEffect(() => {
    if (!isLoaded) return;
    let active = true;
    places.filter(p => !valid(p.lat, p.lng) && p.address).forEach(p => {
      new google.maps.Geocoder().geocode({ address: p.address }).then(result => {
        const at = result.results[0]?.geometry.location;
        if (active && at) setFound(current => ({ ...current, [p.id]: at.toJSON() }));
      }).catch(() => {});
    });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, placeKey]);
  // An area with only an address (no saved coordinates) is centred on that address.
  const [areaPoint, setAreaPoint] = useState<{ for: string; at: google.maps.LatLngLiteral } | null>(null);
  const areaAddress = areaProp && !valid(areaProp.lat, areaProp.lng) ? areaProp.address || "" : "";
  useEffect(() => {
    if (!isLoaded || !areaAddress) return;
    let active = true;
    new google.maps.Geocoder().geocode({ address: areaAddress }).then(result => {
      const at = result.results[0]?.geometry.location;
      if (active && at) setAreaPoint({ for: areaAddress, at: at.toJSON() });
    }).catch(() => {});
    return () => { active = false; };
  }, [isLoaded, areaAddress]);
  const areaAt = areaProp && valid(areaProp.lat, areaProp.lng) ? { lat: areaProp.lat!, lng: areaProp.lng! } : areaPoint?.for === areaAddress ? areaPoint.at : null;
  const area = useMemo(() => areaProp && areaAt ? { ...areaAt, radiusKm: areaProp.radiusKm } : undefined, [areaAt?.lat, areaAt?.lng, areaProp?.radiusKm]); // eslint-disable-line react-hooks/exhaustive-deps
  const pins = useMemo(() => places.flatMap(p => valid(p.lat, p.lng) ? [{ ...p, at: { lat: p.lat!, lng: p.lng! } }] : found[p.id] ? [{ ...p, at: found[p.id] }] : []), [placeKey, found]); // eslint-disable-line react-hooks/exhaustive-deps

  const [outlines, setOutlines] = useState<Record<string, Geometry | null>>({});
  useEffect(() => {
    let active = true;
    cities.forEach(city => void cityBorder(city).then(border => { if (active) setOutlines(current => ({ ...current, [city.placeId]: border })); }));
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityKey]);

  // Real borders are drawn as one data layer, so islands and holes in a city stay correct.
  useEffect(() => {
    if (!map) return;
    const layer = new google.maps.Data({ map });
    layer.setStyle({ strokeColor: GREEN, strokeWeight: 2.5, strokeOpacity: .9, fillColor: GREEN, fillOpacity: .12, clickable: false });
    Object.values(outlines).forEach(geometry => { if (geometry) layer.addGeoJson({ type: "Feature", properties: {}, geometry }); });
    return () => layer.setMap(null);
  }, [map, outlines]);

  // Frame everything on the profile: every pin, the whole radius, every city.
  useEffect(() => {
    if (!map) return;
    const bounds = new google.maps.LatLngBounds();
    pins.forEach(p => bounds.extend(p.at));
    if (area) { const circle = new google.maps.Circle({ center: area, radius: area.radiusKm * 1000 }).getBounds(); if (circle) bounds.union(circle); }
    // A city's real border frames it more tightly than its rough extent.
    cities.forEach(city => {
      const border = outlines[city.placeId];
      if (border) JSON.stringify(border.coordinates).match(/\[-?[\d.]+,-?[\d.]+\]/g)?.forEach(pair => { const [lng, lat] = JSON.parse(pair); bounds.extend({ lat, lng }); });
      else if (city.bounds) bounds.union(city.bounds);
      else bounds.extend(city);
    });
    if (bounds.isEmpty()) return;
    if (pins.length === 1 && !area && !cities.length) { map.setCenter(pins[0].at); map.setZoom(15); return; }
    map.fitBounds(bounds, pins.length ? { top: 60, right: 32, bottom: 20, left: 32 } : 16);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, pins, area?.lat, area?.lng, area?.radiusKm, cityKey, outlines]);

  const first = pins[0]?.at || (area ? { lat: area.lat, lng: area.lng } : cities[0] ? { lat: cities[0].lat, lng: cities[0].lng } : null);
  // A stable center, so a re-render never undoes the framing above.
  const center = useMemo(() => first, [first?.lat, first?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  if (loadError) return <div className={styles.unavailable}>Map preview unavailable</div>;
  if (!isLoaded || !center) return <div className={styles.unavailable} role="status">{places.length || areaProp || cities.length ? "Finding the location…" : "No location set yet"}</div>;
  return <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={12} onLoad={setMap} options={{ ...SNOWD_MAP_OPTIONS, zoomControl: false, keyboardShortcuts: false, gestureHandling: "none" }}>
    {area && <Circle center={area} radius={area.radiusKm * 1000} options={{ strokeColor: GREEN, strokeWeight: 2.5, strokeOpacity: .9, fillColor: GREEN, fillOpacity: .12, clickable: false }} />}
    {/* A city OpenStreetMap has no border for falls back to its extent. */}
    {cities.filter(city => outlines[city.placeId] === null && city.bounds).map(city => <Rectangle key={city.placeId} bounds={city.bounds!} options={{ strokeColor: GREEN, strokeWeight: 2, strokeOpacity: .8, fillColor: GREEN, fillOpacity: .1, clickable: false }} />)}
    {pins.map(pin => <OverlayView key={pin.id} position={pin.at} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET} getPixelPositionOffset={offset}>
      <div className={`${styles.anchor} ${styles.marker}`}><AddressPin address={`${pin.label} · ${pin.address}`} small={!pin.home} /></div>
    </OverlayView>)}
  </GoogleMap>;
}
