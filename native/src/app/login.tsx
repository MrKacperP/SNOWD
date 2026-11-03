import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Field, Icon, Notice } from "~/components/ui";
import { friendlyAuthError, useAuth } from "~/context/auth";
import { colors, radius, space, type } from "~/lib/theme";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_IOS_CLIENT_ID = "119102068229-6fd835k0ef8a72mur4lcbn19rgf5lflc.apps.googleusercontent.com";
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
  const [request, response, promptGoogle] = Google.useIdTokenAuthRequest({ iosClientId: GOOGLE_IOS_CLIENT_ID, androidClientId: GOOGLE_ANDROID_CLIENT_ID });

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

  return (
    <KeyboardAwareScrollView
      bottomOffset={24}
      keyboardShouldPersistTaps="handled"
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xl, paddingHorizontal: space.xl, gap: space.xl }}
    >
      <View style={{ alignItems: "center", gap: space.md }}>
        <Image source={require("../../assets/icon.png")} style={{ width: 76, height: 76, borderRadius: 20 }} />
        <Text style={[type.largeTitle, { textAlign: "center" }]}>{mode === "signin" ? "Welcome back" : "Create your account"}</Text>
        <Text style={[type.callout, { textAlign: "center" }]}>Snow clearing from trusted local shovelers, booked in minutes.</Text>
      </View>

      <View style={{ gap: space.md }}>
        {Platform.OS === "ios" && appleAvailable ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={mode === "signin" ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN : AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={radius.md}
            style={{ height: 52, opacity: busy === "apple" ? 0.5 : 1 }}
            onPress={() => run("apple", signInWithApple)}
          />
        ) : null}
        <Button
          title="Continue with Google"
          variant="secondary"
          loading={busy === "google"}
          disabled={!request || !!busy}
          onPress={() => {
            setError("");
            setBusy("google");
            void promptGoogle();
          }}
        />
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        <Text style={type.caption}>or use email</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      </View>

      <View style={{ gap: space.md }}>
        {mode === "signup" ? <Field label="Full name" value={name} onChangeText={setName} textContentType="name" autoComplete="name" returnKeyType="next" /> : null}
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" returnKeyType="next" />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType={mode === "signup" ? "newPassword" : "password"}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <Notice text={error} />
        <Notice text={notice} tone="green" />
        <Button title={mode === "signin" ? "Sign in" : "Create account"} variant="dark" loading={busy === "email"} disabled={!!busy && busy !== "email"} onPress={submit} />
        {mode === "signin" ? (
          <Button
            title="Forgot password?"
            variant="ghost"
            small
            onPress={() =>
              run("email", async () => {
                if (!email.trim()) throw new Error("Enter your email above, then tap Forgot password.");
                await resetPassword(email);
                setNotice("Check your inbox for a link to reset your password.");
              })
            }
          />
        ) : null}
      </View>

      <Pressable
        onPress={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError("");
        }}
        style={{ marginTop: "auto", flexDirection: "row", justifyContent: "center", gap: 6, padding: space.md }}
      >
        <Text style={type.callout}>{mode === "signin" ? "New to SNOWD?" : "Already have an account?"}</Text>
        <Text style={{ color: colors.accent, fontWeight: "700", fontSize: 15 }}>{mode === "signin" ? "Create an account" : "Sign in"}</Text>
        <Icon name="arrow.right" size={13} color={colors.accent} />
      </Pressable>
    </KeyboardAwareScrollView>
  );
}
