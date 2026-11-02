# SNOWD store release review

Review date: October 28, 2026. Operator name supplied by owner: **snowd**.
Public support contact: **service.mississauga@gmail.com**.

**Not ready to submit.** Native project creation and successful compilation do
not establish review approval, working production authentication, wallet
activation or a complete data-deletion operation. No application was uploaded,
no live payment was made and no website or Firebase rule deployment was performed.

## Implemented

| Area | Behaviour |
| --- | --- |
| Foundation | Existing Next.js screens, Firebase identities, orders, Stripe Connect and server verification reused |
| Native projects | Xcode iOS project and Android Gradle project, branded icons and launch imagery |
| Onboarding | Homeowner/operator selection; concise location/payment explanations; visible Continue action; existing role setup |
| Sign-in | Native Google credential exchange; Sign in with Apple on iOS; existing email login preserved |
| Checkout | Native Stripe PaymentSheet with Apple Pay/Google Pay options; CAD and Canadian merchant country; Connect context; server verification before success |
| Permissions | Purpose strings for foreground location, camera, selected photos and support-call microphone; no background-location entitlement; no launch-time weather permission prompt in native app |
| Navigation | Explicit Android Back parents; dialogs consume Back; allowlisted payment callback; external HTTPS links open in system browser |
| Recovery | Bundled initial-load reconnection page, network banner, payment-interruption guidance |
| Privacy | Public privacy, terms, payments and support screens; native settings access; privacy manifest; native Firebase web analytics/page-visit tracking disabled |
| Deletion | Public recent-login request; 30-day due date; admin review and guarded, retryable personal-data removal; native Apple revocation flow; retained-record review |
| Moderation | Existing reporting retained; native block/unblock screen; Firestore rejects new messages and edits in both directions while blocked |

## Verified locally

- Xcode 27.1: unsigned iOS simulator and iPhone Release builds succeeded with native SDKs.
- Android debug APK and unsigned release AAB compiled successfully (API 36, JDK 21). The SDK licence was accepted with the owner’s explicit approval.
- Android artifacts: `android/app/build/outputs/apk/debug/app-debug.apk` and `android/app/build/outputs/bundle/release/app-release.aab`. `jarsigner -verify` confirms the AAB is unsigned.
- Installed and launched `ca.snowd.app`; welcome screen rendered in iOS 27.1
  simulator against the local development server. Screenshot in
  `../.codex-artifacts/native-review/ios-simulator.png`.
- Next.js production build completed.
- TypeScript check and targeted ESLint passed before final documentation.
- Full suite: **171 passed, zero skipped**, with the Firestore emulator enabled.
- Additional native navigation/callback/deletion tests and the blocking + existing
  Firestore rules tests passed against local emulator projects. These did not
  change production data or deployed rules.
- A separate `ca.snowd.devtest` debug build was signed with the local personal team, installed and launched on a plugged-in iPhone 17 Pro (iOS 27.0.1). The phone loaded the Mac-hosted local site over the LAN; a device screenshot shows the signup screen. The owner trusted the development profile. This test app omits Apple Pay and Sign in with Apple entitlements and uses a temporary local URL. It expires with its provisioning profile and is not the store app.
- Browser review at 390×844 and 320×568: welcome/onboarding fit without horizontal
  overflow; Continue remains visible at the small size.

This is **not** authenticated end-to-end, Apple Pay/Google Pay, signed archive or Android runtime evidence. The iPhone launch proves local rendering only. Native Firebase configuration is still missing; Android authentication initializes at launch and must be configured before runtime testing.
The simulator's initial data migration reported a system warning; the app still
launched and rendered. Its foldable simulator has two display surfaces; the
active 1398×2034 surface was used for the screenshot.

## Must be resolved before submission

