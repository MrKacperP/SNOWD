import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut, useReducedMotion } from "react-native-reanimated";
import { Icon } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { idState, useVerificationUpload } from "~/lib/verification";
import { ds, family } from "~/lib/theme";

/** "Later" hides the card until the app is next opened, never for good. */
let snoozed = false;

/**
 * The first thing on Home until a government ID is on file: one tap opens the camera, library or
 * Files, and the photo goes straight to SNOWD's review team. It thanks the user once it's sent.
 */
export function IdPrompt() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { profile } = useAuth();
  const state = idState(profile);
  const { busy, error, uploadId } = useVerificationUpload();
  const [hidden, setHidden] = useState(snoozed);
  const [sent, setSent] = useState(false);

  if (!profile || hidden || (state !== "missing" && state !== "rejected" && !sent)) return null;

  const title = sent ? "ID sent for review" : "ID verification";
  const body = sent
    ? "Thanks. We’ll let you know once it’s checked."
    : state === "rejected"
      ? profile.verificationNote || "We couldn’t read your last photo. Please upload a clearer one."
      : "Only used to verify your address and that you are who you say you are.";

  return (
    <Animated.View entering={reduce ? undefined : FadeIn.duration(260)} exiting={reduce ? undefined : FadeOut.duration(200)} style={[styles.card, sent && styles.cardSent]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={[styles.icon, sent && { backgroundColor: ds.mint }, state === "rejected" && !sent && { backgroundColor: "#c2410c" }]}>
          <Icon name={sent ? "checkmark" : "person.text.rectangle.fill"} size={20} color="#fff" weight="bold" />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
        </View>
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {sent ? (
        <Pressable accessibilityRole="button" onPress={() => setHidden(true)} style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.7 }]}>
          <Text style={styles.secondaryText}>Done</Text>
        </Pressable>
      ) : (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Upload your government ID"
            disabled={!!busy}
            onPress={() => void uploadId().then((ok) => ok && setSent(true))}
            style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]}
          >
            {busy === "id" ? <ActivityIndicator color="#fff" /> : <Icon name="camera.fill" size={16} color="#fff" />}
            <Text style={styles.primaryText}>{busy === "id" ? "Uploading…" : "Upload ID"}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Learn more about ID verification" onPress={() => router.push("/settings/verification")} style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.7 }]}>
            <Text style={styles.secondaryText}>Details</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remind me later"
            hitSlop={6}
            onPress={() => {
              snoozed = true;
              setHidden(true);
            }}
            style={({ pressed }) => [styles.later, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.laterText}>Later</Text>
          </Pressable>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 16, borderRadius: 24, backgroundColor: ds.card, borderWidth: 1.5, borderColor: ds.accentBorder, ...ds.cardShadow },
  cardSent: { borderColor: "#bfe3d5", backgroundColor: ds.mintSoft },
  icon: { width: 42, height: 42, borderRadius: 14, backgroundColor: ds.accent, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, lineHeight: 22, color: ds.ink, fontFamily: family.bodySemi },
  body: { fontSize: 14, lineHeight: 19, color: ds.ink3, fontFamily: family.body },
  error: { fontSize: 14, lineHeight: 19, color: "#b42318", fontFamily: family.bodyMedium },
  primary: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 46, borderRadius: 14, backgroundColor: ds.accent },
  primaryText: { fontSize: 16, color: "#fff", fontFamily: family.bodyBold },
  secondary: { alignItems: "center", justifyContent: "center", minHeight: 46, paddingHorizontal: 16, borderRadius: 14, backgroundColor: ds.bgAlt },
  secondaryText: { fontSize: 15, color: ds.ink, fontFamily: family.bodySemi },
  later: { alignItems: "center", justifyContent: "center", minHeight: 46, paddingHorizontal: 6 },
  laterText: { fontSize: 15, color: ds.ink3, fontFamily: family.bodySemi },
});
