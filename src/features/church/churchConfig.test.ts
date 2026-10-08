import { describe, expect, it } from 'vitest';
import { ALTAR_STANDS, FOLLOWER_SPOTS, STAGE_SIZE } from './churchConfig.js';

/** Only this slice of the stage is on screen on every viewport, narrow phones included. */
const VISIBLE_FROM = STAGE_SIZE.width * 0.22;
const VISIBLE_TO = STAGE_SIZE.width * 0.78;
/** Half the width of a follower's drawn body, so a spot at the edge is not cut off. */
const HALF_BODY = 7;

describe('church yard layout', () => {
  it('has 12 spots, one per follower the yard can show', () => {
    expect(FOLLOWER_SPOTS).toHaveLength(12);
  });

  it('keeps every spot and altar stand inside the always-visible part of the stage', () => {
    for (const { x } of [...FOLLOWER_SPOTS, ALTAR_STANDS.left, ALTAR_STANDS.right]) {
      expect(x).toBeGreaterThanOrEqual(VISIBLE_FROM + HALF_BODY);
      expect(x).toBeLessThanOrEqual(VISIBLE_TO - HALF_BODY);
    }
  });

  it('never puts two followers on the same spot', () => {
    const places = FOLLOWER_SPOTS.map(({ x, feet }) => `${x},${feet}`);
    expect(new Set(places).size).toBe(places.length);
  });
});
