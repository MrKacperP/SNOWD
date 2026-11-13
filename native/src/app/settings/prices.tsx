import { Stack } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { quoteMarketplace } from "@/lib/marketplacePricing";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SHOVELING_SERVICES, isShovelingService, type ServiceType } from "@/lib/types";
import { Icon, Notice, AutosaveStatus, useAutosave } from "~/components/ui";
import { money } from "~/lib/format";
import { useAuth } from "~/context/auth";
import { usePriceAdvice, type PriceKey } from "~/lib/priceAdvice";
import { db } from "~/lib/firebase";
import { colors, radius, shadow, space, stepColor } from "~/lib/theme";

const TONES = [stepColor("accepted"), stepColor("en-route"), stepColor("in-progress"), stepColor("pending"), stepColor("completed")];

/** Pictures of the area: one, two or three cars for driveways, a walking figure or a patio for the rest. */
const PICTURES: Record<string, { icon: Parameters<typeof Icon>[0]["name"]; count: number }> = {
  small: { icon: "car.fill", count: 1 },
  medium: { icon: "car.fill", count: 2 },
  large: { icon: "car.fill", count: 3 },
  sidewalk: { icon: "figure.walk", count: 1 },
  backyardPatio: { icon: "sun.max.fill", count: 1 },
};

