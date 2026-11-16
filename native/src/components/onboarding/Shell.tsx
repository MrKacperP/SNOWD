import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useEffect, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { PENGUIN } from "~/components/brand";
import { ORDER_STEPS, Segment } from "~/components/OrderProgress";
import { Icon } from "~/components/ui";
import { ds, family, stepColors, tap } from "~/lib/theme";

/**
 * The onboarding's top bar: a round back button and the very same five-colour bar a work order
 * shows (amber → teal → blue → violet → green, the current step shimmering), so the first thing
 * people learn in SNOWD is how their orders will look.
 */
export function OnboardingProgress({ segment, label, onBack, backLabel }: { segment: number; label: string; onBack: () => void; backLabel: string }) {
  const tone = stepColors[ORDER_STEPS[segment].status as keyof typeof stepColors];
  return (
    <View style={styles.top}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        hitSlop={6}
        onPress={() => {
          void Haptics.selectionAsync();
          onBack();
        }}
        style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]}
      >
        <Icon name={segment === 0 ? "xmark" : "chevron.left"} size={16} color={ds.ink} weight="bold" />
      </Pressable>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`Step ${segment + 1} of ${ORDER_STEPS.length}: ${label}`}
        accessibilityValue={{ min: 1, max: ORDER_STEPS.length, now: segment + 1 }}
        style={{ flex: 1, gap: 7 }}
      >
        <View style={{ flexDirection: "row", gap: 6 }}>
          {ORDER_STEPS.map((step, i) => (
            <Segment key={step.status} index={i} status={step.status} completed={false} state={i < segment ? "done" : i === segment ? "current" : "todo"} />
          ))}
        </View>
        <Text style={styles.stepLine} maxFontSizeMultiplier={1.4}>
          <Text style={{ color: tone.text, fontFamily: family.bodyBold }}>{label}</Text>
          {`  ·  ${segment + 1} of ${ORDER_STEPS.length}`}
        </Text>
      </View>
    </View>
  );
}

/**
 * The penguin asking the question in a speech bubble, the way a friendly tutor would. The penguin
 * hops and the bubble pops in each time the question changes.
 */
export function Mascot({ say, sub }: { say: string; sub?: string }) {
  const reduce = useReducedMotion();
  const hop = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    hop.value = withSequence(withTiming(-10, { duration: 160 }), withSpring(0, { damping: 7, stiffness: 260 }));
  }, [say, reduce, hop]);
  const body = useAnimatedStyle(() => ({ transform: [{ translateY: hop.value }] }));
  return (
    <View style={styles.mascot}>
      <Animated.View style={body} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Image source={PENGUIN} style={{ width: 54, height: 58 }} contentFit="contain" />
      </Animated.View>
      <Animated.View key={say} entering={reduce ? FadeIn : FadeInDown.duration(260)} style={styles.bubble}>
        <View style={styles.tail} />
        <Text accessibilityRole="header" style={styles.say} maxFontSizeMultiplier={1.5}>{say}</Text>
        {sub ? <Text style={styles.sub} maxFontSizeMultiplier={1.5}>{sub}</Text> : null}
      </Animated.View>
    </View>
  );
}

/** One screen's content, sliding in from the side it came from. */
export function StepBody({ id, children }: { id: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <Animated.View key={id} entering={reduce ? FadeIn : FadeInDown.duration(320).springify().damping(18)} style={{ flex: 1, gap: 20 }}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", gap: 12 },
  back: { width: tap, height: tap, borderRadius: tap / 2, alignItems: "center", justifyContent: "center", backgroundColor: ds.card, borderWidth: 1, borderColor: ds.borderSoft },
  stepLine: { fontSize: 14, lineHeight: 18, color: ds.ink3, fontFamily: family.bodyMedium },
  mascot: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  bubble: { flex: 1, backgroundColor: ds.card, borderRadius: 22, borderBottomLeftRadius: 6, paddingHorizontal: 18, paddingVertical: 14, gap: 4, borderWidth: 1, borderColor: ds.borderSoft, ...ds.cardShadow },
  tail: { position: "absolute", left: -6, bottom: 10, width: 12, height: 12, backgroundColor: ds.card, borderLeftWidth: 1, borderBottomWidth: 1, borderColor: ds.borderSoft, transform: [{ rotate: "45deg" }] },
  say: { fontSize: 23, lineHeight: 28, color: ds.ink, fontFamily: family.heading, letterSpacing: -0.4 },
  sub: { fontSize: 16, lineHeight: 21, color: ds.ink3, fontFamily: family.body },
});
