import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(path, stubs = {}) {
  const source = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require: id => stubs[id] || {} });
  return exports;
}

test("primary navigation keeps four role-specific tasks", () => {
  const nav = load("src/lib/appNavigation.ts", {
    "lucide-react": { Home: "home", Shovel: "shovel", ClipboardList: "jobs", MessageSquare: "messages", Briefcase: "payments" },
  }).primaryNavigation;
  assert.deepEqual(Array.from(nav("client"), item => item.label), ["Home", "Book help", "Jobs", "Messages"]);
  assert.deepEqual(Array.from(nav("operator"), item => item.label), ["Home", "Jobs", "Messages", "Payments"]);
});

test("work order presentation exposes one next action and honest payment copy", () => {
  const presentation = load("src/lib/workOrderPresentation.ts", {
    "@/lib/workOrders": {
      orderLabel: job => job.status,
      orderActionNeeded: (job, uid) => job.status === "accepted" && job.clientId === uid ? "Authorize card payment" : "",
    },
  }).workOrderPresentation;
  const base = { id: "1", clientId: "client", operatorId: "operator", paymentMethod: "credit", paymentStatus: "pending" };
  const accepted = presentation({ ...base, status: "accepted" }, "client");
  assert.equal(accepted.nextAction, "Authorize card payment");
  assert.match(accepted.paymentMessage, /authorization needed/i);
  const complete = presentation({ ...base, status: "completed", paymentStatus: "paid" }, "client");
  assert.equal(complete.title, "All clear.");
  assert.match(complete.paymentMessage, /successful/i);
});
