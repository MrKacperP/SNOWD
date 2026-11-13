import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Group, Icon, Screen, SectionTitle, ToggleRow } from "~/components/ui";
import { THEMES, useAppearance, type ThemeKey } from "~/lib/appearance";
import { colors, radius, space, type } from "~/lib/theme";

/** Choose the app's colours: the headers on Home, Jobs, Messages and Profile, and the earnings line. */
export default function Appearance() {
  const { theme, settings, update } = useAppearance();
  const pick = (key: ThemeKey) => {
    void Haptics.selectionAsync();
    update({ theme: key });
  };
  return (
    <>
      <Stack.Screen options={{ title: "Appearance" }} />
      <Screen>
        {/* A live preview of the header in the chosen colours. */}
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.preview, { backgroundColor: theme.mid, backgroundImage: theme.gradient }]}>
          <Text style={styles.previewTitle}>Hi there</Text>
          <Text style={{ color: theme.soft, fontSize: 15 }}>This is how your headers will look.</Text>
          <View style={styles.previewCard}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={type.caption}>Earned in the past 30 days</Text>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.accent, width: "70%" }} />
            </View>
            <View style={[styles.previewBadge, { backgroundColor: theme.accent }]}>
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>2</Text>
            </View>
          </View>
        </View>

        <SectionTitle>App colour</SectionTitle>
        <View accessibilityRole="radiogroup" style={styles.grid}>
          {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
            const t = THEMES[key];
            const selected = settings.theme === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={t.label}
                onPress={() => pick(key)}
                style={({ pressed }) => [styles.swatch, selected && { borderColor: t.accent, borderWidth: 2.5 }, pressed && { transform: [{ scale: 0.97 }] }]}
              >
                <View style={[styles.swatchColour, { backgroundColor: t.mid, backgroundImage: `linear-gradient(160deg, ${t.deep} 0%, ${t.mid} 45%, ${t.accent} 85%, ${t.end} 100%)` }]}>
                  {selected ? <Icon name="checkmark.circle.fill" size={22} color="#fff" /> : null}
                </View>
                <Text style={[type.callout, { color: colors.ink, textAlign: "center", fontWeight: selected ? "800" : "600" }]} numberOfLines={1}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <SectionTitle>Home</SectionTitle>
        <Group>
          <ToggleRow
            title="Colour the header by job step"
            body="While a job is on the go, Home’s header matches its step, like purple while clearing. Off keeps your app colour."
            value={settings.jobColouredHeader}
            onValueChange={(v) => update({ jobColouredHeader: v })}
            last
          />
        </Group>
        <Text style={type.caption}>Saved on this phone. Job step colours (orange, teal, blue, purple, green) stay the same so progress always reads the same way.</Text>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  preview: { borderRadius: radius.lg, padding: space.lg, gap: 4, overflow: "hidden" },
  previewTitle: { color: "#fff", fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  previewCard: { marginTop: space.md, flexDirection: "row", alignItems: "center", gap: space.md, backgroundColor: "#fff", borderRadius: 18, padding: space.md },
  previewBadge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  swatch: { width: "31.5%", gap: 8, padding: 8, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center" },
  swatchColour: { width: "100%", height: 56, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
