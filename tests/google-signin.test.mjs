import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

test('Google popup starts before asynchronous persistence finishes', async () => {
  const source = fs.readFileSync('src/app/login/page.tsx', 'utf8');
  const handler = source.slice(source.indexOf('  const handleGoogleSignIn ='), source.indexOf('  const handleEmailSignIn ='));
  const code = ts.transpileModule(`${handler}\n handleGoogleSignIn;`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  let finishPersistence;
  let opened = false;
  let redirected = false;
  const run = vm.runInNewContext(code, {
    auth: {}, remember: true, browserLocalPersistence: {}, browserSessionPersistence: {},
    setError() {}, setLoading() {}, googleSignInError: () => 'error',
    setPersistence: () => new Promise(resolve => { finishPersistence = resolve; }),
    signInWithGoogle: () => { opened = true; return Promise.resolve({ uid: 'google-user' }); },
    checkProfileAndRedirect: async uid => { assert.equal(uid, 'google-user'); redirected = true; },
  });
  const pending = run();
  assert.equal(opened, true);
  assert.equal(redirected, false);
  finishPersistence();
  await pending;
  assert.equal(redirected, true);
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
    'src/app/page.tsx',
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
