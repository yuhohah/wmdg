import { afterEach, describe, expect, it, vi } from 'vitest';
import { events, GameEvents } from '../core/EventBus.js';
import { BoardLayout } from './BoardLayout.js';

// finishDrag needs only the drop bookkeeping; geometry and DOM moves are stubbed.
function droppingLayout() {
  vi.stubGlobal('window', { setTimeout: vi.fn() });
  const classList = { add: vi.fn(), remove: vi.fn() };
  const board = Object.assign(Object.create(BoardLayout.prototype), {
    worldEl: { classList }, ghostEl: { classList }, slotEls: [], saved: {},
    freePosition: () => ({ x: 0, y: 0 }), place: vi.fn(), setOffset: vi.fn(), persist: vi.fn(), resolveOverlaps: vi.fn(),
    drag: { card: { id: 'card-fervor', classList, offsetWidth: 0 }, moved: true, origin: { x: 0, y: 0 }, target: { x: 40, y: 0 }, snappedSlot: -1 },
  });
  return board as { finishDrag(cancelled: boolean): void };
}

describe('arranging the board', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('announces a completed drop', () => {
    const arranged = vi.fn();
    const off = events.on(GameEvents.CARD_ARRANGED, arranged);
    droppingLayout().finishDrag(false);
    off();
    expect(arranged).toHaveBeenCalledTimes(1);
  });

  it('stays quiet when the drag is cancelled', () => {
    const arranged = vi.fn();
    const off = events.on(GameEvents.CARD_ARRANGED, arranged);
    droppingLayout().finishDrag(true);
    off();
    expect(arranged).not.toHaveBeenCalled();
  });
});
