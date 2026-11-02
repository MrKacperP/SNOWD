# SNOWD mobile

An iOS and Android Capacitor application using the existing SNOWD interface,
Firebase accounts, work orders and Stripe backend. The installed app adds native
Google / Apple authentication, Stripe PaymentSheet, Apple Pay / Google Pay,
foreground location, haptics, external browser handling and offline recovery.

**Current status: iOS simulator/device and Android debug/release builds verified; not ready for store submission.**
See [RELEASE.md](RELEASE.md) for the actual blockers and evidence.

## Open the app

From this directory:

```sh
npm ci
npm run sync
npm run ios
# Or open the android folder in Android Studio:
npm run android
```

Xcode project: `ios/App/App.xcodeproj`. Application identifier: `ca.snowd.app`
(proposed; register it in both developer accounts before release).

The website remains a Next.js server application. This is a hybrid application,
not a SwiftUI/Compose rewrite or a static export. Its first-party HTTPS screens
load from `https://www.snowd.ca/mobile`; only that origin receives the bridge.
New app-specific screens and bridge integration must be deployed before release.
Do not grant native navigation access to Stripe, OAuth or arbitrary domains.
External links open outside the privileged web view. API authorization stays on
the server; a native client is not a trusted user.

The normal website keeps its existing navigation, Google popup, Stripe Elements
and weather behaviour. Native code paths activate only in Capacitor. New public
policy and account-deletion URLs are additive. The new blocking rules apply to
all clients, so an abusive user cannot bypass a native block using the website.

## Local iOS review

Start the website from the repository root with an isolated output directory:

```sh
SNOWD_BUILD_DIR=.next-mobile-native npm run dev -- --port 3100
```

Then, from this directory:

```sh
SNOWD_NATIVE_DEV_URL=http://localhost:3100/mobile npm run sync
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug \
  -sdk iphonesimulator -derivedDataPath /tmp/snowd-native-build \
  CODE_SIGNING_ALLOWED=NO build
```

Use local development only in a simulator. Restore production configuration
afterward with `npm run sync` without the development environment variable.
`npm run check` rejects development origins and incomplete release evidence.
Do not ship a locally served application or any simulator build.

## Configuration

- Register `ca.snowd.app` as an iOS and Android app in the existing Firebase project.
- Download the real iOS `GoogleService-Info.plist` into `ios/App/App/`, add it to
  the Xcode App target, and add its `REVERSED_CLIENT_ID` URL scheme. Keep the
  `snowd` payment-return scheme as well.
- Download Android `google-services.json` into `android/app/`; register the
  correct debug and Play app-signing SHA fingerprints with Firebase/Google.
- Enable Google and Apple providers. Enable Sign in with Apple for the iOS
  identifier, and configure Firebase's Apple provider/private relay as required.
- Set the Xcode development team. Register an Apple merchant ID and use its
  exact value for `SNOWD_APPLE_PAY_MERCHANT_ID` in Xcode and
  `NEXT_PUBLIC_APPLE_PAY_MERCHANT_ID` in the website build. The current
  `merchant.ca.snowd.app` value is a proposed identifier, not a registered merchant.
- Complete Stripe's Apple Pay payment-processing certificate setup and Google
  Pay production requirements. Test supported wallets on real devices. A
  configured wallet is offered only when the device/payment sheet supports it.
- Stripe secrets remain server-side. The mobile app uses the existing public
  key and server-created PaymentIntent and preserves Connect account context.

Native plugin dependencies are in this directory so their React peer dependencies
do not change the website's React version. Run `npm run sync`, not a bare sync,
to preserve the Google-only Firebase Swift package traits (no Facebook integration).

Do not commit signing keys, provisioning profiles, Firebase config downloads,
service-account files or store credentials. Generated native binaries are ignored.

## Current iPhone design review

The October 30 polished review build is installed as `ca.snowd.devtest` on the
owner’s iPhone. It uses the local review server at `http://10.0.0.103:3101/mobile`.
The Mac server must remain running and reachable from the same LAN. This is a
development installation; it is not the public website or an App Store release.
See `../docs/onboarding-illustration-review.md` for verification and gaps.

For an explicitly authorized physical-phone review, `SNOWD_NATIVE_DEVICE_TEST=1`
permits the Mac’s private `10.x.x.x` address during sync. Keep the test bundle ID
separate from production and restore generated configuration with `npm run sync`
after building. The default configuration continues to use the fixed HTTPS URL.
