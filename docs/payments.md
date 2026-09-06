# Operator payments

ID-verified, available operators can appear publicly and receive cash jobs without completing Stripe. Connected operators can accept platform payments; the existing commission remains 15%. Stripe readiness and Connect account ownership are server-controlled.

## Configuration

- `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` must use the same mode. Use Stripe test mode for verification.
- Firebase Admin needs `FIREBASE_SERVICE_ACCOUNT_JSON` or Application Default Credentials for the project specified by `NEXT_PUBLIC_FIREBASE_PROJECT_ID`.
- Enable Connect and configure embedded account onboarding in Stripe. `/api/stripe/account-session` returns a short-lived session only to the account's authenticated operator.
- Configure `/api/stripe/webhook` as a signed Stripe event destination. Set its signing secret as `STRIPE_CONNECT_WEBHOOK_SECRET`. Subscribe to `account.updated`, `payment_intent.amount_capturable_updated`, `payment_intent.succeeded`, `payment_intent.canceled`, and `payment_intent.payment_failed`. Account updates must include connected-account events; destination-charge PaymentIntents are platform-account events. For separate event destinations, use `STRIPE_CONNECT_WEBHOOK_SECRET` for connected-account events and `STRIPE_WEBHOOK_SECRET` for platform payment events. The endpoint verifies either configured secret.
- Deploy the Firestore rules with the app. Card payment state and transactions can be written only by the server.

## Payment flow

An accepted job supplies the amount, customer and destination from Firestore. The API checks live Stripe readiness and creates a manual-capture CAD PaymentIntent. A retry resumes an existing checkout; a canceled authorization gets a fresh intent. The browser asks the authenticated status endpoint to reconcile the result. Signed webhooks also reconcile results if the browser closes or a redirect occurs.

The server persists held/paid/released state and one transaction per PaymentIntent. Capture requires job participation and saved photo proof. Cancellation releases an authorization before the UI marks the job canceled; settled payments need a separate support refund process. Reopening a canceled card job requires a new payment before work proceeds.

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
