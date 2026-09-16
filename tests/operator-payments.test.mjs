import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, mocks = {}, env = {}) {
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, require: (name) => { if (name === '@/lib/emailNotifications') return { sendWorkOrderEmail: async () => ({ sent: true }) }; if (name in mocks) return mocks[name]; throw new Error(`Unexpected import: ${name}`); },
    process: { env: { STRIPE_SECRET_KEY: 'sk_test_fixture', NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_fixture', ...env } },
    console: { error() {} },
  });
  return exports;
}
const discovery = load('src/lib/operatorDiscovery.ts');
test('ID verification makes an available operator public without Stripe or extra approval', () => {
  assert.equal(discovery.isOperatorPublic({ idVerified: true, accountApproved: false, onboardingComplete: false }), true);
  assert.equal(discovery.isOperatorPublic({ idVerified: false }), false);
  assert.equal(discovery.isOperatorPublic({ idVerified: true, isAvailable: false }), false);
});
test('only a connected Stripe account advertises platform payments', () => {
  for (const status of [undefined, 'pending', 'disabled', 'failed']) {
    assert.equal(discovery.canAcceptPlatformPayments({ stripeConnectAccountId: 'acct_1', stripeAccountStatus: status }), false);
  }
  assert.equal(discovery.canAcceptPlatformPayments({ stripeConnectAccountId: 'acct_1', stripeAccountStatus: 'connected' }), true);
  assert.equal(discovery.canAcceptPlatformPayments({ stripeAccountStatus: 'connected' }), false);
});
test('service radius includes nearby customers and excludes distant ones', () => {
  const operator = { lat: 43.65, lng: -79.38, serviceRadius: 10 };
  assert.equal(discovery.isClientWithinOperatorRadius({ lat: 43.66, lng: -79.38 }, operator), true);
  assert.equal(discovery.isClientWithinOperatorRadius({ lat: 45, lng: -79.38 }, operator), false);
});
test('selected cities cover the complete city and support multiple operating cities', () => {
  const operator = {
    lat: 43.59,
    lng: -79.64,
    serviceRadius: 1,
    serviceAreas: [
      { city: 'Mississauga', province: 'Ontario', provinceCode: 'ON' },
      { city: 'Oakville', province: 'Ontario', provinceCode: 'ON' },
    ],
  };
  assert.equal(discovery.isClientWithinOperatorRadius({ city: 'Mississauga', province: 'ON', lat: 45, lng: -75 }, operator), true);
  assert.equal(discovery.isClientWithinOperatorRadius({ city: 'oakville', province: 'Ontario', lat: 45, lng: -75 }, operator), true);
  assert.equal(discovery.isClientWithinOperatorRadius({ city: 'Toronto', province: 'ON', lat: 45, lng: -75 }, operator), false);
});

