import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View, type ViewStyle } from "react-native";
import Animated, { interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import type { ServiceType } from "@/lib/types";
import { Icon } from "~/components/ui";
import { ds, family } from "~/lib/theme";

type Zone = { key: ServiceType; label: string; box: { x: number; y: number; w: number; h: number }; ground: string; icon: "car.fill" | "door.left.hand.open" | "figure.walk" | "sun.max.fill" };

/** Where each area sits on the lot, as fractions of the picture. */
const ZONES: Zone[] = [
  { key: "backyard-patio", label: "Patio", box: { x: 0.06, y: 0.04, w: 0.5, h: 0.2 }, ground: "#c9a27e", icon: "sun.max.fill" },
  { key: "porch", label: "Porch", box: { x: 0.2, y: 0.63, w: 0.24, h: 0.11 }, ground: "#b7a189", icon: "door.left.hand.open" },
  { key: "driveway", label: "Driveway", box: { x: 0.66, y: 0.28, w: 0.28, h: 0.56 }, ground: "#8e9ba4", icon: "car.fill" },
  { key: "sidewalk", label: "Sidewalk", box: { x: 0, y: 0.84, w: 1, h: 0.08 }, ground: "#b9c3c9", icon: "figure.walk" },
];

function Area({ zone, on, W, H, onToggle }: { zone: Zone; on: boolean; W: number; H: number; onToggle: () => void }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(on ? 1 : 0);
  const pop = useSharedValue(1);
  useEffect(() => {
    t.value = withTiming(on ? 1 : 0, { duration: reduce ? 0 : 380 });
    if (on && !reduce) {
      pop.value = 0.94;
      pop.value = withSpring(1, { damping: 9, stiffness: 260 });
    }
  }, [on, reduce, t, pop]);
  const snow = useAnimatedStyle(() => ({ opacity: interpolate(t.value, [0, 1], [1, 0]) }));
  const ring = useAnimatedStyle(() => ({ opacity: t.value, transform: [{ scale: pop.value }] }));
  const frame: ViewStyle = { position: "absolute", left: zone.box.x * W, top: zone.box.y * H, width: zone.box.w * W, height: zone.box.h * H };
  const wide = zone.box.w > zone.box.h * (W / H);
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={zone.label}
      onPress={() => {
        void Haptics.impactAsync(on ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
        onToggle();
      }}
      style={frame}
    >
      <View style={[StyleSheet.absoluteFill, { backgroundColor: zone.ground, borderRadius: 10 }]} />
      {/* Snow lying on the area until it's picked. */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.snow, snow]}>
        {[0.2, 0.55, 0.8, 0.35, 0.68].map((x, i) => (
          <View key={i} style={[styles.flake, { left: `${x * 100}%`, top: `${((i * 37) % 80) + 8}%` }]} />
        ))}
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, styles.ring, ring]} />
      <View style={styles.tag}>
        <View style={[styles.pill, wide ? null : { flexDirection: "column", paddingVertical: 6, borderRadius: 14 }]}>
          <View style={[styles.tagIcon, on && { backgroundColor: ds.accent }]}>
            <Icon name={on ? "checkmark" : zone.icon} size={11} color={on ? "#fff" : ds.ink2} weight="bold" />
          </View>
          <Text style={styles.tagText} numberOfLines={1} maxFontSizeMultiplier={1.2}>{zone.label}</Text>
        </View>
      </View>
    </Pressable>
  );
}

/**
 * A snowy home seen from above. Tap the patio, porch, driveway or sidewalk to clear it: the snow
 * melts away to show the ground and the area is ringed in blue. Tap again to leave it snowy.
 */
export function YardPicker({ value, onChange, only }: { value: ServiceType[]; onChange: (value: ServiceType[]) => void; /** Areas that can be chosen (others aren't shown). */ only?: ServiceType[] }) {
  const { width } = useWindowDimensions();
  const W = width - 48;
  const H = Math.round(W * 0.92);
  const zones = only ? ZONES.filter((z) => only.includes(z.key)) : ZONES;
  return (
    <View style={[styles.lot, { width: W, height: H }]}>
      {/* The street along the bottom. */}
      <View style={[styles.street, { top: 0.92 * H, height: 0.08 * H }]} />
      {/* The house: a roof with a ridge line. */}
      <View style={[styles.house, { left: 0.08 * W, top: 0.28 * H, width: 0.5 * W, height: 0.35 * H }]}>
        <View style={styles.ridge} />
        <Icon name="house.fill" size={22} color="rgba(255,255,255,0.4)" />
      </View>
      {zones.map((zone) => (
        <Area key={zone.key} zone={zone} W={W} H={H} on={value.includes(zone.key)} onToggle={() => onChange(value.includes(zone.key) ? value.filter((v) => v !== zone.key) : [...value, zone.key])} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  lot: { alignSelf: "center", backgroundColor: "#dde8ef", borderRadius: 28, overflow: "hidden", borderWidth: 1, borderColor: ds.borderSoft },
  street: { position: "absolute", left: 0, right: 0, backgroundColor: "#55636d" },
  house: { position: "absolute", backgroundColor: "#2c4453", borderRadius: 12, alignItems: "center", justifyContent: "center" },
  ridge: { position: "absolute", left: 10, right: 10, top: "50%", height: 3, backgroundColor: "rgba(255,255,255,0.14)" },
  snow: { backgroundColor: "#ffffff", borderRadius: 10, borderWidth: 1, borderColor: "#cfdde8", boxShadow: "0px 2px 6px rgba(17,43,59,0.08)" },
  flake: { position: "absolute", width: 5, height: 5, borderRadius: 3, backgroundColor: "#d5e2ff" },
  ring: { borderRadius: 10, borderWidth: 3, borderColor: ds.accent, backgroundColor: "rgba(35,80,255,0.18)" },
  tag: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.94)", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  tagIcon: { width: 20, height: 20, borderRadius: 10, backgroundColor: ds.bgAlt, alignItems: "center", justifyContent: "center" },
  tagText: { fontSize: 13, lineHeight: 16, color: ds.ink, fontFamily: family.bodyBold },
});
