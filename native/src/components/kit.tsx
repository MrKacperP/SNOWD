import * as Haptics from "expo-haptics";
import type { SymbolViewProps } from "expo-symbols";
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { brand, corner, depth, ds, family, font, gap, statusTone, tap } from "~/lib/theme";
import { Icon } from "./ui";

type SymbolName = SymbolViewProps["name"];

/* The shared building blocks of the SNOWD design system: pressables, surfaces, badges, buttons, headings. */

type ScalePressProps = Omit<PressableProps, "style" | "children"> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** How far the element sinks while pressed. */
  depthScale?: number;
  haptic?: "selection" | "light" | "medium" | "none";
};

/**
 * A pressable that sinks gently under the finger and springs back, with a tap of haptics.
 * Under Reduce Motion it dims instead of scaling.
 */
export function ScalePress({ children, style, depthScale = 0.97, haptic = "selection", onPressIn, onPressOut, onPress, disabled, ...props }: ScalePressProps) {
  const reduce = useReducedMotion();
  const pressed = useSharedValue(0);
  const animated = useAnimatedStyle(() =>
    reduce
      ? { opacity: 1 - pressed.value * 0.18 }
      : { transform: [{ scale: 1 - pressed.value * (1 - depthScale) }] },
  );
  // Sizing props belong on the outer pressable, so tiles in a row share the width (and height) evenly.
  const flat = StyleSheet.flatten(style) || {};
  const outer: ViewStyle = { flex: flat.flex, flexGrow: flat.flexGrow, flexShrink: flat.flexShrink, flexBasis: flat.flexBasis, width: flat.width, alignSelf: flat.alignSelf };
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={outer}
      onPressIn={(e) => {
        pressed.value = reduce ? withTiming(1, { duration: 80 }) : withSpring(1, { damping: 20, stiffness: 420 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.value = reduce ? withTiming(0, { duration: 120 }) : withSpring(0, { damping: 16, stiffness: 300 });
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic === "selection") void Haptics.selectionAsync();
        else if (haptic === "light") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        else if (haptic === "medium") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress?.(e);
      }}
      {...props}
    >
      <Animated.View style={[style, { flexGrow: flat.flex || flat.flexGrow ? 1 : undefined }, animated, disabled && { opacity: 0.55 }]}>{children}</Animated.View>
    </Pressable>
  );
}

export type SurfaceTone = "white" | "ice" | "brand" | "live" | "warning";

const surfaceTones: Record<SurfaceTone, ViewStyle> = {
  white: { backgroundColor: ds.card, borderColor: ds.border },
  ice: { backgroundColor: brand.frost, borderColor: brand.iceDeep },
  brand: { backgroundColor: brand.electric, borderColor: "rgba(255,255,255,0.18)" },
  live: { backgroundColor: brand.liveSoft, borderColor: "#bfe9d1" },
  warning: { backgroundColor: brand.goldSoft, borderColor: "#f6d9a8" },
};

/** A card surface with generous padding, a soft layered shadow and a large radius. */
export function Surface({ children, tone = "white", elevation = "low", style }: { children: ReactNode; tone?: SurfaceTone; elevation?: keyof typeof depth | "none"; style?: StyleProp<ViewStyle> }) {
  // "low" is the design system's card shadow (.app-card); "mid"/"high" add depth for overlays.
  const shadow = elevation === "none" ? null : elevation === "low" ? ds.cardShadow : depth[elevation];
  return <View style={[styles.surface, surfaceTones[tone], shadow, style]}>{children}</View>;
}

/** A round tinted bubble holding an icon, used to make tiles and rows recognisable at a glance. */
export function IconBubble({ name, color = brand.electric, background = brand.ice, size = 48 }: { name: SymbolName; color?: string; background?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.34, backgroundColor: background, alignItems: "center", justifyContent: "center" }}>
      <Icon name={name} size={size * 0.46} color={color} />
    </View>
  );
}

export type StatusKind = keyof typeof statusTone;

