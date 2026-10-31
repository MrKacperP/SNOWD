import type { ClientProfile, PropertySize } from "./types";

export type ServiceLocation = {
  address: string; city: string; province: string; postalCode: string;
  lat?: number; lng?: number; propertySize?: PropertySize;
};
export type SavedProperty = ServiceLocation & { id: string; label: string };
export type PropertyState = { properties: SavedProperty[]; selectedLocation: ServiceLocation | null };
export const formatServiceAddress = (value?: Partial<ServiceLocation> | null) => value ? [value.address, value.city, value.province, value.postalCode].filter(Boolean).join(", ") : "";
const normalize = (s?: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
export function sameServiceAddress(a?: Partial<ServiceLocation> | null, b?: Partial<ServiceLocation> | null) {
  return Boolean(a?.address && b?.address && normalize(a.address) === normalize(b.address) && normalize(a.city) === normalize(b.city) && normalize(a.postalCode) === normalize(b.postalCode));
}
export function profileLocation(profile?: Partial<ClientProfile> | null): ServiceLocation | null {
  if (!profile?.address) return null;
  return { address: profile.address, city: profile.city || "", province: profile.province || "", postalCode: profile.postalCode || "", ...(Number.isFinite(profile.lat) && Number.isFinite(profile.lng) ? {lat:profile.lat,lng:profile.lng} : {}), propertySize: profile.propertyDetails?.propertySize || "medium" };
}
export function parseServiceLocation(value: unknown): ServiceLocation {
  if (!value || typeof value !== "object") throw new Error("Choose a service address.");
  const v = value as Record<string, unknown>;
  for (const [key, max] of [["address",250],["city",100],["province",40],["postalCode",10]] as const) {
    if (typeof v[key] !== "string" || !v[key].trim() || v[key].length > max) throw new Error("Enter a complete service address.");
  }
  if (!/^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i.test(String(v.postalCode).trim())) throw new Error("Enter a valid Canadian postal code.");
  if ((v.lat !== undefined || v.lng !== undefined) && (typeof v.lat !== "number" || !Number.isFinite(v.lat) || Math.abs(v.lat) > 90 || typeof v.lng !== "number" || !Number.isFinite(v.lng) || Math.abs(v.lng) > 180)) throw new Error("Choose a valid map location.");
  if (v.propertySize !== undefined && !["small","medium","large","commercial"].includes(String(v.propertySize))) throw new Error("Choose a valid driveway size.");
  return { address:String(v.address).trim(), city:String(v.city).trim(), province:String(v.province).trim(), postalCode:String(v.postalCode).trim().toUpperCase(), ...(v.lat !== undefined ? {lat:v.lat as number,lng:v.lng as number} : {}), ...(v.propertySize ? {propertySize:v.propertySize as PropertySize} : {}) };
}
