import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function loadEmail(profile, calls, apiKey = "re_test") {
  const code = ts.transpileModule(fs.readFileSync("src/lib/emailNotifications.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  class Resend {
    emails = { send: async (message, options) => { calls.push({ message, options }); return { data: { id: "email_1" } }; } };
  }
  vm.runInNewContext(code, {
    exports,
    process: { env: { RESEND_API_KEY: apiKey, NEXT_PUBLIC_APP_URL: "https://www.snowd.ca" } },
    require: name => name === "resend" ? { Resend } : name === "@/lib/firebaseAdmin" ? { getAdminDb: () => ({ doc: () => ({ get: async () => ({ exists: true, data: () => profile }) }) }) } : (() => { throw Error(name); })(),
  });
  return exports;
}

test("work-order email respects preferences and uses a retry-safe key", async () => {
  const disabledCalls = [];
  const disabled = loadEmail({ email: "person@example.com", displayName: "Pat", emailNotifications: { workOrders: false } }, disabledCalls);
  assert.equal((await disabled.sendWorkOrderEmail("uid", "job", "Order updated", "event")).reason, "disabled");
  assert.equal(disabledCalls.length, 0);

  const calls = [];
  const enabled = loadEmail({ email: "person@example.com", displayName: "Pat", emailNotifications: { workOrders: true } }, calls);
  await enabled.sendWorkOrderEmail("uid", "job", "Order updated", "event");
  assert.equal(calls[0].options.idempotencyKey, "work-order-job-event");
  assert.match(calls[0].message.html, /View work order/);
});

test("email delivery safely disables itself until Resend is configured", async () => {
  const email = loadEmail({ email: "person@example.com" }, [], "");
  assert.equal((await email.sendWelcomeEmail("uid")).reason, "not-configured");
});