function paymentRoute({ ready = true, uid = 'client', verified = true, jobOverrides = {} } = {}) {
  const calls = [];
  const job = { price: 100, clientId: 'client', operatorId: 'operator', status: 'accepted', paymentStatus: 'pending', ...jobOverrides };
  const operator = { idVerified: verified, stripeConnectAccountId: 'acct_operator' };
  const stripe = {
    accounts: { retrieve: async () => ({ metadata: { operatorId: 'operator' }, charges_enabled: ready, payouts_enabled: ready, details_submitted: ready }) },
    paymentIntents: { create: async (params, options) => { calls.push({ params, options }); return { id: 'pi_job', client_secret: 'fixture' }; } },
  };
  const route = load('src/app/api/stripe/create-payment-intent/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    '@/lib/stripe': { getStripe: () => stripe },
    '@/lib/stripeConnectAuth': { requireStripeUser: async () => ({ uid }) },
    '@/lib/firebaseAdmin': { getAdminDb: () => ({ doc: (path) => ({ get: async () => ({ data: () => path.startsWith('jobs/') ? job : operator }), update: async () => {} }) }) },
  });
  return { route, calls };
}
test('payment uses saved job price and destination, with the existing 15% commission', async () => {
  const { route, calls } = paymentRoute();
  const result = await route.POST({ json: async () => ({ jobId: 'job', amount: 1, operatorStripeAccountId: 'acct_attacker' }) });
  assert.equal(result.status, 200);
  assert.equal(calls[0].params.amount, 10000);
  assert.equal(calls[0].params.application_fee_amount, 1500);
  assert.equal(calls[0].params.transfer_data.destination, 'acct_operator');
  assert.ok(calls[0].options.idempotencyKey);
});
test('unfinished Stripe accounts cannot receive a card payment', async () => {
  const { route, calls } = paymentRoute({ ready: false });
  assert.equal((await route.POST({ json: async () => ({ jobId: 'job' }) })).status, 400);
  assert.equal(calls.length, 0);
});
test('another customer cannot pay or create an intent for this job', async () => {
  const { route, calls } = paymentRoute({ uid: 'stranger' });
  assert.equal((await route.POST({ json: async () => ({ jobId: 'job' }) })).status, 403);
  assert.equal(calls.length, 0);
});
test('unverified operators cannot receive platform payments', async () => {
  const { route, calls } = paymentRoute({ verified: false });
  assert.equal((await route.POST({ json: async () => ({ jobId: 'job' }) })).status, 400);
  assert.equal(calls.length, 0);
});

function paymentSyncFixture() {
  const writes = [];
  const job = { clientId: 'client', operatorId: 'operator', price: 100, paymentStatus: 'pending', stripePaymentIntentId: 'pi_job', chatId: 'chat' };
  const db = { doc: (path) => path, runTransaction: async (run) => run({ get: async () => ({ data: () => job }), update: (path, data) => writes.push({ path, data }), set: (path, data) => writes.push({ path, data }) }) };
  const sync = load('src/lib/stripePaymentState.ts', {
    '@/lib/firebaseAdmin': { getAdminDb: () => db },
    'firebase-admin/firestore': { FieldValue: { serverTimestamp: () => 'now' } },
  }).syncStripePayment;
  const payment = { id: 'pi_job', amount: 10000, currency: 'cad', status: 'requires_capture', metadata: { platform: 'snowd.ca', jobId: 'job', clientId: 'client', operatorId: 'operator' } };
  return { sync, job, payment, writes };
}
for (const [stripeStatus, expected] of [['requires_capture', 'held'], ['succeeded', 'paid'], ['canceled', 'refunded']]) {
  test(`server reconciles ${stripeStatus} into job and payment history`, async () => {
    const { sync, payment, writes } = paymentSyncFixture();
    const result = await sync({ ...payment, status: stripeStatus });
    assert.equal(result.paymentStatus, expected);
    assert.equal(writes[0].data.paymentStatus, expected);
    assert.equal(writes[1].data.status, expected);
    assert.equal(writes[1].data.amount, 10000);
  });
}
test('duplicate webhook delivery does not rewrite the same payment', async () => {
  const { sync, job, payment, writes } = paymentSyncFixture();
  job.paymentStatus = 'held';
  await sync(payment);
  assert.equal(writes.length, 0);
});
test('an old checkout cannot overwrite a replacement payment', async () => {
  const { sync, job, payment, writes } = paymentSyncFixture();
  job.stripePaymentIntentId = 'pi_new';
  await sync(payment);
  assert.equal(writes.length, 0);
});
test('payment reconciliation rejects an amount or participant mismatch', async () => {
  const { sync, payment, writes } = paymentSyncFixture();
  await assert.rejects(sync({ ...payment, amount: 1 }), /does not match/);
  await assert.rejects(sync({ ...payment, metadata: { ...payment.metadata, clientId: 'stranger' } }), /does not match/);
  assert.equal(writes.length, 0);
});

