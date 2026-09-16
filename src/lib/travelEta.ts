type Coordinates = { lat: number; lng: number };
type Destination = Coordinates & { address?: string };

const EARTH_RADIUS_KM = 6371;

export function fallbackDrivingEta(origin: Coordinates, destination: Coordinates) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latDistance = radians(destination.lat - origin.lat);
  const lngDistance = radians(destination.lng - origin.lng);
  const value = Math.sin(latDistance / 2) ** 2
    + Math.cos(radians(origin.lat)) * Math.cos(radians(destination.lat)) * Math.sin(lngDistance / 2) ** 2;
  const directKm = 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(Math.min(1, value)));
  const roadKm = directKm * 1.25;
  return Math.max(3, Math.ceil((roadKm / 35) * 60 + 2));
}

export async function calculateTravelEta(origin: Coordinates, destination: Destination) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (apiKey) {
    try {
      const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
          destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_AWARE",
          units: "METRIC",
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const data = await response.json() as { routes?: Array<{ duration?: string; distanceMeters?: number }> };
        const seconds = Number(data.routes?.[0]?.duration?.replace("s", ""));
        if (Number.isFinite(seconds) && seconds > 0) {
          return {
            minutes: Math.max(1, Math.ceil(seconds / 60)),
            distanceKm: data.routes?.[0]?.distanceMeters ? Math.round(data.routes[0].distanceMeters / 100) / 10 : undefined,
            source: "route" as const,
          };
        }
      }
    } catch (error) {
      console.warn("Google Routes ETA unavailable; using distance estimate.", error);
    }
  }
  return { minutes: fallbackDrivingEta(origin, destination), source: "estimate" as const };
}
