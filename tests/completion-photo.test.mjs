import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import crypto from "node:crypto";
function load(path, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, require: name => globals.modules?.[name] || {}, ...globals });
  return exports;
}
const jpeg = "data:image/jpeg;base64,/9j/AAAA";
const photos = load("src/lib/completionPhoto.ts");
test("photo validation rejects non-images and oversized payloads", () => {
  assert.equal(photos.validCompletionPhoto(jpeg), true);
  for (const value of [null, "data:image/svg+xml;base64,AAAA", "https://example.com/photo.jpg", "data:image/jpeg;base64,hello", jpeg + "A".repeat(700000)]) assert.equal(photos.validCompletionPhoto(value), false);
});
test("photo preparation retries compression and releases the object URL", async () => {
  let attempts = 0, released = false;
  const canvas = { getContext: () => ({ fillRect() {}, drawImage() {} }), toDataURL: () => ++attempts === 1 ? jpeg + "A".repeat(700000) : jpeg };
  const module = load("src/lib/completionPhoto.ts", {
    URL: { createObjectURL: () => "blob:test", revokeObjectURL: () => { released = true; } },
    Image: class { naturalWidth = 4000; naturalHeight = 3000; set src(value) { queueMicrotask(() => this.onload()); } },
    document: { createElement: () => canvas },
  });
  assert.equal(await module.prepareCompletionPhoto({ size: 10000, type: "image/jpeg" }), jpeg);
  assert.equal(attempts, 2);
  assert.equal(released, true);
  assert.ok(canvas.width <= 1600);
});
function routeHarness() {
  const records = new Map([["jobs/job1", { operatorId: "operator", status: "in-progress" }]]);
  const tx = { get: async ref => ({ data: () => records.get(ref) }), set: (ref, data) => records.set(ref, data), update: (ref, data) => records.set(ref, { ...records.get(ref), ...data }) };
  class OrderError extends Error { constructor(message, status = 409) { super(message); this.status = status; } }
  const route = load("src/app/api/jobs/photo-transfer/route.ts", { modules: {
    "node:crypto": crypto,
    "next/server": { NextResponse: { json: (data, options) => ({ data, status: options?.status || 200 }) } },
    "firebase-admin/firestore": { FieldValue: { delete: () => null } },
    "@/lib/firebaseAdmin": { getAdminDb: () => ({ doc: path => path, runTransaction: callback => callback(tx) }) },
    "@/lib/completionPhoto": photos,
    "@/lib/workOrderServer": { OrderError, validId: value => typeof value === "string" && /^[a-zA-Z0-9_-]{1,150}$/.test(value), orderUser: async request => { if (!request.uid) throw new OrderError("Sign in", 401); return request.uid; }, orderFailure: error => ({ status: error.status || 500, data: { error: error.message } }) },
  } });
  return { records, call: (body, uid = "operator") => route.POST({ uid, headers: { get: () => null }, text: async () => JSON.stringify({ jobId: "job1", ...body }) }) };
}
test("QR upload transfers a photo without granting phone access to the job", async () => {
  const { call, records } = routeHarness();
  assert.equal((await call({ action: "create" }, "customer")).status, 403);
  assert.equal((await call({ action: "create" }, null)).status, 401);
  const { data: session } = await call({ action: "create" });
  assert.equal((await call({ action: "upload", token: "0".repeat(64), photo: jpeg }, null)).status, 403);
  assert.equal((await call({ action: "upload", token: session.token, photo: "bad" }, null)).status, 400);
  assert.equal((await call({ action: "upload", token: session.token, photo: jpeg }, null)).status, 200);
  assert.equal((await call({ action: "status", sessionId: session.sessionId })).data.photo, jpeg);
  await call({ action: "upload", token: session.token, photo: jpeg + "AAAA" }, null);
  assert.equal((await call({ action: "status", sessionId: session.sessionId })).data.photo, jpeg);
  assert.equal(records.get("jobs/job1").completionPhotoUrl, undefined);
  await call({ action: "close", sessionId: session.sessionId });
  assert.equal((await call({ action: "upload", token: session.token, photo: jpeg }, null)).status, 410);
});
test("replaced, expired, and closed-order links cannot upload", async () => {
  const { call, records } = routeHarness();
  const first = (await call({ action: "create" })).data;
  const second = (await call({ action: "create" })).data;
  assert.equal((await call({ action: "close", sessionId: first.sessionId })).status, 410);
  assert.equal((await call({ action: "upload", token: first.token, photo: jpeg }, null)).status, 403);
  records.get("photoTransfers/job1").expiresAt = 0;
  assert.equal((await call({ action: "upload", token: second.token, photo: jpeg }, null)).status, 410);
  const third = (await call({ action: "create" })).data;
  records.get("jobs/job1").status = "completed";
  assert.equal((await call({ action: "upload", token: third.token, photo: jpeg }, null)).status, 409);
});
