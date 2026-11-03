import { afterEach, describe, expect, it, vi } from 'vitest';
import { BoardManager } from './BoardManager.js';

afterEach(() => vi.unstubAllGlobals());

describe('board camera after native focus scrolling', () => {
  it('frames a world actor on entry and follows its movement smoothly without native scrolling', () => {
    vi.stubGlobal('document', { querySelector: () => null });
    const viewport = { clientWidth: 1280, clientHeight: 800, scrollLeft: 1126, scrollTop: 100 };
    const board: BoardManager = Object.create(BoardManager.prototype);
    for (const [key, value] of Object.entries({
      viewportEl: viewport,
      worldEl: { offsetWidth: 6880, offsetHeight: 4200, style: { setProperty: vi.fn() } },
      panX: -1100, panY: -200, zoom: 1, minZoom: 0.35, maxZoom: 1.6,
    })) Reflect.set(board, key, value);
    const target = { x: 500, y: 600, width: 680, height: 560 };
    board.followWorldTarget(target, 0);
    const projectX = (x: number) => Reflect.get(board, 'panX') + x * Reflect.get(board, 'zoom');
    expect(projectX(500)).toBeCloseTo(640);
    expect(viewport.scrollLeft).toBe(0);
    expect(viewport.scrollTop).toBe(0);
    const errorBefore = Math.abs(projectX(800) - 640);
    board.followWorldTarget({ ...target, x: 800 }, 1 / 30);
    const errorAfter = Math.abs(projectX(800) - 640);
    expect(errorAfter).toBeGreaterThan(0);
    expect(errorAfter).toBeLessThan(errorBefore);
  });

  it('recovers the hidden viewport offset without changing the intended camera position', () => {
    const viewport = {
      scrollLeft: 1126,
      scrollTop: 400,
      clientWidth: 1280,
      clientHeight: 800,
      getBoundingClientRect: () => ({ width: 1280, height: 800 }),
    };
    const setProperty = vi.fn();
    const board: BoardManager = Object.create(BoardManager.prototype);
    for (const [key, value] of Object.entries({
      viewportEl: viewport,
      worldEl: { offsetWidth: 6880, offsetHeight: 4200, style: { setProperty } },
      panX: -1100, panY: -200, zoom: 1, minZoom: 0.35, maxZoom: 1.6,
    })) Reflect.set(board, key, value);

    board.zoomAtCenter(1);

    expect(viewport.scrollLeft).toBe(0);
    expect(viewport.scrollTop).toBe(0);
    expect(setProperty).toHaveBeenCalledWith(
      'transform', 'translate3d(-1100px, -200px, 0) scale(1)', 'important',
    );
  });
});