1. **Developer identity and signing.** Confirm `snowd` matches the legal entity
   registered with Apple/Google. Register `ca.snowd.app` or select the final ID;
   the local development certificate identifies team `9LS8P5N78V`, now set in Xcode. Capabilities and distribution signing remain unverified. Create the App
   Store Connect and Google Play records. Do not assume a purchased membership
   supplies these settings automatically.
2. **Native Firebase configuration.** Install both platform configuration files,
   iOS reversed-client-ID callback, Android SHA fingerprints, and provider
   settings. Test Google and Apple on real devices, new/existing accounts,
   cancellation, account collision and Apple Hide My Email. Apple relay email
   must deliver SNOWD transactional mail.
3. **Wallet activation.** Register the merchant identifier, Stripe certificate,
   Google Pay production integration and matching public environment value.
   Test direct-charge and destination-charge operators; successful authorization,
   cancellation, 3DS, network loss, capture after proof, refund/release, and wallet
   unavailable fallback. Avoid live charges during QA; use a Stripe sandbox.
4. **Publish app support.** Deploy the reviewed additive website changes and
   Firestore rules, then verify `/api/mobile/version` returns contract 1, all
   policy routes resolve and the current site still behaves normally. None of
   this was deployed in this task. Do not ship the native binary before this.
5. **Deletion operations and Apple token revocation.** Request and administrator fulfilment are implemented and emulator-tested. Assign an accountable support owner, approve retention and the 30-day policy, test native Apple revocation on a real configured device, and demonstrate the full process including external providers and legacy data. No real customer account was deleted.
6. **Existing storage/data access.** Audit private identity-document download
   URLs and field exposure. `storage.rules` currently permits any signed-in
   user to read/write the `completion-photos` prefix and read property photos.
   Tighten ownership/participant access with compatibility tests before release.
   Firebase download URLs behave as bearer links; authorization of a document
   alone does not protect a leaked download URL. This existing website concern
   was identified, not silently migrated in this mobile change.
7. **Moderation operations.** Deploy and verify blocking rules and give support
   a working report/removal/escalation process. Test blocked users across app
   and web, retained job actions and timely handling of reports. App Store
   user-generated-content compliance involves operations as well as buttons.
8. **Android signing and tests.** SDK, JDK and build tools are installed; debug APK and unsigned release AAB compiled. Configure native Firebase, test on a device, and sign the AAB with the correct upload key. The project targets API 36. Confirm the Play
   target-level and testing requirements for the account at submission time.
9. **Full device regression.** Both roles: sign-up → address/service setup →
   verification → discovery → booking → accept → payment → arrival → proof →
   completion → receipt. Include messages, reports, blocking, cancellation,
   account settings/autosave, deletion, logout, permission denial, keyboard,
   offline/resume, external maps, support calls and Stripe operator onboarding.
   Check VoiceOver/TalkBack, increased text size, contrast, portrait/landscape,
   smallest supported iPhone, iPad if offered, and at least one physical Android.
10. **Store disclosures.** Confirm the privacy/terms copy, retention grounds and
    processor inventory against actual operations. Complete Apple privacy labels
    and Google Data safety from the shipped app, SDKs and hosted service. The
    manifest is a starting declaration, not a completed store questionnaire.
    Validate the final archive's privacy report, SDK signatures and required API
    reasons. Decide age rating and age/consent rules for student operators.
11. **Review assets.** Supply real screenshots, app metadata, geographic service
    availability, stable homeowner/operator review credentials and realistic
    review work orders. Keep the backend and test accounts available during
    review. Do not use development screenshots as store assets.

## Data-deletion fulfilment runbook

An administrator opens `/admin/account-deletions` from the notification. The
endpoint requires the server-verified administrator role. The request and due
date are stored server-side; users cannot write another person's request.

For each request, before its due date:

1. Verify the requested UID, linked providers and outstanding orders, payments,
   claims or legal holds. Identify specifically which records must remain and
   why; do not blanket-retain every conversation forever.
