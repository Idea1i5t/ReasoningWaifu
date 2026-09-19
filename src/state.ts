export type Family = 'flash-lite' | 'flash' | 'pro';
export type Thinking = 'standard' | 'extended';
export type Selection =
  | { kind: 'known'; family: Family; thinking: Thinking }
  | { kind: 'unknown' };
export type AssetKey = `${Family}-${Thinking}` | 'unknown';

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
export interface Placement { left: number; top: number; width: number; opacity: number }

export function placeCharacter(
  viewport: { width: number; height: number },
  chat: Rect,
  composer: Rect,
  welcome: boolean,
): Placement | null {
  const right = Math.min(chat.right, viewport.width) - 16;
  const bottom = Math.min(chat.bottom, viewport.height) - 40;
  if (welcome) {
    const freeHeight = bottom - composer.bottom - 24;
    const width = Math.min(250, (right - chat.left) * 0.32, freeHeight * 400 / 520);
    if (width < 100) return null;
    return { left: right - width, top: bottom - width * 520 / 400, width, opacity: 0.65 };
  }
  const width = Math.min(230, right - composer.right - 16, (bottom - chat.top - 24) * 400 / 520);
  if (width < 100) return null;
  return { left: right - width, top: Math.max(chat.top + 24, bottom - width * 520 / 400), width, opacity: 0.28 };
}
