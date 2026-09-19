import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Script } from 'node:vm';

const dist = new URL('../dist/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', dist), 'utf8'));

test('Chrome entry points are packaged as standalone classic scripts', async () => {
  assert.equal(manifest.manifest_version, 3);
  for (const script of manifest.content_scripts.flatMap(entry => entry.js)) {
    const code = await readFile(new URL(script, dist), 'utf8');
    assert.ok(code.trim().length > 0);
    assert.doesNotThrow(() => new Script(code));
  }
});

test('site access remains scoped to Gemini, without extra API permissions', () => {
  assert.deepEqual(manifest.permissions ?? [], []);
  assert.deepEqual(manifest.host_permissions ?? [], []);
  for (const entry of manifest.content_scripts) {
    assert.deepEqual(entry.matches, ['https://gemini.google.com/*']);
    assert.equal(entry.all_frames, false);
  }
  for (const entry of manifest.web_accessible_resources) {
    assert.deepEqual(entry.matches, ['https://gemini.google.com/*']);
  }
});

test('all seven individually declared placeholder resources exist in the package', async () => {
  const resources = manifest.web_accessible_resources.flatMap(rule => rule.resources);
  assert.equal(resources.length, 7);
  assert.equal(new Set(resources).size, 7);
  for (const resource of resources) {
    assert.match(resource, /^assets\/gemini\/[a-z-]+\.svg$/);
    const svg = await readFile(new URL(resource, dist), 'utf8');
    assert.match(svg, /<svg\b/);
    assert.match(svg, /viewBox="0 0 400 520"/);
  }
});
