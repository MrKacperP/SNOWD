import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "~/lib/appearance";
import { brand, ds, family, fadeInto, fadeIntoLong, gap, gradient } from "~/lib/theme";
import type { HeaderTone } from "~/lib/headerTone";
import { Snowfall } from "./brand";
import { Icon } from "./ui";

/**
 * How the header meets the page.
 * - "soft": the colour runs on under the first cards and fades into the page (Home-style).
 * - "long": a longer fade that turns light quickly, so cards on it read on page colour, not on blue.
 * - "none": a solid band that stops under its last row (search, filters); content starts below it.
 */
export type HeaderFade = "soft" | "long" | "none";

/** How far the header colour runs on under the page content, behind the first cards. Background only. */
const UNDERLAP: Record<HeaderFade, number> = { soft: 150, long: 260, none: 0 };

/**
 * The coloured band at the top of a tab (Jobs, Messages): the title sits right under the status
 * bar on SNOWD blue, with room for a search box or filters underneath. Square edges, like Home.
 */
export function TabHeader({ title, subtitle, right, children, onBack, tone, pageColor, fade = "soft", footer, footerLabel }: { /** A small white heading just above the footer card, on the full colour. */ footerLabel?: string; /** How the colour meets the page; see HeaderFade. */ fade?: HeaderFade; /** A card drawn inside the band, exactly like Home's work order: the colour fades into the page behind it, starting 90 px above it and ending at its bottom. */ footer?: ReactNode; title: string; subtitle?: string; right?: ReactNode; children?: ReactNode; /** Shows a back button before the title (pushed screens like a work order). */ onBack?: () => void; /** The live work order's progress colour; the theme's blue when absent. */ tone?: HeaderTone; /** The page colour the header fades into (#rrggbb), when it isn't the usual page grey. */ pageColor?: string }) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  // Like Home: a live job tints the header with its progress colour (deep shade at the top for white text).
  const top = tone ? tone.text : theme.deep;
  // With a footer card the band is Home's header: the same colour stops, so the two read as one.
  const image = tone
    ? `linear-gradient(180deg, ${tone.text} 0%, ${tone.text} 35%, ${tone.bar} 100%)`
    : footer
      ? `linear-gradient(180deg, ${theme.deep} 0%, ${theme.mid} 40%, ${theme.accent} 85%, ${theme.end} 100%)`
      : `linear-gradient(180deg, ${theme.deep} 0%, ${theme.mid} 55%, ${theme.accent} 100%)`;
  const underlap = footer ? 0 : UNDERLAP[fade];
  return (
    <View>
      {/* Same blue above the band, so pulling down to refresh never shows a pale gap. */}
      <View pointerEvents="none" style={[styles.overscroll, { backgroundColor: top }]}>
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 220 }}>
          <Snowfall count={5} height={220} color="rgba(255,255,255,0.4)" />
        </View>
      </View>
      {/* Top to bottom, so the top edge matches the colour above it exactly. */}
      {/* The band reaches the underlap further down and gives that space straight back, so the colour
          sits behind the page content (which draws on top) without pushing it down. */}
      <View style={[styles.band, { paddingTop: insets.top + 6, paddingBottom: gap.x4 + underlap, marginBottom: -underlap, backgroundColor: top, backgroundImage: image }]}>
        <Snowfall count={6} height={180} color="rgba(255,255,255,0.45)" />
        {/* The colour fades into the page under the last row, behind the content: never over it. */}
        {fade !== "none" && !footer ? (
          <View
            pointerEvents="none"
            style={[
              styles.fade,
              { height: gap.x4 + UNDERLAP[fade], backgroundImage: fade === "long" ? fadeIntoLong(pageColor || "#f6f8fb") : pageColor ? fadeInto(pageColor) : gradient.pageFade },
            ]}
          />
        ) : null}
        <View style={styles.titleRow}>
          {onBack ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} onPress={onBack} style={styles.back}>
              <Icon name="chevron.left" size={19} color="#fff" weight="bold" />
            </Pressable>
          ) : null}
          <View style={{ flex: 1 }}>
            <Text accessibilityRole="header" style={styles.title} maxFontSizeMultiplier={1.4}>{title}</Text>
            {subtitle ? <Text style={[styles.subtitle, { color: theme.soft }]} maxFontSizeMultiplier={1.6}>{subtitle}</Text> : null}
          </View>
          {right}
        </View>
        {children}
        {footer && footerLabel ? (
          <Text accessibilityRole="header" style={styles.footerLabel} maxFontSizeMultiplier={1.6}>{footerLabel}</Text>
        ) : null}
        {footer ? (
          <View>
            {/* Same fade as Home: from 90 px above the card, down to its bottom, in the page colour. */}
            <View pointerEvents="none" style={[styles.footerFade, { backgroundImage: pageColor ? fadeInto(pageColor) : gradient.pageFade }]} />
            {footer}
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** A rounded white search field for use inside the header band. */
export function HeaderSearch({ value, onChangeText, placeholder }: { value: string; onChangeText: (text: string) => void; placeholder: string }) {
  return (
    <View style={styles.search}>
      <Icon name="magnifyingglass" size={16} color={ds.ink3} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={ds.ink3}
        accessibilityLabel={placeholder}
        returnKeyType="search"
        clearButtonMode="while-editing"
        style={styles.searchInput}
      />
    </View>
  );
}

/** A filter pill that reads well on the blue band: white when selected, see-through otherwise. */
export function HeaderPill({ label, selected, onPress, count }: { label: string; selected: boolean; onPress: () => void; count?: number }) {
  const theme = useAppTheme();
  return (
    <Text
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      suppressHighlighting
      style={[styles.pill, selected && [styles.pillOn, { color: theme.mid }]]}
    >
      {label}
      {count ? ` ${count}` : ""}
    </Text>
  );
}

const styles = StyleSheet.create({
  overscroll: { position: "absolute", top: -800, height: 820, left: 0, right: 0, backgroundColor: brand.royalDeep },
  fade: { position: "absolute", left: 0, right: 0, bottom: 0 },
  footerLabel: { fontFamily: family.bodySemi, fontSize: 13, letterSpacing: 0.6, textTransform: "uppercase", color: "rgba(255,255,255,0.85)", marginBottom: -gap.x1 },
  footerFade: { position: "absolute", top: -90, bottom: -gap.x4, left: -gap.x4, right: -gap.x4 },
  band: {
    paddingHorizontal: gap.x4,
    gap: gap.x3,
    overflow: "hidden",
    backgroundColor: brand.royal,
    backgroundImage: `linear-gradient(160deg, ${brand.royalDeep} 0%, ${brand.royal} 45%, ${ds.accent} 85%, ${ds.accentIndigo} 100%)`,
  },
  back: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: gap.x3, minHeight: 44 },
  title: { fontFamily: family.heading, fontSize: 32, lineHeight: 38, letterSpacing: -1, color: "#fff" },
  subtitle: { fontFamily: family.body, fontSize: 15, lineHeight: 20, color: brand.onBlueSoft },
  search: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, paddingHorizontal: 14, borderRadius: 14, backgroundColor: "#fff" },
  searchInput: { flex: 1, fontFamily: family.body, fontSize: 16, color: ds.ink, paddingVertical: 10 },
  pill: {
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    fontFamily: family.bodySemi,
    fontSize: 15,
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  pillOn: { backgroundColor: "#fff", color: brand.royal },
});
