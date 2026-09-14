# Whole-app usability review — September 12, 2026

## Method

Browser review of the production build against local Firebase Auth/Firestore emulators, using separate customer, operator and administrator accounts. No production records or real payments are used. Evidence is saved locally under `.codex-artifacts/ux-review/`. Browser observations are distinguished from source checks and external-service limitations below.

Criteria: clear purpose and next action, accurate prices and commitments, recoverable errors, consistent terminology, readable mobile layouts, keyboard access and announced status. References: [W3C user notifications](https://www.w3.org/WAI/tutorials/forms/notifications/), [WCAG status messages](https://www.w3.org/WAI/WCAG21/Understanding/status-messages.html), [Stripe authorization holds](https://docs.stripe.com/payments/place-a-hold-on-a-payment-method).

## Findings and implementation plan

| Priority | Finding | Implementation |
| --- | --- | --- |
| P1 | Booking dialog asks for cash consent without showing the final price, service or address. A refreshed price can silently replace the reviewed price. | Add a review summary, keep the reviewed price in the request, require another review if pricing changes, and explain that acceptance confirms the visit. |
| P1 | Chat writes the message and inbox preview separately; failures are logged only. Retrying can duplicate a message already stored. | Commit message and inbox update atomically, preserve unsent text, show actionable send errors and guard repeated submissions. |
| P1 | Notification preferences are cosmetic switches; reloading resets them. | Replace unsupported settings with accurate information and links to messages, jobs and payment history. |
| P1 | Checkout says Pay for an authorization; users can dismiss while confirmation runs, and intermediate statuses have no explanation. | Use explicit hold language, prevent dismissal during confirmation, announce failures and pending payment states. |
| P2 | Customer availability switch has no clear booking purpose. | Keep availability controls for operators only and explain their impact. |
| P2 | Two unsolicited first-use overlays interrupt task entry. | Use the saved property for weather; offer the tour on demand from account settings rather than opening it automatically. |
| P2 | Browser alerts interrupt photo, copy, cancellation and account flows. | Use accessible, dismissible in-app feedback; use the existing confirmation dialog for account deletion with accurate retention copy. |
| P2 | Job search is restricted to the current filter and defaults to an apparently empty Needs attention view. | Add All jobs, search across jobs by default, show counts matching the search and make filter reset available. |
| P2 | Message inbox lacks recency and gives the same empty message for no chats and no search matches. | Add message timestamps, useful empty states and a clear-search action. |
| P2 | Home job list is a one-time fetch and formats ASAP/international timestamps differently. | Subscribe to the shared work-order source and use the same schedule formatter as job details. |
| P2 | Discovery errors appear as no operators; missing optional bio can break search. | Separate failure and empty states, add retry, tolerate absent profile fields. |
| P2 | Public `/mobile-redesign-temp` presents sample jobs as a working app. | Remove the public prototype route. |
| P2 | Existing work-order verification expects a separate completion call after photo upload, although photo now completes cash work. | Update the stale scenario to verify completion and cash settlement correctly. |

## Scope and verification notes

Public surfaces: landing, demo widget, FAQ, signup/login, onboarding redirect, junk-removal landing, photo transfer and mobile upload. Customer surfaces: home, discovery/filters, booking sheet, request result, jobs/details/history, schedule, chat/inbox, profile/settings, payments, support and notifications. Operator and administrator route inventory is included in local evidence.

The development server reproduced a Firebase SDK watch assertion and indefinite loading; the production build did not. Do not infer a production failure from this development-only observation.

External OAuth, physical camera/microphone permissions, Stripe hosted identity onboarding and live charges require separate service/device verification. The audit will record actual completed checks rather than claiming every external integration was exercised.

## Implemented follow-up findings — September 13

- Fixed the administrator loading indicator: the activity subscription never marked itself loaded. Scheduled and on-the-way jobs now have distinct labels and filters instead of appearing in progress.
- Replaced broken junk-removal landing images with a readable three-step explanation and working contact action; corrected its page title.
- Removed the unsupported support promise “Online · Replies in minutes.” Support now accurately invites a message to the team.
- Added message previews and timestamps to mobile notifications, accessible labels to administrator controls, and keyboard dismissal/focus handling to the optional tour.
- Ordered active jobs before historical records and removed pending-arrival text from completed/cancelled jobs.
- Scoped Tailwind source discovery to application source so generated QA build files cannot introduce malformed CSS.

All implementation items in the findings table above are complete locally. The retired prototype returns a not-found page.

## Completed validation

- Production build passed. TypeScript passed. Changed TypeScript/React files passed ESLint with zero errors and ten existing warnings concerning image optimization and hook dependencies. `git diff --check` passed.
- All 79 tests passed against the Firestore emulator, with no skipped tests. Added coverage for atomic chat writes, checkout duplicate submission/error/intermediate-status handling, and administrator subscription loading/error completion.
- Work-order integration checks passed: identity/ownership, request idempotency, pricing, overlap, time proposals, stale approval, concurrent starts, proof-based completion, cash receipts, cancellation, repeat requests and migration idempotency.
- Stripe test-mode integration checks passed: connected-account readiness, authorization, capture, cancellation, signed webhook handling, ownership, retries and receipt reconciliation. No real charges were made.
- Browser cash journey completed with separate customer and operator accounts: request, accept, on the way, start, upload synthetic proof, complete, confirm cash and receipt. Fresh customer onboarding saved a manually entered property and services.
- Browser messaging verified sent text, suggested replies and attachments menu; support messages reached the administrator and an administrator reply was submitted. Account editing was exercised on a test account.
- Mobile booking and chat were inspected at 390px; chat had no horizontal overflow. The actual Stripe payment sheet rendered its hold amount and dismissible dialog at 390px. The Stripe test-mode floating toolbar covered the submit button in this browser run, so the hosted-form submission is not counted as a completed browser payment; backend test-mode payment integration and checkout component tests passed separately.
- Final administrator browser check confirmed loading finishes and Scheduled jobs appear correctly.

## Release and verification boundaries

Changes are local and have not been deployed. External Google sign-in, real-device camera/microphone and cross-device upload, hosted Stripe identity onboarding, and real-money settlement still require their corresponding service/device checks. Destructive account deletion was not executed. Route review and source inspection do not mean every permission combination, network failure or third-party flow was exercised. The development-only Firebase watch assertion noted above remains outside these usability changes; production-build emulator checks succeeded.

The final mobile tour check passed: opening it from Appearance showed its controls, Escape dismissed it, and keyboard focus returned to “Take a quick app tour.”