2. Verify Sign in with Apple revocation where used. The iOS request flow reauthenticates the Apple identity and calls the Firebase native revocation API; its client-reported completion is not treated as server proof. The administrator must verify revocation before fulfilment. Real-device integration remains unverified; use the provider’s supported revocation process for web-origin requests.
3. Remove login and profile, identity/student documents and personal uploads
   under `verification`, `id-documents`, `transcripts`, `avatars`, `branding`,
   `portfolio`, and `property-photos` for the UID. Handle any alternate legacy
   upload locations. Revoke outstanding download-token access where retained
   records previously pointed at personal files.
4. Review messages, chats, reviews, support chats/calls, notifications, activity
   logs, saved-user lists, account history and backups. Delete or anonymize
   personal content not needed for a documented retention purpose. Preserve
   the other participant's lawful service/financial records. Handle Stripe
   customer/connected-account data according to the account type and outstanding
   balance; do not delete someone else's connected account blindly.
5. Confirm completion to the requester, list any narrowly retained categories
   and retention period, and record completion/evidence in the protected request
   record. Open the request detail page, review all gates, enter the exact UID and retention explanation, then execute the administrator fulfilment action. It freezes the account, revokes sessions, removes scoped uploads and authored personal content, removes login/profile, and records completion. Active jobs, held payments, open claims and staff accounts block the action. Failures leave the account disabled and the operation retryable; resolve the cause before retrying. External Stripe data, backups and alternate legacy paths require the recorded manual review.

**Release blocker:** local emulator tests demonstrate scoped removal and recovery, but not production operations or Apple revocation. Do not publish the policy until the process and its owner are ready.

## Review notes draft

SNOWD connects Canadian homeowners and snow-removal operators for physical
services performed outside the app. It has homeowner and operator workflows.
Payments use Stripe card authorization and native Apple Pay/Google Pay where
available; capture follows completion with photo proof. These are not digital
goods or subscriptions. The app uses the same first-party service as snowd.ca,
with native authentication, payments, location, haptics and device integrations.

Location is optional. Manual addresses are supported; an operator chooses when
to share a foreground journey position for ETA/approximate-area display. No
background location is requested. Photo/camera access supports selected property,
verification and completion images. Microphone access supports user-initiated
support calls. Policies and deletion requests are reachable from App & privacy.

Before pasting these notes into a store submission, attach the tested reviewer
credentials, exact steps for both roles, service region and payment test
instructions. Do not represent unavailable functionality as working.

## Proposed store copy

- Name: **SNOWD**
- Subtitle: **Snow help in your neighbourhood**
- Support: **service.mississauga@gmail.com**
- Privacy URL after deployment: `https://www.snowd.ca/policies/privacy`
- Support URL after deployment: `https://www.snowd.ca/policies/support`
- Account deletion URL after deployment: `https://www.snowd.ca/account/delete`
- Description: Book nearby snow removal or earn helping neighbours. Arrange the
  work, follow your job, message the other participant and review completed work
  in one place. Operators set their services and availability; homeowners review
  the agreed work and price before paying. Availability depends on your area.

## Release check

Copy `release-evidence.example.json` to the ignored `release-evidence.local.json`.
For each field record a dated test/device/configuration result, without passwords
or keys. `npm run check` validates the production URL, configuration-file presence,
recorded evidence and live native-contract endpoint. It deliberately fails while
requirements are unresolved; it is not a substitute for signed archive validation
or the stores' independent review decisions.

## Sources consulted

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/):
  1.2 user content, 2.1 completeness, 3.1.3(e) physical services, 4.2 minimum
  functionality, 4.8 login and 5.1 privacy. A web-derived app is not guaranteed
  acceptance merely because native plugins were added.
