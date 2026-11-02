export type FollowerTier = 0 | 1 | 2;
export type FollowerAction = 'andar' | 'rezar' | 'iluminacao';

const MODELS = ['iniciado', 'hierofante', 'pontifice'] as const;
export const FOLLOWER_FRAME_SIZE = 96;
export const PRAYER_DURATION = 13 * 0.15;
export const BLESSING_DURATION = 9 * 0.15;
export const PRAYER_SEQUENCE_DURATION = PRAYER_DURATION + BLESSING_DURATION;

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
  state: 'walk' | 'idle' | 'pray', walkCycle: number, prayerSeconds: number, awaitingMiracle = false,
): { action: FollowerAction; frame: number } {
  if (state === 'walk') return { action: 'andar', frame: Math.floor(walkCycle) % 8 };
  if (state === 'idle') return { action: 'rezar', frame: 0 };
  if (prayerSeconds < PRAYER_DURATION || awaitingMiracle) {
    return { action: 'rezar', frame: Math.min(12, Math.floor(prayerSeconds / 0.15)) };
  }
  return { action: 'iluminacao', frame: Math.min(8, Math.floor((prayerSeconds - PRAYER_DURATION) / 0.15)) };
}

type FollowerSprites = Record<FollowerAction, HTMLImageElement>[];
let sprites: FollowerSprites | undefined;

/** Nine shared sheets; never allocate or load images in the render loop. */
export function loadFollowerSprites(): FollowerSprites {
  return sprites ??= MODELS.map(model => {
    const load = (action: FollowerAction) => {
      const image = new Image();
      image.src = `${import.meta.env.BASE_URL}assets/sprites/fieis/${model}/${action}/spritesheet.png`;
      return image;
    };
    return { andar: load('andar'), rezar: load('rezar'), iluminacao: load('iluminacao') };
  });
}
