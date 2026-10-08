/** Incarnation uses the same pixel scale and Prophet artwork as the procession. */
export class IncarnationArena {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sprite = new Image();
  private frame: number | null = null;
  private stage = 1;
  private pulseUntil = 0;
  private onClickCallback?: (x: number, y: number) => void;
  private observer: ResizeObserver;
  private motion = window.matchMedia('(prefers-reduced-motion: reduce)');

  constructor(canvasId = 'incarnation-canvas') {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.sprite.src = '/assets/procession/prophet.png';
    this.sprite.onload = () => this.draw();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(this.canvas);
    this.canvas.tabIndex = 0;
    this.canvas.setAttribute('role', 'button');
    this.canvas.setAttribute('aria-label', 'Invocar bênção da Encarnação');
    this.canvas.addEventListener('click', event => this.invoke(event.clientX, event.clientY));
    this.canvas.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      this.invoke(rect.x + rect.width / 2, rect.y + rect.height / 2);
    });
    this.resize();
    this.startLoop();
  }

  private invoke(x: number, y: number): void {
    this.pulseUntil = performance.now() + 140;
    this.onClickCallback?.(x, y);
    this.draw();
  }

  public setOnClickCallback(callback: (x: number, y: number) => void): void { this.onClickCallback = callback; }
  public setStage(stage: number): void { this.stage = Math.max(1, stage); this.draw(); }
  public resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    this.canvas.width = Math.max(1, Math.floor(rect.width / 2));
    this.canvas.height = Math.max(1, Math.floor(rect.height / 2));
    this.ctx.imageSmoothingEnabled = false;
    this.draw();
  }
  public startLoop(): void {
    if (this.frame !== null) return;
    const loop = () => { this.draw(); this.frame = requestAnimationFrame(loop); };
    this.frame = requestAnimationFrame(loop);
  }
  public stopLoop(): void { if (this.frame !== null) cancelAnimationFrame(this.frame); this.frame = null; }
  public pause(): void { this.stopLoop(); }
  public resume(): void { this.startLoop(); }
  public destroy(): void { this.stopLoop(); this.observer.disconnect(); }

  private draw(): void {
    const { width: w, height: h } = this.canvas;
    const ctx = this.ctx, cx = Math.floor(w / 2), ground = h - 6;
    const accent = ['#bf985e', '#d7b16b', '#e19b59', '#af86bc', '#87a4bf'][Math.min(4, this.stage - 1)];
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#30271f'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#3e3226';
    for (let y = 0; y < h; y += 12) for (let x = (y % 24 ? -12 : 0); x < w; x += 24) ctx.fillRect(x + 1, y + 1, 22, 10);
    ctx.fillStyle = '#191511'; ctx.fillRect(cx - 33, ground - 3, 66, 7);
    ctx.fillStyle = '#6d5236'; ctx.fillRect(cx - 29, ground - 5, 58, 4);
    const size = Math.min(60, h - 12);
    if (this.sprite.complete && this.sprite.naturalWidth) {
      const sw = Math.round(this.sprite.naturalWidth / this.sprite.naturalHeight * size);
      ctx.drawImage(this.sprite, cx - Math.floor(sw / 2), ground - size - 5, sw, size);
    }
    if (this.stage > 1) {
      ctx.fillStyle = accent;
      const time = this.motion.matches ? 0 : performance.now() / 6000;
      const radius = Math.min(33, h / 2 - 4);
      for (let i = 0; i < this.stage * 4; i++) {
        const a = i * Math.PI * 2 / (this.stage * 4) + time;
        ctx.fillRect(Math.round(cx + Math.cos(a) * radius), Math.round(h / 2 + Math.sin(a) * radius), 2, 2);
      }
    }
    if (performance.now() < this.pulseUntil) {
      ctx.fillStyle = accent; ctx.globalAlpha = .2; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1;
    }
  }
}
