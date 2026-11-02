import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SphereSprite, sphereSpriteFrame } from './SphereSprite.js';
import { SphereController } from './SphereController.js';
import { GameStateManager } from '../../core/GameState.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('sphere sprite playback', () => {
  const images: Array<{ src: string; onload: (() => void) | null; onerror: (() => void) | null }> = [];
  let frame: (now: number) => void;
  let intersect: (visible: boolean) => void;
  let hidden: boolean;
  const media = { matches: false };
  const ctx = { clearRect: vi.fn(), drawImage: vi.fn() };

  beforeEach(() => {
    images.length = 0;
    hidden = false;
    media.matches = false;
    ctx.clearRect.mockClear();
    ctx.drawImage.mockClear();
    vi.stubGlobal('window', { matchMedia: () => media });
    vi.stubGlobal('document', { get visibilityState() { return hidden ? 'hidden' : 'visible'; } });
    vi.stubGlobal('Image', class {
      src = '';
      onload = null;
      onerror = null;
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

  it('crops each row correctly and wraps at the 5120ms loop boundary', () => {
    expect(sphereSpriteFrame(0)).toEqual({ index: 0, x: 0, y: 0 });
    expect(sphereSpriteFrame(560)).toEqual({ index: 7, x: 2688, y: 0 });
    expect(sphereSpriteFrame(640)).toEqual({ index: 8, x: 0, y: 384 });
    expect(sphereSpriteFrame(5119)).toEqual({ index: 63, x: 2688, y: 2688 });
    expect(sphereSpriteFrame(5120)).toEqual({ index: 0, x: 0, y: 0 });
  });

  it('loads one shared sheet and only paints changed frames while visible', () => {
    const sprite = create();
    expect(images[0].src).toContain('/assets/sprites/esfera/girar/spritesheet.png');
    images[0].onload?.();
    frame(0);
    frame(40);
    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
    frame(80);
    expect(ctx.drawImage).toHaveBeenLastCalledWith(images[0], 384, 0, 384, 384, 0, 0, 384, 384);
    intersect(false);
    frame(160);
    expect(ctx.drawImage).toHaveBeenCalledTimes(2);
    intersect(true);
    hidden = true;
    frame(240);
    expect(ctx.drawImage).toHaveBeenCalledTimes(2);
    hidden = false;
    media.matches = true;
    frame(320);
    expect(ctx.drawImage).toHaveBeenLastCalledWith(images[0], 0, 0, 384, 384, 0, 0, 384, 384);
    sprite.destroy();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
  });

  it('falls back to the first pose when the sheet fails to load', () => {
    const sprite = create();
    images[0].onerror?.();
    expect(images[0].src).toContain('/assets/sprites/esfera/girar/00.png');
    images[0].onload?.();
    expect(ctx.drawImage).toHaveBeenCalledWith(images[0], 0, 0, 384, 384);
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
