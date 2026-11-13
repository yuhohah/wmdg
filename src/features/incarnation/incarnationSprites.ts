const FILES = ['01-neofito', '02-consagrado', '03-ancestral', '04-eclipse', '05-solar'] as const;
export const INCARNATION_FRAME_SIZE = 128;

export interface IncarnationSprite {
  still: HTMLImageElement;
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

let sprites: IncarnationSprite[] | undefined;

/** The altar uses only approved stills; procession art belongs to the future battle flow. */
export function loadIncarnationSprites(): IncarnationSprite[] {
  return sprites ??= FILES.map(file => {
    const load = (path: string) => {
      const image = new Image();
      image.src = `${import.meta.env.BASE_URL}assets/${path}`;
      return image;
    };
    return {
      still: load(`concepts/encarnacao/${file}.png`),
    };
  });
}
