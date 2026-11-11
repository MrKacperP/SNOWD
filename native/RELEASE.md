# Releasing the native app

## TestFlight through Xcode Cloud (current setup)

Every push to `main` builds the app in Xcode Cloud and sends it to TestFlight. Phones with TestFlight's Automatic Updates turned on install it by themselves.

- Project: `native/ios/SNOWD.xcworkspace`, scheme `SNOWD`. `native/ios` is committed for this; regenerate it with `npx expo prebuild --platform ios` after changing `app.json` or adding native packages, then commit the result.
- `native/ios/ci_scripts/ci_post_clone.sh` installs Node and CocoaPods, runs `npm ci` and `pod install`, writes `native/.env` from the workflow's environment variables, and sets the build number to Xcode Cloud's build number.
- The app's public keys come from https://www.snowd.ca/api/app-config, which serves the same `NEXT_PUBLIC_*` values the website already sends to browsers. To override one, set it as an environment variable on the workflow (mark it Secret). Names:
  `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`, `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `EXPO_PUBLIC_FIREBASE_APP_ID`, `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`, `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` (and `EXPO_PUBLIC_APPLE_PAY_MERCHANT_ID` once Apple Pay is set up).
- Don't keep `IOS_BUNDLE_ID=ca.snowd.devtest` in your local `.env` when you run `expo prebuild`, or the committed project changes to the test app ID.
- The old Capacitor app in `mobile/` uses the same App Store ID. Never point Xcode Cloud back at it, or TestFlight would replace this app with the old one.

## Expo Application Services (optional)

The rest of this page describes EAS, which adds instant over-the-air updates. It needs an Expo account.

The app ships through Expo Application Services (EAS). There are two kinds of release:

| What changed | How it reaches phones | Store review |
| --- | --- | --- |
| Screens, styles, text, logic in `native/src` or `src/lib` | **Update**: published automatically when it lands on `main` | No |
| Packages with native code, `app.json` plugins or permissions, the app version | **Store build**: Actions tab → *Native release* → *Run workflow* | Yes |

Updates only reach phones running a store build with the same app version (`expo.version` in `app.json`, the runtime version). After a store build with a new version, earlier updates stop applying to it, which is intended.

## One-time setup

Run these from `native/`:

1. Sign in to Expo: `npx eas-cli@latest login`
2. Link this folder to an Expo project. This writes the project ID into `app.json`: `npx eas-cli@latest init`
3. Turn on updates. This writes `updates.url` into `app.json`: `npx eas-cli@latest update:configure`
4. Copy the public app keys to EAS for cloud builds and updates. Copy only the `EXPO_PUBLIC_*` lines: the local `.env` also sets `IOS_BUNDLE_ID=ca.snowd.devtest` for test installs, which must not reach store builds.
   ```bash
   grep '^EXPO_PUBLIC_' .env > .env.eas
   npx eas-cli@latest env:push production --path .env.eas
   npx eas-cli@latest env:push preview --path .env.eas
   rm .env.eas
   ```
5. Make the first iOS store build interactively, so EAS can create or reuse your Apple certificates:
   `npx eas-cli@latest build --platform ios --profile production`
   then `npx eas-cli@latest submit --platform ios --latest`
6. Create a token at expo.dev → Account settings → Access tokens. Add it to GitHub → Settings → Secrets and variables → Actions as `EXPO_TOKEN`.
7. Commit the `app.json` changes from steps 2–3.

From then on, pushes to `main` publish updates, and store builds run from the Actions tab.

## Profiles (`eas.json`)

- `development`: a dev client for internal testing; uses the `development` channel.
- `preview`: an internal build for testers on the `preview` channel. Send it an update with
  `npx eas-cli@latest update --channel preview --environment preview`
- `production`: the App Store / Play Store build on the `production` channel. Build numbers are kept by EAS and go up automatically.

Every cloud build turns on Sign in with Apple (`EXPO_PUBLIC_APPLE_SIGN_IN=on`). The App Store requires it whenever Google sign-in is offered.

## Notes

- App Store Connect app: `6832668029` (`ca.snowd.app`), the same record as the old Capacitor app, so this build replaces it.
- `ios/` and `android/` are generated during each build and are not committed.
- Never set `EXPO_PUBLIC_USE_FIREBASE_EMULATORS` in an EAS environment. It is for local testing only, and release builds ignore it anyway.
