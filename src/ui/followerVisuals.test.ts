import { afterEach, describe, expect, it, vi } from 'vitest';
import { PRAYER_DURATION, followerAnimationFrame, followerVisualCounts, visibleFollowerTiers } from './followerVisuals.js';
import { FollowersArena } from './followersArena.js';

afterEach(() => vi.restoreAllMocks());

describe('visual follower evolution', () => {
  it.each([
    [0, [0, 0, 0]], [20, [20, 0, 0]], [39, [39, 0, 0]],
    [40, [0, 2, 0]], [41, [1, 2, 0]], [59, [19, 2, 0]],
    [60, [0, 3, 0]], [399, [19, 19, 0]], [400, [0, 0, 1]],
    [419, [19, 0, 1]], [420, [0, 1, 1]], [799, [19, 19, 1]],
    [800, [0, 0, 2]],
  ])('represents %s faithful as %j', (total, expected) => {
    expect(followerVisualCounts(total as number)).toEqual(expected);
  });

  it('preserves the represented population before the display cap', () => {
    for (let total = 0; total < 8000; total++) {
      const counts = followerVisualCounts(total);
      expect(counts[0] + counts[1] * 20 + counts[2] * 400).toBe(total);
    }
  });

  it('bounds rendering while preserving lower-tier remainders', () => {
    const tiers = visibleFollowerTiers(1_000_399);
    expect(tiers).toHaveLength(60);
    expect(tiers.filter(t => t === 0)).toHaveLength(19);
    expect(tiers.filter(t => t === 1)).toHaveLength(19);
    expect(tiers.filter(t => t === 2)).toHaveLength(22);
  });

  it('reconciles purchases, bulk loads and population decreases without duplicates', () => {
    const arena: FollowersArena = Object.create(FollowersArena.prototype);
    arena.walkers = [];
    for (const [key, value] of Object.entries({ width: 560, height: 240, nextId: 1, totalFollowerCount: 0 })) {
      Reflect.set(arena, key, value);
    }
    arena.syncFollowerCount(39);
    expect(arena.walkers).toHaveLength(39);
    arena.onFollowersAdded(1);
    expect(arena.walkers.map(w => w.variant)).toEqual([1, 1]);
    const ids = arena.walkers.map(w => w.id);
    arena.syncFollowerCount(41);
    expect(arena.walkers.filter(w => w.variant === 1).map(w => w.id)).toEqual(ids);
    arena.syncFollowerCount(400);
    expect(arena.walkers.map(w => w.variant)).toEqual([2]);
    arena.syncFollowerCount(20);
    expect(arena.walkers).toHaveLength(20);
    expect(arena.walkers.every(w => w.variant === 0)).toBe(true);
    arena.syncFollowerCount(0);
    expect(arena.walkers).toHaveLength(0);
  });
});

describe('follower animation sequencing', () => {
  const createArena = () => {
    const arena: FollowersArena = Object.create(FollowersArena.prototype);
    arena.walkers = [];
    for (const [key, value] of Object.entries({ width: 560, height: 240, nextId: 1,
      totalFollowerCount: 0, speedMultiplier: 1, miracleSpawnCooldown: 999 })) {
      Reflect.set(arena, key, value);
    }
    arena.syncFollowerCount(1);
    return arena;
  };

  it('only walks or rests during normal movement and expired idle timers', () => {
    const arena = createArena();
    const w = arena.walkers[0];
    vi.spyOn(Math, 'random').mockReturnValue(0.6);
    w.state = 'idle';
    w.stateTimer = 0;
    Reflect.get(arena, 'update').call(arena, 1 / 30);
    expect(w.state).toBe('idle');
    w.state = 'walk';
    w.targetX = w.x;
    w.targetY = w.y;
    Reflect.get(arena, 'update').call(arena, 1 / 30);
    expect(w.state).toBe('idle');
  });

  it('kneels for a miracle plea and starts the light immediately when accepted', () => {
    const arena = createArena();
    const w = arena.walkers[0];
    const grant = vi.fn();
    arena.setOnMiracleClickCallback(grant);
    arena.triggerMiraclePlea(w);
    expect(w.state).toBe('pray');
    expect(w.isMiraclePlea).toBe(true);
    expect(followerAnimationFrame(w.state, 0, 10, true).action).toBe('rezar');
    Reflect.get(arena, 'acceptMiracle').call(arena, w, 100, 100);
    expect(w.isMiraclePlea).toBe(false);
    expect(w.prayCycle).toBe(PRAYER_DURATION);
    expect(followerAnimationFrame(w.state, 0, w.prayCycle)).toEqual({ action: 'iluminacao', frame: 0 });
    expect(grant).toHaveBeenCalledOnce();
    for (let i = 0; i < 45; i++) Reflect.get(arena, 'update').call(arena, 1 / 30);
    expect(w.state).not.toBe('pray');
  });

  it('plays the walk loop and uses the standing reference for idle', () => {
    expect(followerAnimationFrame('walk', 9, 0)).toEqual({ action: 'andar', frame: 1 });
    expect(followerAnimationFrame('idle', 0, 0)).toEqual({ action: 'rezar', frame: 0 });
  });

  it('finishes kneeling and praying before the blessing, then holds the final frame', () => {
    expect(followerAnimationFrame('pray', 0, 0)).toEqual({ action: 'rezar', frame: 0 });
    expect(followerAnimationFrame('pray', 0, 1.9)).toEqual({ action: 'rezar', frame: 12 });
    expect(followerAnimationFrame('pray', 0, 2)).toEqual({ action: 'iluminacao', frame: 0 });
    expect(followerAnimationFrame('pray', 0, 3.5)).toEqual({ action: 'iluminacao', frame: 8 });
  });

  it('holds the prayer while waiting for a miracle instead of blessing early', () => {
    expect(followerAnimationFrame('pray', 0, 10, true)).toEqual({ action: 'rezar', frame: 12 });
  });
});
