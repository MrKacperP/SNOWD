import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type PressableProps,
  type ScrollViewProps,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { initials } from "~/lib/format";
import { colors, radius, shadow, space, type } from "~/lib/theme";

type SymbolName = SymbolViewProps["name"];

export function Icon({ name, size = 20, color = colors.ink, weight = "semibold" }: { name: SymbolName; size?: number; color?: string; weight?: "regular" | "medium" | "semibold" | "bold" }) {
  return <SymbolView name={name} size={size} tintColor={color} weight={weight} />;
}

/** A scrolling page that sits correctly under the native large-title header and above the tab bar. */
export function Screen({ children, contentStyle, ...props }: ScrollViewProps & { contentStyle?: StyleProp<ViewStyle> }) {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[{ padding: space.lg, gap: space.lg, paddingBottom: space.xxl }, contentStyle]}
      {...props}
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, style, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

type ButtonProps = Omit<PressableProps, "children" | "style"> & {
  title: string;
  variant?: "primary" | "secondary" | "danger" | "ghost" | "dark";
  icon?: SymbolName;
  loading?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, variant = "primary", icon, loading, small, disabled, onPress, style, ...props }: ButtonProps) {
  const palette = {
    primary: { bg: colors.accent, fg: "#fff", border: colors.accent },
    dark: { bg: colors.ink, fg: "#fff", border: colors.ink },
    secondary: { bg: colors.surface, fg: colors.ink, border: colors.border },
    danger: { bg: colors.surface, fg: colors.danger, border: "#f3c4c4" },
    ghost: { bg: "transparent", fg: colors.accent, border: "transparent" },
  }[variant];
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={off}
      onPress={(event) => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(event);
      }}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: off ? 0.5 : 1 },
        pressed && styles.pressed,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={small ? 15 : 17} color={palette.fg} /> : null}
          <Text style={[styles.buttonText, small && { fontSize: 14 }, { color: palette.fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Field({ label, hint, error, style, ...props }: TextInputProps & { label?: string; hint?: string; error?: string }) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.faint}
        style={[styles.input, props.multiline && { minHeight: 96, textAlignVertical: "top", paddingTop: 14 }, error ? { borderColor: colors.danger } : null, style]}
        {...props}
      />
      {error ? <Text style={[type.caption, { color: colors.danger }]}>{error}</Text> : hint ? <Text style={type.caption}>{hint}</Text> : null}
    </View>
  );
}

export function Avatar({ uri, name, size = 44 }: { uri?: string; name?: string; size?: number }) {
  const style = { width: size, height: size, borderRadius: size / 2 };
  if (uri) return <Image source={{ uri }} style={[style, { backgroundColor: colors.surfaceAlt }]} contentFit="cover" transition={150} />;
  return (
    <View style={[style, { backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" }]}>
      <Text style={{ color: colors.accent, fontWeight: "700", fontSize: size * 0.38 }}>{initials(name)}</Text>
    </View>
  );
}

const toneColors = {
  blue: { bg: colors.accentSoft, fg: colors.accent },
  green: { bg: colors.mintSoft, fg: colors.mint },
  orange: { bg: colors.sunSoft, fg: "#c25a12" },
  red: { bg: colors.dangerSoft, fg: colors.danger },
  gray: { bg: colors.surfaceAlt, fg: colors.muted },
};
export type Tone = keyof typeof toneColors;

export function Badge({ label, tone = "gray" }: { label: string; tone?: Tone }) {
  const c = toneColors[tone];
  return (
    <View style={{ backgroundColor: c.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: "flex-start" }}>
      <Text style={{ color: c.fg, fontSize: 12, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

export function Chip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress?: () => void; icon?: SymbolName }) {
  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync();
        onPress?.();
      }}
      style={({ pressed }) => [styles.chip, selected && styles.chipOn, pressed && styles.pressed]}
    >
      {icon ? <Icon name={icon} size={14} color={selected ? "#fff" : colors.ink} /> : null}
      <Text style={{ color: selected ? "#fff" : colors.ink, fontWeight: "600", fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: space.sm }}>
      <Text style={type.overline}>{children}</Text>
      {action}
    </View>
  );
}

export function Empty({ icon, title, body, action }: { icon: SymbolName; title: string; body?: string; action?: ReactNode }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 48, paddingHorizontal: space.xl, gap: space.md }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={28} color={colors.accent} />
      </View>
      <Text style={[type.headline, { textAlign: "center" }]}>{title}</Text>
      {body ? <Text style={[type.callout, { textAlign: "center" }]}>{body}</Text> : null}
      {action}
    </View>
  );
}

