import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "~/lib/appearance";
import { brand, ds, family, gap } from "~/lib/theme";
import { Snowfall } from "./brand";
import { Icon } from "./ui";

/** How tall the soft fade at the bottom of the header is. */
const FADE = 56;

/**
 * The coloured band at the top of a tab (Jobs, Messages): the title sits right under the status
 * bar on SNOWD blue, with room for a search box or filters underneath. Square edges, like Home.
 */
export function TabHeader({ title, subtitle, right, children, onBack }: { title: string; subtitle?: string; right?: ReactNode; children?: ReactNode; /** Shows a back button before the title (pushed screens like a work order). */ onBack?: () => void }) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  return (
    <View>
      {/* Same blue above the band, so pulling down to refresh never shows a pale gap. */}
      <View pointerEvents="none" style={[styles.overscroll, { backgroundColor: theme.deep }]}>
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 220 }}>
          <Snowfall count={5} height={220} color="rgba(255,255,255,0.4)" />
        </View>
      </View>
      {/* Top to bottom, so the top edge matches the colour above it exactly. */}
      <View style={[styles.band, { paddingTop: insets.top + 6, backgroundColor: theme.deep, backgroundImage: `linear-gradient(180deg, ${theme.deep} 0%, ${theme.mid} 55%, ${theme.accent} 100%)` }]}>
        <Snowfall count={6} height={180} color="rgba(255,255,255,0.45)" />
        {/* No hard bottom edge: the colour fades into the page (drawn under the title, pills and cards). */}
        <View pointerEvents="none" style={[styles.fade, { backgroundImage: `linear-gradient(180deg, ${ds.bg}00 0%, ${ds.bg}e6 35%, ${ds.bg} 65%)` }]} />
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
  fade: { position: "absolute", left: 0, right: 0, bottom: 0, height: FADE },
  band: {
    paddingHorizontal: gap.x4,
    paddingBottom: gap.x4 + FADE * 0.6,
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
