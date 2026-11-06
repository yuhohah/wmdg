import { GameStateManager } from '../../core/GameState.js';
import { AudioManager } from '../../systems/audio.js';
import { NotificationManager } from '../../systems/notifications.js';
import { GNOSE_BOSSES, BOSS_DAMAGE_READINESS_THRESHOLD } from '../../config/bosses.js';
import { formatNumber } from '../../systems/calculations.js';
import { events, GameEvents } from '../../core/EventBus.js';
import type { ActiveBossMiracle, BossRift, CultPillarStatus, GnoseBoss } from '../../types.js';
import { icon } from '../../ui/icons.js';
import { effectEasing, visualFrameScale, VisualFrameClock } from '../../ui/visualTiming.js';
import {
  FOLLOWER_FRAME_SIZE,
  followerAnimationFrame,
  loadFollowerSprites,
  visibleFollowerTiers,
  type FollowerTier,
} from '../../ui/followerVisuals.js';
import { FollowersArena } from '../../ui/followersArena.js';
import { INCARNATION_FRAME_SIZE, incarnationStageIndex } from '../../ui/incarnationSprites.js';

export interface BossBattleModalOptions {
  gameState: GameStateManager;
  audio: AudioManager;
  notifications: NotificationManager;
  spawnFloatingText: (x: number, y: number, text: string, small?: boolean) => void;
  onBattleEnded?: (boss: GnoseBoss, victory: boolean) => void;
  onCameraFrame?: (target: BattleCameraTarget, elapsedSec: number) => void;
}

export interface BattleCameraTarget {
  phase: 'incarnation' | 'boss' | 'combat';
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BossLateralSprites {
  idle: HTMLImageElement;
  walk: HTMLImageElement;
  attacks: HTMLImageElement[];
}

interface IncarnationWalkSprite {
  still: HTMLImageElement;
  walk: HTMLImageElement;
}

interface SpriteFrameBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface BossRenderFrame {
  lx: number;
  ly: number;
  drawLeft: number;
  drawTop: number;
  drawW: number;
  drawH: number;
  sheet: HTMLImageElement | null;
  frame: number;
  hitLeft: number;
  hitTop: number;
  hitWidth: number;
  hitHeight: number;
}

interface PathSample {
  x: number;
  y: number;
  s: number;
}

export interface BattleFollowerSnapshot {
  id: number;
  x: number;
  y: number;
  state: 'waiting_in_patio' | 'following_in_line' | 'encircling' | 'returning_to_patio';
  trailS: number;
  stopS: number;
}

interface BattleFollowerActor {
  id: number;
  queueIndex: number;
  tier: FollowerTier;
  startX: number;
  startY: number;
  x: number;
  y: number;
  trailS: number;
  stopS: number;
  state: 'waiting_in_patio' | 'following_in_line' | 'encircling' | 'returning_to_patio';
  walkCycle: number;
  prayCycle: number;
  facing: 1 | -1;
}

interface PendingBattleClimax {
  boss: GnoseBoss;
  victory: boolean;
  isRematch: boolean;
  durationSec: number;
  remainingSec: number;
  totalSec: number;
  cultReadiness: number;
  lowestTwoPillars: [CultPillarStatus, CultPillarStatus];
}

const BOSS_SPHERE_CENTER = { x: 1740, y: 854 };
// Concentric with the grand Hermetic engraving band (r = 494..582) on celestial-chart.svg,
// enclosing BOTH the Boss (x = 1415, y = 865) AND the Divine Sphere (x = 1740, y = 854).
const SACRED_CIRCLE_RADIUS = 535;
const SPHERE_CIRCLE_RX = SACRED_CIRCLE_RADIUS;
const SPHERE_CIRCLE_RY = SACRED_CIRCLE_RADIUS;

const BOSS_DISTANT_SPAWN = { x: 180, y: 854 };
const BOSS_COMBAT_SPOT = { x: 1415, y: 865 };

const INCARNATION_OUTBOUND_SPEED = 520;
const PROCESSION_QUEUE_SPEED = 460;
const BOSS_DESCENT_SPEED = 220;
const MAX_PROCESSION_FOLLOWERS = 34;

const BOSS_SRC_W = 256;
const BOSS_SRC_H = 192;
const HITBOX_PAD_PX = 6;

// Lead time (in seconds) that the "APARAR" rift is visible BEFORE the Boss swings his attack
const RIFT_TELEGRAPH_BEFORE_ATTACK_SEC = 0.65;
const PARRY_RECOVERY_SEC = 0.6;
const CLIMAX_DURATION_SEC = 1.5;

const INCARNATION_FALLBACK_SPAWN = { x: 490, y: 728 };
const FOLLOWERS_FALLBACK_BOX = { x: 2024, y: 1030, w: 512, h: 240 };

interface BossSpriteConfig {
  folder: string;
  attacks: [string, string];
  walkFrameSec?: number;
  attackFrameSec?: number;
  animateIdle?: boolean;
  drawOffsetX?: number;
}

const BOSS_SPRITE_FOLDERS: Record<string, BossSpriteConfig> = {
  boss_anubis: { folder: 'lateral/01-anubis', attacks: ['ataque-bastao', 'ataque-balanca'] },
  boss_cronos: { folder: 'lateral/02-hades', attacks: ['ataque-duplo', 'ataque-correntes'] },
  boss_odin: { folder: 'lateral/03-odin', attacks: ['ataque-lanca', 'ataque-corvo'] },
  boss_tiamat: {
    folder: 'caos-referencia-v2',
    attacks: ['ataque-esferas', 'ataque-circulos'],
    walkFrameSec: 0.09,
    attackFrameSec: 0.09,
    animateIdle: true,
    // The reference core is at x=96; the right of the canvas is projectile space.
    drawOffsetX: -120,
  },
};

// Exact idle/frame-0 opaque pixel bounds (alpha > 30) in 256x192 source space for instant sync before decode
const BOSS_DEFAULT_BOUNDS: Record<string, SpriteFrameBounds> = {
  boss_anubis: { minX: 28, minY: 7, maxX: 145, maxY: 183 },
  boss_cronos: { minX: 84, minY: 7, maxX: 164, maxY: 187 },
  boss_odin: { minX: 71, minY: 4, maxX: 189, maxY: 187 },
  boss_tiamat: { minX: 23, minY: 3, maxX: 166, maxY: 180 },
};

const INCARNATION_FILES = ['01-neofito', '02-consagrado', '03-ancestral', '04-eclipse', '05-solar'] as const;

let cachedBossSprites: Record<string, BossLateralSprites> | null = null;
let cachedIncarnationWalkSprites: IncarnationWalkSprite[] | null = null;
const spriteFrameBoundsCache = new WeakMap<HTMLImageElement, Map<number, SpriteFrameBounds>>();
let boundsProbeCanvas: HTMLCanvasElement | null = null;
let boundsProbeCtx: CanvasRenderingContext2D | null | undefined;
const bossSpriteLoadListeners = new Set<() => void>();

function notifyBossSpriteLoaded(): void {
  bossSpriteLoadListeners.forEach((cb) => cb());
}

function buildPolyline(points: Array<{ x: number; y: number }>): PathSample[] {
  if (points.length === 0) return [];
  const samples: PathSample[] = [{ x: points[0].x, y: points[0].y, s: 0 }];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const prev = samples[samples.length - 1];
    const cur = points[i];
    const seg = Math.hypot(cur.x - prev.x, cur.y - prev.y);
    if (seg < 0.01) continue;
    total += seg;
    samples.push({ x: cur.x, y: cur.y, s: total });
  }
  return samples;
}

function polylineLength(samples: PathSample[]): number {
  return samples.length > 0 ? samples[samples.length - 1].s : 0;
}

function samplePolylineAt(
  samples: PathSample[],
  s: number
): { x: number; y: number; dx: number; dy: number } {
  if (samples.length === 0) return { x: 0, y: 0, dx: 1, dy: 0 };
  if (samples.length === 1) return { x: samples[0].x, y: samples[0].y, dx: 1, dy: 0 };
  if (s <= 0) {
    return {
      x: samples[0].x,
      y: samples[0].y,
      dx: samples[1].x - samples[0].x,
      dy: samples[1].y - samples[0].y,
    };
  }
  const last = samples[samples.length - 1];
  if (s >= last.s) {
    const prev = samples[samples.length - 2];
    return {
      x: last.x,
      y: last.y,
      dx: last.x - prev.x,
      dy: last.y - prev.y,
    };
  }
  let lo = 0;
  let hi = samples.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].s <= s) lo = mid;
    else hi = mid;
  }
  const a = samples[lo];
  const b = samples[hi];
  const span = Math.max(1e-6, b.s - a.s);
  const t = (s - a.s) / span;
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    dx: b.x - a.x,
    dy: b.y - a.y,
  };
}

