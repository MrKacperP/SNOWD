# Mobile review — September 9, 2026

## Changes
- Auth: 44px recovery/remember/sign-in link targets, shrinkable form layout, readable 16px mobile inputs.
- Dashboard: shorter bottom-nav Jobs label with the full accessible label, smaller homeowner shortcut labels, two-column operator shortcuts, single-column property-size choices on small phones.
- Settings: always-visible, labelled portfolio removal controls and wrapping section headings.
- Analytics: wrapping chart toolbar and stacked booking-pattern cards.
- Dialogs: scroll limits for cancellation, deletion, verification, confirmation and chat sheets; long shared-modal titles avoid the close button; QR images fit narrow panels. Shared modals follow visualViewport size and offsets, including resize/scroll events.
- Admin: focus-trapped mobile navigation with Escape dismissal, local calls-table scrolling, full-width small-phone drawers, 44px controls, and natural-height stacked chat/support panels.
- Tutorial: content scrolls within available space below its anchor.

## Verification
- Browser: /, /login, /signup, /photo-upload, /mobile-upload, /junk at 320×568, 390×844, 768×1024. All 18 checks showed no document horizontal overflow. Upload pages were checked in their no-token states.
- Actual shared components mounted in a temporary local review route: long modal at 320px; long confirmation in 667×375 landscape; drawer opening/dismissal; wide table contained in a scrolling card.
- Shared modal after resizing to a 400px-high visible viewport: overlay 400px, panel 368px, content scrollable, final action reachable. This is a resize check, not a physical phone keyboard test.
- Temporary review route removed after verification.
- TypeScript: passed. ESLint changed TSX: no errors, 10 existing image/hook warnings.
- Existing suite: 57 passed, 0 failed, 2 skipped.

## Remaining validation
No authenticated test session was available during this review. Dashboard/admin/onboarding source and shared layouts were reviewed, but populated homeowner/operator/admin screens were not verified end to end in a signed-in browser. Next checks require a test session: booking, schedule, chat keyboard and attachments, profile/settings saves, payment sheets and admin actions. Camera permissions, Google sign-in, payment provider UI, safe areas and keyboard behavior also need real iOS Safari and Android Chrome checks. No real payments, messages or account changes were performed.
