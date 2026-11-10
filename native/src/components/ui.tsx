import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useState, type ReactNode } from "react";
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
import { colors, radius, shadow, space, tap, type } from "~/lib/theme";

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
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, style, pressed && styles.pressed]}>
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
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
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
          <Text style={[styles.buttonText, small && { fontSize: 15 }, { color: palette.fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

/**
 * A labelled text box. The label stays visible above the box (placeholders vanish as you type),
 * the box shows a clear ring while it has focus, and password boxes get a Show / Hide button.
 */
export function Field({ label, hint, error, style, secureTextEntry, onFocus, onBlur, ...props }: TextInputProps & { label?: string; hint?: string; error?: string }) {
  const [focused, setFocused] = useState(false);
  const [reveal, setReveal] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View>
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={hint}
          placeholderTextColor={colors.faint}
          secureTextEntry={secureTextEntry && !reveal}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[
            styles.input,
            props.multiline && { minHeight: 104, textAlignVertical: "top", paddingTop: 14 },
            secureTextEntry && { paddingRight: 76 },
            focused && styles.inputFocused,
            error ? { borderColor: colors.danger } : null,
            style,
          ]}
          {...props}
        />
        {secureTextEntry ? (
          <Pressable accessibilityRole="button" accessibilityLabel={reveal ? "Hide password" : "Show password"} hitSlop={6} onPress={() => setReveal(!reveal)} style={styles.reveal}>
            <Text style={{ color: colors.accent, fontWeight: "700", fontSize: 15 }}>{reveal ? "Hide" : "Show"}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text accessibilityRole="alert" style={[type.caption, { color: colors.danger, fontWeight: "600" }]}>{error}</Text> : hint ? <Text style={type.caption}>{hint}</Text> : null}
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
  orange: { bg: colors.sunSoft, fg: colors.sunText },
  red: { bg: colors.dangerSoft, fg: colors.danger },
  gray: { bg: colors.surfaceAlt, fg: colors.muted },
};
export type Tone = keyof typeof toneColors;

export function Badge({ label, tone = "gray" }: { label: string; tone?: Tone }) {
  const c = toneColors[tone];
  return (
    <View style={{ backgroundColor: c.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: "flex-start" }}>
      <Text style={{ color: c.fg, fontSize: 13, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

export function Chip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress?: () => void; icon?: SymbolName }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!selected }}
      hitSlop={{ top: 2, bottom: 2 }}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress?.();
      }}
      style={({ pressed }) => [styles.chip, selected && styles.chipOn, pressed && styles.pressed]}
    >
      {icon ? <Icon name={icon} size={15} color={selected ? "#fff" : colors.ink} /> : null}
      <Text style={{ color: selected ? "#fff" : colors.ink, fontWeight: "600", fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: space.sm }}>
      <Text accessibilityRole="header" style={type.overline}>{children}</Text>
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
      <Text accessibilityRole="header" style={[type.headline, { textAlign: "center" }]}>{title}</Text>
      {body ? <Text style={[type.callout, { textAlign: "center" }]}>{body}</Text> : null}
      {action}
    </View>
  );
}

export function Row({ icon, label, value, onPress, tint = colors.ink, last }: { icon: SymbolName; label: string; value?: string; onPress?: () => void; tint?: string; last?: boolean }) {
  return (
    <Pressable accessibilityRole={onPress ? "button" : undefined} accessibilityLabel={value ? `${label}, ${value}` : label} onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && { backgroundColor: colors.surfaceAlt }]}>
      <View style={styles.rowIcon}>
        <Icon name={icon} size={17} color={tint} />
      </View>
      <Text style={[type.body, { flex: 1, color: tint }]} numberOfLines={1}>
        {label}
      </Text>
      {value ? <Text style={[type.callout, { maxWidth: "50%" }]} numberOfLines={1}>{value}</Text> : null}
      {onPress ? <Icon name="chevron.right" size={13} color={colors.faint} /> : null}
    </Pressable>
  );
}

const NOTICE_ICONS: Record<Tone, SymbolName> = {
  red: "exclamationmark.triangle.fill",
  orange: "exclamationmark.circle.fill",
  green: "checkmark.circle.fill",
  blue: "info.circle.fill",
  gray: "info.circle.fill",
};

/** A message about what just happened or what to do. The icon says the tone, so colour is never the only cue. */
export function Notice({ text, tone = "red" }: { text?: string; tone?: Tone }) {
  if (!text) return null;
  const c = toneColors[tone];
  return (
    <View accessible accessibilityRole={tone === "red" ? "alert" : "text"} accessibilityLiveRegion="polite" style={{ flexDirection: "row", gap: 10, backgroundColor: c.bg, borderRadius: radius.md, padding: space.md }}>
      <View style={{ paddingTop: 2 }}>
        <Icon name={NOTICE_ICONS[tone]} size={17} color={c.fg} />
      </View>
      <Text style={{ flex: 1, color: c.fg, fontSize: 15, lineHeight: 21, fontWeight: "600" }}>{text}</Text>
    </View>
  );
}

/**
 * One choice in a short list where exactly one can be picked: a role, a payment method, a time.
 * The filled circle shows the pick, as well as the coloured outline.
 */
