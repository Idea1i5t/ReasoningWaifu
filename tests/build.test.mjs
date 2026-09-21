import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Script } from 'node:vm';
import { build } from 'esbuild';

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

test('twelve transparent PNGs are packaged without unused placeholders', async () => {
  const resources = manifest.web_accessible_resources.flatMap(rule => rule.resources);
  assert.equal(resources.length, 12);
  assert.equal(new Set(resources).size, 12);
  const pngDimensions = {
    'assets/gemini/pro-extended.png': [1122, 1402],
    'assets/gemini/unknown.png': [1254, 1254],
    'assets/gemini/pro-standard-welcome.png': [999, 1574],
    'assets/gemini/pro-standard-chat.png': [1122, 1402],
    'assets/gemini/flash-extended-chat.png': [1125, 1398],
    'assets/gemini/flash-standard-chat.png': [1125, 1398],
    'assets/gemini/flash-lite-standard-chat.png': [1254, 1254],
    'assets/gemini/flash-lite-extended-chat.png': [1254, 1254],
    'assets/gemini/flash-lite-standard-welcome.png': [1254, 1254],
    'assets/gemini/flash-lite-extended-welcome.png': [1254, 1254],
    'assets/gemini/flash-standard-welcome.png': [1699, 926],
    'assets/gemini/flash-extended-welcome.png': [937, 1678],
  };
  for (const path of Object.keys(pngDimensions)) assert.ok(resources.includes(path));
  for (const resource of resources) {
    assert.match(resource, /^assets\/gemini\/[a-z-]+\.png$/);
    const png = await readFile(new URL(resource, dist));
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], pngDimensions[resource]);
    assert.equal(png[25], 6, 'PNG must have RGB and alpha channels');
  }
});

test('every model/page configuration has its own entry and a packaged matching asset', async () => {
  const { outputFiles } = await build({ entryPoints: [new URL('../src/artworks.ts', import.meta.url).pathname],
    bundle: true, platform: 'node', format: 'esm', write: false });
  const { ARTWORKS } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);
  assert.equal(Object.keys(ARTWORKS).length, 14);
  assert.equal(new Set(Object.values(ARTWORKS)).size, 14);
  const resources = new Set(manifest.web_accessible_resources.flatMap(rule => rule.resources));
  for (const config of Object.values(ARTWORKS)) {
    assert.ok(resources.has(config.file), `${config.file} must be declared and packaged`);
    const image = await readFile(new URL(config.file, dist));
    const ratio = config.file.endsWith('.png') ? image.readUInt32BE(16) / image.readUInt32BE(20) : 400 / 520;
    assert.ok(Math.abs(config.aspectRatio - ratio) < 0.0001, `${config.file} aspect ratio`);
  }
});
