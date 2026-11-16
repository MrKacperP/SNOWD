import { useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { Easing, cancelAnimation, interpolate, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming, type SharedValue } from "react-native-reanimated";
import { Image } from "expo-image";
import { PENGUIN } from "./brand";

const SIZE = 44;

/**
 * Pull-to-refresh: just the SNOWD penguin. It turns as you pull, pops when you've pulled far
 * enough, and spins while the page refreshes.
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
      spin.value = withRepeat(withTiming(1, { duration: 1000, easing: Easing.linear }), -1);
      breathe.value = withRepeat(withSequence(withTiming(1.12, { duration: 450 }), withTiming(0.94, { duration: 450 })), -1, true);
    } else {
      cancelAnimation(spin);
      cancelAnimation(breathe);
      breathe.value = withSpring(1);
    }
  }, [refreshing, spin, breathe]);

  const logoStyle = useAnimatedStyle(() => {
    const armed = pull.value >= 1 ? 1 : 0;
    const scale = busy.value > 0 ? breathe.value : interpolate(pull.value, [0, 1], [0.55, 1]) * (armed ? 1.12 : 1);
    // Turns with the pull, then spins a full turn a second while refreshing.
    return { transform: [{ rotate: `${busy.value > 0 ? spin.value * 360 : pull.value * 360}deg` }, { scale: withSpring(scale, { damping: 10, stiffness: 260 }) }] };
  });
  const wrapStyle = useAnimatedStyle(() => {
    const shown = Math.max(Math.min(1, pull.value), busy.value);
    return { opacity: shown, transform: [{ translateY: -dist.value + top + interpolate(shown, [0, 1], [-12, 0]) }] };
  });

  return (
    <Animated.View pointerEvents="none" accessible={refreshing} accessibilityLabel={refreshing ? "Refreshing" : undefined} style={[{ position: "absolute", top: 0, left: "50%", marginLeft: -SIZE / 2, zIndex: 10, width: SIZE, height: SIZE }, wrapStyle]}>
      <Animated.View style={[{ width: SIZE, height: SIZE }, logoStyle]}>
        <Image source={PENGUIN} style={{ width: SIZE, height: SIZE }} contentFit="contain" />
      </Animated.View>
    </Animated.View>
  );
}
