import { useEffect } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { Easing, cancelAnimation, interpolate, useAnimatedProps, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming, type SharedValue } from "react-native-reanimated";
import Svg, { Circle, G, Path } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SIZE = 56;
const R = 24;
const C = 2 * Math.PI * R;

/** A six-armed snowflake, each arm with a small V near its tip. */
const ARM = "M28 28 L28 12 M28 16 L24.5 12.5 M28 16 L31.5 12.5 M28 21 L25.5 18.5 M28 21 L30.5 18.5";

/**
 * Pull-to-refresh: a ring fills as you pull while a snowflake turns inside it. Pulled far enough,
 * the flake pops; while the page refreshes the ring spins and the flake turns and breathes.
 */
export function RefreshFlake({ pull, busy, dist, refreshing, edgeToEdge }: { pull: SharedValue<number>; busy: SharedValue<number>; dist: SharedValue<number>; refreshing: boolean; edgeToEdge: boolean }) {
  // Pinned just under the status bar (full-bleed pages) or the title bar, however far you pull.
  const insets = useSafeAreaInsets();
  const top = (edgeToEdge ? insets.top : 0) + 8;
  const spin = useSharedValue(0);
  const breathe = useSharedValue(1);
  useEffect(() => {
    if (refreshing) {
      spin.value = 0;
      spin.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.linear }), -1);
      breathe.value = withRepeat(withSequence(withTiming(1.12, { duration: 450 }), withTiming(0.94, { duration: 450 })), -1, true);
    } else {
      cancelAnimation(spin);
      cancelAnimation(breathe);
      breathe.value = withSpring(1);
    }
  }, [refreshing, spin, breathe]);

  // The ring: fills with the pull; while refreshing a third of it chases round.
  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: busy.value > 0 ? C * 0.68 : C * (1 - Math.min(1, pull.value)),
  }));
  const ringStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${busy.value > 0 ? spin.value * 360 : -90}deg` }] }));
  const flakeStyle = useAnimatedStyle(() => {
    const armed = pull.value >= 1 ? 1 : 0;
    const scale = busy.value > 0 ? breathe.value : interpolate(pull.value, [0, 1], [0.55, 1]) * (armed ? 1.12 : 1);
    return { transform: [{ rotate: `${busy.value > 0 ? spin.value * 120 : pull.value * 240}deg` }, { scale: withSpring(scale, { damping: 10, stiffness: 260 }) }] };
  });
  const wrapStyle = useAnimatedStyle(() => {
    const shown = Math.max(Math.min(1, pull.value), busy.value);
    return { opacity: shown, transform: [{ translateY: -dist.value + top + interpolate(shown, [0, 1], [-12, 0]) }] };
  });

  return (
    <Animated.View pointerEvents="none" accessible={refreshing} accessibilityLabel={refreshing ? "Refreshing" : undefined} style={[{ position: "absolute", top: 0, left: "50%", marginLeft: -SIZE / 2, zIndex: 10, width: SIZE, height: SIZE }, wrapStyle]}>
      {/* Frosted disc, so it reads as part of the coloured header it comes out of. */}
      <View style={{ position: "absolute", inset: 0, borderRadius: SIZE / 2, backgroundColor: "rgba(255,255,255,0.18)" }} />
      <Animated.View style={[{ position: "absolute", inset: 0 }, ringStyle]}>
        <Svg width={SIZE} height={SIZE}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke="rgba(255,255,255,0.28)" strokeWidth={3} fill="none" />
          <AnimatedCircle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke="#fff" strokeWidth={3} strokeLinecap="round" fill="none" strokeDasharray={C} animatedProps={ringProps} />
        </Svg>
      </Animated.View>
      <Animated.View style={[{ position: "absolute", inset: 0 }, flakeStyle]}>
        <Svg width={SIZE} height={SIZE}>
          <G stroke="#fff" strokeWidth={2.4} strokeLinecap="round" fill="none">
            {[0, 60, 120, 180, 240, 300].map((deg) => (
              <Path key={deg} d={ARM} transform={`rotate(${deg} 28 28)`} />
            ))}
          </G>
          <Circle cx={28} cy={28} r={2.6} fill="#fff" />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}
