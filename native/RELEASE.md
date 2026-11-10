# Releasing the native app

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
