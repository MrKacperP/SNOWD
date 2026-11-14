import { collection, getDocs, query, where } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { calculateServicePrice, quoteMarketplace } from "@/lib/marketplacePricing";
import { canAcceptPlatformPayments, getDistanceKm, isClientWithinOperatorRadius, isOperatorPublic } from "@/lib/operatorDiscovery";
import type { ClientProfile, OperatorProfile } from "@/lib/types";
import type { Profile } from "~/context/auth";
import { db } from "./firebase";

export type NearbyOperator = OperatorProfile & { distanceKm: number | null; servesYou: boolean };

/** Verified, available operators, nearest first, using the website's discovery rules. */
export function useOperators(profile: Profile) {
  const [operators, setOperators] = useState<NearbyOperator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const snap = await getDocs(query(collection(db, "users"), where("role", "==", "operator")));
      const list = snap.docs
        .map((d) => ({ ...d.data(), uid: d.id }) as OperatorProfile)
        .filter((o) => o.onboardingComplete !== false && isOperatorPublic(o))
        .map((o) => ({
          ...o,
          distanceKm: getDistanceKm(profile, o),
          servesYou: profile ? isClientWithinOperatorRadius(profile as ClientProfile, o) : false,
        }));
      list.sort((a, b) => Number(b.servesYou) - Number(a.servesYou) || (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
      setOperators(list);
    } catch {
      setError("We couldn’t load nearby shovelers. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [profile?.lat, profile?.lng, profile?.city]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    void load();
  }, [load]);
  return { operators, loading, error, reload: load };
}

/** What the client pays for their saved property and services with this operator. */
export function quoteFor(operator: Pick<OperatorProfile, "pricing" | "stripeConnectAccountId" | "stripeAccountStatus">, profile: Profile, services?: string[], policy?: import("@/lib/admin/pricing").MarketplacePolicy) {
  const size = (profile?.propertyDetails?.propertySize || "medium") as "small" | "medium" | "large";
  const chosen = services?.length ? services : profile?.propertyDetails?.serviceTypes || ["driveway"];
  const base = calculateServicePrice(operator.pricing, chosen, size);
  const card = canAcceptPlatformPayments(operator);
  return { base, card, cash: quoteMarketplace(base, "cash").price, credit: card ? quoteMarketplace(base, "credit", policy).price : null };
}
