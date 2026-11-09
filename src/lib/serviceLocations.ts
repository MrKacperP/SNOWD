import type { ClientProfile, PropertySize, PropertyUse, ServiceType } from "./types";
// Mirrors SHOVELING_SERVICES; kept here so this module has no runtime imports.
const BOOKABLE_SERVICES = ["driveway","porch","sidewalk","backyard-patio"];

export type ServiceLocation = {
  address: string; city: string; province: string; postalCode: string;
  lat?: number; lng?: number; propertySize?: PropertySize;
};
/** What a client has told operators about one property, beyond its address. */
export type PropertyDetails = { use?: PropertyUse; areaSqft?: number; serviceTypes?: ServiceType[]; instructions?: string; photos?: string[] };
export type SavedProperty = ServiceLocation & PropertyDetails & { id: string; label: string };
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
export function parsePropertyDetails(value: unknown, uid: string): PropertyDetails {
  if (!value || typeof value !== "object") throw new Error("Enter the property details.");
  const v = value as Record<string, unknown>;
  if (v.use !== undefined && !["home","rental","business","cottage","other"].includes(String(v.use))) throw new Error("Choose what this property is for.");
  if (v.areaSqft !== undefined && v.areaSqft !== null && (typeof v.areaSqft !== "number" || !Number.isInteger(v.areaSqft) || v.areaSqft < 1 || v.areaSqft > 1_000_000)) throw new Error("Enter the area as a whole number of square feet.");
  if (v.serviceTypes !== undefined && (!Array.isArray(v.serviceTypes) || !v.serviceTypes.every(s => typeof s === "string" && BOOKABLE_SERVICES.includes(s)))) throw new Error("Choose valid areas to clear.");
  if (v.instructions !== undefined && (typeof v.instructions !== "string" || v.instructions.length > 1000)) throw new Error("Keep instructions under 1000 characters.");
  // Only photos this client uploaded to their own folder.
  const folder = `property-photos%2F${encodeURIComponent(uid)}%2F`;
  if (v.photos !== undefined && (!Array.isArray(v.photos) || v.photos.length > 6 || !v.photos.every(p => typeof p === "string" && /^https?:\/\//.test(p) && p.includes(folder)))) throw new Error("Add up to 6 of your own property photos.");
  return {
    ...(v.use ? {use:v.use as PropertyUse} : {}),
    ...(typeof v.areaSqft === "number" ? {areaSqft:v.areaSqft} : {}),
    ...(v.serviceTypes ? {serviceTypes:[...new Set(v.serviceTypes as ServiceType[])]} : {}),
    ...(typeof v.instructions === "string" && v.instructions.trim() ? {instructions:v.instructions.trim()} : {}),
    ...(v.photos ? {photos:v.photos as string[]} : {}),
  };
}
/** Older saved properties were named by their type before it was stored on its own. */
export function propertyUse(property: Pick<SavedProperty, "use" | "label">): PropertyUse {
  if (property.use) return property.use;
  const label = property.label.toLowerCase();
  return label.includes("rental") ? "rental" : label.includes("business") ? "business" : label.includes("cottage") ? "cottage" : label.includes("main") || label.includes("home") ? "home" : "other";
}
