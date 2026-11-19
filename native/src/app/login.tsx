import * as AppleAuthentication from "expo-apple-authentication";
import * as Haptics from "expo-haptics";
import * as Google from "expo-auth-session/providers/google";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import Animated, { Easing, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { PENGUIN, WORDMARK } from "~/components/brand";
import { BigButton, ScalePress } from "~/components/kit";
import { Icon, Notice } from "~/components/ui";
import { friendlyAuthError, useAuth } from "~/context/auth";
import { ds, family } from "~/lib/theme";

WebBrowser.maybeCompleteAuthSession();

/** Near-black for the sign-in form's type and buttons: plain and high-contrast. */
const INK = "#0b1117";

const GOOGLE_IOS_CLIENT_ID = "119102068229-6fd835k0ef8a72mur4lcbn19rgf5lflc.apps.googleusercontent.com";
const GOOGLE_IOS_REDIRECT = `com.googleusercontent.apps.${GOOGLE_IOS_CLIENT_ID.replace(".apps.googleusercontent.com", "")}:/oauthredirect`;
/** The full terms and privacy policy, readable before signing in. */
const openPolicy = (name: "terms" | "privacy") => void WebBrowser.openBrowserAsync(`https://www.snowd.ca/policies/${name}`).catch(() => {});
const GOOGLE_ANDROID_CLIENT_ID = "119102068229-rm9gs0ucc7lpac4cfutg2rl76ldhq0p5.apps.googleusercontent.com";

export default function Login() {
  const insets = useSafeAreaInsets();
  const { signInWithEmail, signUpWithEmail, signInWithApple, signInWithGoogleToken, resetPassword } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  // First the welcome screen with its two choices; the form only after one is picked.
  const [stage, setStage] = useState<"welcome" | "form">("welcome");
  // The form asks one thing at a time: the email first, then the password (and a name for new accounts).
  const [step, setStep] = useState<"email" | "details">("email");
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
  const reduce = useReducedMotion();
  const switchMode = (next: "signin" | "signup") => {
    if (next === mode) return;
    void Haptics.selectionAsync();
    setMode(next);
    setError("");
    setNotice("");
  };

  /** Step one: check the email looks right, then ask for the password. */
  const continueWithEmail = () => {
    setNotice("");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return setError("Enter a valid email address.");
    }
    setError("");
    setStep("details");
  };

  const goBack = () => {
    setError("");
    setNotice("");
    if (step === "details") setStep("email");
    else setStage("welcome");
  };

  const { width, height } = useWindowDimensions();
  const cover = Math.hypot(width, height);
  // Where the form's small penguin sits (28 pt below the safe area, 60 pt tall), so the flying one becomes it.
  const landY = insets.top + 58;
  const [fromY, setFromY] = useState(height - 140);
  const [flying, setFlying] = useState(false);
  const fly = useSharedValue(0);
  const veil = useSharedValue(0);
  const circle = useAnimatedStyle(() => ({
    opacity: veil.value,
    transform: [{ translateY: interpolate(fly.value, [0, 1], [fromY, landY]) }, { scale: interpolate(fly.value, [0, 1], [28 / cover, 1]) }],
  }));
  const bird = useAnimatedStyle(() => ({
    opacity: veil.value,
    transform: [{ translateY: interpolate(fly.value, [0, 1], [fromY, landY]) }, { scale: interpolate(fly.value, [0, 0.6, 1], [0.4, 1.1, 0.47]) }, { rotate: `${interpolate(fly.value, [0, 0.5, 1], [0, -8, 0])}deg` }],
  }));

  /** Opens the form. The penguin leaves the button you pressed, rises to the top and its blue fills the page. */
  const begin = (next: "signin" | "signup", buttonY: number) => {
    setMode(next);
    setStep("email");
    setError("");
    setNotice("");
    if (reduce) return setStage("form");
    setFromY(buttonY);
    setFlying(true);
    fly.value = 0;
    veil.value = 1;
    fly.value = withTiming(1, { duration: 650, easing: Easing.inOut(Easing.cubic) });
    setTimeout(() => {
      setStage("form");
      veil.value = withDelay(60, withTiming(0, { duration: 340 }));
      setTimeout(() => setFlying(false), 420);
    }, 650);
  };

  const overlay = flying ? (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.flyCircle, { width: cover * 2, height: cover * 2, borderRadius: cover, left: width / 2 - cover, top: -cover }, circle]} />
      <Animated.View style={[{ position: "absolute", left: width / 2 - 60, top: -64 }, bird]}>
        <Image source={PENGUIN} style={{ width: 120, height: 128 }} contentFit="contain" />
      </Animated.View>
    </View>
  ) : null;

  if (stage === "welcome") {
    return (
      <View style={{ flex: 1 }}>
        <Welcome onPick={begin} />
        {overlay}
      </View>
    );
  }

  const google = (
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
      style={styles.alt}
    >
      {busy === "google" ? (
        <ActivityIndicator color={INK} />
      ) : (
        <>
          <GoogleMark />
          <Text style={styles.altText}>Continue with Google</Text>
        </>
      )}
    </ScalePress>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <KeyboardAwareScrollView
        bottomOffset={step === "details" ? 96 : 24}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16, paddingHorizontal: 20, gap: 18 }}
      >
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={10} onPress={goBack} style={({ pressed }) => [styles.back, pressed && { opacity: 0.5 }]}>
          <Icon name="arrow.left" size={22} color={INK} weight="semibold" />
        </Pressable>

        {step === "email" ? (
          <>
            <Text accessibilityRole="header" style={styles.title}>What’s your email?</Text>
            <PlainInput
              placeholder="Enter email"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (error) setError("");
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={continueWithEmail}
              autoFocus
            />
            <Notice text={error} />
            <ScalePress haptic="light" accessibilityRole="button" onPress={continueWithEmail} style={styles.primary}>
              <Text style={styles.primaryText}>Continue</Text>
            </ScalePress>

            <View style={styles.orRow}>
              <View style={styles.rule} />
              <Text style={styles.or}>or</Text>
              <View style={styles.rule} />
            </View>

            {google}
            {Platform.OS === "ios" && appleAvailable ? (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={10}
                style={{ height: 56, opacity: busy === "apple" ? 0.5 : 1 }}
                onPress={() => run("apple", signInWithApple)}
              />
            ) : null}

            <Text style={styles.fine}>By continuing, you agree to SNOWD’s <Text style={styles.link} accessibilityRole="link" onPress={() => openPolicy("terms")}>terms</Text> and <Text style={styles.link} accessibilityRole="link" onPress={() => openPolicy("privacy")}>privacy policy</Text>. We’ll only use your email to sign you in and send updates about your orders.</Text>
          </>
        ) : (
          <>
            <View style={{ gap: 6 }}>
              <Text accessibilityRole="header" style={styles.title}>{signup ? "Create your account" : "Welcome back"}</Text>
              <Text style={styles.sub} numberOfLines={1}>{email.trim()}</Text>
            </View>
            {signup ? <PlainInput placeholder="Full name" value={name} onChangeText={setName} textContentType="name" autoComplete="name" autoCapitalize="words" returnKeyType="next" autoFocus /> : null}
            <PlainInput
              placeholder={signup ? "Create a password (6+ characters)" : "Enter your password"}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType={signup ? "newPassword" : "password"}
              autoComplete={signup ? "new-password" : "current-password"}
              returnKeyType="go"
              onSubmitEditing={submit}
              autoFocus={!signup}
            />
            {!signup ? (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  run("email", async () => {
                    await resetPassword(email);
                    setNotice("We sent a reset link to your email. Open it to choose a new password.");
                  })
                }
                style={({ pressed }) => [styles.chip, pressed && { backgroundColor: "#e2e2e2" }]}
              >
                <Text style={styles.chipText}>I forgot my password</Text>
              </Pressable>
            ) : null}
            <Notice text={error} />
            <Notice text={notice} tone="green" />
          </>
        )}
      </KeyboardAwareScrollView>

      {step === "details" ? (
        <KeyboardStickyView offset={{ opened: insets.bottom - 8 }}>
          <View style={[styles.bar, { paddingBottom: insets.bottom + 12 }]}>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => switchMode(signup ? "signin" : "signup")} style={{ flex: 1 }}>
              <Text style={styles.switchText}>{signup ? "Have an account? " : "New to SNOWD? "}<Text style={{ color: INK, textDecorationLine: "underline" }}>{signup ? "Sign in" : "Create one"}</Text></Text>
            </Pressable>
            <ScalePress haptic="light" accessibilityRole="button" accessibilityLabel={signup ? "Create account" : "Sign in"} disabled={!!busy} onPress={submit} style={[styles.next, busy && busy !== "email" && { opacity: 0.5 }]}>
              {busy === "email" ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.nextText}>Next</Text>
                  <Icon name="arrow.right" size={16} color="#fff" weight="bold" />
                </>
              )}
            </ScalePress>
          </View>
        </KeyboardStickyView>
      ) : null}
      {overlay}
    </View>
  );
}

