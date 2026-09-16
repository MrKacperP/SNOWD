import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const settingsSource = fs.readFileSync("src/app/dashboard/settings/page.tsx", "utf8");
const statusSource = fs.readFileSync("src/app/api/stripe/account-status/route.ts", "utf8");

test("operator payment settings show only Stripe Connect while clients retain payment methods", () => {
  assert.match(settingsSource, /!isOperator && <div className=\{styles\.card\}>/);
  assert.match(settingsSource, /Verified Stripe connection/);
  assert.match(settingsSource, /Stripe email/);
  assert.match(settingsSource, /Payout account/);
});

test("authenticated Stripe status includes safe connected account details", () => {
  assert.match(statusSource, /businessName: account\.business_profile\?\.name/);
  assert.match(statusSource, /email: account\.email/);
  assert.match(statusSource, /last4: payoutAccount\.last4/);
  assert.doesNotMatch(statusSource, /account\.individual/);
});
