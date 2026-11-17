import * as Haptics from "expo-haptics";
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import type { DrivewayLayout, ServiceType } from "@/lib/types";
import { grid, Roof, TopCar, type CarCount } from "~/components/onboarding/Driveway";
import { Icon } from "~/components/ui";
import { ds, family } from "~/lib/theme";

type Area = "driveway" | "porch" | "sidewalk" | "backyard-patio";
type AreaIcon = "car.fill" | "door.left.hand.open" | "figure.walk" | "sun.max.fill";

/** The four places we clear. The walkway is booked as "porch": the front path and its steps. */
const AREAS: { key: Area; title: string; hint: string; icon: AreaIcon }[] = [
  { key: "driveway", title: "Driveway", hint: "From the garage to the street", icon: "car.fill" },
  { key: "porch", title: "Walkway", hint: "The path and steps up to your front door", icon: "door.left.hand.open" },
  { key: "sidewalk", title: "Sidewalk", hint: "The public sidewalk in front of your home", icon: "figure.walk" },
  { key: "backyard-patio", title: "Patio", hint: "The deck or patio out back", icon: "sun.max.fill" },
];
const BY_KEY = Object.fromEntries(AREAS.map((a) => [a.key, a])) as Record<Area, (typeof AREAS)[number]>;

/** Each area's own ground, so they read as different surfaces at a glance. */
const GROUND: Record<Area, string> = { driveway: "#a3afb8", porch: "#d8cab8", sidewalk: "#cbd5dc", "backyard-patio": "#d8cab8" };
const CAR_COLOURS = ["#2350ff", "#e9eef2", "#ff8b45"];
const FADE = { duration: 220, easing: Easing.out(Easing.cubic) };

type Box = { x: number; y: number; w: number; h: number };
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Where everything sits, seen from above, for the frame it's given. Patio out back at the top,
 * then the house, the front yard with the driveway and walkway, the sidewalk and the street.
 * The driveway is the same slab as the driveway step, with a spot for each car they said fits.
 */
function layoutFor(W: number, H: number, cars: CarCount, fit: DrivewayLayout) {
  const m = 14;
  const streetH = 18;
  const walkH = clamp(H * 0.075, 24, 30);
  const sidewalkTop = H - streetH - walkH;
  const patioTop = m;
  const patioH = clamp(H * 0.15, 40, 64);
  const houseTop = patioTop + patioH;
  const houseH = clamp(H * 0.24, 64, 110);
  const frontTop = houseTop + houseH;
  const frontH = sidewalkTop - frontTop;
  const houseLeft = m + 4;
  const houseRight = W - m - 4;

  // The driveway: dashed spots sized like the driveway step's, as big as the yard allows,
  // with room left at the street end for its label.
  const { cols, rows } = grid(cars, fit);
  const pad = 6;
  const gap = 6;
  const tagRoom = 30;
  const fromH = (frontH - tagRoom - 2 * pad - (rows - 1) * gap) / rows / 1.55;
  const fromW = (W * 0.52 - 2 * pad - (cols - 1) * gap) / cols;
  const spotW = Math.max(14, Math.min(56, Math.floor(Math.min(fromH, fromW))));
  const spotH = Math.round(spotW * 1.55);
  const spotsW = cols * spotW + (cols - 1) * gap;
  const driveW = Math.max(spotsW + pad * 2, 100);
  const driveRight = houseRight - 12;
  const driveLeft = driveRight - driveW;
  const spots = Array.from({ length: cars }, (_, i) => ({
    x: (driveW - spotsW) / 2 + (i % cols) * (spotW + gap),
    y: pad + Math.floor(i / cols) * (spotH + gap),
  }));

  // The walkway runs from the front door, halfway along the rest of the house, to the sidewalk.
  const doorX = Math.round((houseLeft + driveLeft) / 2);
  const pathW = 24;
  const path: Box = { x: doorX - pathW / 2, y: frontTop, w: pathW, h: frontH };

  const patioW = Math.round((houseRight - houseLeft) * 0.56);
  const patio: Box = { x: (W - patioW) / 2, y: patioTop, w: patioW, h: patioH };
  const drive: Box = { x: driveLeft, y: frontTop, w: driveW, h: frontH };
  const sidewalk: Box = { x: 0, y: sidewalkTop, w: W, h: walkH };

  const zones: Record<Area, Box[]> = { driveway: [drive], porch: [path], sidewalk: [sidewalk], "backyard-patio": [patio] };
  const tags: Record<Area, { x: number; y: number }> = {
    driveway: { x: driveLeft + driveW / 2, y: frontTop + frontH - tagRoom / 2 - 2 },
    porch: { x: doorX, y: frontTop + frontH * 0.5 },
    sidewalk: { x: (doorX + driveLeft) / 2, y: sidewalkTop + walkH / 2 },
    "backyard-patio": { x: W / 2, y: patioTop + patioH / 2 },
  };
  return { W, H, streetH, houseTop, houseH, houseLeft, houseRight, frontTop, drive, doorX, spots, spotW, spotH, zones, tags };
}

