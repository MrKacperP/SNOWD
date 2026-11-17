import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import type { DrivewayLayout, HomeStyle, ServiceType } from "@/lib/types";
import { grid, Roof, TopCar, type CarCount } from "~/components/onboarding/Driveway";
import { Icon } from "~/components/ui";
import { ds, family } from "~/lib/theme";

export type { HomeStyle };
export type PlanArea = "driveway" | "porch" | "sidewalk" | "backyard-patio";
type Box = { x: number; y: number; w: number; h: number };

export const HOME_STYLES: { key: HomeStyle; label: string; note: string }[] = [
  { key: "detached", label: "Detached", note: "A house on its own lot." },
  { key: "attached", label: "Semi or town", note: "Shares a wall with the house next door." },
  { key: "corner", label: "Corner lot", note: "A sidewalk along the front and the side." },
];

/** Ground colours once the snow is off. */
const GROUND: Record<PlanArea, string> = { driveway: "#8f9ca5", porch: "#cdbfae", sidewalk: "#cfd8de", "backyard-patio": "#c9b8a6" };
const CAR_COLOURS = ["#2350ff", "#e9eef2", "#ff8b45"];

/**
 * Where everything sits on a home's lot, seen from above, for any width. Backyard at the top,
 * then the house, the front yard (as deep as the driveway needs), the sidewalk and the street.
 * The driveway is drawn as wide and as deep as the cars the client said fit, so a two-car
 * side-by-side drive and a three-car tandem drive look like what they are.
 */
export function planFor(style: HomeStyle, W: number, cars: CarCount, layout: DrivewayLayout) {
  const u = W / 345;
  const { cols, rows } = grid(cars, layout);
  const carW = 22 * u;
  const carH = carW * 1.7;
  const gap = 6 * u;
  const pad = 8 * u;
  const bay = carW + 12 * u;
  const sideStreet = style === "corner" ? 30 * u : 0;
  const sideWalk = style === "corner" ? 18 * u : 0;

  const patioTop = 14 * u;
  const patioH = 50 * u;
  const houseTop = 78 * u;
  const houseH = 76 * u;
  const frontTop = houseTop + houseH;
  const depth = rows * carH + (rows - 1) * gap + pad * 2;
  const frontH = Math.max(78 * u, depth + 28 * u);
  const walkTop = frontTop + frontH;
  const walkH = 18 * u;
  const streetTop = walkTop + walkH;
  const H = streetTop + 30 * u;

  const lotRight = W - sideStreet - sideWalk;
  const houseLeft = style === "attached" ? W * 0.4 : 16 * u;
  const houseRight = lotRight - 14 * u;
  const driveW = cols * bay + 8 * u;
  const driveRight = houseRight - 8 * u;
  const driveLeft = driveRight - driveW;
  const doorX = style === "attached" ? (houseLeft + driveLeft) / 2 : Math.min(houseLeft + (driveLeft - houseLeft) * 0.45, driveLeft - 40 * u);
  const patioW = (houseRight - houseLeft) * (style === "attached" ? 0.5 : 0.42);
  const patioX = houseLeft + (style === "attached" ? 14 : 20) * u;

  const zones: Record<PlanArea, Box[]> = {
    driveway: [{ x: driveLeft, y: frontTop, w: driveW, h: frontH }],
    porch: [
      { x: doorX - 26 * u, y: frontTop, w: 52 * u, h: 20 * u },
      { x: doorX - 8 * u, y: frontTop + 20 * u, w: 16 * u, h: frontH - 20 * u },
    ],
    sidewalk:
      style === "corner"
        ? [
            { x: 0, y: walkTop, w: W - sideStreet, h: walkH },
            { x: lotRight, y: 0, w: sideWalk, h: walkTop },
          ]
        : [{ x: 0, y: walkTop, w: W, h: walkH }],
    "backyard-patio": [{ x: patioX, y: patioTop, w: patioW, h: patioH }],
  };
  const tags: Record<PlanArea, { x: number; y: number }> = {
    driveway: { x: driveLeft + driveW / 2, y: frontTop + frontH - 14 * u },
    porch: { x: doorX, y: frontTop + 20 * u + (frontH - 20 * u) / 2 },
    sidewalk: { x: (W - sideStreet) / 2, y: walkTop + walkH / 2 },
    "backyard-patio": { x: patioX + patioW * 0.36, y: patioTop + patioH / 2 },
  };
  const slots = Array.from({ length: cars }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return { x: driveRight - 4 * u - (col + 1) * bay + (bay - carW) / 2, y: frontTop + pad + row * (carH + gap) };
  });
  const garageDoors = Array.from({ length: cols }, (_, c) => ({ x: driveRight - 4 * u - (c + 1) * bay + 5 * u, w: bay - 10 * u }));
  return { u, W, H, cols, carW, carH, houseTop, houseH, houseLeft, houseRight, frontTop, frontH, walkTop, walkH, streetTop, sideStreet, lotRight, doorX, patioX, patioW, patioTop, patioH, zones, tags, slots, garageDoors };
}

