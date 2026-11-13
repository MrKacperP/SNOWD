import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "./firebase";

export type PriceKey = "small" | "medium" | "large" | "sidewalk" | "backyardPatio";
export type Advice = { prices: Record<PriceKey, number>; count: number; radiusKm: number; local: boolean };

/** Typical SNOWD prices, used when there aren't enough shovelers nearby to compare with. */
const TYPICAL: Record<PriceKey, number> = { small: 35, medium: 50, large: 70, sidewalk: 20, backyardPatio: 25 };

const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
const median = (values: number[]) => {
  const v = values.filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  if (!v.length) return 0;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};
/** Prices people like: rounded to the nearest $5. */
const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);

/**
 * A suggested price for each size: the middle price charged by other shovelers serving the same
 * neighbourhood (within 25 km), so a new price is competitive for the homes around you.
 */
export function usePriceAdvice(me: { uid?: string; lat?: number | null; lng?: number | null }) {
  const [advice, setAdvice] = useState<Advice | null>(null);
  useEffect(() => {
    if (!me.uid) return;
    let active = true;
    void getDocs(query(collection(db, "users"), where("role", "==", "operator"), limit(400)))
      .then((snap) => {
        const here = Number.isFinite(me.lat) && Number.isFinite(me.lng) ? { lat: me.lat!, lng: me.lng! } : null;
        const radiusKm = 25;
        const nearby = snap.docs
          .filter((d) => d.id !== me.uid)
          .map((d) => d.data() as { lat?: number; lng?: number; pricing?: { driveway?: { small?: number; medium?: number; large?: number }; sidewalk?: number; backyardPatio?: number } })
          .filter((o) => o.pricing?.driveway && here && Number.isFinite(o.lat) && Number.isFinite(o.lng) && km(here, { lat: o.lat!, lng: o.lng! }) <= radiusKm);
        const local = nearby.length >= 3;
        const pick = (get: (o: (typeof nearby)[number]) => number | undefined, key: PriceKey) => (local ? round5(median(nearby.map((o) => Number(get(o))))) || TYPICAL[key] : TYPICAL[key]);
        if (!active) return;
        setAdvice({
          local,
          count: nearby.length,
          radiusKm,
          prices: {
            small: pick((o) => o.pricing?.driveway?.small, "small"),
            medium: pick((o) => o.pricing?.driveway?.medium, "medium"),
            large: pick((o) => o.pricing?.driveway?.large, "large"),
            sidewalk: pick((o) => o.pricing?.sidewalk, "sidewalk"),
            backyardPatio: pick((o) => o.pricing?.backyardPatio, "backyardPatio"),
          },
        });
      })
      .catch(() => active && setAdvice({ local: false, count: 0, radiusKm: 25, prices: TYPICAL }));
    return () => {
      active = false;
    };
  }, [me.uid, me.lat, me.lng]);
  return advice;
}
