import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Path, Rect } from "react-native-svg";
import type { DrivewayLayout, PropertySize } from "@/lib/types";
import { ds, family } from "~/lib/theme";

export type CarCount = 1 | 2 | 3;
export type { DrivewayLayout };
export const sizeForCars = (n: number): PropertySize => (n <= 1 ? "small" : n === 2 ? "medium" : "large");
export const carsForSize = (size: PropertySize): CarCount => (size === "small" ? 1 : size === "medium" ? 2 : 3);

/** The three sizes shovelers price by, the same ones an operator sets prices for. */
export const DRIVEWAY_SIZES: { cars: CarCount; name: string; sub: string }[] = [
  { cars: 1, name: "Single", sub: "1 car" },
  { cars: 2, name: "Double", sub: "2 cars" },
  { cars: 3, name: "Large", sub: "3+ cars" },
];

/** The ways the cars can park, for each size, each with a plain line saying what it means. */
const SIDE = { key: "side-by-side", label: "Side by side", sub: "Next to each other" } as const;
const LINE = { key: "end-to-end", label: "In a line", sub: "One behind the other" } as const;
const MIXED = { key: "mixed", label: "Two + one", sub: "Two across, one behind" } as const;
const LAYOUTS: Record<CarCount, { key: DrivewayLayout; label: string; sub: string }[]> = {
  1: [{ key: "side-by-side", label: "One spot", sub: "Room for one car" }],
  2: [SIDE, LINE],
  3: [SIDE, MIXED, LINE],
};

/** A layout that works for this many cars: the one asked for if it fits, otherwise side by side. */
export const fitLayout = (cars: CarCount, layout: DrivewayLayout): DrivewayLayout => (LAYOUTS[cars].some((l) => l.key === layout) ? layout : "side-by-side");

/** Columns across and rows deep for a layout. */
export const grid = (cars: CarCount, layout: DrivewayLayout) => (layout === "end-to-end" ? { cols: 1, rows: cars } : layout === "mixed" ? { cols: 2, rows: 2 } : { cols: cars, rows: 1 });

/** Roughly 3 m of width and 5.5 m of length per car, the way contractors size a drive. */
const WIDTH_M = ["", "≈ 3 m", "≈ 6 m", "≈ 9 m"];
const LENGTH_M = ["", "≈ 6 m", "≈ 11 m", "≈ 16 m"];

const CAR_COLOURS = ["#2350ff", "#e9eef2", "#ff8b45"];
/** The width a parked car is drawn at before it is scaled to fit its spot. */
const CAR_BASE = 40;
const EASE = { duration: 360, easing: Easing.inOut(Easing.cubic) };

/** A car seen from above, nose up: body, windscreen, roof, rear window and mirrors. */
export function TopCar({ colour, width = 44 }: { colour: string; width?: number }) {
  const light = colour === "#e9eef2";
  return (
    <Svg width={width} height={width * 1.7} viewBox="0 0 46 78">
      <Rect x={0} y={20} width={5} height={5} rx={2} fill={colour} />
      <Rect x={41} y={20} width={5} height={5} rx={2} fill={colour} />
      <Rect x={4} y={2} width={38} height={74} rx={12} fill={colour} stroke={light ? "#c3ced6" : "none"} strokeWidth={1} />
      <Path d="M9 24 Q23 17 37 24 L35 33 Q23 30 11 33 Z" fill="#1d2a33" opacity={0.78} />
      <Rect x={11} y={34} width={24} height={20} rx={5} fill="#000" opacity={light ? 0.06 : 0.16} />
      <Path d="M11 57 Q23 60 35 57 L36 64 Q23 67 10 64 Z" fill="#1d2a33" opacity={0.7} />
    </Svg>
  );
}

/** A hip roof seen from above: four planes in slightly different shades, meeting at a ridge. */
export function Roof({ width, height, radius = 10, muted }: { width: number; height: number; radius?: number; /** A neighbour's roof: lighter, so it reads as not yours. */ muted?: boolean }) {
  const r = Math.min(height / 2, width / 2);
  const w = width;
  const h = height;
  const [base, top, bottom, side] = muted ? ["#b9c6cf", "#c6d1d8", "#aebcc6", "#bccad2"] : ["#2c4453", "#38566a", "#243a48", "#2f4a5b"];
  return (
    <Svg width={w} height={h}>
      <Rect x={0} y={0} width={w} height={h} rx={radius} fill={base} />
      <Path d={`M0 0 L${w} 0 L${w - r} ${h / 2} L${r} ${h / 2} Z`} fill={top} />
      <Path d={`M0 ${h} L${w} ${h} L${w - r} ${h / 2} L${r} ${h / 2} Z`} fill={bottom} />
      <Path d={`M0 0 L${r} ${h / 2} L0 ${h} Z`} fill={side} />
      <Path d={`M${w} 0 L${w - r} ${h / 2} L${w} ${h} Z`} fill={side} />
      <Path d={`M${r} ${h / 2} L${w - r} ${h / 2}`} stroke="rgba(255,255,255,0.18)" strokeWidth={1.5} />
    </Svg>
  );
}