/** A plain grey text box with no label: the placeholder says what goes in, and it outlines in black while you type. */
function PlainInput(props: React.ComponentProps<typeof TextInput>) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      placeholderTextColor="#6b6b6b"
      {...props}
      accessibilityLabel={props.accessibilityLabel || props.placeholder}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
      style={[styles.input, focused && styles.inputOn]}
    />
  );
}

/**
 * The first screen anyone sees: the penguin bobbing in the middle, the name and one line, then
 * the two ways in at the bottom. Each button reports where it sits so the penguin can take off from it.
 */
function Welcome({ onPick }: { onPick: (mode: "signin" | "signup", buttonY: number) => void }) {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const bob = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    bob.value = withRepeat(withSequence(withTiming(-10, { duration: 1100, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.sin) })), -1);
  }, [reduce, bob]);
  const bobbing = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value }] }));

  const [actionsY, setActionsY] = useState(0);
  const [centers, setCenters] = useState<[number, number]>([0, 0]);
  const center = (i: 0 | 1) => (y: number, h: number) => setCenters((c) => (i === 0 ? [y + h / 2, c[1]] : [c[0], y + h / 2]));

  return (
    <View style={{ flex: 1, backgroundColor: ds.bg }}>
      <View pointerEvents="none" style={[styles.sky, { height: insets.top + 420 }]} />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 18, paddingTop: insets.top, paddingHorizontal: 32 }}>
        <Animated.View style={bobbing}>
          <Image source={PENGUIN} style={{ width: 168, height: 180 }} contentFit="contain" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
        </Animated.View>
        <View style={{ alignItems: "center", gap: 12 }}>
          <Image accessibilityLabel="SNOWD" source={WORDMARK} style={{ width: 172, height: 35 }} contentFit="contain" />
          <Text accessibilityRole="header" style={styles.tagline}>Book a local shoveler,{"\n"}or get paid to clear snow.</Text>
        </View>
      </View>
      <View onLayout={(e) => setActionsY(e.nativeEvent.layout.y)} style={{ gap: 12, paddingHorizontal: 24, paddingBottom: insets.bottom + 16 }}>
        <View onLayout={(e) => center(0)(e.nativeEvent.layout.y, e.nativeEvent.layout.height)}>
          <BigButton title="Get started" variant="primary" onPress={() => onPick("signup", actionsY + centers[0])} />
        </View>
        <View onLayout={(e) => center(1)(e.nativeEvent.layout.y, e.nativeEvent.layout.height)}>
          <BigButton title="I already have an account" variant="secondary" onPress={() => onPick("signin", actionsY + centers[1])} />
        </View>
        <Text style={[styles.fine, { marginTop: 4, textAlign: "center" }]}>By continuing you agree to SNOWD’s <Text style={styles.link} accessibilityRole="link" onPress={() => openPolicy("terms")}>terms</Text> and <Text style={styles.link} accessibilityRole="link" onPress={() => openPolicy("privacy")}>privacy policy</Text>.</Text>
      </View>
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
  tagline: { fontSize: 20, lineHeight: 27, color: ds.ink2, fontFamily: family.bodySemi, textAlign: "center" },
  back: { width: 44, height: 44, marginLeft: -10, alignItems: "center", justifyContent: "center" },
  flyCircle: { position: "absolute", backgroundColor: ds.accent, backgroundImage: ds.accentGradient },
  sky: { position: "absolute", left: 0, right: 0, top: 0, backgroundImage: `linear-gradient(180deg, #e4ecff 0%, #eef3ff 45%, ${ds.bg} 100%)` },
  title: { fontSize: 28, lineHeight: 34, color: INK, fontFamily: family.heading, letterSpacing: -0.6 },
  sub: { fontSize: 16, lineHeight: 21, color: "#5e5e5e", fontFamily: family.body },
  input: { minHeight: 56, borderRadius: 10, backgroundColor: "#f3f3f3", borderWidth: 2, borderColor: "#f3f3f3", paddingHorizontal: 16, fontSize: 18, color: INK, fontFamily: family.body },
  inputOn: { borderColor: INK, backgroundColor: "#fff" },
  primary: { minHeight: 56, borderRadius: 10, backgroundColor: INK, alignItems: "center", justifyContent: "center" },
  primaryText: { fontSize: 18, color: "#fff", fontFamily: family.bodyBold },
  orRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  rule: { flex: 1, height: 1, backgroundColor: "#e2e2e2" },
  or: { fontSize: 15, color: "#5e5e5e", fontFamily: family.bodyMedium },
  alt: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 56, borderRadius: 10, backgroundColor: "#eeeeee" },
  altText: { fontSize: 17, color: INK, fontFamily: family.bodySemi },
  chip: { alignSelf: "flex-start", minHeight: 40, justifyContent: "center", paddingHorizontal: 16, borderRadius: 999, backgroundColor: "#eeeeee" },
  chipText: { fontSize: 15, color: INK, fontFamily: family.bodySemi },
  bar: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 12, backgroundColor: "#fff" },
  switchText: { fontSize: 15, lineHeight: 20, color: "#5e5e5e", fontFamily: family.body },
  next: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 52, paddingHorizontal: 22, borderRadius: 999, backgroundColor: INK },
  nextText: { fontSize: 17, color: "#fff", fontFamily: family.bodyBold },
  fine: { fontSize: 13, lineHeight: 18, color: "#5e5e5e", fontFamily: family.body, marginTop: "auto" },
  link: { color: "#2350ff", textDecorationLine: "underline" },
});