/** One area: its ground, anything drawn on it, and a blue outline that fades in when it's picked. */
function AreaShape({ boxes, area, on, onPress, children }: { boxes: Box[]; area: Area; on: boolean; onPress: () => void; children?: ReactNode }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    t.value = reduce ? (on ? 1 : 0) : withTiming(on ? 1 : 0, FADE);
  }, [on, reduce, t]);
  const ring = useAnimatedStyle(() => ({ opacity: t.value }));
  // Paths that run to the sidewalk are square where they meet it, so they read as joined.
  const r = area === "sidewalk" ? 0 : area === "backyard-patio" ? 8 : area === "driveway" ? 12 : 6;
  const reachesWalk = area === "driveway" || area === "porch";
  const corners = { borderTopLeftRadius: r, borderTopRightRadius: r, borderBottomLeftRadius: reachesWalk ? 0 : r, borderBottomRightRadius: reachesWalk ? 0 : r };
  return (
    <>
      {boxes.map((b, i) => (
        <Pressable
          key={i}
          accessible={false}
          onPress={onPress}
          hitSlop={b.w < 30 ? { left: 14, right: 14 } : undefined}
          style={{ position: "absolute", left: b.x, top: b.y, width: b.w, height: b.h, ...corners, backgroundColor: GROUND[area] }}
        >
          {i === 0 ? children : null}
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.picked, corners, area === "sidewalk" && styles.flatEnds, ring]} />
        </Pressable>
      ))}
    </>
  );
}

/**
 * The client's home from above, and only that: the patio out back, the house, the driveway with
 * their cars, the walkway to the front door, and the sidewalk. Tap an area, or its button below,
 * to have it cleared: picked areas are outlined in blue and their label turns blue with a tick.
 */
