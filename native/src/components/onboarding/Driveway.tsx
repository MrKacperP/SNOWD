import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, LinearTransition, SlideInDown, useReducedMotion, ZoomIn, ZoomOut } from "react-native-reanimated";
import Svg, { Path, Rect } from "react-native-svg";
import type { PropertySize } from "@/lib/types";
import { ScalePress } from "~/components/kit";
import { Icon } from "~/components/ui";
import { ds, family } from "~/lib/theme";

export const CAR_COLOURS = ["#2350ff", "#ff8b45", "#23955a", "#7a5af5", "#e0952b", "#112b3b"];
export const MAX_CARS = 6;
export type ParkedCar = { id: number; colour: string };

export const sizeForCars = (n: number): PropertySize => (n <= 1 ? "small" : n === 2 ? "medium" : "large");
export const carsForSize = (size: PropertySize) => (size === "small" ? 1 : size === "medium" ? 2 : 3);
const SIZE_NAME: Record<PropertySize, string> = { small: "Single driveway", medium: "Double driveway", large: "Large driveway", commercial: "Large driveway" };

/** A car seen from above: body, windscreen, roof, rear window and wheels. */
export function TopCar({ colour, width = 46 }: { colour: string; width?: number }) {
  const h = width * 1.7;
  return (
    <Svg width={width} height={h} viewBox="0 0 46 78">
      <Rect x={1} y={12} width={6} height={12} rx={2} fill="#1d2a33" />
      <Rect x={39} y={12} width={6} height={12} rx={2} fill="#1d2a33" />
      <Rect x={1} y={54} width={6} height={12} rx={2} fill="#1d2a33" />
      <Rect x={39} y={54} width={6} height={12} rx={2} fill="#1d2a33" />
      <Rect x={4} y={2} width={38} height={74} rx={13} fill={colour} />
      <Path d="M9 24 Q23 16 37 24 L35 33 Q23 29 11 33 Z" fill="#d9ecff" opacity={0.92} />
      <Rect x={11} y={34} width={24} height={20} rx={5} fill="#000" opacity={0.14} />
      <Path d="M11 57 Q23 61 35 57 L36 64 Q23 68 10 64 Z" fill="#d9ecff" opacity={0.85} />
      <Rect x={8} y={4} width={8} height={4} rx={2} fill="#fff7c2" />
      <Rect x={30} y={4} width={8} height={4} rx={2} fill="#fff7c2" />
    </Svg>
  );
}

/**
 * The client's driveway, drawn from above: house and garage at the top, the street at the bottom.
 * Tap a car in the tray to park one more; tap a parked car to drive it away. The driveway widens
 * as cars are added, and the number of cars sets the property size.
 */
