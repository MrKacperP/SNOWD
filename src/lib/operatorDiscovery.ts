import { ClientProfile, OperatorProfile } from "@/lib/types";

type PartialLocation = {
  lat?: number | null;
  lng?: number | null;
  city?: string | null;
  province?: string | null;
};

const EARTH_RADIUS_KM = 6371;

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function getDistanceKm(
  a: PartialLocation | null | undefined,
  b: PartialLocation | null | undefined
): number | null {
  if (!a || !b) return null;
  const lat1 = toFiniteNumber(a.lat);
  const lng1 = toFiniteNumber(a.lng);
  const lat2 = toFiniteNumber(b.lat);
  const lng2 = toFiniteNumber(b.lng);

  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const radLat1 = toRad(lat1);
  const radLat2 = toRad(lat2);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function isOperatorPublic(operator: OperatorProfile): boolean {
  const ext = operator as OperatorProfile & {
    accountApproved?: boolean;
    idVerified?: boolean;
    stripeConnectAccountId?: string;
    isAvailable?: boolean;
  };

  const hasStripe = typeof ext.stripeConnectAccountId === "string" && ext.stripeConnectAccountId.trim().length > 0;
  const profileComplete = Boolean(operator.avatar && operator.phone && operator.address);

  return Boolean(
    operator.onboardingComplete &&
      ext.accountApproved &&
      ext.idVerified &&
      hasStripe &&
      profileComplete &&
      (ext.isAvailable ?? true)
  );
}

export function isClientWithinOperatorRadius(client: ClientProfile, operator: OperatorProfile): boolean {
  if (!client) return false;
  const distance = getDistanceKm(client, operator);

  // Fallback when coordinates are missing on one side: treat same city/province as discoverable.
  if (distance == null) {
    const clientCity = (client.city || "").trim().toLowerCase();
    const clientProvince = (client.province || "").trim().toLowerCase();
    const operatorCity = (operator.city || "").trim().toLowerCase();
    const operatorProvince = (operator.province || "").trim().toLowerCase();
    return Boolean(clientCity && clientProvince && clientCity === operatorCity && clientProvince === operatorProvince);
  }

  const radius = toFiniteNumber(operator.serviceRadius) ?? 0;
  if (radius <= 0) return false;
  return distance <= radius;
}
