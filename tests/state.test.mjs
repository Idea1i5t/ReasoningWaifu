import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const { outputFiles } = await build({
  entryPoints: [new URL('../src/state.ts', import.meta.url).pathname],
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const { parseFamily, parseThinking, assetKey, readPicker, placeCharacter } = await import(
  `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`
);

test('model labels are bounded; Lite, Pro subscription text and prose cannot collide', () => {
  assert.equal(parseFamily('3.5 Flash-Lite'), 'flash-lite');
  assert.equal(parseFamily('3.6 Flash'), 'flash');
  assert.equal(parseFamily('Gemini 3.1 Pro'), 'pro');
  for (const label of ['Google AI Pro', 'I like Flash', 'Flash Max', '', 'Auto']) {
    assert.equal(parseFamily(label), null);
  }
});

test('verified picker distinguishes standard, extended, signed-out and inconsistent renders', () => {
  for (const [label, family] of [['Flash-Lite', 'flash-lite'], ['Flash', 'flash'], ['Pro', 'pro']]) {
    assert.equal(readPicker(label, null, `打开模式选择器，当前模式为“${label}”`), `${family}-standard`);
    assert.equal(readPicker(label, '扩展', `打开模式选择器，当前模式为“${label} 扩展”`), `${family}-extended`);
  }
  assert.equal(readPicker(null, null, '打开模式选择器，当前模式为“Flash-Lite”'), 'unknown');
  assert.equal(readPicker('Pro', null, '打开模式选择器，当前模式为“Flash”'), 'unknown');
  assert.equal(readPicker('Pro', 'Deep Think', '打开模式选择器，当前模式为“Pro Deep Think”'), 'unknown');
  assert.equal(readPicker('Pro', null, ''), 'unknown');
});

test('all six explicit combinations work; missing or unsupported thinking is unknown', () => {
  for (const family of ['flash-lite', 'flash', 'pro']) {
    assert.equal(assetKey(family, parseThinking('Standard')), `${family}-standard`);
    assert.equal(assetKey(family, parseThinking('扩展思考')), `${family}-extended`);
    assert.equal(assetKey(family, parseThinking('Deep Think')), 'unknown');
    assert.equal(assetKey(family, parseThinking('')), 'unknown');
  }
  assert.equal(assetKey(null, 'extended'), 'unknown');
});

test('placement avoids the composer, remains in viewport and yields on narrow chat layouts', () => {
  const viewport = { width: 1280, height: 720 };
  const chat = { left: 288, top: 70, right: 1268, bottom: 708 };
  const composer = { left: 448, top: 316, right: 1108, bottom: 380 };
  const welcome = placeCharacter(viewport, chat, composer, true);
  assert.ok(welcome.top > composer.bottom);
  assert.ok(welcome.left + welcome.width <= viewport.width);
  const conversation = placeCharacter(viewport, chat, { ...composer, top: 610, bottom: 680 }, false);
  assert.ok(conversation.left > composer.right);
  assert.equal(placeCharacter({ width: 700, height: 720 },
    { ...chat, left: 0, right: 700 }, { ...composer, left: 20, right: 680 }, false), null);
});
