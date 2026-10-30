import { afterEach, describe, expect, it, vi } from 'vitest';
import { VisualFrameClock, effectEasing } from './visualTiming.js';
import { FollowersArena, type Walker } from './followersArena.js';
import { IncarnationAltar } from './incarnationAltar.js';

afterEach(() => vi.restoreAllMocks());

describe('30 FPS visual clock', () => {
  it.each([30, 60, 90, 120, 144, 240])('limits a %s Hz display without losing elapsed time', refreshRate => {
    const clock = new VisualFrameClock();
    const elapsed: number[] = [];
    for (let frame = 0; frame <= refreshRate; frame++) {
      const delta = clock.tick(frame * 1000 / refreshRate);
      if (delta !== null) elapsed.push(delta);
    }
    // Initial paint plus thirty animation frames over one second.
    expect(elapsed).toHaveLength(31);
    expect(elapsed.reduce((sum, delta) => sum + delta, 0)).toBeCloseTo(1, 10);
  });

  it('skips a stalled backlog and retains the real elapsed duration', () => {
    const clock = new VisualFrameClock();
    expect(clock.tick(0)).toBe(0);
    expect(clock.tick(16)).toBeNull();
    expect(clock.tick(10000)).toBe(10);
    expect(clock.tick(10001)).toBeNull();
    expect(clock.tick(10034)).toBeCloseTo(0.034);
  });

  it('keeps compositor effects at or below thirty samples per second', () => {
    for (const duration of [180, 340, 650, 700, 900]) {
      const steps = Number(effectEasing(duration).match(/\d+/)![0]);
      expect(steps * 1000 / duration).toBeLessThanOrEqual(30);
    }
  });
});

function arena(miracle = false): FollowersArena {
  // Exercise animation state without browser canvas setup or a scheduled render loop.
  const result: FollowersArena = Object.create(FollowersArena.prototype);
  const walker: Walker = {
    id: 1, x: 50, y: 100, vx: 0, vy: 0, targetX: 350, targetY: 100,
    facing: 1, variant: 0, state: 'walk', stateTimer: 1000, walkCycle: 0,
    prayCycle: 0, idleCycle: 0, breathTimer: 0, prayParticles: [],
    isMiraclePlea: miracle, miracleTimer: miracle ? 15 : 0,
  };
  result.walkers = [walker];
  for (const [key, value] of Object.entries({ width: 400, height: 220, speedMultiplier: 1, miracleSpawnCooldown: 999 })) {
    Reflect.set(result, key, value);
  }
  return result;
}

function advance(target: object, refreshRate: number, seconds: number) {
  for (let frame = 0; frame < refreshRate * seconds; frame++) {
    Reflect.get(target, 'update').call(target, 1 / refreshRate);
  }
}

describe('animation duration is independent of visual FPS', () => {
  it('preserves walking speed and state duration when reducing from 60 to 30 FPS', () => {
    const at60 = arena(), at30 = arena();
    advance(at60, 60, 1);
    advance(at30, 30, 1);
    expect(at30.walkers[0].x).toBeCloseTo(80);
    expect(at30.walkers[0].x).toBeCloseTo(at60.walkers[0].x);
    expect(at30.walkers[0].walkCycle).toBeCloseTo(at60.walkers[0].walkCycle);
    expect(at30.walkers[0].stateTimer).toBeCloseTo(at60.walkers[0].stateTimer);
  });

  it('preserves miracle lifetimes and the game speed multiplier', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1);
    const at60 = arena(true), at30 = arena(true);
    advance(at60, 60, 1);
    advance(at30, 30, 1);
    expect(at30.walkers[0].miracleTimer).toBeCloseTo(14);
    expect(at30.walkers[0].miracleTimer).toBeCloseTo(at60.walkers[0].miracleTimer!);
    at30.setSpeedMultiplier(2);
    advance(at30, 30, 1);
    expect(at30.walkers[0].miracleTimer).toBeCloseTo(12);
  });

  it('preserves avatar rotation, particle travel and particle lifetime', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1);
    const create = (): IncarnationAltar => {
      const result: IncarnationAltar = Object.create(IncarnationAltar.prototype);
      for (const [key, value] of Object.entries({ rotationAngle: 0, pulsePhase: 0, flashAlpha: 0,
        particles: [{ x: 0, y: 0, vx: 3, vy: -1, life: 100, maxLife: 100, alpha: 1 }] })) {
        Reflect.set(result, key, value);
      }
      return result;
    };
    const at60 = create(), at30 = create();
    advance(at60, 60, 1);
    advance(at30, 30, 1);
    expect(Reflect.get(at30, 'rotationAngle')).toBeCloseTo(0.36);
    expect(Reflect.get(at30, 'rotationAngle')).toBeCloseTo(Reflect.get(at60, 'rotationAngle'));
    expect(Reflect.get(at30, 'particles')).toEqual(Reflect.get(at60, 'particles'));
    expect(Reflect.get(at30, 'particles')[0].life).toBe(40);
  });
});
