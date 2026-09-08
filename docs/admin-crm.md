# Admin CRM

The admin workspace follows the SNOWD navy, ice-blue, orange, rounded-card theme. Navigation covers accounts, jobs, messages, support, payments, service reports, notifications, analytics, reviews, claims, staff, and audit history.

## Core workflows

- Accounts: open a full account from Accounts or global search. Administrators can edit profile/contact fields and roles, suspend/restore authentication, and delete login/profile records. Self-management uses profile settings. Account deletion retains related job/payment records; deleting another administrator requires changing its role first.
- Jobs and reports: open a job from search, Reports, or an account. Reopen completion uploads, open its conversation and linked accounts/payments, edit service notes/instructions/status, and provide a correction reason. The server atomically saves changes, before/after audit values, and a notification. Paid/completed jobs cannot be deleted; final states and payment-dependent transitions are guarded.
- Messages: the selected customer conversation subscribes to the canonical top-level `messages` collection, filtered by `chatId`. Photos and voice recordings can be reopened. Customer conversations are read-only for staff; staff replies use Support.
- Support: selected threads update live, read status persists, failed replies preserve the draft, and status changes wait for the database. Support unread counts are derived from live message records.
- Notifications: dedicated unread/action/all inbox, header access, record links, persisted read state. Reading a notice does not resolve its associated workflow.
- Reports: payment amounts are stored in cents and displayed as CAD dollars. Collected totals count completed payment records; held payments and released authorizations are excluded. Charts group actual records by UTC date; no invented growth percentages. These are collected payment totals, not estimated platform profit or a substitute for Stripe reconciliation.
- Settings: real password reauthentication/update and links to account/access management. Removed nonfunctional security toggles and bulk destructive placeholders.

## Runtime requirements

Server account/job routes need Firebase Admin credentials (`FIREBASE_SERVICE_ACCOUNT_JSON` or application-default credentials) for the configured Firebase project. Deploy the checked-in Firestore rules along with the app: they enforce staff-role restrictions and disabled accounts, and allow staff access to call records. No production deployment or production data mutation was performed as part of this implementation.

## Validation

`npm run build`, `npm test`, and focused ESLint checks cover compilation and regression checks. `tests/admin-crm.test.mjs` exercises account authorization, Auth/profile synchronization, report audit/notification writes, date grouping, notification routes, and financial record protections using isolated mocks. `tests/admin-rules.test.mjs` exercises actual rules through the Firestore emulator.

The available browser session was signed in as Dev Client and correctly redirected `/admin` to `/dashboard`. Authenticated admin visual and live-service mutation checks require an administrator session; automated tests do not substitute for that final integration check.
