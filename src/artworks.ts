import type { AssetKey } from './state';

export type ArtworkKey = `${AssetKey}-${'welcome' | 'chat'}`;
export type ArtworkAnchor = 'center' | 'beside-input' | 'below-input' | 'viewport-right';
export type ArtworkLayer = 'background' | 'page' | 'above-input';

export interface ArtworkConfig {
  file: string;
  aspectRatio: number;
  anchor: ArtworkAnchor;
  maxWidth: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  opacity: number;
  layer: ArtworkLayer;
}

// 每个条目独立修改，欢迎页和聊天页互不影响。
// file: 素材路径；替换文件时同时更新 manifest.json 的资源列表。
// aspectRatio: 图片原始宽度 / 高度。
// maxWidth: 自动适配前的最大宽度(px)；scale: 在适配尺寸上再缩放，1 为原大小。
// offsetX / offsetY: 像素偏移，正数向右/下，负数向左/上。
// opacity: 0~1。不管选哪种 layer，人物始终鼠标穿透。
// anchor:
//   center         聊天区域居中；beside-input 输入框右侧，空间不足隐藏；
//   below-input    输入框下方靠右；viewport-right 贴网页右边，以输入框中心为垂直基准。
// viewport-right 的 offsetX > 0 会把图片向右推出屏幕，适合“探出身子”的构图。
// layer: background 页面内容后方；page 普通页面层；above-input 输入框及外围背景上方。
// 调整后执行 npm run build，重载扩展并刷新 Gemini。
export const ARTWORKS: Record<ArtworkKey, ArtworkConfig> = {
  'flash-lite-standard-welcome': {
    file: 'assets/gemini/flash-lite-standard-welcome.png', aspectRatio: 1,
    anchor: 'center', maxWidth: 1400, scale: 0.85, offsetX: 0, offsetY: -40,
    opacity: 0.7, layer: 'background',
  },
  'flash-lite-extended-welcome': {
    file: 'assets/gemini/flash-lite-extended-welcome.png', aspectRatio: 1,
    anchor: 'center', maxWidth: 1400, scale: 0.85, offsetX: 0, offsetY: -40,
    opacity: 0.7, layer: 'background',
  },
  'flash-lite-standard-chat': {
    file: 'assets/gemini/flash-lite-standard-chat.png', aspectRatio: 1,
    anchor: 'viewport-right', maxWidth: 230, scale: 1.5, offsetX: 15, offsetY: 30,
    opacity: 0.7, layer: 'above-input',
  },
  'flash-lite-extended-chat': {
    file: 'assets/gemini/flash-lite-extended-chat.png', aspectRatio: 1,
    anchor: 'viewport-right', maxWidth: 230, scale: 1.5, offsetX: 15, offsetY: 30,
    opacity: 0.7, layer: 'above-input',
  },
  'flash-standard-welcome': {
    file: 'assets/gemini/flash-standard-welcome.png', aspectRatio: 1699 / 926,
    anchor: 'center', maxWidth: 1400, scale: 1, offsetX: 0, offsetY: 0,
    opacity: 0.7, layer: 'background',
  },
  'flash-extended-welcome': {
    file: 'assets/gemini/flash-extended-welcome.png', aspectRatio: 937 / 1678,
    anchor: 'center', maxWidth: 1400, scale: 1, offsetX: 0, offsetY: 0,
    opacity: 0.7, layer: 'background',
  },
  'flash-standard-chat': {
    file: 'assets/gemini/flash-standard-chat.png', aspectRatio: 1125 / 1398,
    anchor: 'viewport-right', maxWidth: 360, scale: 1, offsetX: 0, offsetY: -80,
    opacity: 0.7, layer: 'above-input',
  },
  'flash-extended-chat': {
    file: 'assets/gemini/flash-extended-chat.png', aspectRatio: 1125 / 1398,
    anchor: 'viewport-right', maxWidth: 360, scale: 1, offsetX: 0, offsetY: -80,
    opacity: 0.7, layer: 'above-input',
  },
  'pro-standard-welcome': {
    file: 'assets/gemini/pro-standard-welcome.png', aspectRatio: 999 / 1574,
    anchor: 'center', maxWidth: 1400, scale: 1, offsetX: 0, offsetY: 0,
    opacity: 0.7, layer: 'background',
  },
  'pro-extended-welcome': {
    file: 'assets/gemini/pro-extended.png', aspectRatio: 1122 / 1402,
    anchor: 'center', maxWidth: 1400, scale: 1, offsetX: 0, offsetY: 0,
    opacity: 0.7, layer: 'background',
  },
  'pro-standard-chat': {
    file: 'assets/gemini/pro-standard-chat.png', aspectRatio: 1122 / 1402,
    anchor: 'viewport-right', maxWidth: 360, scale: 1, offsetX: 0, offsetY: -80,
    opacity: 0.7, layer: 'above-input',
  },
  'pro-extended-chat': {
    file: 'assets/gemini/pro-extended.png', aspectRatio: 1122 / 1402,
    anchor: 'viewport-right', maxWidth: 360, scale: 1, offsetX: 0, offsetY: -80,
    opacity: 0.7, layer: 'above-input',
  },
  'unknown-welcome': {
    file: 'assets/gemini/unknown.png', aspectRatio: 1,
    anchor: 'center', maxWidth: 1400, scale: 0.85, offsetX: 0, offsetY: -40,
    opacity: 0.7, layer: 'background',
  },
  'unknown-chat': {
    file: 'assets/gemini/unknown.png', aspectRatio: 1,
    anchor: 'viewport-right', maxWidth: 230, scale: 1.5, offsetX: 15, offsetY: 30,
    opacity: 0.7, layer: 'above-input',
  },
};