const FADE = { duration: 240, easing: Easing.out(Easing.cubic) };
const DRIFT: [number, number][] = [[14, 22], [62, 30], [36, 64], [82, 70], [48, 12], [24, 84]];

/** One area: paved ground under a layer of snow that clears away, outlined in blue, when picked. */
function Area({ boxes, ground, on, onPress }: { boxes: Box[]; ground: string; on: boolean; onPress?: () => void }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    t.value = reduce ? (on ? 1 : 0) : withTiming(on ? 1 : 0, FADE);
  }, [on, reduce, t]);
  const snow = useAnimatedStyle(() => ({ opacity: 1 - t.value }));
  const ring = useAnimatedStyle(() => ({ opacity: t.value }));
  return (
    <>
      {boxes.map((b, i) => (
        <Pressable key={i} accessible={false} disabled={!onPress} onPress={onPress} style={{ position: "absolute", left: b.x, top: b.y, width: b.w, height: b.h }}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: ground }]} />
          <Animated.View style={[StyleSheet.absoluteFill, styles.snow, snow]}>
            {DRIFT.map(([x, y], j) => (
              <View key={j} style={[styles.flake, { left: `${x}%`, top: `${y}%` }]} />
            ))}
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, styles.picked, ring]} />
        </Pressable>
      ))}
    </>
  );
}

const LABEL: Record<PlanArea, { text: string; icon: "car.fill" | "door.left.hand.open" | "figure.walk" | "sun.max.fill" }> = {
  driveway: { text: "Driveway", icon: "car.fill" },
  porch: { text: "Walkway", icon: "door.left.hand.open" },
  sidewalk: { text: "Sidewalk", icon: "figure.walk" },
  "backyard-patio": { text: "Patio", icon: "sun.max.fill" },
};

/** A row of short dashes, for the line between two lots. */
function LotLine({ x, top, bottom, u }: { x: number; top: number; bottom: number; u: number }) {
  const n = Math.max(0, Math.floor((bottom - top) / (9 * u)));
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <View key={i} style={{ position: "absolute", left: x, top: top + i * 9 * u, width: 1.5, height: 5 * u, backgroundColor: "#c3ced6" }} />
      ))}
    </>
  );
}

/**
 * A home's lot from above, drawn for its style and driveway. Full size, each area carries snow
 * that clears when it's picked, with its name on it; tap an area to pick it. `mini` draws a small
 * flat version for thumbnails, with `selected` areas filled in blue and no labels.
 */
