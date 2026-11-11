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

# Public client keys are set as environment variables on the Xcode Cloud workflow,
# never committed: this repository is public.
: > "$APP_DIR/.env"
for name in EXPO_PUBLIC_API_URL EXPO_PUBLIC_FIREBASE_API_KEY EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN \
  EXPO_PUBLIC_FIREBASE_PROJECT_ID EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID \
  EXPO_PUBLIC_FIREBASE_APP_ID EXPO_PUBLIC_GOOGLE_MAPS_API_KEY EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY \
  EXPO_PUBLIC_APPLE_PAY_MERCHANT_ID; do
  value=$(printenv "$name" || true)
  if [ -n "$value" ]; then echo "$name=$value" >> "$APP_DIR/.env"; fi
done
echo "EXPO_PUBLIC_APPLE_SIGN_IN=on" >> "$APP_DIR/.env"
if ! grep -q '^EXPO_PUBLIC_FIREBASE_API_KEY=' "$APP_DIR/.env"; then
  echo "error: EXPO_PUBLIC_FIREBASE_API_KEY is not set on the Xcode Cloud workflow. See native/RELEASE.md." >&2
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
