# Operator payments

ID-verified, available operators can appear publicly and receive cash jobs without completing Stripe. Connected operators can accept platform payments; new card bookings include a 30% marketplace share of the client total. Operator rates are net payout quotes; the client total is the operator quote divided by 0.70, rounded to cents. Cash has no markup. Existing bookings retain their original allocation. Stripe readiness and Connect account ownership are server-controlled.

## Configuration

- `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` must use the same mode. Use Stripe test mode for verification.
- Firebase Admin needs `FIREBASE_SERVICE_ACCOUNT_JSON` or Application Default Credentials for the project specified by `NEXT_PUBLIC_FIREBASE_PROJECT_ID`.
- Enable Connect and configure embedded account onboarding in Stripe. `/api/stripe/account-session` returns a short-lived session only to the account's authenticated operator.
- Configure `/api/stripe/webhook` as a signed Stripe event destination. Set its signing secret as `STRIPE_CONNECT_WEBHOOK_SECRET`. The connected-account destination must subscribe to `account.updated`, `payment_intent.amount_capturable_updated`, `payment_intent.succeeded`, `payment_intent.canceled`, and `payment_intent.payment_failed`: managed-risk accounts create direct charges, so their payment events belong to the connected account. Keep the four payment events on the platform destination for legacy destination charges, using `STRIPE_WEBHOOK_SECRET`. The endpoint verifies either configured secret and retrieves payments in the signed event's account context.
- Deploy the Firestore rules with the app. Card payment state and transactions can be written only by the server.

## Payment flow

An accepted job supplies the amount, customer and destination from Firestore. The API checks live Stripe readiness and creates a manual-capture CAD PaymentIntent. Managed-risk accounts use direct charges; older platform-liable accounts retain destination charges. The server stores `stripePaymentAccountId` on the job, and checkout, capture, cancellation and reconciliation use that saved account even after an operator reconnects. A retry resumes an existing checkout; a canceled authorization gets a fresh intent. The browser asks the authenticated status endpoint to reconcile the result. Signed webhooks also reconcile results if the browser closes or a redirect occurs.

The server persists held/paid/released state and one transaction per PaymentIntent. Capture requires job participation and saved photo proof. Cancellation closes an unfinished job in a server transaction, notifies the other participant, and releases an authorization. Repeating cancellation retries a failed hold release; settled payments need a separate support refund process. Reopening a canceled card job requires a new payment before work proceeds.

Stripe authorization holds expire; a canceled/expired intent is reconciled to `refunded` in the app's existing schema, indicating the hold is released, not that a settled charge was refunded. [Stripe manual-capture documentation](https://docs.stripe.com/payments/place-a-hold-on-a-payment-method).

## Tests

`npm test` runs the payment regressions. To include rules, install a Firebase CLI and compatible Java runtime, then run:

```sh
firebase emulators:exec --only firestore --project demo-snowd-audit 'npm test'
```

Use a demo project to ensure rules tests never write to production. Live authorization, capture, cancellation, webhook delivery and embedded onboarding must be verified in test mode after server credentials and event destinations are configured.

## Stripe sandbox integration verification

`scripts/verify-stripe-sandbox.mjs` exercises real Stripe sandbox APIs through the built Next.js server while both Firebase Auth and Firestore use local emulators. It refuses live Stripe keys and non-local emulator addresses. It requires an existing ready sandbox connected account with an `operatorId` in its metadata.

After `npm run build`, run:

```sh
firebase emulators:exec --only firestore,auth --project snowd-6ca54 --config firebase.sandbox.json 'node scripts/verify-stripe-sandbox.mjs'
```

The project ID matches the public ID embedded in the Next build, but all test users, jobs, and transactions stay in the emulators. The test verifies embedded onboarding session creation, account readiness, ownership rejection, checkout retries, CAD authorization, 15% commission, signed webhook reconciliation, photo-proof enforcement, capture, cancellation, and transaction history. Only sandbox payment records are created; no real funds move. This passed on September 5, 2026.