function getBossFrameBounds(
  sheet: HTMLImageElement | null,
  frame: number,
  bossId: string
): SpriteFrameBounds {
  const fallback = BOSS_DEFAULT_BOUNDS[bossId] ?? BOSS_DEFAULT_BOUNDS.boss_anubis;
  if (!sheet || !sheet.complete || sheet.naturalWidth < BOSS_SRC_W || sheet.naturalHeight < BOSS_SRC_H) {
    return fallback;
  }

  let perSheet = spriteFrameBoundsCache.get(sheet);
  if (!perSheet) {
    perSheet = new Map<number, SpriteFrameBounds>();
    spriteFrameBoundsCache.set(sheet, perSheet);
  }
  const existing = perSheet.get(frame);
  if (existing) return existing;

  if (boundsProbeCtx === undefined && typeof document !== 'undefined') {
    boundsProbeCanvas = document.createElement('canvas');
    boundsProbeCanvas.width = BOSS_SRC_W;
    boundsProbeCanvas.height = BOSS_SRC_H;
    try {
      boundsProbeCtx = boundsProbeCanvas.getContext('2d', { willReadFrequently: true });
    } catch {
      boundsProbeCtx = null;
    }
  }

  if (!boundsProbeCtx) {
    return fallback;
  }

  try {
    boundsProbeCtx.clearRect(0, 0, BOSS_SRC_W, BOSS_SRC_H);
    boundsProbeCtx.drawImage(
      sheet,
      frame * BOSS_SRC_W,
      0,
      BOSS_SRC_W,
      BOSS_SRC_H,
      0,
      0,
      BOSS_SRC_W,
      BOSS_SRC_H
    );
    const data = boundsProbeCtx.getImageData(0, 0, BOSS_SRC_W, BOSS_SRC_H).data;
    let minX = BOSS_SRC_W;
    let minY = BOSS_SRC_H;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < BOSS_SRC_H; y++) {
      const rowOffset = y * BOSS_SRC_W * 4;
      for (let x = 0; x < BOSS_SRC_W; x++) {
        if (data[rowOffset + x * 4 + 3] > 24) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const measured = maxX >= minX && maxY >= minY ? { minX, minY, maxX, maxY } : fallback;
    perSheet.set(frame, measured);
    return measured;
  } catch {
    return fallback;
  }
}

function loadBossLateralSprites(): Record<string, BossLateralSprites> {
  if (cachedBossSprites) return cachedBossSprites;
  const base = `${import.meta.env.BASE_URL}assets/sprites/bosses/`;
  const map: Record<string, BossLateralSprites> = {};
  for (const [bossId, cfg] of Object.entries(BOSS_SPRITE_FOLDERS)) {
    const load = (rel: string) => {
      const img = new Image();
      img.addEventListener('load', notifyBossSpriteLoaded, { once: true });
      img.src = `${base}${cfg.folder}/${rel}`;
      return img;
    };
    map[bossId] = {
      idle: load('idle.png'),
      walk: load('andar/spritesheet.png'),
      attacks: [
        load(`${cfg.attacks[0]}/spritesheet.png`),
        load(`${cfg.attacks[1]}/spritesheet.png`),
      ],
    };
  }
  cachedBossSprites = map;
  return map;
}

function bossSheetFrameCount(sheet: HTMLImageElement | undefined): number {
  return sheet && sheet.naturalWidth >= BOSS_SRC_W
    ? Math.max(1, Math.floor(sheet.naturalWidth / BOSS_SRC_W))
    : 17;
}

function loadIncarnationProcessionSprites(): IncarnationWalkSprite[] {
  if (cachedIncarnationWalkSprites) return cachedIncarnationWalkSprites;
  const base = `${import.meta.env.BASE_URL}assets/`;
  cachedIncarnationWalkSprites = INCARNATION_FILES.map((file) => {
    const still = new Image();
    still.src = `${base}concepts/encarnacao/${file}.png`;
    const walk = new Image();
    walk.src = `${base}sprites/encarnacao/${file}/andar/spritesheet.png`;
    return { still, walk };
  });
  return cachedIncarnationWalkSprites;
}

export function bossHpLabel(phase: number, hpPercent: number, passiveVictorySec: number): string {
  const phaseTag = phase === 3 ? 'Fase III' : phase === 2 ? 'Fase II' : 'Fase I';
  // Rounded up so a living Guardian never reads 0%
  const label = `${phaseTag} · ${Math.ceil(hpPercent)}%`;
  return Number.isFinite(passiveVictorySec) ? `${label} · ~${passiveVictorySec}s` : label;
}

// Cards sit on an arc around the Sphere, on the side away from the Guardian (degrees, 0 = right, -90 = up).
// The arc stops short of the Guardian on one end and the Sphere's health plate on the other.
const PARRY_ARC_START_DEG = -105;
const PARRY_ARC_SPAN_DEG = 113;

export function parryCardPosition(
  rift: Pick<BossRift, 'kind' | 'slotIndex' | 'xPercent' | 'yPercent'>,
  sphere: { x: number; y: number },
  elapsedSec: number,
  scale: number
): { x: number; y: number } {
  const slot = rift.slotIndex ?? 0;
  let degrees: number;
  if (rift.kind === 'anubis_scales' || rift.kind === 'hades_chains') {
    degrees = slot === 0 ? -80 : -5;
  } else if (rift.kind === 'odin_raven') {
    degrees = -45;
  } else if (rift.kind === 'chaos_orbit') {
    degrees = [-100, -45, 5][slot] + Math.sin(elapsedSec * 0.55) * 3;
  } else {
    const turn = (Math.atan2(rift.yPercent - 50, rift.xPercent - 50) + Math.PI) / (Math.PI * 2);
    degrees = PARRY_ARC_START_DEG + turn * PARRY_ARC_SPAN_DEG;
  }
  // Cards grow as the camera zooms out, so the arc widens with them
  const radius = 120 + 110 * scale;
  const radians = (degrees * Math.PI) / 180;
  return {
    x: Math.round(sphere.x + Math.cos(radians) * radius),
    y: Math.round(sphere.y + Math.sin(radians) * radius),
  };
}

const TRAIL_HOLD_SEC = 0.35;
const TRAIL_SHRINK_PERCENT_PER_SEC = 40;

export interface DamageTrail {
  value: number;
  holdSec: number;
}

// The pause only re-arms once the trail catches up, so rapid hits cannot freeze it.
export function stepDamageTrail(trail: DamageTrail, currentPercent: number, elapsedSec: number): DamageTrail {
  if (currentPercent >= trail.value) return { value: currentPercent, holdSec: TRAIL_HOLD_SEC };
  if (trail.holdSec > 0) return { value: trail.value, holdSec: Math.max(0, trail.holdSec - elapsedSec) };
  const value = trail.value - TRAIL_SHRINK_PERCENT_PER_SEC * elapsedSec;
  return value <= currentPercent ? { value: currentPercent, holdSec: TRAIL_HOLD_SEC } : { value, holdSec: 0 };
}

export class BossBattleModal {
  private options: BossBattleModalOptions;
  private worldStageEl: HTMLElement | null = null;
  private worldCanvasEl: HTMLCanvasElement | null = null;
  private worldCtx: CanvasRenderingContext2D | null = null;

  private bossHpPlateEl: HTMLElement | null = null;
  private bossWorldHpLabelEl: HTMLElement | null = null;
  private bossHpFillEl: HTMLElement | null = null;
  private bossHpTrailEl: HTMLElement | null = null;
  private altarTrailEl: HTMLElement | null = null;
  private bossTrail: DamageTrail = { value: 100, holdSec: 0 };
  private altarTrail: DamageTrail = { value: 100, holdSec: 0 };
  private bossHpValEl: HTMLElement | null = null;

  private sphereHpPlateEl: HTMLElement | null = null;
  private altarIntegrityFillEl: HTMLElement | null = null;
  private altarIntegrityValEl: HTMLElement | null = null;

  private attackDamageEl: HTMLElement | null = null;
  private combatFeedbackEl: HTMLElement | null = null;
  private riftsLayerEl: HTMLElement | null = null;
  private attackBtnEl: HTMLButtonElement | null = null;
  private fulgorBtnEl: HTMLButtonElement | null = null;
  private miracleBtnEl: HTMLButtonElement | null = null;
  private phaseBannerEl: HTMLElement | null = null;
  private combatStatsEl: HTMLElement | null = null;
  private retreatBtnEl: HTMLButtonElement | null = null;
  private returnFocusEl: HTMLElement | null = null;
  private lastRiftsMissed = 0;
  private lastPhase = 1;

  // World Battle Scene State (Boss, Incarnation, Followers)
  private isBattleActive = false;
  private animFrameId: number | null = null;
  private speedMultiplier = 1;
  private activeBossIdForScene = 'boss_anubis';

  private bossX = BOSS_DISTANT_SPAWN.x;
  private bossY = BOSS_DISTANT_SPAWN.y;
  private bossState: 'awaiting_ritual' | 'walking' | 'attacking' | 'idle' = 'awaiting_ritual';
  private bossWalkTimeSec = 0;
  private bossAttackIndex = 0;
  private bossAttackFrameTimeSec = 0;
  private bossHitFlashSec = 0;
  private bossParryRecoverySec = 0;
  private cameraPhase: BattleCameraTarget['phase'] | null = null;
  private attackedRiftIds = new Set<string>();

  private incX = INCARNATION_FALLBACK_SPAWN.x;
  private incY = INCARNATION_FALLBACK_SPAWN.y;
  private incFacing: 1 | -1 = 1;
  private incState: 'walking_to_patio' | 'gathering_at_patio' | 'leading_procession' | 'guarding' | 'leading_return' | 'returning_to_altar' =
    'walking_to_patio';
  private incTimerSec = 0;
  private incWalkCycle = 0;
  private incCallRingProgress = 0;
  private incGuardSpot = {
    x: BOSS_SPHERE_CENTER.x + SACRED_CIRCLE_RADIUS,
    y: BOSS_SPHERE_CENTER.y,
  };

  private returnPath: PathSample[] = [];
  private returnS = 0;
  private followerReturnPaths = new Map<number, { path: PathSample[]; s: number }>();

  private patioGatherSpot = { x: 2200, y: 1165 };
  private outboundPath: PathSample[] = [];
  private incOutboundS = 0;
  private processionPath: PathSample[] = [];
  private incProcessionS = 0;
  private circleStartS = 0;
  private circleLength = 1;
  private queueSpacing = 52;

  private followerActors: BattleFollowerActor[] = [];
  private syncedFollowerTotal = -1;
  private spherePulseAlpha = 0;
  private phaseShockwaveAlpha = 0;
  private phaseBannerTimerSec = 0;
  private fulgorBeamAlpha = 0;
  private miracleBeam: { fromX: number; fromY: number; alpha: number } | null = null;
  private climaxState: PendingBattleClimax | null = null;

  // Dynamically expanded in ensureStageBounds() to cover any dragged card positions on the board
  private stageWidth = 3200;
  private stageHeight = 1900;
  private stageOriginX = 80;
  private stageOriginY = 0;

  constructor(options: BossBattleModalOptions) {
    this.options = options;
    this.initDOM();
    this.bindEvents();
    bossSpriteLoadListeners.add(() => {
      if (this.isOpen()) {
        this.drawWorldScene();
      }
    });
  }

  public setSpeedMultiplier(mult: number): void {
    this.speedMultiplier = Math.max(0, mult);
  }

  public getChoreographySnapshot(): {
    bossState: 'awaiting_ritual' | 'walking' | 'attacking' | 'idle';
    bossX: number;
    bossY: number;
    combatStarted: boolean;
    incState: 'walking_to_patio' | 'gathering_at_patio' | 'leading_procession' | 'guarding' | 'leading_return' | 'returning_to_altar';
    incX: number;
    incY: number;
    incGuardSpot: { x: number; y: number };
    circleRadius: number;
    patioGatherSpot: { x: number; y: number };
    outboundPath: Array<{ x: number; y: number; s: number }>;
    processionPath: Array<{ x: number; y: number; s: number }>;
    circleStartS: number;
    followers: BattleFollowerSnapshot[];
    climaxRemainingSec: number;
    incarnationHome: { x: number; y: number };
    followerHomes: Array<{ id: number; x: number; y: number }>;
  } {
    return {
      incarnationHome: { x: this.outboundPath[0]?.x ?? this.incX, y: this.outboundPath[0]?.y ?? this.incY },
      followerHomes: this.followerActors.map(f => ({ id: f.id, x: f.startX, y: f.startY })),
      bossState: this.bossState,
      bossX: this.bossX,
      bossY: this.bossY,
      combatStarted: this.options.gameState.activeBossBattle?.combatStarted !== false,
      incState: this.incState,
      incX: this.incX,
      incY: this.incY,
      incGuardSpot: { ...this.incGuardSpot },
      circleRadius: SACRED_CIRCLE_RADIUS,
      patioGatherSpot: { ...this.patioGatherSpot },
      outboundPath: this.outboundPath.map((p) => ({ ...p })),
      processionPath: this.processionPath.map((p) => ({ ...p })),
      circleStartS: this.circleStartS,
      followers: this.followerActors.map((f) => ({
        id: f.id,
        x: f.x,
        y: f.y,
        state: f.state,
        trailS: f.trailS,
        stopS: f.stopS,
      })),
      climaxRemainingSec: this.climaxState?.remainingSec ?? 0,
    };
  }

  private measureSingleElementBox(
    el: HTMLElement | null,
    worldEl: HTMLElement | null
  ): { x: number; y: number; w: number; h: number } | null {
    if (!el || !worldEl) return null;

    // 1. Sum offsetLeft / offsetTop up to #dodeca-board-world (immune to pan/zoom transforms)
    let x = 0;
    let y = 0;
    let cur: HTMLElement | null = el;
    let reachedWorld = false;
    while (cur && cur !== document.body) {
      if (cur === worldEl) {
        reachedWorld = true;
        break;
      }
      x += cur.offsetLeft || 0;
      y += cur.offsetTop || 0;
      cur = cur.offsetParent as HTMLElement | null;
    }
    const w = el.offsetWidth || el.clientWidth || 0;
    const h = el.offsetHeight || el.clientHeight || 0;
    if (reachedWorld && w > 20 && h > 20) {
      return { x, y, w, h };
    }

    // 2. Fallback to getBoundingClientRect ratio
    const worldRect = worldEl.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const worldW = worldEl.offsetWidth || 6880;
    if (worldRect.width > 0 && elRect.width > 20 && elRect.height > 20) {
      const zoom = worldRect.width / worldW;
      return {
        x: (elRect.left - worldRect.left) / zoom,
        y: (elRect.top - worldRect.top) / zoom,
        w: el.offsetWidth || elRect.width / zoom,
        h: el.offsetHeight || elRect.height / zoom,
      };
    }

    return null;
  }

  private getElementWorldBox(
    elId: string,
    fallback: { x: number; y: number; w: number; h: number },
    fallbackCardId?: string
  ): { x: number; y: number; w: number; h: number } {
    const worldEl = document.getElementById('dodeca-board-world');
    const primary = this.measureSingleElementBox(document.getElementById(elId), worldEl);
    if (primary) return primary;

    if (fallbackCardId) {
      const cardBox = this.measureSingleElementBox(document.getElementById(fallbackCardId), worldEl);
      if (cardBox) {
        return {
          x: cardBox.x + 16,
          y: cardBox.y + 44,
          w: Math.max(fallback.w, cardBox.w - 32),
          h: Math.max(fallback.h, cardBox.h > 80 ? cardBox.h - 56 : fallback.h),
        };
      }
    }

    return fallback;
  }

  private ensureStageBounds(
    incBox: { x: number; y: number; w: number; h: number },
    fBox: { x: number; y: number; w: number; h: number }
  ): void {
    const pad = 200;
    const minX = Math.max(
      0,
      Math.floor(
        Math.min(
          80,
          BOSS_SPHERE_CENTER.x - SACRED_CIRCLE_RADIUS - pad,
          BOSS_DISTANT_SPAWN.x - pad,
          incBox.x - pad,
          fBox.x - pad
        )
      )
    );
    const minY = Math.max(
      0,
      Math.floor(
        Math.min(
          0,
          BOSS_SPHERE_CENTER.y - SACRED_CIRCLE_RADIUS - pad,
          BOSS_DISTANT_SPAWN.y - pad,
          incBox.y - pad,
          fBox.y - pad
        )
      )
    );
    const maxX = Math.ceil(
      Math.max(
        3100,
        BOSS_SPHERE_CENTER.x + SACRED_CIRCLE_RADIUS + pad,
        incBox.x + incBox.w + pad,
        fBox.x + fBox.w + pad
      )
    );
    const maxY = Math.ceil(
      Math.max(
        1840,
        BOSS_SPHERE_CENTER.y + SACRED_CIRCLE_RADIUS + pad,
        incBox.y + incBox.h + pad,
        fBox.y + fBox.h + pad
      )
    );

    const newW = Math.max(1600, maxX - minX);
    const newH = Math.max(1200, maxY - minY);

    if (
      minX !== this.stageOriginX ||
      minY !== this.stageOriginY ||
      newW !== this.stageWidth ||
      newH !== this.stageHeight
    ) {
      this.stageOriginX = minX;
      this.stageOriginY = minY;
      this.stageWidth = newW;
      this.stageHeight = newH;

      if (this.worldStageEl) {
        this.worldStageEl.style.left = `${this.stageOriginX}px`;
        this.worldStageEl.style.top = `${this.stageOriginY}px`;
        this.worldStageEl.style.width = `${this.stageWidth}px`;
        this.worldStageEl.style.height = `${this.stageHeight}px`;
      }
      if (this.worldCanvasEl) {
        this.worldCanvasEl.width = this.stageWidth;
        this.worldCanvasEl.height = this.stageHeight;
      }
    }

    const sphereLocalX = BOSS_SPHERE_CENTER.x - this.stageOriginX;
    const sphereLocalY = BOSS_SPHERE_CENTER.y - this.stageOriginY;

    if (this.sphereHpPlateEl) {
      this.sphereHpPlateEl.style.left = `${sphereLocalX}px`;
      this.sphereHpPlateEl.style.top = `${sphereLocalY + 206}px`;
    }
    if (this.fulgorBtnEl) {
      this.fulgorBtnEl.style.left = `${sphereLocalX}px`;
      this.fulgorBtnEl.style.top = `${sphereLocalY - 148}px`;
    }
    if (this.phaseBannerEl) {
      this.phaseBannerEl.style.left = `${sphereLocalX - 160}px`;
      this.phaseBannerEl.style.top = `${sphereLocalY - 265}px`;
    }
  }

  private initDOM(): void {
    document.getElementById('gnose-boss-battle-overlay')?.remove();
    if (typeof document.querySelectorAll === 'function') {
      document.querySelectorAll('#boss-world-stage').forEach((el) => el.remove());
    } else {
      document.getElementById('boss-world-stage')?.remove();
    }

    // World-space Battle Stage anchored around the central Sphere (1740, 854)
    const worldEl = document.getElementById('dodeca-board-world');
    const stage = document.createElement('div');
    stage.id = 'boss-world-stage';
    stage.className = 'boss-world-stage';
    stage.style.display = 'none';
    stage.style.left = `${this.stageOriginX}px`;
    stage.style.top = `${this.stageOriginY}px`;
    stage.style.width = `${this.stageWidth}px`;
    stage.style.height = `${this.stageHeight}px`;

    const sphereLocalX = BOSS_SPHERE_CENTER.x - this.stageOriginX;
    const sphereLocalY = BOSS_SPHERE_CENTER.y - this.stageOriginY;

    stage.innerHTML = `
      <canvas id="boss-world-canvas" class="boss-world-canvas" width="${this.stageWidth}" height="${this.stageHeight}" aria-hidden="true"></canvas>
      <div class="boss-arena-stage boss-world-interactive" id="boss-arena-stage">
        <button id="boss-arena-attack-btn" class="boss-attack-target boss-world-hitbox" type="button" aria-label="Atacar o guardião" aria-describedby="boss-attack-damage">
          <img id="boss-arena-portrait" class="boss-portrait" alt="" draggable="false" hidden>
          <span id="boss-arena-fallback" class="boss-portrait-fallback" aria-hidden="true" hidden></span>
          <span class="boss-attack-caption" aria-hidden="true">ATACAR <span id="boss-attack-damage"></span></span>
        </button>

        <!-- BARRA 1: VIDA DO CHEFE (EMBAIXO DO BOSS, ACOMPANHANDO SUA POSIÇÃO) -->
        <div class="boss-bar-section boss-world-hp-plate" id="boss-world-hp-plate">
          <div class="boss-bar-header">
            <span class="boss-bar-label" id="boss-world-hp-label">ANÚBIS</span>
            <span class="boss-bar-val" id="boss-hp-val">100%</span>
          </div>
          <div class="boss-bar-track boss-hp-track" role="progressbar" aria-label="Essência do guardião" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100">
            <div class="boss-bar-trail" id="boss-hp-trail" style="width: 100%;"></div>
            <div class="boss-bar-fill boss-hp-fill" id="boss-hp-fill" style="width: 100%;"></div>
          </div>
          <div class="boss-world-subline" id="boss-combat-feedback" role="status" aria-atomic="true"></div>
        </div>

        <!-- BARRA 2: VIDA / INTEGRIDADE DA ESFERA + BOTÃO RECUAR (EMBAIXO DA ESFERA CENTRAL) -->
        <div class="boss-bar-section altar-integrity-section sphere-world-hp-plate" id="sphere-world-hp-plate" style="left: ${sphereLocalX}px; top: ${sphereLocalY + 206}px;">
          <div class="boss-bar-header">
            <span class="boss-bar-label">${icon('shield')} INTEGRIDADE DA ESFERA</span>
            <span class="boss-bar-val" id="boss-altar-val">100%</span>
          </div>
          <div class="boss-bar-track altar-integrity-track" role="progressbar" aria-label="Integridade do altar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100">
            <div class="boss-bar-trail" id="boss-altar-trail" style="width: 100%;"></div>
            <div class="boss-bar-fill altar-integrity-fill" id="boss-altar-fill" style="width: 100%;"></div>
          </div>
          <div class="sphere-world-actions">
            <span class="boss-world-combo-stat" id="boss-combat-stats"></span>
            <button id="btn-boss-retreat" class="btn-boss-retreat btn-world-retreat" type="button" title="Cancela o combate sem penalidade. Atalho: Escape.">Recuar</button>
          </div>
        </div>

        <div class="boss-rifts-layer" id="boss-rifts-layer"></div>
      </div>
    `;

    // Create Fulgor Divino button and Phase Banner dynamically so they also work in unit test MockElement harnesses
    const fulgorBtn = document.createElement('button');
    fulgorBtn.id = 'boss-sphere-fulgor-btn';
    fulgorBtn.type = 'button';
    fulgorBtn.className = 'boss-sphere-fulgor-btn';
    fulgorBtn.style.display = 'none';
    fulgorBtn.style.left = `${sphereLocalX}px`;
    fulgorBtn.style.top = `${sphereLocalY - 148}px`;
    fulgorBtn.setAttribute('aria-label', 'Disparar Fulgor Divino da Esfera');
    stage.appendChild(fulgorBtn);
    this.fulgorBtnEl = fulgorBtn;

    const phaseBanner = document.createElement('div');
    phaseBanner.id = 'boss-phase-banner';
    phaseBanner.className = 'boss-phase-banner';
    phaseBanner.style.display = 'none';
    phaseBanner.style.left = `${sphereLocalX - 160}px`;
    phaseBanner.style.top = `${sphereLocalY - 265}px`;
    stage.appendChild(phaseBanner);
    this.phaseBannerEl = phaseBanner;

    if (worldEl) {
      worldEl.appendChild(stage);
    } else {
      document.body.appendChild(stage);
    }
    this.worldStageEl = stage;
    this.worldCanvasEl = stage.querySelector<HTMLCanvasElement>('#boss-world-canvas');
    if (this.worldCanvasEl) {
      try {
        this.worldCtx = this.worldCanvasEl.getContext('2d', { alpha: true });
      } catch {
        this.worldCtx = null;
      }
    }

    this.bossHpPlateEl = stage.querySelector('#boss-world-hp-plate');
    this.bossWorldHpLabelEl = stage.querySelector('#boss-world-hp-label');
    this.bossHpFillEl = stage.querySelector('#boss-hp-fill');
    this.bossHpTrailEl = stage.querySelector('#boss-hp-trail');
    this.altarTrailEl = stage.querySelector('#boss-altar-trail');
    this.bossHpValEl = stage.querySelector('#boss-hp-val');

    this.sphereHpPlateEl = stage.querySelector('#sphere-world-hp-plate');
    this.altarIntegrityFillEl = stage.querySelector('#boss-altar-fill');
    this.altarIntegrityValEl = stage.querySelector('#boss-altar-val');

    this.combatFeedbackEl = stage.querySelector('#boss-combat-feedback');
    this.combatStatsEl = stage.querySelector('#boss-combat-stats');
    this.retreatBtnEl = stage.querySelector('#btn-boss-retreat');

    this.attackDamageEl = stage.querySelector('#boss-attack-damage');
    this.riftsLayerEl = stage.querySelector('#boss-rifts-layer');
    this.attackBtnEl = stage.querySelector('#boss-arena-attack-btn');

    if (this.attackBtnEl) {
      this.attackBtnEl.title = 'Clique diretamente no Guardião para atacá-lo (até 5 ataques/s; 5% de chance de dano crítico dobrado).';
    }
  }

  private bindEvents(): void {
    this.retreatBtnEl?.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      this.options.gameState.retreatBossBattle();
      this.close();
    });

    this.attackBtnEl?.addEventListener('click', (e: MouseEvent) => {
      const battle = this.options.gameState.activeBossBattle;
      if (!battle || battle.combatStarted === false) return;
      const { fpc, bossClickDamage, isCrit } = this.options.gameState.addClick();
      const rect = this.attackBtnEl!.getBoundingClientRect();
      const x = e.detail === 0 ? rect.x + rect.width / 2 : e.clientX;
      const y = e.detail === 0 ? rect.y + rect.height / 2 : e.clientY;
      this.onPlayerAttackHit(fpc, bossClickDamage, isCrit, x, y);
    });

    this.fulgorBtnEl?.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      this.activateSphereFulgor(e.clientX || window.innerWidth / 2, e.clientY || window.innerHeight / 2);
    });

    // Clicking the central Divine Sphere during active boss combat triggers Fulgor Divino if at 100%, or normal Sphere pulse feedback
    const sphereBtn = document.getElementById('divine-sphere-btn');
    sphereBtn?.addEventListener('click', (e: MouseEvent) => {
      const battle = this.options.gameState.activeBossBattle;
      if (!battle || !this.isOpen() || battle.combatStarted === false) return;
      if ((battle.sphereCharge ?? 0) >= 100 - 1e-6) {
        this.activateSphereFulgor(
          e.clientX || window.innerWidth / 2,
          (e.clientY || window.innerHeight / 2) - 28
        );
        return;
      }
      this.bossHitFlashSec = 0.18;
      const breakdown = this.options.gameState.getBossCombatBreakdown(battle.bossId);
      this.showHitFeedback(`−${(breakdown.clickHpFraction * 100).toFixed(2)}%`);
      if (e.clientX && e.clientY) {
        this.options.spawnFloatingText(
          e.clientX,
          e.clientY - 28,
          `−${(breakdown.clickHpFraction * 100).toFixed(2)}%`,
          true
        );
      }
      this.updateUI();
    });

    this.options.gameState.onBossBattleFinished = ({ boss, victory, isRematch, durationSec }) => {
      this.handleBattleFinished(boss, victory, isRematch ?? false, durationSec ?? 0);
    };

    document.addEventListener('keydown', (event) => {
      if (!this.isOpen()) return;
      if (event.key === 'Escape') {
        const testOverlay = document.getElementById('test-menu-overlay');
        if (testOverlay?.classList.contains('visible')) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        this.options.gameState.retreatBossBattle();
        this.close();
      }
    }, true);
  }

  private activateSphereFulgor(x: number, y: number): boolean {
    const battle = this.options.gameState.activeBossBattle;
    if (!battle || battle.combatStarted === false) return false;
    const maxHp = battle.bossMaxHp;
    const res = this.options.gameState.triggerSphereFulgor();
    if (!res.triggered) return false;

    this.fulgorBeamAlpha = 1.0;
    this.bossHitFlashSec = 0.35;
    this.options.audio.playTone(960, 'triangle', 0.24);
    const pct = ((res.damage / Math.max(1, maxHp)) * 100).toFixed(0);
    this.showHitFeedback(`Fulgor Divino! −${pct}%`);
    this.options.spawnFloatingText(
      x,
      y,
      `✦ FULGOR DIVINO! −${pct}%`
    );
    this.updateUI();
    this.drawWorldScene();
    events.emit(GameEvents.STATE_CHANGED);
    return true;
  }

  private onPlayerAttackHit(
    fpc: number,
    bossClickDamage: number,
    isCrit: boolean,
    x: number,
    y: number
  ): void {
    const battle = this.options.gameState.activeBossBattle;
    if (!battle) return;
    if (bossClickDamage > 0) {
      this.bossHitFlashSec = 0.18;
      this.options.audio.playTone(640 + Math.random() * 140, 'sine', 0.08);
      const pct = ((bossClickDamage / battle.bossMaxHp) * 100).toFixed(2);
      this.showHitFeedback(`${isCrit ? 'Crítico! ' : ''}−${pct}%`);
      this.options.spawnFloatingText(
        x,
        y,
        isCrit ? `✦ CRÍTICO! −${pct}%` : `−${pct}%`,
        true
      );
    } else {
      if (!this.options.gameState.getBossCombatBreakdown(battle.bossId).canDamageBoss) {
        this.showHitFeedback(`Sem dano: Prontidão abaixo de ${BOSS_DAMAGE_READINESS_THRESHOLD * 100}%.`);
      }
      this.options.spawnFloatingText(x, y, `+${formatNumber(fpc)} FÉ`, true);
    }
    this.updateUI();
    events.emit(GameEvents.STATE_CHANGED);
  }

  public isOpen(): boolean {
    return this.isBattleActive && this.worldStageEl?.style.display === 'block';
  }

  private setText(el: HTMLElement | null, value: string): void {
    if (el && el.textContent !== value) el.textContent = value;
  }

  private showHitFeedback(text: string): void {
    this.setText(this.combatFeedbackEl, text);
    if (typeof window === 'undefined' || !window.matchMedia) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.attackBtnEl?.getAnimations?.().forEach((animation) => animation.cancel());
    this.attackBtnEl?.animate?.(
      [{ transform: 'scale(0.96)' }, { transform: 'scale(1)' }],
      { duration: 150, easing: effectEasing(150) }
    );
  }

  private showPhaseBanner(text: string): void {
    this.phaseBannerTimerSec = 2.6;
    if (this.phaseBannerEl) {
      this.setText(this.phaseBannerEl, text);
      this.phaseBannerEl.style.display = 'block';
    }
  }

  public openForBoss(bossId: string, options?: { isRematch?: boolean }): boolean {
    const boss = GNOSE_BOSSES.find((b) => b.id === bossId);
    if (!boss) return false;

    const started = this.options.gameState.startBossBattle(bossId, {
      awaitProcession: true,
      isRematch: options?.isRematch === true,
    });
    if (!started) {
      this.options.audio.playTone(180, 'sawtooth', 0.12);
      return false;
    }

    this.activeBossIdForScene = bossId;
    this.lastRiftsMissed = 0;
    this.lastPhase = 1;
    this.bossTrail = { value: 100, holdSec: 0 };
    this.altarTrail = { value: 100, holdSec: 0 };
    this.isBattleActive = true;
    this.climaxState = null;
    this.fulgorBeamAlpha = 0;
    this.miracleBeam = null;
    this.phaseShockwaveAlpha = 0;
    this.phaseBannerTimerSec = 0;
    if (this.phaseBannerEl) {
      this.phaseBannerEl.style.display = 'none';
    }

    // Preload lateral boss, incarnation walk, and follower sprites
    loadBossLateralSprites();
    loadIncarnationProcessionSprites();
    loadFollowerSprites();

    // Mark active battle on body first so Altar & Pátio hide their internal sprites without duplicating
    document.body.classList.add('is-boss-battle-active');

    if (this.worldStageEl) {
      this.worldStageEl.style.display = 'block';
    }

    // Initialize world choreography state from exact Altar da Encarnação & Pátio dos Fiéis coordinates
    this.initBattleChoreography();

    if (this.bossWorldHpLabelEl) this.setText(this.bossWorldHpLabelEl, boss.name.toUpperCase());
    this.attackBtnEl?.setAttribute('aria-label', `Atacar ${boss.name}`);

    this.setText(
      this.combatFeedbackEl,
      'A roda dos Fiéis está se formando...'
    );

    if (this.riftsLayerEl) {
      this.riftsLayerEl.innerHTML = '';
    }
    this.miracleBtnEl = null;

    this.returnFocusEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    this.updateBattleCamera(0);

    this.options.audio.playBossBattleMusic?.();
    this.options.audio.playTone(320, 'triangle', 0.25);
    this.updateUI();
    this.drawWorldScene();
    this.startWorldLoop();
    return true;
  }

  public close(): void {
    const pendingClimax = this.climaxState;
    this.climaxState = null;
    const wasOpen = this.isOpen();
    this.isBattleActive = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.worldStageEl) {
      this.worldStageEl.style.display = 'none';
    }
    if (this.riftsLayerEl) {
      this.riftsLayerEl.innerHTML = '';
    }
    if (this.fulgorBtnEl) {
      this.fulgorBtnEl.style.display = 'none';
    }
    if (this.phaseBannerEl) {
      this.phaseBannerEl.style.display = 'none';
    }
    this.miracleBtnEl = null;
    document.body.classList.remove('is-boss-battle-active', 'is-courtyard-visible');
    this.options.audio.stopBossBattleMusic?.();
    if (wasOpen) {
      document.getElementById('btn-zoom-reset')?.click();
      if (this.returnFocusEl?.isConnected) this.returnFocusEl.focus({ preventScroll: true });
    }
    this.returnFocusEl = null;

    if (pendingClimax) {
      this.presentBattleResultPopup(pendingClimax);
    }
  }

  private buildProcessionRoutes(
    incStart: { x: number; y: number },
    fBox: { x: number; y: number; w: number; h: number }
  ): void {
    const cx = BOSS_SPHERE_CENTER.x;
    const cy = BOSS_SPHERE_CENTER.y;

    // Gathering point inside Pátio dos Fiéis (#followers-walk-canvas), oriented slightly toward the Sphere
    const fCenterX = fBox.x + fBox.w * 0.5;
    const fCenterY = fBox.y + fBox.h * 0.5;
    const toSphereX = cx - fCenterX;
    const toSphereY = cy - fCenterY;
    const toSphereDist = Math.max(1, Math.hypot(toSphereX, toSphereY));
    const gatherSpot = {
      x: fCenterX + (toSphereX / toSphereDist) * Math.min(fBox.w * 0.22, 95),
      y: fBox.y + fBox.h * 0.56 + (toSphereY / toSphereDist) * Math.min(fBox.h * 0.16, 42),
    };
    this.patioGatherSpot = gatherSpot;

    // 1. Outbound path: Altar da Encarnação -> Pátio dos Fiéis
    //    Uses taut-string exterior tangent skirting around the Divine Sphere (skirtR = 330)
    //    whenever the straight line segment comes within 310px of the Sphere center.
    const segDx = gatherSpot.x - incStart.x;
    const segDy = gatherSpot.y - incStart.y;
    const segLenSq = segDx * segDx + segDy * segDy;
    const projT =
      segLenSq > 1
        ? Math.max(
            0,
            Math.min(1, ((cx - incStart.x) * segDx + (cy - incStart.y) * segDy) / segLenSq)
          )
        : 0;
    const distToSphere = Math.hypot(
      incStart.x + segDx * projT - cx,
      incStart.y + segDy * projT - cy
    );

    const outboundWaypoints: Array<{ x: number; y: number }> = [incStart];
    const skirtR = 330;
    const d0 = Math.hypot(incStart.x - cx, incStart.y - cy);
    const d1 = Math.hypot(gatherSpot.x - cx, gatherSpot.y - cy);

    if (distToSphere < 310 && d0 > 220 && d1 > 220) {
      const a0 = Math.atan2(incStart.y - cy, incStart.x - cx);
      const a1 = Math.atan2(gatherSpot.y - cy, gatherSpot.x - cx);
      let deltaA = Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0));
      // If nearly 180° opposite across the Sphere, prefer skirting south (y > cy)
      if (Math.abs(deltaA) > Math.PI - 0.12) {
        const southSign = Math.cos(a0) >= 0 ? 1 : -1;
        deltaA = southSign * Math.abs(deltaA);
      }
      const dir = deltaA >= 0 ? 1 : -1;
      const a1Unwrapped = a0 + deltaA;
      const alpha0 = Math.acos(Math.min(1, skirtR / Math.max(skirtR, d0)));
      const alpha1 = Math.acos(Math.min(1, skirtR / Math.max(skirtR, d1)));
      const hasTautArc = Math.abs(deltaA) > alpha0 + alpha1;
      const arcStart = hasTautArc ? a0 + dir * alpha0 : a0 + deltaA * 0.35;
      const arcEnd = hasTautArc ? a1Unwrapped - dir * alpha1 : a0 + deltaA * 0.65;
      const arcSteps = 18;
      for (let k = 0; k <= arcSteps; k++) {
        const theta = arcStart + ((arcEnd - arcStart) * k) / arcSteps;
        outboundWaypoints.push({
          x: cx + Math.cos(theta) * skirtR,
          y: cy + Math.sin(theta) * skirtR,
        });
      }
    }
    outboundWaypoints.push(gatherSpot);
    this.outboundPath = buildPolyline(outboundWaypoints);
    this.incOutboundS = 0;

    // 2. Return single-file procession path:
    //    Pátio dos Fiéis -> exterior clockwise C1-tangent curve onto the grand R = 535 circle
    //    -> full 360° clockwise lap around BOTH Boss and Sphere, ending at the Incarnation's circle station.
    const phiG = Math.atan2(gatherSpot.y - cy, gatherSpot.x - cx);
    const distG = Math.hypot(gatherSpot.x - cx, gatherSpot.y - cy);
    const alpha =
      distG > SACRED_CIRCLE_RADIUS + 8
        ? Math.max(0.28, Math.acos(Math.min(1, SACRED_CIRCLE_RADIUS / distG)))
        : 0.38;
    const entryAngle = phiG + alpha;

    const entryPt = {
      x: cx + Math.cos(entryAngle) * SPHERE_CIRCLE_RX,
      y: cy + Math.sin(entryAngle) * SPHERE_CIRCLE_RY,
    };
    this.incGuardSpot = { ...entryPt };

    const chordDist = Math.hypot(entryPt.x - gatherSpot.x, entryPt.y - gatherSpot.y);
    const handleLen = Math.min(220, chordDist * 0.45);
    const ctrlPt = {
      x: entryPt.x + Math.sin(entryAngle) * handleLen,
      y: entryPt.y - Math.cos(entryAngle) * handleLen,
    };

    const leadInPts: Array<{ x: number; y: number }> = [];
    const approachSteps = 20;
    for (let k = 0; k <= approachSteps; k++) {
      const t = k / approachSteps;
      const omt = 1 - t;
      leadInPts.push({
        x: omt * omt * gatherSpot.x + 2 * omt * t * ctrlPt.x + t * t * entryPt.x,
        y: omt * omt * gatherSpot.y + 2 * omt * t * ctrlPt.y + t * t * entryPt.y,
      });
    }

    const leadInSamples = buildPolyline(leadInPts);
    this.circleStartS = polylineLength(leadInSamples);

    const processionPts: Array<{ x: number; y: number }> = [...leadInPts];
    const circleSteps = 120;
    for (let k = 1; k <= circleSteps; k++) {
      const theta = entryAngle + (k / circleSteps) * Math.PI * 2;
      processionPts.push({
        x: cx + Math.cos(theta) * SPHERE_CIRCLE_RX,
        y: cy + Math.sin(theta) * SPHERE_CIRCLE_RY,
      });
    }

    this.processionPath = buildPolyline(processionPts);
    const totalLen = polylineLength(this.processionPath);
    this.circleLength = Math.max(1, totalLen - this.circleStartS);
    this.incProcessionS = 0;
  }

  private initBattleChoreography(): void {
    // 1. Boss stays above out of sight until the Faithful + Incarnation complete the 360° circle
    this.bossX = BOSS_DISTANT_SPAWN.x;
    this.bossY = BOSS_DISTANT_SPAWN.y;
    this.bossState = 'awaiting_ritual';
    this.bossWalkTimeSec = 0;
    this.bossAttackIndex = 0;
    this.bossAttackFrameTimeSec = 0;
    this.bossParryRecoverySec = 0;
    this.cameraPhase = null;
    this.bossHitFlashSec = 0;
    this.attackedRiftIds.clear();

    // 2. Incarnation starts from her stone pedestal in #incarnation-altar-canvas and heads to the Pátio dos Fiéis
    const incBox = this.getElementWorldBox(
      'incarnation-altar-canvas',
      { x: 280, y: 530, w: 420, h: 210 },
      'card-incarnation'
    );
    const fBox = this.getElementWorldBox(
      'followers-walk-canvas',
      FOLLOWERS_FALLBACK_BOX,
      'card-followers'
    );

    this.ensureStageBounds(incBox, fBox);

    this.incX = incBox.x + incBox.w * 0.5;
    this.incY = incBox.y + incBox.h - 12;
    this.incFacing = fBox.x >= this.incX ? 1 : -1;
    this.incState = 'walking_to_patio';
    document.body.classList.add('is-courtyard-visible');
    this.incTimerSec = 0;
    this.incWalkCycle = 0;
    this.incCallRingProgress = 0;
    this.returnPath = [];
    this.returnS = 0;
    this.followerReturnPaths.clear();

    this.buildProcessionRoutes({ x: this.incX, y: this.incY }, fBox);

    // 3. Followers wait inside #followers-walk-canvas (Pátio dos Fiéis) until the Incarnation arrives to lead them in single file
    this.syncedFollowerTotal = -1;
    this.followerActors = [];
    this.syncBattleFollowers(this.options.gameState.getTotalFollowersCount(), true);
    const bossId = this.options.gameState.activeBossBattle?.bossId ?? this.activeBossIdForScene;
    this.syncAttackHitbox(this.resolveBossRenderFrame(bossId));
  }

  private assignQueueSlots(): void {
    const count = this.followerActors.length;
    if (count === 0) return;
    const slotStep = this.circleLength / (count + 1);
    this.queueSpacing = Math.min(56, slotStep);
    for (let i = 0; i < count; i++) {
      const actor = this.followerActors[i];
      actor.queueIndex = i;
      actor.stopS = this.circleStartS + (count - i) * slotStep;
    }
  }

  private syncBattleFollowers(totalCount: number, initialSpawn = false): void {
    if (totalCount === this.syncedFollowerTotal && !initialSpawn) return;
    this.syncedFollowerTotal = totalCount;

    const fBox = this.getElementWorldBox(
      'followers-walk-canvas',
      FOLLOWERS_FALLBACK_BOX,
      'card-followers'
    );
    const liveArena = FollowersArena.latestInstance;
    const liveWalkers = liveArena?.walkers ?? [];
    const arenaDims = liveArena?.getArenaDimensions() ?? { width: 400, height: 220 };

    const effectiveTotal = Math.max(1, Math.floor(totalCount));
    const repTiers = visibleFollowerTiers(effectiveTotal);
    const desiredCount = Math.min(
      MAX_PROCESSION_FOLLOWERS,
      Math.max(repTiers.length, Math.min(effectiveTotal, 28))
    );

    const sortedTiers: FollowerTier[] = [...repTiers].sort((a, b) => b - a);
    while (sortedTiers.length < desiredCount) {
      sortedTiers.push(0);
    }

    if (!initialSpawn && this.followerActors.length === desiredCount) {
      for (let i = 0; i < desiredCount; i++) {
        this.followerActors[i].tier = sortedTiers[i] ?? 0;
      }
      return;
    }

    const rawActors: BattleFollowerActor[] = [];
    for (let i = 0; i < desiredCount; i++) {
      const existing = !initialSpawn ? this.followerActors[i] : undefined;
      if (existing) {
        existing.tier = sortedTiers[i] ?? existing.tier;
        rawActors.push(existing);
        continue;
      }

      let startX: number;
      let startY: number;
      const liveW = liveWalkers[i];
      if (liveW && arenaDims.width > 0 && arenaDims.height > 0) {
        startX = fBox.x + (liveW.x / arenaDims.width) * fBox.w;
        startY = fBox.y + (liveW.y / arenaDims.height) * fBox.h;
      } else {
        const cols = 7;
        const row = Math.floor(i / cols);
        const col = i % cols;
        startX =
          fBox.x +
          fBox.w * 0.16 +
          col * ((fBox.w * 0.68) / Math.max(1, cols - 1)) +
          ((i * 17) % 11) -
          5;
        startY = fBox.y + fBox.h * 0.34 + (row % 4) * 32 + ((i * 13) % 9) - 4;
      }

      rawActors.push({
        id: i + 1,
        queueIndex: i,
        tier: sortedTiers[i] ?? 0,
        startX,
        startY,
        x: startX,
        y: startY,
        trailS: 0,
        stopS: 0,
        state: 'waiting_in_patio',
        walkCycle: liveW ? liveW.walkCycle : (i * 0.7) % 8,
        prayCycle: liveW ? liveW.prayCycle : (i * 0.35) % 2,
        facing: -1,
      });
    }

    if (initialSpawn) {
      rawActors.sort((a, b) => {
        const da = Math.hypot(a.startX - this.patioGatherSpot.x, a.startY - this.patioGatherSpot.y);
        const db = Math.hypot(b.startX - this.patioGatherSpot.x, b.startY - this.patioGatherSpot.y);
        return da - db;
      });
      for (let i = 0; i < rawActors.length; i++) {
        rawActors[i].tier = sortedTiers[i] ?? 0;
        rawActors[i].id = i + 1;
      }
    }

    this.followerActors = rawActors;
    this.assignQueueSlots();
  }

  private startWorldLoop(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    const clock = new VisualFrameClock();
    const step = (nowMs: number) => {
      if (!this.isBattleActive || (this.worldStageEl && !this.worldStageEl.isConnected)) {
        if (this.isBattleActive) this.close();
        return;
      }
      const frameSec = clock.tick(nowMs);
      if (frameSec !== null && document.visibilityState !== 'hidden') {
        const elapsedSec = Math.min(0.1, frameSec);
        this.updateWorldScene(elapsedSec);
        this.updateDamageTrails(elapsedSec);
        if (this.isBattleActive) {
          this.drawWorldScene();
        }
      }
      if (this.isBattleActive) {
        this.animFrameId = requestAnimationFrame(step);
      }
    };
    this.animFrameId = requestAnimationFrame(step);
  }

  private updateDamageTrails(elapsedSec: number): void {
    const battle = this.options.gameState.activeBossBattle;
    if (!battle) return;
    this.bossTrail = stepDamageTrail(this.bossTrail, (battle.bossHp / battle.bossMaxHp) * 100, elapsedSec);
    this.altarTrail = stepDamageTrail(this.altarTrail, (battle.altarIntegrity / battle.maxAltarIntegrity) * 100, elapsedSec);
    if (this.bossHpTrailEl) this.bossHpTrailEl.style.width = `${this.bossTrail.value.toFixed(2)}%`;
    if (this.altarTrailEl) this.altarTrailEl.style.width = `${this.altarTrail.value.toFixed(2)}%`;
  }

  private triggerBossAttackSwing(rift?: BossRift): void {
    if (this.bossParryRecoverySec > 0) return;
    this.bossState = 'attacking';
    this.bossAttackFrameTimeSec = 0;
    const phase = this.options.gameState.activeBossBattle?.phase ?? 1;
    if (phase >= 2 && typeof rift?.attackIndex === 'number') {
      this.bossAttackIndex = rift.attackIndex % 2;
    } else {
      this.bossAttackIndex = (this.bossAttackIndex + 1) % 2;
    }
  }

  public stepSceneForTest(elapsedSec: number): void {
    this.updateWorldScene(elapsedSec);
    if (this.isBattleActive) {
      this.drawWorldScene();
    }
  }

  private updateBattleCamera(elapsedSec: number): void {
    let target: BattleCameraTarget;
    if (this.incState === 'leading_return' || this.incState === 'returning_to_altar') {
      target = { phase: 'incarnation', x: this.incX, y: this.incY - 65, width: 900, height: 700 };
    } else if (this.bossState === 'awaiting_ritual') {
      target = { phase: 'incarnation', x: this.incX, y: this.incY - 65, width: 680, height: 560 };
    } else if (this.bossState === 'walking') {
      target = { phase: 'boss', x: this.bossX, y: this.bossY - 90, width: 760, height: 580 };
    } else {
      target = {
        phase: 'combat', x: BOSS_SPHERE_CENTER.x, y: BOSS_SPHERE_CENTER.y,
        width: SACRED_CIRCLE_RADIUS * 2 + 140, height: SACRED_CIRCLE_RADIUS * 2 + 140,
      };
    }
    const revealBoss = target.phase === 'boss' && this.cameraPhase !== 'boss';
    this.cameraPhase = target.phase;
    this.options.onCameraFrame?.(target, revealBoss ? 0 : elapsedSec);
  }

  private resolveBossRenderFrame(bossId: string): BossRenderFrame {
    const lx = Math.round(this.bossX - this.stageOriginX);
    const ly = Math.round(this.bossY - this.stageOriginY);
    const drawW = 320;
    const drawH = 240;
    const config = BOSS_SPRITE_FOLDERS[bossId];
    const drawOffsetX = config?.drawOffsetX ?? (bossId === 'boss_anubis' ? -108 : -158);
    const drawOffsetY = -215;
    const drawLeft = lx + drawOffsetX;
    const drawTop = ly + drawOffsetY;

    const bossSprites = loadBossLateralSprites()[bossId];
    let candidateSheet: HTMLImageElement | null = null;
    let frame = 0;

    if (bossSprites) {
      if (this.bossState === 'walking' || (this.bossState === 'idle' && config?.animateIdle)) {
        candidateSheet = bossSprites.walk;
        const totalFrames = bossSheetFrameCount(candidateSheet);
        frame = Math.floor(this.bossWalkTimeSec / (config?.walkFrameSec ?? 0.16)) % totalFrames;
      } else if (this.bossState === 'attacking') {
        candidateSheet = bossSprites.attacks[this.bossAttackIndex] ?? bossSprites.attacks[0];
        const totalFrames = bossSheetFrameCount(candidateSheet);
        frame = Math.min(totalFrames - 1, Math.floor(this.bossAttackFrameTimeSec / (config?.attackFrameSec ?? 0.115)));
      } else {
        candidateSheet = bossSprites.walk;
        frame = 0;
      }

      if (
        !(candidateSheet && candidateSheet.complete && candidateSheet.naturalWidth > 0) &&
        bossSprites.idle.complete &&
        bossSprites.idle.naturalWidth > 0
      ) {
        candidateSheet = bossSprites.idle;
        frame = 0;
      }
    }

    const activeSheet =
      candidateSheet && candidateSheet.complete && candidateSheet.naturalWidth > 0
        ? candidateSheet
        : null;
    const bounds = bossId === 'boss_tiamat' && this.bossState === 'attacking'
      ? getBossFrameBounds(bossSprites?.idle ?? null, 0, bossId)
      : getBossFrameBounds(activeSheet, frame, bossId);

    const spriteLeft = drawLeft + (bounds.minX / BOSS_SRC_W) * drawW;
    const spriteRight = drawLeft + ((bounds.maxX + 1) / BOSS_SRC_W) * drawW;
    const spriteTop = drawTop + (bounds.minY / BOSS_SRC_H) * drawH;
    const spriteBottom = drawTop + ((bounds.maxY + 1) / BOSS_SRC_H) * drawH;

    const hitLeft = Math.floor(spriteLeft - HITBOX_PAD_PX);
    const hitTop = Math.floor(spriteTop - HITBOX_PAD_PX);
    const hitRight = Math.ceil(spriteRight + HITBOX_PAD_PX);
    const hitBottom = Math.ceil(spriteBottom + HITBOX_PAD_PX);

    return {
      lx,
      ly,
      drawLeft,
      drawTop,
      drawW,
      drawH,
      sheet: activeSheet,
      frame,
      hitLeft,
      hitTop,
      hitWidth: Math.max(88, hitRight - hitLeft),
      hitHeight: Math.max(110, hitBottom - hitTop),
    };
  }

  private syncAttackHitbox(renderFrame: BossRenderFrame): void {
    if (this.climaxState) {
      if (this.attackBtnEl) this.attackBtnEl.style.display = 'none';
      if (this.bossHpPlateEl) this.bossHpPlateEl.style.display = 'none';
      return;
    }
    const bossVisible = this.bossState !== 'awaiting_ritual' && !this.climaxState;
    const displayVal = bossVisible ? '' : 'none';

    if (this.attackBtnEl) {
      if (this.attackBtnEl.style.display !== displayVal) {
        this.attackBtnEl.style.display = displayVal;
      }
      if (bossVisible) {
        const leftPx = `${renderFrame.hitLeft}px`;
        const topPx = `${renderFrame.hitTop}px`;
        const widthPx = `${renderFrame.hitWidth}px`;
        const heightPx = `${renderFrame.hitHeight}px`;
        if (this.attackBtnEl.style.left !== leftPx) this.attackBtnEl.style.left = leftPx;
        if (this.attackBtnEl.style.top !== topPx) this.attackBtnEl.style.top = topPx;
        if (this.attackBtnEl.style.width !== widthPx) this.attackBtnEl.style.width = widthPx;
        if (this.attackBtnEl.style.height !== heightPx) this.attackBtnEl.style.height = heightPx;
      }
    }
    if (this.bossHpPlateEl) {
      const hpDisplayVal = this.bossState !== 'awaiting_ritual' ? '' : 'none';
      if (this.bossHpPlateEl.style.display !== hpDisplayVal) {
        this.bossHpPlateEl.style.display = hpDisplayVal;
      }
      if (this.bossState !== 'awaiting_ritual') {
        const hpLeftPx = `${renderFrame.lx}px`;
        const hpTopPx = `${renderFrame.ly + 30}px`;
        if (this.bossHpPlateEl.style.left !== hpLeftPx) this.bossHpPlateEl.style.left = hpLeftPx;
        if (this.bossHpPlateEl.style.top !== hpTopPx) this.bossHpPlateEl.style.top = hpTopPx;
      }
    }
  }

  private formatRitualStatsLabel(): string {
    if (this.bossState === 'walking') return 'O Guardião se aproxima da Esfera…';
    const total = this.followerActors.length;
    const encircling = this.followerActors.filter((f) => f.state === 'encircling').length;
    if (this.incState === 'walking_to_patio') return 'Ritual: buscando os Fiéis...';
    if (this.incState === 'gathering_at_patio') return 'Ritual: convocando a fila...';
    return `Ritual: roda ${encircling}/${total}`;
  }

  private beginVictoryReturn(): void {
    this.incState = 'leading_return';
    document.body.classList.add('is-courtyard-visible');
    this.incCallRingProgress = 0;
    this.bossHitFlashSec = 0;
    // The guard station is also the circle entrance. Retrace its approach to the patio.
    const approach = this.processionPath.filter(p => p.s <= this.circleStartS + 0.01).reverse();
    this.returnPath = buildPolyline([{ x: this.incX, y: this.incY }, ...approach]);
    this.returnS = 0;
    this.followerReturnPaths.clear();
    for (const f of this.followerActors) {
      // Finish the clockwise arc to the exit, then follow the Incarnation home.
      const remainingArc = this.processionPath.filter(p => p.s > f.trailS);
      const path = buildPolyline([
        { x: f.x, y: f.y }, ...remainingArc, ...approach,
        { x: f.startX, y: f.startY }
      ]);
      this.followerReturnPaths.set(f.id, { path, s: 0 });
      f.state = 'returning_to_patio';
    }
    this.setText(this.combatFeedbackEl, 'Vitória! A Encarnação conduz os Fiéis de volta ao pátio.');
    this.attackBtnEl?.setAttribute('aria-disabled', 'true');
    if (this.attackBtnEl) this.attackBtnEl.style.display = 'none';
    if (this.bossHpPlateEl) this.bossHpPlateEl.style.display = 'none';
  }

  private updateVictoryReturn(dt: number, elapsedSec: number): void {
    this.returnS = Math.min(polylineLength(this.returnPath), this.returnS + PROCESSION_QUEUE_SPEED * dt);
    const sample = samplePolylineAt(this.returnPath, this.returnS);
    this.incX = sample.x;
    this.incY = sample.y;
    if (Math.abs(sample.dx) > 0.2) this.incFacing = sample.dx >= 0 ? 1 : -1;
    this.incWalkCycle += dt / 0.15;

    if (this.incState === 'leading_return') {
      for (const f of this.followerActors) {
        const route = this.followerReturnPaths.get(f.id);
        if (!route || f.state === 'waiting_in_patio') continue;
        route.s = Math.min(polylineLength(route.path), route.s + PROCESSION_QUEUE_SPEED * dt);
        const point = samplePolylineAt(route.path, route.s);
        f.x = point.x;
        f.y = point.y;
        if (Math.abs(point.dx) > 0.2) f.facing = point.dx >= 0 ? 1 : -1;
        f.walkCycle += dt / 0.14;
        if (route.s >= polylineLength(route.path)) {
          f.x = f.startX;
          f.y = f.startY;
          f.state = 'waiting_in_patio';
        }
      }
      if (this.returnS >= polylineLength(this.returnPath) &&
          this.followerActors.every(f => f.state === 'waiting_in_patio')) {
        this.incState = 'returning_to_altar';
        this.returnPath = buildPolyline([...this.outboundPath].reverse());
        this.returnS = 0;
        this.setText(this.combatFeedbackEl, 'Os Fiéis estão no pátio. A Encarnação retorna ao altar.');
      }
    } else if (this.returnS >= polylineLength(this.returnPath)) {
      this.close();
      return;
    }
    this.updateBattleCamera(elapsedSec);
  }

  private updateWorldScene(elapsedSec: number): void {
    const frameScale = visualFrameScale(elapsedSec);
    const dt = elapsedSec * Math.max(0.25, Math.min(this.speedMultiplier, 4));

    if (this.climaxState && (this.incState === 'leading_return' || this.incState === 'returning_to_altar')) {
      this.updateVictoryReturn(dt, elapsedSec);
      return;
    }

    if (this.climaxState) {
      this.followerActors.forEach(f => { f.prayCycle = (f.prayCycle + elapsedSec) % 3.3; });
      this.climaxState.remainingSec = Math.max(0, this.climaxState.remainingSec - elapsedSec);
      this.bossHitFlashSec = this.climaxState.victory ? 0.5 : 0;
      if (this.climaxState.remainingSec <= 0) {
        if (this.climaxState.victory) this.beginVictoryReturn();
        else this.close();
      }
      return;
    }

    const battle = this.options.gameState.activeBossBattle;
    this.bossParryRecoverySec = Math.max(0, this.bossParryRecoverySec - dt);

    if (this.bossHitFlashSec > 0) {
      this.bossHitFlashSec = Math.max(0, this.bossHitFlashSec - elapsedSec);
    }
    if (this.spherePulseAlpha > 0) {
      this.spherePulseAlpha = Math.max(0, this.spherePulseAlpha - elapsedSec * 1.8);
    }
    if (this.phaseShockwaveAlpha > 0) {
      this.phaseShockwaveAlpha = Math.max(0, this.phaseShockwaveAlpha - elapsedSec * 0.9);
    }
    if (this.fulgorBeamAlpha > 0) {
      this.fulgorBeamAlpha = Math.max(0, this.fulgorBeamAlpha - elapsedSec * 1.8);
    }
    if (this.miracleBeam) {
      this.miracleBeam.alpha = Math.max(0, this.miracleBeam.alpha - elapsedSec * 1.6);
      if (this.miracleBeam.alpha <= 0) {
        this.miracleBeam = null;
      }
    }
    if (this.phaseBannerTimerSec > 0) {
      this.phaseBannerTimerSec = Math.max(0, this.phaseBannerTimerSec - elapsedSec);
      if (this.phaseBannerTimerSec <= 0 && this.phaseBannerEl) {
        this.phaseBannerEl.style.display = 'none';
      }
    }

    // Keep follower count synced once combat has started (freeze initial cohort during the pre-battle ritual)
    if (this.bossState !== 'awaiting_ritual') {
      this.syncBattleFollowers(this.options.gameState.getTotalFollowersCount(), false);
    }

    // 1. Update Incarnation
    this.incTimerSec += dt;
    const outboundLen = polylineLength(this.outboundPath);
    const processionLen = polylineLength(this.processionPath);

    if (this.incState === 'walking_to_patio') {
      this.incOutboundS = Math.min(outboundLen, this.incOutboundS + INCARNATION_OUTBOUND_SPEED * dt);
      const sample = samplePolylineAt(this.outboundPath, this.incOutboundS);
      this.incX = sample.x;
      this.incY = sample.y;
      if (Math.abs(sample.dx) > 0.2) {
        this.incFacing = sample.dx >= 0 ? 1 : -1;
      }
      this.incWalkCycle += dt / 0.14;

      if (this.incOutboundS >= outboundLen - 0.5) {
        this.incX = this.patioGatherSpot.x;
        this.incY = this.patioGatherSpot.y;
        this.incState = 'gathering_at_patio';
        this.incTimerSec = 0;
        this.incCallRingProgress = 0.01;
      }
    } else if (this.incState === 'gathering_at_patio') {
      this.incCallRingProgress = Math.min(1, this.incCallRingProgress + dt * 1.45);
      this.incWalkCycle += dt * 1.2;
      this.incFacing = BOSS_SPHERE_CENTER.x >= this.incX ? 1 : -1;
      if (this.incTimerSec >= 0.6) {
        this.incState = 'leading_procession';
        document.body.classList.remove('is-courtyard-visible');
        this.incTimerSec = 0;
      }
    } else if (this.incState === 'leading_procession') {
      this.incProcessionS += PROCESSION_QUEUE_SPEED * dt;
      if (this.incCallRingProgress > 0 && this.incCallRingProgress < 1) {
        this.incCallRingProgress = Math.min(1, this.incCallRingProgress + dt * 1.1);
      } else {
        this.incCallRingProgress = 0;
      }

      if (this.incProcessionS < processionLen) {
        const sample = samplePolylineAt(this.processionPath, this.incProcessionS);
        this.incX = sample.x;
        this.incY = sample.y;
        if (Math.abs(sample.dx) > 0.2) {
          this.incFacing = sample.dx >= 0 ? 1 : -1;
        }
        this.incWalkCycle += dt / 0.15;
      } else {
        this.incX = this.incGuardSpot.x;
        this.incY = this.incGuardSpot.y;
        this.incFacing = BOSS_SPHERE_CENTER.x >= this.incX ? 1 : -1;
        const maxRequiredS =
          this.followerActors.length > 0
            ? Math.max(
                ...this.followerActors.map(
                  (f) => f.stopS + (f.queueIndex + 1) * this.queueSpacing
                )
              )
            : processionLen;
        if (this.incProcessionS >= Math.max(processionLen, maxRequiredS)) {
          this.incState = 'guarding';
        }
      }
    } else {
      // Guarding on the Sacred Circle and channeling power
      this.incProcessionS += PROCESSION_QUEUE_SPEED * dt;
      this.incFacing = BOSS_SPHERE_CENTER.x >= this.incX ? 1 : -1;
      this.incWalkCycle += 0.02 * frameScale;
      this.incCallRingProgress = 0;
    }

    // 2. Update Faithful
    const queueActive =
      this.incState === 'leading_procession' || this.incState === 'guarding';

    for (const f of this.followerActors) {
      if (!queueActive) {
        f.state = 'waiting_in_patio';
        f.trailS = 0;
        f.x = f.startX;
        f.y = f.startY;
        f.facing = this.incX >= f.x ? 1 : -1;
        f.prayCycle = (f.prayCycle + dt * 0.35) % 3.3;
        continue;
      }

      const rawDesiredS = this.incProcessionS - (f.queueIndex + 1) * this.queueSpacing;
      const leadInWindow = Math.max(
        48,
        Math.hypot(f.startX - this.patioGatherSpot.x, f.startY - this.patioGatherSpot.y)
      );

      if (rawDesiredS >= f.stopS) {
        const slot = samplePolylineAt(this.processionPath, f.stopS);
        f.state = 'encircling';
        f.trailS = f.stopS;
        f.x = slot.x;
        f.y = slot.y;
        f.facing = BOSS_SPHERE_CENTER.x >= f.x ? 1 : -1;
        f.prayCycle = (f.prayCycle + dt * 0.55) % 3.3;
      } else if (rawDesiredS > 0) {
        const sample = samplePolylineAt(this.processionPath, rawDesiredS);
        f.state = 'following_in_line';
        f.trailS = rawDesiredS;
        f.x = sample.x;
        f.y = sample.y;
        if (Math.abs(sample.dx) > 0.2) {
          f.facing = sample.dx >= 0 ? 1 : -1;
        }
        f.walkCycle += (dt * PROCESSION_QUEUE_SPEED) / 36;
      } else if (rawDesiredS > -leadInWindow) {
        const u = (rawDesiredS + leadInWindow) / leadInWindow;
        const nextX = f.startX + (this.patioGatherSpot.x - f.startX) * u;
        const nextY = f.startY + (this.patioGatherSpot.y - f.startY) * u;
        const dx = nextX - f.x;
        if (Math.abs(dx) > 0.1) {
          f.facing = dx >= 0 ? 1 : -1;
        }
        f.state = 'following_in_line';
        f.trailS = 0;
        f.x = nextX;
        f.y = nextY;
        f.walkCycle += (dt * PROCESSION_QUEUE_SPEED) / 38;
      } else {
        f.state = 'waiting_in_patio';
        f.trailS = 0;
        f.x = f.startX;
        f.y = f.startY;
        f.facing = this.patioGatherSpot.x >= f.x ? 1 : -1;
        f.prayCycle = (f.prayCycle + dt * 0.35) % 3.3;
      }
    }

    // 3. Update Boss
    if (this.bossState === 'awaiting_ritual') {
      const allEncircling =
        this.followerActors.length === 0 ||
        this.followerActors.every((f) => f.state === 'encircling');
      if (this.incState === 'guarding' && allEncircling) {
        this.bossState = 'walking';
        this.bossX = BOSS_DISTANT_SPAWN.x;
        this.bossY = BOSS_DISTANT_SPAWN.y;
        this.bossWalkTimeSec = 0;
        const boss = battle ? GNOSE_BOSSES.find((b) => b.id === battle.bossId) : undefined;
        if (boss) {
          this.setText(
            this.combatFeedbackEl,
            `${boss.name} se aproxima. Prepare-se para aparar!`
          );
        }
        this.options.audio.playTone(240, 'sawtooth', 0.22);
        this.updateUI();
      } else if (this.combatStatsEl) {
        this.setText(this.combatStatsEl, this.formatRitualStatsLabel());
      }
    } else if (this.bossState === 'walking') {
      // Hold rift spawning while the Boss is descending toward the Sphere
      if (battle) {
        battle.riftSpawnTimerSec = Math.max(battle.riftSpawnTimerSec, 0.25);
        if (battle.activeRifts.length > 0) {
          battle.activeRifts.length = 0;
        }
      }

      const dx = BOSS_COMBAT_SPOT.x - this.bossX;
      const dy = BOSS_COMBAT_SPOT.y - this.bossY;
      const dist = Math.hypot(dx, dy);
      if (dist > 6) {
        const move = Math.min(dist, BOSS_DESCENT_SPEED * dt);
        this.bossX += (dx / dist) * move;
        this.bossY += (dy / dist) * move;
        this.bossWalkTimeSec += dt;
      } else {
        this.bossX = BOSS_COMBAT_SPOT.x;
        this.bossY = BOSS_COMBAT_SPOT.y;
        this.bossState = 'idle';
        this.options.gameState.beginBossCombat();
        if (battle) {
          battle.riftSpawnTimerSec = Math.min(battle.riftSpawnTimerSec, 0.2);
        }
      }
    } else if (this.bossState === 'attacking') {
      this.bossAttackFrameTimeSec += dt;
      const bossId = battle?.bossId ?? this.activeBossIdForScene;
      const sheet = loadBossLateralSprites()[bossId]?.attacks[this.bossAttackIndex];
      const attackDuration = bossSheetFrameCount(sheet) * (BOSS_SPRITE_FOLDERS[bossId]?.attackFrameSec ?? 0.115);
      // Trigger impact wave on the Sphere mid-swing
      if (
        this.bossAttackFrameTimeSec >= 0.85 &&
        this.bossAttackFrameTimeSec - dt < 0.85
      ) {
        this.spherePulseAlpha = 0.85;
      }
      if (this.bossAttackFrameTimeSec >= attackDuration) {
        this.bossState = 'idle';
      }
    } else {
      // Boss is in 'idle' stance at the Sphere: "APARAR" appears first, then after RIFT_TELEGRAPH_BEFORE_ATTACK_SEC the Boss swings!
      this.bossWalkTimeSec += dt * 0.35;
      if (battle && this.bossParryRecoverySec <= 0) {
        for (const rift of battle.activeRifts) {
          if (this.attackedRiftIds.has(rift.id)) continue;
          const riftAgeSec = rift.maxSec - rift.remainingSec;
          if (riftAgeSec >= RIFT_TELEGRAPH_BEFORE_ATTACK_SEC) {
            this.attackedRiftIds.add(rift.id);
            this.triggerBossAttackSwing(rift);
            break;
          }
        }
      }
    }
    this.updateBattleCamera(elapsedSec);
  }

  private resolveMiracleFollowerActor(miracle: ActiveBossMiracle | null | undefined): BattleFollowerActor | null {
    if (!miracle || this.followerActors.length === 0) return null;
    const encircling = this.followerActors.filter((f) => f.state === 'encircling');
    const pool = encircling.length > 0 ? encircling : this.followerActors;
    return pool[miracle.followerSlot % pool.length] ?? null;
  }

  // Pixel speech bubble (3px grid) with a twinkling star matching FollowersArena.drawMiracleSpeechBubble
  private drawFollowerMiracleBubble(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    cycleTimer: number
  ): void {
    const px = 3;
    const bob = Math.sin(cycleTimer * 4) > 0 ? px : 0;
    const blink = Math.sin(cycleTimer * 6) > 0;

    const cols = 11;
    const rows = 8;
    const left = Math.round(x - (cols * px) / 2);
    const top = Math.round(y - 98 - bob);

    // Gold frame, dark plate, tail pointing at the devotee
    ctx.fillStyle = blink ? '#f6dc9a' : '#c99a4e';
    ctx.fillRect(left + px, top, (cols - 2) * px, rows * px);
    ctx.fillRect(left, top + px, cols * px, (rows - 2) * px);
    ctx.fillRect(left + 4 * px, top + rows * px, 3 * px, px);
    ctx.fillRect(left + 5 * px, top + (rows + 1) * px, px, px);
    ctx.fillStyle = '#0f0c0a';
    ctx.fillRect(left + px, top + px, (cols - 2) * px, (rows - 2) * px);
    ctx.fillRect(left + 5 * px, top + rows * px, px, px);

    // Four-point star
    const cx = left + 5 * px;
    const cy = top + 3 * px;
    ctx.fillStyle = '#f6dc9a';
    ctx.fillRect(cx, cy - px, px, 4 * px);
    ctx.fillRect(cx - px, cy, 3 * px, 2 * px);
    if (blink) {
      ctx.fillRect(cx - 2 * px, cy + px / 2, px, px);
      ctx.fillRect(cx + 2 * px, cy + px / 2, px, px);
    }
  }

  private drawWorldScene(): void {
    const battle = this.options.gameState.activeBossBattle;
    const climax = this.climaxState;
    if (!battle && !climax) return;

    const bossId = battle?.bossId ?? climax?.boss.id ?? this.activeBossIdForScene;
    const phase = battle?.phase ?? this.lastPhase ?? 1;

    // Synchronize the attack hitbox with the exact rendered Boss sprite frame (hidden while awaiting ritual or in climax)
    const bossFrame = this.resolveBossRenderFrame(bossId);
    this.syncAttackHitbox(bossFrame);

    const ctx = this.worldCtx;
    if (!ctx) return;

    ctx.clearRect(0, 0, this.stageWidth, this.stageHeight);
    ctx.imageSmoothingEnabled = false;

    const sphereLocalX = BOSS_SPHERE_CENTER.x - this.stageOriginX;
    const sphereLocalY = BOSS_SPHERE_CENTER.y - this.stageOriginY;

    // 1. Grand Sacred Protective Circle etched on the cathedral floor around BOTH Boss and Divine Sphere
    //    Intensifies visually in Phase II (gold/amber) and Phase III (crimson/solar fury)
    ctx.save();
    ctx.strokeStyle =
      phase >= 3
        ? 'rgba(232, 93, 93, 0.82)'
        : phase === 2
          ? 'rgba(246, 205, 110, 0.68)'
          : 'rgba(201, 154, 78, 0.42)';
    ctx.lineWidth = phase >= 3 ? 3 : phase === 2 ? 2.5 : 2;
    ctx.setLineDash([12, 9]);
    ctx.beginPath();
    ctx.ellipse(sphereLocalX, sphereLocalY, SPHERE_CIRCLE_RX, SPHERE_CIRCLE_RY, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle =
      phase >= 3
        ? 'rgba(246, 220, 154, 0.58)'
        : phase === 2
          ? 'rgba(224, 138, 82, 0.42)'
          : 'rgba(169, 155, 224, 0.24)';
    ctx.lineWidth = phase >= 2 ? 2 : 1.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.ellipse(
      sphereLocalX,
      sphereLocalY,
      SPHERE_CIRCLE_RX + 28,
      SPHERE_CIRCLE_RY + 28,
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();
    ctx.restore();

    // 2. Divine Sphere Astral Charge Ring (FULGOR DIVINO: 0%..100%)
    const sphereCharge = battle?.sphereCharge ?? 0;
    if (battle && battle.combatStarted !== false) {
      ctx.save();
      const ringRadius = 136;
      ctx.strokeStyle = 'rgba(201, 154, 78, 0.24)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(sphereLocalX, sphereLocalY, ringRadius, 0, Math.PI * 2);
      ctx.stroke();

      if (sphereCharge > 0) {
        const chargeRatio = Math.max(0, Math.min(1, sphereCharge / 100));
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + chargeRatio * Math.PI * 2;
        ctx.strokeStyle = chargeRatio >= 1 ? '#fff3c4' : '#f6dc9a';
        ctx.lineWidth = chargeRatio >= 1 ? 6 : 4.5;
        ctx.beginPath();
        ctx.arc(sphereLocalX, sphereLocalY, ringRadius, startAngle, endAngle);
        ctx.stroke();

        if (chargeRatio >= 1) {
          ctx.strokeStyle = 'rgba(246, 220, 154, 0.55)';
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 6]);
          ctx.beginPath();
          ctx.arc(sphereLocalX, sphereLocalY, ringRadius + 14, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // 2b. Special Attack 2 Canvas Overlays (Hades Chains & Anubis Balance Beam)
    if (battle && battle.activeRifts.some((r) => r.kind === 'hades_chains')) {
      ctx.save();
      ctx.strokeStyle = 'rgba(220, 62, 62, 0.85)';
      ctx.lineWidth = 3.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(sphereLocalX - 120, sphereLocalY - 75);
      ctx.lineTo(sphereLocalX + 120, sphereLocalY + 75);
      ctx.moveTo(sphereLocalX - 120, sphereLocalY + 75);
      ctx.lineTo(sphereLocalX + 120, sphereLocalY - 75);
      ctx.stroke();
      ctx.restore();
    }
    if (battle && battle.activeRifts.some((r) => r.kind === 'anubis_scales')) {
      ctx.save();
      ctx.strokeStyle = 'rgba(246, 220, 154, 0.72)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(sphereLocalX - 185, sphereLocalY - 10);
      ctx.lineTo(sphereLocalX + 185, sphereLocalY - 10);
      ctx.stroke();
      ctx.restore();
    }

    // 2c. Incarnation Call Wave inside the Pátio dos Fiéis (when summoning the queue)
    if (this.incCallRingProgress > 0) {
      const incLocalX = this.incX - this.stageOriginX;
      const incLocalY = this.incY - this.stageOriginY - 40;
      const radius = 24 + this.incCallRingProgress * 280;
      const alpha = Math.max(0, (1 - this.incCallRingProgress) * 0.72);
      ctx.save();
      ctx.strokeStyle = `rgba(246, 220, 154, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(incLocalX, incLocalY, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Impact Shockwave on the Sphere when the Boss strikes, plus Phase II / III Shockwave
    if (this.spherePulseAlpha > 0) {
      ctx.save();
      const radius = 140 + (1 - this.spherePulseAlpha) * 110;
      ctx.strokeStyle = `rgba(224, 138, 82, ${this.spherePulseAlpha * 0.75})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(sphereLocalX, sphereLocalY, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (this.phaseShockwaveAlpha > 0) {
      ctx.save();
      const radius = 90 + (1 - this.phaseShockwaveAlpha) * 440;
      ctx.strokeStyle =
        phase >= 3
          ? `rgba(232, 93, 93, ${this.phaseShockwaveAlpha * 0.85})`
          : `rgba(246, 205, 110, ${this.phaseShockwaveAlpha * 0.85})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(bossFrame.lx, bossFrame.ly - 70, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 3b. Fulgor Divino Beam (Sphere -> Boss) & Miracle Healing Beam (Faithful -> Sphere)
    if (this.fulgorBeamAlpha > 0) {
      ctx.save();
      ctx.strokeStyle = `rgba(255, 243, 196, ${this.fulgorBeamAlpha})`;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(sphereLocalX, sphereLocalY);
      ctx.lineTo(bossFrame.lx, bossFrame.ly - 84);
      ctx.stroke();
      ctx.restore();
    }
    if (this.miracleBeam && this.miracleBeam.alpha > 0) {
      ctx.save();
      ctx.strokeStyle = `rgba(246, 220, 154, ${this.miracleBeam.alpha})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(this.miracleBeam.fromX, this.miracleBeam.fromY);
      ctx.lineTo(sphereLocalX, sphereLocalY);
      ctx.stroke();
      ctx.restore();
    }

    // 4. Depth-sorted rendering of Followers, Incarnation, and Boss
    type Renderable = { y: number; draw: () => void };
    const drawList: Renderable[] = [];
    const miracleActor = this.resolveMiracleFollowerActor(battle?.activeMiracle);

    const followerSheets = loadFollowerSprites();
    for (const f of this.followerActors) {
      const isMiracleBearer = miracleActor?.id === f.id;
      drawList.push({
        y: f.y,
        draw: () => {
          const lx = Math.round(f.x - this.stageOriginX);
          const ly = Math.round(f.y - this.stageOriginY);

          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.fillRect(lx - 12, ly - 2, 24, 4);

          if (isMiracleBearer) {
            ctx.save();
            ctx.fillStyle = 'rgba(246, 220, 154, 0.32)';
            ctx.beginPath();
            ctx.ellipse(lx, ly - 2, 28, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#f6dc9a';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(lx, ly - 38, 42, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }

          const animState =
            f.state === 'encircling'
              ? 'pray'
              : (f.state === 'following_in_line' || f.state === 'returning_to_patio')
                ? 'walk'
                : 'idle';
          const { action, frame } = followerAnimationFrame(animState, f.walkCycle, f.prayCycle, false);
          const sheet = followerSheets[f.tier]?.[action];
          if (sheet && sheet.complete && sheet.naturalWidth > 0) {
            ctx.save();
            ctx.translate(lx, ly);
            ctx.scale(f.facing, 1);
            ctx.drawImage(
              sheet,
              frame * FOLLOWER_FRAME_SIZE,
              0,
              FOLLOWER_FRAME_SIZE,
              FOLLOWER_FRAME_SIZE,
              -40,
              -74,
              80,
              80
            );
            ctx.restore();
          }

          if (isMiracleBearer) {
            this.drawFollowerMiracleBubble(ctx, lx, ly, f.prayCycle);
          }
        },
      });
    }

    // Incarnation Avatar
    const incStageIdx = incarnationStageIndex(this.options.gameState.incarnationStage);
    const incSprites = loadIncarnationProcessionSprites()[incStageIdx];
    drawList.push({
      y: this.incY,
      draw: () => {
        const lx = Math.round(this.incX - this.stageOriginX);
        const ly = Math.round(this.incY - this.stageOriginY);

        ctx.fillStyle = 'rgba(246, 220, 154, 0.24)';
        ctx.beginPath();
        ctx.ellipse(lx, ly - 2, 34, 11, 0, 0, Math.PI * 2);
        ctx.fill();

        if (this.incState === 'guarding') {
          ctx.save();
          ctx.strokeStyle = 'rgba(246, 220, 154, 0.45)';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.moveTo(lx, ly - 64);
          ctx.lineTo(sphereLocalX, sphereLocalY);
          ctx.stroke();
          ctx.restore();
        }

        if (incSprites) {
          const isWalking =
            this.incState === 'walking_to_patio' ||
            this.incState === 'returning_to_altar' ||
            (this.incState === 'leading_return' && this.returnS < polylineLength(this.returnPath)) ||
            (this.incState === 'leading_procession' &&
              Math.hypot(
                this.incX - this.incGuardSpot.x,
                this.incY - this.incGuardSpot.y
              ) > 4);
          const sheet =
            isWalking && incSprites.walk.complete && incSprites.walk.naturalWidth > 0
              ? incSprites.walk
              : incSprites.still;
          const frame = sheet === incSprites.walk ? Math.floor(this.incWalkCycle) % 8 : 0;
          if (sheet.complete && sheet.naturalWidth > 0) {
            ctx.save();
            ctx.translate(lx, ly);
            ctx.scale(this.incFacing, 1);
            ctx.drawImage(
              sheet,
              frame * INCARNATION_FRAME_SIZE,
              0,
              INCARNATION_FRAME_SIZE,
              INCARNATION_FRAME_SIZE,
              -64,
              -128,
              128,
              128
            );
            ctx.restore();
          }
        }

        if (this.incState !== 'guarding') {
          const caption =
            this.incState === 'leading_return'
              ? '\u2726 DE VOLTA AO PÁTIO \u2726'
              : this.incState === 'returning_to_altar'
                ? '\u2726 RETORNANDO AO ALTAR \u2726'
                : this.incState === 'walking_to_patio'
                  ? '\u2726 BUSCANDO OS FIÉIS \u2726'
                  : this.incState === 'gathering_at_patio'
                    ? '\u2726 CONVOCANDO A FILA \u2726'
                    : '\u2726 FORMANDO A RODA SAGRADA \u2726';
          ctx.save();
          ctx.font = '700 13px VT323, monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#f6dc9a';
          ctx.fillText(caption, lx, ly - 134);
          ctx.restore();
        }
      },
    });

    // Boss Sprite
    if (this.bossState !== 'awaiting_ritual' && !(climax?.victory && climax.remainingSec <= 0)) {
      drawList.push({
        y: this.bossY,
        draw: () => {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
          ctx.beginPath();
          ctx.ellipse(bossFrame.lx, bossFrame.ly + 14, 82, 22, 0, 0, Math.PI * 2);
          ctx.fill();

          if (bossFrame.sheet) {
            ctx.save();
            if (climax?.victory) {
              ctx.filter = 'brightness(2.35) contrast(1.25)';
              ctx.globalAlpha = Math.max(0, climax.remainingSec / climax.totalSec);
            } else if (this.bossHitFlashSec > 0) {
              ctx.filter = 'brightness(1.75) contrast(1.15)';
            }
            ctx.drawImage(
              bossFrame.sheet,
              bossFrame.frame * BOSS_SRC_W,
              0,
              BOSS_SRC_W,
              BOSS_SRC_H,
              bossFrame.drawLeft,
              bossFrame.drawTop,
              bossFrame.drawW,
              bossFrame.drawH
            );
            ctx.restore();
          }
        },
      });
    }

    drawList.sort((a, b) => a.y - b.y);
    for (const item of drawList) {
      item.draw();
    }

    // 5. ~1.5s Climax Overlay on the World Stage (Victory Dissolution Beams or Defeat Sphere Fracture)
    if (climax && climax.remainingSec > 0) {
      const progress = 1 - climax.remainingSec / Math.max(0.1, climax.totalSec);
      ctx.save();
      if (climax.victory) {
        ctx.fillStyle = '#fff3c4';
        ctx.font = '700 32px VT323, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('VITÓRIA', sphereLocalX, sphereLocalY - 240 - progress * 20);
        ctx.strokeStyle = 'rgba(255, 240, 187, 0.72)';
        ctx.lineWidth = 2.5;
        for (const f of this.followerActors) {
          const lx = Math.round(f.x - this.stageOriginX);
          const ly = Math.round(f.y - this.stageOriginY - 40);
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(bossFrame.lx, bossFrame.ly - 84);
          ctx.stroke();
        }
        const incLx = Math.round(this.incX - this.stageOriginX);
        const incLy = Math.round(this.incY - this.stageOriginY - 64);
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(incLx, incLy);
        ctx.lineTo(bossFrame.lx, bossFrame.ly - 84);
        ctx.stroke();

        ctx.strokeStyle = '#fff3c4';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(bossFrame.lx, bossFrame.ly - 84, 30 + progress * 160, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.strokeStyle = 'rgba(232, 82, 82, 0.9)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(sphereLocalX, sphereLocalY, 90 + progress * 140, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(sphereLocalX - 95, sphereLocalY - 80);
        ctx.lineTo(sphereLocalX - 18, sphereLocalY - 12);
        ctx.lineTo(sphereLocalX + 24, sphereLocalY + 18);
        ctx.lineTo(sphereLocalX + 98, sphereLocalY + 86);
        ctx.moveTo(sphereLocalX + 82, sphereLocalY - 76);
        ctx.lineTo(sphereLocalX + 10, sphereLocalY - 6);
        ctx.lineTo(sphereLocalX - 88, sphereLocalY + 78);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private presentBattleResultPopup(result: PendingBattleClimax): void {
    const { boss, victory, isRematch, durationSec, cultReadiness, lowestTwoPillars } = result;
    if (victory) {
      this.options.audio.playChime();
      if (isRematch) {
        const bestSec = this.options.gameState.getBossBestTimeSec(boss.id) ?? durationSec;
        this.options.notifications.showCustomPopup(
          `${boss.name.toUpperCase()} SUBJUGADO!`,
          `Duelo relembrado em ${durationSec.toFixed(1)}s (melhor tempo: ${bestSec.toFixed(1)}s).`,
          boss.symbol,
          'MEMÓRIA DE DUELO'
        );
      } else {
        this.options.notifications.showCustomPopup(
          `${boss.name.toUpperCase()} SUBJUGADO!`,
          `${boss.rewardName}: ${boss.rewardDesc}`,
          boss.symbol,
          'VITÓRIA MITOLÓGICA'
        );
      }
    } else {
      this.options.audio.playTone(150, 'sawtooth', 0.35);
      const [p1, p2] = lowestTwoPillars;
      const diagnosis = `Prontidão ${(cultReadiness * 100).toFixed(0)}%: fortaleça ${p1.label} e ${p2.label}.`;
      const cursePrefix = isRematch
        ? 'Revanche sem Maldição.'
        : 'Maldição: -25% de Fé/s e Fervor/s por 20s.';
      this.options.notifications.showCustomPopup(
        `ALTAR ROMPIDO POR ${boss.name.toUpperCase()}`,
        `${cursePrefix} ${diagnosis}`,
        'warning',
        'RECUO DO ALTAR'
      );
    }

    this.options.onBattleEnded?.(boss, victory);
    events.emit(GameEvents.STATE_CHANGED);
  }

  private handleBattleFinished(
    boss: GnoseBoss,
    victory: boolean,
    isRematch = false,
    durationSec = 0
  ): void {
    const breakdown = this.options.gameState.getBossCombatBreakdown(boss.id);
    const pending: PendingBattleClimax = {
      boss,
      victory,
      isRematch,
      durationSec,
      remainingSec: CLIMAX_DURATION_SEC,
      totalSec: CLIMAX_DURATION_SEC,
      cultReadiness: breakdown.cultReadiness,
      lowestTwoPillars: breakdown.lowestTwoPillars,
    };

    // If the scene is still in 'awaiting_ritual' (e.g. synchronous unit test skipping choreography), close immediately
    if (this.bossState === 'awaiting_ritual' || !this.isOpen()) {
      this.climaxState = pending;
      this.close();
      return;
    }

    // Otherwise run the ~1.5s visual climax on the world stage before closing
    this.climaxState = pending;
    if (this.riftsLayerEl) {
      this.riftsLayerEl.innerHTML = '';
    }
    if (this.fulgorBtnEl) {
      this.fulgorBtnEl.style.display = 'none';
    }
    this.miracleBtnEl = null;
    if (victory) {
      this.options.audio.playChime();
      this.setText(
        this.combatFeedbackEl,
        `A Roda dos Fiéis dissolve ${boss.name}!`
      );
      if (this.bossHpFillEl) this.bossHpFillEl.style.width = '0%';
    } else {
      this.options.audio.playTone(150, 'sawtooth', 0.35);
      this.setText(
        this.combatFeedbackEl,
        `A Esfera trinca diante de ${boss.name}!`
      );
      if (this.altarIntegrityFillEl) this.altarIntegrityFillEl.style.width = '0%';
    }
    this.drawWorldScene();
  }

  public updateUI(): void {
    if (!this.isOpen()) return;
    if (this.climaxState) return;
    const battle = this.options.gameState.activeBossBattle;
    if (!battle) {
      if (this.isOpen()) this.close();
      return;
    }

    const breakdown = this.options.gameState.getBossCombatBreakdown(battle.bossId);
    const phase = battle.phase ?? this.options.gameState.getBossPhase();

    if (battle.riftsMissed > this.lastRiftsMissed) {
      this.lastRiftsMissed = battle.riftsMissed;
      this.options.audio.playTone(210, 'sawtooth', 0.14);
      // Miss feedback must never restart a swing that a successful parry just cancelled.
      if (this.bossParryRecoverySec <= 0) this.spherePulseAlpha = 0.9;
      this.setText(
        this.combatFeedbackEl,
        `Golpe não aparado! −${breakdown.altarDamageOnMiss.toFixed(0)}% da Esfera.`
      );
    } else if (phase > this.lastPhase) {
      this.lastPhase = phase;
      this.phaseShockwaveAlpha = 1.0;
      this.spherePulseAlpha = 1.0;
      this.options.audio.playTone(phase === 3 ? 165 : 195, 'sawtooth', 0.32);
      const bannerText =
        phase === 3
          ? 'FASE III — FÚRIA PRIMORDIAL'
          : 'FASE II — O GUARDIÃO DESPERTA';
      this.showPhaseBanner(bannerText);
      const phaseLabel =
        phase === 3
          ? 'Fase III: −30% da Esfera.'
          : 'Fase II: −15% da Esfera.';
      this.setText(this.combatFeedbackEl, `${phaseLabel} Golpes mais rápidos.`);
    }

    const hpPercent = Math.max(0, Math.min(100, (battle.bossHp / battle.bossMaxHp) * 100));
    if (this.bossHpFillEl) {
      const width = `${hpPercent.toFixed(1)}%`;
      if (this.bossHpFillEl.style.width !== width) this.bossHpFillEl.style.width = width;
      this.bossHpFillEl.parentElement?.setAttribute('aria-valuenow', hpPercent.toFixed(1));
    }
    const remainingPassiveSec =
      breakdown.passiveDps > 0 ? Math.ceil(battle.bossHp / breakdown.passiveDps) : Infinity;
    this.setText(this.bossHpValEl, bossHpLabel(phase, hpPercent, remainingPassiveSec));

    const comboStreak = battle.comboStreak ?? 0;

    if (this.attackDamageEl) {
      this.setText(this.attackDamageEl, `\u2212${(breakdown.clickHpFraction * 100).toFixed(2)}%`);
    }

    if (this.attackBtnEl) {
      const cooling = battle.sphereCooldownSec > 1e-8 || battle.combatStarted === false || !breakdown.canDamageBoss;
      this.attackBtnEl.setAttribute('aria-disabled', String(cooling));
    }

    // Update Fulgor Divino button on the Sphere
    if (this.fulgorBtnEl) {
      if (battle.combatStarted === false) {
        this.fulgorBtnEl.style.display = 'none';
      } else {
        this.fulgorBtnEl.style.display = 'inline-flex';
        const charge = Math.floor(battle.sphereCharge ?? 0);
        const ready = (battle.sphereCharge ?? 0) >= 100 - 1e-6 && breakdown.canDamageBoss;
        this.fulgorBtnEl.classList.toggle('is-ready', ready);
        this.fulgorBtnEl.setAttribute('aria-disabled', String(!ready));
        this.setText(
          this.fulgorBtnEl,
          !breakdown.canDamageBoss
            ? 'FULGOR BLOQUEADO'
            : ready
            ? `\u2726 FULGOR DIVINO! (\u2212${(breakdown.fulgorHpFraction * 100).toFixed(0)}%)`
            : `FULGOR ${charge}%`
        );
      }
    }

    const altarPercent = Math.max(
      0,
      Math.min(100, (battle.altarIntegrity / battle.maxAltarIntegrity) * 100)
    );
    if (this.altarIntegrityFillEl) {
      const width = `${altarPercent.toFixed(0)}%`;
      if (this.altarIntegrityFillEl.style.width !== width) this.altarIntegrityFillEl.style.width = width;
      this.altarIntegrityFillEl.parentElement?.setAttribute('aria-valuenow', altarPercent.toFixed(0));
      this.altarIntegrityFillEl.parentElement?.classList.toggle('is-critical', altarPercent <= 25);
    }
    if (this.altarIntegrityValEl) {
      this.setText(this.altarIntegrityValEl, `${altarPercent <= 25 ? 'EM RISCO \u00b7 ' : ''}${altarPercent.toFixed(0)}%`);
    }

    if (this.combatStatsEl) {
      if (battle.combatStarted === false) {
        this.setText(this.combatStatsEl, this.formatRitualStatsLabel());
      } else {
        const warning = !breakdown.canDamageBoss
          ? `Sem dano: Prontidão abaixo de ${BOSS_DAMAGE_READINESS_THRESHOLD * 100}%.`
          : !breakdown.canWithstandBoss
            ? 'Um golpe não aparado destrói a Esfera.'
            : '';
        const combo = comboStreak > 0 ? `Combo ×${comboStreak}` : '';
        this.setText(this.combatStatsEl, [warning, combo].filter(Boolean).join(' '));
      }
    }

    this.syncRiftsDOM(battle.activeRifts);
    this.syncMiracleDOM(battle.activeMiracle ?? null);
    this.syncAttackHitbox(this.resolveBossRenderFrame(battle.bossId));
  }

  private syncMiracleDOM(miracle: ActiveBossMiracle | null): void {
    if (!this.riftsLayerEl) return;

    if (!miracle || miracle.remainingSec <= 0) {
      if (this.miracleBtnEl) {
        this.miracleBtnEl.remove();
        this.miracleBtnEl = null;
      }
      return;
    }

    const actor = this.resolveMiracleFollowerActor(miracle);
    const lx = actor
      ? Math.round(actor.x - this.stageOriginX)
      : Math.round(BOSS_SPHERE_CENTER.x - this.stageOriginX + SACRED_CIRCLE_RADIUS * 0.7);
    const ly = actor
      ? Math.round(actor.y - this.stageOriginY - 58)
      : Math.round(BOSS_SPHERE_CENTER.y - this.stageOriginY - 180);

    if (!this.miracleBtnEl || this.miracleBtnEl.getAttribute('data-miracle-id') !== miracle.id) {
      if (this.miracleBtnEl) {
        this.miracleBtnEl.remove();
      }
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'boss-miracle-btn';
      btn.className = 'boss-miracle-target';
      btn.setAttribute('data-miracle-id', miracle.id);
      btn.setAttribute('aria-label', 'Canalizar Milagre do Fiel: restaura +10% de Integridade da Esfera');
      btn.addEventListener('click', (e: MouseEvent) => {
        e.stopPropagation();
        const res = this.options.gameState.clickBossMiracle();
        if (res.triggered) {
          this.miracleBeam = { fromX: lx, fromY: ly + 18, alpha: 1.0 };
          this.options.audio.playChime();
          this.showHitFeedback(`Milagre! +${res.healed.toFixed(0)}% da Esfera.`);
          const x = e.clientX || window.innerWidth / 2;
          const y = e.clientY || window.innerHeight / 2;
          this.options.spawnFloatingText(x, y, '\u2726 MILAGRE! +10% ESFERA');
          this.updateUI();
          this.drawWorldScene();
          events.emit(GameEvents.STATE_CHANGED);
        }
      });
      this.riftsLayerEl.appendChild(btn);
      this.miracleBtnEl = btn;
    }

    this.miracleBtnEl.style.left = `${lx}px`;
    this.miracleBtnEl.style.top = `${ly}px`;
    this.setText(
      this.miracleBtnEl,
      `\u2726 MILAGRE +10% (${Math.max(0, miracle.remainingSec).toFixed(1)}s)`
    );
  }

  private syncRiftsDOM(activeRifts: BossRift[]): void {
    if (!this.riftsLayerEl) return;

    const activeIds = new Set(activeRifts.map((r) => r.id));

    // Remove expired/shattered rift elements (keep miracle button intact)
    Array.from(this.riftsLayerEl.children).forEach((child) => {
      const el = child as HTMLElement;
      const riftId = el.getAttribute('data-rift-id');
      if (!riftId) return;
      if (!activeIds.has(riftId)) {
        const hadFocus = el.contains(document.activeElement);
        el.remove();
        if (hadFocus && this.isOpen()) this.attackBtnEl?.focus({ preventScroll: true });
      }
    });

    const promptScale = Number(document.getElementById('dodeca-board-world')?.style.getPropertyValue('--boss-prompt-scale')) || 1;
    const sphereLocal = { x: BOSS_SPHERE_CENTER.x - this.stageOriginX, y: BOSS_SPHERE_CENTER.y - this.stageOriginY };
    const elapsedCombatSec = this.options.gameState.activeBossBattle?.elapsedCombatSec ?? 0;

    activeRifts.forEach((rift) => {
      const kind = rift.kind ?? 'standard';
      const pos = parryCardPosition(rift, sphereLocal, elapsedCombatSec, promptScale);
      const labelText =
        kind === 'anubis_scales'
          ? 'PESAR'
          : kind === 'hades_chains'
            ? 'GRILHÃO'
            : kind === 'odin_raven'
              ? 'CORVO'
              : kind === 'chaos_orbit'
                ? 'COLAPSO'
                : 'APARAR';
      const detailText =
        kind === 'anubis_scales'
          ? 'Clique no maior peso'
          : kind === 'hades_chains'
            ? 'Quebre para recuperar os cliques'
            : kind === 'odin_raven'
              ? 'Apare para atrasar o ataque'
              : kind === 'chaos_orbit'
                ? 'Apare os três selos'
                : '+25% de Fulgor';

      let riftEl = this.riftsLayerEl!.querySelector<HTMLButtonElement>(
        `[data-rift-id="${rift.id}"]`
      );
      if (!riftEl) {
        riftEl = document.createElement('button');
        riftEl.type = 'button';
        const kindClass = kind !== 'standard' ? ` boss-rift-${kind.replace('_', '-')}` : '';
        riftEl.className = `boss-rift-target${kindClass}`;
        riftEl.setAttribute('data-rift-id', rift.id);
        riftEl.setAttribute('data-rift-kind', kind);
        riftEl.setAttribute('aria-label', kind === 'anubis_scales'
          ? `Pesar: peso ${rift.scaleValue}. Escolha apenas o maior peso.`
          : `${labelText}: aparar golpe do Guardião e carregar a Esfera`);
        riftEl.style.left = `${pos.x}px`;
        riftEl.style.top = `${pos.y}px`;
        riftEl.innerHTML = `
          ${kind === 'anubis_scales'
            ? `<span class="boss-rift-number"><small>PESO</small>${rift.scaleValue}</span>`
            : `<span class="boss-rift-core" aria-hidden="true">${icon('shield')}</span>`}
          <span class="boss-rift-label">${labelText}</span>
          <span class="boss-rift-damage">${detailText}</span>
          <span class="boss-rift-timer"></span>
          <span class="boss-rift-window" aria-hidden="true"><span class="boss-rift-window-fill"></span></span>
        `;
        riftEl.addEventListener('click', (e: MouseEvent) => {
          e.stopPropagation();
          const res = this.options.gameState.clickBossRift(rift.id);
          if (res.altarDamageTaken !== undefined) {
            this.lastRiftsMissed = this.options.gameState.activeBossBattle?.riftsMissed ?? this.lastRiftsMissed;
            this.spherePulseAlpha = 0.9;
            this.showHitFeedback(`Peso menor! −${res.altarDamageTaken.toFixed(0)}% da Esfera (×${res.scaleDamageMultiplier}).`);
            this.options.spawnFloatingText(
              e.clientX || window.innerWidth / 2, e.clientY || window.innerHeight / 2,
              `−${res.altarDamageTaken.toFixed(1)}% ESFERA (×${res.scaleDamageMultiplier})`
            );
            this.updateUI();
            this.drawWorldScene();
            events.emit(GameEvents.STATE_CHANGED);
          } else if (res.shattered) {
            // Parry interrupts/cancels the Boss's attack swing and flashes the Boss sprite
            this.attackedRiftIds.add(rift.id);
            this.bossHitFlashSec = 0.28;
            this.bossState = 'idle';
            this.bossAttackFrameTimeSec = 0;
            this.bossParryRecoverySec = PARRY_RECOVERY_SEC;
            this.spherePulseAlpha = 0;
            this.lastRiftsMissed = this.options.gameState.activeBossBattle?.riftsMissed ?? this.lastRiftsMissed;
            // A stale target from another pending rift cannot immediately replay the cancelled swing.
            this.options.gameState.activeBossBattle?.activeRifts.forEach(r => this.attackedRiftIds.add(r.id));
            const comboTag = (res.comboStreak ?? 1) > 1 ? ` Combo ×${res.comboStreak} ·` : '';
            let specialMsg = res.kind === 'anubis_scales'
              ? 'Não clique no peso menor.'
              : '+25% de Fulgor';
            if (res.specialBonusTriggered) {
              if (res.kind === 'hades_chains') {
                specialMsg = 'Grilhões quebrados! Cliques normais de novo.';
              } else if (res.kind === 'odin_raven') {
                specialMsg = 'Corvo interceptado! Próximo ataque atrasado.';
              } else if (res.kind === 'chaos_orbit') {
                specialMsg = 'Colapso revertido!';
              }
            }
            this.showHitFeedback(`Aparado!${comboTag} ${specialMsg}`);
            this.options.audio.playTone(880, 'triangle', 0.16);
            const x = e.clientX || window.innerWidth / 2;
            const y = e.clientY || window.innerHeight / 2;
            this.options.spawnFloatingText(
              x,
              y,
              '\u2726 APARADO!'
            );
            this.updateUI();
            this.drawWorldScene();
            events.emit(GameEvents.STATE_CHANGED);
          }
        });
        this.riftsLayerEl!.appendChild(riftEl);
      }

      riftEl.style.left = `${pos.x}px`;
      riftEl.style.top = `${pos.y}px`;
      const labelEl = riftEl.querySelector<HTMLElement>('.boss-rift-label');
      this.setText(labelEl, labelText);
      this.setText(riftEl.querySelector<HTMLElement>('.boss-rift-damage'), detailText);
      const timerEl = riftEl.querySelector<HTMLElement>('.boss-rift-timer');
      this.setText(timerEl, `${Math.max(0, rift.remainingSec).toFixed(1)}s`);
      const fillEl = riftEl.querySelector<HTMLElement>('.boss-rift-window-fill');
      if (fillEl && rift.maxSec > 0) {
        const pct = Math.max(0, Math.min(100, (rift.remainingSec / rift.maxSec) * 100));
        fillEl.style.width = `${pct.toFixed(0)}%`;
      }
      if (kind === 'odin_raven') {
        riftEl.classList.toggle('is-crit-window', rift.remainingSec >= rift.maxSec * 0.35);
      }
      riftEl.classList.toggle('is-urgent', rift.remainingSec <= 0.9);
    });
  }
}
