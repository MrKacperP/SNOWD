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
const realScreen = process.env.SNOWD_REAL_SCREEN === 'true';
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
  assert.equal((await request('operator', { action: 'end', id: second.data.id })).status, 200);
  console.log('PASS: authentication, disabled accounts, caller isolation, duplicate calls, competing admin answers, heartbeat access, hangup cleanup, expired calls, operator calling.');

  if (process.env.SNOWD_PLAYWRIGHT_PATH) {
    const { chromium } = await import(process.env.SNOWD_PLAYWRIGHT_PATH);
    const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-fake-device-for-media-stream', '--auto-select-tab-capture-source-by-title=SNOWD support capture', '--auto-accept-this-tab-capture', '--autoplay-policy=no-user-gesture-required'] });
    const pages = {};
    try {
      for (const who of ['caller', 'admin', 'operator']) {
        const context = await browser.newContext({ permissions: ['microphone', 'camera'], viewport: { width: 1440, height: 1000 } });
        const page = await context.newPage(); pages[who] = page;
        await page.addInitScript(({ realScreen }) => {
          window.supportTest = { peers: [], streams: [], requests: [], deny: null, pending: null };
          const RealPeer = window.RTCPeerConnection;
          window.supportTest.events = [];
          window.RTCPeerConnection = class extends RealPeer {
            constructor(...args) { super(...args); window.supportTest.peers.push(this); this.addEventListener('connectionstatechange', () => window.supportTest.events.push(this.connectionState)); }
            close() { window.supportTest.events.push(new Error('Peer closed').stack); super.close(); }
          };
          const originalUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
          navigator.mediaDevices.getUserMedia = async options => {
            window.supportTest.requests.push(options);
            if (window.supportTest.deny === (options.video ? 'camera' : 'microphone')) throw new DOMException('Permission denied', 'NotAllowedError');
            const stream = await originalUserMedia(options); window.supportTest.streams.push(stream);
            if (window.supportTest.delayMedia) await new Promise(resolve => { window.supportTest.pending = resolve; });
            return stream;
          };
          const originalDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
          navigator.mediaDevices.getDisplayMedia = async options => {
            if (window.supportTest.deny === 'screen') throw new DOMException('Permission denied', 'NotAllowedError');
            if (realScreen) { const stream = await originalDisplayMedia(options); window.supportTest.screen = stream; window.supportTest.streams.push(stream); return stream; }

            const canvas = document.createElement('canvas'); canvas.width = 1440; canvas.height = 1000;
            const ctx = canvas.getContext('2d'); const paint = () => { ctx.fillStyle = '#164e63'; ctx.fillRect(0, 0, 1440, 1000); ctx.fillStyle = 'white'; ctx.font = '48px sans-serif'; ctx.fillText('SNOWD screen-sharing test ' + Date.now(), 100, 200); };
            paint(); const timer = setInterval(paint, 100); const stream = canvas.captureStream(10);
            stream.getVideoTracks()[0].addEventListener('ended', () => clearInterval(timer));
            window.supportTest.screen = stream; window.supportTest.streams.push(stream); return stream;
          };
        }, { realScreen });
        await page.goto(`${base}/login`);
        await page.getByPlaceholder('name@email.com').fill(users[who].email);
        await page.getByPlaceholder('Enter your password').fill(password);
        await page.getByRole('button', { name: 'Sign in', exact: true }).click();
        await page.waitForURL(who === 'admin' ? '**/admin' : '**/dashboard', { timeout: 30000 });
      }
      let caller = pages.caller; const admin = pages.admin;
      // Dismiss onboarding tour if an existing tutorial overlay appears.
      for (const page of [caller, admin]) {
        const skip = page.getByRole('button', { name: /skip tour/i }); if (await skip.count()) await skip.click();
      }
      const openCall = async page => {
        const dismiss = page.getByRole('button', { name: 'Dismiss', exact: true });
        if (await dismiss.count()) await dismiss.click();
        await page.getByRole('button', { name: 'Contact support' }).click();
        await page.getByRole('button', { name: /Call Support · Phone or Browser/ }).click();
        await page.getByRole('button', { name: 'Call in browser', exact: true }).click();
      };
      // A rejected microphone request must not leave a ringing call or active controls.
      await caller.evaluate(() => { window.supportTest.deny = 'microphone'; });
      await openCall(caller);
      await caller.getByRole('alert').filter({ hasText: 'Permission denied' }).waitFor();
      assert.equal(await caller.getByRole('button', { name: 'Cancel call', exact: true }).count(), 0);
      await caller.evaluate(() => { window.supportTest.deny = null; window.supportTest.delayMedia = true; });
      await caller.getByRole('button', { name: 'Dismiss', exact: true }).click();
      // Mute while the microphone permission promise is pending.
      await caller.getByRole('button', { name: 'Contact support' }).click();
      await caller.getByRole('button', { name: /Call Support · Phone or Browser/ }).click();
      await caller.getByRole('button', { name: 'Call in browser', exact: true }).click();
      await caller.waitForFunction(() => Boolean(window.supportTest.pending));
      await caller.getByRole('button', { name: 'Mute', exact: true }).click();
      await caller.evaluate(() => { window.supportTest.delayMedia = false; window.supportTest.pending(); });
      await admin.getByRole('button', { name: 'Answer with microphone' }).click({ timeout: 30000 });
      await caller.getByText('Connected to support', { exact: true }).waitFor({ timeout: 30000 });
      await admin.getByText('Connected to support', { exact: true }).waitFor({ timeout: 30000 });
      assert.equal(await admin.getByRole('button', { name: 'Share camera', exact: true }).count(), 0);
      assert.equal(await caller.evaluate(() => window.supportTest.peers.at(-1).getSenders().find(sender => sender.track?.kind === 'audio').track.enabled), false);
      await caller.getByRole('button', { name: 'Unmute', exact: true }).waitFor();
      await caller.getByRole('button', { name: 'Unmute', exact: true }).click();
      await caller.waitForFunction(async () => [...(await window.supportTest.peers.at(-1).getStats()).values()].some(stat => stat.type === 'inbound-rtp' && stat.kind === 'audio' && stat.bytesReceived > 0));
      await admin.waitForFunction(async () => [...(await window.supportTest.peers.at(-1).getStats()).values()].some(stat => stat.type === 'inbound-rtp' && stat.kind === 'audio' && stat.bytesReceived > 0));
      assert.equal(await admin.evaluate(() => window.supportTest.requests.some(request => request.video)), false);
      await caller.evaluate(() => { window.supportTest.deny = 'camera'; });
      await caller.getByRole('button', { name: 'Share camera', exact: true }).click();
      await caller.getByRole('alert').filter({ hasText: 'Permission denied' }).waitFor();
      await caller.evaluate(() => { window.supportTest.deny = null; });
      await caller.getByRole('button', { name: 'Share camera', exact: true }).click();
      await admin.locator('video').waitFor();
      await admin.waitForFunction(() => document.querySelector('video')?.videoWidth > 0);
      await caller.evaluate(() => { document.title = 'SNOWD support capture'; window.supportTest.deny = 'screen'; });
      await caller.getByRole('button', { name: 'Share screen', exact: true }).click();
      await caller.getByRole('alert').filter({ hasText: 'Permission denied' }).waitFor();
      await caller.evaluate(() => { window.supportTest.deny = null; });
      await caller.getByRole('button', { name: 'Share screen', exact: true }).click();
      await caller.getByRole('button', { name: 'Stop sharing screen', exact: true }).waitFor();
      if (realScreen) assert.equal(await caller.evaluate(() => window.supportTest.screen.getVideoTracks()[0].getSettings().displaySurface), 'browser');
      await admin.getByText('Screen shared. The caller can enable pointer guidance for this SNOWD tab.').waitFor();
      await admin.locator('video').nth(1).click({ position: { x: 100, y: 80 } });
      assert.equal(await caller.getByText('Support · click', { exact: true }).count(), 0);
      await caller.getByRole('checkbox', { name: /I am sharing this SNOWD tab/ }).check();
      await admin.getByText('Move or click on the shared screen to point things out to the caller.').waitFor();
      await admin.waitForFunction(() => document.querySelectorAll('video')[1]?.videoWidth > 0);
      await admin.locator('video').nth(1).click({ position: { x: 100, y: 80 } });
      await caller.getByText('Support · click', { exact: true }).waitFor();
      const expected = await admin.locator('video').nth(1).evaluate(el => {
        const rect = el.getBoundingClientRect(), scale = Math.min(rect.width / el.videoWidth, rect.height / el.videoHeight);
        const width = el.videoWidth * scale, height = el.videoHeight * scale;
        return { x: (100 - (rect.width - width) / 2) / width, y: (80 - (rect.height - height) / 2) / height };
      });
      const actual = await caller.getByText('Support · click', { exact: true }).evaluate(el => {
        const rect = el.parentElement.getBoundingClientRect(); return { x: rect.x / innerWidth, y: rect.y / innerHeight };
      });
      assert(Math.abs(actual.x - expected.x) < .005 && Math.abs(actual.y - expected.y) < .005, 'Pointer position must match the shared video coordinate');
      await admin.locator('video').nth(1).hover({ position: { x: 150, y: 100 } });
      await caller.locator('b').filter({ hasText: /^Support$/ }).waitFor();
      await caller.getByRole('checkbox', { name: /I am sharing this SNOWD tab/ }).uncheck();
      assert.equal(await caller.getByText('Support · click', { exact: true }).count(), 0);
      await caller.getByRole('checkbox', { name: /I am sharing this SNOWD tab/ }).check();
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
      assert.equal(await caller.evaluate(() => window.supportTest.streams.some(stream => stream.getTracks().some(track => track.readyState === 'live'))), false);
      assert.equal(await admin.evaluate(() => window.supportTest.streams.some(stream => stream.getTracks().some(track => track.readyState === 'live'))), false);
      console.log('PASS: client call, two-way audio bytes, microphone/camera/screen denial recovery, mute during permission, no admin camera request, camera + screen video, exact pointer coordinates and consent, mobile navigation, hangup releases devices. Screen source: ' + (realScreen ? 'actual browser tab' : 'canvas'));

      caller = pages.operator;
      const skip = caller.getByRole('button', { name: /skip tour/i }); if (await skip.count()) await skip.click();
      await caller.evaluate(() => { document.title = 'SNOWD support capture'; });
      await openCall(caller);
      await admin.getByRole('button', { name: 'Decline', exact: true }).click({ timeout: 30000 });
      await caller.getByRole('button', { name: 'Cancel call', exact: true }).waitFor({ state: 'detached' });
      await openCall(caller);
      await admin.getByRole('button', { name: 'Answer with microphone' }).click({ timeout: 30000 });
      await caller.getByText('Connected to support', { exact: true }).waitFor({ timeout: 30000 });
      await caller.getByRole('button', { name: 'Share camera', exact: true }).click();
      await admin.waitForFunction(() => document.querySelector('video')?.videoWidth > 0);
      await caller.getByRole('button', { name: 'Share screen', exact: true }).click();
      await caller.getByRole('checkbox', { name: /I am sharing this SNOWD tab/ }).check();
      await admin.waitForFunction(() => document.querySelectorAll('video')[1]?.videoWidth > 0);
      await admin.locator('video').nth(1).click({ position: { x: 100, y: 80 } });
      await caller.getByText('Support · click', { exact: true }).waitFor();
      // Simulate the browser's stop-sharing event; stop() alone intentionally does not fire ended.
      await caller.evaluate(() => { const track = window.supportTest.screen.getVideoTracks()[0]; track.stop(); track.dispatchEvent(new Event('ended')); });
      await admin.locator('video').nth(1).waitFor({ state: 'detached' });
      await caller.getByRole('button', { name: 'Share screen', exact: true }).click();
      await caller.getByRole('button', { name: 'Stop sharing screen', exact: true }).waitFor();
      await admin.getByRole('button', { name: 'End call', exact: true }).click();
      await caller.getByRole('button', { name: 'End call', exact: true }).waitFor({ state: 'detached' });
      assert.equal(await caller.evaluate(() => window.supportTest.streams.some(stream => stream.getTracks().some(track => track.readyState === 'live'))), false);
      // Cancel before getUserMedia resolves: late device grants must be stopped.
      await caller.evaluate(() => { window.supportTest.delayMedia = true; window.supportTest.pending = null; });
      await openCall(caller);
      await caller.waitForFunction(() => Boolean(window.supportTest.pending));
      await caller.getByRole('button', { name: 'Cancel call', exact: true }).click();
      await caller.evaluate(() => { window.supportTest.delayMedia = false; window.supportTest.pending(); });
      await caller.waitForFunction(() => !window.supportTest.streams.some(stream => stream.getTracks().some(track => track.readyState === 'live')));
      await openCall(caller);
      await admin.getByRole('button', { name: 'Answer with microphone' }).click({ timeout: 30000 });
      await caller.getByText('Connected to support', { exact: true }).waitFor({ timeout: 30000 });
      await caller.context().setOffline(true);
      await caller.getByRole('button', { name: 'End call', exact: true }).waitFor({ state: 'detached', timeout: 50000 });
      assert.equal(await caller.evaluate(() => window.supportTest.streams.some(stream => stream.getTracks().some(track => track.readyState === 'live'))), false);
      await caller.context().setOffline(false);
      await admin.getByRole('button', { name: 'End call', exact: true }).waitFor({ state: 'detached', timeout: 15000 });
      console.log('PASS: signaling outage ends the call and releases the microphone.');
      console.log('PASS: operator call, admin decline, screen/pointer, browser stop-sharing, restart sharing, admin hangup, late microphone permission cleanup.');
    } catch (error) {
      for (const [name, page] of Object.entries(pages)) {
        console.error(name, await page.getByRole('region', { name: 'Browser support call' }).allTextContents(), await page.evaluate(() => window.supportTest.events));
        await page.screenshot({ path: `/tmp/support-failure-${name}.png` });
      }
      throw error;
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
