import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const check = (condition, message) => { console.log(`${condition ? 'PASS' : 'BLOCKED'}: ${message}`); if (!condition) failures.push(message); };
for (const configPath of ['ios/App/App/capacitor.config.json', 'android/app/src/main/assets/capacitor.config.json']) {
  const config = JSON.parse(fs.readFileSync(path.join(root, configPath)));
  check(config.server?.url === 'https://www.snowd.ca/mobile' && config.server?.cleartext !== true && !config.server?.allowNavigation?.length, `${configPath}: production origin only`);
}
check(fs.existsSync(path.join(root, 'ios/App/App/GoogleService-Info.plist')), 'iOS Firebase configuration installed');
const iosFirebasePath = path.join(root, 'ios/App/App/GoogleService-Info.plist');
if (fs.existsSync(iosFirebasePath)) {
  const plist = fs.readFileSync(iosFirebasePath, 'utf8');
  check(/<key>BUNDLE_ID<\/key>\s*<string>ca\.snowd\.app<\/string>/.test(plist), 'iOS Firebase configuration matches the release bundle ID');
}
check(fs.existsSync(path.join(root, 'android/app/google-services.json')), 'Android Firebase configuration installed');
const evidencePath = path.join(root, 'release-evidence.local.json');
const evidence = fs.existsSync(evidencePath) ? JSON.parse(fs.readFileSync(evidencePath)) : {};
for (const key of ['appleSigningAndBundleId', 'applePayMerchantAndCertificate', 'googlePayProductionApproval', 'firebaseNativeProviders', 'appleTokenRevocationOnDeletion', 'deletionProcessAndRetentionApproved', 'storageAccessRulesAudited', 'moderationProcessReady', 'firestoreRulesDeployed', 'iosDeviceEndToEnd', 'androidDeviceEndToEnd', 'privacyLabelsAndDataSafety', 'storeScreenshotsAndReviewAccounts', 'signedArchivesValidated']) {
  check(typeof evidence[key] === 'string' && evidence[key].trim().length > 20, `${key}: dated verification evidence recorded`);
}
try {
  const response = await fetch('https://www.snowd.ca/api/mobile/version', { signal: AbortSignal.timeout(10000) });
  const contract = await response.json();
  check(response.ok && contract.nativeContract === 1, 'Live website serves the native integration contract');
} catch { check(false, 'Live website serves the native integration contract'); }
if (failures.length) { console.error(`\nNot ready for store submission: ${failures.length} unresolved checks. See RELEASE.md.`); process.exitCode = 1; }
else console.log('\nRecorded release prerequisites are complete. Upload validation and store review remain authoritative.');
