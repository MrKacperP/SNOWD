import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { DRIVEWAY_SIZES, sizeForCars } from "~/components/onboarding/Driveway";
import { PlanThumb } from "~/components/onboarding/SitePlan";
import { Icon } from "~/components/ui";
import { ds, family } from "~/lib/theme";

export type SheetPriceKey = "small" | "medium" | "large" | "sidewalk" | "porch" | "backyardPatio";
export type OfferKey = "driveway" | "porch" | "sidewalk" | "backyard-patio";
export const OFFERS: { key: OfferKey; label: string }[] = [
  { key: "driveway", label: "Driveway" },
  { key: "porch", label: "Walkway" },
  { key: "sidewalk", label: "Sidewalk" },
  { key: "backyard-patio", label: "Patio" },
];
const EXTRAS: { key: Exclude<OfferKey, "driveway">; price: SheetPriceKey; label: string; body: string }[] = [
  { key: "porch", price: "porch", label: "Walkway", body: "Front path and steps" },
  { key: "sidewalk", price: "sidewalk", label: "Sidewalk", body: "Public sidewalk out front" },
  { key: "backyard-patio", price: "backyardPatio", label: "Backyard patio", body: "Deck or patio out back" },
];
export const PRICE_MIN = 5;
export const PRICE_MAX = 500;
export const clampPrice = (v: number) => Math.min(PRICE_MAX, Math.max(PRICE_MIN, v));

/** − $35 +: a price that steps by $5. The number changes in place, it never animates. */
function Stepper({ label, value, onChange, disabled }: { label: string; value: number; onChange: (v: number) => void; disabled?: boolean }) {
  const step = (delta: number) => {
    void Haptics.selectionAsync();
    onChange(Math.round((value + delta) / 5) * 5);
  };
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`${label} price`}
      accessibilityValue={{ text: disabled ? "Not offered" : `$${value}` }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) => !disabled && step(e.nativeEvent.actionName === "increment" ? 5 : -5)}
      style={[styles.stepper, disabled && { opacity: 0.4 }]}
    >
      <Pressable disabled={disabled || value <= PRICE_MIN} hitSlop={4} onPress={() => step(-5)} style={({ pressed }) => [styles.stepBtn, pressed && { backgroundColor: ds.border }]}>
        <Icon name="minus" size={13} color={ds.ink} weight="bold" />
      </Pressable>
      <Text style={styles.amount} maxFontSizeMultiplier={1.2}>{disabled ? "Off" : `$${value}`}</Text>
      <Pressable disabled={disabled || value >= PRICE_MAX} hitSlop={4} onPress={() => step(5)} style={({ pressed }) => [styles.stepBtn, pressed && { backgroundColor: ds.border }]}>
        <Icon name="plus" size={13} color={ds.ink} weight="bold" />
      </Pressable>
    </View>
  );
}

function Check({ on }: { on: boolean }) {
  return <View style={[styles.check, on && styles.checkOn]}>{on ? <Icon name="checkmark" size={13} color="#fff" weight="bold" /> : null}</View>;
}

/**
 * The operator's price sheet, the same in onboarding and in Settings → Prices: driveways priced by
 * size in one card, the smaller areas in another. Each service has a switch to offer it or not, and
 * a − $ + stepper for its price per visit. `compact` tightens the rows so the whole sheet fits on
 * one screen; `customerPays` adds what the customer is charged under each price.
 */
