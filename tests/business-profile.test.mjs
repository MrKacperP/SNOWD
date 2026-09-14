import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync('src/app/dashboard/settings/page.tsx', 'utf8');
function handler(name, mocks) {
  const start = source.indexOf(`  const ${name} =`);
  const end = source.indexOf('\n  };', start) + '\n  };'.length;
  const code = ts.transpileModule(`${source.slice(start, end)}\n${name};`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  return vm.runInNewContext(code, mocks);
}
test('business save publishes all identity fields and portfolio together', async () => {
  let saved;
  await handler('saveBranding', {
    profile: { uid: 'operator' }, brandingBusy: false, saving: false,
    brandingTagline: 'Your local snow team', brandingDescription: 'Work description',
    logoUrl: 'https://example.test/logo', avatarUrl: 'https://example.test/avatar', portfolioPhotos: ['https://example.test/work'],
    setSaved() {}, setSaving() {}, setFeedback() {}, setTimeout() {}, wait: async () => {},
    db: {}, doc: () => ({}), updateDoc: async (_, fields) => { saved = fields; }, refreshProfile: async () => {}, console,
  })();
  assert.deepEqual(JSON.parse(JSON.stringify(saved)), {
    tagline: 'Your local snow team', brandDescription: 'Work description',
    logoUrl: 'https://example.test/logo', avatar: 'https://example.test/avatar', portfolioPhotos: ['https://example.test/work'],
  });
});
test('logo uploads stage a unique image without publishing until save', async () => {
  let draft;
  let path;
  await handler('handleLogoUpload', {
    profile: { uid: 'operator' }, storage: {}, crypto: { randomUUID: () => 'unique' },
    ref: (_, value) => { path = value; return {}; }, uploadBytes: async () => {}, getDownloadURL: async () => 'https://example.test/new-logo',
    setUploadingLogo() {}, setLogoUrl: value => { draft = value; }, setAvatarUrl() {}, setSaved() {}, setFeedback() {}, console,
    updateDoc: () => { throw new Error('Upload must not publish a profile'); },
  })({ target: { files: [{ type: 'image/png', size: 100 }] } });
  assert.equal(path, 'branding/operator/logo/unique');
  assert.equal(draft, 'https://example.test/new-logo');
});
