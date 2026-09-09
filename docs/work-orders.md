# Work orders and repeat bookings

Work orders are the primary booking and processing surface. `/dashboard/jobs` serves both roles; `/dashboard/calendar` shows the agenda and ASAP queue, and `/dashboard/log` opens history. Each order has permanent identity and a separate conversation. Cancelled orders never reopen. Request again reviews the current price, property, schedule and payment terms and creates a fresh order; company proposals require customer consent.

## Server contract

- `POST /api/jobs/create`: authenticated client request or operator proposal for a previous customer. Supply a stable `requestId`, `operatorId`, `paymentMethod`, `scheduleMode`, `scheduledDate` (ISO instant for scheduled work), `scheduleTimezone`, `expectedPrice`, and customer cash acknowledgement when applicable. Repeat requests also carry `previousOrderId`; operator proposals carry `clientId`. Returns `jobId`, `chatId`, and `orderNumber`. Retries of the same request return the original identifiers.
- `POST /api/jobs/action`: supply `jobId`, `requestId`, the current `revision`, and `action`. Actions are `accept`, `decline`, `propose-time`, `approve-time`, `decline-time`, `en-route`, `in-progress`, `photo`, and `complete`. Proposal responses carry the exact `proposalId`. Only the designated participant can approve; conflicts and stale responses return 409. Authentication/ownership failures return 401/403.
- Existing cancellation and payment endpoints retain their responsibilities. Card work requires authorization before starting and capture before completion. Cash can remain pending after completion; existing cash receipt/refund endpoints remain available from order actions.

`awaitingResponseFrom` and `scheduleProposal` are independent of job progress and payment. Confirmed appointments remain in place until a reschedule is approved. The operator lock serializes scheduling/start decisions across different orders; accepted future jobs are unlimited but only one may be en route or in progress. Appointment overlap uses `estimatedDuration`; ASAP does not reserve a time slot.

New chats cannot change `jobId`. Messages must match their chat's order. Lifecycle events are server-owned under `jobs/{jobId}/events`. Historical orders without a number display an unambiguous `L-{jobId}` reference.

## Legacy migration and coordinated release

Run `npx tsx scripts/migrate-work-order-chats.ts` for a read-only report. `--apply` freezes mixed conversations as legacy history and creates deterministic dedicated chats for affected orders, including orders whose old chat is missing. Existing messages, receipts, claims, and links are preserved. Untagged messages are never assigned to a guessed order. Rerunning is safe, including after interruption.

Build the production application before cutover, deploy Firestore rules, run the migration, and promote the prepared deployment promptly. Older browser sessions must reload because direct booking/lifecycle writes are intentionally denied by the new rules. Do not roll back to the chat-reuse implementation or old rules after migration; fix forward. Save the dry-run report with the release record.

Automatic recurring visits, weather-triggered work, crew dispatch, new notification channels, and payment policy changes are outside this release. Existing driveway-based pricing is reused and revalidated; this change does not introduce a new quote/pricing system.

## Verification

- `npm test` runs unit and route checks; include `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` to enable security rules tests.
- Build isolated browser QA with `SNOWD_BUILD_DIR=.next-workorders NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true npm run build`.
- Start Firebase Auth/Firestore emulators using `firebase.sandbox.json` and the configured project ID. Start the QA build on port 3004 with the same build-directory setting and `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`.
- Run `scripts/verify-work-orders.mjs` with those emulator variables. It exercises real authenticated endpoints, simultaneous starts, appointment conflicts, proposals, cash consent, cancellation, repeat bookings, and migration dry run/rerun. The script creates emulator-only accounts for subsequent mobile/desktop browser verification.
- `scripts/verify-stripe-sandbox.mjs` covers existing card authorization, capture, cancellation, webhook reconciliation, and receipt behavior using Stripe test keys and local Firebase emulators.
- Run `npx tsc --noEmit`, `npm run lint`, and `npm run build` without the QA environment flag for production validation. Do not set `NEXT_PUBLIC_USE_FIREBASE_EMULATORS` in deployment environments.

## Release verification — September 8, 2026

Released to `https://www.snowd.ca` as Vercel deployment `dpl_5sVp44RF2f5dUhbeZf7KUH2kH9ii`. Firestore rules release uses ruleset `09ff141a-1267-4003-8c18-2955a5909227`. The Firebase CLI's service-enablement prerequisite lacked permission; the same configured credentials successfully deployed through the Firebase Rules API instead.

Production migration verified 47 orders, 50 conversations (including preserved history), two legacy shared histories, zero broken order/chat associations, and zero shared active chat IDs. Existing messages, receipts, and claims were preserved. Unrelated pre-existing admin workspace changes were excluded from the deployed source snapshot.

Validation passed: 53 tests including Firebase security rules; real authenticated emulator workflow integration (including concurrent starts and migration reruns); Stripe test-mode authorization, capture, cancellation, and webhooks; TypeScript and production builds locally and on Vercel. Lint has zero errors; existing warnings remain in legacy components. Browser checks covered operator acceptance/start/photo/completion from the order list, customer mobile company-grouped inbox and order navigation, and the production login/authentication boundary. Existing open browser sessions should reload after cutover.
