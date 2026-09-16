import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const overlay = fs.readFileSync("src/components/TutorialOverlay.tsx", "utf8");
const navbar = fs.readFileSync("src/components/Navbar.tsx", "utf8");
const mobileNavigation = fs.readFileSync("src/components/dashboard/MobileNavigation.tsx", "utf8");

test("tour advances one step at a time even when a target is unavailable", () => {
  assert.match(overlay, /setStep\(value => value \+ 1\)/);
  assert.doesNotMatch(overlay, /findStepInDirection/);
  assert.match(overlay, /steps\.map\(\(item, index\)/);
});

test("desktop and mobile navigation expose the tour anchors they render", () => {
  for (const anchor of ["nav-home", "nav-jobs", "nav-messages", "profile-menu"]) {
    assert.ok(navbar.includes(anchor) || mobileNavigation.includes(anchor), `missing ${anchor}`);
  }
  assert.match(mobileNavigation, /data-tour=\{tour\}/);
  assert.match(navbar, /data-tour=\{tour\}/);
});
