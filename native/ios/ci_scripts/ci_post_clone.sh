#!/bin/sh
# Xcode Cloud runs this after cloning, before it builds native/ios/SNOWD.xcworkspace.
# It installs the JavaScript and CocoaPods dependencies, writes the app's public keys
# from the workflow's environment variables, and sets the build number.
set -e

export HOMEBREW_NO_AUTO_UPDATE=1
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

APP_DIR="$CI_PRIMARY_REPOSITORY_PATH/native"

brew install node@22 cocoapods
export PATH="$(brew --prefix node@22)/bin:$PATH"
# The "Bundle React Native code" build phase looks for node here.
echo "export NODE_BINARY=$(command -v node)" > "$APP_DIR/ios/.xcode.env.local"

# The app's public client keys. Environment variables on the Xcode Cloud workflow win;
# anything missing comes from the website's /api/app-config, which serves the same
# public values the website already sends to browsers. Nothing is committed: this repository is public.
: > "$APP_DIR/.env"
CONFIG=""
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  CONFIG=$(curl -fsS https://www.snowd.ca/api/app-config || true)
  # A push deploys the website at the same moment this build starts, so wait for the new route.
  if echo "$CONFIG" | grep -q EXPO_PUBLIC_FIREBASE_API_KEY; then break; fi
  CONFIG=""
  sleep 30
done
for name in EXPO_PUBLIC_API_URL EXPO_PUBLIC_FIREBASE_API_KEY EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN \
  EXPO_PUBLIC_FIREBASE_PROJECT_ID EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID \
  EXPO_PUBLIC_FIREBASE_APP_ID EXPO_PUBLIC_GOOGLE_MAPS_API_KEY EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY \
  EXPO_PUBLIC_APPLE_PAY_MERCHANT_ID; do
  value=$(printenv "$name" || true)
  if [ -z "$value" ] && [ -n "$CONFIG" ]; then
    value=$(echo "$CONFIG" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.parse(s)[process.argv[1]]||""))' "$name")
  fi
  if [ -n "$value" ]; then echo "$name=$value" >> "$APP_DIR/.env"; fi
done
echo "EXPO_PUBLIC_APPLE_SIGN_IN=on" >> "$APP_DIR/.env"
if ! grep -q '^EXPO_PUBLIC_FIREBASE_API_KEY=' "$APP_DIR/.env"; then
  echo "error: no app keys: set them on the Xcode Cloud workflow, or check https://www.snowd.ca/api/app-config. See native/RELEASE.md." >&2
  exit 1
fi

cd "$APP_DIR"
npm ci
cd ios
pod install

# Each Xcode Cloud build gets its own number, so every upload to TestFlight is accepted.
if [ -n "$CI_BUILD_NUMBER" ]; then
  /usr/libexec/PlistBuddy -c "Set :CFBundleVersion $CI_BUILD_NUMBER" SNOWD/Info.plist
fi
