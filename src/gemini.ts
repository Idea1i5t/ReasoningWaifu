import { readPicker, placeCharacter, artworkKey } from './state';
import type { ArtworkKey, Placement } from './state';

// Observed on the real Gemini page on 2026-09-20. No hashed Angular classes.
const MODE = '[data-test-id="bard-mode-menu-button"]';
const CHAT = 'chat-window .chat-container';
const INPUT = 'input-area-v2';
const TRACKED = `${MODE}, ${CHAT}, ${INPUT}`;

function visible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return element.isConnected && rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== 'hidden';
}

export interface Snapshot {
  parent: HTMLElement;
  key: ArtworkKey;
  placement: Placement;
}

export function readSnapshot(): Snapshot | null {
  if (!/^\/(?:u\/\d+\/)?app(?:\/|$)/.test(location.pathname)) return null;
  const mode = [...document.querySelectorAll<HTMLElement>(MODE)].filter(visible);
  const parent = document.querySelector<HTMLElement>(CHAT);
  const input = document.querySelector<HTMLElement>(INPUT);
  if (mode.length !== 1 || !parent || !input || !visible(parent) || !visible(input)) return null;
  const label = mode[0]!.querySelector('[data-test-id="logo-pill-label-container"]');
  const key = readPicker(
    label?.querySelector('.picker-primary-text')?.textContent ?? null,
    label?.querySelector('.picker-secondary-text')?.textContent ?? null,
    mode[0]!.getAttribute('aria-label') ?? '',
  );
  const inputBox = input.querySelector<HTMLElement>('.input-area');
  const welcome = inputBox?.classList.contains('is-zero-state') === true;
  // The outer input host can span the chat width to paint a bottom gradient.
  // Place the character beside the actual box, not that decorative backdrop.
  const composer = !welcome && inputBox && visible(inputBox) ? inputBox : input;
  const placement = placeCharacter(
    { width: innerWidth, height: innerHeight }, parent.getBoundingClientRect(),
    composer.getBoundingClientRect(), welcome, key,
  );
  if (placement?.aboveInput) {
    // Share the chat parent with the composer and sit above its ancestor layers.
    let composerZIndex = 0;
    for (let element: HTMLElement | null = composer; element && element !== parent; element = element.parentElement) {
      const zIndex = Number.parseInt(getComputedStyle(element).zIndex, 10);
      if (Number.isFinite(zIndex)) composerZIndex = Math.max(composerZIndex, zIndex);
    }
    placement.zIndex = composerZIndex + 1;
  }
  return placement ? { parent, key: artworkKey(key, welcome), placement } : null;
}

export function observeGemini(onChange: () => void): () => void {
  let frame = 0;
  let href = location.href;
  let roots: HTMLElement[] = [];
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; onChange(); });
  };
  const controlObserver = new MutationObserver(schedule);
  const resizeObserver = new ResizeObserver(schedule);
  const bind = () => {
    controlObserver.disconnect();
    resizeObserver.disconnect();
    roots = [...document.querySelectorAll<HTMLElement>(TRACKED)];
    for (const root of roots) {
      resizeObserver.observe(root);
      if (root.matches(MODE)) {
        const control = root.closest('bard-mode-switcher') ?? root;
        controlObserver.observe(control, { attributes: true, childList: true, characterData: true, subtree: true });
      }
      if (root.matches(INPUT)) {
        const area = root.querySelector('.input-area');
        if (area) controlObserver.observe(area, { attributes: true, attributeFilter: ['class'] });
      }
    }
    schedule();
  };
  const structuralObserver = new MutationObserver(records => {
    let rebind = roots.some(root => !root.isConnected);
    for (const record of records) {
      // Renderer changes must never trigger a discovery/update cycle.
      if (record.target instanceof Element && record.target.closest('#reasoning-waifu-root')) continue;
      for (const node of record.addedNodes) {
        if (!(node instanceof Element) || node.id === 'reasoning-waifu-root') continue;
        if (node.matches(TRACKED) || node.querySelector(TRACKED)) rebind = true;
      }
      for (const node of record.removedNodes) {
        if (node instanceof Element && node.id === 'reasoning-waifu-root') schedule();
      }
    }
    if (rebind) bind();
    if (location.href !== href) { href = location.href; schedule(); }
  });
  structuralObserver.observe(document.body, { childList: true, subtree: true });
  // Explicitly observe host theme changes without observing chat message text.
  const themeObserver = new MutationObserver(schedule);
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  const events = ['resize', 'popstate', 'hashchange', 'pageshow', 'scroll'] as const;
  events.forEach(name => window.addEventListener(name, schedule, { passive: true }));
  document.addEventListener('visibilitychange', schedule);
  bind();
  return () => {
    cancelAnimationFrame(frame);
    controlObserver.disconnect(); resizeObserver.disconnect();
    structuralObserver.disconnect(); themeObserver.disconnect();
    events.forEach(name => window.removeEventListener(name, schedule));
    document.removeEventListener('visibilitychange', schedule);
  };
}
