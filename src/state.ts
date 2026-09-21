import { ARTWORKS } from './artworks';
import type { ArtworkKey } from './artworks';
export type { ArtworkKey } from './artworks';

export type Family = 'flash-lite' | 'flash' | 'pro';
export type Thinking = 'standard' | 'extended';
export type Selection =
  | { kind: 'known'; family: Family; thinking: Thinking }
  | { kind: 'unknown' };
export type AssetKey = `${Family}-${Thinking}` | 'unknown';

export function artworkKey(key: AssetKey, welcome: boolean): ArtworkKey {
  return `${key}-${welcome ? 'welcome' : 'chat'}`;
}

export function assetPath(key: ArtworkKey): string {
  return ARTWORKS[key].file;
}

// Parse only labels read from verified controls, never conversation text.
export function parseFamily(label: string): Family | null {
  const value = label.trim().replace(/\s+/g, ' ');
  const match = /^(?:Gemini\s+)?(?:\d+(?:\.\d+)*\s+)?(Flash[\s-]?Lite|Flash|Pro)$/i.exec(value);
  if (!match) return null;
  const family = match[1]!.toLowerCase().replace(/[\s-]/g, '');
  return family === 'flashlite' ? 'flash-lite' : family === 'flash' ? 'flash' : 'pro';
}

export function parseThinking(label: string): Thinking | null {
  const value = label.trim().toLowerCase();
  if (/^(standard(?: thinking)?|标准(?:思考)?|一般思考)$/.test(value)) return 'standard';
  if (/^(extended(?: thinking)?|扩展(?:思考)?|延长思考|延伸思考)$/.test(value)) return 'extended';
  return null;
}

export function assetKey(family: Family | null, thinking: Thinking | null): AssetKey {
  return family && thinking ? `${family}-${thinking}` : 'unknown';
}

// Verified signed-in picker: a primary model label, optional secondary
// "扩展" badge, and a matching quoted current-mode value in its ARIA label.
// A missing generic control is never treated as Standard.
export function readPicker(primary: string | null, secondary: string | null, ariaLabel: string): AssetKey {
  if (primary === null) return 'unknown';
  const family = parseFamily(primary);
  const thinking = secondary === null ? 'standard' : parseThinking(secondary);
  const currentMode = /[“"]([^”"]+)[”"]$/.exec(ariaLabel)?.[1]?.trim().replace(/\s+/g, ' ');
  const visibleMode = [primary.trim(), secondary?.trim()].filter(Boolean).join(' ');
  if (currentMode !== visibleMode) return 'unknown';
  return assetKey(family, thinking);
}

export interface Rect { left: number; top: number; right: number; bottom: number }
export interface Placement {
  left: number; top: number; width: number; height: number; opacity: number;
  background: boolean;
  aboveInput: boolean;
  zIndex?: number;
}

export function placeCharacter(
  viewport: { width: number; height: number },
  chat: Rect,
  composer: Rect,
  welcome: boolean,
  key: AssetKey = 'unknown',
): Placement | null {
  const config = ARTWORKS[artworkKey(key, welcome)];
  const { aspectRatio, maxWidth, scale, offsetX, offsetY } = config;
  if (![aspectRatio, maxWidth, scale, offsetX, offsetY, config.opacity].every(Number.isFinite)
    || aspectRatio <= 0 || maxWidth <= 0 || scale <= 0) return null;
  const left = Math.max(0, chat.left);
  const top = Math.max(0, chat.top);
  const chatRight = Math.min(chat.right, viewport.width);
  const chatBottom = Math.min(chat.bottom, viewport.height);
  const availableWidth = chatRight - left;
  const availableHeight = chatBottom - top;
  if (availableWidth <= 0 || availableHeight <= 0) return null;
  const right = chatRight - 16;
  const bottom = chatBottom - 40;
  let fittedWidth: number;
  switch (config.anchor) {
    case 'center':
      fittedWidth = Math.min(maxWidth, availableWidth * 0.94, availableHeight * 0.9 * aspectRatio);
      break;
    case 'below-input':
      fittedWidth = Math.min(maxWidth, (right - chat.left) * 0.32, (bottom - composer.bottom - 24) * aspectRatio);
      break;
    case 'beside-input':
      fittedWidth = Math.min(maxWidth, right - composer.right - 16, (bottom - chat.top - 24) * aspectRatio);
      break;
    case 'viewport-right':
      // An edge character may overlap the composer's outer backdrop. Its size
      // is independent of the narrow gutter to the right of the input box.
      fittedWidth = Math.min(maxWidth, viewport.width * 0.94, availableHeight * 0.9 * aspectRatio);
      break;
  }
  const width = Math.min(fittedWidth * scale,
    config.anchor === 'viewport-right' ? viewport.width : availableWidth, availableHeight * aspectRatio);
  if (width < 100) return null;
  const height = width / aspectRatio;
  let x: number;
  let y: number;
  if (config.anchor === 'center') {
    x = left + (availableWidth - width) / 2;
    y = top + (availableHeight - height) / 2;
  } else if (config.anchor === 'viewport-right') {
    x = viewport.width - width;
    y = (composer.top + composer.bottom - height) / 2;
  } else {
    x = right - width;
    y = bottom - height;
  }
  x += offsetX;
  y += offsetY;
  if (config.anchor === 'viewport-right') {
    // The fixed renderer clips the overflow without creating a horizontal scrollbar.
    if (x >= viewport.width || x + width <= 0) return null;
  } else {
    x = Math.max(left, Math.min(chatRight - width, x));
  }
  const minTop = config.anchor === 'beside-input' ? Math.min(chatBottom - height, Math.max(top, chat.top + 24)) : top;
  y = Math.max(minTop, Math.min(chatBottom - height, y));
  return { left: x, top: y, width, height,
    opacity: Math.max(0, Math.min(1, config.opacity)),
    background: config.layer === 'background', aboveInput: config.layer === 'above-input' };
}
