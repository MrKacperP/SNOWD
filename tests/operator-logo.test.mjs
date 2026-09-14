import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const exports = {};
const code = ts.transpileModule(fs.readFileSync('src/components/UserAvatar.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
vm.runInNewContext(code, { exports, require: id => id === 'next/image' ? (() => null) : require(id) });
test('operator business logo takes precedence and is displayed without cropping', () => {
  const image = exports.default({ role: 'operator', logoURL: '/business.png', photoURL: '/person.png', displayName: 'Snow team' });
  assert.equal(image.props.src, '/business.png');
  assert.equal(image.props.alt, 'Snow team logo');
  assert.match(image.props.className, /object-contain/);
});
test('operators without logos use their photo, while clients retain their own photo', () => {
  assert.equal(exports.default({ role: 'operator', photoURL: '/person.png' }).props.src, '/person.png');
  assert.equal(exports.default({ role: 'client', logoURL: '/business.png', photoURL: '/client.png' }).props.src, '/client.png');
});
