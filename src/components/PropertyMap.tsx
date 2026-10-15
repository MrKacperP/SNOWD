"use client";

import { useEffect } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LIBRARIES, hasGoogleMapsApiKey } from "@/lib/googleMaps";

export default function PropertyMap({ address, origin, title = "Service location", onRoute }: { address: string; origin?: string; title?: string; onRoute?: (route: { minutes: number; distanceKm: number } | null) => void }) {
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY, libraries: GOOGLE_MAPS_LIBRARIES });
  useEffect(() => {
    if (!onRoute) return;
    onRoute(null);
    if (!origin || !isLoaded || !hasGoogleMapsApiKey) return;
    let active = true;
    const directions = new google.maps.DirectionsService();
    void directions.route({ origin, destination: address, travelMode: google.maps.TravelMode.DRIVING, drivingOptions: { departureTime: new Date() } })
      .then(result => {
        const leg = result.routes[0]?.legs[0];
        if (active) onRoute(leg?.duration_in_traffic?.value || leg?.duration?.value ? { minutes: Math.ceil((leg.duration_in_traffic?.value || leg.duration?.value || 0) / 60), distanceKm: Math.round((leg.distance?.value || 0) / 100) / 10 } : null);
      })
      .catch(() => { if (active) onRoute(null); });
    return () => { active = false; };
  }, [address, origin, isLoaded, onRoute]);
  const destination = encodeURIComponent(address);
  const source = origin ? `https://maps.google.com/maps?saddr=${encodeURIComponent(origin)}&daddr=${destination}&t=m&output=embed` : `https://maps.google.com/maps?q=${destination}&z=17&t=m&output=embed`;
  const link = origin ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${destination}` : `https://www.google.com/maps/search/?api=1&query=${destination}`;
  return <div className="property-map"><iframe title={title} src={source} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /><a href={link} target="_blank" rel="noreferrer">{origin ? "Open directions ↗" : "Open map ↗"}</a></div>;
}
