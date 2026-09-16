import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const source = ts.transpileModule(
  fs.readFileSync("src/components/work-orders/OrderActions.tsx", "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  },
).outputText;
function setup({
  uid = "operator",
  fail = false,
  pathname = "/dashboard/jobs",
  secret = "",
} = {}) {
  const routes = [],
    calls = [],
    updates = [],
    state = [];
  let index = 0;
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    window: { location: { pathname } },
    crypto: { randomUUID: () => "request-id" },
    require(id) {
      if (id === "react")
        return {
          useRef: (value) => ({ current: value }),
          useState: (initial) => {
            const i = index++;
            state[i] = i === 8 ? secret : initial;
            return [
              state[i],
              (value) => {
                state[i] = value;
              },
            ];
          },
        };
      if (id === "react/jsx-runtime") return require(id);
      if (id === "next/navigation")
        return { useRouter: () => ({ push: (route) => routes.push(route) }) };
      if (id.includes("AuthContext"))
        return { useAuth: () => ({ user: { uid } }) };
      if (id.includes("stripeConnectClient"))
        return {
          stripeConnectFetch: async (url) => {
            calls.push(url);
            return {
              ok: !fail,
              json: async () =>
                fail
                  ? { error: "Unable to accept" }
                  : { clientSecret: "checkout-secret" },
            };
          },
        };
      if (id.includes("workOrders"))
        return {
          orderNumber: () => "42",
          scheduleText: () => "Tomorrow",
          orderActionNeeded: () => "Review request",
        };
      if (id === "next/dynamic")
        return { __esModule: true, default: () => "checkout" };
      return { __esModule: true, default: "stub" };
    },
  });
  const job = {
    id: "job-42",
    clientId: "client",
    operatorId: "operator",
    status: uid === "operator" ? "pending" : "accepted",
    paymentMethod: "credit",
    paymentStatus: "pending",
    price: 45,
  };
  const tree = exports.default({
    job,
    onUpdated: (message) => updates.push(message),
  });
  function find(node, predicate) {
    if (!node || typeof node !== "object") return;
    if (predicate(node)) return node;
    for (const child of [node.props?.children].flat(Infinity)) {
      const match = find(child, predicate);
      if (match) return match;
    }
  }
  return {
    routes,
    calls,
    updates,
    state,
    find: (predicate) => find(tree, predicate),
  };
}
const settle = () => new Promise((resolve) => setImmediate(resolve));
test("accepting from the list continues into that work order", async () => {
  const ui = setup();
  ui.find(
    (n) => n.type === "button" && n.props.children === "Accept",
  ).props.onClick();
  await settle();
  assert.deepEqual(ui.routes, ["/dashboard/jobs/job-42"]);
  assert.equal(ui.updates.length, 1);
});
test("failed actions stay in place and show the error", async () => {
  const ui = setup({ fail: true });
  ui.find(
    (n) => n.type === "button" && n.props.children === "Accept",
  ).props.onClick();
  await settle();
  assert.deepEqual(ui.routes, []);
  assert.ok(ui.state.includes("Unable to accept"));
});
test("actions inside a work order do not navigate away", async () => {
  const ui = setup({ pathname: "/dashboard/jobs/job-42" });
  ui.find(
    (n) => n.type === "button" && n.props.children === "Accept",
  ).props.onClick();
  await settle();
  assert.deepEqual(ui.routes, []);
  assert.equal(ui.updates.length, 1);
});
test("opening card checkout does not navigate or report a completed update", async () => {
  const ui = setup({ uid: "client" });
  await ui
    .find(
      (n) =>
        n.type === "button" &&
        Array.isArray(n.props.children) &&
        n.props.children[0].includes("Authorize card"),
    )
    .props.onClick();
  assert.deepEqual(ui.routes, []);
  assert.deepEqual(ui.updates, []);
  assert.ok(ui.state.includes("checkout-secret"));
});

test("successful checkout continues into the paid work order", async () => {
  const ui = setup({ uid: "client", secret: "checkout-secret" });
  await ui.find((n) => n.type === "checkout").props.onSuccess("pi-test");
  assert.deepEqual(ui.routes, ["/dashboard/jobs/job-42"]);
  assert.deepEqual(ui.calls, ["/api/stripe/payment-status"]);
});