export function SitePlan({
  style,
  cars,
  layout,
  width,
  selected,
  onToggle,
  mini,
  dim,
}: {
  style: HomeStyle;
  cars: CarCount;
  layout: DrivewayLayout;
  width: number;
  selected: ServiceType[];
  onToggle?: (area: PlanArea) => void;
  mini?: boolean;
  /** Mini only: draw everything faded, for a service that isn't offered. */
  dim?: boolean;
}) {
  const p = planFor(style, width, cars, layout);
  const { u } = p;
  const areas = Object.keys(p.zones) as PlanArea[];
  const box = (b: Box, extra?: ViewStyle): ViewStyle => ({ position: "absolute", left: b.x, top: b.y, width: b.w, height: b.h, ...extra });
  return (
    <View style={[mini ? styles.miniLot : styles.lot, { width, height: p.H }, dim && { opacity: 0.45 }]}>
      {/* Trees and shrubs, kept to the edges so they never cover an area. */}
      {mini ? null : (
        <>
          <View style={[styles.tree, { left: p.houseRight - 58 * u, top: 8 * u, width: 40 * u, height: 40 * u }]} />
          <View style={[styles.tree, { left: p.houseRight - 24 * u, top: 32 * u, width: 22 * u, height: 22 * u }]} />
          {style === "attached" ? null : <View style={[styles.tree, { left: 10 * u, top: p.walkTop - 38 * u, width: 26 * u, height: 26 * u }]} />}
        </>
      )}

      {/* Next door, for a semi or townhouse: their roof against yours, and the lot line between. */}
      {style === "attached" ? (
        <>
          <View style={[styles.house, { left: -12 * u, top: p.houseTop, borderRadius: mini ? 2 : 10 }]}>
            <Roof width={p.houseLeft + 12 * u - 2} height={p.houseH} radius={mini ? 2 : 10} muted />
          </View>
          <View style={box({ x: 14 * u, y: p.frontTop, w: 42 * u, h: p.frontH }, { backgroundColor: "#dfe5ea" })} />
          {mini ? null : (
            <>
              <LotLine x={p.houseLeft - 1} top={6 * u} bottom={p.houseTop - 4 * u} u={u} />
              <LotLine x={p.houseLeft - 1} top={p.frontTop + 4 * u} bottom={p.walkTop - 2 * u} u={u} />
              <Text style={[styles.neighbour, { left: 14 * u, top: p.houseTop + p.houseH / 2 - 8 }]} maxFontSizeMultiplier={1}>Next door</Text>
            </>
          )}
        </>
      ) : null}

      {/* The house. */}
      <View style={[styles.house, { left: p.houseLeft, top: p.houseTop, borderRadius: mini ? 3 : 10 }]}>
        <Roof width={p.houseRight - p.houseLeft} height={p.houseH} radius={mini ? 3 : 10} />
      </View>

      {/* Streets. */}
      <View style={[styles.street, { top: p.streetTop, height: p.H - p.streetTop }]}>
        {mini ? null : Array.from({ length: 8 }, (_, i) => <View key={i} style={styles.dash} />)}
      </View>
      {p.sideStreet ? <View style={[styles.street, { left: width - p.sideStreet, right: 0, top: 0, height: p.H }]} /> : null}

      {/* The areas. */}
      {areas.map((a) =>
        mini ? (
          p.zones[a].map((b, i) => <View key={`${a}${i}`} style={box(b, { backgroundColor: selected.includes(a) ? ds.accent : "#e2e8ed" })} />)
        ) : (
          <Area key={a} boxes={p.zones[a]} ground={GROUND[a]} on={selected.includes(a)} onPress={onToggle ? () => onToggle(a) : undefined} />
        ),
      )}

      {/* What makes each area recognisable: doors, cars, steps and the patio table. */}
      <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
        {p.garageDoors.map((d, i) => (
          <View key={i} style={[styles.garageDoor, { left: d.x, top: p.frontTop - 6 * u, width: d.w, height: 6 * u }]} />
        ))}
        <View style={[styles.frontDoor, { left: p.doorX - 10 * u, top: p.frontTop - 7 * u, width: 20 * u, height: 7 * u }]} />
        {p.slots.map((s, i) =>
          mini ? (
            <View key={i} style={{ position: "absolute", left: s.x, top: s.y, width: p.carW, height: p.carH, borderRadius: 2 * u, backgroundColor: selected.includes("driveway") ? "#ffffff" : "#9fb0bb" }} />
          ) : (
            <View key={i} style={{ position: "absolute", left: s.x, top: s.y }}>
              <TopCar colour={CAR_COLOURS[i]} width={p.carW} />
            </View>
          ),
        )}
        {mini ? null : (
          <>
            <View style={[styles.step, { left: p.doorX - 18 * u, top: p.frontTop + 7 * u, width: 36 * u }]} />
            <View style={[styles.step, { left: p.doorX - 18 * u, top: p.frontTop + 13 * u, width: 36 * u }]} />
            <View style={[styles.backDoor, { left: p.patioX + p.patioW * 0.36 - 14 * u, top: p.houseTop - 2, width: 28 * u }]} />
            <View style={[styles.table, { left: p.patioX + p.patioW * 0.76 - 9 * u, top: p.patioTop + p.patioH / 2 - 9 * u, width: 18 * u, height: 18 * u }]} />
            {[[-15, 0], [15, 0], [0, -14], [0, 14]].map(([dx, dy], i) => (
              <View key={i} style={[styles.chair, { left: p.patioX + p.patioW * 0.76 - 4 * u + dx * u, top: p.patioTop + p.patioH / 2 - 4 * u + dy * u, width: 8 * u, height: 8 * u }]} />
            ))}
          </>
        )}
      </View>

      {/* Each area's name, with a tick once it's picked. */}
      {mini
        ? null
        : areas.map((a) => {
            const on = selected.includes(a);
            const t = p.tags[a];
            return (
              <View key={a} style={[styles.tagWrap, { pointerEvents: "none", left: Math.min(width - 120, Math.max(0, t.x - 60)), top: t.y - 12 }]}>
                <View style={[styles.tag, on && { backgroundColor: ds.accent }]}>
                  <Icon name={on ? "checkmark" : LABEL[a].icon} size={10} color={on ? "#fff" : ds.ink2} weight="bold" />
                  <Text style={[styles.tagText, on && { color: "#fff" }]} numberOfLines={1} maxFontSizeMultiplier={1.1}>{LABEL[a].text}</Text>
                </View>
              </View>
            );
          })}
    </View>
  );
}

