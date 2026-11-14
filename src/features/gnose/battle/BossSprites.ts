import { loadIncarnationSprites } from '../../incarnation/incarnationSprites.js';

export interface BossLateralSprites {
  idle: HTMLImageElement;
  walk: HTMLImageElement;
  attacks: HTMLImageElement[];
  defeat: HTMLImageElement;
}

export interface IncarnationWalkSprite {
  still: HTMLImageElement;
  walk: HTMLImageElement;
}

export interface SpriteFrameBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface BossRenderFrame {
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

export interface BossSpriteConfig {
  folder: string;
  attacks: [string, string, ...string[]];
  walkFrameSec?: number;
  attackFrameSec?: number;
  animateIdle?: boolean;
  drawOffsetX?: number;
}

export const BOSS_SRC_W = 256;
export const BOSS_SRC_H = 192;
export const HITBOX_PAD_PX = 6;

export const BOSS_SPRITE_FOLDERS: Record<string, BossSpriteConfig> = {
  boss_demiurge: { folder: 'lateral/05-demiurgo', attacks: ['ataque-esfera', 'ataque-ritual-sem-luz', 'ataque-ritual'], walkFrameSec: 0.09, attackFrameSec: 0.1 },
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
export const BOSS_DEFAULT_BOUNDS: Record<string, SpriteFrameBounds> = {
  boss_anubis: { minX: 28, minY: 7, maxX: 145, maxY: 183 },
  boss_cronos: { minX: 84, minY: 7, maxX: 164, maxY: 187 },
  boss_odin: { minX: 71, minY: 4, maxX: 189, maxY: 187 },
  boss_tiamat: { minX: 23, minY: 3, maxX: 166, maxY: 180 },
};

const INCARNATION_FILES = ['01-neofito', '02-consagrado', '03-ancestral', '04-eclipse', '05-solar'] as const;

const cachedBossSprites = new Map<string, BossLateralSprites>();
const cachedIncarnationWalkSprites = new Map<number, IncarnationWalkSprite>();
const spriteFrameBoundsCache = new WeakMap<HTMLImageElement, Map<number, SpriteFrameBounds>>();
let boundsProbeCanvas: HTMLCanvasElement | null = null;
let boundsProbeCtx: CanvasRenderingContext2D | null | undefined;
const bossSpriteLoadListeners = new Set<() => void>();

function notifyBossSpriteLoaded(): void {
  bossSpriteLoadListeners.forEach((cb) => cb());
}

export function onBossSpriteLoaded(listener: () => void): void {
  bossSpriteLoadListeners.add(listener);
}

export function getBossFrameBounds(
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

    // 2px stride cuts pixel scan cost by 4x while staying well within HITBOX_PAD_PX (6px)
    for (let y = 0; y < BOSS_SRC_H; y += 2) {
      const rowOffset = y * BOSS_SRC_W * 4;
      for (let x = 0; x < BOSS_SRC_W; x += 2) {
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

export function loadBossSprites(bossId: string): BossLateralSprites | undefined {
  const cached = cachedBossSprites.get(bossId);
  if (cached) return cached;
  const cfg = BOSS_SPRITE_FOLDERS[bossId];
  if (!cfg) return undefined;
  const base = `${import.meta.env.BASE_URL}assets/sprites/bosses/`;
  const load = (rel: string) => {
    const img = new Image();
    img.addEventListener('load', notifyBossSpriteLoaded, { once: true });
    img.src = `${base}${cfg.folder}/${rel}`;
    return img;
  };
  const sprites: BossLateralSprites = {
    idle: load('idle.png'),
    walk: load('andar/spritesheet.png'),
    defeat: load('derrota/spritesheet.png'),
    attacks: cfg.attacks.map(attack => load(`${attack}/spritesheet.png`)),
  };
  cachedBossSprites.set(bossId, sprites);
  return sprites;
}

export function bossSheetFrameCount(sheet: HTMLImageElement | undefined): number {
  return sheet && sheet.naturalWidth >= BOSS_SRC_W
    ? Math.max(1, Math.floor(sheet.naturalWidth / BOSS_SRC_W))
    : 17;
}

export function loadIncarnationProcessionSprite(stageIndex: number): IncarnationWalkSprite | undefined {
  const clamped = Math.max(0, Math.min(INCARNATION_FILES.length - 1, stageIndex));
  const cached = cachedIncarnationWalkSprites.get(clamped);
  if (cached) return cached;
  const file = INCARNATION_FILES[clamped];
  const base = `${import.meta.env.BASE_URL}assets/`;
  const sharedStill = loadIncarnationSprites()[clamped]?.still;
  const still = sharedStill ?? (() => {
    const img = new Image();
    img.src = `${base}concepts/encarnacao/${file}.png`;
    return img;
  })();
  const walk = new Image();
  walk.src = `${base}sprites/encarnacao/${file}/andar/spritesheet.png`;
  const entry = { still, walk };
  cachedIncarnationWalkSprites.set(clamped, entry);
  return entry;
}

export interface ResolveBossFrameParams {
  bossId: string;
  bossX: number;
  bossY: number;
  stageOriginX: number;
  stageOriginY: number;
  bossState: 'awaiting_ritual' | 'walking' | 'attacking' | 'idle';
  bossWalkTimeSec: number;
  bossAttackIndex: number;
  bossAttackFrameTimeSec: number;
  climaxVictory?: boolean;
  climaxRemainingSec?: number;
  climaxTotalSec?: number;
}

export function resolveBossRenderFrame(params: ResolveBossFrameParams): BossRenderFrame {
  const {
    bossId,
    bossX,
    bossY,
    stageOriginX,
    stageOriginY,
    bossState,
    bossWalkTimeSec,
    bossAttackIndex,
    bossAttackFrameTimeSec,
    climaxVictory,
    climaxRemainingSec = 0,
    climaxTotalSec = 1,
  } = params;

  const lx = Math.round(bossX - stageOriginX);
  const ly = Math.round(bossY - stageOriginY);
  const drawW = 320;
  const drawH = 240;
  const config = BOSS_SPRITE_FOLDERS[bossId];
  const drawOffsetX = config?.drawOffsetX ?? (bossId === 'boss_anubis' ? -108 : -158);
  const drawOffsetY = -215;
  const drawLeft = lx + drawOffsetX;
  const drawTop = ly + drawOffsetY;

  const bossSprites = loadBossSprites(bossId);
  let candidateSheet: HTMLImageElement | null = null;
  let frame = 0;

  if (bossSprites) {
    if (climaxVictory && bossSprites.defeat.complete && bossSprites.defeat.naturalWidth > 0) {
      candidateSheet = bossSprites.defeat;
      const progress = 1 - climaxRemainingSec / climaxTotalSec;
      const totalFrames = bossSheetFrameCount(candidateSheet);
      // Play once across the existing victory interval, never wrap to the standing pose.
      frame = Math.min(totalFrames - 1, Math.max(0, Math.floor(progress * totalFrames)));
    } else if (bossState === 'walking' || (bossState === 'idle' && config?.animateIdle)) {
      candidateSheet = bossSprites.walk;
      const totalFrames = bossSheetFrameCount(candidateSheet);
      frame = Math.floor(bossWalkTimeSec / (config?.walkFrameSec ?? 0.16)) % totalFrames;
    } else if (bossState === 'attacking') {
      candidateSheet = bossSprites.attacks[bossAttackIndex] ?? bossSprites.attacks[0];
      const totalFrames = bossSheetFrameCount(candidateSheet);
      frame = Math.min(totalFrames - 1, Math.floor(bossAttackFrameTimeSec / (config?.attackFrameSec ?? 0.115)));
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
  // Hitboxes are inactive during climax and pre-combat procession/walk; avoid scanning every frame.
  const skipDynamicBoundsScan =
    Boolean(climaxVictory) ||
    bossState === 'awaiting_ritual' ||
    bossState === 'walking' ||
    (bossId === 'boss_tiamat' && bossState === 'attacking');
  const bounds = skipDynamicBoundsScan
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
