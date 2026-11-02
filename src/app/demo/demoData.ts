import type { Job, JobStatus } from "@/lib/types";

export type DemoRole = "client" | "operator";
export type DemoSpot = { city: string; province: string; postalCode: string; lat: number; lng: number };
export type DemoState = { run: number; role: DemoRole; status: JobStatus | null; paid: boolean; services: string[]; spot: DemoSpot };

export const ADDRESS = "18 Snowdrop Lane";
export const CLIENT_NAME = "Morgan Lee";
export const SERVICE_PRICES: Record<string, number> = { driveway: 35, walkway: 10, steps: 5 };
export const priceOf = (services: string[]) => services.reduce((sum, service) => sum + (SERVICE_PRICES[service] || 0), 0);
export const operators = [
  { uid: "demo-op", businessName: "Northside Snow Co.", displayName: "Jamie Morgan", rating: 4.9, km: 0.8 },
  { uid: "demo-op-2", businessName: "Fresh Tracks", displayName: "Alex Rivera", rating: 4.8, km: 1.6 },
];

/** Tells the landing page (the parent frame) what happened in this copy of the app. */
export const tellParent = (type: string, detail: Record<string, unknown> = {}) => window.parent !== window && window.parent.postMessage({ type, ...detail }, window.location.origin);

/** The one sample work order both sides of the demo look at. */
export function demoJob(state: DemoState): Job | null {
  const { spot, status, services, paid } = state;
  if (!status) return null;
  const now = new Date();
  return {
    id: "demo", status, clientId: "demo-client", operatorId: "demo-op",
    address: ADDRESS, city: spot.city, province: spot.province, postalCode: spot.postalCode, clientLat: spot.lat, clientLng: spot.lng,
    propertySize: "medium", serviceTypes: services, price: priceOf(services), paymentMethod: "cash", cashPaymentAcknowledged: true,
    paymentStatus: paid ? "paid" : "pending", scheduleMode: "asap", scheduledTime: "ASAP",
    declinedBy: status === "cancelled" ? "demo-op" : undefined,
    estimatedArrivalAt: new Date(now.getTime() + 8 * 60000), operatorApproxLat: spot.lat + 0.004, operatorApproxLng: spot.lng - 0.006,
    operatorLocationRadiusKm: 0.3, operatorLocationUpdatedAt: now, createdAt: now,
  } as unknown as Job;
}

