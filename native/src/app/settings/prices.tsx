import { Stack } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { quoteMarketplace } from "@/lib/marketplacePricing";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SHOVELING_SERVICES, isShovelingService, type ServiceType } from "@/lib/types";
import { Card, Chip, Icon, Notice, SaveBar } from "~/components/ui";
import { money } from "~/lib/format";
import { useAuth } from "~/context/auth";
import { db } from "~/lib/firebase";
import { colors, radius, shadow, space, stepColor, type } from "~/lib/theme";

const TONES = [stepColor("accepted"), stepColor("en-route"), stepColor("in-progress"), stepColor("pending"), stepColor("completed")];

/** Pictures of the area: one, two or three cars for driveways, a walking figure or a patio for the rest. */
const PICTURES: Record<string, { icon: Parameters<typeof Icon>[0]["name"]; count: number }> = {
  small: { icon: "car.fill", count: 1 },
  medium: { icon: "car.fill", count: 2 },
  large: { icon: "car.fill", count: 3 },
  sidewalk: { icon: "figure.walk", count: 1 },
  backyardPatio: { icon: "sun.max.fill", count: 1 },
};

/** One size's price: a picture of the size, a big editable amount with − / + and what the customer pays. */
function PriceCard({ label, size, value, onChange, tone }: { label: string; size: string; value: string; onChange: (v: string) => void; tone: (typeof TONES)[number] }) {
  const n = Number(value);
  const valid = Number.isFinite(n) && n >= 0.01;
  const step = (delta: number) => {
    void Haptics.selectionAsync();
    const next = Math.max(5, Math.round(((Number.isFinite(n) ? n : 0) + delta) / 5) * 5);
    onChange(String(Math.min(10000, next)));
  };
  const picture = PICTURES[size] || PICTURES.small;
  return (
    <View style={[styles.priceCard, { borderLeftColor: tone.bar }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <View style={[styles.picture, { backgroundColor: tone.soft }]}>
          <View style={{ flexDirection: "row", gap: 1 }}>
            {Array.from({ length: picture.count }, (_, i) => (
              <Icon key={i} name={picture.icon} size={picture.count > 2 ? 13 : 17} color={tone.text} />
            ))}
          </View>
        </View>
        <Text style={[type.headline, { flex: 1 }]}>{label}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Lower ${label} price by 5 dollars`} onPress={() => step(-5)} style={({ pressed }) => [styles.stepper, pressed && { transform: [{ scale: 0.92 }] }]}>
          <Icon name="minus" size={18} color={colors.ink} weight="bold" />
        </Pressable>
        <View style={styles.amount}>
          <Text style={{ fontSize: 28, fontWeight: "800", color: colors.muted }}>$</Text>
          <TextInput
            accessibilityLabel={`${label} price in dollars`}
            value={value}
            keyboardType="decimal-pad"
            onChangeText={(v) => onChange(v.replace(/[^\d.]/g, ""))}
            style={{ fontSize: 34, fontWeight: "900", color: colors.ink, minWidth: 60, textAlign: "center", fontVariant: ["tabular-nums"] }}
          />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Raise ${label} price by 5 dollars`} onPress={() => step(5)} style={({ pressed }) => [styles.stepper, { backgroundColor: tone.bar }, pressed && { transform: [{ scale: 0.92 }] }]}>
          <Icon name="plus" size={18} color="#fff" weight="bold" />
        </Pressable>
      </View>
      <Text style={[type.caption, { textAlign: "center" }]}>
        {valid ? `Customer pays ${money(quoteMarketplace(n, "cash").price)} cash · ${money(quoteMarketplace(n, "credit").price)} by card` : "Enter an amount from $0.01"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  priceCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.md, borderLeftWidth: 5, ...shadow },
  picture: { width: 56, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  stepper: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceAlt },
  amount: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", minHeight: 60, borderRadius: radius.md, backgroundColor: colors.bg },
});

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
      <Stack.Screen options={{ title: "Sizes & prices" }} />
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
        <Text style={[type.overline, { marginTop: space.sm }]}>Your prices</Text>
        <Text style={[type.caption, { marginTop: -space.sm }]}>What you receive, in Canadian dollars. Tap − / + to change by $5, or type an amount.</Text>
        {ROWS.filter(([, , areas]) => areas.some((a) => services.includes(a))).map(([key, label], i) => (
          <PriceCard
            key={key}
            label={label}
            size={key}
            tone={TONES[i % TONES.length]}
            value={prices[key]}
            onChange={(v) => setPrices((p) => ({ ...p, [key]: v }))}
          />
        ))}
        {!services.length ? <Text style={type.caption}>Choose an area above to set its price.</Text> : null}
        <Notice text={error} />
        <Notice tone="green" text={done} />
      </KeyboardAwareScrollView>
      <SaveBar dirty={dirty} saving={saving} onSave={save} bottomInset={insets.bottom} />
    </View>
  );
}
