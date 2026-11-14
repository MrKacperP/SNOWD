# Native administration

The Expo app has a native admin workspace at `/admin`, reachable from Profile → Open admin dashboard. The entry route also directs administrators there. It uses the existing native controls and server-owned data; it does not embed the web admin page.

## Access

`POST /api/admin/session` activates the owner role only for the Firebase Auth identity with the verified email `kacperprymicz@gmail.com`. It checks the current Auth user, token revocation, profile suspension and deletion tombstones. A profile email or a client-side email comparison cannot authorize an API request. Existing active administrator profiles can also use the console. Activation occurs when the owner opens the dashboard after this backend is deployed; no production role was changed during implementation.

## Available workflows

- Pending identity reviews: see the submitted ID, approve, or reject with a reason. The decision, user notification and audit entry are atomic.
- Work orders: browse/search loaded records, inspect service and payment state, edit instructions/notes, approve pending jobs using existing eligibility/scheduling checks, cancel live jobs, and retry a failed hold release. Completed orders cannot be cancelled.
- Accounts: create a customer/operator account, edit name/email/phone/bio, suspend/enable, or delete login/profile records. Creating an account does not send email or invent a password: the user uses Forgot password. Deletion retains order/payment history and cannot delete the acting administrator.
- Support: start a conversation from an account, send replies as SNOWD Support, resolve/reopen a conversation. Customers have a native Profile → Contact support screen. Admin replies use retry receipts. Conversations show the latest 100 messages and refresh on demand; the customer screen subscribes live.
- Payments: inspect transaction records and open the linked order to capture a held card payment with photo proof, or refund a captured card payment. Full refunds use the original Stripe account, stable idempotency keys, fee refunds and destination-transfer reversal as appropriate. This is not arbitrary payout or bank-account management.
- Pricing: commission percentage, a fixed transaction fee in CAD, and a percentage discount on SNOWD fees. These apply to **future card bookings**. Discounts preserve the operator's quoted proceeds. Cash and previously agreed prices remain unchanged. This is a global fee discount, not a promotional-code system. Booking creation snapshots the policy and payment creation validates that allocation.
- Audit list: account, job, verification, support, pricing and financial intent records.

Lists load 50 records per page with a Load more action. Search explicitly filters loaded records, not the entire database. Data remains behind server-side administrator authorization.

## Deployment and validation

Deploy the backend before releasing the native bundle: the app needs `/api/admin/session`, `/api/admin/console`, `/api/admin/refund`, and `/api/marketplace-pricing`. Confirm Stripe's configured webhook destinations include `charge.refunded` alongside the existing payment events. Server refund reconciliation supports platform and connected-account events. No live payment, account deletion, or support message was sent during testing.

Verified locally:

- Web production build; web and native TypeScript checks.
- iOS JavaScript/Hermes bundle export (not a signed device build).
- 59 focused tests across admin access, pricing, refunds, operator payments and service locations, using isolated mocks.
- Native lint: no errors, existing warnings. Focused changed web files: no errors, existing unused-variable warnings.
- Full repository suite: 11 unrelated failures (account recovery, missing legacy pricing module, business/logo rendering, chat send fixtures, email/push fixture imports), and 2 skipped emulator tests. Web source lint has 3 existing errors in local review screens and cancellation notices.

Not verified: authenticated admin UI interactions, responsive/large-text rendering, physical-device keyboard and safe-area behavior, Android, production role activation, live Stripe events or real refunds. The iOS simulator refused access with `DEVICE_IN_USE`; the active session was preserved. A bundle export does not prove the dashboard is installed or live.