export function PriceSheet({
  prices,
  offer,
  suggested,
  nearby,
  onPrice,
  onOffer,
  onUseSuggested,
  compact,
  customerPays,
}: {
  prices: Record<SheetPriceKey, number>;
  offer: Record<OfferKey, boolean>;
  suggested?: (key: SheetPriceKey) => number | undefined;
  nearby: number;
  onPrice: (key: SheetPriceKey, v: number) => void;
  onOffer: (key: OfferKey) => void;
  onUseSuggested: () => void;
  compact?: boolean;
  customerPays?: (price: number) => string;
}) {
  const hint = (key: SheetPriceKey, on: boolean) => {
    const s = suggested?.(key);
    return on && s && s !== prices[key] ? `Nearby: $${s}` : null;
  };
  const sub = (key: SheetPriceKey, on: boolean, fallback: string) => hint(key, on) || (customerPays && on ? `${fallback} · they pay ${customerPays(prices[key])}` : fallback);
  const differs = !!suggested && (Object.keys(prices) as SheetPriceKey[]).some((k) => suggested(k) && suggested(k) !== prices[k]);
  const row = [styles.sheetRow, compact && styles.sheetRowCompact];
  return (
    <View style={{ gap: compact ? 12 : 20 }}>
      {nearby ? (
        <View style={[styles.advice, compact && { paddingVertical: 9 }]}>
          <Icon name="chart.bar.fill" size={16} color={ds.accent} />
          <Text style={styles.adviceText}>{`Suggested from ${nearby} shovelers near you.`}</Text>
          {differs ? (
            <Pressable accessibilityRole="button" hitSlop={8} onPress={onUseSuggested}>
              <Text style={styles.adviceLink}>Use all</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={{ gap: compact ? 6 : 8 }}>
        <Text style={styles.sheetLabel}>DRIVEWAYS</Text>
        <View style={styles.sheet}>
          <View style={[styles.sheetHead, compact && { paddingVertical: 10 }]}>
            <View style={[styles.sheetIcon, offer.driveway && { backgroundColor: ds.accentSoft }]}>
              <Icon name="car.fill" size={18} color={offer.driveway ? ds.accent : ds.ink3} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>Driveway clearing</Text>
              {compact ? null : <Text style={styles.sheetSub}>Priced by how many cars fit</Text>}
            </View>
            <Switch
              accessibilityLabel="Offer driveway clearing"
              value={offer.driveway}
              onValueChange={() => {
                void Haptics.selectionAsync();
                onOffer("driveway");
              }}
              trackColor={{ true: ds.accent, false: "#d5dde3" }}
            />
          </View>
          {DRIVEWAY_SIZES.map((d) => {
            const key = sizeForCars(d.cars) as SheetPriceKey;
            return (
              <View key={d.cars} style={row}>
                <PlanThumb area="driveway" cars={d.cars} width={compact ? 48 : 64} height={compact ? 40 : 52} dim={!offer.driveway} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{d.name}</Text>
                  <Text style={styles.rowSub} numberOfLines={1}>{sub(key, offer.driveway, d.sub)}</Text>
                </View>
                <Stepper label={`${d.name} driveway`} value={prices[key]} disabled={!offer.driveway} onChange={(v) => onPrice(key, v)} />
              </View>
            );
          })}
        </View>
      </View>

      <View style={{ gap: compact ? 6 : 8 }}>
        <Text style={styles.sheetLabel}>OTHER AREAS</Text>
        <View style={styles.sheet}>
          {EXTRAS.map((x, i) => {
            const on = offer[x.key];
            const toggle = () => {
              void Haptics.selectionAsync();
              onOffer(x.key);
            };
            if (!compact)
              return (
                <View key={x.key} style={[styles.area, i === 0 && { borderTopWidth: 0 }]}>
                  <Pressable accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={`Offer ${x.label}. ${x.body}`} onPress={toggle} style={styles.areaHead}>
                    <PlanThumb area={x.key} dim={!on} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle} numberOfLines={1}>{x.label}</Text>
                      <Text style={styles.rowSub} numberOfLines={1}>{x.body}</Text>
                    </View>
                    <Switch accessibilityElementsHidden importantForAccessibility="no" value={on} onValueChange={toggle} trackColor={{ true: ds.accent, false: "#d5dde3" }} />
                  </Pressable>
                  <View style={styles.areaPrice}>
                    <Text style={[styles.rowSub, { flex: 1 }]} numberOfLines={1}>{hint(x.price, on) || (on ? "Price per visit" : "Not offered")}</Text>
                    <Stepper label={x.label} value={prices[x.price]} disabled={!on} onChange={(v) => onPrice(x.price, v)} />
                  </View>
                </View>
              );
            return (
              <View key={x.key} style={[row, i === 0 && { borderTopWidth: 0 }]}>
                <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`Offer ${x.label}`} hitSlop={6} onPress={toggle} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Check on={on} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{x.label}</Text>
                    <Text style={styles.rowSub} numberOfLines={1}>{sub(x.price, on, on ? "Offered" : "Not offered")}</Text>
                  </View>
                </Pressable>
                <Stepper label={x.label} value={prices[x.price]} disabled={!on} onChange={(v) => onPrice(x.price, v)} />
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  advice: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, backgroundColor: ds.accentSoft },
  adviceText: { flex: 1, fontSize: 15, lineHeight: 20, color: ds.ink2, fontFamily: family.bodyMedium },
  adviceLink: { fontSize: 15, color: ds.accent, fontFamily: family.bodyBold },
  sheetLabel: { fontSize: 12, letterSpacing: 0.8, color: ds.ink3, fontFamily: family.bodyBold, paddingHorizontal: 4 },
  sheet: { backgroundColor: ds.card, borderRadius: 20, borderWidth: 1, borderColor: ds.borderSoft, overflow: "hidden" },
  sheetHead: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  sheetIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: ds.bgAlt, alignItems: "center", justifyContent: "center" },
  sheetTitle: { fontSize: 17, lineHeight: 22, color: ds.ink, fontFamily: family.bodySemi },
  sheetSub: { fontSize: 14, lineHeight: 19, color: ds.ink3, fontFamily: family.body },
  sheetRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 8, minHeight: 64, borderTopWidth: 1, borderTopColor: ds.borderSoft },
  sheetRowCompact: { minHeight: 54 },
  area: { borderTopWidth: 1, borderTopColor: ds.borderSoft, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, gap: 8 },
  areaHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  areaPrice: { flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 76 },
  rowTitle: { fontSize: 16, lineHeight: 21, color: ds.ink, fontFamily: family.bodySemi },
  rowSub: { fontSize: 13, lineHeight: 18, color: ds.ink3, fontFamily: family.body, fontVariant: ["tabular-nums"] },
  stepper: { flexDirection: "row", alignItems: "center", gap: 2, padding: 3, borderRadius: 14, backgroundColor: ds.bgAlt },
  stepBtn: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: ds.card },
  amount: { width: 56, textAlign: "center", fontSize: 17, color: ds.ink, fontFamily: family.headingSemi, fontVariant: ["tabular-nums"] },
  check: { width: 26, height: 26, borderRadius: 8, borderWidth: 1.5, borderColor: ds.border, alignItems: "center", justifyContent: "center", backgroundColor: ds.card },
  checkOn: { backgroundColor: ds.accent, borderColor: ds.accent },
});