/** A status pill that always pairs its colour with an icon and words, so colour is never the only cue. */
export function StatusBadge({ label, kind = "info", icon, color, background }: { label: string; kind?: StatusKind; icon?: SymbolName; color?: string; background?: string }) {
  const tone = statusTone[kind];
  const fg = color || tone.fg;
  return (
    <View style={[styles.badge, { backgroundColor: background || tone.bg }]}>
      <Icon name={icon || (tone.icon as SymbolName)} size={16} color={fg} weight="bold" />
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

/** A section heading at 23pt, with an optional text action that keeps a full 44pt tap area. */
export function SectionHeader({ title, action, onAction, actionLabel }: { title: string; action?: string; onAction?: () => void; actionLabel?: string }) {
  return (
    <View style={styles.sectionRow}>
      <Text accessibilityRole="header" style={[font.section, { flex: 1 }]}>{title}</Text>
      {action && onAction ? (
        <Pressable accessibilityRole="button" accessibilityLabel={actionLabel || action} hitSlop={8} onPress={() => { void Haptics.selectionAsync(); onAction(); }} style={({ pressed }) => [styles.sectionAction, pressed && { opacity: 0.6 }]}>
          <Text style={styles.sectionActionText}>{action}</Text>
          <Icon name="chevron.right" size={14} color={brand.electric} weight="bold" />
        </Pressable>
      ) : null}
    </View>
  );
}

const buttonVariants = {
  // .btn-primary: the accent gradient with its blue glow.
  primary: { bg: ds.accent, fg: "#ffffff", border: "transparent", shadow: { ...ds.accentShadow, backgroundImage: ds.accentGradient } },
  dark: { bg: brand.navy, fg: "#ffffff", border: brand.navy, shadow: depth.low },
  secondary: { bg: ds.card, fg: ds.ink, border: ds.border, shadow: null },
  soft: { bg: ds.accentSoft, fg: ds.accent, border: ds.accentBorder, shadow: null },
  danger: { bg: "#ffffff", fg: "#b42318", border: "#f3c4c4", shadow: null },
  light: { bg: "#ffffff", fg: brand.royal, border: "#ffffff", shadow: depth.mid },
} as const;

export type BigButtonVariant = keyof typeof buttonVariants;

/** The main button: 58pt tall, 18pt label, grows with larger text instead of clipping. */
export function BigButton({ title, icon, variant = "primary", loading, disabled, onPress, style, accessibilityHint }: { title: string; icon?: SymbolName; variant?: BigButtonVariant; loading?: boolean; disabled?: boolean; onPress: () => void; style?: StyleProp<ViewStyle>; accessibilityHint?: string }) {
  const v = buttonVariants[variant];
  const off = !!(disabled || loading);
  return (
    <ScalePress
      haptic="light"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: off, busy: !!loading }}
      disabled={off}
      onPress={onPress}
      style={[styles.bigButton, { backgroundColor: v.bg, borderColor: v.border }, v.shadow, style]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={20} color={v.fg} weight="bold" /> : null}
          <Text style={[font.button, { fontFamily: family.bodyBold, fontWeight: undefined, color: v.fg, textAlign: "center", flexShrink: 1 }]} maxFontSizeMultiplier={1.6}>{title}</Text>
        </>
      )}
    </ScalePress>
  );
}

/** One fact with an icon in front, wrapping onto more lines rather than cutting off. */
export function InfoLine({ icon, text, color = brand.slate, strong }: { icon: SymbolName; text: string; color?: string; strong?: boolean }) {
  return (
    <View style={styles.infoLine}>
      <View style={{ width: 24, alignItems: "center", paddingTop: 2 }}>
        <Icon name={icon} size={18} color={color} />
      </View>
      <Text style={[font.secondary, { flex: 1, color }, strong && { fontWeight: "700" }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: { borderRadius: ds.cardRadius, padding: gap.x5, gap: gap.x4, borderWidth: 1 },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: corner.pill, minHeight: 32 },
  badgeText: { fontSize: 16, lineHeight: 20, fontWeight: "700" },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: gap.x3, marginTop: gap.x2 },
  sectionAction: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: tap, paddingLeft: gap.x2 },
  sectionActionText: { fontSize: 17, fontWeight: "700", color: brand.electric },
  bigButton: { minHeight: 56, borderRadius: ds.radius, borderWidth: 1, paddingHorizontal: gap.x5, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: gap.x2 },
  infoLine: { flexDirection: "row", alignItems: "flex-start", gap: gap.x2 },
});
