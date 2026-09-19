import type { AssetKey, Placement } from './state';

export class CharacterRenderer {
  private readonly host = document.createElement('div');
  private readonly stage: HTMLDivElement;
  private readonly motion = matchMedia('(prefers-reduced-motion: reduce)');
  private target: AssetKey | null = null;
  private revision = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private cancelLoad: (() => void) | undefined;

  constructor(private readonly assetUrl: (key: AssetKey) => string) {
    this.host.id = 'reasoning-waifu-root';
    this.host.setAttribute('aria-hidden', 'true');
    this.host.style.cssText = 'all:initial;position:fixed;display:none;pointer-events:none;z-index:0;';
    const shadow = this.host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
      :host { pointer-events: none !important; user-select: none !important; }
      .stage { width:100%; aspect-ratio:400/520; position:relative; pointer-events:none; }
      img { position:absolute; inset:0; display:block; width:100%; height:100%;
        object-fit:contain; opacity:0; transition:opacity 200ms ease; pointer-events:none; }
      img.visible { opacity:1; }
      @media(prefers-reduced-motion:reduce) { img { transition:none; } }
      @media print { :host { display:none !important; } }
    `;
    this.stage = document.createElement('div');
    this.stage.className = 'stage';
    shadow.append(style, this.stage);
  }

  update(parent: HTMLElement, key: AssetKey, placement: Placement): void {
    if (this.host.parentElement !== parent) parent.append(this.host);
    Object.assign(this.host.style, {
      display: 'block', left: `${placement.left}px`, top: `${placement.top}px`,
      width: `${placement.width}px`, height: `${placement.width * 520 / 400}px`,
      opacity: String(placement.opacity),
    });
    if (key === this.target) return;
    this.cancelLoad?.();
    clearTimeout(this.timer);
    const revision = ++this.revision;
    this.target = key;
    // Bound layers even when the user changes state during a transition.
    const visible = [...this.stage.querySelectorAll<HTMLImageElement>('img.visible')].at(-1);
    this.stage.replaceChildren(...(visible ? [visible] : []));
    this.load(key, revision);
  }

  private load(key: AssetKey, revision: number): void {
    const image = new Image();
    image.alt = '';
    image.draggable = false;
    let settled = false;
    const timeout = setTimeout(() => fail(), 2000);
    const cleanup = () => { clearTimeout(timeout); image.onload = null; image.onerror = null; };
    this.cancelLoad = () => { settled = true; cleanup(); };
    const fail = () => {
      if (settled || revision !== this.revision) return;
      settled = true;
      cleanup();
      if (key !== 'unknown') this.load('unknown', revision);
      else { this.stage.replaceChildren(); this.host.style.display = 'none'; }
    };
    image.onerror = fail;
    image.onload = () => {
      void image.decode().then(() => {
        if (settled || revision !== this.revision) return;
        settled = true;
        cleanup();
        const previous = [...this.stage.children];
        this.stage.append(image);
        // Commit initial opacity before starting the transition.
        void image.offsetWidth;
        image.classList.add('visible');
        previous.forEach(element => element.classList.remove('visible'));
        this.host.dataset['state'] = key;
        this.timer = setTimeout(() => {
          if (revision === this.revision) previous.forEach(element => element.remove());
        }, this.motion.matches ? 0 : 220);
      }).catch(fail);
    };
    try { image.src = this.assetUrl(key); } catch { fail(); }
  }

  hide(): void {
    ++this.revision;
    this.cancelLoad?.();
    clearTimeout(this.timer);
    this.target = null;
    this.stage.replaceChildren();
    this.host.remove();
  }
}
