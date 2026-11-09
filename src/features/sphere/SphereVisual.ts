import { SPHERE_FORMS, SphereMotion, sphereFormForProgress } from './SphereMotion.js';
import { drawSphere } from './SphereRenderer.js';
import { VisualFrameClock } from '../../ui/visualTiming.js';
export { SPHERE_FORMS, sphereFormForProgress } from './SphereMotion.js';

export class SphereVisual {
  private readonly canvas = document.createElement('canvas');
  private readonly context = this.canvas.getContext('2d');
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  private readonly motion = new SphereMotion();
  private readonly failedSources = new Set<string>();
  private image?: HTMLImageElement;
  private pending?: HTMLImageElement;
  private imageSize = 512;
  private source = '';
  private visible = true;
  private destroyed = false;
  private frame?: number;
  private clock = new VisualFrameClock();
  private observer?: IntersectionObserver;

  constructor(private readonly host: HTMLElement) {
    this.canvas.className = 'sphere-art';
    this.canvas.width = this.canvas.height = 512;
    host.appendChild(this.canvas);
    host.dataset.sphereForm = this.motion.form.id;
    this.reducedMotion.addEventListener('change', this.refresh);
    document.addEventListener('visibilitychange', this.refresh);
    if (typeof IntersectionObserver !== 'undefined') {
      this.observer = new IntersectionObserver(entries => {
        this.visible = entries[entries.length - 1].isIntersecting;
        this.refresh();
      });
      this.observer.observe(host);
    }
    this.loadImage();
    this.refresh();
  }

  public setProgress(unlocked: boolean, stage: number): void {
    const next = sphereFormForProgress(unlocked, stage);
    if (next === this.motion.form) return;
    this.motion.form = next;
    this.host.dataset.sphereForm = next.id;
    this.loadImage();
    this.draw();
  }

  public reactToClick(): void { this.motion.reactToClick(); }

  private loadImage(): void {
    const form = this.motion.form;
    const source = this.failedSources.has(form.source) ? SPHERE_FORMS[0].source : form.source;
    if (source === this.source || this.failedSources.has(source)) return;
    this.source = source;
    if (this.pending) this.pending.onload = this.pending.onerror = null;
    const image = document.createElement('img');
    this.pending = image;
    image.onload = () => {
      if (this.destroyed || this.pending !== image) return;
      if (!this.context) this.image?.remove();
      this.image = image;
      this.imageSize = source === form.source ? form.size : 512;
      this.draw();
      // A readable still remains available when Canvas is unsupported.
      if (!this.context) { this.canvas.remove(); image.alt = ''; image.className = 'sphere-art'; this.host.appendChild(image); }
    };
    image.onerror = () => {
      if (this.destroyed || this.pending !== image) return;
      this.failedSources.add(source);
      this.loadImage();
    };
    image.src = source;
  }

  private draw(): void {
    if (this.context) drawSphere(this.context, this.motion, this.image, this.imageSize);
  }

  private tick = (time: number): void => {
    this.frame = undefined;
    const elapsed = this.clock.tick(time);
    if (elapsed !== null) {
      this.motion.advance(Math.min(0.1, elapsed));
      this.draw();
    }
    this.frame = requestAnimationFrame(this.tick);
  };

  private refresh = (): void => {
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
    this.clock = new VisualFrameClock();
    this.draw();
    if (!this.destroyed && this.context && !this.reducedMotion.matches && this.visible && document.visibilityState !== 'hidden') {
      this.frame = requestAnimationFrame(this.tick);
    }
  };

  public destroy(): void {
    this.destroyed = true;
    this.observer?.disconnect();
    this.reducedMotion.removeEventListener('change', this.refresh);
    document.removeEventListener('visibilitychange', this.refresh);
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    if (this.pending) this.pending.onload = this.pending.onerror = null;
    this.image?.remove();
    this.canvas.remove();
  }
}
