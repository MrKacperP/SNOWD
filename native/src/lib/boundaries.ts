import type { LatLng } from "react-native-maps";

export type CityBoundary = { lat: number; lng: number; rings: LatLng[][] };

const cache = new Map<string, CityBoundary | null>();

/**
 * A Canadian city's centre and outline, from OpenStreetMap's public geocoder (Nominatim). Only the
 * city and province names are sent. Results are cached, so each city is looked up once.
 */
export async function cityBoundary(city: string, province: string): Promise<CityBoundary | null> {
  const key = `${city}|${province}`.toLowerCase();
  if (cache.has(key)) return cache.get(key)!;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&polygon_geojson=1&polygon_threshold=0.002&country=Canada&city=${encodeURIComponent(city)}&state=${encodeURIComponent(province)}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "SNOWD-iOS/2.0", "Accept-Language": "en-CA" } });
    const [hit] = (await res.json()) as { lat: string; lon: string; geojson?: { type: string; coordinates: unknown } }[];
    if (!hit) {
      cache.set(key, null);
      return null;
    }
    const toRing = (ring: number[][]) => ring.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
    let rings: LatLng[][] = [];
    if (hit.geojson?.type === "Polygon") rings = [toRing((hit.geojson.coordinates as number[][][])[0])];
    else if (hit.geojson?.type === "MultiPolygon") rings = (hit.geojson.coordinates as number[][][][]).map((poly) => toRing(poly[0]));
    const result = { lat: Number(hit.lat), lng: Number(hit.lon), rings };
    cache.set(key, result);
    return result;
  } catch {
    return null;
  }
}
