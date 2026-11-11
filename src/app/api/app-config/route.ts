import { NextResponse } from "next/server";

/**
 * The public client settings the native app is built with. Every value here is a
 * NEXT_PUBLIC_ setting the website already sends to every browser, so this exposes
 * nothing new. Xcode Cloud reads it while building the iOS app (native/ios/ci_scripts).
 * Never add server-only secrets here.
 */
export function GET() {
  const config = {
    EXPO_PUBLIC_API_URL: "https://www.snowd.ca",
    EXPO_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    EXPO_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  };
  return NextResponse.json(config, { headers: { "Cache-Control": "public, max-age=300" } });
}
