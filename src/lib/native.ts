import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export const isNativeApp = () => typeof window !== "undefined" && Capacitor.isNativePlatform();
export const nativePlatform = () => Capacitor.getPlatform();
type Listener = Promise<PluginListenerHandle>;
// These small bridge contracts keep native-only SDKs out of the web dependency tree.
export const NativeApp = registerPlugin<{
  addListener(event: "backButton", callback: (event: { canGoBack: boolean }) => void): Listener;
  addListener(event: "appUrlOpen", callback: (event: { url: string }) => void): Listener;
  exitApp(): Promise<void>;
  getLaunchUrl(): Promise<{ url?: string } | undefined>;
}>("App");
export const NativeNetwork = registerPlugin<{
  getStatus(): Promise<{ connected: boolean }>;
  addListener(event: "networkStatusChange", callback: (event: { connected: boolean }) => void): Listener;
}>("Network");
export const NativeBrowser = registerPlugin<{ open(options: { url: string }): Promise<void>; close(): Promise<void> }>("Browser");
export const NativePreferences = registerPlugin<{
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
}>("Preferences");
export const NativeHaptics = registerPlugin<{ impact(options: { style: "LIGHT" }): Promise<void> }>("Haptics");
export const NativeLocation = registerPlugin<{
  getCurrentPosition(options: { enableHighAccuracy: boolean; timeout: number; maximumAge: number }): Promise<{ coords: { latitude: number; longitude: number; accuracy: number } }>;
}>("Geolocation");
export type NativeCredential = { idToken?: string; accessToken?: string; nonce?: string; authorizationCode?: string };
export const NativeAuth = registerPlugin<{
  signInWithGoogle(options: { skipNativeAuth: boolean }): Promise<{ credential: NativeCredential }>;
  signInWithApple(options: { skipNativeAuth: boolean }): Promise<{ credential: NativeCredential }>;
  signOut(): Promise<void>;
  revokeAccessToken(options: { token: string }): Promise<void>;
}>("FirebaseAuthentication");
export const NativeStripe = registerPlugin<{
  initialize(options: { publishableKey: string; stripeAccount?: string }): Promise<void>;
  createPaymentSheet(options: {
    paymentIntentClientSecret: string; merchantDisplayName: string;
    enableApplePay: boolean; applePayMerchantId?: string;
    enableGooglePay: boolean; GooglePayIsTesting: boolean; countryCode: string;
    returnURL: string;
  }): Promise<void>;
  presentPaymentSheet(): Promise<{ paymentResult: string }>;
  handleURLCallback(options: { url: string }): Promise<void>;
}>("Stripe");

export async function nativeSignIn(provider: "google" | "apple") {
  const { auth } = await import("@/lib/firebase");
  const { GoogleAuthProvider, OAuthProvider, signInWithCredential } = await import("firebase/auth");
  const result = provider === "apple"
    ? await NativeAuth.signInWithApple({ skipNativeAuth: true })
    : await NativeAuth.signInWithGoogle({ skipNativeAuth: true });
  if (!result.credential?.idToken) throw new Error("Sign-in did not finish. Please try again.");
  const credential = provider === "apple"
    ? new OAuthProvider("apple.com").credential({ idToken: result.credential.idToken, rawNonce: result.credential.nonce })
    : GoogleAuthProvider.credential(result.credential.idToken, result.credential.accessToken);
  return signInWithCredential(auth, credential);
}

export async function currentJourneyPosition() {
  if (isNativeApp()) return NativeLocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  if (!navigator.geolocation) throw new Error("Location sharing is not supported on this device.");
  return new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, {
    enableHighAccuracy: true, timeout: 12000, maximumAge: 30000,
  }));
}

/** Firebase's native Apple flow needs a native session to revoke an authorization
 * code. Reauthenticate the web identity too, and reject a different Apple user.
 * Never return or persist the authorization code outside this operation.
 */
export async function revokeNativeAppleForDeletion() {
  const { auth } = await import("@/lib/firebase");
  const { OAuthProvider, reauthenticateWithCredential } = await import("firebase/auth");
  if (!isNativeApp() || nativePlatform() !== "ios" || !auth.currentUser) throw new Error("Open SNOWD on your iPhone to confirm your Apple account.");
  try {
    const result = await NativeAuth.signInWithApple({ skipNativeAuth: false });
    if (!result.credential?.idToken || !result.credential.authorizationCode) throw new Error("Apple confirmation did not finish. Please try again.");
    await reauthenticateWithCredential(auth.currentUser, new OAuthProvider("apple.com").credential({ idToken: result.credential.idToken, rawNonce: result.credential.nonce }));
    await NativeAuth.revokeAccessToken({ token: result.credential.authorizationCode });
  } finally { await NativeAuth.signOut().catch(() => {}); }
}
