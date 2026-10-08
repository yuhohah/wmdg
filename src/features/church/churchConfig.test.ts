import { describe, expect, it } from 'vitest';
import { ALTAR_STAND, ALWAYS_VISIBLE_X, FOLLOWER_SPOTS } from './churchConfig.js';

/** Half the width of a follower's drawn body, so a spot at the edge is not cut off. */
const HALF_BODY = 7;

describe('church yard layout', () => {
  it('has 12 spots, one per follower the yard can show', () => {
    expect(FOLLOWER_SPOTS).toHaveLength(12);
  });

  it('keeps every spot and the altar stand inside the part of the stage a narrow phone shows', () => {
    for (const { x } of [...FOLLOWER_SPOTS, ALTAR_STAND]) {
      expect(x).toBeGreaterThanOrEqual(ALWAYS_VISIBLE_X.from + HALF_BODY);
      expect(x).toBeLessThanOrEqual(ALWAYS_VISIBLE_X.to - HALF_BODY);
    }
  });

  it('never puts two followers on the same spot', () => {
    const places = FOLLOWER_SPOTS.map(({ x, feet }) => `${x},${feet}`);
    expect(new Set(places).size).toBe(places.length);
  });
});
