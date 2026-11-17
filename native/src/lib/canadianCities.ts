import { CANADIAN_PROVINCES, type OperatorServiceArea } from "@/lib/types";

/**
 * Canadian cities and towns SNOWD operators commonly serve, with their centre point. Used in
 * onboarding to offer the cities near someone as tappable pins, with no network lookup.
 */
const CITIES: [city: string, provinceCode: string, lat: number, lng: number][] = [
  ["Toronto", "ON", 43.6532, -79.3832],
  ["Mississauga", "ON", 43.589, -79.6441],
  ["Brampton", "ON", 43.7315, -79.7624],
  ["Vaughan", "ON", 43.8361, -79.4983],
  ["Markham", "ON", 43.8561, -79.337],
  ["Richmond Hill", "ON", 43.8828, -79.4403],
  ["Oakville", "ON", 43.4675, -79.6877],
  ["Burlington", "ON", 43.3255, -79.799],
  ["Hamilton", "ON", 43.2557, -79.8711],
  ["Milton", "ON", 43.5183, -79.8774],
  ["Pickering", "ON", 43.8384, -79.0868],
  ["Ajax", "ON", 43.8509, -79.0204],
  ["Whitby", "ON", 43.8975, -78.9429],
  ["Oshawa", "ON", 43.8971, -78.8658],
  ["Newmarket", "ON", 44.0592, -79.4613],
  ["Aurora", "ON", 44.0065, -79.4504],
  ["Whitchurch-Stouffville", "ON", 43.9706, -79.2441],
  ["Caledon", "ON", 43.8668, -79.8585],
  ["Halton Hills", "ON", 43.6481, -79.9276],
  ["Barrie", "ON", 44.3894, -79.6903],
  ["Guelph", "ON", 43.5448, -80.2482],
  ["Kitchener", "ON", 43.4516, -80.4925],
  ["Waterloo", "ON", 43.4643, -80.5204],
  ["Cambridge", "ON", 43.3616, -80.3144],
  ["St. Catharines", "ON", 43.1594, -79.2469],
  ["Niagara Falls", "ON", 43.0896, -79.0849],
  ["London", "ON", 42.9849, -81.2453],
  ["Windsor", "ON", 42.3149, -83.0364],
  ["Ottawa", "ON", 45.4215, -75.6972],
  ["Kingston", "ON", 44.2312, -76.486],
  ["Peterborough", "ON", 44.3091, -78.3197],
  ["Greater Sudbury", "ON", 46.4917, -80.993],
  ["Gatineau", "QC", 45.4765, -75.7013],
  ["Montréal", "QC", 45.5019, -73.5674],
  ["Laval", "QC", 45.6066, -73.7124],
  ["Longueuil", "QC", 45.5312, -73.5181],
  ["Québec", "QC", 46.8139, -71.208],
  ["Sherbrooke", "QC", 45.4042, -71.8929],
  ["Halifax", "NS", 44.6488, -63.5752],
  ["Moncton", "NB", 46.0878, -64.7782],
  ["Fredericton", "NB", 45.9636, -66.6431],
  ["Saint John", "NB", 45.2733, -66.0633],
  ["Charlottetown", "PE", 46.2382, -63.1311],
  ["St. John's", "NL", 47.5615, -52.7126],
  ["Winnipeg", "MB", 49.8951, -97.1384],
  ["Regina", "SK", 50.4452, -104.6189],
  ["Saskatoon", "SK", 52.1332, -106.67],
  ["Calgary", "AB", 51.0447, -114.0719],
  ["Airdrie", "AB", 51.2917, -114.0144],
  ["Cochrane", "AB", 51.189, -114.4669],
  ["Edmonton", "AB", 53.5461, -113.4938],
  ["St. Albert", "AB", 53.6305, -113.6256],
  ["Strathcona County", "AB", 53.5412, -113.2958],
  ["Red Deer", "AB", 52.2681, -113.8112],
  ["Vancouver", "BC", 49.2827, -123.1207],
  ["Burnaby", "BC", 49.2488, -122.9805],
  ["Surrey", "BC", 49.1913, -122.849],
  ["Richmond", "BC", 49.1666, -123.1336],
  ["Coquitlam", "BC", 49.2838, -122.7932],
  ["Kelowna", "BC", 49.888, -119.496],
  ["Victoria", "BC", 48.4284, -123.3656],
  ["Whitehorse", "YT", 60.7212, -135.0568],
  ["Yellowknife", "NT", 62.454, -114.3718],
];

export const distanceKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

export const serviceAreaFor = (city: string, provinceCode: string, lat: number, lng: number): OperatorServiceArea => ({
  placeId: `app-${city.toLowerCase().replace(/\s+/g, "-")}-${provinceCode.toLowerCase()}`,
  city,
  province: CANADIAN_PROVINCES.find((p) => p.code === provinceCode)?.name || provinceCode,
  provinceCode,
  country: "Canada",
  lat,
  lng,
});

/** The cities closest to a point (within `withinKm`), nearest first. */
export function citiesNear(point: { lat: number; lng: number }, count = 8, withinKm = 70): (OperatorServiceArea & { km: number })[] {
  return CITIES.map(([city, code, lat, lng]) => ({ ...serviceAreaFor(city, code, lat, lng), km: distanceKm(point, { lat, lng }) }))
    .filter((c) => c.km <= withinKm)
    .sort((a, b) => a.km - b.km)
    .slice(0, count);
}

/** The centre of a listed city, by name and province, or null if it isn't in the list. */
export function cityCentre(city: string, provinceCode: string): { lat: number; lng: number } | null {
  const name = city.trim().toLowerCase();
  const hit = CITIES.find(([c, code]) => c.toLowerCase() === name && code === provinceCode);
  return hit ? { lat: hit[2], lng: hit[3] } : null;
}
