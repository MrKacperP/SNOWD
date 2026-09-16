// Local emulator integration test. Never run this against production.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
dotenv.config({ path: '.env.local', quiet: true });
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080');
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099');
const base = process.env.SNOWD_QA_URL || 'http://localhost:3011';
assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
const auth = getAuth(), db = getFirestore(), users = {}, callIds = [];
const suffix = randomUUID().slice(0, 8), password = 'Support-test-only-42!';
async function request(who, body, query = '') {
  const response = await fetch(`${base}/api/support-calls${query}`, { method: body ? 'POST' : 'GET', headers: { authorization: `Bearer ${users[who]?.token || ''}`, 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, data: await response.json() };
}
try {
  for (const [name, role] of [['caller', 'client'], ['operator', 'operator'], ['stranger', 'client'], ['admin', 'admin'], ['employee', 'employee'], ['disabled', 'admin']]) {
    const uid = `support-qa-${name}-${suffix}`, email = `${uid}@example.test`;
    await auth.createUser({ uid, email, password });
    await db.doc(`users/${uid}`).set({ uid, email, role, displayName: `Support QA ${name}`, disabled: name === 'disabled', onboardingComplete: true, accountApproved: true, idVerified: true, tutorialCompleted: true });
    const response = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
    users[name] = { uid, email, token: (await response.json()).idToken };
  }
  const offer = { type: 'offer', sdp: 'v=0\r\n' }, answer = { type: 'answer', sdp: 'v=0\r\n' };
  assert.equal((await request('missing')).status, 401);
  assert.equal((await request('disabled')).status, 403);
  assert.equal((await request('caller')).status, 403);
  assert.equal((await request('caller', { action: 'start', offer: {} })).status, 400);
  const started = await request('caller', { action: 'start', offer });
  assert.equal(started.status, 200); const id = started.data.id; callIds.push(id);
  assert.equal((await request('caller', { action: 'start', offer })).status, 409);
  assert.equal((await request('stranger', null, `?id=${id}`)).status, 403);
  assert.equal((await request('stranger', { action: 'end', id })).status, 403);
  assert.equal((await request('caller', { action: 'answer', id, answer })).status, 409);
  const queue = (await request('admin')).data.calls;
  assert(queue.some(call => call.id === id)); assert(!('offer' in queue.find(call => call.id === id)));
  const competing = await Promise.all(['admin', 'employee'].map(who => request(who, { action: 'answer', id, answer })));
  assert.deepEqual(competing.map(result => result.status).sort(), [200, 409]);
  const winner = competing[0].status === 200 ? 'admin' : 'employee', loser = winner === 'admin' ? 'employee' : 'admin';
  assert.equal((await request(loser, null, `?id=${id}`)).status, 403);
  assert.equal((await request(loser, { action: 'heartbeat', id })).status, 403);
  assert.equal((await request('caller', null, `?id=${id}`)).data.status, 'active');
  assert.equal((await request('caller', { action: 'heartbeat', id })).status, 200);
  assert.equal((await request(winner, { action: 'end', id })).status, 200);
  assert.equal((await request('caller', null, `?id=${id}`)).data.offer, null);
  const second = await request('operator', { action: 'start', offer }); callIds.push(second.data.id);
  await db.doc(`supportCalls/${second.data.id}`).update({ expiresAt: Date.now() - 1 });
  assert.equal((await request('admin', { action: 'answer', id: second.data.id, answer })).status, 409);
  assert(!(await request('admin')).data.calls.some(call => call.id === second.data.id));
  console.log('PASS: authentication, disabled accounts, caller isolation, duplicate calls, competing admin answers, heartbeat access, hangup cleanup, expired calls, operator calling.');

  if (process.env.SNOWD_PLAYWRIGHT_PATH) {
    const { chromium } = await import(process.env.SNOWD_PLAYWRIGHT_PATH);
    const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
    try {
      const pages = {};
      for (const who of ['caller', 'admin']) {
        const context = await browser.newContext({ permissions: ['microphone', 'camera'], viewport: { width: 1440, height: 1000 } });
        const page = await context.newPage(); pages[who] = page;
        // Controlled screen source for deterministic tests; the peer connection and media transport remain real.
        await page.addInitScript(() => {
          navigator.mediaDevices.getDisplayMedia = async () => {
            const canvas = document.createElement('canvas'); canvas.width = 1440; canvas.height = 1000;
            const ctx = canvas.getContext('2d'); const paint = () => { ctx.fillStyle = '#164e63'; ctx.fillRect(0, 0, 1440, 1000); ctx.fillStyle = 'white'; ctx.font = '48px sans-serif'; ctx.fillText('SNOWD screen-sharing test ' + Date.now(), 100, 200); };
            paint(); const timer = setInterval(paint, 100); const stream = canvas.captureStream(10);
            stream.getVideoTracks()[0].addEventListener('ended', () => clearInterval(timer));
            return stream;
          };
        });
        await page.goto(`${base}/login`);
        await page.getByPlaceholder('name@email.com').fill(users[who].email);
        await page.getByPlaceholder('Enter your password').fill(password);
        await page.getByRole('button', { name: 'Sign in', exact: true }).click();
        await page.waitForURL(who === 'admin' ? '**/admin' : '**/dashboard', { timeout: 30000 });
      }
      const caller = pages.caller, admin = pages.admin;
      // Dismiss onboarding tour if an existing tutorial overlay appears.
      for (const page of [caller, admin]) {
        const skip = page.getByRole('button', { name: /skip tour/i }); if (await skip.count()) await skip.click();
      }
      await caller.getByRole('button', { name: 'Contact support' }).click();
      await caller.getByRole('button', { name: /Call Support · Phone or Browser/ }).click();
      await caller.getByRole('button', { name: 'Call in browser', exact: true }).click();
      await admin.getByRole('button', { name: 'Answer with microphone' }).click({ timeout: 30000 });
      await caller.getByText('Connected to support', { exact: true }).waitFor({ timeout: 30000 });
      await admin.getByText('Connected to support', { exact: true }).waitFor({ timeout: 30000 });
      assert.equal(await admin.getByRole('button', { name: 'Share camera', exact: true }).count(), 0);
      await caller.getByRole('button', { name: 'Mute', exact: true }).click();
      await caller.getByRole('button', { name: 'Unmute', exact: true }).waitFor();
      await caller.getByRole('button', { name: 'Unmute', exact: true }).click();
      await caller.getByRole('button', { name: 'Share camera', exact: true }).click();
      await admin.locator('video').waitFor();
      await admin.waitForFunction(() => document.querySelector('video')?.videoWidth > 0);
      await caller.getByRole('button', { name: 'Share screen', exact: true }).click();
      await admin.getByText('Screen shared. The caller can enable pointer guidance for this SNOWD tab.').waitFor();
      await admin.locator('video').nth(1).click({ position: { x: 100, y: 80 } });
      assert.equal(await caller.getByText('Support · click', { exact: true }).count(), 0);
      await caller.getByRole('checkbox', { name: /I am sharing this SNOWD tab/ }).check();
      await admin.getByText('Move or click on the shared screen to point things out to the caller.').waitFor();
      await admin.waitForFunction(() => document.querySelectorAll('video')[1]?.videoWidth > 0);
      await admin.locator('video').nth(1).click({ position: { x: 100, y: 80 } });
      await caller.getByText('Support · click', { exact: true }).waitFor();
      await admin.screenshot({ path: '/tmp/support-admin-call.png' });
      await caller.screenshot({ path: '/tmp/support-caller-call.png' });
      await caller.setViewportSize({ width: 390, height: 844 });
      const panelBox = await caller.getByRole('region', { name: 'Browser support call' }).boundingBox();
      assert(panelBox.x >= 0 && panelBox.x + panelBox.width <= 390);
      await caller.getByRole('button', { name: 'Minimize', exact: true }).click();
      await caller.getByRole('link', { name: 'Jobs', exact: true }).first().click();
      await caller.getByRole('button', { name: 'Expand', exact: true }).waitFor();
      await caller.getByRole('button', { name: 'Expand', exact: true }).click();
      await caller.getByRole('button', { name: 'Stop sharing screen' }).click();
      await admin.locator('video').nth(1).waitFor({ state: 'detached' });
      await caller.getByRole('button', { name: 'Stop camera' }).click();
      await admin.locator('video').waitFor({ state: 'detached' });
      await caller.getByRole('button', { name: 'End call', exact: true }).click();
      await admin.getByRole('button', { name: 'End call', exact: true }).waitFor({ state: 'detached' });
      console.log('PASS: real two-browser WebRTC connection, camera video, screen video, admin click pointer on caller, stopping media, hangup.');
    } finally { await browser.close(); }
  }
} finally {
  for (const id of callIds) if (id) await db.doc(`supportCalls/${id}`).delete();
  for (const user of Object.values(users)) {
    const calls = await db.collection('supportCalls').where('callerId', '==', user.uid).get();
    for (const call of calls.docs) await call.ref.delete();
    await db.doc(`supportCallLocks/${user.uid}`).delete(); await db.doc(`users/${user.uid}`).delete(); await auth.deleteUser(user.uid);
  }
}
