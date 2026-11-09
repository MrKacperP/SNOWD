import { StripeProvider } from "@stripe/stripe-react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { AuthProvider, useAuth } from "~/context/auth";
import { Loading } from "~/components/ui";
import { colors } from "~/lib/theme";

// Account screens open on top of the tabs, like a work order or chat.
const SETTINGS_SCREENS = ["account", "prices", "service-area", "branding", "properties", "property", "payments", "verification", "email", "transactions", "clients", "privacy", "policy", "delete"];

function RootNavigator() {
  const { user, profile, loading } = useAuth();
  if (loading) return <Loading />;
  const signedIn = !!user;
  const ready = signedIn && !!profile?.onboardingComplete;
  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: colors.bg }, headerTintColor: colors.accent, headerBackButtonDisplayMode: "minimal" }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !ready}>
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Protected guard={ready}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[chatId]" options={{ title: "" }} />
        <Stack.Screen name="job/[jobId]" options={{ title: "Work order" }} />
        <Stack.Screen name="operator/[uid]" options={{ title: "" , headerTransparent: true }} />
        <Stack.Screen name="book/[uid]" options={{ title: "Request service", presentation: "modal" }} />
        <Stack.Screen name="notifications" options={{ title: "Updates" }} />
        {SETTINGS_SCREENS.map((name) => (
          <Stack.Screen key={name} name={`settings/${name}`} options={{ title: "" }} />
        ))}
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <StripeProvider
      publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""}
      merchantIdentifier={process.env.EXPO_PUBLIC_APPLE_PAY_MERCHANT_ID || "merchant.ca.snowd"}
      urlScheme="snowd"
    >
      <KeyboardProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </AuthProvider>
      </KeyboardProvider>
    </StripeProvider>
  );
}
