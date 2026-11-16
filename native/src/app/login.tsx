import * as AppleAuthentication from "expo-apple-authentication";
import * as Haptics from "expo-haptics";
import * as Google from "expo-auth-session/providers/google";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { PenguinLoader, Snowfall, WORDMARK } from "~/components/brand";
import { BigButton, ScalePress, Surface } from "~/components/kit";
import { Field, Notice } from "~/components/ui";
import { friendlyAuthError, useAuth } from "~/context/auth";
import { ds, family } from "~/lib/theme";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_IOS_CLIENT_ID = "119102068229-6fd835k0ef8a72mur4lcbn19rgf5lflc.apps.googleusercontent.com";
const GOOGLE_IOS_REDIRECT = `com.googleusercontent.apps.${GOOGLE_IOS_CLIENT_ID.replace(".apps.googleusercontent.com", "")}:/oauthredirect`;
const GOOGLE_ANDROID_CLIENT_ID = "119102068229-rm9gs0ucc7lpac4cfutg2rl76ldhq0p5.apps.googleusercontent.com";

export default function Login() {
  const insets = useSafeAreaInsets();
  const { signInWithEmail, signUpWithEmail, signInWithApple, signInWithGoogleToken, resetPassword } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"" | "email" | "apple" | "google">("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [appleAvailable, setAppleAvailable] = useState(false);
  // On iOS, Google sends people back to the client's reversed ID, which app.json registers as a URL scheme.
  // The library's default return address is built from the app's bundle ID, so test builds
  // (ca.snowd.devtest) were refused by Google with "Access blocked".
  const [request, response, promptGoogle] = Google.useIdTokenAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    ...(Platform.OS === "ios" ? { redirectUri: GOOGLE_IOS_REDIRECT } : {}),
  });

  useEffect(() => {
    if (process.env.EXPO_PUBLIC_APPLE_SIGN_IN === "on") void AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  useEffect(() => {
    if (response?.type !== "success") {
      if (response) setBusy("");
      return;
    }
    const token = response.params.id_token;
    signInWithGoogleToken(token)
      .catch((e) => setError(friendlyAuthError(e)))
      .finally(() => setBusy(""));
  }, [response, signInWithGoogleToken]);

  const run = async (kind: "email" | "apple", task: () => Promise<void>) => {
    setError("");
    setNotice("");
    setBusy(kind);
    try {
      await task();
    } catch (e) {
      setError(friendlyAuthError(e));
    } finally {
      setBusy("");
    }
  };

  const submit = () =>
    run("email", async () => {
      if (!email.trim() || !password) throw new Error("Enter your email and password.");
      if (mode === "signup") await signUpWithEmail(name, email, password);
      else await signInWithEmail(email, password);
    });

  const signup = mode === "signup";
  const switchMode = (next: "signin" | "signup") => {
    if (next === mode) return;
    void Haptics.selectionAsync();
    setMode(next);
    setError("");
    setNotice("");
  };

  return (
    <View style={{ flex: 1, backgroundColor: ds.bg }}>
      {/* A soft winter sky behind the penguin, melting into the page. */}
      <View pointerEvents="none" style={[styles.sky, { height: insets.top + 300 }]}>
        <Snowfall count={14} height={insets.top + 300} color="rgba(255,255,255,0.75)" />
      </View>
      <KeyboardAwareScrollView
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 28, paddingBottom: insets.bottom + 16, paddingHorizontal: 24, gap: 22 }}
      >
        <View style={{ alignItems: "center", gap: 10 }}>
          <PenguinLoader size={70} label="SNOWD" />
          <Image accessibilityLabel="SNOWD" source={WORDMARK} style={{ width: 150, height: 31 }} contentFit="contain" />
          <Animated.Text key={mode} entering={FadeInDown.duration(260)} accessibilityRole="header" style={styles.title}>
            {signup ? "Clear the way" : "Welcome back"}
          </Animated.Text>
          <Text style={styles.lead}>{signup ? "Book a local shoveler, or earn money clearing snow." : "Sign in to see your orders and messages."}</Text>
        </View>

        <Surface style={{ gap: 14, padding: 18 }}>
          {/* Sign in / Create account, as one segmented switch. */}
          <View accessibilityRole="tablist" style={styles.segment}>
            <Animated.View layout={LinearTransition.springify().damping(18)} style={[styles.segmentThumb, signup ? { right: 4 } : { left: 4 }]} />
            {(["signin", "signup"] as const).map((m) => (
              <Pressable key={m} accessibilityRole="tab" accessibilityState={{ selected: mode === m }} onPress={() => switchMode(m)} style={styles.segmentItem}>
                <Text style={[styles.segmentText, mode === m && { color: ds.ink }]}>{m === "signin" ? "Sign in" : "Create account"}</Text>
              </Pressable>
            ))}
          </View>

          {Platform.OS === "ios" && appleAvailable ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={signup ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={16}
              style={{ height: 58, opacity: busy === "apple" ? 0.5 : 1 }}
              onPress={() => run("apple", signInWithApple)}
            />
          ) : null}
          <ScalePress
            haptic="light"
            accessibilityLabel="Continue with Google"
            accessibilityState={{ disabled: !request || !!busy, busy: busy === "google" }}
            disabled={!request || !!busy}
            onPress={() => {
              setError("");
              setBusy("google");
              void promptGoogle();
            }}
            style={styles.google}
          >
            {busy === "google" ? (
              <ActivityIndicator color={ds.ink} />
            ) : (
              <>
                <GoogleMark />
                <Text style={styles.googleText}>Continue with Google</Text>
              </>
            )}
          </ScalePress>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 2 }}>
            <View style={styles.rule} />
            <Text style={styles.or}>or with email</Text>
            <View style={styles.rule} />
          </View>

          {signup ? (
            <Animated.View entering={FadeInDown.springify().damping(16)}>
              <Field label="Full name" value={name} onChangeText={setName} textContentType="name" autoComplete="name" returnKeyType="next" />
            </Animated.View>
          ) : null}
          <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" returnKeyType="next" />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            hint={signup ? "Use at least 6 characters." : undefined}
            textContentType={signup ? "newPassword" : "password"}
            autoComplete={signup ? "new-password" : "current-password"}
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          {!signup ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={6}
              style={{ alignSelf: "flex-end", minHeight: 32, justifyContent: "center", marginTop: -4 }}
              onPress={() =>
                run("email", async () => {
                  if (!email.trim()) throw new Error("Type your email in the box above, then tap “Forgot password?” again.");
                  await resetPassword(email);
                  setNotice("We sent a reset link to your email. Open it to choose a new password.");
                })
              }
            >
              <Text style={styles.link}>Forgot password?</Text>
            </Pressable>
          ) : null}
          <Notice text={error} />
          <Notice text={notice} tone="green" />
          <BigButton title={signup ? "Create account" : "Sign in"} variant="primary" loading={busy === "email"} disabled={!!busy && busy !== "email"} onPress={submit} />
        </Surface>

        <Text style={styles.fine}>By continuing you agree to SNOWD’s terms and privacy policy.</Text>
      </KeyboardAwareScrollView>
    </View>
  );
}

