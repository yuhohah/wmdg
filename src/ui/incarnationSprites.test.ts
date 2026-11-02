import { afterEach, describe, expect, it, vi } from 'vitest';
import { IncarnationAltar } from './incarnationAltar.js';
import { incarnationStageIndex, loadIncarnationSprites } from './incarnationSprites.js';

afterEach(() => vi.unstubAllGlobals());

describe('incarnation altar sprites', () => {
  it('maps all five evolution stages and clamps invalid saved stages', () => {
    expect([1, 2, 3, 4, 5].map(incarnationStageIndex)).toEqual([0, 1, 2, 3, 4]);
    expect(incarnationStageIndex(0)).toBe(0);
    expect(incarnationStageIndex(6)).toBe(4);
    expect(incarnationStageIndex(NaN)).toBe(0);
  });

  it('loads and draws only the approved still for each of the five stages', () => {
    const sources: string[] = [];
    vi.stubGlobal('Image', class {
      set src(value: string) { sources.push(value); }
      complete = true;
      naturalWidth = 128;
    });
    const sprites = loadIncarnationSprites();
    expect(sprites).toHaveLength(5);
    expect(loadIncarnationSprites()).toBe(sprites);
    expect(sources).toHaveLength(5);
    expect(sources.every(src => src.includes('concepts/encarnacao/'))).toBe(true);
    const drawImage = vi.fn();
    const altar: IncarnationAltar = Object.create(IncarnationAltar.prototype);
    for (const [key, value] of Object.entries({ sprites, width: 400, height: 210,
      particles: [], pulsePhase: 0, flashAlpha: 0,
      ctx: { drawImage, clearRect: vi.fn(), fillRect: vi.fn() } })) {
      Reflect.set(altar, key, value);
    }
    for (let stage = 1; stage <= 5; stage++) {
      altar.setStage(stage, true);
      Reflect.get(altar, 'draw').call(altar);
      expect(drawImage).toHaveBeenLastCalledWith(sprites[stage - 1].still,
        0, 0, 128, 128, 136, 70, 128, 128);
    }
  });
});
