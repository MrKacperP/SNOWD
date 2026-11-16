import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, { cancelAnimation, useAnimatedReaction, useAnimatedStyle, useSharedValue, withDecay, withSpring, withTiming } from "react-native-reanimated";
import Svg, { Circle, Line, Text as SvgText } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";
import { ds, family } from "~/lib/theme";

export const DIAL_MIN = 5;
export const DIAL_MAX = 250;
/** Degrees of dial per dollar: the full $5–$250 range fits in one turn, so ticks never overlap. */
const STEP_DEG = 1.4;
const STEP_RAD = (STEP_DEG * Math.PI) / 180;

/**
 * A price dial: a big wheel rising from the bottom of the screen like a semicircle. Drag (or
 * flick) it sideways to turn it, and the price under the pointer clicks into place with a tap of
 * haptics on every dollar. The suggested local price is marked with an orange dot on the wheel.
 */
export function PriceDial({ value, onChange, suggested, disabled }: { value: number; onChange: (value: number) => void; suggested?: number; disabled?: boolean }) {
  const { width } = useWindowDimensions();
  const R = Math.round(width * 0.78);
  const visible = 150;
  const pxPerDollar = R * STEP_RAD;
  const pos = useSharedValue(value);
  const start = useSharedValue(value);
  const [, force] = useState(0);

  // When the price changes from outside (another service picked, "use suggested"), turn to it.
  useEffect(() => {
    if (Math.round(pos.value) !== value) pos.value = withTiming(value, { duration: 420 });
  }, [value, pos]);

  const tick = (v: number) => {
    void Haptics.selectionAsync();
    onChange(v);
    force((n) => n + 1);
  };

  useAnimatedReaction(
    () => Math.round(pos.value),
    (now, before) => {
      if (before !== null && now !== before) scheduleOnRN(tick, now);
    },
  );

  const pan = usePanGesture({
    enabled: !disabled,
    activeOffsetX: [-6, 6],
    onBegin: () => {
      "worklet";
      cancelAnimation(pos);
      start.value = pos.value;
    },
    onUpdate: (e) => {
      "worklet";
      const t = (e as unknown as { translationX: number }).translationX;
      pos.value = Math.min(DIAL_MAX, Math.max(DIAL_MIN, start.value - t / pxPerDollar));
    },
    onDeactivate: (e) => {
      "worklet";
      const v = (e as unknown as { velocityX: number }).velocityX;
      pos.value = withDecay({ velocity: -v / pxPerDollar, deceleration: 0.994, clamp: [DIAL_MIN, DIAL_MAX] }, (done) => {
        if (done) pos.value = withSpring(Math.round(pos.value), { damping: 18, stiffness: 220 });
      });
    },
    onFinalize: (e) => {
      "worklet";
      // A tap with no drag: settle on the nearest dollar.
      if ((e as unknown as { canceled?: boolean }).canceled) pos.value = withSpring(Math.round(pos.value));
    },
  });

  const wheel = useAnimatedStyle(() => ({ transform: [{ rotate: `${-(pos.value - DIAL_MIN) * STEP_DEG}deg` }] }));

  const ticks = useMemo(() => {
    const out = [];
    for (let d = DIAL_MIN; d <= DIAL_MAX; d++) {
      const a = ((d - DIAL_MIN) * STEP_DEG * Math.PI) / 180;
      const major = d % 5 === 0;
      const labelled = d % 10 === 0;
      const r1 = R - 14;
      const r2 = R - (labelled ? 38 : major ? 30 : 22);
      const x1 = R + r1 * Math.sin(a);
      const y1 = R - r1 * Math.cos(a);
      const x2 = R + r2 * Math.sin(a);
      const y2 = R - r2 * Math.cos(a);
      out.push(<Line key={`t${d}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={labelled ? ds.ink : major ? ds.ink2 : "#b7c4cc"} strokeWidth={labelled ? 2.5 : major ? 2 : 1.4} strokeLinecap="round" />);
      if (labelled) {
        const rl = R - 58;
        const xl = R + rl * Math.sin(a);
        const yl = R - rl * Math.cos(a);
        const deg = (d - DIAL_MIN) * STEP_DEG;
        out.push(
          <SvgText key={`l${d}`} x={xl} y={yl + 5} fill={ds.ink2} fontSize={15} fontWeight="700" fontFamily={family.bodyBold} textAnchor="middle" transform={`rotate(${deg} ${xl} ${yl})`}>
            {`$${d}`}
          </SvgText>,
        );
      }
    }
    return out;
  }, [R]);

  const sugAngle = suggested ? ((suggested - DIAL_MIN) * STEP_DEG * Math.PI) / 180 : null;

  return (
    <GestureDetector gesture={pan}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Price dial"
        accessibilityValue={{ text: disabled ? "Not offered" : `$${value}` }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) => {
          if (disabled) return;
          const next = Math.min(DIAL_MAX, Math.max(DIAL_MIN, value + (e.nativeEvent.actionName === "increment" ? 5 : -5)));
          onChange(next);
        }}
        style={[styles.frame, { height: visible }, disabled && { opacity: 0.35 }]}
      >
        <Animated.View style={[{ position: "absolute", width: R * 2, height: R * 2, left: width / 2 - R, top: 20 }, wheel]}>
          <Svg width={R * 2} height={R * 2}>
            <Circle cx={R} cy={R} r={R - 2} fill={ds.card} stroke={ds.borderSoft} strokeWidth={2} />
            <Circle cx={R} cy={R} r={R - 76} fill={ds.bgAlt} />
            {ticks}
            {sugAngle !== null ? <Circle cx={R + (R - 7) * Math.sin(sugAngle)} cy={R - (R - 7) * Math.cos(sugAngle)} r={4.5} fill={ds.sun} /> : null}
          </Svg>
        </Animated.View>
        {/* The fixed pointer at the top of the wheel. */}
        <View pointerEvents="none" style={[styles.pointer, { left: width / 2 - 2 }]} />
        <View pointerEvents="none" style={[styles.pointerCap, { left: width / 2 - 8, backgroundColor: ds.accent }]} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: "hidden", marginHorizontal: -24 },
  pointer: { position: "absolute", top: 12, width: 4, height: 46, borderRadius: 2, backgroundColor: ds.accent },
  pointerCap: { position: "absolute", top: 6, width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: "#fff" },
});