- [Apple account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- [Apple complete review information](https://developer.apple.com/help/app-review/before-submitting-for-review/complete-review)
- [Apple privacy manifest data types](https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacycollecteddatatypes/nsprivacycollecteddatatype)
- [Google Play User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311)
- [Google account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111)
- [Stripe mobile PaymentSheet](https://docs.stripe.com/payments/mobile/accept-payment?platform=ios)
- [Capacitor Stripe PaymentSheet](https://docs.rdlabo.dev/projects/capacitor-stripe/docs/payment-sheet)
- [Capacitor Firebase authentication](https://capawesome.io/docs/sdks/capacitor/firebase/authentication/)
- [Capacitor configuration](https://capacitorjs.com/docs/config)

After owner sign-in, Apple Developer showed **Kacper Prymicz (Pending)** and a notice that purchase processing can take up to 48 hours. A signed archive attempt failed because Xcode still recognizes a personal development team, which does not support Apple Pay or Sign in with Apple. No signed archive was produced. Wait for membership activation and refresh Xcode’s account before retrying; do not infer that another purchase is required. Firebase CLI still required sign-in at the time of this check.

Stripe's account connector required reauthentication, so no Stripe dashboard
configuration or live account capability was verified.

## October 29 onboarding update

The native test app now starts with one question per screen, saves answers on the
device, and requests sign-in afterward. New accounts apply the completed answers
after authentication. The layout fills the viewport with bottom progress and
navigation, short transitions, keyboard resizing and disabled iOS scroll bounce.

The signed ca.snowd.devtest build compiled, installed and launched on the connected
iPhone. This build uses the Mac server on port 3100 over the local network.
TypeScript and focused lint passed. Google/native tests passed with one emulator
rule test skipped. Browser review verified separate role, street and city screens;
at 390x844 the surface filled the viewport, had no outer document scrolling, and
kept the footer visible. Physical-device screenshots were black; appearance on the
actual phone awaits an unlocked screen.

Google still needs the native Firebase configuration file and callback setup.
Apple also needs an Apple-enabled provisioning profile; the current temporary
profile lacks that capability. Working provider authentication and production
hosting have not been verified. Generated native configuration was restored to
the production origin after installing the local test binary.

Physical iPhone follow-up: after the owner unlocked the phone, screenshots verified
full-screen role and operator street-address questions, bottom progress/navigation,
matching backgrounds through the safe areas, and no black bars. Removed the local
Next development badge from onboarding. Evidence:
`.codex-artifacts/native-review/iphone-onboarding-verified.png` (repository root).
This visual verification does not establish working Google/Apple authentication.

## October 29 polish and native Google configuration

Replaced the long question sequence with four homeowner questions (role, full
address, services, property size) and five operator questions (role, full address,
services, work radius, equipment). Reused the website mascot/illustrations,
address autocomplete/manual fallback and service radius map. Selection animations,
step transitions and bottom controls respect reduced motion and phone safe areas.

Registered ca.snowd.devtest in the existing Firebase project, downloaded its real
GoogleService-Info.plist, added it to Xcode resources and configured the matching
Google callback URL and scene/application URL handlers. This configuration is for
the test identity only; obtain a matching configuration for ca.snowd.app before a
release build. Google and Apple providers are enabled in Firebase. Apple Developer
membership remains pending, as confirmed by the owner; the temporary signing
profile still lacks Sign in with Apple. No Apple authentication success is claimed.

The signed iPhone test build compiled, installed and launched. Production web
build, TypeScript, focused lint and Google/native tests passed (one emulator-only
rule test skipped). Browser review covered all five operator questions and manual
address validation. Native Google end-to-end success awaits the owner's test.

Google device-test follow-up, October 29: the owner confirmed “no more error!
it works” after testing the newly configured iPhone build. Native Google sign-in
is user-confirmed on the physical phone. This does not establish a fresh-account
onboarding test or Apple sign-in success. Apple Developer membership remains
pending. A physical-device capture also confirms the polished role screen,
mascot, selected operator card, and bottom controls fill the screen correctly.
