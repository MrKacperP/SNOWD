import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { quoteMarketplace } from "@/lib/marketplacePricing";
import { useMarketplacePolicy } from "@/lib/useMarketplacePolicy";
import type { ServiceType } from "@/lib/types";
import { clampPrice, OFFERS, PriceSheet, type OfferKey, type SheetPriceKey } from "~/components/onboarding/PriceSheet";
import { AutosaveStatus, Notice, useAutosave } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { API_URL } from "~/lib/api";
import { db } from "~/lib/firebase";
import { money } from "~/lib/format";
import { usePriceAdvice } from "~/lib/priceAdvice";
import { ds, family } from "~/lib/theme";

type Prices = Record<SheetPriceKey, number>;
type Offer = Record<OfferKey, boolean>;

/**
 * Settings → Prices: the same price sheet as the last step of onboarding, tightened to fit on one
 * screen, with what the customer pays under each price. Saves on its own a moment after each change.
 */
export default function PricesSettings() {
  const { policy } = useMarketplacePolicy(API_URL);
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const saved = (): { offer: Offer; prices: Prices } => {
    const types = profile?.serviceTypes || [];
    const p = profile?.pricing;
    const sidewalk = p?.sidewalk || 20;
    return {
      offer: Object.fromEntries(OFFERS.map((o) => [o.key, types.includes(o.key as ServiceType)])) as Offer,
      prices: {
        small: p?.driveway?.small || 35,
        medium: p?.driveway?.medium || 50,
        large: p?.driveway?.large || 70,
        sidewalk,
        porch: p?.porch || sidewalk,
        backyardPatio: p?.backyardPatio || 25,
      },
    };
  };
  const [offer, setOffer] = useState<Offer>(saved().offer);
  const [prices, setPrices] = useState<Prices>(saved().prices);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const advice = usePriceAdvice({ uid: user?.uid, lat: profile?.lat, lng: profile?.lng });
  const suggestedFor = (key: SheetPriceKey) => (advice ? (key === "porch" ? advice.prices.sidewalk : advice.prices[key]) : undefined);

  const owner = useRef<string | null>(null);
  useEffect(() => {
    if (!profile || owner.current === profile.uid) return;
    owner.current = profile.uid;
    const s = saved();
    setOffer(s.offer);
    setPrices(s.prices);
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const original = saved();
  const dirty = OFFERS.some((o) => offer[o.key] !== original.offer[o.key]) || (Object.keys(prices) as SheetPriceKey[]).some((k) => prices[k] !== original.prices[k]);
  const offered = OFFERS.filter((o) => offer[o.key]).map((o) => o.key) as ServiceType[];

  const save = async () => {
    setError("");
    if (!offered.length) return setError("Offer at least one service.");
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user!.uid), {
        serviceTypes: offered,
        pricing: {
          driveway: { small: prices.small, medium: prices.medium, large: prices.large },
          walkway: prices.sidewalk,
          sidewalk: prices.sidewalk,
          backyardPatio: prices.backyardPatio,
          porch: prices.porch,
        },
      });
    } catch {
      setError("Couldn’t save your prices. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  useAutosave({ offer, prices }, { dirty, save });

  return (
    <View style={{ flex: 1, backgroundColor: ds.bg }}>
      <Stack.Screen options={{ title: "Prices" }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, gap: 12, paddingBottom: insets.bottom + 24 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 28 }}>
          <Text style={{ flex: 1, fontSize: 15, lineHeight: 20, color: ds.ink3, fontFamily: family.body }}>Turn on what you offer and set a price per visit.</Text>
          <AutosaveStatus inline saving={saving} dirty={dirty} error={error} />
        </View>
        <PriceSheet
          compact
          prices={prices}
          offer={offer}
          suggested={advice?.local ? suggestedFor : undefined}
          nearby={advice?.local ? advice.count : 0}
          customerPays={(n) => money(Math.round(quoteMarketplace(n, "credit", policy).price)).replace(".00", "")}
          onPrice={(key, v) => setPrices((p) => (p[key] === v ? p : { ...p, [key]: clampPrice(v) }))}
          onOffer={(key) => setOffer((o) => ({ ...o, [key]: !o[key] }))}
          onUseSuggested={() => {
            if (!advice) return;
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setPrices({ ...advice.prices, porch: advice.prices.sidewalk });
          }}
        />
        <Notice text={error} />
      </ScrollView>
    </View>
  );
}
