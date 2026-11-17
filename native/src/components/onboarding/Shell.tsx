import * as Haptics from "expo-haptics";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, FadeInLeft, FadeInRight, useReducedMotion } from "react-native-reanimated";
import { ORDER_STEPS, Segment } from "~/components/OrderProgress";
import { Icon } from "~/components/ui";
import { ds, family, tap } from "~/lib/theme";

/** One calm curve for every onboarding movement, so nothing springs or overshoots. */
export const CALM = { duration: 260, easing: Easing.out(Easing.cubic) };

/** The onboarding's top bar: a round back button and the five-colour work-order bar. The title below says where you are. */
export function OnboardingProgress({ segment, total, label, onBack, backLabel }: { segment: number; total: number; label: string; onBack: () => void; backLabel: string }) {
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
        accessibilityLabel={`Step ${segment + 1} of ${total}: ${label}`}
        accessibilityValue={{ min: 1, max: total, now: segment + 1 }}
        style={{ flex: 1, flexDirection: "row", gap: 6 }}
      >
        {/* The work-order bar, one stage colour per question: done steps filled, this one shimmering. */}
        {Array.from({ length: total }, (_, i) => (
          <Segment key={i} index={i} status={ORDER_STEPS[i % ORDER_STEPS.length].status} completed={false} state={i < segment ? "done" : i === segment ? "current" : "todo"} />
        ))}
      </View>
    </View>
  );
}

/** The question for this screen, as a plain title and one line of help under it. */
export function StepTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text accessibilityRole="header" style={styles.title} maxFontSizeMultiplier={1.4}>{title}</Text>
      {sub ? <Text style={styles.sub} maxFontSizeMultiplier={1.5}>{sub}</Text> : null}
    </View>
  );
}

/**
 * One screen's content. It slides in a little from the side you're heading to (from the right going
 * forward, from the left going back) as it fades in; with Reduce Motion it just appears.
 */
export function StepBody({ id, dir = 1, children }: { id: string; dir?: 1 | -1; children: ReactNode }) {
  const reduce = useReducedMotion();
  const enter = dir === 1 ? FadeInRight : FadeInLeft;
  return (
    <Animated.View key={id} entering={reduce ? undefined : enter.duration(260).easing(CALM.easing)} style={{ flex: 1, gap: 24 }}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", gap: 14 },
  back: { width: tap, height: tap, borderRadius: tap / 2, alignItems: "center", justifyContent: "center", backgroundColor: ds.card, borderWidth: 1, borderColor: ds.borderSoft },
  title: { fontSize: 28, lineHeight: 34, color: ds.ink, fontFamily: family.heading, letterSpacing: -0.6 },
  sub: { fontSize: 16, lineHeight: 22, color: ds.ink3, fontFamily: family.body },
});
