// Run under Firebase Auth + Firestore emulators. Never writes to production Firebase.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

dotenv.config({ path: '.env.local', quiet: true });
assert(process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_'), 'Sandbox key required');
assert(process.env.FIRESTORE_EMULATOR_HOST?.startsWith('127.0.0.1:'), 'Local Firestore emulator required');
assert(process.env.FIREBASE_AUTH_EMULATOR_HOST?.startsWith('127.0.0.1:'), 'Local Auth emulator required');
// Match the project ID embedded in the existing Next build; both SDKs are
// forced to local emulators above, so this never accesses that project's data.
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
initializeApp({ projectId });
const db = getFirestore();
const auth = getAuth();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const account = (await stripe.accounts.list({ limit: 100 })).data.find(a => a.charges_enabled && a.payouts_enabled && a.details_submitted && !a.requirements?.currently_due?.length && a.metadata?.operatorId);
assert(account, 'A ready sandbox connected account is required');
const operatorId = account.metadata.operatorId;
const clientId = `qa-client-${randomUUID()}`;
const secret = `whsec_${randomUUID()}`;
const base = 'http://127.0.0.1:3002';
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--port', '3002'], {
  env: { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --no-experimental-require-module`, NEXT_PUBLIC_FIREBASE_PROJECT_ID: projectId, STRIPE_WEBHOOK_SECRET: secret, STRIPE_CONNECT_WEBHOOK_SECRET: secret },
  stdio: ['ignore', 'ignore', 'ignore'],
});
const intents = [];
try {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(base)).ok) break; } catch {}
    assert(i < 99, 'QA server did not start');
    await new Promise(r => setTimeout(r, 200));
  }
  async function token(uid) {
    await auth.createUser({ uid, email: `${uid}@example.test`, password: 'QA-emulator-only-42' });
    const r = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: `${uid}@example.test`, password: 'QA-emulator-only-42', returnSecureToken: true }) });
    const result = await r.json();
    assert(result.idToken, 'Emulator login failed');
    return result.idToken;
  }
  const clientToken = await token(clientId);
  const operatorToken = await token(operatorId);
  await db.doc(`users/${operatorId}`).set({ role: 'operator', idVerified: true, stripeConnectAccountId: account.id, stripeAccountStatus: 'connected' });
  await db.doc(`users/${clientId}`).set({ role: 'client' });
  async function api(path, data, bearer = clientToken) {
    const r = await fetch(`${base}/api/stripe/${path}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${bearer}` }, body: JSON.stringify(data) });
    return { status: r.status, data: await r.json() };
  }
  const state = await api('account-status', { accountId: account.id }, operatorToken);
  assert.equal(state.data.fullyReady, true, JSON.stringify(state));
  const onboarding = await api('account-session', { accountId: account.id }, operatorToken);
  assert.equal(onboarding.status, 200, JSON.stringify(onboarding));
  assert(onboarding.data.clientSecret);
  console.log('PASS: authenticated account readiness and embedded onboarding session');
  for (const action of ['capture', 'cancel']) {
    const jobId = `qa-${action}-${randomUUID()}`;
    await db.doc(`jobs/${jobId}`).set({ clientId, operatorId, price: 10, status: 'accepted', paymentStatus: 'pending', address: 'Emulator QA fixture' });
    const wrongUser = await api('create-payment-intent', { jobId }, operatorToken);
    assert.equal(wrongUser.status, 403);
    const checkout = await api('create-payment-intent', { jobId });
    assert.equal(checkout.status, 200, JSON.stringify(checkout));
    const id = checkout.data.paymentIntentId;
    intents.push(id);
    const retry = await api('create-payment-intent', { jobId });
    assert.equal(retry.data.paymentIntentId, id);
    const held = await stripe.paymentIntents.confirm(id, { payment_method: 'pm_card_visa', return_url: 'http://localhost:3002' });
    assert.equal(held.status, 'requires_capture');
    assert.equal(held.application_fee_amount, 150);
    assert.equal(held.transfer_data.destination, account.id);
    const event = { id: `evt_qa_${randomUUID()}`, object: 'event', type: 'payment_intent.amount_capturable_updated', data: { object: held } };
    const payload = JSON.stringify(event);
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
    const response = await fetch(`${base}/api/stripe/webhook`, { method: 'POST', headers: { 'stripe-signature': signature, 'content-type': 'application/json' }, body: payload });
    assert.equal(response.status, 200);
    assert.equal((await db.doc(`jobs/${jobId}`).get()).data().paymentStatus, 'held');
    if (action === 'capture') {
      const noProof = await api('capture-payment', { paymentIntentId: id });
      assert(noProof.status >= 400);
      await db.doc(`jobs/${jobId}`).update({ completionPhotoUrl: 'https://example.test/qa-proof.jpg' });
    }
    const final = await api(`${action}-payment`, { paymentIntentId: id });
    assert.equal(final.status, 200, JSON.stringify(final));
    const expected = action === 'capture' ? 'paid' : 'refunded';
    assert.equal((await db.doc(`jobs/${jobId}`).get()).data().paymentStatus, expected);
    assert.equal((await db.doc(`transactions/${id}`).get()).data().status, expected);
    console.log(`PASS: sandbox ${action}, authorization, signed webhook, ownership, retry and transaction reconciliation`);
  }
  console.log('All sandbox integration checks passed. No real money or production Firebase records used.');
} finally {
  for (const id of intents) {
    const p = await stripe.paymentIntents.retrieve(id);
    if (!['succeeded', 'canceled'].includes(p.status)) await stripe.paymentIntents.cancel(id);
  }
  server.kill('SIGTERM');
}