test('capture and cancellation enforce job ownership and completion proof', async () => {
  const job = { clientId: 'client', operatorId: 'operator', stripePaymentIntentId: 'pi_job', status: 'in-progress' };
  const payment = { id: 'pi_job', status: 'requires_capture', metadata: { jobId: 'job' } };
  let uid = 'operator';
  const { requireJobPaymentAccess } = load('src/lib/stripeConnectAuth.ts', {
    '@/lib/stripe': { getStripe: () => ({ paymentIntents: { retrieve: async () => payment } }) },
    '@/lib/firebaseAdmin': { getAdminAuth: () => ({ verifyIdToken: async () => ({ uid }) }), getAdminDb: () => ({ doc: () => ({ get: async () => ({ data: () => job }) }) }) },
  });
  const request = { headers: { get: () => 'Bearer fixture' } };
  await assert.rejects(requireJobPaymentAccess(request, 'pi_job', 'capture'), /Photo proof/);
  job.completionPhotoUrl = 'proof';
  await requireJobPaymentAccess(request, 'pi_job', 'capture');
  uid = 'stranger';
  await assert.rejects(requireJobPaymentAccess(request, 'pi_job', 'cancel'), /cannot manage/);
  uid = 'client';
  payment.status = 'succeeded';
  await assert.rejects(requireJobPaymentAccess(request, 'pi_job', 'cancel'), /already been completed/);
});

for (const signature of ['connect', 'platform', 'invalid']) {
  test(`webhook verifies the ${signature} signing destination before syncing`, async () => {
    const synced = [];
    const payment = { id: 'pi_job', metadata: { platform: 'snowd.ca' } };
    const route = load('src/app/api/stripe/webhook/route.ts', {
      'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
      '@/lib/stripe': { getStripe: () => ({
        webhooks: { constructEvent: (_body, received, secret) => {
          if (received !== secret) throw new Error('invalid signature');
          return { type: 'payment_intent.succeeded', data: { object: { id: 'pi_job' } } };
        } },
        paymentIntents: { retrieve: async () => payment },
      }) },
      '@/lib/stripeAccountState': { syncStripeAccount: async () => {} },
      '@/lib/stripePaymentState': { syncStripePayment: async (value) => synced.push(value) },
    }, { STRIPE_CONNECT_WEBHOOK_SECRET: 'connect', STRIPE_WEBHOOK_SECRET: 'platform' });
    const result = await route.POST({ text: async () => 'signed body', headers: { get: () => signature } });
    assert.equal(result.status, signature === 'invalid' ? 400 : 200);
    assert.equal(synced.length, signature === 'invalid' ? 0 : 1);
  });
}

test('a delayed authorization response cannot downgrade captured or released funds', async () => {
  for (const terminal of ['paid', 'refunded']) {
    const { sync, job, payment, writes } = paymentSyncFixture();
    job.paymentStatus = terminal;
    await sync(payment);
    assert.equal(writes.length, 0);
  }
});

test('radius calculation handles zero coordinates, invalid coordinates and the exact boundary', () => {
  const operator = { lat: 0, lng: 0, serviceRadius: 10 };
  const client = { lat: 0.05, lng: 0 };
  const boundary = discovery.getDistanceKm(client, operator);
  assert.equal(discovery.isClientWithinOperatorRadius(client, { ...operator, serviceRadius: boundary }), true);
  assert.equal(discovery.isClientWithinOperatorRadius(client, { ...operator, serviceRadius: boundary - 0.001 }), false);
  assert.equal(discovery.getDistanceKm({ lat: 91, lng: 0 }, operator), null);
  assert.equal(discovery.getDistanceKm({ lat: 0, lng: -181 }, operator), null);
  assert.equal(discovery.isClientWithinOperatorRadius({}, operator), false);
});

