import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const exports = {};
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync("src/lib/workOrders.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  { exports, require: () => ({}), Date, Intl },
);
const job = {
  id: "one",
  clientId: "client",
  operatorId: "operator",
  status: "pending",
  paymentMethod: "cash",
  paymentStatus: "pending",
  scheduleMode: "scheduled",
  scheduledDate: new Date("2030-01-01T14:00:00Z"),
  scheduledTime: "09:00",
  estimatedDuration: 45,
};
test("order labels separate approval, payment and work state", () => {
  assert.equal(exports.orderLabel(job), "Awaiting company");
  assert.equal(
    exports.orderLabel({ ...job, awaitingResponseFrom: "client" }),
    "Awaiting customer",
  );
  assert.equal(
    exports.orderLabel({ ...job, status: "accepted", paymentMethod: "credit" }),
    "Payment needed",
  );
  assert.equal(exports.orderLabel({ ...job, status: "accepted" }), "Scheduled");
  assert.equal(
    exports.orderLabel({ ...job, status: "cancelled" }),
    "Cancelled",
  );
});
test("schedule conflict uses duration, excludes pending and ASAP, and permits adjacent slots", () => {
  const confirmed = { ...job, id: "two", status: "accepted" };
  assert.equal(exports.hasScheduleConflict(job, [confirmed]), true);
  assert.equal(
    exports.hasScheduleConflict(job, [{ ...confirmed, status: "pending" }]),
    false,
  );
  assert.equal(
    exports.hasScheduleConflict(job, [{ ...confirmed, scheduleMode: "asap" }]),
    false,
  );
  assert.equal(
    exports.hasScheduleConflict(job, [
      { ...confirmed, scheduledDate: new Date("2030-01-01T14:45:00Z") },
    ]),
    false,
  );
  assert.equal(
    exports.hasScheduleConflict(job, [
      { ...confirmed, scheduledDate: new Date("2030-01-01T14:44:00Z") },
    ]),
    true,
  );
});
test("terminal orders stay in history even with payment pending", () => {
  assert.equal(
    exports.orderSection({ ...job, status: "completed" }, "client"),
    "history",
  );
  assert.equal(
    exports.orderSection({ ...job, status: "cancelled" }, "client"),
    "history",
  );
  assert.equal(
    exports.orderSection(
      {
        ...job,
        status: "accepted",
        scheduleProposal: { recipientId: "client" },
      },
      "client",
    ),
    "attention",
  );
});

test("unpaid completed cash work stays actionable only for its operator", () => {
  const completed = { ...job, status: "completed" };
  assert.equal(exports.orderSection(completed, "operator"), "attention");
  assert.equal(exports.orderActionNeeded(completed, "operator"), "Confirm cash payment");
  assert.equal(exports.orderActionNeeded(completed, "client"), "");
  assert.equal(exports.orderSection({ ...completed, paymentStatus: "paid" }, "operator"), "history");
  assert.equal(exports.orderSection({ ...completed, paymentMethod: "credit" }, "operator"), "history");
  assert.equal(exports.orderActionNeeded({ ...completed, status: "cancelled" }, "operator"), "");
});
test("request action badges follow the intended recipient", () => {
  assert.equal(exports.orderActionNeeded(job, "operator"), "Accept or decline request");
  assert.equal(exports.orderActionNeeded(job, "client"), "");
  const proposal = { ...job, scheduleProposal: { recipientId: "client" } };
  assert.equal(exports.orderActionNeeded(proposal, "client"), "Review proposed time");
  assert.equal(exports.orderActionNeeded(proposal, "operator"), "");
});