/** One price as a big card: picture and name, what the customer pays, and − amount +. */
function PriceCard({ label, size, value, onChange, tone, suggested }: { label: string; size: string; value: string; onChange: (v: string) => void; tone: (typeof TONES)[number]; suggested?: number }) {
  const n = Number(value);
  const valid = Number.isFinite(n) && n >= 0.01;
  const step = (delta: number) => {
    void Haptics.selectionAsync();
    const next = Math.max(5, Math.round(((Number.isFinite(n) ? n : 0) + delta) / 5) * 5);
    onChange(String(Math.min(10000, next)));
  };
  const picture = PICTURES[size] || PICTURES.small;
  const pays = valid ? money(Math.round(quoteMarketplace(n, "credit").price)).replace(".00", "") : "";
  return (
    <View style={styles.card}>
      <View style={[styles.picture, { backgroundColor: tone.soft }]}>
        <View style={{ flexDirection: "row", gap: 1 }}>
          {Array.from({ length: picture.count }, (_, i) => (
            <Icon key={i} name={picture.icon} size={picture.count > 2 ? 11 : 15} color={tone.text} />
          ))}
        </View>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.label} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{label}</Text>
        {suggested && n !== suggested ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Use suggested price ${suggested} dollars`} hitSlop={6} onPress={() => { void Haptics.selectionAsync(); onChange(String(suggested)); }}>
            <Text style={[styles.sub, { color: colors.accent, fontWeight: "800" }]}>Suggested ${suggested}</Text>
          </Pressable>
        ) : (
          <Text style={styles.sub}>{valid ? `They pay ${pays}` : "Set a price"}</Text>
        )}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Lower ${label} price by 5 dollars`} hitSlop={6} onPress={() => step(-5)} style={({ pressed }) => [styles.stepper, pressed && { transform: [{ scale: 0.9 }] }]}>
        <Icon name="minus" size={15} color={colors.ink} weight="bold" />
      </Pressable>
      <View style={styles.amount}>
        <Text style={{ fontSize: 17, fontWeight: "800", color: colors.muted }}>$</Text>
        <TextInput
          accessibilityLabel={`${label} price in dollars`}
          value={value}
          keyboardType="decimal-pad"
          selectTextOnFocus
          onChangeText={(v) => onChange(v.replace(/[^\d.]/g, ""))}
          style={{ fontSize: 26, fontWeight: "900", color: colors.ink, minWidth: 34, textAlign: "center", fontVariant: ["tabular-nums"], paddingVertical: 0 }}
        />
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Raise ${label} price by 5 dollars`} hitSlop={6} onPress={() => step(5)} style={({ pressed }) => [styles.stepper, { backgroundColor: tone.bar }, pressed && { transform: [{ scale: 0.9 }] }]}>
        <Icon name="plus" size={15} color="#fff" weight="bold" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minHeight: 76, maxHeight: 132, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: space.md, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadow },
  label: { fontSize: 17, lineHeight: 21, fontWeight: "800", color: colors.ink },
  sub: { fontSize: 13, lineHeight: 16, color: colors.muted },
  picture: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  stepper: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceAlt },
  amount: { flexDirection: "row", alignItems: "center", justifyContent: "center", minWidth: 74, height: 50, paddingHorizontal: 6, borderRadius: radius.md, backgroundColor: colors.bg },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 38, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1.5 },
  tipAll: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 12, minHeight: 34, borderRadius: 17, backgroundColor: colors.accentSoft },
});

// Same rows, defaults and grouping as the website's "Areas and prices".
const ROWS: [PriceKey, string, ServiceType[]][] = [
  ["small", "1-car driveway", ["driveway"]],
  ["medium", "2-car driveway", ["driveway"]],
  ["large", "3+ car driveway", ["driveway"]],
  ["sidewalk", "Porch & sidewalk", ["porch", "sidewalk"]],
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
  const advice = usePriceAdvice({ uid: user?.uid, lat: profile?.lat, lng: profile?.lng });
  const applySuggested = () => {
    if (!advice) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPrices((p) => ({ ...p, ...Object.fromEntries(Object.entries(advice.prices).map(([k, v]) => [k, String(v)])) }));
  };

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
    if (!services.length) return setError("Turn on at least one area.");
    if (Object.values(n).some((v) => !Number.isFinite(v) || v < 0.01 || v > 10000)) return setError("Each price must be $0.01 to $10,000.");
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
      setDone("Saved.");
    } catch {
      setError("Couldn’t save your prices. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const shown = ROWS.filter(([, , areas]) => areas.some((a) => services.includes(a)));

  // Saves on its own a moment after each change; no save button.
  useAutosave({ services, prices }, { dirty, save });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: "Prices" }} />
      <KeyboardAwareScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" bottomOffset={90} contentContainerStyle={{ flexGrow: 1, padding: space.lg, gap: 12, paddingBottom: insets.bottom + space.lg }}>
        {/* What you clear: tap to turn on or off. */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {SHOVELING_SERVICES.map(([value, label]) => {
            const on = services.includes(value);
            return (
              <Pressable key={value} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={label} onPress={() => { void Haptics.selectionAsync(); toggle(value); }} style={[styles.chip, { borderColor: on ? colors.accent : colors.border, backgroundColor: on ? colors.accentSoft : colors.surface }]}>
                <Icon name={on ? "checkmark" : "plus"} size={13} color={on ? colors.accent : colors.faint} weight="bold" />
                <Text style={{ fontWeight: "700", fontSize: 14, color: on ? colors.accentDark : colors.muted }}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Suggested prices on the left, the save status on the right (it saves on its own). */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 34 }}>
          {advice && shown.length && shown.some(([k]) => Number(prices[k]) !== advice.prices[k]) ? (
            <Pressable accessibilityRole="button" accessibilityLabel={advice.local ? `Use prices suggested from ${advice.count} shovelers near you` : "Use typical SNOWD prices"} onPress={applySuggested} style={({ pressed }) => [styles.tipAll, pressed && { opacity: 0.8 }]}>
              <Icon name="sparkles" size={14} color={colors.accent} />
              <Text style={{ color: colors.accent, fontWeight: "800", fontSize: 14 }}>Use suggested prices</Text>
            </Pressable>
          ) : null}
          {!(advice && shown.length && shown.some(([k]) => Number(prices[k]) !== advice.prices[k])) ? <View /> : null}
          <AutosaveStatus inline saving={saving} dirty={dirty} error={error} />
        </View>

        {/* One card per price; together they fill the screen. */}
        {shown.length ? (
          <View style={{ flex: 1, gap: 10 }}>
            {shown.map(([key, label]) => (
              <PriceCard key={key} label={label} size={key} suggested={advice?.prices[key]} tone={TONES[ROWS.findIndex(([k]) => k === key) % TONES.length]} value={prices[key]} onChange={(v) => setPrices((p) => ({ ...p, [key]: v }))} />
            ))}
          </View>
        ) : (
          <Notice tone="orange" text="Turn on an area to set its price." />
        )}
        <Notice text={error} />
      </KeyboardAwareScrollView>
    </View>
  );
}
