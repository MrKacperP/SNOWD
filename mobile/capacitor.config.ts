import type { CapacitorConfig } from '@capacitor/cli';

// SNOWD relies on server routes and Firebase: it cannot be statically exported.
// Only this first-party HTTPS origin receives the native bridge. Never wildcard
// allowNavigation or enable mixed content for payment/authentication redirects.
const developmentUrl = process.env.SNOWD_NATIVE_DEV_URL;
if (developmentUrl) {
  const url = new URL(developmentUrl);
  const deviceTest = process.env.SNOWD_NATIVE_DEVICE_TEST === '1' && /^10\.(?:\d{1,3}\.){2}\d{1,3}$/.test(url.hostname);
  if (!(["localhost", "127.0.0.1"].includes(url.hostname) || deviceTest) || !["http:", "https:"].includes(url.protocol)) {
    throw new Error("Native development must use localhost or an explicitly enabled private device-test address; release uses the fixed SNOWD HTTPS origin.");
  }
}
const config: CapacitorConfig = {
  appId: 'ca.snowd.app',
  appName: 'SNOWD',
  webDir: 'www',
  server: {
    url: developmentUrl || 'https://www.snowd.ca/mobile',
    errorPath: 'offline.html',
    cleartext: !!developmentUrl,
  },
  ios: { contentInset: 'never', backgroundColor: '#f4f7fa', preferredContentMode: 'mobile' },
  android: { allowMixedContent: false },
  plugins: {
    FirebaseAuthentication: { skipNativeAuth: true, providers: ['google.com', 'apple.com'] },
  },
};
export default config;