/** A number that glides to each new value on the shared curve (or jumps, with Reduce Motion). */
function useTo(target: number, reduce: boolean) {
  const v = useSharedValue(target);
  useEffect(() => {
    v.value = reduce ? target : withTiming(target, EASE);
  }, [target, reduce, v]);
  return v;
}

/**
 * One parking spot, painted on the drive as a dashed outline, with its car parked in the middle.
 * It slides to its new place when the layout changes, and fades in or out when the car count does.
 */
function Bay({ i, visible, x, y, w, h, reduce }: { i: number; visible: boolean; x: number; y: number; w: number; h: number; reduce: boolean }) {
  const px = useSharedValue(x);
  const py = useSharedValue(y);
  const pw = useSharedValue(w);
  const ph = useSharedValue(h);
  const o = useSharedValue(visible ? 1 : 0);
  const was = useRef(visible);
  useEffect(() => {
    // A spot that's arriving appears where it belongs; one that's already here slides and resizes.
    const glide = !reduce && was.current && visible;
    px.value = glide ? withTiming(x, EASE) : x;
    py.value = glide ? withTiming(y, EASE) : y;
    pw.value = glide ? withTiming(w, EASE) : w;
    ph.value = glide ? withTiming(h, EASE) : h;
    o.value = reduce ? (visible ? 1 : 0) : withTiming(visible ? 1 : 0, { duration: 220 });
    was.current = visible;
  }, [x, y, w, h, visible, reduce, px, py, pw, ph, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value, width: pw.value, height: ph.value, transform: [{ translateX: px.value }, { translateY: py.value }] }));
  // The car is drawn once at a set size and scaled to its spot, so it grows and shrinks smoothly too.
  const car = useAnimatedStyle(() => ({ transform: [{ scale: (pw.value * 0.62) / CAR_BASE }] }));
  return (
    <Animated.View pointerEvents="none" style={[styles.at, styles.bay, style]}>
      <Animated.View style={car}>
        <TopCar colour={CAR_COLOURS[i]} width={CAR_BASE} />
      </Animated.View>
    </Animated.View>
  );
}

/** Height of each parking preview, and the height its scene is drawn at before being shrunk. */
const PREVIEW_H = 86;
const PREVIEW_SCENE_H = 300;

/**
 * One way of parking, drawn exactly like the big picture (the same house, garage doors, drive,
 * sidewalk and street) and shrunk to fit its card, without the measurements.
 */
