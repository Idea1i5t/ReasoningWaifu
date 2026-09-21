import type { ArtworkKey, Placement } from './state';

export class CharacterRenderer {
  private readonly host = document.createElement('div');
  private readonly stage: HTMLDivElement;
  private readonly motion = matchMedia('(prefers-reduced-motion: reduce)');
  private target: ArtworkKey | null = null;
  private backgroundParent: HTMLElement | null = null;
  private readonly layerStyle = document.createElement('style');
  private revision = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private cancelLoad: (() => void) | undefined;

  constructor(private readonly assetUrl: (key: ArtworkKey) => string) {
    // Isolate the negative-z decoration above the container's own background,
    // but below all existing page content, including the composer.
    this.layerStyle.textContent = '.reasoning-waifu-background-context { isolation:isolate !important; }';
    this.host.id = 'reasoning-waifu-root';
    this.host.setAttribute('aria-hidden', 'true');
    // Keep off-screen artwork inside a viewport-sized clipping layer. This lets
    // edge poses peek in without widening the document or intercepting input.
    this.host.style.cssText = 'all:initial;position:fixed;inset:0;overflow:hidden;display:none;pointer-events:none;z-index:0;';
    const shadow = this.host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
      :host { pointer-events: none !important; user-select: none !important; }
      .stage { position:absolute; pointer-events:none; }
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

  update(parent: HTMLElement, key: ArtworkKey, placement: Placement): void {
    if (this.backgroundParent && (this.backgroundParent !== parent || !placement.background)) {
      this.backgroundParent.classList.remove('reasoning-waifu-background-context');
      this.backgroundParent = null;
    }
    if (placement.background) {
      if (!this.layerStyle.isConnected) document.head.append(this.layerStyle);
      parent.classList.add('reasoning-waifu-background-context');
      this.backgroundParent = parent;
    } else this.layerStyle.remove();
    if (this.host.parentElement !== parent) parent.append(this.host);
    Object.assign(this.host.style, {
      display: 'block',
      zIndex: placement.background ? '-1' : String(placement.zIndex ?? 0),
      opacity: String(placement.opacity),
    });
    Object.assign(this.stage.style, {
      left: `${placement.left}px`, top: `${placement.top}px`,
      width: `${placement.width}px`, height: `${placement.height}px`,
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

  private load(key: ArtworkKey, revision: number): void {
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
      if (!key.startsWith('unknown-')) this.load(key.endsWith('-welcome') ? 'unknown-welcome' : 'unknown-chat', revision);
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
    this.backgroundParent?.classList.remove('reasoning-waifu-background-context');
    this.backgroundParent = null;
    this.layerStyle.remove();
    this.stage.replaceChildren();
    this.host.remove();
  }
}