const styles = StyleSheet.create({
  lot: { alignSelf: "center", backgroundColor: "#eef3f7", borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: ds.borderSoft },
  miniLot: { backgroundColor: "#f3f6f9", overflow: "hidden" },
  thumb: { borderRadius: 12, overflow: "hidden", backgroundColor: "#f3f6f9", borderWidth: 1, borderColor: ds.borderSoft },
  tree: { position: "absolute", borderRadius: 999, backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#d3dfe8" },
  house: { position: "absolute", overflow: "hidden" },
  street: { position: "absolute", left: 0, right: 0, backgroundColor: "#55636d", flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingHorizontal: 8 },
  dash: { width: 16, height: 3, borderRadius: 2, backgroundColor: "#f5d36b" },
  snow: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#d6e1ea" },
  flake: { position: "absolute", width: 4, height: 4, borderRadius: 2, backgroundColor: "#dbe6f5" },
  picked: { borderWidth: 2.5, borderColor: ds.accent, backgroundColor: "rgba(35,80,255,0.12)" },
  garageDoor: { position: "absolute", borderTopLeftRadius: 2, borderTopRightRadius: 2, backgroundColor: "#e9eef2" },
  frontDoor: { position: "absolute", borderTopLeftRadius: 2, borderTopRightRadius: 2, backgroundColor: ds.sun },
  backDoor: { position: "absolute", height: 4, borderRadius: 2, backgroundColor: "#e9eef2" },
  step: { position: "absolute", height: 1.5, borderRadius: 1, backgroundColor: "rgba(17,43,59,0.22)" },
  table: { position: "absolute", borderRadius: 999, backgroundColor: "#ffffff", borderWidth: 1.5, borderColor: "#b9a693" },
  chair: { position: "absolute", borderRadius: 3, backgroundColor: "#b9a693" },
  neighbour: { position: "absolute", fontSize: 11, lineHeight: 16, color: "#6b7d88", fontFamily: family.bodySemi },
  tagWrap: { position: "absolute", width: 120, height: 24, alignItems: "center", justifyContent: "center" },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.96)", borderRadius: 999, paddingHorizontal: 9, height: 22, boxShadow: "0px 1px 4px rgba(17,43,59,0.12)" },
  tagText: { fontSize: 12, lineHeight: 15, color: ds.ink, fontFamily: family.bodyBold },
});

/**
 * A small picture of one area for a list row: the plan drawn a little larger than the frame and
 * moved so that area sits in the middle, filled in blue. The driveway rows show their own size.
 */
export function PlanThumb({ area, cars = 2, width = 64, height = 52, dim }: { area: PlanArea; cars?: CarCount; width?: number; height?: number; dim?: boolean }) {
  const planW = 128;
  const p = planFor("detached", planW, cars, "side-by-side");
  // For the sidewalk, look at the stretch in front of the house; for the rest, the area itself.
  const focus = area === "sidewalk" ? { x: p.doorX + 20 * p.u, y: p.walkTop } : (() => {
    const b = p.zones[area][0];
    return { x: b.x + b.w / 2, y: area === "driveway" ? b.y + b.h * 0.35 : area === "porch" ? b.y + 12 * p.u : b.y + b.h / 2 };
  })();
  const dx = Math.min(0, Math.max(width - planW, width / 2 - focus.x));
  const dy = Math.min(0, Math.max(height - p.H, height / 2 - focus.y));
  return (
    <View style={[styles.thumb, { width, height }, dim && { opacity: 0.45 }]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <View style={{ position: "absolute", left: dx, top: dy }}>
        <SitePlan mini style="detached" cars={cars} layout="side-by-side" width={planW} selected={[area]} />
      </View>
    </View>
  );
}
