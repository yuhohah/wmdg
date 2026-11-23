import type { WalkDirection } from '../followers/followerVisuals.js';

const FILES = ['01-neofito', '02-consagrado', '03-ancestral', '04-eclipse', '05-solar'] as const;
export const INCARNATION_FRAME_SIZE = 128;
export const INCARNATION_FRAMES = 8;
export const INCARNATION_IDLE_FRAME_SEC = 0.16;
export const INCARNATION_CHANNEL_FRAME_SEC = 0.12;

export interface IncarnationSprite {
  still: HTMLImageElement;
  idle: HTMLImageElement;
  channel: HTMLImageElement;
  walkDown: HTMLImageElement;
  walkSide: HTMLImageElement;
  walkUp: HTMLImageElement;
}

const PALETTES = [
  ['#c5c6c7', '#8c9094', '#e2e8f0'],
  ['#c5c6c7', '#e2e8f0', '#b99b56'],
  ['#e2e8f0', '#c5c6c7', '#c99a4e'],
  ['#b8b0c4', '#c5c6c7', '#b99b56'],
  ['#e2e8f0', '#f6dc9a', '#c99a4e'],
] as const;

export function incarnationStageIndex(stage: number): number {
  return Number.isFinite(stage) ? Math.max(0, Math.min(4, Math.floor(stage) - 1)) : 0;
}

export function incarnationParticleColors(stage: number): readonly string[] {
  return PALETTES[incarnationStageIndex(stage)];
}

export function selectIncarnationWalkSheet(
  sprite: IncarnationSprite,
  dir: WalkDirection
): { sheet: HTMLImageElement; mirror: boolean } {
  const ready = (img: HTMLImageElement) => img.complete && img.naturalWidth > 0;
  if (dir === 'side' && ready(sprite.walkSide)) {
    return { sheet: sprite.walkSide, mirror: true };
  }
  if (dir === 'up' && ready(sprite.walkUp)) {
    return { sheet: sprite.walkUp, mirror: false };
  }
  if (ready(sprite.walkDown)) {
    return { sheet: sprite.walkDown, mirror: false };
  }
  return { sheet: sprite.still, mirror: false };
}

let sprites: IncarnationSprite[] | undefined;

/** Shared stills and spritesheets for all 5 Incarnation stages across Altar, Boss Battles, and Ending. */
export function loadIncarnationSprites(): IncarnationSprite[] {
  return sprites ??= FILES.map(file => {
    const load = (path: string) => {
      const image = new Image();
      image.src = `${import.meta.env.BASE_URL}assets/${path}`;
      return image;
    };
    return {
      still: load(`concepts/encarnacao/${file}.png`),
      idle: load(`sprites/encarnacao/${file}/idle/spritesheet.png`),
      channel: load(`sprites/encarnacao/${file}/canalizar/spritesheet.png`),
      walkDown: load(`sprites/encarnacao/${file}/andar/spritesheet.png`),
      walkSide: load(`sprites/encarnacao/${file}/andar-lateral/spritesheet.png`),
      walkUp: load(`sprites/encarnacao/${file}/andar-costas/spritesheet.png`),
    };
  });
}
