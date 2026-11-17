import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const load = (file, mocks) => {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, require: key => mocks[key] });
  return exports;
};
const workOrders = load('src/lib/workOrders.ts', {});
const types = { SERVICE_LABELS: { driveway: 'Driveway', porch: 'Walkway' } };
const support = load('src/lib/supportJob.ts', { '@/lib/types': types, '@/lib/workOrders': workOrders });

const job = (id, status, updated, extra = {}) => ({ id, status, updatedAt: { toDate: () => new Date(updated) }, serviceTypes: ['driveway'], address: '1 King St', city: 'Toronto', paymentMethod: 'cash', paymentStatus: 'pending', ...extra });

test('open jobs are offered first, newest first, at most three', () => {
  const list = [job('a', 'completed', 5), job('b', 'accepted', 1), job('c', 'en-route', 3), job('d', 'pending', 2), job('e', 'in-progress', 4)];
  const { jobs, active } = support.supportJobChoices(list);
  assert.equal(active, true);
  assert.deepEqual([...jobs.map(j => j.id)], ['e', 'c', 'd']);
});

test('with nothing open, only the most recent past job is offered', () => {
  const { jobs, active } = support.supportJobChoices([job('old', 'completed', 1), job('new', 'cancelled', 9)]);
  assert.equal(active, false);
  assert.deepEqual([...jobs.map(j => j.id)], ['new']);
  assert.equal(support.supportJobChoices([]).jobs.length, 0);
});

test('a job reference carries the order number, services and status, and reads back safely', () => {
  const ref = support.supportJobRef(job('xyz', 'en-route', 1, { orderNumber: '1042', serviceTypes: ['driveway', 'porch'] }));
  assert.deepEqual({ ...ref }, { jobId: 'xyz', orderNumber: '1042', title: 'Driveway, Walkway', address: '1 King St, Toronto', status: 'en-route', statusLabel: 'On the way' });
  assert.equal(support.supportJobLine(ref), 'About order #1042 · Driveway, Walkway · On the way');
  assert.deepEqual({ ...support.readSupportJobRef(ref) }, { ...ref });
  assert.equal(support.readSupportJobRef({ orderNumber: '1' }), null);
  assert.equal(support.readSupportJobRef(null), null);
});
