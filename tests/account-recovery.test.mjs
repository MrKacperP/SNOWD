import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const code = ts.transpileModule(fs.readFileSync('src/context/AuthContext.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
function setup(getDoc) {
  const states = [], effects = [];
  let index = 0, authChanged;
  const react = { createContext: () => ({ Provider: 'provider' }), useCallback: fn => fn, useEffect: fn => effects.push(fn), useState: initial => {
    const key = index++; if (!(key in states)) states[key] = initial;
    return [states[key], value => { states[key] = value; }];
  }};
  const exports = {};
  vm.runInNewContext(code, { exports, console: { error() {}, warn() {} }, require(name) {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'firebase/auth') return { onAuthStateChanged: (_, fn) => { authChanged = fn; return () => {}; } };
    if (name === 'firebase/firestore') return { getDoc, doc: () => ({}), onSnapshot: (_, next) => { next({ exists: () => false }); return () => {}; } };
    if (name === '@/lib/firebase') return { auth: {}, db: {}, isFirebaseConfigured: true };
    return {};
  }});
  const render = () => { index = 0; return exports.AuthProvider({ children: 'application' }); };
  render(); effects[0]();
  return { states, render, auth: user => authChanged(user) };
}
test('an unreadable account shows recovery instead of rendering onboarding redirects', async () => {
  const s = setup(async () => { throw Error('offline'); });
  await s.auth({ uid: 'existing-user' });
  assert.equal(s.states[2], true); assert.equal(s.states[3], false);
  const page = s.render().props.children;
  assert.equal(page.type, 'main');
  assert.equal(page.props.children.props.role, 'alert');
  assert.equal(page.props.children.props.children[0].props.children, 'Let’s reconnect');
});
test('a readable missing profile continues into normal first-use routing', async () => {
  const s = setup(async () => ({ exists: () => false }));
  await s.auth({ uid: 'new-user' });
  assert.equal(s.states[2], false); assert.equal(s.render().props.children, 'application');
});
