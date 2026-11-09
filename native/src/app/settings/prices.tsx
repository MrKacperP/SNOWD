import { Stack } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SHOVELING_SERVICES, isShovelingService, type ServiceType } from "@/lib/types";
import { Card, Chip, Field, Notice, SaveBar } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { db } from "~/lib/firebase";
import { colors, space, type } from "~/lib/theme";

type PriceKey = "small" | "medium" | "large" | "sidewalk" | "backyardPatio";
// Same rows, defaults and grouping as the website's "Areas and prices".
const ROWS: [PriceKey, string, ServiceType[]][] = [
  ["small", "1-car driveway", ["driveway"]],
  ["medium", "2-car driveway", ["driveway"]],
  ["large", "3+ car driveway", ["driveway"]],
  ["sidewalk", "Front porch & sidewalk", ["porch", "sidewalk"]],
  ["backyardPatio", "Backyard patio", ["backyard-patio"]],
];

type Prices = Record<PriceKey, string>;

export default function PricesSettings() {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const saved = (): { services: ServiceType[]; prices: Prices } => ({
    services: (profile?.serviceTypes || []).filter(isShovelingService),
    prices: {
      small: String(profile?.pricing?.driveway?.small || 25),
      medium: String(profile?.pricing?.driveway?.medium || 40),
      large: String(profile?.pricing?.driveway?.large || 60),
      sidewalk: String(profile?.pricing?.sidewalk || 15),
      backyardPatio: String(profile?.pricing?.backyardPatio || 15),
    },
  });
  const [services, setServices] = useState<ServiceType[]>(saved().services);
  const [prices, setPrices] = useState<Prices>(saved().prices);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const owner = useRef<string | null>(null);
  useEffect(() => {
    if (!profile || owner.current === profile.uid) return;
    owner.current = profile.uid;
    const s = saved();
    setServices(s.services);
    setPrices(s.prices);
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const original = saved();
  const dirty = services.join() !== original.services.join() || (Object.keys(prices) as PriceKey[]).some((k) => Number(prices[k]) !== Number(original.prices[k]));

  const toggle = (value: ServiceType) =>
    setServices((current) =>
      current.includes(value) ? current.filter((s) => s !== value) : SHOVELING_SERVICES.map(([s]) => s).filter((s) => s === value || current.includes(s)),
    );

  const save = async () => {
    setError("");
    setDone("");
    const n = Object.fromEntries((Object.keys(prices) as PriceKey[]).map((k) => [k, Math.round(Number(prices[k]) * 100) / 100])) as Record<PriceKey, number>;
    if (!services.length) return setError("Choose at least one area you shovel.");
    if (Object.values(n).some((v) => !Number.isFinite(v) || v < 0.01 || v > 10000)) return setError("Enter each service price from $0.01 to $10,000 CAD.");
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user!.uid), {
        serviceTypes: services,
        pricing: {
          driveway: { small: n.small, medium: n.medium, large: n.large },
          walkway: profile?.pricing?.walkway || 15,
          sidewalk: n.sidewalk,
          backyardPatio: n.backyardPatio,
          // Front porch is always billed at the sidewalk rate.
          porch: n.sidewalk,
        },
      });
      setDone("Prices saved. Existing orders keep their agreed price.");
    } catch {
      setError("Couldn’t save your prices. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: "Prices and services" }} />
      <KeyboardAwareScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" bottomOffset={90} contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 120 }}>
        <Card>
          <Text style={type.headline}>Areas you shovel</Text>
          <Text style={type.caption}>Customers can only book the areas you choose.</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {SHOVELING_SERVICES.map(([value, label]) => (
              <Chip key={value} label={label} icon={services.includes(value) ? "checkmark" : undefined} selected={services.includes(value)} onPress={() => toggle(value)} />
            ))}
          </View>
        </Card>
        <Card>
          <Text style={type.headline}>What you receive</Text>
          <Text style={type.caption}>Set your price for each area in Canadian dollars. Front porch and sidewalk share one price.</Text>
          {ROWS.filter(([, , areas]) => areas.some((a) => services.includes(a))).map(([key, label]) => (
            <Field key={key} label={`${label} ($ CAD)`} value={prices[key]} keyboardType="decimal-pad" onChangeText={(v) => setPrices((p) => ({ ...p, [key]: v.replace(/[^\d.]/g, "") }))} />
          ))}
          {!services.length ? <Text style={type.caption}>Choose an area above to set its price.</Text> : null}
        </Card>
        <Notice text={error} />
        <Notice tone="green" text={done} />
      </KeyboardAwareScrollView>
      <SaveBar dirty={dirty} saving={saving} onSave={save} bottomInset={insets.bottom} />
    </View>
  );
}