const pricing = load('src/lib/marketplacePricing.ts');
test('30% marketplace share preserves operator rate to the cent', () => {
  for (const rate of [0.01, 1, 39.99, 70, 100, 123.45]) {
    const quote = pricing.quoteMarketplace(rate, 'credit');
    assert.equal(quote.operatorAmount, Math.round(rate * 100));
    assert.equal(Math.round(quote.price * 100) - quote.platformFeeAmount, quote.operatorAmount);
    assert.ok(Math.abs(quote.platformFeeAmount - quote.price * 100 * 0.3) <= 1);
    assert.equal(pricing.jobDisplayPrice({...quote, paymentMethod:'credit'}, true), rate);
    assert.equal(pricing.jobDisplayPrice({...quote, paymentMethod:'credit'}, false), quote.price);
  }
  assert.equal(pricing.quoteMarketplace(70, 'credit').price, 100);
  assert.equal(pricing.quoteMarketplace(70, 'cash').price, 70);
  assert.equal(pricing.quoteMarketplace(70, 'cash').platformFeeAmount, 0);
});
test('new booking totals add each selected clearing area at the saved operator rates', () => {
  const rates = { driveway: { small: 25, medium: 40, large: 60 }, walkway: 15, sidewalk: 12.5 };
  assert.equal(pricing.calculateServicePrice(rates, ['driveway'], 'large'), 60);
  assert.equal(pricing.calculateServicePrice(rates, ['driveway', 'walkway', 'sidewalk'], 'medium'), 67.5);
});
test('new card bookings charge the saved total and allocate exactly the quoted payout', async () => {
  const {route, calls} = paymentRoute({jobOverrides: {...pricing.quoteMarketplace(70, 'credit'), paymentMethod: 'credit'}});
  assert.equal((await route.POST({json: async () => ({jobId:'job',amount:1})})).status, 200);
  assert.equal(calls[0].params.amount, 10000);
  assert.equal(calls[0].params.application_fee_amount, 3000);
  assert.deepEqual(Array.from(calls[0].params.payment_method_types), ['card']);
});
test('cash jobs and inconsistent allocations cannot create Stripe charges', async () => {
  for (const jobOverrides of [{paymentMethod:'cash'}, {pricingVersion:2,operatorAmount:7000,platformFeeAmount:1}]) {
    const {route,calls} = paymentRoute({jobOverrides});
    assert.equal((await route.POST({json:async()=>({jobId:'job'})})).status,409);
    assert.equal(calls.length,0);
  }
});

test('booking server rejects stale client totals and saves the server-calculated split', async () => {
  const writes = [];
  const operator = {uid:'operator',role:'operator',pricing:{driveway:{medium:70}}};
  const customer = {uid:'client',role:'client',propertyDetails:{propertySize:'medium'}};
  const db = {
    doc: path => ({path}), collection: path => ({doc:()=>({id:path==='jobs'?'new-job':'new-chat',path})}),
    runTransaction: fn => fn({get:async ref=>({exists:false,data:()=>ref.path==='users/client'?customer:ref.path==='users/operator'?operator:undefined}),set:(ref,data)=>writes.push({ref,data})}),
  };
  const {POST} = load('src/app/api/jobs/create/route.ts', {
    'next/server':{NextResponse:{json:body=>({body,status:200})}},
    'firebase-admin/firestore':{FieldValue:{serverTimestamp:()=> 'now'}},
    '@/lib/firebaseAdmin':{getAdminDb:()=>db},
    '@/lib/marketplacePricing':pricing,
    '@/lib/operatorDiscovery':{isOperatorPublic:()=>true,isClientWithinOperatorRadius:()=>true,canAcceptPlatformPayments:()=>true},
    '@/lib/workOrderServer':{orderUser:async()=> 'client',validId:x=>!!x,parseSchedule:()=>({}),OrderError:Error,orderFailure:e=>({status:409,error:e.message}),orderEvent:()=>({recipient:'operator',message:'Order created'})},
  });
  const body={requestId:'req',operatorId:'operator',paymentMethod:'credit',expectedPrice:70};
  assert.equal((await POST({json:async()=>body})).status,409);
  assert.equal(writes.length,0);
  assert.equal((await POST({json:async()=>({...body,expectedPrice:100,platformFeeAmount:0})})).status,200);
  const saved=writes.find(x=>x.ref.path==='jobs').data;
  assert.equal(saved.price,100); assert.equal(saved.operatorAmount,7000); assert.equal(saved.platformFeeAmount,3000);
});
