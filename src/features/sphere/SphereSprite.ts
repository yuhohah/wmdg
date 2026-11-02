import { VisualFrameClock } from '../../ui/visualTiming.js';

const SIZE = 384;
const COLUMNS = 8;
const FRAMES = 64;
const FRAME_MS = 80;
const ASSET_PATH = `${import.meta.env.BASE_URL}assets/sprites/esfera/girar/`;

export function sphereSpriteFrame(elapsedMs: number): { index: number; x: number; y: number } {
  const index = Math.floor(Math.max(0, elapsedMs) / FRAME_MS) % FRAMES;
  return { index, x: (index % COLUMNS) * SIZE, y: Math.floor(index / COLUMNS) * SIZE };
}

/** Plays the baked counter-rotation; clicks animate the canvas, never its frame angles. */
export class SphereSprite {
  private image = new Image();
  private ctx: CanvasRenderingContext2D;
  private clock = new VisualFrameClock();
  private elapsedMs = 0;
  private lastFrame = -1;
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
    this.image.onload = () => {
      this.draw(0);
      this.animationId = requestAnimationFrame(this.tick);
    };
    this.image.onerror = () => {
      // A failed sheet can still show the approved first pose without losing clicks.
      this.image.onload = () => this.ctx.drawImage(this.image, 0, 0, SIZE, SIZE);
      this.image.onerror = null;
      this.image.src = `${ASSET_PATH}00.png`;
    };
    this.image.src = `${ASSET_PATH}spritesheet.png`;
  }

  private draw(elapsedMs: number): void {
    const frame = sphereSpriteFrame(elapsedMs);
    if (frame.index === this.lastFrame) return;
    this.ctx.clearRect(0, 0, SIZE, SIZE);
    this.ctx.drawImage(this.image, frame.x, frame.y, SIZE, SIZE, 0, 0, SIZE, SIZE);
    this.lastFrame = frame.index;
  }

  private tick = (nowMs: number): void => {
    const elapsed = this.clock.tick(nowMs);
    if (elapsed !== null && this.visible && document.visibilityState !== 'hidden') {
      if (this.reducedMotion.matches) {
        this.draw(0);
      } else {
        this.elapsedMs = (this.elapsedMs + elapsed * 1000) % (FRAMES * FRAME_MS);
        this.draw(this.elapsedMs);
      }
    }
    this.animationId = requestAnimationFrame(this.tick);
  };

  public destroy(): void {
    if (this.animationId !== null) cancelAnimationFrame(this.animationId);
    this.observer?.disconnect();
    this.image.onload = this.image.onerror = null;
  }
}
