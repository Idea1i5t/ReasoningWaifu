import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const { outputFiles } = await build({
  stdin: { contents: "export * from './state'; export { ARTWORKS } from './artworks';",
    resolveDir: new URL('../src/', import.meta.url).pathname, loader: 'ts' },
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const { ARTWORKS, parseFamily, parseThinking, assetKey, readPicker, placeCharacter, artworkKey, assetPath } = await import(
  `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`
);

test('model labels are bounded; Lite, Pro subscription text and prose cannot collide', () => {
  assert.equal(parseFamily('3.5 Flash-Lite'), 'flash-lite');
  assert.equal(parseFamily('3.6 Flash'), 'flash');
  assert.equal(parseFamily('3.8 Flash'), 'flash');
  assert.equal(parseFamily('Gemini 3.1 Pro'), 'pro');
  for (const label of ['Google AI Pro', 'I like Flash', 'Flash Max', '', 'Auto']) {
    assert.equal(parseFamily(label), null);
  }
});

test('scene artwork maps to PNGs and welcome backgrounds stay contained at different viewport sizes', () => {
  const composer = { left: 100, top: 250, right: 700, bottom: 400 };
  for (const [key, ratio] of [['flash-lite-standard', 1], ['flash-lite-extended', 1], ['flash-standard', 1699 / 926], ['flash-extended', 937 / 1678], ['pro-standard', 999 / 1574], ['pro-extended', 1122 / 1402], ['unknown', 1]]) {
    assert.equal(artworkKey(key, true), `${key}-welcome`);
    const chatKey = `${key}-chat`;
    assert.equal(artworkKey(key, false), chatKey);
    const shared = key === 'pro-extended' || key === 'unknown';
    assert.equal(assetPath(artworkKey(key, true)), `assets/gemini/${shared ? key : `${key}-welcome`}.png`);
    assert.equal(assetPath(artworkKey(key, false)), `assets/gemini/${shared ? key : chatKey}.png`);
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 720 }, { width: 1000, height: 400 }]) {
      const chat = { left: 52, top: 60, right: viewport.width, bottom: viewport.height };
      const p = placeCharacter(viewport, chat, composer, true, key);
      assert.equal(p.background, true);
      assert.ok(Math.abs(p.width / p.height - ratio) < 0.0001);
      assert.ok(Math.abs((p.left + p.width / 2) - (chat.left + chat.right) / 2) < 0.01);
      const centerY = (chat.top + chat.bottom) / 2;
      if (key === 'flash-lite-standard' || key === 'flash-lite-extended' || key === 'unknown') {
        assert.ok(p.top + p.height / 2 < centerY);
        assert.deepEqual(p, placeCharacter(viewport, chat, composer, true, 'flash-lite-standard'));
      } else {
        assert.ok(Math.abs((p.top + p.height / 2) - centerY) < 0.01);
      }
      assert.ok(p.left >= chat.left && p.left + p.width <= chat.right);
      assert.ok(p.top >= chat.top && p.top + p.height <= chat.bottom);
      assert.equal(p.opacity, 0.7);
    }
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

test('optional below-input and beside-input anchors avoid the composer and yield on narrow layouts', () => {
  const welcomeConfig = { ...ARTWORKS['unknown-welcome'] };
  const chatConfig = { ...ARTWORKS['unknown-chat'] };
  try {
    Object.assign(ARTWORKS['unknown-welcome'], { anchor: 'below-input', scale: 1, offsetX: 0, offsetY: 0 });
    Object.assign(ARTWORKS['unknown-chat'], { anchor: 'beside-input', scale: 1, offsetX: 0, offsetY: 0 });
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
  } finally {
    ARTWORKS['unknown-welcome'] = welcomeConfig;
    ARTWORKS['unknown-chat'] = chatConfig;
  }
});

test('Flash-Lite and unknown chat portraits share right-edge placement even with a narrow input gutter', () => {
  const viewport = { width: 1440, height: 900 };
  const chat = { left: 80, top: 60, right: 1440, bottom: 900 };
  const composer = { left: 400, top: 760, right: 1060, bottom: 850 };
  for (const key of ['flash-lite-standard', 'flash-lite-extended', 'unknown']) {
    const p = placeCharacter(viewport, chat, composer, false, key);
    assert.equal(p.background, false);
    assert.equal(p.width, p.height);
    assert.equal(p.opacity, 0.7);
    assert.equal(p.left + p.width, viewport.width + 15);
    assert.ok(p.top >= chat.top && p.top + p.height <= chat.bottom);
    assert.deepEqual(p, placeCharacter(viewport, chat, composer, false, 'flash-lite-standard'));
    assert.equal(artworkKey(key, true), `${key}-welcome`);
    assert.equal(artworkKey(key, false), `${key}-chat`);
    const narrow = placeCharacter({ width: 700, height: 900 }, { ...chat, left: 0, right: 700 },
      { ...composer, left: 20, right: 680 }, false, key);
    assert.ok(narrow && narrow.left < 700);
    assert.equal(narrow.left + narrow.width, 715);
  }
});

test('editing one image changes its size, offsets and layer without changing other images', () => {
  const viewport = { width: 1440, height: 900 };
  const chat = { left: 80, top: 60, right: 1440, bottom: 900 };
  const composer = { left: 400, top: 760, right: 1060, bottom: 850 };
  const original = { ...ARTWORKS['flash-lite-extended-chat'] };
  const place = (key, welcome = false) => placeCharacter(viewport, chat, composer, welcome, key);
  const standard = place('flash-lite-standard');
  const extendedWelcome = place('flash-lite-extended', true);
  const before = place('flash-lite-extended');
  try {
    Object.assign(ARTWORKS['flash-lite-extended-chat'], {
      scale: 0.8, offsetX: -60, offsetY: -45, opacity: 0.9, layer: 'background',
    });
    const after = place('flash-lite-extended');
    assert.ok(after.width < before.width);
    assert.ok(after.left + after.width < before.left + before.width);
    assert.ok(after.top + after.height < before.top + before.height);
    assert.equal(after.opacity, 0.9);
    assert.equal(after.background, true);
    assert.equal(after.aboveInput, false);
    assert.deepEqual(place('flash-lite-standard'), standard);
    assert.deepEqual(place('flash-lite-extended', true), extendedWelcome);
  } finally { ARTWORKS['flash-lite-extended-chat'] = original; }
});

test('right-edge poses can be larger than the input gutter and extend beyond the viewport', () => {
  const viewport = { width: 700, height: 720 };
  const chat = { left: 0, top: 60, right: 700, bottom: 720 };
  const composer = { left: 20, top: 600, right: 680, bottom: 680 };
  const original = { ...ARTWORKS['flash-extended-chat'] };
  try {
    ARTWORKS['flash-extended-chat'].anchor = 'beside-input';
    assert.equal(placeCharacter(viewport, chat, composer, false, 'flash-extended'), null);
    Object.assign(ARTWORKS['flash-extended-chat'], {
      anchor: 'viewport-right', maxWidth: 320, offsetX: 80, offsetY: -100, opacity: 0.85,
    });
    const p = placeCharacter(viewport, chat, composer, false, 'flash-extended');
    assert.equal(p.width, 320);
    assert.equal(p.left + p.width, viewport.width + 80);
    assert.ok(p.left < viewport.width && p.top >= chat.top && p.top + p.height <= chat.bottom);
    assert.equal(p.aboveInput, true);
    ARTWORKS['flash-extended-chat'].offsetX = 400;
    assert.equal(placeCharacter(viewport, chat, composer, false, 'flash-extended'), null);
    ARTWORKS['flash-extended-chat'].scale = 0;
    assert.equal(placeCharacter(viewport, chat, composer, false, 'flash-extended'), null);
  } finally { ARTWORKS['flash-extended-chat'] = original; }
});

test('large scale and offsets stay contained for ordinary placement', () => {
  const original = { ...ARTWORKS['flash-lite-standard-chat'] };
  try {
    Object.assign(ARTWORKS['flash-lite-standard-chat'], { anchor: 'beside-input', scale: 10, offsetX: -10000, offsetY: 10000 });
    const p = placeCharacter({ width: 1440, height: 900 },
      { left: 80, top: 60, right: 1440, bottom: 900 },
      { left: 400, top: 760, right: 1060, bottom: 850 }, false, 'flash-lite-standard');
    assert.ok(p.left >= 80 && p.top >= 60);
    assert.ok(p.left + p.width <= 1440 && p.top + p.height <= 900);
  } finally { ARTWORKS['flash-lite-standard-chat'] = original; }
});