export function OptionCard({ icon, title, body, selected, onPress, trailing, disabled }: { icon?: SymbolName; title: string; body?: string; selected: boolean; onPress: () => void; trailing?: string; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={[title, trailing, body].filter(Boolean).join(", ")}
      accessibilityState={{ selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [styles.option, selected && styles.optionOn, disabled && { opacity: 0.5 }, pressed && styles.pressed]}
    >
      {icon ? (
        <View style={[styles.optionIcon, selected && { backgroundColor: colors.accent }]}>
          <Icon name={icon} size={22} color={selected ? "#fff" : colors.accent} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
          <Text style={[type.headline, { flex: 1 }]}>{title}</Text>
          {trailing ? <Text style={[type.headline, { fontVariant: ["tabular-nums"] }]}>{trailing}</Text> : null}
        </View>
        {body ? <Text style={type.caption}>{body}</Text> : null}
      </View>
      <View style={[styles.radio, selected && { borderColor: colors.accent, backgroundColor: colors.accent }]}>
        {selected ? <Icon name="checkmark" size={12} color="#fff" weight="bold" /> : null}
      </View>
    </Pressable>
  );
}

/** "Step 2 of 3" with the step's name and a bar, for anything done over several screens. */
export function StepHeader({ step, labels }: { step: number; labels: string[] }) {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={`Step ${step + 1} of ${labels.length}: ${labels[step]}`} accessibilityValue={{ min: 1, max: labels.length, now: step + 1 }} style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {labels.map((label, i) => (
          <View key={label} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i <= step ? colors.accent : colors.border }} />
        ))}
      </View>
      <Text style={[type.caption, { fontWeight: "600" }]}>
        Step {step + 1} of {labels.length} · <Text style={{ color: colors.ink }}>{labels[step]}</Text>
      </Text>
    </View>
  );
}

/** A numbered heading for one part of a form, so a long form reads as a short list of questions. */
export function FormSection({ number, title, children }: { number?: number; title: string; children: ReactNode }) {
  return (
    <View style={[styles.card, { gap: space.md }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {number ? (
          <View style={styles.number}>
            <Text style={{ color: colors.accent, fontWeight: "800", fontSize: 14 }}>{number}</Text>
          </View>
        ) : null}
        <Text accessibilityRole="header" style={[type.headline, { flex: 1 }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

/** A round icon button with a label underneath, for the two or three shortcuts next to a main action. */
export function QuickAction({ icon, label, onPress, tint = colors.accent }: { icon: SymbolName; label: string; onPress: () => void; tint?: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => { void Haptics.selectionAsync(); onPress(); }} style={({ pressed }) => [styles.quick, pressed && styles.pressed]}>
      <Icon name={icon} size={20} color={tint} />
      <Text style={{ color: colors.ink, fontSize: 14, fontWeight: "600" }} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
      <ActivityIndicator accessibilityLabel="Loading" color={colors.accent} />
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
      <Switch accessibilityLabel={title} value={value} disabled={disabled} onValueChange={onValueChange} trackColor={{ true: colors.accent }} />
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
        <Pressable accessibilityRole="button" accessibilityLabel={addLabel} disabled={busy} onPress={onAdd} style={({ pressed }) => [styles.photo, styles.photoAdd, pressed && styles.pressed]}>
          {busy ? <ActivityIndicator color={colors.accent} /> : <Icon name="photo.badge.plus" size={22} color={colors.accent} />}
          <Text style={{ color: colors.accent, fontSize: 13, fontWeight: "700", textAlign: "center" }}>{busy ? "Uploading…" : addLabel}</Text>
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
      <Button title={title} small icon="checkmark" loading={saving} disabled={!dirty} onPress={onSave} style={{ paddingHorizontal: 20 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, ...shadow },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  // Every control is at least 44pt tall and grows with the text, so larger system text never clips.
  button: { minHeight: 54, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: space.lg, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm },
  buttonSmall: { minHeight: tap, paddingHorizontal: space.lg, paddingVertical: 8, borderRadius: radius.md },
  buttonText: { fontSize: 17, fontWeight: "700", textAlign: "center", flexShrink: 1 },
  label: { fontSize: 15, fontWeight: "600", color: colors.ink },
  input: { minHeight: 54, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.borderStrong, backgroundColor: colors.surface, paddingHorizontal: space.lg, paddingVertical: 12, fontSize: 17, color: colors.ink },
  inputFocused: { borderColor: colors.accent, backgroundColor: "#fbfcff" },
  reveal: { position: "absolute", right: 6, top: 0, bottom: 0, minWidth: 60, alignItems: "center", justifyContent: "center" },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 8, minHeight: 42, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.borderStrong },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  option: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg, minHeight: 72, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface },
  optionOn: { borderColor: colors.accent, backgroundColor: "#f7f9ff" },
  optionIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" },
  number: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
  quick: { flex: 1, minHeight: 64, alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 6, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 14, paddingHorizontal: space.lg, minHeight: 56 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  photo: { width: 100, height: 100, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.surfaceAlt },
  photoAdd: { alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1.5, borderStyle: "dashed", borderColor: "#b9c6ff", backgroundColor: colors.accentSoft, padding: 4 },
  photoRemove: { position: "absolute", top: 4, right: 4, width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(17,43,59,0.75)", alignItems: "center", justifyContent: "center" },
  saveBar: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingTop: space.md, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rowIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" },
});
