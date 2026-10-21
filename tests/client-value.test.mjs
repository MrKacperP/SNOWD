import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const api = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/clientValue.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: api, Date });
test('time saved counts completed service only and rejects unusable durations', () => {
  assert.equal(api.estimatedTimeSaved([{ status:'completed', estimatedDuration:45 }, { status:'completed', estimatedDuration:60 }, { status:'accepted', estimatedDuration:45 }, { status:'cancelled', estimatedDuration:45 }, { status:'completed', estimatedDuration:-10 }, { status:'completed', estimatedDuration:NaN }]),105);
  assert.equal(api.timeSavedLabel(105),'1 hr 45 min');
  assert.equal(api.timeSavedLabel(0),'0 min');
});
test('arrival counts down a stored arrival time without inventing arrival after it expires', () => {
  const now = Date.parse('2026-10-20T14:00:00Z');
  const job = { status:'en-route', estimatedArrivalAt:{seconds:(now + 12*60000)/1000}, eta:20 };
  assert.equal(api.arrivalLabel(job, now),'~12 min away');
  assert.equal(api.arrivalLabel(job, now + 15*60000),'Arrival update due');
  assert.equal(api.arrivalLabel({...job, status:'accepted'},now),'ETA when on the way');
  assert.equal(api.arrivalLabel({...job,status:'in-progress'},now),'Clearing now');
  assert.equal(api.arrivalLabel({status:'en-route'},now),'ETA updating');
});
