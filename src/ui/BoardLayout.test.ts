import { describe, expect, it } from 'vitest';
import { BoardLayout } from './BoardLayout.js';

function layout() {
  const board = Object.create(BoardLayout.prototype);
  board.worldEl = { offsetWidth: 6880, offsetHeight: 0 };
  return board;
}

const sphere = { x: 1510, y: 624, w: 460, h: 460 };
const longCard = { w: 400, h: 1200 };

describe('board limits', () => {
  it('lets a long card sit above the Sphere without being pushed away', () => {
    expect(layout().findFreeSpot({ x: 1540, y: -600 }, longCard, [sphere])).toEqual({ x: 1540, y: -600 });
  });

  it('stops cards at the top limit', () => {
    expect(layout().clamp({ x: 100, y: -5000 }, longCard).y).toBe(-800);
  });

  it('stops cards at the bottom limit', () => {
    expect(layout().clamp({ x: 100, y: 9000 }, longCard).y).toBe(4240 - 1200);
  });
});
