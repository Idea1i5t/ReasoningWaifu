// Local browser verification only. This file is never copied into the extension.
import { CharacterRenderer } from '../src/renderer';
import { observeGemini, readSnapshot } from '../src/gemini';
import { assetKey, assetPath, artworkKey, parseFamily, parseThinking } from '../src/state';
import { ARTWORKS } from '../src/artworks';
import type { ArtworkAnchor, ArtworkLayer } from '../src/artworks';

const renderer = new CharacterRenderer(key => `/${assetPath(key)}`);
const model = document.querySelector<HTMLSelectElement>('#model')!;
const thinking = document.querySelector<HTMLSelectElement>('#thinking')!;
const page = document.querySelector<HTMLSelectElement>('#page')!;
const status = document.querySelector<HTMLOutputElement>('output')!;
const originalArtworks = structuredClone(ARTWORKS);
const anchor = document.querySelector<HTMLSelectElement>('#art-anchor')!;
const width = document.querySelector<HTMLInputElement>('#art-width')!;
const scale = document.querySelector<HTMLInputElement>('#art-scale')!;
const offsetX = document.querySelector<HTMLInputElement>('#art-x')!;
const offsetY = document.querySelector<HTMLInputElement>('#art-y')!;
const opacity = document.querySelector<HTMLInputElement>('#art-opacity')!;
const layer = document.querySelector<HTMLSelectElement>('#art-layer')!;
const configText = document.querySelector<HTMLTextAreaElement>('#art-config')!;
const selectedArtwork = () => artworkKey(assetKey(parseFamily(model.value), parseThinking(thinking.value)), page.value === 'welcome');
const showConfig = () => {
  const key = selectedArtwork();
  configText.value = `'${key}': ${JSON.stringify(ARTWORKS[key], null, 2)},`;
};
const syncControls = () => {
  const key = selectedArtwork();
  const config = ARTWORKS[key];
  document.querySelector('#artwork-name')!.textContent = key;
  anchor.value = config.anchor;
  width.value = String(config.maxWidth); scale.value = String(config.scale);
  offsetX.value = String(config.offsetX); offsetY.value = String(config.offsetY);
  opacity.value = String(config.opacity); layer.value = config.layer;
  showConfig();
};
const update = () => {
  const snapshot = readSnapshot();
  if (!snapshot) { renderer.hide(); status.value = 'hidden'; return; }
  renderer.update(snapshot.parent, snapshot.key, snapshot.placement);
  status.value = snapshot.key;
};
observeGemini(update);
for (const control of [model, thinking, page]) control.addEventListener('change', () => {
  const label = document.querySelector('[data-test-id="logo-pill-label-container"]')!;
  const family = model.value.replace(/^\d+\.\d+\s+/, '');
  const primary = document.createElement('span');
  primary.className = 'picker-primary-text';
  primary.textContent = family;
  label.replaceChildren(primary);
  if (thinking.value !== 'Standard') {
    const secondary = document.createElement('span');
    secondary.className = 'picker-secondary-text';
    secondary.textContent = thinking.value === 'Extended' ? '扩展' : 'Unknown';
    label.append(secondary);
  }
  document.querySelector('[data-test-id="bard-mode-menu-button"]')!.setAttribute('aria-label',
    `打开模式选择器，当前模式为“${family}${thinking.value === 'Standard' ? '' : thinking.value === 'Extended' ? ' 扩展' : ' Unknown'}”`);
  document.querySelector('.input-area')!.classList.toggle('is-zero-state', page.value === 'welcome');
  document.body.classList.toggle('conversation', page.value === 'chat');
  syncControls();
  update();
});
for (const control of [anchor, width, scale, offsetX, offsetY, opacity, layer]) control.addEventListener('input', () => {
  if (![width, scale, offsetX, offsetY, opacity].every(input => input.value !== '' && input.validity.valid)) return;
  Object.assign(ARTWORKS[selectedArtwork()], {
    anchor: anchor.value as ArtworkAnchor, maxWidth: width.valueAsNumber, scale: scale.valueAsNumber,
    offsetX: offsetX.valueAsNumber, offsetY: offsetY.valueAsNumber,
    opacity: opacity.valueAsNumber, layer: layer.value as ArtworkLayer,
  });
  showConfig();
  update();
});
document.querySelector('#art-reset')!.addEventListener('click', () => {
  const key = selectedArtwork();
  ARTWORKS[key] = { ...originalArtworks[key] };
  syncControls();
  update();
});
syncControls();
update();
