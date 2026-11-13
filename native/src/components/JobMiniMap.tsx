import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Circle, Marker, Polyline } from "react-native-maps";
import type { Job } from "@/lib/types";
import { useAuth } from "~/context/auth";
import { api } from "~/lib/api";
import { distanceText, estimateTrip, sharedOperatorSpot, useOperatorPosition, type Point } from "~/lib/liveLocation";
import { colors, radius, shadow, stepColor } from "~/lib/theme";
import { ShovelPin, SNOWD_MAP } from "./MapStyle";
import { Icon } from "./ui";

/**
 * The work order's mini map, acting the way the website's does:
 * - Before it's confirmed: just the address.
 * - Confirmed or on the way: the shoveler sees a line from where they are now (live) to the
 *   address with the drive time; the customer sees the shoveler's approximate area (about 100 m,
 *   never their exact spot) and the ETA, while it's fresh. The map frames both.
 * - Clearing and after: the address, with what's happening there.
 */
export function JobMiniMap({ job, operator, target, onPress, label }: { job: Job; operator: boolean; target: Point; onPress: () => void; label: string }) {
  const { profile } = useAuth();
  const live = useOperatorPosition();
  const map = useRef<MapView>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);
  const tone = stepColor(job.status);
  const confirmed = ["accepted", "en-route"].includes(job.status);
  const spot = sharedOperatorSpot(job, now);
  const home = typeof profile?.lat === "number" && typeof profile?.lng === "number" ? { latitude: profile.lat, longitude: profile.lng } : null;

  // Where the trip starts: the shoveler's live position, else their shared spot, else (for them) home.
  const from: Point | null = !confirmed ? null : operator ? (live.jobId === job.id && live.position) || spot || home : spot;
  const sharing = operator ? live.jobId === job.id && !!live.position : !!spot;
  // The shoveler gets the real driving route (from the server, which keeps the maps key private).
  // Refetched when they've moved ~200 m. Until it arrives, or if it can't be had, a straight line.
  const [route, setRoute] = useState<{ points: Point[]; minutes: number; km?: number } | null>(null);
  const routeKey = operator && from ? `${from.latitude.toFixed(3)},${from.longitude.toFixed(3)}` : "";
  useEffect(() => {
    if (!routeKey || !from) return setRoute(null);
    let live = true;
    api<{ polyline: string | null; minutes: number; distanceKm?: number }>("/api/jobs/route-path", { jobId: job.id, lat: from.latitude, lng: from.longitude })
      .then((r) => live && setRoute(r.polyline ? { points: decodePolyline(r.polyline), minutes: r.minutes, km: r.distanceKm } : null))
      .catch(() => live && setRoute(null));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey, job.id]);
  const estimate = from ? estimateTrip(from, target) : null;
  const trip = route ? { minutes: route.minutes, km: route.km ?? estimate?.km ?? 0 } : estimate;
  // A routed ETA beats our straight-line estimate.
  const minutes = route?.minutes ?? (job.status === "en-route" && job.eta && job.etaSource === "route" && !sharing ? job.eta : trip?.minutes);
  // The customer sees a line from their address to the edge of the shoveler's approximate area.
  const edge = !operator && spot ? edgeToward(spot, target) : null;

  const fromKey = from ? `${from.latitude.toFixed(4)},${from.longitude.toFixed(4)}` : "";
  useEffect(() => {
    if (!from) {
      map.current?.animateToRegion({ ...target, latitudeDelta: 0.012, longitudeDelta: 0.012 }, 400);
      return;
    }
    const frame = route?.points.length ? [...route.points, target] : spot && !operator ? [...circleBox(spot), target] : [from, target];
    map.current?.fitToCoordinates(frame, { edgePadding: { top: 52, right: 40, bottom: 40, left: 40 }, animated: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromKey, target.latitude, target.longitude, route]);

  const badge = useMemo(() => {
    if (job.status === "pending") return { icon: "clock.fill" as const, text: "Waiting for confirmation" };
    if (confirmed && minutes) {
      const lead = job.status === "en-route" ? (operator ? "You arrive in" : "Arriving in") : operator ? "Drive" : "Shoveler is";
      return { icon: "car.fill" as const, text: `${lead} ~${minutes} min${trip ? ` · ${distanceText(trip.km)}` : ""}${job.status === "accepted" && !operator ? " away" : ""}` };
    }
    if (confirmed) return { icon: "checkmark.seal.fill" as const, text: operator ? "Confirmed · turn on location for your route" : "Confirmed · live location shows once they head out" };
    if (job.status === "in-progress") return { icon: "snowflake" as const, text: "Clearing now" };
    if (job.status === "completed") return { icon: "checkmark.circle.fill" as const, text: "All clear" };
    return null;
  }, [job.status, confirmed, minutes, trip, operator]);

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${badge?.text || "Map"}. ${label}`} onPress={onPress} style={[styles.wrap, { height: from ? 150 : 112 }]}>
      <MapView ref={map} {...SNOWD_MAP} pointerEvents="none" style={{ flex: 1 }} initialRegion={{ ...target, latitudeDelta: 0.012, longitudeDelta: 0.012 }} scrollEnabled={false} zoomEnabled={false} pitchEnabled={false} rotateEnabled={false}>
        {operator && from ? (
          route?.points.length ? (
            <Polyline coordinates={route.points} strokeColor={tone.bar} strokeWidth={5} lineCap="round" lineJoin="round" />
          ) : (
            <Polyline coordinates={[from, target]} strokeColor={tone.bar} strokeWidth={4} lineDashPattern={[8, 8]} />
          )
        ) : null}
        {!operator && spot ? <Circle center={spot} radius={spot.radiusM} fillColor={`${tone.bar}33`} strokeColor={tone.bar} strokeWidth={1.5} /> : null}
        {edge ? <Polyline coordinates={[target, edge]} strokeColor={tone.bar} strokeWidth={3} lineDashPattern={[6, 6]} /> : null}
        <Marker coordinate={target} title="Service address" anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false}>
          <ShovelPin color={tone.bar} size={36} />
        </Marker>
        {operator && from ? (
          <Marker coordinate={from} title={operator ? "You" : "Your shoveler (approximate)"} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
            <View style={[styles.car, { backgroundColor: colors.ink }]}>
              <Icon name="car.fill" size={13} color="#fff" />
            </View>
          </Marker>
        ) : null}
      </MapView>
      {badge ? (
        <View style={[styles.badge, { left: 10, top: 10 }]}>
          {sharing ? <View style={styles.liveDot} /> : <Icon name={badge.icon} size={13} color={tone.text} />}
          <Text style={[styles.badgeText, { color: tone.text }]} numberOfLines={1}>{badge.text}</Text>
        </View>
      ) : null}
      <View style={[styles.badge, { right: 10, bottom: 10 }]}>
        <Icon name="arrow.up.right.square.fill" size={14} color={colors.accent} />
        <Text style={[styles.badgeText, { color: colors.accent }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.lg, overflow: "hidden" },
  car: { width: 30, height: 30, borderRadius: 15, borderWidth: 3, borderColor: "#fff", alignItems: "center", justifyContent: "center", ...shadow, shadowOpacity: 0.25 },
  badge: { position: "absolute", maxWidth: "88%", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff", paddingHorizontal: 11, paddingVertical: 6, borderRadius: radius.pill, ...shadow },
  badgeText: { fontWeight: "800", fontSize: 13 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#22c55e" },
});

/** Decodes a Google encoded polyline into map points. */
function decodePolyline(encoded: string): Point[] {
  const points: Point[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    for (const axis of [0, 1]) {
      let result = 0, shift = 0, byte: number;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta;
      else lng += delta;
    }
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

/** The point on the edge of an area (centre + radius in metres) that faces `toward`. */
function edgeToward(area: Point & { radiusM: number }, toward: Point): Point {
  const mPerLat = 111_320;
  const mPerLng = 111_320 * Math.cos((area.latitude * Math.PI) / 180);
  const dx = (toward.longitude - area.longitude) * mPerLng;
  const dy = (toward.latitude - area.latitude) * mPerLat;
  const d = Math.hypot(dx, dy);
  if (d <= area.radiusM) return area;
  return { latitude: area.latitude + (dy / d) * (area.radiusM / mPerLat), longitude: area.longitude + (dx / d) * (area.radiusM / mPerLng) };
}

/** Four points around an area, so the map can frame the whole circle. */
function circleBox(area: Point & { radiusM: number }): Point[] {
  const dLat = area.radiusM / 111_320;
  const dLng = area.radiusM / (111_320 * Math.cos((area.latitude * Math.PI) / 180));
  return [
    { latitude: area.latitude + dLat, longitude: area.longitude },
    { latitude: area.latitude - dLat, longitude: area.longitude },
    { latitude: area.latitude, longitude: area.longitude + dLng },
    { latitude: area.latitude, longitude: area.longitude - dLng },
  ];
}
