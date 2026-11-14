import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(file, deps = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, require: name => deps[name] || {} });
  return exports;
}
const policy = load('src/lib/admin/pricing.ts');
const { quoteMarketplace } = load('src/lib/marketplacePricing.ts', { './admin/pricing': policy });
test('default configured fees preserve the current customer price and operator proceeds', () => {
  const original = quoteMarketplace(40, 'credit');
  const updated = quoteMarketplace(40, 'credit', policy.DEFAULT_POLICY);
  assert.equal(updated.price, original.price);
  assert.equal(updated.operatorAmount, 4000);
  assert.equal(updated.platformFeeAmount, original.platformFeeAmount);
});
test('discount applies only to platform fees, including the transaction fee', () => {
  const quote = quoteMarketplace(80, 'credit', { commissionPercent: 20, transactionFeeCents: 200, discountPercent: 50 });
  assert.equal(quote.price, 91);
  assert.equal(quote.operatorAmount, 8000);
  assert.equal(quote.platformFeeAmount, 1100);
  assert.equal(quote.pricingVersion, 3);
});
test('100% fee discount preserves operator amount and cash remains unchanged', () => {
  const terms = { commissionPercent: 50, transactionFeeCents: 10000, discountPercent: 100 };
  assert.equal(quoteMarketplace(40, 'credit', terms).price, 40);
  assert.equal(quoteMarketplace(40, 'cash', terms).price, 40);
});
test('invalid financial inputs are rejected rather than saved or charged', () => {
  for (const commissionPercent of [-1, 51, NaN, Infinity, '30']) assert.throws(() => policy.validatePolicy({ ...policy.DEFAULT_POLICY, commissionPercent }));
  for (const transactionFeeCents of [-1, 10001, 1.5]) assert.throws(() => policy.validatePolicy({ ...policy.DEFAULT_POLICY, transactionFeeCents }));
  for (const discountPercent of [-1, 101, NaN]) assert.throws(() => policy.validatePolicy({ ...policy.DEFAULT_POLICY, discountPercent }));
  for (const price of [0, -1, Infinity, NaN]) assert.throws(() => quoteMarketplace(price, 'credit', policy.DEFAULT_POLICY));
});
