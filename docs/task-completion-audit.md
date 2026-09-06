# SNOWD task audit — September 5, 2026

## September 6 deployment follow-up

The code changes below are now deployed to **https://www.snowd.ca** (Vercel deployment `dpl_CU5T4g8hKgs4vZG3BZR7Vf9r2uC7`). The production build and TypeScript pass.

- Configured Firebase Admin credentials as a Vercel production secret. The local credential is outside the repository with owner-only permissions.
- Configured separate live Stripe payment and Connect event destinations and signing secrets. The live Stripe platform account reports charges and payouts enabled.
- Published Firestore rules through the Rules API and verified the deployed source exactly matches `firestore.rules` (ruleset `9db27d55-8a35-46e6-9a40-474cf1495bbf`).
- Added the existing Google Maps public key to production.
- Backed up and removed one stale sandbox Connect link from an operator profile so it can start live onboarding. Cash eligibility is unchanged. There are currently no completed live connected accounts; operators must complete their own identity/bank onboarding before accepting card payments.
- Fixed a production-only Firebase Admin dependency failure with a scoped `jwks-rsa` → `jose@5.10.0` override. The initial deployment exposed this failure; the replacement deployment above resolves it.
- Real Stripe sandbox API checks passed for account readiness, embedded onboarding sessions, authorization, 15% commission, capture, cancellation, signed webhook handling, ownership rejection, retry and transaction reconciliation. Firebase Auth and database writes were isolated to emulators. No real money moved.
- Production HTTP checks passed for landing, login, signup, onboarding, dashboard, messages and discovery routes. Both signed webhook configurations return HTTP 200; invalid signatures return HTTP 400. Test-account login and authenticated production API access verified Firebase token verification and a read-only Firestore lookup.

Remaining verification limits: Mapbox still needs its optional token/account configuration; Google is the configured address provider. Real operator onboarding, real card charges and bank payouts require the operator's participation and were not performed. The browser connection became unavailable during this follow-up, so production visual checks and live Google autocomplete were not repeated; earlier local visual/autocomplete checks are recorded below. The old Firebase console tab may still show a staged draft, but the same source has already been deployed and verified through the API.

The original audit below records the state before this follow-up; its deployment/credential blockers are superseded by the results above.

Reviewed the available SNOWD task history from August 27 through September 5, including the interrupted September 5 audit. No archived tasks were returned. Several tasks ended on usage limits with changes already present in the shared checkout; completion was assessed against the code and verification evidence rather than task status.

## Requests and current status

| Request / task | Evidence and status |
| --- | --- |
| Simplify interactive landing page; improve the driveway animation and headline | Implemented. “Love winter. Skip the shoveling.”, clearing/reset interaction, customer/operator explanations, and expandable FAQs are present. Browser checked clear-to-completion, reset, earning toggle, and 390 px layout. |
| Simplify signup onboarding | Implemented. Three steps, address autofill, editable service prices, recovery drafts, original mascot retained per the later correction. Earlier component-harness tests covered both roles and Google autocomplete; details in `onboarding.md`. Live Google account creation and profile saves were not repeated in this audit. |
| Align sign-in page theme; fit auth on one screen | Implemented. Fixed a remaining 320 × 568 login overflow, associated input labels, connected password recovery, and made the persistence checkbox control Firebase persistence. Signup also fits 320 × 568. Reset validation was checked without sending an email. Extremely short landscape viewports/virtual keyboards may still require scrolling to preserve access to all controls. |
| Apply auth theme app-wide | Shared navy outlines, icy surfaces, orange accents and component styling are present across dashboard, operator, admin, standalone and modal files. Browser checked client/operator dashboards, chat, calendar, settings, public operator profile and landing/auth pages. Admin and every possible populated state were not exhaustively browser-tested. |
| Improve responsive website UX | Shared navigation, active routes, accessible dialog focus and responsive layouts are present. Fixed overlapping location/tutorial prompts, remembered location dismissal for the session, moved the support button clear of the mobile composer, and bounded the checkout dialog to the viewport. |
| Improve messaging interface | Compact work-order bar and fixed desktop details, mobile composer above navigation, inbox search with distinct no-match state, and ETA/payment-request confirmation are present. Read-only browser checks exercised the existing test conversation; no messages were sent during this audit. |
| Add operator service areas and pay | Verified test operator appears in discovery with “Cash jobs only · 30 km service area”; profile shows the radius. ID verification permits cash work without Stripe. Embedded Stripe onboarding and repeated setup prompts are implemented. Live Stripe completion is blocked by environment configuration below. |
| Fix payments and messaging | Chat/rule access and cash/card restrictions pass emulator tests. Added server payment reconciliation, signed payment webhook handling, cancellation of holds, retry of released authorizations, photo-proof checks before capture, and protection of card payment fields/transaction records from browser writes. Full live payment lifecycle still needs configured services. |
| Run the app | Local preview at http://localhost:3000. |
| Commit and push | Consolidated source changes are saved on `codex/complete-snowd-tasks`; production deployment remains separate because live payment prerequisites are incomplete. See Git for final branch/commit. |

## Verification performed in this audit

- Production build and TypeScript pass. Final preview uses the production build on port 3000.
- ESLint: zero errors; 40 existing warnings (unused symbols, image optimization and hook dependencies).
- 19 regression tests pass, including the Firestore emulator suite. `npm test` runs 18 without the emulator and explicitly skips the rules test when no emulator host is provided.
- Emulator checks include verified cash jobs, rejection of unverified/card-ineligible bookings, chat participant read/write access, marking a message read, outsider rejection, protected Stripe profile fields and protected card payment data.
- Payment tests use mocked Stripe/Admin SDK boundaries. No card charges, bank-account changes, or messages to other users were performed.
- Mobile screenshots are local in `.codex-artifacts/audit/`; they are excluded from Git because authenticated screenshots can contain account data.

## Not complete / requires deployment configuration

1. **Firebase Admin credentials.** The local server reports `Could not load the default credentials` on `/api/stripe/account-status`. Configure `FIREBASE_SERVICE_ACCOUNT_JSON` through the deployment secret store, or a supported Application Default Credentials identity for the correct Firebase project. Do not commit credentials. The browser's public Firebase configuration does not supply server credentials.
2. **Stripe webhooks.** `STRIPE_CONNECT_WEBHOOK_SECRET` is absent locally. Configure a signed destination for `/api/stripe/webhook` and the required events listed in `payments.md`. Verify Connect activation, embedded onboarding, a test authorization/capture/cancel cycle and payout readiness after credentials are installed.
3. **Deploy the updated app and Firestore rules together.** Local emulator success does not mean the production rules have been deployed. No production deployment was performed by this audit.
4. **Mapbox fallback.** `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` is absent. Google autocomplete is available; Mapbox needs its token and permanent geocoding account configuration before live testing.

These prerequisites prevent an honest claim that every live workflow is complete, even when local code checks pass.
