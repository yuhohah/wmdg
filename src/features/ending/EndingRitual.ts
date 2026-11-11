import { loadFollowerSprites, followerAnimationFrame } from '../../ui/followerVisuals.js';
import { loadIncarnationSprites } from '../../ui/incarnationSprites.js';
import { SPHERE_FORMS, SphereMotion } from '../sphere/SphereMotion.js';
import { drawSphere } from '../sphere/SphereRenderer.js';
import { VisualFrameClock } from '../../ui/visualTiming.js';

export type RitualPhase = 'gathering' | 'invocation' | 'gratitude' | 'vanishing' | 'silence' | 'complete';
export const RITUAL_CUES = { invocation: 6, gratitude: 12, vanishing: 24, silence: 27, complete: 28.5 };
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };

/** One timeline controls the actors, captions, disappearance and final card. */
export function ritualMoment(seconds: number): { phase: RitualPhase; arrival: number; seal: number; disappearance: number } {
  const phase: RitualPhase = seconds >= RITUAL_CUES.complete ? 'complete'
    : seconds >= RITUAL_CUES.silence ? 'silence'
    : seconds >= RITUAL_CUES.vanishing ? 'vanishing'
    : seconds >= RITUAL_CUES.gratitude ? 'gratitude'
    : seconds >= RITUAL_CUES.invocation ? 'invocation' : 'gathering';
  return { phase, arrival: ease(seconds / 6), seal: ease((seconds - 6) / 6), disappearance: ease((seconds - 24) / 3) };
}

const bossFolders = ['lateral/01-anubis', 'lateral/02-hades', 'lateral/03-odin', 'caos-referencia-v2'];
const bossNames = ['Anúbis', 'Hades', 'Odin', 'Caos Primordial'];
const loadSource = (source: string) => { const img = new Image(); img.src = source; return img; };
const load = (path: string) => loadSource(`${import.meta.env.BASE_URL}assets/${path}`);

/** Fullscreen sprite choreography, using the same sheets and 30 Hz clock as combat. */
export class EndingRitual {
  private frame?: number;
  private started = false;
  private preloadTimer?: ReturnType<typeof setTimeout>;
  private stopped = false;
  private elapsed = 0;
  private previousPhase?: RitualPhase;
  private clock = new VisualFrameClock();
  private followers = loadFollowerSprites();
  private solar = loadIncarnationSprites()[4].still;
  private solarWalk = load('sprites/encarnacao/05-solar/andar/spritesheet.png');
  private sphereMotion = Object.assign(new SphereMotion(), { form: SPHERE_FORMS.at(-1)! });
  private sphere = loadSource(this.sphereMotion.form.source);
  private sphereCanvas = document.createElement('canvas');
  private bosses = bossFolders.map(folder => ({
    idle: load(`sprites/bosses/${folder}/idle.png`),
    walk: load(`sprites/bosses/${folder}/andar/spritesheet.png`),
  }));
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(private canvas: HTMLCanvasElement, private onPhase: (phase: RitualPhase) => void) {
    this.sphereCanvas.width = this.sphereCanvas.height = 512;
    const images = [this.solar, this.solarWalk, this.sphere, ...this.bosses.flatMap(b => [b.idle, b.walk]), ...this.followers.flatMap(f => Object.values(f))];
    // Decode before the procession starts so slow connections do not miss the arrival.
    this.preloadTimer = setTimeout(() => this.start(), 4000);
    void Promise.allSettled(images.map(img => img.decode())).then(() => this.start());
  }

  private start(): void {
    if (this.stopped || this.started) return;
    clearTimeout(this.preloadTimer);
    this.started = true;
    this.frame = requestAnimationFrame(this.tick);
  }

  public finish(): void {
    if (this.stopped) return;
    if (!this.started) {
      this.stop();
      this.onPhase('complete');
      return;
    }
    this.elapsed = Math.max(this.elapsed, RITUAL_CUES.vanishing);
  }

  public stop(): void {
    this.stopped = true;
    clearTimeout(this.preloadTimer);
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.canvas.width = this.canvas.height = 1;
    this.sphereCanvas.width = this.sphereCanvas.height = 1;
  }

  private tick = (now: number): void => {
    if (this.stopped) return;
    const delta = this.clock.tick(now);
    if (delta !== null && !document.hidden) {
      this.elapsed += Math.min(delta, .1);
      if (!this.reducedMotion) this.sphereMotion.advance(Math.min(delta, .1));
      const moment = ritualMoment(this.elapsed);
      this.draw(moment);
      if (moment.phase !== this.previousPhase) {
        this.previousPhase = moment.phase;
        this.onPhase(moment.phase);
      }
      if (moment.phase === 'complete' || this.stopped) return;
    }
    this.frame = requestAnimationFrame(this.tick);
  };

