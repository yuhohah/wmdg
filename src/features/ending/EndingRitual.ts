import { loadFollowerSprites, followerAnimationFrame, FOLLOWER_FRAME_SIZE } from '../followers/followerVisuals.js';
import { loadIncarnationSprites, INCARNATION_FRAME_SIZE } from '../incarnation/incarnationSprites.js';
import {
  BOSS_DEFAULT_BOUNDS,
  BOSS_SRC_H,
  BOSS_SRC_W,
  bossLoopFrameCount,
  bossSheetFrameCount,
  demiurgeChannelingFrame,
  loadBossSprites,
  type BossLateralSprites,
} from '../gnose/battle/BossSprites.js';
import { SPHERE_FORMS, SphereMotion } from '../sphere/SphereMotion.js';
import { drawSphere } from '../sphere/SphereRenderer.js';
import { getVisualFps, VisualFrameClock } from '../../ui/visualTiming.js';

export type RitualPhase = 'gathering' | 'invocation' | 'gratitude' | 'vanishing' | 'silence' | 'complete';

export const RITUAL_CUES = {
  invocation: 6.5,
  gratitude: 14.5,
  vanishing: 26.5,
  silence: 30.0,
  complete: 31.4,
};

const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));
const smoothstep = (n: number) => {
  const t = clamp(n);
  return t * t * (3 - 2 * t);
};
const smootherstep = (n: number) => {
  const t = clamp(n);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

/** Unified timeline controlling the procession, Demiurge subjugation, apotheosis, disappearance and final card. */
export function ritualMoment(seconds: number): {
  phase: RitualPhase;
  arrival: number;
  seal: number;
  apotheosis: number;
  disappearance: number;
} {
  const phase: RitualPhase =
    seconds >= RITUAL_CUES.complete
      ? 'complete'
      : seconds >= RITUAL_CUES.silence
        ? 'silence'
        : seconds >= RITUAL_CUES.vanishing
          ? 'vanishing'
          : seconds >= RITUAL_CUES.gratitude
            ? 'gratitude'
            : seconds >= RITUAL_CUES.invocation
              ? 'invocation'
              : 'gathering';

  return {
    phase,
    arrival: smootherstep(seconds / RITUAL_CUES.invocation),
    seal: smoothstep((seconds - RITUAL_CUES.invocation) / (RITUAL_CUES.gratitude - RITUAL_CUES.invocation)),
    apotheosis: smoothstep((seconds - RITUAL_CUES.gratitude) / 3.2),
    disappearance: smootherstep((seconds - RITUAL_CUES.vanishing) / (RITUAL_CUES.silence - RITUAL_CUES.vanishing)),
  };
}

interface BossRitualSpec {
  bossId: string;
  name: string;
  ritualAttackIndex: number;
  slot: 'nw' | 'ne' | 'sw' | 'se' | 'demiurge';
  arrivalDelay: number;
  arrivalDuration: number;
  ritualStartSec: number;
  ritualDurationSec: number;
  scale: number;
  accent: string;
  secondaryAccent?: string;
}

const BOSS_RITUAL_SPECS: readonly BossRitualSpec[] = [
  {
    bossId: 'boss_tiamat',
    name: 'Caos Primordial',
    ritualAttackIndex: 1, // ataque-circulos
    slot: 'nw',
    arrivalDelay: 0.25,
    arrivalDuration: 5.4,
    ritualStartSec: 7.2,
    ritualDurationSec: 2.6,
    scale: 0.88,
    accent: '#9fa6b8',
  },
  {
    bossId: 'boss_odin',
    name: 'Odin',
    ritualAttackIndex: 1, // ataque-corvo
    slot: 'ne',
    arrivalDelay: 0.45,
    arrivalDuration: 5.4,
    ritualStartSec: 7.8,
    ritualDurationSec: 2.5,
    scale: 0.88,
    accent: '#c5c6c7',
  },
  {
    bossId: 'boss_anubis',
    name: 'Anúbis',
    ritualAttackIndex: 1, // ataque-balanca
    slot: 'sw',
    arrivalDelay: 0.0,
    arrivalDuration: 5.3,
    ritualStartSec: 6.7,
    ritualDurationSec: 2.5,
    scale: 0.88,
    accent: '#b99b56',
  },
  {
    bossId: 'boss_cronos',
    name: 'Hades',
    ritualAttackIndex: 1, // ataque-correntes
    slot: 'se',
    arrivalDelay: 0.15,
    arrivalDuration: 5.3,
    ritualStartSec: 7.0,
    ritualDurationSec: 2.5,
    scale: 0.88,
    accent: '#a9adb7',
  },
  {
    bossId: 'boss_demiurge',
    name: 'O Demiurgo',
    ritualAttackIndex: 2, // ataque-ritual (pale silver-violet celestial light + raised staff)
    slot: 'demiurge',
    arrivalDelay: 0.65,
    arrivalDuration: 5.75,
    ritualStartSec: 8.6,
    ritualDurationSec: 5.6,
    scale: 0.98,
    accent: '#ddc99a',
    secondaryAccent: '#b8b2e0',
  },
];

interface StarPoint {
  u: number;
  v: number;
  size: number;
  phase: number;
  speed: number;
  gold: boolean;
  cross: boolean;
}

const STARS: readonly StarPoint[] = Array.from({ length: 52 }, (_, i) => {
  const s1 = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  const s2 = Math.sin(i * 93.9898 + 19.19) * 24634.6345;
  const u = s1 - Math.floor(s1);
  const v = s2 - Math.floor(s2);
  return {
    u,
    v,
    size: 0.8 + (i % 4) * 0.42,
    phase: (i * 1.37) % (Math.PI * 2),
    speed: 0.7 + (i % 5) * 0.28,
    gold: i % 6 === 0,
    cross: i % 11 === 0,
  };
});

const EPIGRAPHS = ['✧', '☉', 'I', '☽', 'V', '✧', 'X', '☉'] as const;

type GroundActorEntry =
  | {
      kind: 'solar';
      y: number;
      x: number;
      progress: number;
      seal: number;
      apotheosis: number;
      fade: number;
      t: number;
    }
  | {
      kind: 'boss';
      y: number;
      x: number;
      bossIndex: number;
      progress: number;
      seal: number;
      apotheosis: number;
      fade: number;
      t: number;
    }
  | {
      kind: 'devotee';
      y: number;
      x: number;
      cx: number;
      devoteeIndex: number;
      tier: number;
      progress: number;
      seal: number;
      fade: number;
      t: number;
    };

const loadSource = (source: string) => {
  const img = new Image();
  img.src = source;
  return img;
};
const loadAsset = (path: string) => loadSource(`${import.meta.env.BASE_URL}assets/${path}`);

/** Fullscreen 60fps Hermetic cosmography finale uniting the Sphere, Solar Avatar, Devotees, Four Guardians and Demiurge. */
export class EndingRitual {
  private frame?: number;
  private started = false;
  private preloadTimer?: ReturnType<typeof setTimeout>;
  private stopped = false;
  private elapsed = 0;
  private clock = new VisualFrameClock();
  private previousPhase?: RitualPhase;
  private ctx: CanvasRenderingContext2D | null = null;

  private followers = loadFollowerSprites();
  private solarStill = loadIncarnationSprites()[4].still;
  private solarWalk = loadAsset('sprites/encarnacao/05-solar/andar/spritesheet.png');
  private sphereMotion = Object.assign(new SphereMotion(), { form: SPHERE_FORMS.at(-1)! });
  private sphere = loadSource(this.sphereMotion.form.source);
  private sphereCanvas = document.createElement('canvas');
  private bossSprites: { spec: BossRitualSpec; sprites: BossLateralSprites }[] = BOSS_RITUAL_SPECS.map((spec) => ({
    spec,
    sprites: loadBossSprites(spec.bossId)!,
  }));
  private actorPool: GroundActorEntry[] = [];
  private actorQueue: GroundActorEntry[] = [];
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(
    private canvas: HTMLCanvasElement,
    private onPhase: (phase: RitualPhase) => void
  ) {
    this.ctx = canvas.getContext('2d');
    this.sphereCanvas.width = this.sphereCanvas.height = 512;
    const images: HTMLImageElement[] = [
      this.solarStill,
      this.solarWalk,
      this.sphere,
      ...this.bossSprites.flatMap(({ spec, sprites }) => [
        sprites.idle,
        sprites.walk,
        sprites.defeat,
        sprites.attacks[spec.ritualAttackIndex],
      ]),
      ...this.followers.flatMap((f) => Object.values(f)),
    ].filter((img): img is HTMLImageElement => Boolean(img));

    // Decode before the procession starts so slow connections do not miss the arrival.
    this.preloadTimer = setTimeout(() => this.start(), 4000);
    void Promise.allSettled(images.map((img) => img.decode())).then(() => this.start());
  }

  private start(): void {
    if (this.stopped || this.started) return;
    clearTimeout(this.preloadTimer);
    this.started = true;
    this.clock.reset();
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
    const frameSec = this.clock.tick(now);
    if (frameSec !== null && !document.hidden) {
      const rawDelta = frameSec === 0 ? 1 / getVisualFps() : frameSec;
      const dt = clamp(rawDelta, 0, 0.1);
      this.elapsed += dt;
      if (!this.reducedMotion) {
        this.sphereMotion.advance(dt);
      }
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

  private acquireActorSlot(slotIndex: number): GroundActorEntry {
    let slot = this.actorPool[slotIndex];
    if (!slot) {
      slot = {
        kind: 'devotee',
        y: 0,
        x: 0,
        cx: 0,
        devoteeIndex: 0,
        tier: 0,
        progress: 0,
        seal: 0,
        fade: 0,
        t: 0,
      };
      this.actorPool[slotIndex] = slot;
    }
    this.actorQueue.push(slot);
    return slot;
  }

  private queueSolarActor(
    slotIndex: number,
    x: number,
    y: number,
    progress: number,
    seal: number,
    apotheosis: number,
    fade: number,
    t: number
  ): void {
    const slot = this.acquireActorSlot(slotIndex) as Extract<GroundActorEntry, { kind: 'solar' }>;
    slot.kind = 'solar';
    slot.x = x;
    slot.y = y;
    slot.progress = progress;
    slot.seal = seal;
    slot.apotheosis = apotheosis;
    slot.fade = fade;
    slot.t = t;
  }

  private queueBossActor(
    slotIndex: number,
    bossIndex: number,
    x: number,
    y: number,
    progress: number,
    seal: number,
    apotheosis: number,
    fade: number,
    t: number
  ): void {
    const slot = this.acquireActorSlot(slotIndex) as Extract<GroundActorEntry, { kind: 'boss' }>;
    slot.kind = 'boss';
    slot.bossIndex = bossIndex;
    slot.x = x;
    slot.y = y;
    slot.progress = progress;
    slot.seal = seal;
    slot.apotheosis = apotheosis;
    slot.fade = fade;
    slot.t = t;
  }

  private queueDevoteeActor(
    slotIndex: number,
    devoteeIndex: number,
    tier: number,
    x: number,
    y: number,
    cx: number,
    progress: number,
    seal: number,
    fade: number,
    t: number
  ): void {
    const slot = this.acquireActorSlot(slotIndex) as Extract<GroundActorEntry, { kind: 'devotee' }>;
    slot.kind = 'devotee';
    slot.devoteeIndex = devoteeIndex;
    slot.tier = tier;
    slot.x = x;
    slot.y = y;
    slot.cx = cx;
    slot.progress = progress;
    slot.seal = seal;
    slot.fade = fade;
    slot.t = t;
  }

  private draw(moment: ReturnType<typeof ritualMoment>): void {
    const canvas = this.canvas;
    const clientW = Math.max(1, canvas.clientWidth);
    const clientH = Math.max(1, canvas.clientHeight);
    const width = clientW < 640 ? 740 : 1160;
    const height = (width * clientH) / clientW;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const pixels = Math.max(1, Math.round(clientW * dpr));
    const pixelHeight = Math.max(1, Math.round(clientH * dpr));
    if (canvas.width !== pixels || canvas.height !== pixelHeight) {
      canvas.width = pixels;
      canvas.height = pixelHeight;
    }

    const ctx = (this.ctx ??= canvas.getContext('2d'));
    if (!ctx) return;
    ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (moment.phase === 'silence' || moment.phase === 'complete') return;

    const t = this.elapsed;
    const arrival = this.reducedMotion ? 1 : moment.arrival;
    const seal = moment.seal;
    const apotheosis = moment.apotheosis;
    const disappearance = moment.disappearance;
    const fade = 1 - disappearance;
    const converge = this.reducedMotion ? 0 : disappearance * 0.78;

    const compact = width < 800;
    const cx = width * 0.5;
    const cy = height * (compact ? 0.54 : 0.555);
    const rx = Math.min(width * (compact ? 0.36 : 0.315), height * 0.45);
    const ry = Math.min(width * (compact ? 0.19 : 0.165), height * (compact ? 0.155 : 0.165));

    const floatY = this.reducedMotion ? 0 : Math.sin(t * 1.15) * 4.5;
    const sphereBaseY = cy - ry * 0.58 - seal * (compact ? 22 : 28) + floatY;
    const sphereSize = (compact ? 74 : 84) + seal * (compact ? 26 : 34) - disappearance * 42;

    ctx.save();

    // 1. Atmospheric nocturnal void glow & fixed twinkling firmament
    this.drawFirmament(ctx, width, height, cx, sphereBaseY, t, arrival, seal, fade);

    // 2. Engraved Renaissance Hermetic floor, hexagram of the 6 powers & central altar dais
    const nodePositions = this.computeSanctuaryNodes(cx, cy, rx, ry);
    this.drawCosmographicFloor(ctx, cx, cy, rx, ry, nodePositions, t, arrival, seal, apotheosis, fade);

    // 3. Resolve actor states & draw luminous Bézier tribute conduits behind actors
    this.actorQueue.length = 0;
    let slotIdx = 0;

    // Solar Avatar (West of the Altar, leading humanity)
    const solarProgress = this.reducedMotion ? 1 : smootherstep((t - 0.35) / 5.5);
    const solarStartX = cx - width * 0.58;
    const solarStartY = nodePositions.solar.y + height * 0.16;
    let solarX = solarStartX + (nodePositions.solar.x - solarStartX) * solarProgress;
    let solarY = solarStartY + (nodePositions.solar.y - solarStartY) * solarProgress;
    solarX += (cx - solarX) * converge;
    solarY += (sphereBaseY + 34 - solarY) * converge;

    if (seal > 0.02) {
      this.drawLeyConduit(
        ctx,
        solarX + 12,
        solarY - 78,
        cx,
        sphereBaseY,
        '#ddc99a',
        seal * fade * 0.72,
        t,
        0.5,
        -28
      );
    }

    this.queueSolarActor(slotIdx++, solarX, solarY, solarProgress, seal, apotheosis, fade, t);

    // Five Cosmic Bosses: Four Cardinal Guardians + O Demiurgo (East of the Altar)
    for (let i = 0; i < this.bossSprites.length; i++) {
      const { spec } = this.bossSprites[i];
      const target = nodePositions[spec.slot];
      const actorProgress = this.reducedMotion
        ? 1
        : smootherstep((t - spec.arrivalDelay) / spec.arrivalDuration);

      const dirX = target.x >= cx ? 1 : -1;
      const dirY = spec.slot === 'nw' || spec.slot === 'ne' ? -1 : spec.slot === 'demiurge' ? -0.35 : 0.85;
      const startX = target.x + dirX * width * (spec.slot === 'demiurge' ? 0.52 : 0.48);
      const startY = target.y + dirY * height * (spec.slot === 'demiurge' ? 0.28 : 0.32);

      // Gentle serpentine S-curve on arrival for Demiurge, crisp cardinal march for Guardians
      const arcBend =
        spec.slot === 'demiurge' && !this.reducedMotion
          ? Math.sin(actorProgress * Math.PI) * -26
          : 0;
      let bx = startX + (target.x - startX) * actorProgress;
      let by = startY + (target.y - startY) * actorProgress + arcBend;
      bx += (cx - bx) * converge;
      by += (sphereBaseY + 36 - by) * converge;

      if (seal > 0.02) {
        const bossSealWake = clamp((t - (spec.ritualStartSec - 0.5)) / 1.8);
        const conduitAlpha = fade * (0.22 + 0.58 * bossSealWake) * seal;
        const sourceY = by - (spec.slot === 'demiurge' ? 98 : 74) * spec.scale;
        this.drawLeyConduit(
          ctx,
          bx,
          sourceY,
          cx,
          sphereBaseY,
          spec.accent,
          conduitAlpha,
          t,
          i * 1.17,
          spec.slot === 'sw' || spec.slot === 'se' ? -36 : -22
        );
        if (spec.secondaryAccent) {
          // Twin Lunar silver-violet stream from the Demiurge's celestial staff
          this.drawLeyConduit(
            ctx,
            bx - 16,
            sourceY - 22,
            cx,
            sphereBaseY - 6,
            spec.secondaryAccent,
            conduitAlpha * 0.92,
            t,
            i * 1.17 + 0.45,
            -48
          );
        }
      }

      this.queueBossActor(slotIdx++, i, bx, by, actorProgress, seal, apotheosis, fade, t);
    }

    // Two harmonic rings of 28 Devotees processing inward, kneeling in prayer, then receiving illumination
    const devoteeCount = 28;
    for (let i = 0; i < devoteeCount; i++) {
      const innerRing = i % 2 === 0;
      const baseAngle = (i / devoteeCount) * Math.PI * 2 + (innerRing ? 0.06 : -0.06);
      const devDelay = (i % 7) * 0.14;
      const devProgress = this.reducedMotion ? 1 : smootherstep((t - devDelay) / 5.6);
      const spiralAngle = baseAngle + (1 - devProgress) * (innerRing ? 0.38 : -0.32);
      const ringScale = (innerRing ? 1.18 : 1.34) + (1 - devProgress) * 1.35;

      let fx = cx + Math.cos(spiralAngle) * rx * ringScale;
      let fy = cy + Math.sin(spiralAngle) * ry * ringScale;
      fx += (cx - fx) * converge;
      fy += (sphereBaseY + 32 - fy) * converge;

      const tier = i % 7 === 0 ? 2 : i % 3 === 0 ? 1 : 0;
      this.queueDevoteeActor(slotIdx++, i, tier, fx, fy, cx, devProgress, seal, fade, t);
    }

    // 4. Painter's order Y-sort so northern figures sit naturally behind southern figures
    this.actorQueue.sort((a, b) => a.y - b.y);
    for (let i = 0; i < this.actorQueue.length; i++) {
      const actor = this.actorQueue[i];
      if (actor.kind === 'solar') {
        this.drawSolarAvatar(ctx, actor.x, actor.y, actor.progress, actor.seal, actor.apotheosis, actor.fade, actor.t);
      } else if (actor.kind === 'boss') {
        const { spec, sprites } = this.bossSprites[actor.bossIndex];
        this.drawBossActor(ctx, spec, sprites, actor.x, actor.y, actor.progress, actor.seal, actor.apotheosis, actor.fade, actor.t);
      } else {
        this.drawDevotee(ctx, actor.x, actor.y, actor.cx, actor.devoteeIndex, actor.tier, actor.progress, actor.seal, actor.fade, actor.t);
      }
    }

    // 5. Elevated Divine Sphere cradled inside 3D-projected rotating Armillary Meridian Rings
    this.drawElevatedSphereAndArmillary(
      ctx,
      cx,
      sphereBaseY,
      sphereSize,
      t,
      arrival,
      seal,
      apotheosis,
      disappearance,
      fade
    );

    // 6. Quiet ascending sparks & vanishing astral convergence spiral
    if (!this.reducedMotion) {
      this.drawAstralParticles(ctx, cx, cy, sphereBaseY, rx, ry, t, seal, disappearance, fade);
    }

    ctx.restore();

    // Final pinpoint star lingering briefly as the sanctuary dissolves into the void
    if (disappearance > 0.55) {
      const starPulse = Math.sin(clamp((disappearance - 0.55) / 0.45) * Math.PI);
      if (starPulse > 0.01) {
        this.drawCrossStar(ctx, cx, sphereBaseY, 16 * starPulse, `rgba(221, 201, 154, ${0.85 * starPulse})`);
      }
    }
  }

  private computeSanctuaryNodes(cx: number, cy: number, rx: number, ry: number) {
    return {
      solar: { x: cx - rx * 0.46, y: cy + ry * 0.06 },
      demiurge: { x: cx + rx * 0.46, y: cy + ry * 0.06 },
      nw: { x: cx - rx * 0.84, y: cy - ry * 0.64 },
      ne: { x: cx + rx * 0.84, y: cy - ry * 0.64 },
      sw: { x: cx - rx * 0.92, y: cy + ry * 0.68 },
      se: { x: cx + rx * 0.92, y: cy + ry * 0.68 },
    };
  }

  private drawFirmament(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    cx: number,
    sphereY: number,
    t: number,
    arrival: number,
    seal: number,
    fade: number
  ): void {
    const glowRadius = Math.max(width, height) * (0.36 + seal * 0.12);
    const bgGlow = ctx.createRadialGradient(cx, sphereY + 24, 8, cx, sphereY + 24, glowRadius);
    bgGlow.addColorStop(0, `rgba(38, 36, 48, ${(0.28 + seal * 0.24) * fade})`);
    bgGlow.addColorStop(0.45, `rgba(20, 22, 31, ${(0.18 + seal * 0.12) * fade})`);
    bgGlow.addColorStop(1, 'rgba(9, 10, 15, 0)');
    ctx.fillStyle = bgGlow;
    ctx.fillRect(0, 0, width, height);

    const starAlphaBase = (0.35 + 0.65 * arrival) * fade;
    for (let i = 0; i < STARS.length; i++) {
      const s = STARS[i];
      const sx = s.u * width;
      const sy = s.v * height * 0.86;
      const twinkle = this.reducedMotion ? 0.75 : 0.45 + 0.55 * Math.sin(t * s.speed + s.phase);
      const alpha = starAlphaBase * twinkle * 0.72;
      if (alpha <= 0.02) continue;

      const color = s.gold ? `rgba(221, 201, 154, ${alpha})` : `rgba(197, 198, 199, ${alpha})`;
      if (s.cross) {
        this.drawCrossStar(ctx, sx, sy, s.size * 3.1, color);
      } else {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawCosmographicFloor(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    nodes: ReturnType<EndingRitual['computeSanctuaryNodes']>,
    t: number,
    arrival: number,
    seal: number,
    apotheosis: number,
    fade: number
  ): void {
    ctx.save();
    const arcSweep = Math.PI * 2 * arrival;

    // Concentric engraved ellipses
    const ringScales = [
      { s: 0.46, color: '#8c9099', width: 0.9, dash: [] as number[] },
      { s: 1.0, color: '#b99b56', width: 1.5, dash: [] as number[] },
      { s: 1.09, color: '#686c77', width: 0.8, dash: [4, 6] },
      { s: 1.26, color: '#585c66', width: 0.85, dash: [] as number[] },
    ];
    for (let i = 0; i < ringScales.length; i++) {
      const r = ringScales[i];
      ctx.beginPath();
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = fade * (i === 1 ? 0.78 + seal * 0.2 : 0.48 + seal * 0.16);
      ctx.lineWidth = r.width;
      ctx.setLineDash(r.dash);
      ctx.ellipse(cx, cy, rx * r.s, ry * r.s, 0, -Math.PI * 0.5, -Math.PI * 0.5 + arcSweep);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Fine degree tick marks between rings 1.0 and 1.09
    const tickCount = Math.floor(64 * arrival);
    const spin = this.reducedMotion ? 0 : t * 0.022;
    ctx.strokeStyle = '#8b8f99';
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = fade * 0.45;
    ctx.beginPath();
    for (let i = 0; i < tickCount; i++) {
      const a = (i / 64) * Math.PI * 2 + spin;
      const major = i % 8 === 0;
      const r0 = major ? 0.985 : 1.01;
      const r1 = major ? 1.105 : 1.075;
      ctx.moveTo(cx + Math.cos(a) * rx * r0, cy + Math.sin(a) * ry * r0);
      ctx.lineTo(cx + Math.cos(a) * rx * r1, cy + Math.sin(a) * ry * r1);
    }
    ctx.stroke();

    // Rotating Hermetic & Roman epigraphs
    if (arrival > 0.35) {
      const textAlpha = fade * clamp((arrival - 0.35) / 0.45) * 0.68;
      ctx.globalAlpha = textAlpha;
      ctx.font = '11px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2 - spin * 0.8;
        const tx = cx + Math.cos(a) * rx * 1.175;
        const ty = cy + Math.sin(a) * ry * 1.175;
        ctx.fillStyle = i % 3 === 0 ? '#b99b56' : '#979ba5';
        ctx.fillText(EPIGRAPHS[i % EPIGRAPHS.length], tx, ty);
      }
    }

    // Inscribed Sacred Hexagram / Seal uniting the 6 inner & cardinal sanctuaries
    if (arrival > 0.25) {
      const hexProgress = clamp((arrival - 0.25) / 0.75);
      const triA = [nodes.nw, nodes.ne, { x: cx, y: cy + ry * 0.98 }];
      const triB = [nodes.sw, nodes.se, { x: cx, y: cy - ry * 0.98 }];
      ctx.lineWidth = 1.05;
      ctx.strokeStyle = seal > 0.1 ? '#b99b56' : '#777b86';
      ctx.globalAlpha = fade * hexProgress * (0.28 + seal * 0.34 + apotheosis * 0.14);

      for (const tri of [triA, triB]) {
        ctx.beginPath();
        ctx.moveTo(tri[0].x, tri[0].y);
        ctx.lineTo(tri[1].x, tri[1].y);
        ctx.lineTo(tri[2].x, tri[2].y);
        ctx.closePath();
        ctx.stroke();
      }

      // Horizontal Equinox Axis uniting Avatar Solar (West) — Central Altar — O Demiurgo (East)
      ctx.strokeStyle = '#ddc99a';
      ctx.globalAlpha = fade * hexProgress * (0.34 + seal * 0.4);
      ctx.beginPath();
      ctx.moveTo(nodes.solar.x, nodes.solar.y);
      ctx.lineTo(nodes.demiurge.x, nodes.demiurge.y);
      ctx.stroke();
    }

    // Central Altar Dais directly beneath the Divine Sphere
    ctx.globalAlpha = fade * (0.55 + seal * 0.35);
    ctx.strokeStyle = '#b99b56';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4, 46, 20, 0, 0, Math.PI * 2 * arrival);
    ctx.stroke();
    ctx.strokeStyle = '#c5c6c7';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4, 32, 13.5, 0, 0, Math.PI * 2 * arrival);
    ctx.stroke();

    // Node sigils etched at each of the 6 positions
    const allNodes: { pos: { x: number; y: number }; color: string; r: number }[] = [
      { pos: nodes.solar, color: '#ddc99a', r: 30 },
      { pos: nodes.demiurge, color: '#b8b2e0', r: 34 },
      { pos: nodes.nw, color: '#9fa6b8', r: 26 },
      { pos: nodes.ne, color: '#c5c6c7', r: 26 },
      { pos: nodes.sw, color: '#b99b56', r: 26 },
      { pos: nodes.se, color: '#a9adb7', r: 26 },
    ];
    for (const n of allNodes) {
      ctx.globalAlpha = fade * arrival * (0.35 + seal * 0.4);
      ctx.strokeStyle = n.color;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.ellipse(n.pos.x, n.pos.y, n.r, n.r * 0.44, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.ellipse(n.pos.x, n.pos.y, n.r * 0.68, n.r * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawLeyConduit(
    ctx: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    color: string,
    alpha: number,
    t: number,
    phaseOffset: number,
    liftY: number
  ): void {
    if (alpha <= 0.01) return;
    const mx = (x0 + x1) * 0.5;
    const my = Math.min(y0, y1) + liftY;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha * 0.55;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(mx, my, x1, y1);
    ctx.stroke();

    // Secondary fine silver thread
    ctx.globalAlpha = alpha * 0.25;
    ctx.lineWidth = 0.65;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(x0, y0 + 4);
    ctx.quadraticCurveTo(mx, my + 8, x1, y1);
    ctx.stroke();
    ctx.setLineDash([]);

    // Flowing luminous motes streaming along the quadratic Bézier toward the Sphere
    if (!this.reducedMotion) {
      for (let m = 0; m < 3; m++) {
        const u = (t * 0.42 + phaseOffset + m / 3) % 1;
        const inv = 1 - u;
        const px = inv * inv * x0 + 2 * inv * u * mx + u * u * x1;
        const py = inv * inv * y0 + 2 * inv * u * my + u * u * y1;
        const pulse = Math.sin(u * Math.PI);
        ctx.globalAlpha = alpha * pulse * 0.95;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(px, py, 1.7 + pulse * 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private drawBossActor(
    ctx: CanvasRenderingContext2D,
    spec: BossRitualSpec,
    sprites: BossLateralSprites,
    x: number,
    y: number,
    actorProgress: number,
    seal: number,
    apotheosis: number,
    fade: number,
    t: number
  ): void {
    const isDemiurge = spec.slot === 'demiurge';
    const walking = actorProgress < 0.995 && !this.reducedMotion;
    const ritualSheet = sprites.attacks[spec.ritualAttackIndex] ?? sprites.idle;

    let sheet: HTMLImageElement = sprites.idle;
    let frame = 0;
    let channelingGlow = 0;

    if (this.reducedMotion) {
      if (isDemiurge && seal > 0.2) {
        sheet = ritualSheet;
        frame = 8;
        channelingGlow = 0.65;
      } else {
        sheet = sprites.idle;
        frame = 0;
      }
    } else if (walking) {
      sheet = sprites.walk;
      const loopLen = bossLoopFrameCount(sheet);
      frame = Math.floor(t / 0.086) % loopLen;
    } else {
      const sinceRitual = t - spec.ritualStartSec;
      if (isDemiurge) {
        // Subjugation dip (crown droops briefly before the Sphere) -> Grand Celestial Staff Ritual -> periodic reverence
        const bowWindow = t - 7.15;
        if (bowWindow >= 0 && bowWindow < 1.35 && sprites.defeat.complete && sprites.defeat.naturalWidth >= BOSS_SRC_W) {
          sheet = sprites.defeat;
          const bowWave = Math.sin((bowWindow / 1.35) * Math.PI);
          frame = Math.min(4, Math.round(bowWave * 4));
        } else if (sinceRitual >= 0 && sinceRitual <= spec.ritualDurationSec) {
          sheet = ritualSheet;
          frame = demiurgeChannelingFrame(sinceRitual, spec.ritualDurationSec);
          channelingGlow = Math.sin(clamp(sinceRitual / spec.ritualDurationSec) * Math.PI);
        } else if (apotheosis > 0) {
          // During gratitude, Demiurge alternates gently between serpentine breathing and raising the celestial staff
          const cycle = (t - RITUAL_CUES.gratitude) % 7.5;
          if (cycle < 4.4) {
            sheet = ritualSheet;
            frame = demiurgeChannelingFrame(cycle, 4.4);
            channelingGlow = Math.sin(clamp(cycle / 4.4) * Math.PI) * 0.85;
          } else {
            sheet = sprites.walk;
            frame = Math.floor(t / 0.16) % bossLoopFrameCount(sheet);
          }
        } else {
          sheet = sprites.walk;
          frame = Math.floor(t / 0.17) % bossLoopFrameCount(sheet);
        }
      } else {
        // Four Guardians: perform signature domain tribute during invocation, then periodic solemn waves in gratitude
        const totalFrames = bossSheetFrameCount(ritualSheet);
        if (sinceRitual >= 0 && sinceRitual <= spec.ritualDurationSec) {
          sheet = ritualSheet;
          const u = clamp(sinceRitual / spec.ritualDurationSec);
          frame = Math.min(totalFrames - 1, Math.floor(u * totalFrames));
          channelingGlow = Math.sin(u * Math.PI);
        } else if (apotheosis > 0) {
          const period = 8.4;
          const local = (t - RITUAL_CUES.gratitude + spec.arrivalDelay * 5.2) % period;
          if (local < 2.4) {
            sheet = ritualSheet;
            const u = local / 2.4;
            frame = Math.min(totalFrames - 1, Math.floor(u * totalFrames));
            channelingGlow = Math.sin(u * Math.PI) * 0.7;
          } else if (spec.bossId === 'boss_tiamat') {
            sheet = sprites.walk;
            frame = Math.floor(t / 0.14) % bossLoopFrameCount(sheet);
          } else {
            sheet = sprites.idle;
            frame = 0;
          }
        }
      }
    }

    const bounds = BOSS_DEFAULT_BOUNDS[spec.bossId] ?? BOSS_DEFAULT_BOUNDS.boss_anubis;
    const anchorSrcX = (bounds.minX + bounds.maxX) * 0.5;
    const anchorSrcY = bounds.maxY;
    const drawScale = 0.78 * spec.scale;
    const drawW = BOSS_SRC_W * drawScale;
    const drawH = BOSS_SRC_H * drawScale;
    const breathY =
      !walking && !this.reducedMotion ? Math.sin(t * 1.5 + spec.arrivalDelay * 4) * 2.2 : 0;

    ctx.save();
    ctx.globalAlpha = fade;

    // Grounded elliptical shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
    ctx.beginPath();
    ctx.ellipse(x, y + 2, isDemiurge ? 40 : 32, isDemiurge ? 13 : 10.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Celestial aura behind Demiurge (or subtle domain halo behind Guardians during channeling)
    if (isDemiurge || channelingGlow > 0.04) {
      const auraStrength = isDemiurge ? 0.24 + channelingGlow * 0.36 + seal * 0.16 : channelingGlow * 0.32;
      const auraR = isDemiurge ? 76 : 56;
      const grad = ctx.createRadialGradient(x, y - drawH * 0.48, 6, x, y - drawH * 0.48, auraR);
      grad.addColorStop(
        0,
        isDemiurge
          ? `rgba(184, 178, 224, ${auraStrength * fade})`
          : `rgba(221, 201, 154, ${auraStrength * fade})`
      );
      grad.addColorStop(0.55, `rgba(185, 155, 86, ${auraStrength * 0.45 * fade})`);
      grad.addColorStop(1, 'rgba(9, 10, 15, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y - drawH * 0.48, auraR, 0, Math.PI * 2);
      ctx.fill();

      // Etched Sun & Moon sigil halo behind Demiurge's raised staff
      if (isDemiurge && seal > 0.1) {
        ctx.save();
        ctx.translate(x, y - drawH * 0.62 + breathY);
        if (!this.reducedMotion) ctx.rotate(-t * 0.18);
        ctx.strokeStyle = `rgba(221, 201, 154, ${(0.28 + channelingGlow * 0.4) * fade})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, 26 + channelingGlow * 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = `rgba(184, 178, 224, ${(0.25 + channelingGlow * 0.38) * fade})`;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, 33 + channelingGlow * 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Boss sprite facing inward toward the Central Sphere (source sheets face East/+1)
    const facing = spec.slot === 'nw' || spec.slot === 'sw' ? 1 : -1;
    ctx.save();
    ctx.translate(x, y + breathY);
    ctx.scale(facing, 1);
    this.sprite(
      ctx,
      sheet,
      frame,
      BOSS_SRC_W,
      BOSS_SRC_H,
      -anchorSrcX * drawScale,
      -anchorSrcY * drawScale,
      drawW,
      drawH
    );
    ctx.restore();

    // Engraved nameplate once settled into the sanctuary
    if (actorProgress > 0.72) {
      const labelAlpha = fade * clamp((actorProgress - 0.72) / 0.28) * 0.9;
      ctx.globalAlpha = labelAlpha;
      ctx.font = isDemiurge ? '600 13px Georgia, serif' : '12px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = isDemiurge ? '#ddc99a' : '#c5c6c7';
      ctx.fillText(isDemiurge ? '✧ O Demiurgo ✧' : spec.name, x, y + 12);
    }

    ctx.restore();
  }

  private drawSolarAvatar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    progress: number,
    seal: number,
    apotheosis: number,
    fade: number,
    t: number
  ): void {
    const walking = progress < 0.995 && !this.reducedMotion;
    const levitate = !walking && !this.reducedMotion ? -seal * 8 + Math.sin(t * 1.6) * 3 : 0;

    ctx.save();
    ctx.globalAlpha = fade;

    // Warm solar mandorla underfoot
    ctx.fillStyle = `rgba(221, 201, 154, ${0.16 + seal * 0.16})`;
    ctx.beginPath();
    ctx.ellipse(x, y, 30, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Radiant solar halo behind head/shoulders
    if (seal > 0.05) {
      const haloR = 48 + apotheosis * 10;
      const grad = ctx.createRadialGradient(x, y - 68 + levitate, 4, x, y - 68 + levitate, haloR);
      grad.addColorStop(0, `rgba(246, 220, 154, ${(0.28 + seal * 0.24) * fade})`);
      grad.addColorStop(1, 'rgba(9, 10, 15, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y - 68 + levitate, haloR, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(x, y - 68 + levitate);
      if (!this.reducedMotion) ctx.rotate(t * 0.16);
      ctx.strokeStyle = `rgba(221, 201, 154, ${(0.32 + seal * 0.3) * fade})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 24 + seal * 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    const sheet =
      walking && this.solarWalk.complete && this.solarWalk.naturalWidth > 0
        ? this.solarWalk
        : this.solarStill;
    const frame = sheet === this.solarWalk ? Math.floor(t / 0.1) % 8 : 0;
    const drawSize = 132;
    this.sprite(
      ctx,
      sheet,
      frame,
      INCARNATION_FRAME_SIZE,
      INCARNATION_FRAME_SIZE,
      x - drawSize * 0.5,
      y - drawSize + 8 + levitate,
      drawSize,
      drawSize
    );

    if (progress > 0.72) {
      ctx.globalAlpha = fade * clamp((progress - 0.72) / 0.28) * 0.9;
      ctx.font = '600 12.5px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#ddc99a';
      ctx.fillText('☉ Avatar Solar', x, y + 12);
    }

    ctx.restore();
  }

  private drawDevotee(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    cx: number,
    index: number,
    tier: number,
    progress: number,
    seal: number,
    fade: number,
    t: number
  ): void {
    const walking = progress < 0.995 && !this.reducedMotion;
    const prayerStart = RITUAL_CUES.invocation - 0.4 + (index % 7) * 0.16;
    // Loop prayer -> illumination gently during gratitude so the faithful remain alive
    const rawPrayerSec = Math.max(0, t - prayerStart);
    const loopedPrayerSec =
      t >= RITUAL_CUES.gratitude ? 1.95 + ((t - RITUAL_CUES.gratitude + index * 0.23) % 2.4) * 0.55 : rawPrayerSec;
    const anim = followerAnimationFrame(
      walking ? 'walk' : 'pray',
      t * 8.5 + index * 0.7,
      this.reducedMotion ? 1.2 : loopedPrayerSec,
      t < RITUAL_CUES.gratitude - 0.8
    );
    const sheet = this.followers[tier]?.[anim.action];
    if (!sheet) return;

    ctx.save();
    ctx.globalAlpha = fade * (0.86 + seal * 0.14);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
    ctx.beginPath();
    ctx.ellipse(x, y + 1, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(x, y);
    ctx.scale(x > cx ? -1 : 1, 1);
    this.sprite(ctx, sheet, anim.frame, FOLLOWER_FRAME_SIZE, FOLLOWER_FRAME_SIZE, -29, -50, 58, 58);
    ctx.restore();
  }

  private drawElevatedSphereAndArmillary(
    ctx: CanvasRenderingContext2D,
    cx: number,
    sphereY: number,
    sphereSize: number,
    t: number,
    arrival: number,
    seal: number,
    apotheosis: number,
    disappearance: number,
    fade: number
  ): void {
    if (sphereSize <= 2) return;
    ctx.save();
    ctx.globalAlpha = fade;

    const ringRadius = sphereSize * (0.72 + seal * 0.16) * (1 - disappearance * 0.35);
    const armillaryWake = clamp(arrival * 0.65 + seal * 0.85);

    // Engraved solar corona & 12-point compass rays behind the Sphere
    const coronaR = sphereSize * (1.25 + seal * 0.45 + apotheosis * 0.2);
    const corona = ctx.createRadialGradient(cx, sphereY, sphereSize * 0.16, cx, sphereY, coronaR);
    corona.addColorStop(0, `rgba(246, 226, 175, ${(0.34 + seal * 0.28) * fade})`);
    corona.addColorStop(0.45, `rgba(185, 155, 86, ${(0.16 + seal * 0.14) * fade})`);
    corona.addColorStop(1, 'rgba(9, 10, 15, 0)');
    ctx.fillStyle = corona;
    ctx.beginPath();
    ctx.arc(cx, sphereY, coronaR, 0, Math.PI * 2);
    ctx.fill();

    if (seal > 0.05) {
      ctx.save();
      ctx.translate(cx, sphereY);
      if (!this.reducedMotion) ctx.rotate(t * 0.06);
      const rayCount = 12;
      for (let i = 0; i < rayCount; i++) {
        const a = (i / rayCount) * Math.PI * 2;
        const inner = ringRadius * 0.92;
        const outer = ringRadius * (i % 2 === 0 ? 1.48 + apotheosis * 0.2 : 1.22);
        ctx.strokeStyle = i % 2 === 0 ? '#ddc99a' : '#979ba5';
        ctx.globalAlpha = fade * seal * (i % 2 === 0 ? 0.42 : 0.24);
        ctx.lineWidth = i % 2 === 0 ? 1.1 : 0.75;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
        ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3D Armillary ring definitions (back arcs drawn BEFORE Sphere, front arcs drawn AFTER Sphere)
    const spin = this.reducedMotion ? 0.6 : t;
    const rings = [
      {
        r: ringRadius * 1.02,
        tilt: 0.42,
        rot: spin * 0.34,
        color: '#b99b56',
        width: 1.45,
      },
      {
        r: ringRadius * 1.18,
        tilt: 0.48,
        rot: -spin * 0.26 + 1.05,
        color: '#c5c6c7',
        width: 1.05,
      },
      {
        r: ringRadius * 1.32,
        tilt: 0.32,
        rot: spin * 0.19 + 2.2,
        color: '#b8b2e0',
        width: 0.95,
      },
    ];

    if (armillaryWake > 0.05) {
      for (const ring of rings) {
        this.drawArmillaryHalf(ctx, cx, sphereY, ring.r, ring.tilt, ring.rot, ring.color, ring.width, fade * armillaryWake * 0.52, true);
      }
    }

    // Central Divine Sphere
    const sphereCtx = this.sphereCanvas.getContext('2d');
    if (sphereCtx && this.sphere.complete && this.sphere.naturalWidth) {
      drawSphere(sphereCtx, this.sphereMotion, this.sphere);
      ctx.drawImage(
        this.sphereCanvas,
        cx - sphereSize * 0.5,
        sphereY - sphereSize * 0.5,
        sphereSize,
        sphereSize
      );
    }

    if (armillaryWake > 0.05) {
      for (const ring of rings) {
        this.drawArmillaryHalf(ctx, cx, sphereY, ring.r, ring.tilt, ring.rot, ring.color, ring.width, fade * armillaryWake * 0.88, false);
      }
    }

    ctx.restore();
  }

  private drawArmillaryHalf(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    tiltRatio: number,
    rotation: number,
    color: string,
    lineWidth: number,
    alpha: number,
    backHalf: boolean
  ): void {
    if (alpha <= 0.01 || radius <= 2) return;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.ellipse(
      0,
      0,
      radius,
      radius * tiltRatio,
      0,
      backHalf ? Math.PI : 0,
      backHalf ? Math.PI * 2 : Math.PI
    );
    ctx.stroke();

    // Small orbital bead riding the front equator of each armillary ring
    if (!backHalf) {
      const beadAngle = ((rotation * 1.9) % Math.PI + Math.PI) % Math.PI;
      const bx = Math.cos(beadAngle) * radius;
      const by = Math.sin(beadAngle) * radius * tiltRatio;
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(bx, by, 2.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawAstralParticles(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    sphereY: number,
    rx: number,
    ry: number,
    t: number,
    seal: number,
    disappearance: number,
    fade: number
  ): void {
    // Gentle ascending sparks around the sanctuary
    if (seal > 0.02) {
      for (let i = 0; i < 36; i++) {
        const cycle = (t * 0.065 + i / 36) % 1;
        const angle = i * 2.39996 + cycle * 0.8;
        const spread = (1 - cycle * 0.68) * (1 - disappearance * 0.85);
        const px = cx + Math.cos(angle) * rx * 0.95 * spread;
        const py = cy + Math.sin(angle) * ry * 0.7 * spread - cycle * (cy - sphereY + 55);
        const sparkAlpha = fade * seal * Math.sin(cycle * Math.PI) * 0.68;
        if (sparkAlpha <= 0.02) continue;

        ctx.globalAlpha = sparkAlpha;
        ctx.fillStyle = i % 5 === 0 ? '#ddc99a' : i % 7 === 0 ? '#b8b2e0' : '#c5c6c7';
        ctx.fillRect(px, py, 1.6, 3.2);
      }
    }

    // Vanishing spiral: constellation motes converging into the Divine Sphere
    if (disappearance > 0.01) {
      const spiralStrength = Math.sin(disappearance * Math.PI);
      for (let i = 0; i < 44; i++) {
        const seedAngle = (i / 44) * Math.PI * 2 + disappearance * 4.2;
        const dist = (1 - disappearance) * (0.28 + (i % 9) * 0.095);
        const px = cx + Math.cos(seedAngle) * rx * 1.15 * dist;
        const py = sphereY + Math.sin(seedAngle) * ry * 1.35 * dist;
        ctx.globalAlpha = spiralStrength * 0.82;
        ctx.fillStyle = i % 3 === 0 ? '#ddc99a' : i % 4 === 0 ? '#b8b2e0' : '#e2e8f0';
        ctx.beginPath();
        ctx.arc(px, py, 1.4 + (i % 3) * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawCrossStar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    color: string
  ): void {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - radius, y);
    ctx.lineTo(x + radius, y);
    ctx.moveTo(x, y - radius);
    ctx.lineTo(x, y + radius);
    ctx.stroke();
    ctx.restore();
  }

  private sprite(
    ctx: CanvasRenderingContext2D,
    sheet: HTMLImageElement,
    frame: number,
    sw: number,
    sh: number,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    if (!sheet.complete || !sheet.naturalWidth) return;
    const maxFrame = Math.max(0, Math.floor(sheet.naturalWidth / sw) - 1);
    const safeFrame = clamp(frame, 0, maxFrame);
    ctx.drawImage(sheet, safeFrame * sw, 0, sw, sh, x, y, w, h);
  }
}