/** Google's four-colour "G", drawn so the button doesn't need an image file. */
function GoogleMark() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <Path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  sky: { position: "absolute", left: 0, right: 0, top: 0, overflow: "hidden", backgroundImage: `linear-gradient(180deg, #2350ff 0%, #4d7cff 30%, #b9ceff 62%, ${ds.bg} 100%)` },
  title: { fontSize: 32, lineHeight: 38, color: ds.ink, fontFamily: family.heading, letterSpacing: -0.8, textAlign: "center", marginTop: 6 },
  lead: { fontSize: 17, lineHeight: 23, color: ds.ink3, fontFamily: family.body, textAlign: "center", maxWidth: 320 },
  segment: { flexDirection: "row", backgroundColor: ds.bgAlt, borderRadius: 16, padding: 4, minHeight: 48 },
  segmentThumb: { position: "absolute", top: 4, bottom: 4, width: "49%", borderRadius: 12, backgroundColor: ds.card, boxShadow: "0px 2px 8px rgba(17,43,59,0.10)" },
  segmentItem: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 40 },
  segmentText: { fontSize: 16, color: ds.ink3, fontFamily: family.bodySemi },
  google: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 58, borderRadius: 16, backgroundColor: ds.card, borderWidth: 1.5, borderColor: ds.border },
  googleText: { fontSize: 18, color: ds.ink, fontFamily: family.bodyBold },
  rule: { flex: 1, height: 1, backgroundColor: ds.borderSoft },
  or: { fontSize: 14, color: ds.ink3, fontFamily: family.bodyMedium },
  link: { fontSize: 15, color: ds.accent, fontFamily: family.bodySemi },
  fine: { fontSize: 13, lineHeight: 18, color: ds.ink3, fontFamily: family.body, textAlign: "center", marginTop: "auto", paddingHorizontal: 12 },
});