  private draw(moment: ReturnType<typeof ritualMoment>): void {
    const canvas = this.canvas;
    const width = canvas.clientWidth < 600 ? 700 : 1100;
    const height = width * canvas.clientHeight / Math.max(1, canvas.clientWidth);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const pixels = Math.round(canvas.clientWidth * dpr);
    const pixelHeight = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== pixels || canvas.height !== pixelHeight) { canvas.width = pixels; canvas.height = pixelHeight; }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (moment.phase === 'silence' || moment.phase === 'complete') return;
    const t = this.elapsed;
    const arrival = this.reducedMotion ? 1 : moment.arrival;
    const fade = 1 - moment.disappearance;
    const cx = width / 2, cy = height * .50;
    const radius = Math.min(width * .31, height * .27);
    const ry = radius * .64;
    const converge = this.reducedMotion ? 0 : moment.disappearance * .65;
    ctx.save();
    ctx.globalAlpha = fade;
    // Etched cosmographic seal. Deliberately sparse, silver and old gold.
    for (let ring = 0; ring < 3; ring++) {
      ctx.beginPath();
      ctx.strokeStyle = ring === 1 ? '#b99b56' : '#777b86';
      ctx.lineWidth = ring === 1 ? 1.5 : .7;
      ctx.ellipse(cx, cy + 30, radius + ring * 17, ry + ring * 11, 0, 0, Math.PI * 2 * arrival);
      ctx.stroke();
    }
    for (let i = 0; i < 32; i++) {
      const angle = i * Math.PI / 16 + (this.reducedMotion ? 0 : t * .018);
      const x = cx + Math.cos(angle) * (radius + 27), y = cy + 30 + Math.sin(angle) * (ry + 18);
      ctx.fillStyle = '#979ba5';
      ctx.font = '12px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText(['✧', 'I', 'V', 'X'][i % 4], x, y);
    }
    // Four guardians enter from the cardinal directions and offer their seals.
    this.bosses.forEach((boss, i) => {
      const angle = -Math.PI * .75 + i * Math.PI * .5;
      const targetX = cx + Math.cos(angle) * radius;
      const targetY = cy + Math.sin(angle) * ry;
      let x = targetX + Math.cos(angle) * (1 - arrival) * width * .65;
      let y = targetY + Math.sin(angle) * (1 - arrival) * height * .5;
      x += (cx - x) * converge;
      y += (cy - y) * converge;
      if (moment.seal > 0) {
        ctx.strokeStyle = '#b99b56';
        ctx.globalAlpha = fade * moment.seal * .5;
        ctx.beginPath(); ctx.moveTo(x, y - 45); ctx.lineTo(cx, cy - 40); ctx.stroke();
        ctx.globalAlpha = fade;
        ctx.beginPath(); ctx.arc(x, y - 50, 14 + moment.seal * 5, 0, Math.PI * 2); ctx.stroke();
      }
      const walking = arrival < 1 && !this.reducedMotion;
      const sheet = walking ? boss.walk : boss.idle;
      const frame = walking ? Math.floor(t / .09) % Math.max(1, Math.floor(sheet.naturalWidth / 256)) : 0;
      ctx.save(); ctx.translate(x, y); ctx.scale(x > cx ? -1 : 1, 1 - moment.seal * .12);
      if (!this.reducedMotion) ctx.rotate(moment.seal * .09);
      this.sprite(ctx, sheet, frame, 256, 192, -105, -120, 210, 157.5);
      ctx.restore();
      ctx.fillStyle = '#c5c6c7'; ctx.font = '13px Georgia'; ctx.textAlign = 'center';
      ctx.fillText(bossNames[i], x, y + 57);
    });
    // A ring of devotees walks into place, kneels, then receives illumination.
    for (let i = 0; i < 24; i++) {
      const angle = i / 24 * Math.PI * 2;
      const reach = 1.25 + (1 - arrival) * 1.8;
      const x = cx + Math.cos(angle) * radius * reach * (1 - converge);
      const y = cy + 30 + Math.sin(angle) * ry * reach * (1 - converge);
      const prayerSeconds = Math.max(0, t - 6 - (i % 6) * .15);
      const anim = followerAnimationFrame(arrival < 1 ? 'walk' : 'pray', t * 8 + i, prayerSeconds, t < 12);
      const sheet = this.followers[i % 3][anim.action];
      ctx.save(); ctx.translate(x, y); ctx.scale(x > cx ? -1 : 1, 1);
      this.sprite(ctx, sheet, anim.frame, 96, 96, -28, -44, 56, 56);
      ctx.restore();
    }
    // The Solar incarnation leads the procession. The Sphere rises above the altar.
    const avatarY = cy + 100 + (1 - arrival) * height * .45;
    const solarWalking = arrival < 1 && !this.reducedMotion;
    this.sprite(ctx, solarWalking ? this.solarWalk : this.solar, solarWalking ? Math.floor(t / .12) % 8 : 0,
      128, 128, cx - 85, avatarY - 130 - moment.seal * 15, 170, 170);
    const sphereSize = 65 + moment.seal * 35;
    const float = this.reducedMotion ? 0 : Math.sin(t * .7) * 3;
    const sphereCtx = this.sphereCanvas.getContext('2d');
    if (sphereCtx && this.sphere.complete && this.sphere.naturalWidth) {
      drawSphere(sphereCtx, this.sphereMotion, this.sphere);
      ctx.drawImage(this.sphereCanvas, cx - sphereSize / 2, cy - 100 - moment.seal * 25 + float, sphereSize, sphereSize);
    }
    // Quiet ascending sparks, bounded and deterministic; no bright screen flashes.
    if (!this.reducedMotion) for (let i = 0; i < 32; i++) {
      const cycle = (t * .07 + i / 32) % 1;
      ctx.globalAlpha = fade * moment.seal * Math.sin(cycle * Math.PI) * .65;
      ctx.fillStyle = i % 5 ? '#c5c6c7' : '#b99b56';
      ctx.fillRect(cx + Math.sin(i * 2.4) * radius * (1 - cycle), cy - cycle * radius, 1.5, 3);
    }
    ctx.restore();
  }

  private sprite(ctx: CanvasRenderingContext2D, sheet: HTMLImageElement, frame: number, sw: number, sh: number,
    x: number, y: number, w: number, h: number): void {
    if (!sheet.complete || !sheet.naturalWidth) return;
    ctx.drawImage(sheet, frame * sw, 0, sw, sh, x, y, w, h);
  }
}
