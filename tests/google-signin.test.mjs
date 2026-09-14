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
