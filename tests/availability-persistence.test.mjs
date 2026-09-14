import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

for (const file of ['src/components/Navbar.tsx', 'src/app/dashboard/settings/page.tsx']) {
  for (const available of [true, false]) {
    test(`${file}: sign-out preserves availability=${available}`, async () => {
      const source = fs.readFileSync(file, 'utf8');
      const start = source.indexOf('  const handleSignOut =');
      const end = source.indexOf('\n  };', start) + '\n  };'.length;
      const code = ts.transpileModule(`${source.slice(start, end)}\nhandleSignOut;`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
      const saved = { uid: 'operator', role: 'operator', isAvailable: available, isOnline: false };
      let signedOut = false;
      let route;
      const run = vm.runInNewContext(code, {
        profile: saved, db: {}, doc: () => ({}),
        updateDoc: async (_, changes) => Object.assign(saved, changes),
        signOut: async () => { signedOut = true; },
        router: { push: path => { route = path; } }, console,
      });
      await run();
      assert.equal(signedOut, true);
      assert.equal(route, '/login');
      assert.equal(saved.isAvailable, available);
    });
  }
}

test('an offline available operator remains discoverable; opting out hides them', () => {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('src/lib/operatorDiscovery.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports });
  const operator = { idVerified: true, isOnline: false, isAvailable: true };
  assert.equal(exports.isOperatorPublic(operator), true);
  assert.equal(exports.isOperatorPublic({ ...operator, isAvailable: false }), false);
});
