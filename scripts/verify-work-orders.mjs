// Run only against local Firebase emulators and the isolated QA application.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
dotenv.config({ path: ".env.local", quiet: true });
assert(process.env.FIRESTORE_EMULATOR_HOST === "127.0.0.1:8080");
assert(process.env.FIREBASE_AUTH_EMULATOR_HOST === "127.0.0.1:9099");
initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
const db = getFirestore(),
  auth = getAuth(),
  base = process.env.SNOWD_QA_URL || "http://127.0.0.1:3004";
assert(["127.0.0.1", "localhost"].includes(new URL(base).hostname), "Local QA application required");
const runId = randomUUID().slice(0, 8);
const clientId = `wo-client-${runId}`;
const operatorId = `wo-operator-${runId}`;
const strangerId = `wo-stranger-${runId}`;
const tokens = {};
const address = {
  address: "100 Test Street",
  city: "Toronto",
  province: "ON",
  postalCode: "M5V 1A1",
  lat: 43.65,
  lng: -79.38,
};
for (const [uid, role] of [
  [clientId, "client"],
  [operatorId, "operator"],
  [strangerId, "client"],
]) {
  try {
    await auth.createUser({
      uid,
      email: `${uid}@example.test`,
      password: "Emulator-only-42!",
    });
  } catch (e) {
    if (e.code !== "auth/uid-already-exists") throw e;
  }
  await db
    .doc(`users/${uid}`)
    .set({
      uid,
      role,
      email: `${uid}@example.test`,
      displayName:
        uid === operatorId ? "ABC Snow operator" : "Test customer",
      businessName: role === "operator" ? "ABC Snow" : "",
      ...address,
      onboardingComplete: true,
      idVerified: true,
      isAvailable: true,
      serviceRadius: 10,
      serviceTypes: ["driveway"],
      pricing: { driveway: { small: 30, medium: 40, large: 60 } },
      propertyDetails: { propertySize: "medium", serviceTypes: ["driveway"] },
      simplifiedMode: true,
    });
  const r = await fetch(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: `${uid}@example.test`,
        password: "Emulator-only-42!",
        returnSecureToken: true,
      }),
    },
  );
  tokens[uid] = (await r.json()).idToken;
  assert(tokens[uid]);
}
async function api(path, body, uid = clientId) {
  const r = await fetch(`${base}/api/jobs/${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${tokens[uid] || ""}`,
    },
    body: JSON.stringify(body),
  });
  return { status: r.status, ...(await r.json()) };
}
const data = async (id) => (await db.doc(`jobs/${id}`).get()).data();
const when = (hours) => new Date(Date.now() + hours * 3600000).toISOString();
const booking = {
  operatorId: operatorId,
  paymentMethod: "cash",
  cashPaymentAcknowledged: true,
  expectedPrice: 40,
  scheduleMode: "scheduled",
  scheduledDate: when(24),
  scheduleTimezone: "America/Toronto",
};
async function create(overrides = {}, uid) {
  const result = await api(
    "create",
    { ...booking, requestId: randomUUID(), ...overrides },
    uid,
  );
  assert.equal(result.status, 200, JSON.stringify(result));
  return result;
}
async function action(id, action, uid = operatorId, extra = {}) {
  return api(
    "action",
    {
      jobId: id,
      action,
      ...(action === "en-route" ? { operatorLat: 43.65, operatorLng: -79.38, operatorLocationAccuracy: 10 } : {}),
      revision: (await data(id)).revision || 0,
      requestId: randomUUID(),
      ...extra,
    },
    uid,
  );
}
const ok = (r) => assert.equal(r.status, 200, JSON.stringify(r));
const conflict = (r) => assert.equal(r.status, 409, JSON.stringify(r));
const requestId = randomUUID();
const first = await create({ requestId });
const duplicate = await create({ requestId });
assert.equal(first.jobId, duplicate.jobId);
const second = await create({
  previousOrderId: first.jobId,
  scheduledDate: when(26),
});
assert.notEqual(first.jobId, second.jobId);
assert.notEqual(first.chatId, second.chatId);
assert.notEqual(first.orderNumber, second.orderNumber);
assert.equal(
  (await db.doc(`chats/${first.chatId}`).get()).data().jobId,
  first.jobId,
);
assert.equal((await action(first.jobId, "accept", strangerId)).status, 403);
assert.equal(
  (await api("create", { ...booking, requestId: randomUUID() }, "invalid"))
    .status,
  401,
);
conflict(
  await api("create", {
    ...booking,
    requestId: randomUUID(),
    expectedPrice: 1,
  }),
);
ok(await action(first.jobId, "accept"));
ok(await action(second.jobId, "accept"));
const overlap = await create({ scheduledDate: when(24) });
conflict(await action(overlap.jobId, "accept"));
console.log(
  "PASS fresh identity/chat, idempotent creation, ownership, pricing, future queue and overlap rejection",
);