function HouseScene({ W, H, cars, fit, selected, onToggle }: { W: number; H: number; cars: CarCount; fit: DrivewayLayout; selected: ServiceType[]; onToggle: (a: Area) => void }) {
  const p = layoutFor(W, H, cars, fit);
  const houseW = p.houseRight - p.houseLeft;
  return (
    <View style={[styles.scene, { width: W, height: H }]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {/* The street, so the sidewalk reads as the one out front. */}
      <View style={[styles.street, { top: H - p.streetH, height: p.streetH }]}>
        {Array.from({ length: 6 }, (_, i) => <View key={i} style={styles.dash} />)}
      </View>

      <AreaShape area="backyard-patio" boxes={p.zones["backyard-patio"]} on={selected.includes("backyard-patio")} onPress={() => onToggle("backyard-patio")} />
      <AreaShape area="sidewalk" boxes={p.zones.sidewalk} on={selected.includes("sidewalk")} onPress={() => onToggle("sidewalk")} />
      <AreaShape area="porch" boxes={p.zones.porch} on={selected.includes("porch")} onPress={() => onToggle("porch")} />
      <AreaShape area="driveway" boxes={p.zones.driveway} on={selected.includes("driveway")} onPress={() => onToggle("driveway")}>
        {p.spots.map((s, i) => (
          <View key={i} pointerEvents="none" style={[styles.spot, { left: s.x, top: s.y, width: p.spotW, height: p.spotH }]}>
            <TopCar colour={CAR_COLOURS[i]} width={p.spotW * 0.62} />
          </View>
        ))}
      </AreaShape>

      {/* The house, with its garage door over the driveway and its front door over the walkway. */}
      <View pointerEvents="none" style={[styles.house, { left: p.houseLeft, top: p.houseTop, width: houseW, height: p.houseH }]}>
        <Roof width={houseW} height={p.houseH} radius={12} />
        <View style={styles.homeTag}>
          <Icon name="house.fill" size={12} color="rgba(255,255,255,0.9)" />
          <Text style={styles.homeText} maxFontSizeMultiplier={1.1}>Your home</Text>
        </View>
      </View>
      <View pointerEvents="none" style={[styles.garageDoor, { left: p.drive.x + 8, top: p.frontTop - 5, width: p.drive.w - 16 }]} />
      <View pointerEvents="none" style={[styles.frontDoor, { left: p.doorX - 10, top: p.frontTop - 6 }]} />

      {/* Each area's name, with a tick once it's picked. */}
      {AREAS.map((a) => {
        const on = selected.includes(a.key);
        const t = p.tags[a.key];
        return (
          <View key={a.key} pointerEvents="none" style={[styles.tagWrap, { left: clamp(t.x - 60, 4, W - 124), top: t.y - 12 }]}>
            <View style={[styles.tag, on && { backgroundColor: ds.accent }]}>
              <Icon name={on ? "checkmark" : BY_KEY[a.key].icon} size={10} color={on ? "#fff" : ds.ink2} weight="bold" />
              <Text style={[styles.tagText, on && { color: "#fff" }]} numberOfLines={1} maxFontSizeMultiplier={1.1}>{a.title}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** A button under the picture for one area: the same choice as tapping it on the picture. */
function Chip({ title, hint, icon, on, onToggle }: { title: string; hint: string; icon: AreaIcon; on: boolean; onToggle: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={title}
      accessibilityHint={hint}
      onPress={onToggle}
      style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && { transform: [{ scale: 0.97 }] }]}
    >
      <Icon name={on ? "checkmark" : icon} size={14} color={on ? "#fff" : ds.ink3} weight={on ? "bold" : undefined} />
      <Text style={[styles.chipText, on && { color: "#fff" }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>{title}</Text>
    </Pressable>
  );
}

/**
 * What to clear, drawn the way the driveway step is: one plain picture of their home that fills
 * the space, and the choices underneath. The driveway carries the cars they said fit.
 */
export function YardPicker({ value, onChange, cars, layout }: { value: ServiceType[]; onChange: (value: ServiceType[]) => void; cars: CarCount; layout: DrivewayLayout }) {
  const { width } = useWindowDimensions();
  const W = width - 48;
  // The picture takes whatever height is left on the page, like the driveway step.
  const [H, setH] = useState(0);
  const toggle = (key: ServiceType) => {
    void Haptics.selectionAsync();
    onChange(value.includes(key) ? value.filter((v) => v !== key) : [...value, key]);
  };
  return (
    <View style={{ flex: 1, gap: 16 }}>
      <View style={{ flex: 1, minHeight: 300 }} onLayout={(e) => setH(Math.round(e.nativeEvent.layout.height))}>
        {H ? <HouseScene W={W} H={H} cars={cars} fit={layout} selected={value} onToggle={toggle} /> : null}
      </View>
      <View style={styles.chips}>
        {AREAS.map((r) => (
          <Chip key={r.key} title={r.title} hint={r.hint} icon={r.icon} on={value.includes(r.key)} onToggle={() => toggle(r.key)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: { alignSelf: "center", backgroundColor: "#f4f7fa", borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: ds.borderSoft },
  street: { position: "absolute", left: 0, right: 0, backgroundColor: "#8b98a2", flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  dash: { width: 14, height: 2.5, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.7)" },
  house: { position: "absolute", borderRadius: 12, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  homeTag: { position: "absolute", flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, height: 24, borderRadius: 12, backgroundColor: "#2c4453" },
  homeText: { fontSize: 12, lineHeight: 15, color: "rgba(255,255,255,0.9)", fontFamily: family.bodyBold, letterSpacing: 0.3 },
  garageDoor: { position: "absolute", height: 5, borderTopLeftRadius: 2, borderTopRightRadius: 2, backgroundColor: "#e9eef2" },
  frontDoor: { position: "absolute", width: 20, height: 6, borderTopLeftRadius: 2, borderTopRightRadius: 2, backgroundColor: ds.sun },
  spot: { position: "absolute", alignItems: "center", justifyContent: "center", borderRadius: 5, borderWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.85)" },
  picked: { borderWidth: 2.5, borderColor: ds.accent, backgroundColor: "rgba(35,80,255,0.14)" },
  flatEnds: { borderLeftWidth: 0, borderRightWidth: 0 },
  tagWrap: { position: "absolute", width: 120, height: 24, alignItems: "center", justifyContent: "center" },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.96)", borderRadius: 999, paddingHorizontal: 9, height: 22, boxShadow: "0px 1px 4px rgba(17,43,59,0.12)" },
  tagText: { fontSize: 12, lineHeight: 15, color: ds.ink, fontFamily: family.bodyBold },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexGrow: 1, flexBasis: "45%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 48, paddingHorizontal: 14, borderRadius: 999, backgroundColor: ds.card, borderWidth: 1.5, borderColor: ds.border },
  chipOn: { backgroundColor: ds.accent, borderColor: ds.accent },
  chipText: { fontSize: 16, color: ds.ink, fontFamily: family.bodySemi },
});