export function Row({ icon, label, value, onPress, tint = colors.ink, last }: { icon: SymbolName; label: string; value?: string; onPress?: () => void; tint?: string; last?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && { backgroundColor: colors.surfaceAlt }]}>
      <View style={styles.rowIcon}>
        <Icon name={icon} size={16} color={tint} />
      </View>
      <Text style={[type.body, { flex: 1, color: tint }]} numberOfLines={1}>
        {label}
      </Text>
      {value ? <Text style={[type.callout, { maxWidth: "50%" }]} numberOfLines={1}>{value}</Text> : null}
      {onPress ? <Icon name="chevron.right" size={13} color={colors.faint} /> : null}
    </Pressable>
  );
}

export function Notice({ text, tone = "red" }: { text?: string; tone?: Tone }) {
  if (!text) return null;
  const c = toneColors[tone];
  return (
    <View style={{ backgroundColor: c.bg, borderRadius: radius.md, padding: space.md }}>
      <Text style={{ color: c.fg, fontSize: 14, lineHeight: 19, fontWeight: "500" }}>{text}</Text>
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}


/** A white card holding a list of Rows, like an iOS grouped table section. */
export function Group({ children }: { children: ReactNode }) {
  return <View style={[styles.card, { padding: 0, gap: 0, overflow: "hidden" }]}>{children}</View>;
}

/** A labelled switch with a sentence of explanation underneath. */
export function ToggleRow({ title, body, value, onValueChange, disabled, last }: { title: string; body?: string; value: boolean; onValueChange: (value: boolean) => void; disabled?: boolean; last?: boolean }) {
  return (
    <View style={[styles.row, { alignItems: "flex-start", paddingVertical: 14 }, !last && styles.rowBorder]}>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={type.headline}>{title}</Text>
        {body ? <Text style={type.caption}>{body}</Text> : null}
      </View>
      <Switch value={value} disabled={disabled} onValueChange={onValueChange} trackColor={{ true: colors.accent }} />
    </View>
  );
}

/** Square photo thumbnails with a remove button, plus an "add" tile while there is room. */
export function PhotoGrid({ photos, max, onAdd, onRemove, busy, addLabel = "Add photo" }: { photos: string[]; max: number; onAdd: () => void; onRemove: (index: number) => void; busy?: boolean; addLabel?: string }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      {photos.map((uri, index) => (
        <View key={uri} style={styles.photo}>
          <Image source={{ uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={150} />
          <Pressable accessibilityLabel={`Remove photo ${index + 1}`} hitSlop={8} disabled={busy} onPress={() => onRemove(index)} style={styles.photoRemove}>
            <Icon name="xmark" size={11} color="#fff" weight="bold" />
          </Pressable>
        </View>
      ))}
      {photos.length < max ? (
        <Pressable disabled={busy} onPress={onAdd} style={({ pressed }) => [styles.photo, styles.photoAdd, pressed && styles.pressed]}>
          {busy ? <ActivityIndicator color={colors.accent} /> : <Icon name="photo.badge.plus" size={22} color={colors.accent} />}
          <Text style={{ color: colors.accent, fontSize: 12, fontWeight: "700" }}>{busy ? "Uploading…" : addLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Pinned bottom bar with the screen's main action, used on edit screens. */
export function SaveBar({ dirty, saving, onSave, title = "Save changes", bottomInset = 0 }: { dirty: boolean; saving: boolean; onSave: () => void; title?: string; bottomInset?: number }) {
  return (
    <View style={[styles.saveBar, { paddingBottom: bottomInset + space.md }]}>
      <Text style={[type.caption, { flex: 1 }]}>{saving ? "Saving…" : dirty ? "You have unsaved changes" : "All changes saved"}</Text>
      <Button title={title} small icon="checkmark" loading={saving} disabled={!dirty} onPress={onSave} style={{ paddingHorizontal: 18 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, ...shadow },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  button: { minHeight: 52, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: space.lg, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm },
  buttonSmall: { minHeight: 38, paddingHorizontal: space.md, borderRadius: radius.sm },
  buttonText: { fontSize: 16, fontWeight: "700" },
  label: { fontSize: 14, fontWeight: "600", color: colors.ink },
  input: { minHeight: 50, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: space.lg, fontSize: 16, color: colors.ink },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, height: 36, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 13, paddingHorizontal: space.lg, minHeight: 50 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  photo: { width: 100, height: 100, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.surfaceAlt },
  photoAdd: { alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1.5, borderStyle: "dashed", borderColor: "#b9c6ff", backgroundColor: colors.accentSoft },
  photoRemove: { position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(17,43,59,0.75)", alignItems: "center", justifyContent: "center" },
  saveBar: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingTop: space.md, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rowIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" },
});