function LayoutPreview({ cars, layout, on, width }: { cars: CarCount; layout: DrivewayLayout; on: boolean; width: number }) {
  const scale = PREVIEW_H / PREVIEW_SCENE_H;
  const sceneW = width / scale;
  return (
    <View style={[styles.preview, { width }, !on && { opacity: 0.55 }]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden pointerEvents="none">
      <View style={{ position: "absolute", width: sceneW, height: PREVIEW_SCENE_H, left: (width - sceneW) / 2, top: (PREVIEW_H - PREVIEW_SCENE_H) / 2, transform: [{ scale }] }}>
        <Scene W={sceneW} H={PREVIEW_SCENE_H} cars={cars} fit={layout} reduce mini />
      </View>
    </View>
  );
}

/**
 * The client's lot from above: house and garage at the top, the street at the bottom. Pick how
 * many cars fit, then how they park. Side by side widens the drive; end to end lengthens it and
 * the house moves back to make room, so the picture stays the same size and nothing jumps.
 */
export function Driveway({ cars, layout, onChange }: { cars: CarCount; layout: DrivewayLayout; onChange: (cars: CarCount, layout: DrivewayLayout) => void }) {
  const reduce = useReducedMotion();
  const { width } = useWindowDimensions();
  const W = width - 48;
  const fit = fitLayout(cars, layout);
  // The picture takes whatever height is left on the page, so the whole step fills the screen.
  const [H, setH] = useState(0);
  // Each parking card's preview fills the card's width (cards share the row, 10 apart; 6 padding and a 1.5 border each side).
  const parkCount = LAYOUTS[cars].length;
  const previewW = Math.floor((W - 10 * (parkCount - 1)) / parkCount - 15);

  const choose = (n: CarCount, l: DrivewayLayout) => {
    const next = fitLayout(n, l);
    if (n === cars && next === fit) return;
    void Haptics.selectionAsync();
    onChange(n, next);
  };

  return (
    <View style={{ flex: 1, gap: 16 }}>
      <View style={{ flex: 1, minHeight: 230 }} onLayout={(e) => setH(Math.round(e.nativeEvent.layout.height))}>
        {H ? <Scene W={W} H={H} cars={cars} fit={fit} reduce={reduce} /> : null}
      </View>

      <View style={{ gap: 8 }}>
        <Text style={styles.label}>HOW MANY CARS FIT</Text>
        <View accessibilityRole="radiogroup" style={styles.options}>
          {DRIVEWAY_SIZES.map((s) => {
            const on = s.cars === cars;
            return (
              <Pressable
                key={s.cars}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${s.name} driveway, ${s.sub}`}
                onPress={() => choose(s.cars, fit)}
                style={({ pressed }) => [styles.option, on && styles.optionOn, pressed && !on && { backgroundColor: ds.bgAlt }]}
              >
                <Text style={[styles.optionName, on && { color: ds.accent }]} maxFontSizeMultiplier={1.3}>{s.name}</Text>
                <Text style={styles.optionSub} maxFontSizeMultiplier={1.3}>{s.sub}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Always shown, even for one car, so the picture above keeps the same height as you change size. */}
      <View style={{ gap: 8 }}>
        <Text style={styles.label}>HOW DO THE CARS PARK?</Text>
        <View accessibilityRole="radiogroup" style={styles.options}>
          {LAYOUTS[cars].map((l) => {
            const on = l.key === fit;
            return (
              <Pressable
                key={l.key}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${l.label}. ${l.sub}`}
                onPress={() => choose(cars, l.key)}
                style={({ pressed }) => [styles.park, on && styles.optionOn, pressed && !on && { backgroundColor: ds.bgAlt }]}
              >
                <LayoutPreview cars={cars} layout={l.key} on={on} width={previewW} />
                <View style={{ alignItems: "center", gap: 1 }}>
                  <Text style={[styles.parkName, on && { color: ds.accent }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{l.label}</Text>
                  <Text style={styles.parkSub} numberOfLines={2} maxFontSizeMultiplier={1.2}>{l.sub}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/**
 * The driveway from above and nothing else: one slab of pavement with a dashed parking spot for
 * each car, and the car parked in it. The slab sits in the middle and grows wider or longer to fit
 * the layout; spots and cars slide into place. The full-size picture marks the width and length.
 */
function Scene({ W, H, cars, fit, reduce, mini }: { W: number; H: number; cars: CarCount; fit: DrivewayLayout; reduce: boolean; /** A small preview: no measurements, and not read out on its own. */ mini?: boolean }) {
  const m = 16;
  const below = mini ? 0 : 30; // room under the slab for the width measurement
  const beside = mini ? 0 : 66; // room either side for the length measurement
  const pad = 8;
  const gap = 8;
  // Spots are as big as the frame allows for this layout; they grow or shrink smoothly when it changes.
  const { cols, rows } = grid(cars, fit);
  const fromH = (H - 2 * m - below - 2 * pad - (rows - 1) * gap) / rows / 1.55;
  const fromW = (W - 2 * m - 2 * beside - 2 * pad - (cols - 1) * gap) / cols;
  const spotW = Math.max(18, Math.min(64, Math.floor(Math.min(fromH, fromW))));
  const spotH = Math.round(spotW * 1.55);

  const driveW = cols * spotW + (cols - 1) * gap + pad * 2;
  const driveH = rows * spotH + (rows - 1) * gap + pad * 2;
  const driveLeft = (W - driveW) / 2;
  const driveTop = m + (H - 2 * m - below - driveH) / 2;
  const spotX = (col: number) => driveLeft + pad + col * (spotW + gap);
  const spotY = (row: number) => driveTop + pad + row * (spotH + gap);

  // The slab and its measurements move on one curve.
  const dLeft = useTo(driveLeft, reduce);
  const dTop = useTo(driveTop, reduce);
  const dW = useTo(driveW, reduce);
  const dH = useTo(driveH, reduce);
  const drive = useAnimatedStyle(() => ({ left: dLeft.value, top: dTop.value, width: dW.value, height: dH.value }));
  const across = useAnimatedStyle(() => ({ left: dLeft.value, width: dW.value, top: dTop.value + dH.value + 8 }));
  const deep = useAnimatedStyle(() => ({ left: dLeft.value - 64, top: dTop.value, height: dH.value }));

  const sizeName = DRIVEWAY_SIZES.find((s) => s.cars === cars)!;
  const layoutName = LAYOUTS[cars].find((l) => l.key === fit)!.label.toLowerCase();

  return (
    <View
      style={[styles.scene, { width: W, height: H }, mini && { borderWidth: 0, borderRadius: 0 }]}
      accessible={!mini}
      accessibilityLabel={`Your driveway: ${sizeName.sub}, ${layoutName}. About ${WIDTH_M[cols].replace("≈ ", "")} wide and ${LENGTH_M[rows].replace("≈ ", "")} long.`}
    >
      <Animated.View pointerEvents="none" style={[styles.drive, drive]} />
      {[0, 1, 2].map((i) => (
        <Bay key={i} i={i} visible={i < cars} x={spotX(i % cols)} y={spotY(Math.floor(i / cols))} w={spotW} h={spotH} reduce={reduce} />
      ))}

      {/* How wide and how long the drive is, the way a site plan marks it. */}
      {mini ? null : (
        <>
          <Animated.View pointerEvents="none" style={[styles.across, across]}>
            <View style={styles.tickV} />
            <View style={styles.lineH} />
            <View style={styles.tag}>
              <Text style={styles.tagText} maxFontSizeMultiplier={1.1}>{WIDTH_M[cols]}</Text>
            </View>
            <View style={styles.lineH} />
            <View style={styles.tickV} />
          </Animated.View>
          <Animated.View pointerEvents="none" style={[styles.deep, deep]}>
            <View style={styles.tickH} />
            <View style={styles.lineV} />
            <View style={styles.tag}>
              <Text style={styles.tagText} maxFontSizeMultiplier={1.1}>{LENGTH_M[rows]}</Text>
            </View>
            <View style={styles.lineV} />
            <View style={styles.tickH} />
          </Animated.View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  at: { position: "absolute", left: 0, top: 0 },
  scene: { alignSelf: "center", backgroundColor: "#f4f7fa", borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: ds.borderSoft },
  drive: { position: "absolute", backgroundColor: "#a3afb8", borderRadius: 12 },
  bay: { alignItems: "center", justifyContent: "center", borderRadius: 6, borderWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.85)" },
  across: { position: "absolute", height: 16, flexDirection: "row", alignItems: "center" },
  deep: { position: "absolute", width: 56, alignItems: "center" },
  tickV: { width: 1.5, height: 10, backgroundColor: ds.accent },
  tickH: { width: 10, height: 1.5, backgroundColor: ds.accent },
  lineH: { flex: 1, height: 1.5, backgroundColor: ds.accent },
  lineV: { flex: 1, width: 1.5, backgroundColor: ds.accent },
  tag: { alignSelf: "center", paddingHorizontal: 6, height: 16, borderRadius: 8, backgroundColor: ds.accent, justifyContent: "center" },
  tagText: { fontSize: 11, lineHeight: 14, color: "#fff", fontFamily: family.bodyBold, fontVariant: ["tabular-nums"] },
  label: { fontSize: 12, letterSpacing: 0.8, color: ds.ink3, fontFamily: family.bodyBold, paddingHorizontal: 4 },
  options: { flexDirection: "row", gap: 10 },
  option: { flex: 1, alignItems: "center", gap: 2, paddingVertical: 12, borderRadius: 16, backgroundColor: ds.card, borderWidth: 1.5, borderColor: ds.border },
  optionOn: { borderColor: ds.accent, backgroundColor: ds.accentSoft },
  optionName: { fontSize: 17, lineHeight: 22, color: ds.ink, fontFamily: family.headingSemi },
  optionSub: { fontSize: 14, lineHeight: 18, color: ds.ink3, fontFamily: family.body },
  park: { flex: 1, alignItems: "center", gap: 6, paddingTop: 8, paddingBottom: 10, paddingHorizontal: 6, borderRadius: 16, backgroundColor: ds.card, borderWidth: 1.5, borderColor: ds.border },
  parkName: { fontSize: 15, lineHeight: 20, color: ds.ink, fontFamily: family.headingSemi },
  parkSub: { fontSize: 12.5, lineHeight: 16, color: ds.ink3, fontFamily: family.body, textAlign: "center" },
  preview: { height: PREVIEW_H, borderRadius: 10, overflow: "hidden", backgroundColor: "#f4f7fa" },
});
