import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { orderUser, validId, OrderError, orderFailure } from "@/lib/workOrderServer";
import { fallbackDrivingEta } from "@/lib/travelEta";
import type { Job } from "@/lib/types";

/**
 * The driving route from the shoveler's current position to their job, for the app's mini map.
 * Only the assigned shoveler can ask, and only while the job is confirmed or on the way. Returns
 * Google's encoded polyline plus the time and distance; without a route it returns an estimate only.
 */
export async function POST(request: NextRequest) {
  try {
    const uid = await orderUser(request);
    const body = await request.json();
    const lat = Number(body.lat), lng = Number(body.lng);
    if (!validId(body.jobId) || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new OrderError("Invalid route request.", 400);
    const job = (await getAdminDb().doc(`jobs/${body.jobId}`).get()).data() as Job | undefined;
    if (!job || job.operatorId !== uid) throw new OrderError("Work order unavailable.", 403);
    if (!["accepted", "en-route"].includes(job.status)) throw new OrderError("This job has no trip to show.", 409);
    if (typeof job.clientLat !== "number" || typeof job.clientLng !== "number") throw new OrderError("The service location is unavailable.", 409);
    const destination = { lat: job.clientLat, lng: job.clientLng };
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (apiKey) {
      try {
        const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline" },
          body: JSON.stringify({
            origin: { location: { latLng: { latitude: lat, longitude: lng } } },
            destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
            travelMode: "DRIVE",
            routingPreference: "TRAFFIC_AWARE",
            units: "METRIC",
          }),
          signal: AbortSignal.timeout(5000),
        });
        if (response.ok) {
          const route = ((await response.json()) as { routes?: Array<{ duration?: string; distanceMeters?: number; polyline?: { encodedPolyline?: string } }> }).routes?.[0];
          const seconds = Number(route?.duration?.replace("s", ""));
          if (route?.polyline?.encodedPolyline && Number.isFinite(seconds)) {
            return NextResponse.json({ polyline: route.polyline.encodedPolyline, minutes: Math.max(1, Math.ceil(seconds / 60)), distanceKm: route.distanceMeters ? Math.round(route.distanceMeters / 100) / 10 : undefined, source: "route" });
          }
        }
      } catch (error) {
        console.warn("Google Routes path unavailable; returning an estimate.", error);
      }
    }
    return NextResponse.json({ polyline: null, minutes: fallbackDrivingEta({ lat, lng }, destination), source: "estimate" });
  } catch (error) {
    return orderFailure(error);
  }
}
