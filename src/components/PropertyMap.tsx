"use client";

import SnowdMap from "./SnowdMap";

export default function PropertyMap({ address, origin, title = "Service location", onRoute }: { address: string; origin?: string; title?: string; onRoute?: (route: { minutes: number; distanceKm: number } | null) => void }) {
  const destination = encodeURIComponent(address);
  const link = origin ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${destination}` : `https://www.google.com/maps/search/?api=1&query=${destination}`;
  return <div className="property-map" aria-label={title}><SnowdMap location={address} origin={origin} onRoute={onRoute} /><a href={link} target="_blank" rel="noreferrer">{origin ? "Open directions ↗" : "Open map ↗"}</a></div>;
}
