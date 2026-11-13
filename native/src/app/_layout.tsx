import { InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold, InstrumentSans_700Bold, useFonts as useInstrumentSans } from "@expo-google-fonts/instrument-sans";
import { SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold, useFonts as useSpaceGrotesk } from "@expo-google-fonts/space-grotesk";
import { StripeProvider } from "@stripe/stripe-react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { InAppBanner } from "~/components/InAppBanner";
import { Loading } from "~/components/ui";
import { AuthProvider, useAuth } from "~/context/auth";
import { AppearanceProvider } from "~/lib/appearance";
import { LiveLocationProvider } from "~/lib/liveLocation";
import { useHeartbeat } from "~/lib/presence";
import { useChats } from "~/lib/data";
import { useNotifications } from "~/lib/notifications";
import { useBadge, usePushNotifications } from "~/lib/push";
import { colors } from "~/lib/theme";

// Account screens open on top of the tabs, like a work order or chat.
const SETTINGS_SCREENS = ["account", "prices", "service-area", "branding", "properties", "property", "payments", "verification", "email", "transactions", "clients", "privacy", "policy", "delete", "appearance"];

/** Phone notifications, the app badge and the in-app banner, for whoever is signed in. */
function Alerts({ uid }: { uid: string }) {
  const { items, unread, markRead } = useNotifications(uid);
  const { chats } = useChats(uid);
  const unreadMessages = chats.reduce((sum, chat) => sum + (chat.unreadCount?.[uid] || 0), 0);
  usePushNotifications(uid, true);
  useHeartbeat(uid);
  useBadge(unread + unreadMessages);
  return <InAppBanner items={items} onOpen={(id) => void markRead(id)} />;
}

function RootNavigator() {
  const { user, profile, loading } = useAuth();
  if (loading) return <Loading message="Clearing the way…" />;
  const signedIn = !!user;
  const ready = signedIn && !!profile?.onboardingComplete;
  return (
    // Left/right padding keeps every screen clear of a status bar on the side of the screen (e.g. iPhone Duo).
    <SafeAreaView edges={["left", "right"]} style={{ flex: 1, backgroundColor: colors.bg }}>
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
          <Stack.Screen name="job/[jobId]" options={{ title: "Work order", headerShown: false }} />
          <Stack.Screen name="operator/[uid]" options={{ title: "", headerTransparent: true }} />
          <Stack.Screen name="person/[uid]" options={{ title: "", headerShown: false }} />
          <Stack.Screen name="invite/[uid]" options={{ title: "", headerShown: false }} />
          <Stack.Screen name="book/[uid]" options={{ title: "Request service", presentation: "modal" }} />
          <Stack.Screen name="notifications" options={{ title: "Updates" }} />
          {SETTINGS_SCREENS.map((name) => (
            <Stack.Screen key={name} name={`settings/${name}`} options={{ title: "" }} />
          ))}
        </Stack.Protected>
      </Stack>
      {ready && user ? <Alerts uid={user.uid} /> : null}
    </SafeAreaView>
  );
}

export default function RootLayout() {
  // The website's typefaces. Until they load (a moment, from the app bundle) text uses the system font.
  useSpaceGrotesk({ SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold });
  useInstrumentSans({ InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold, InstrumentSans_700Bold });
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StripeProvider
        publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""}
        merchantIdentifier={process.env.EXPO_PUBLIC_APPLE_PAY_MERCHANT_ID || "merchant.ca.snowd"}
        urlScheme="snowd"
      >
        <KeyboardProvider>
          <AuthProvider>
            <AppearanceProvider>
              <LiveLocationProvider>
                <StatusBar style="dark" />
                <RootNavigator />
              </LiveLocationProvider>
            </AppearanceProvider>
          </AuthProvider>
        </KeyboardProvider>
      </StripeProvider>
    </GestureHandlerRootView>
  );
}
