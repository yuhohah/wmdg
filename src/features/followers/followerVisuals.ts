export type FollowerTier = 0 | 1 | 2;
export type FollowerAction =
  | 'andar'
  | 'andar-frente'
  | 'andar-costas'
  | 'idle'
  | 'rezar'
  | 'rezar-loop'
  | 'levantar'
  | 'iluminacao';
export type WalkDirection = 'side' | 'down' | 'up';

const MODELS = ['iniciado', 'hierofante', 'pontifice'] as const;
export const FOLLOWER_FRAME_SIZE = 96;
export const FOLLOWER_IDLE_FRAME_SEC = 0.16;
export const PRAYER_DURATION = 13 * 0.15;
export const PRAYER_LOOP_FRAME_SEC = 0.15;
export const BLESSING_DURATION = 9 * 0.15;
export const RISE_FRAME_SEC = 0.13;
export const RISE_DURATION = 7 * RISE_FRAME_SEC;
export const PRAYER_SEQUENCE_DURATION = PRAYER_DURATION + BLESSING_DURATION + RISE_DURATION;

/** Resolve walk sprite orientation from movement delta with mild hysteresis to prevent diagonal flicker. */
export function resolveWalkDirection(
  dx: number,
  dy: number,
  previous: WalkDirection = 'side'
): WalkDirection {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < 1e-3 && ay < 1e-3) return previous;
  if (ay > ax * 1.15) return dy > 0 ? 'down' : 'up';
  if (ax > ay * 1.15) return 'side';
  return previous;
}

/** Frontal and back walks are symmetric and should not be horizontally mirrored. */
export function isFollowerActionMirrored(action: FollowerAction): boolean {
  return action !== 'andar-frente' && action !== 'andar-costas';
}

/** Visual grouping only: one Hierophant represents 20, one Pontiff 400 faithful. */
export function followerVisualCounts(total: number): [number, number, number] {
  const count = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
  if (count < 40) return [count, 0, 0];
  return [count % 20, Math.floor(count / 20) % 20, Math.floor(count / 400)];
}

/** Keep all remainders visible, with a bounded number of highest-tier sprites. */
export function visibleFollowerTiers(total: number): FollowerTier[] {
  const [initiates, hierophants, pontiffs] = followerVisualCounts(total);
  return [
    ...Array<FollowerTier>(initiates).fill(0),
    ...Array<FollowerTier>(hierophants).fill(1),
    ...Array<FollowerTier>(Math.min(pontiffs, 60 - initiates - hierophants)).fill(2),
  ];
}

export function followerAnimationFrame(
  state: 'walk' | 'idle' | 'pray' | 'rise',
  walkCycle: number,
  prayerSeconds: number,
  awaitingMiracle = false,
  idleCycle = 0,
  walkDir: WalkDirection = 'side'
): { action: FollowerAction; frame: number } {
  if (state === 'walk') {
    const action: FollowerAction =
      walkDir === 'down' ? 'andar-frente' : walkDir === 'up' ? 'andar-costas' : 'andar';
    return { action, frame: Math.floor(Math.max(0, walkCycle)) % 8 };
  }
  if (state === 'idle') {
    return { action: 'idle', frame: Math.floor(Math.max(0, idleCycle)) % 8 };
  }
  if (state === 'rise') {
    return { action: 'levantar', frame: Math.min(6, Math.max(0, Math.floor(prayerSeconds / RISE_FRAME_SEC))) };
  }
  if (prayerSeconds < PRAYER_DURATION) {
    return { action: 'rezar', frame: Math.min(12, Math.max(0, Math.floor(prayerSeconds / 0.15))) };
  }
  if (awaitingMiracle) {
    const loopSec = Math.max(0, prayerSeconds - PRAYER_DURATION);
    return { action: 'rezar-loop', frame: Math.floor(loopSec / PRAYER_LOOP_FRAME_SEC) % 6 };
  }
  const afterKneel = prayerSeconds - PRAYER_DURATION;
  if (afterKneel < BLESSING_DURATION) {
    return { action: 'iluminacao', frame: Math.min(8, Math.max(0, Math.floor(afterKneel / 0.15))) };
  }
  const riseSec = afterKneel - BLESSING_DURATION;
  return { action: 'levantar', frame: Math.min(6, Math.max(0, Math.floor(riseSec / RISE_FRAME_SEC))) };
}

type FollowerSprites = Record<FollowerAction, HTMLImageElement>[];
let sprites: FollowerSprites | undefined;

/** Twenty-four shared sheets (8 actions x 3 tiers); never allocate or load images in the render loop. */
export function loadFollowerSprites(): FollowerSprites {
  return sprites ??= MODELS.map(model => {
    const load = (action: FollowerAction) => {
      const image = new Image();
      image.src = `${import.meta.env.BASE_URL}assets/sprites/fieis/${model}/${action}/spritesheet.png`;
      return image;
    };
    return {
      andar: load('andar'),
      'andar-frente': load('andar-frente'),
      'andar-costas': load('andar-costas'),
      idle: load('idle'),
      rezar: load('rezar'),
      'rezar-loop': load('rezar-loop'),
      levantar: load('levantar'),
      iluminacao: load('iluminacao'),
    };
  });
}
