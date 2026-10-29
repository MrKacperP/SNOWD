import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
function load(path) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, require: id => load(`src/lib/${id.split("/").at(-1)}.ts`),
  });
  return exports;
}
const summarize = load("src/lib/activitySummary.ts").activitySummary;
const stamp = seconds => ({ toDate: () => new Date(seconds * 1000) });
test("activity separates recorded payments, completed work and current active work", () => {
  const result = summarize([
    { createdAt: stamp(2), status: "completed", completionTime: stamp(5) },
    { createdAt: stamp(5), status: "completed" },
    { createdAt: stamp(1), status: "in-progress" },
    { createdAt: stamp(6), status: "cancelled" },
  ], [
    { status: "paid", amount: 10000, operatorAmount: 8500, paymentMethod: "credit", completedAt: stamp(5) },
    { status: "held", amount: 5000, createdAt: stamp(5) },
    { status: "refunded", amount: 2000, createdAt: stamp(5) },
    { status: "paid", amount: 1200, paymentMethod: "cash", createdAt: stamp(6) },
    { status: "paid", amount: 3000, createdAt: stamp(1) },
    { status: "paid", amount: 4000 },
    { status: "paid", amount: 4000, createdAt: stamp(12) },
  ], 4000, 10000);
  assert.equal(result.requests, 2);
  assert.equal(result.completed, 1);
  assert.equal(result.active, 1);
  assert.equal(result.paidCents, 9700);
  assert.equal(result.paidCount, 2);
});
test("an empty account has no activity or fabricated totals", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(summarize([], [], 4000, 10000))), { requests: 0, completed: 0, active: 0, paidCents: 0, paidCount: 0 });
});
