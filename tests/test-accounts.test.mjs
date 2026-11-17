import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const exports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/admin/testAccounts.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports });
const { isTestAccountEmail, involvesTestAccount } = exports;

test('recognises the three test emails regardless of case and spacing', () => {
  for (const email of ['adamcosza@gmail.com', 'HenryMurski@gmail.com', ' prymiczkacper@gmail.com ']) assert.equal(isTestAccountEmail(email), true);
  for (const email of ['kacperprymicz@gmail.com', '', null, undefined]) assert.equal(isTestAccountEmail(email), false);
});

test('a payment is excluded when either the client or the operator is a test account', () => {
  const testIds = new Set(['t1']);
  assert.equal(involvesTestAccount({ clientId: 't1', operatorId: 'real' }, testIds), true);
  assert.equal(involvesTestAccount({ clientId: 'real', operatorId: 't1' }, testIds), true);
  assert.equal(involvesTestAccount({ clientId: 'real', operatorId: 'other' }, testIds), false);
  assert.equal(involvesTestAccount({}, testIds), false);
});
