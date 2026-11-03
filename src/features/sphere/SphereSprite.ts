import { VisualFrameClock } from '../../ui/visualTiming.js';

const SIZE = 384;
const ASSET_PATH = `${import.meta.env.BASE_URL}assets/sprites/esfera/layers/`;

export const SPHERE_LAYERS = [
  { id: 'globe', periodMs: 0, phase: 0, pivotX: 128, pivotY: 128 },
  { id: 'ring-3', periodMs: -20000, phase: Math.PI * 2 / 3, pivotX: 130, pivotY: 131 },
  { id: 'ring-2', periodMs: -16000, phase: Math.PI / 3, pivotX: 130, pivotY: 131 },
  { id: 'ring-1', periodMs: -12000, phase: 0, pivotX: 130, pivotY: 131 },
  { id: 'outer', periodMs: 24000, phase: 0, pivotX: 128, pivotY: 128 },
] as const;

export function sphereLayerAngle(layer: typeof SPHERE_LAYERS[number], elapsedMs: number): number {
  if (!layer.periodMs) return layer.phase;
  const progress = Math.max(0, elapsedMs) % Math.abs(layer.periodMs);
  return layer.phase + progress / layer.periodMs * Math.PI * 2;
}

/** Independent engraved rings, composited at 30 FPS around the stationary globe. */
export class SphereSprite {
  private fallback = new Image();
  private layers = SPHERE_LAYERS.map(config => ({ ...config, image: new Image() }));
  private ctx: CanvasRenderingContext2D;
  private clock = new VisualFrameClock();
  private elapsedMs = 0;
  private lastTime = -1;
  private ready = false;
  private failed = false;
  private animationId: number | null = null;
  private observer?: IntersectionObserver;
  private visible = true;
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = canvas.height = SIZE;
    this.ctx = canvas.getContext('2d', { alpha: true })!;
    this.ctx.imageSmoothingEnabled = false;
    if (typeof IntersectionObserver !== 'undefined') {
      this.observer = new IntersectionObserver(entries => {
        this.visible = entries[entries.length - 1].isIntersecting;
      });
      this.observer.observe(canvas);
    }
    this.fallback.onload = () => { if (!this.ready) this.drawStill(); };
    this.fallback.src = `${ASSET_PATH}still.png`;
    let remaining = this.layers.length;
    for (const layer of this.layers) {
      layer.image.onload = () => {
        if (--remaining === 0 && !this.failed) {
          this.ready = true;
          this.draw(0);
          this.animationId = requestAnimationFrame(this.tick);
        }
      };
      layer.image.onerror = () => {
        this.failed = true;
        if (this.fallback.complete && this.fallback.naturalWidth) this.drawStill();
      };
      layer.image.src = `${ASSET_PATH}${layer.id}.png`;
    }
  }

  private drawStill(): void {
    this.ctx.clearRect(0, 0, SIZE, SIZE);
    this.ctx.drawImage(this.fallback, 64, 64, 256, 256);
  }

  private drawLayer(layer: typeof this.layers[number], elapsedMs: number, half?: 'back' | 'front'): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(SIZE / 2, SIZE / 2);
    ctx.rotate(sphereLayerAngle(layer, elapsedMs));
    if (half) {
      // Back arcs sit behind the globe; front arcs pass across its surface.
      ctx.beginPath();
      ctx.rect(-128, half === 'back' ? -128 : 0, 256, 128);
      ctx.clip();
    }
    ctx.drawImage(layer.image, -layer.pivotX, -layer.pivotY, 256, 256);
    ctx.restore();
  }

  private draw(elapsedMs: number): void {
    if (elapsedMs === this.lastTime) return;
    this.ctx.clearRect(0, 0, SIZE, SIZE);
    const rings = this.layers.slice(1, 4);
    for (const layer of rings) this.drawLayer(layer, elapsedMs, 'back');
    this.drawLayer(this.layers[0], 0);
    for (const layer of rings) this.drawLayer(layer, elapsedMs, 'front');
    this.drawLayer(this.layers[4], elapsedMs);
    this.lastTime = elapsedMs;
  }

  private tick = (nowMs: number): void => {
    const elapsed = this.clock.tick(nowMs);
    if (elapsed !== null && this.visible && document.visibilityState !== 'hidden') {
      if (this.reducedMotion.matches) {
        this.draw(0);
      } else {
        // These four periods align again after four minutes.
        this.elapsedMs = (this.elapsedMs + elapsed * 1000) % 240000;
        this.draw(this.elapsedMs);
      }
    }
    this.animationId = requestAnimationFrame(this.tick);
  };

  public destroy(): void {
    if (this.animationId !== null) cancelAnimationFrame(this.animationId);
    this.observer?.disconnect();
    this.fallback.onload = this.fallback.onerror = null;
    for (const layer of this.layers) layer.image.onload = layer.image.onerror = null;
  }
}
