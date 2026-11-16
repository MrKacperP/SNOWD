# Sign-in rollout

Both `/login` and `/signup` use the same minimal screen. Canadian/US ten-digit phone numbers default to +1; international numbers need a country code. SMS verification signs in or creates a Firebase user. Existing email/password accounts continue through the same input. Google and Apple work for both sign-in and signup.

## Provider configuration before release

- Firebase Authentication: enable Phone, configure allowed SMS regions and SMS billing/quota, and add production domains to Authorized domains. Use Firebase fictional test numbers during testing. SMS is implemented; WhatsApp is not.
- Firebase Authentication: enable Apple. Configure its Apple Services ID, Team ID, Key ID, and private key. In Apple Developer, associate the Services ID with the Sign in with Apple-enabled app and register the Firebase auth return URL `https://<auth-domain>/__/auth/handler`. Match the domain configured in `src/lib/firebase.ts`.
- Google and Email/Password must remain enabled for existing users.
- Server: the Firebase Admin identity must have Firestore access and custom-token signing permission (service account private key or IAM signBlob). Do not put credentials in client environment variables.
- Optionally enable Firestore TTL on `webSignInSessions.deleteAfter` to remove expired sessions. Expiration is enforced by the server independently of TTL. This collection has no client rules; keep it server-only.

## QR sign-in

Web: choose **Log in with QR code**. Native app: **Profile → Scan to sign in**. The app scans, displays an approval screen, and sends the authenticated user's ID token to the fixed SNOWD API origin. Scanned data cannot select a server URL. The code expires in two minutes. A separate HttpOnly, SameSite=Strict browser secret is required to redeem it, and an atomic transaction prevents replay. The QR itself never contains an ID token or custom token. Do not log request bodies or QR payloads.

Deploy the web API and ship the updated native app together. Existing users must update the app to see the scanner. Camera dependency and permission configuration already exist in the native project.

## Release verification

- Phone: fictional number/code succeeds, wrong code fails, resend waits one minute; verify a real SMS on an authorized staging/production domain.
- Google and Apple: complete real provider consent, including Apple Hide My Email; check existing account and new-user onboarding.
- Existing email/password login and password reset still work.
- QR: approve using a signed-in phone, confirm same account in browser, cancel on phone, let code expire, and attempt replay. A second browser without the cookie must not redeem the code.
- Provider credentials and live SMS/OAuth/device approval were not exercised by local automated tests.
