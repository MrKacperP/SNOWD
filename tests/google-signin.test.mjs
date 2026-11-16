import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Google popup starts in the click gesture alongside persistence', () => {
  const source = fs.readFileSync('src/components/SimpleAuth.tsx', 'utf8');
  assert.match(source, /const persistence = setPersistence\(auth, browserLocalPersistence\); await Promise.all\(\[persistence, signInWithGoogle\(\)\]\)/);
});

test('Google sign-in defaults to Firebase auth hosting instead of an unverified product-domain handler', () => {
  const firebase = fs.readFileSync('src/lib/firebase.ts', 'utf8');
  const nextConfig = fs.readFileSync('next.config.ts', 'utf8');
  assert.match(firebase, /NEXT_PUBLIC_FIREBASE_CUSTOM_AUTH_DOMAIN \|\|\s+process\.env\.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN/);
  assert.doesNotMatch(firebase, /endsWith\("\.firebaseapp\.com"\).*www\.snowd\.ca/s);
  assert.match(nextConfig, /source: "\/__\/auth\/:path\*"/);
  assert.match(nextConfig, /snowd-6ca54\.firebaseapp\.com/);
});

test('app surfaces are not hidden in details elements', () => {
  const files = [
    'src/app/dashboard/settings/page.tsx',
    'src/app/dashboard/transactions/page.tsx',
    'src/app/dashboard/messages/page.tsx',
    'src/app/dashboard/messages/[chatId]/page.tsx',
    'src/components/OnboardingFlow.tsx',
    'src/components/work-orders/OrderActions.tsx',
    'src/components/work-orders/OrderCard.tsx',
    'src/components/work-orders/WorkOrdersPage.tsx',
  ];
  for (const file of files) assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /<details\b/);
});
