import { Image } from "expo-image";
import { useEffect, useMemo } from "react";
import { Dimensions, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { Easing, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue } from "react-native-reanimated";
import { colors, radius, space } from "~/lib/theme";

export const PENGUIN = require("../../assets/penguin.png");
export const WORDMARK = require("../../assets/wordmark.png");

/** The SNOWD penguin hopping on the spot: the app's loading animation. */
export function PenguinLoader({ size = 64, label = "Loading", spinning }: { size?: number; label?: string; spinning?: SharedValue<number> }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [reduce, t]);
  const body = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(t.value, [0, 1], [0, -size * 0.18]) },
      { rotate: `${interpolate(t.value, [0, 0.5, 1], [-6, 0, 6])}deg` },
      { scale: spinning ? interpolate(spinning.value, [0, 1], [0.4, 1], "clamp") : 1 },
    ],
  }));
  const shadow = useAnimatedStyle(() => ({ transform: [{ scaleX: interpolate(t.value, [0, 1], [1, 0.7]) }], opacity: interpolate(t.value, [0, 1], [0.22, 0.1]) }));
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} style={{ alignItems: "center" }}>
      <Animated.View style={body}>
        <Image source={PENGUIN} style={{ width: size, height: size * 1.07 }} contentFit="contain" />
      </Animated.View>
      <Animated.View style={[{ width: size * 0.7, height: 6, borderRadius: 3, backgroundColor: colors.ink, marginTop: 4 }, shadow]} />
    </View>
  );
}

/** A full-screen loading state: penguin, a friendly line, and the SNOWD wordmark. */
export function BrandLoading({ message = "Warming up…" }: { message?: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.lg, backgroundColor: colors.bg }}>
      <Snowfall count={18} color="#c9d6ff" height={Dimensions.get("window").height} />
      <PenguinLoader size={84} />
      <Text style={{ color: colors.muted, fontSize: 16, fontWeight: "600" }}>{message}</Text>
      <Image source={WORDMARK} style={{ width: 120, height: 25, opacity: 0.85 }} contentFit="contain" />
    </View>
  );
}

/** A soft shimmering placeholder block shown while content loads. */
export function Skeleton({ height = 16, width = "100%", style }: { height?: number; width?: number | `${number}%`; style?: StyleProp<ViewStyle> }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (!reduce) t.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
  }, [reduce, t]);
  const pulse = useAnimatedStyle(() => ({ opacity: interpolate(t.value, [0, 1], [0.55, 1]) }));
  return <Animated.View style={[{ height, width, borderRadius: 8, backgroundColor: "#e4eaf2" }, pulse, style]} />;
}

/** Placeholder cards in the shape of a job card, so a list doesn't jump when it loads. */
export function CardSkeletons({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: space.md }} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }}>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <Skeleton width={46} height={46} style={{ borderRadius: 23 }} />
            <View style={{ flex: 1, gap: 8 }}>
              <Skeleton width="60%" />
              <Skeleton width="40%" height={12} />
            </View>
          </View>
          <Skeleton height={8} />
        </View>
      ))}
    </View>
  );
}

const { width: SCREEN_W } = Dimensions.get("window");

function Flake({ index, height, color }: { index: number; height: number; color: string }) {
  const reduce = useReducedMotion();
  const seed = useMemo(() => ({ x: ((index * 73) % 100) / 100, size: 3 + ((index * 37) % 5), delay: (index * 410) % 4000, duration: 5000 + ((index * 997) % 4000) }), [index]);
  const t = useSharedValue(reduce ? 0.5 : 0);
  useEffect(() => {
    if (reduce) return;
    t.value = withDelay(seed.delay, withRepeat(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: seed.duration, easing: Easing.linear })), -1));
  }, [reduce, seed, t]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(t.value, [0, 1], [-10, height + 10]) }, { translateX: Math.sin(t.value * Math.PI * 2) * 10 }],
    opacity: interpolate(t.value, [0, 0.1, 0.85, 1], [0, 1, 1, 0]),
  }));
  return <Animated.View style={[{ position: "absolute", left: seed.x * SCREEN_W, width: seed.size, height: seed.size, borderRadius: seed.size, backgroundColor: color }, style]} />;
}

/** Gently falling snow, drawn behind whatever sits on top. Purely decorative. */
export function Snowfall({ count = 18, height = 260, color = "rgba(255,255,255,0.8)" }: { count?: number; height?: number; color?: string }) {
  return (
    <View pointerEvents="none" importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}>
      {Array.from({ length: count }, (_, i) => (
        <Flake key={i} index={i} height={height} color={color} />
      ))}
    </View>
  );
}
