# Mobile redesign review — September 18, 2026

## What was already in place

The app already had customer/operator accounts, discovery and booking, work orders, schedules, messaging, payments, profiles, support and an administrator workspace. Earlier reviews are recorded in `mobile-review.md` and `ux-review.md`. This pass inspected the current implementation rather than treating those older reports as proof that the current screens were finished.

## Completed in this pass

| Area | Result |
| --- | --- |
| Colour and visual hierarchy | Neutral backgrounds, restrained blue primary actions, green success states, quieter borders and shadows, consistent typography and spacing. Orange remains a brand accent. Primary white/blue contrast is 5.98:1; muted text on the pale blue surface is 4.86:1; green success text on its surface is 5.08:1. These are token checks, not a whole-app accessibility certification. |
| Mobile navigation | Five evenly spaced destinations, including More; readable labels, safe-area spacing and a focus-managed account menu. |
| Home and widgets | Clear next visit/current work, less duplicate content, compact shortcuts, meaningful availability control and request context before acceptance. |
| Discovery and booking | Compact provider cards, comparable prices, accessible save/filter controls, review-before-request flow, accurate request success copy and dismissal protection while submitting. |
| Work orders and schedule | Concise list cards, readable status/progress, grouped payment/time facts and clear primary actions. Secondary actions remain visible. |
| Messages | Search and previews with recency, clearer incoming/outgoing messages, in-app feedback instead of native alerts, atomic message/inbox writes, duplicate-send protection and preserved drafts on failure. Fixed the participant-scoped live job query that could leave the conversation status stale. |
| Notifications and success | Accessible dismissible notices, persistent errors, restrained success check animation, reduced-motion support and focus/scroll restoration after closing mobile notifications. |
| Forms and settings | Consistent inputs and tap targets, password visibility control, clearer sections, labelled fields and a styled unsaved-business-profile confirmation. |
| Payments, analytics and support | Shared palette and card styles; payment setup reminder limited to Payments; lighter chart/tooltips and honest support availability copy. |
| Administrator workspace | Consistent controls and surfaces, labelled filters/search/reply fields, wrapping notification content and filters at narrow widths. |
| Recovery | Designed missing-page/dashboard-error states. An unreadable account shows retry guidance instead of being mistaken for a new account needing onboarding. |

## Verification completed

- Production build and TypeScript build checks passed. The final emulator preview build is `.next-mobile-ready`; an additional non-emulator production build passed before the final admin label/wrapping adjustments.
- All **120 tests passed**, including both Firestore-rule suites, with no skipped tests. New regression coverage exercises actual chat-send callbacks and account-recovery rendering.
- Work-order integration checks passed against local Auth/Firestore emulators: pricing, ownership, request idempotency, scheduling overlap, proposals, stale approvals, concurrent start protection, completion proof, cash receipt, cancellation and migration idempotency.
- Source lint: **zero errors, 20 warnings** (existing image optimization, hook dependency and unused-variable warnings). `git diff --check` passed.
- Customer layout sweep: 11 routes at 320, 390, 768 and 1280 CSS pixels, 44 checks with no document horizontal overflow or unnamed fields found by the DOM scan. Operator sweep: eight routes at 320 and 390 pixels, 16 checks with the same result. These sweeps include route shells and are not claims that every possible populated/error state was tested.
- Loaded visual inspection covered home, discovery, work-order detail, schedule, messaging, settings and analytics. Local browser booking/request acceptance was exercised with separate test accounts.
- Browser messaging confirmed the current work-order status, successful text submission, cleared draft only after success, and updated inbox preview. At a 390×400 viewport, the composer remained within the viewport; this approximates reduced available space, not a physical keyboard test.
- Saving customer settings displayed the expected Saved status.
- Notifications were checked for modal semantics, initial focus, Escape dismissal, restored trigger focus and restored body scrolling. Reduced-motion preference was exercised in the browser.
- Administrator screens were reviewed at 320 and 390 pixels; the initial sweep identified and prompted the final label and notification wrapping corrections. The final sweep of 15 routes at both widths (30 checks) found no document horizontal overflow or unnamed fields in the corrected build.

## Not claimed or performed

- No deployment, production account changes, real payments or destructive account deletion.
- Google OAuth, hosted Stripe onboarding/payment submission, real-device camera/microphone permissions, cross-device uploads and physical iOS/Android keyboard/safe-area behaviour require the relevant live service or device checks. Existing integration/component tests do not replace those checks.
- The local emulator occasionally stalled during repeated full-page navigation; retries completed. Account recovery is covered separately. This is not presented as a verified production outage or a fully resolved emulator networking issue.
- The remaining lint warnings are recorded above; they are not build failures.

## Local evidence and preview

Detailed logs, geometry results and screenshots are in `.codex-artifacts/mobile-refresh/` (ignored local evidence). The final local emulator preview runs at `http://127.0.0.1:3013`. Use the seeded `design-review-client@example.test`, `design-review-operator@example.test` or `design-review-admin@example.test` accounts with the local-only password `Emulator-only-42!`. These are emulator fixtures, not production credentials.
