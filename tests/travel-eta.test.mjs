import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load() {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('src/lib/travelEta.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { exports, process: { env: {} }, Math, fetch, AbortSignal, console });
  return exports;
}

test('fallback ETA grows with distance and always leaves a practical minimum', () => {
  const { fallbackDrivingEta } = load();
  const origin = { lat: 43.589, lng: -79.644 };
  const nearby = fallbackDrivingEta(origin, { lat: 43.595, lng: -79.64 });
  const farther = fallbackDrivingEta(origin, { lat: 43.72, lng: -79.38 });
  assert.ok(nearby >= 3);
  assert.ok(farther > nearby);
});

test('ETA calculation works without the external route service', async () => {
  const { calculateTravelEta } = load();
  const eta = await calculateTravelEta({ lat: 43.589, lng: -79.644 }, { lat: 43.65, lng: -79.58 });
  assert.equal(eta.source, 'estimate');
  assert.ok(eta.minutes >= 3);
});