ok(
  await action(overlap.jobId, "propose-time", operatorId, {
    scheduleMode: "scheduled",
    scheduledDate: when(28),
    scheduleTimezone: "America/Toronto",
  }),
);
const proposal = (await data(overlap.jobId)).scheduleProposal;
conflict(
  await action(overlap.jobId, "approve-time", clientId, {
    proposalId: "stale",
  }),
);
ok(
  await action(overlap.jobId, "approve-time", clientId, {
    proposalId: proposal.id,
  }),
);
const original = (await data(first.jobId)).scheduledDate.toMillis();
ok(
  await action(first.jobId, "propose-time", clientId, {
    scheduleMode: "scheduled",
    scheduledDate: when(30),
    scheduleTimezone: "America/Toronto",
  }),
);
assert.equal((await data(first.jobId)).scheduledDate.toMillis(), original);
ok(
  await action(first.jobId, "decline-time", operatorId, {
    proposalId: (await data(first.jobId)).scheduleProposal.id,
  }),
);
assert.equal((await data(first.jobId)).scheduledDate.toMillis(), original);
const company = await create(
  {
    previousOrderId: first.jobId,
    clientId: clientId,
    scheduledDate: when(32),
    cashPaymentAcknowledged: false,
  },
  operatorId,
);
assert.equal((await data(company.jobId)).cashPaymentAcknowledged, false);
assert.equal((await action(company.jobId, "accept", clientId)).status, 400);
ok(
  await action(company.jobId, "accept", clientId, {
    cashPaymentAcknowledged: true,
  }),
);
console.log(
  "PASS time proposals, stale approvals, preserved appointment on decline, company proposal with explicit customer cash consent",
);

const starts = await Promise.all([
  action(first.jobId, "en-route", operatorId),
  action(second.jobId, "en-route", operatorId),
]);
assert.equal(
  starts.filter((r) => r.status === 200).length,
  1,
  JSON.stringify(starts),
);
assert.equal(
  starts.filter((r) => r.status === 409).length,
  1,
  JSON.stringify(starts),
);
const underway = starts[0].status === 200 ? first : second;
ok(await action(underway.jobId, "in-progress"));
conflict(await action(underway.jobId, "complete"));
ok(
  await action(underway.jobId, "photo", operatorId, {
    completionPhotoUrl: "data:image/png;base64,iVBORw0KGgo=",
  }),
);
assert.equal((await data(underway.jobId)).status, "completed");
assert.equal((await data(underway.jobId)).paymentStatus, "pending");
ok(await api("confirm-cash", { jobId: underway.jobId }, operatorId));
assert.equal((await data(underway.jobId)).paymentStatus, "paid");
conflict(await action(underway.jobId, "accept"));
ok(await api("cancel", { jobId: overlap.jobId }));
ok(await api("cancel", { jobId: overlap.jobId }));
conflict(await action(overlap.jobId, "accept"));
const again = await create({
  previousOrderId: overlap.jobId,
  scheduleMode: "asap",
  scheduledDate: null,
});
assert.equal((await data(overlap.jobId)).status, "cancelled");
assert.equal((await data(again.jobId)).status, "pending");
assert.equal((await data(again.jobId)).stripePaymentIntentId, undefined);
console.log(
  "PASS concurrent start lock, proof requirement, completion, cash receipt, cancellation retry and new request after cancellation",
);

// Payment guards without making a Stripe charge; Stripe sandbox integration runs separately.
await db
  .doc(`jobs/${again.jobId}`)
  .update({
    status: "accepted",
    paymentMethod: "credit",
    paymentStatus: "pending",
  });
conflict(await action(again.jobId, "en-route"));
await db
  .doc(`jobs/${again.jobId}`)
  .update({ status: "pending", paymentMethod: "cash" });

await db
  .doc("chats/wo-legacy")
  .set({ jobId: "wo-legacy-two", participants: [clientId, operatorId] });
for (const id of ["wo-legacy-one", "wo-legacy-two"])
  await db
    .doc(`jobs/${id}`)
    .set({
      ...(await data(first.jobId)),
      chatId: "wo-legacy",
      orderNumber: `legacy-${id}`,
      status: "cancelled",
    });
await db
  .doc("messages/wo-legacy-message")
  .set({
    chatId: "wo-legacy",
    senderId: clientId,
    content: "Ambiguous old message",
    read: false,
  });
const runMigration = (args) => {
  const result = spawnSync(
    "npx",
    ["tsx", "scripts/migrate-work-order-chats.ts", ...args],
    { encoding: "utf8", env: process.env },
  );
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
};
assert.match(runMigration([]), /wo-legacy/);
assert.equal(
  (await db.doc("chats/wo-legacy").get()).data().legacyHistory,
  undefined,
);
runMigration(["--apply"]);
const migrated = await data("wo-legacy-one");
assert.equal(migrated.chatId, "order-wo-legacy-one");
assert.equal(
  (await db.doc("messages/wo-legacy-message").get()).data().jobId,
  undefined,
);
runMigration(["--apply"]);
assert.equal((await data("wo-legacy-one")).revision, migrated.revision);
assert.equal(
  (await db.doc("chats/wo-legacy").get()).data().legacyHistory,
  true,
);
console.log(
  "PASS migration dry run, preserved ambiguous history and idempotent rerun",
);
console.log(
  "All work-order integration checks passed. Emulator fixtures remain available for browser verification.",
);
