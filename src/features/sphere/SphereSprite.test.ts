import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SphereSprite, SPHERE_LAYERS, sphereLayerAngle } from './SphereSprite.js';
import { SphereController } from './SphereController.js';
import { GameStateManager } from '../../core/GameState.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('independent sphere rings', () => {
  const images: Array<{ src: string; onload: (() => void) | null; onerror: (() => void) | null }> = [];
  let frame: (now: number) => void;
  let intersect: (visible: boolean) => void;
  let hidden: boolean;
  const media = { matches: false };
  const ctx = { clearRect: vi.fn(), drawImage: vi.fn(), save: vi.fn(), restore: vi.fn(),
    translate: vi.fn(), rotate: vi.fn(), beginPath: vi.fn(), rect: vi.fn(), clip: vi.fn() };

  beforeEach(() => {
    images.length = 0;
    hidden = false;
    media.matches = false;
    vi.clearAllMocks();
    vi.stubGlobal('window', { matchMedia: () => media });
    vi.stubGlobal('document', { get visibilityState() { return hidden ? 'hidden' : 'visible'; } });
    vi.stubGlobal('Image', class {
      src = '';
      onload = null;
      onerror = null;
      complete = true;
      naturalWidth = 256;
      constructor() { images.push(this); }
    });
    vi.stubGlobal('requestAnimationFrame', vi.fn(callback => { frame = callback; return 1; }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: (entries: object[]) => void) {
        intersect = visible => callback([{ isIntersecting: visible }]);
      }
      observe() {}
      disconnect() {}
    });
  });

  const create = () => {
    const canvas: HTMLCanvasElement = Object.assign(Object.create(null), { getContext: () => ctx });
    return new SphereSprite(canvas);
  };

  it('keeps the globe still and gives the outer and inner rings distinct periods and directions', () => {
    const deltas = SPHERE_LAYERS.map(layer => sphereLayerAngle(layer, 1000) - sphereLayerAngle(layer, 0));
    expect(deltas[0]).toBe(0);
    expect(deltas.slice(1, 4).every(angle => angle < 0)).toBe(true);
    expect(new Set(deltas.slice(1, 4)).size).toBe(3);
    expect(deltas[4]).toBeGreaterThan(0);
    for (const layer of SPHERE_LAYERS) {
      expect(sphereLayerAngle(layer, 240000)).toBeCloseTo(sphereLayerAngle(layer, 0));
    }
  });

  it('loads individual parts and only animates them when visible at the visual frame rate', () => {
    const sprite = create();
    expect(images).toHaveLength(6);
    expect(images.every(image => image.src.includes('/esfera/layers/'))).toBe(true);
    images.slice(1).forEach(image => image.onload?.());
    frame(0);
    frame(16);
    expect(ctx.clearRect).toHaveBeenCalledTimes(1);
    frame(40);
    expect(ctx.clearRect).toHaveBeenCalledTimes(2);
    // Each ring has a back and front pass, plus globe and outer frame.
    expect(ctx.drawImage).toHaveBeenCalledTimes(16);
    expect(ctx.clip).toHaveBeenCalledTimes(12);
    intersect(false);
    frame(80);
    expect(ctx.clearRect).toHaveBeenCalledTimes(2);
    intersect(true);
    hidden = true;
    frame(120);
    expect(ctx.clearRect).toHaveBeenCalledTimes(2);
    hidden = false;
    media.matches = true;
    frame(160);
    expect(ctx.rotate).toHaveBeenLastCalledWith(0);
    sprite.destroy();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
  });

  it('keeps a rounded still visible if a layer fails without starting a partial animation', () => {
    const sprite = create();
    images[0].onload?.();
    images[1].onerror?.();
    images.slice(2).forEach(image => image.onload?.());
    expect(ctx.drawImage).toHaveBeenCalledWith(images[0], 64, 64, 256, 256);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    sprite.destroy();
  });
});

it('keeps granting faith and counting sphere clicks with the new visual', () => {
  const gameState = new GameStateManager();
  const sphere: SphereController = Object.create(SphereController.prototype);
  vi.stubGlobal('window', { innerWidth: 1280, innerHeight: 800 });
  vi.spyOn(sphere, 'spawnFloatingText').mockImplementation(() => {});
  for (const [key, value] of Object.entries({ gameState,
    audio: { init: vi.fn(), playTone: vi.fn() }, triggerHaptic: vi.fn(),
    reducedMotion: { matches: true } })) Reflect.set(sphere, key, value);
  const faith = gameState.faithPoints;
  const clicks = gameState.totalClicks;
  sphere.onSphereClicked();
  expect(gameState.faithPoints).toBeGreaterThan(faith);
  expect(gameState.totalClicks).toBe(clicks + 1);
});