The `jwks-rsa` dependency is scoped to `jose@5.10.0` through an npm override because Firebase Admin 14 otherwise imports ESM-only jose through CommonJS and fails in the Vercel runtime. The sandbox server runs with `--no-experimental-require-module` to cover this production behavior. See [Firebase Admin issue 3181](https://github.com/firebase/firebase-admin-node/issues/3181). Remove the override after upstream compatibility is fixed and this runtime check passes.

## Nearby booking and cash jobs

Clients see verified, available operators whose service radius covers the client’s saved property. Operators can open Nearby clients from their dashboard or work orders to see the same matches and send one booking invitation per client. Invitations link to that operator’s booking form, which rechecks availability and location before submitting. Job, chat and initial message creation use one atomic batch.

Every new booking offers cash; connected operators also offer card. Cash needs the client’s explicit acknowledgement, stays pending until the assigned operator confirms receipt, and can be completed with photo proof before cash is collected. Cash does not create a Stripe charge, payout or automatic platform commission. Existing card commission behavior is unchanged.

Either participant can cancel pending, accepted, en-route or in-progress work. Completed work cannot be cancelled. Cancellation preserves cash receipts; the operator may record a direct cash refund after cancellation. Captured card payments need support to arrange a refund. Deploy the updated Firestore rules with these routes so cancellation and its notifications remain server-owned.

## Marketplace pricing and live rollout

New server-created bookings persist client `price` in CAD, `operatorAmount` and `platformFeeAmount` in cents, and `pricingVersion: 2`. The Stripe application fee is the saved client total minus the operator payout. SNOWD bears Stripe processing fees. The settings payment page discloses the 30% share; work orders and receipts show the participant’s corresponding amount. Legacy bookings retain their 15% allocation and original client price.

Live deployment still requires the platform’s live Connect activation, live publishable/secret keys, and signed live webhook destinations. Test connected accounts cannot be reused with live keys. Canadian Express onboarding collects each operator’s own legal business type and banking details. Authorization expiry and bank settlement delays still apply.

Platform `charges_enabled` and `payouts_enabled` do not prove Connect account creation is activated. Stripe can still return `account_create_activation_required` while the platform profile says **Onboarding incomplete**. The owner must finish **Confirm your integration choices** in Stripe's setup guide, review the funds flow and liability settings, and accept the Connect Platform Agreement. The app reports this as `503 connect_activation_required`, without replacing the operator's saved account. After activation, verify live onboarding opens, then each operator must complete their own identity and bank verification before accepting cards. Do not mark live payments verified solely because keys are live or tests pass.

On October 16, 2026, the live connected-account webhook was updated to include all four payment events. The platform's keys and ordinary payment capabilities were live, but live connected-account creation was still blocked by incomplete platform onboarding. No live charge or payout was created during verification.

## Recovery when switching from sandbox to live

Production uses live Stripe keys; a sandbox connected-account ID cannot be used with those keys. Payment settings now always resolve the saved account through the authenticated create/resume endpoint before opening embedded onboarding. An inaccessible account (`account_invalid` or `resource_missing`) can be replaced after checking platform activation. The replacement is an Express account associated with the authenticated operator; readiness resets until Stripe verifies the operator's live details. The old ID is retained as `stripePreviousConnectAccountId` for support. Ownership failures, transient API failures and concurrent profile changes do not overwrite the destination. Existing job and payment records remain unchanged.

An operator encountering the previous account-access error should open Settings → Payment and select **Connect with Stripe**, then complete live identity and bank verification. Test identity/bank details do not migrate to live mode. No real card payment is created as a deployment test.

Checkout and payment-settings checks now clear stale readiness when Stripe reports `account_invalid` or `resource_missing`. The account ID is preserved for the authenticated reconnect flow; a transaction prevents a delayed failure from disabling a replacement account. Checkout responds with `409 operator_stripe_reconnect_required` and instructions instead of exposing the raw Stripe credential error. Transient API failures do not disable accounts. Existing checkout intents must also match the current payout destination before they can be resumed.
