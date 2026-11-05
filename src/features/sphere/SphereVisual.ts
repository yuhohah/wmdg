const ASSETS = `${import.meta.env.BASE_URL}assets/sphere/progression/`;

interface SphereForm {
  readonly id: 'nucleo' | 'meridiano' | 'equador' | 'orbitas' | 'plenitude';
  readonly still: string;
  readonly animation?: string;
}

export const SPHERE_FORMS: readonly SphereForm[] = [
  { id: 'nucleo', still: `${ASSETS}nucleo.png` },
  { id: 'meridiano', still: `${ASSETS}meridiano.png`, animation: `${ASSETS}meridiano.svg` },
  { id: 'equador', still: `${ASSETS}equador.png`, animation: `${ASSETS}equador.svg` },
  { id: 'orbitas', still: `${ASSETS}orbitas-v2.png`, animation: `${ASSETS}orbitas-v2.apng` },
  { id: 'plenitude', still: `${ASSETS}plenitude.png`, animation: `${ASSETS}plenitude.apng` },
];

/** The seal opens Meridiano; Eclipse and Solar share the final approved form. */
export function sphereFormForProgress(incarnationUnlocked: boolean, incarnationStage: number): SphereForm {
  if (!incarnationUnlocked) return SPHERE_FORMS[0];
  const stage = Number.isFinite(incarnationStage) ? Math.floor(incarnationStage) : 1;
  return SPHERE_FORMS[Math.min(4, Math.max(1, stage))];
}

/** Plays the approved SVG/APNG assets natively, without restarting them on ordinary clicks. */
export class SphereVisual {
  private readonly image = document.createElement('img');
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  private readonly failedSources = new Set<string>();
  private form = SPHERE_FORMS[0];
  private source = '';
  private visible = true;
  private observer?: IntersectionObserver;

  constructor(private readonly host: HTMLElement) {
    this.image.className = 'sphere-art';
    this.image.alt = '';
    this.image.draggable = false;
    this.image.decoding = 'async';
    this.image.onerror = () => {
      this.failedSources.add(this.source);
      this.refreshSource();
    };
    this.host.dataset.sphereForm = this.form.id;
    this.host.appendChild(this.image);
    this.reducedMotion.addEventListener('change', this.refreshSource);
    document.addEventListener('visibilitychange', this.refreshSource);
    if (typeof IntersectionObserver !== 'undefined') {
      this.observer = new IntersectionObserver(entries => {
        this.visible = entries[entries.length - 1].isIntersecting;
        this.refreshSource();
      });
      this.observer.observe(host);
    }
    this.refreshSource();
  }

  public setProgress(incarnationUnlocked: boolean, incarnationStage: number): void {
    const next = sphereFormForProgress(incarnationUnlocked, incarnationStage);
    if (next === this.form) return;
    this.form = next;
    this.host.dataset.sphereForm = next.id;
    this.refreshSource();
  }

  private refreshSource = (): void => {
    const moving = !this.reducedMotion.matches && this.visible && document.visibilityState !== 'hidden';
    this.image.classList.toggle('sphere-art-spinning', moving && this.form.id === 'nucleo');
    const animation = this.form.animation;
    const source = moving && animation && !this.failedSources.has(animation) ? animation : this.form.still;
    if (source === this.source) return;
    this.source = source;
    this.image.src = source;
  };

  public destroy(): void {
    this.observer?.disconnect();
    this.reducedMotion.removeEventListener('change', this.refreshSource);
    document.removeEventListener('visibilitychange', this.refreshSource);
    this.image.onerror = null;
    this.image.remove();
  }
}
