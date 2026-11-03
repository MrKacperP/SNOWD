import { withEntitlementsPlist, type ConfigPlugin } from "expo/config-plugins";
import type { ConfigContext, ExpoConfig } from "expo/config";

// Sign in with Apple needs a paid Apple Developer Program team. Free (Personal) teams
// can't sign apps with it, so it stays off until EXPO_PUBLIC_APPLE_SIGN_IN=on in .env.
const appleSignIn = process.env.EXPO_PUBLIC_APPLE_SIGN_IN === "on";
// Local test installs reuse the old wrapper's ID (ca.snowd.devtest) so they replace it on the phone.
const bundleIdentifier = process.env.IOS_BUNDLE_ID || "ca.snowd.app";

const withoutAppleSignIn: ConfigPlugin = (config) =>
  withEntitlementsPlist(config, (mod) => {
    delete mod.modResults["com.apple.developer.applesignin"];
    return mod;
  });

export default ({ config }: ConfigContext): ExpoConfig => {
  const expo = { ...(config as ExpoConfig), ios: { ...config.ios, bundleIdentifier, usesAppleSignIn: appleSignIn } };
  return appleSignIn ? expo : withoutAppleSignIn(expo);
};
