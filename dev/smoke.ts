// Local browser verification only. This file is never copied into the extension.
import { CharacterRenderer } from '../src/renderer';
import { observeGemini, readSnapshot } from '../src/gemini';

const renderer = new CharacterRenderer(key => `/assets/gemini/${key}.svg`);
const model = document.querySelector<HTMLSelectElement>('#model')!;
const thinking = document.querySelector<HTMLSelectElement>('#thinking')!;
const page = document.querySelector<HTMLSelectElement>('#page')!;
const status = document.querySelector<HTMLOutputElement>('output')!;
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
  update();
});
update();
