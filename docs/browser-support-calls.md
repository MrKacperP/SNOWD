# Browser support calls

Clients and operators can open the support menu, choose **Call Support · Phone or Browser**, and select **Call in browser**. Phone calling remains available. The browser asks for microphone access; camera and screen sharing start only when the caller selects them after the admin answers.

Incoming calls appear on every admin page with the caller's name, Answer, and Decline. A ringtone plays when browser audio policy allows it; **Enable ringtone sound** unlocks sound when needed. Only one staff member can answer each call. The admin sends audio only. The call panel persists across navigation and can be minimized. A page error boundary keeps the call provider and its media alive if the page being troubleshot throws. During local verification, a Firestore SDK assertion occurred in page subscriptions; the boundary contains that page failure, rather than repairing the underlying SDK issue.

During screen sharing, callers can confirm that they selected the current SNOWD tab and enable pointer guidance. Admin movement and clicks on the screen video send normalized coordinates over the WebRTC data channel. The caller sees a temporary support cursor and click marker. Clicks never invoke DOM buttons, submit forms, or change account data. Sharing a window or monitor supports viewing, but pointer guidance requires sharing the current tab. The picker prioritizes the current tab and requests that in-call source switching be disabled, so pointer coordinates stay tied to the selected page. Camera and screen sharing can be stopped independently, including through the browser's stop-sharing control.

## Hosting

- HTTPS is required, except on localhost. Screen sharing availability depends on browser/device; unsupported browsers show a fallback message.
- The server uses the existing Firebase Admin credentials. Signaling and call locks are server-only Firestore collections (`supportCalls`, `supportCallLocks`); the existing default-deny client rules apply. No new Firestore composite indexes or rule deployment is needed.
- Configure `SUPPORT_TURN_URLS` (comma-separated TURN/TURNS URLs) and `SUPPORT_TURN_SECRET` (the relay's shared authentication secret) for reliable calls across restrictive networks. The authenticated configuration endpoint issues two-hour HMAC-SHA1 TURN credentials compatible with coturn's REST authentication. Without these variables the app uses STUN and direct peer connections, which will not connect on every network. No relay service is provisioned by this change.
- Ringing expires after two minutes. Active participants refresh the call lease; failed/disconnected connections and signaling outages clean up local media. Hangup removes SDP from the call record. Expired call records can be periodically deleted as housekeeping; video, screen content, and pointer messages are not stored by the application.
- Calls require an admin page to remain open. This does not provide background push calling when the admin browser is closed.

## Verification

TypeScript and ESLint can check the new files. For the integration suite, run the app with Firebase emulators and a separate build directory:

```sh
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 SNOWD_BUILD_DIR=.next-workorders/support-review npm run dev -- --port 3011
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 node scripts/verify-support-calls.mjs
```

Set `SNOWD_PLAYWRIGHT_PATH` to a local Playwright module entry point to also run the two-browser test with installed Google Chrome. It uses real WebRTC and synthetic microphone/camera devices. Set `SNOWD_REAL_SCREEN=true` to exercise native capture of the actual SNOWD tab using Chrome’s automatic test selection; otherwise a generated canvas is used as the screen source. External TURN connectivity and physical device audio/video quality require a separate deployed-device test. The test creates and deletes only emulator users and call records. It covers authentication, disabled accounts, isolation between callers, competing answers, expiration, heartbeat authorization, both client and operator calls, received audio in both directions, permission denial and recovery, mute during microphone permission, caller-only camera requests, camera/screen transport, exact pointer coordinates and consent, mobile navigation, browser stop-sharing, restarting sharing, decline, hangup, late device grants, and signaling outages.