export function Driveway({ cars, onChange }: { cars: ParkedCar[]; onChange: (cars: ParkedCar[]) => void }) {
  const reduce = useReducedMotion();
  const cols = Math.min(3, Math.max(1, cars.length > 3 ? Math.ceil(cars.length / 2) : cars.length));
  const laneW = 74;
  const size = sizeForCars(cars.length);
  const add = (colour: string) => {
    if (cars.length >= MAX_CARS) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onChange([...cars, { id: Date.now(), colour }]);
  };
  const remove = (id: number) => {
    if (cars.length <= 1) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(cars.filter((c) => c.id !== id));
  };

  return (
    <View style={{ gap: 14 }}>
      <View style={styles.scene} accessibilityLabel={`Your driveway, with ${cars.length} ${cars.length === 1 ? "car" : "cars"}`}>
        {/* The house and its garage door. */}
        <View style={styles.house}>
          <View style={styles.roofRidge} />
          <Animated.View layout={reduce ? undefined : LinearTransition.springify().damping(16)} style={[styles.garage, { width: cols * laneW - 10 }]}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={styles.garageSlat} />
            ))}
          </Animated.View>
        </View>
        {/* The driveway, growing a lane at a time. */}
        <Animated.View layout={reduce ? undefined : LinearTransition.springify().damping(16)} style={[styles.drive, { width: cols * laneW + 14 }]}>
          <View style={styles.carGrid}>
            {cars.map((car) => (
              <Animated.View
                key={car.id}
                entering={reduce ? FadeIn : SlideInDown.springify().damping(14).mass(0.8)}
                exiting={reduce ? undefined : ZoomOut.duration(180)}
                layout={reduce ? undefined : LinearTransition.springify().damping(16)}
                style={{ width: laneW, alignItems: "center", paddingVertical: 6 }}
              >
                <Pressable accessibilityRole="button" accessibilityLabel="Remove this car" hitSlop={4} onPress={() => remove(car.id)} style={({ pressed }) => pressed && { transform: [{ scale: 0.94 }] }}>
                  <TopCar colour={car.colour} />
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
        {/* The street. */}
        <View style={styles.street}>
          {Array.from({ length: 9 }, (_, i) => (
            <View key={i} style={styles.dash} />
          ))}
        </View>
      </View>

      <Animated.View key={size} entering={reduce ? undefined : ZoomIn.springify().damping(14)} style={styles.summary}>
        <Text style={styles.count}>{cars.length}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryTitle}>{cars.length === 1 ? "car fits" : "cars fit"}</Text>
          <Text style={styles.summarySub}>{SIZE_NAME[size]}</Text>
        </View>
      </Animated.View>

      {/* The tray: tap a car to park it. */}
      <View style={styles.tray} accessibilityLabel="Tap a car to park it in your driveway">
        {CAR_COLOURS.slice(0, 4).map((colour, i) => (
          <ScalePress key={colour} haptic="none" depthScale={0.9} accessibilityLabel={`Park car ${i + 1}`} disabled={cars.length >= MAX_CARS} onPress={() => add(colour)} style={styles.trayCar}>
            <View style={{ transform: [{ rotate: "-90deg" }] }}>
              <TopCar colour={colour} width={28} />
            </View>
            <View style={styles.plus}>
              <Icon name="plus" size={10} color="#fff" weight="bold" />
            </View>
          </ScalePress>
        ))}
      </View>
      <Text style={styles.hint}>Tap a car to park it. Tap a parked car to remove it.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: { alignItems: "center", backgroundColor: "#eef4f8", borderRadius: 28, paddingTop: 16, overflow: "hidden", borderWidth: 1, borderColor: ds.borderSoft },
  house: { width: "86%", height: 72, backgroundColor: "#2c4453", borderRadius: 14, alignItems: "center", justifyContent: "flex-end", overflow: "hidden" },
  roofRidge: { position: "absolute", top: 30, left: 0, right: 0, height: 3, backgroundColor: "rgba(255,255,255,0.12)" },
  garage: { height: 40, backgroundColor: "#e9eef2", borderTopLeftRadius: 6, borderTopRightRadius: 6, paddingTop: 6, gap: 5, paddingHorizontal: 6 },
  garageSlat: { height: 3, borderRadius: 2, backgroundColor: "#c5d1d9" },
  drive: { minHeight: 150, backgroundColor: "#8e9ba4", paddingVertical: 8, alignItems: "center", borderLeftWidth: 4, borderRightWidth: 4, borderColor: "#b6c1c8" },
  carGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", width: "100%" },
  street: { alignSelf: "stretch", height: 32, backgroundColor: "#55636d", flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingHorizontal: 8 },
  dash: { width: 18, height: 4, borderRadius: 2, backgroundColor: "#f5d36b" },
  summary: { flexDirection: "row", alignItems: "center", gap: 14, alignSelf: "center" },
  count: { fontSize: 44, lineHeight: 48, color: ds.accent, fontFamily: family.heading, fontVariant: ["tabular-nums"] },
  summaryTitle: { fontSize: 18, lineHeight: 22, color: ds.ink, fontFamily: family.bodySemi },
  summarySub: { fontSize: 15, lineHeight: 20, color: ds.ink3, fontFamily: family.body },
  tray: { flexDirection: "row", justifyContent: "center", gap: 12 },
  trayCar: { width: 66, height: 58, borderRadius: 18, backgroundColor: ds.card, borderWidth: 1, borderColor: ds.border, alignItems: "center", justifyContent: "center", ...ds.cardShadow },
  plus: { position: "absolute", top: -5, right: -5, width: 20, height: 20, borderRadius: 10, backgroundColor: ds.accent, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  hint: { textAlign: "center", fontSize: 14, lineHeight: 19, color: ds.ink3, fontFamily: family.body },
});
