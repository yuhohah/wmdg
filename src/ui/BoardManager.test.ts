import { afterEach, describe, expect, it, vi } from 'vitest';
import { BoardManager } from './BoardManager.js';

afterEach(() => vi.unstubAllGlobals());

describe('board camera during a fight', () => {
  function followingBoard() {
    const reads = { count: 0 };
    const viewport = {
      get clientWidth() { reads.count++; return 1280; },
      get clientHeight() { reads.count++; return 800; },
      get scrollLeft() { reads.count++; return 0; },
      get scrollTop() { reads.count++; return 0; },
    };
    const setProperty = vi.fn();
    const label = { writes: 0, current: '', get textContent() { return this.current; }, set textContent(v: string) { this.writes++; this.current = v; } };
    vi.stubGlobal('document', { querySelector: () => { reads.count++; return null; } });
    const board: BoardManager = Object.create(BoardManager.prototype);
    for (const [key, value] of Object.entries({
      viewportEl: viewport,
      zoomLevelEl: label,
      worldEl: {
        get offsetWidth() { reads.count++; return 6880; },
        get offsetHeight() { reads.count++; return 4240; },
        style: { setProperty },
      },
      panX: 0, panY: 0, zoom: 0.55, minZoom: 0.35, maxZoom: 1.6,
    })) Reflect.set(board, key, value);
    return { board, reads, setProperty, label };
  }
  const target = { x: 1740, y: 854, width: 1210, height: 1210 };

  it('measures the layout once on entry, not on every frame', () => {
    const { board, reads } = followingBoard();
    board.followWorldTarget(target, 0);
    expect(reads.count).toBeGreaterThan(0);
    reads.count = 0;
    for (let i = 0; i < 30; i++) board.followWorldTarget(target, 1 / 30);
    expect(reads.count).toBe(0);
  });

  it('measures again after the window is resized', () => {
    const { board, reads } = followingBoard();
    board.followWorldTarget(target, 0);
    Reflect.get(board, 'invalidateFollowMeasure').call(board);
    reads.count = 0;
    board.followWorldTarget(target, 1 / 30);
    expect(reads.count).toBeGreaterThan(0);
  });

  it('rewrites the prompt scale only when it visibly changes', () => {
    const { board, setProperty } = followingBoard();
    board.followWorldTarget(target, 0);
    setProperty.mockClear();
    for (let i = 0; i < 30; i++) board.followWorldTarget(target, 1 / 30);
    const scaleWrites = setProperty.mock.calls.filter(([name]) => name === '--boss-prompt-scale');
    expect(scaleWrites.length).toBe(0);
    expect(setProperty.mock.calls.filter(([name]) => name === 'transform').length).toBe(30);
  });

  it('rewrites the zoom label only when its text changes', () => {
    const { board, label } = followingBoard();
    board.followWorldTarget(target, 0);
    label.writes = 0;
    for (let i = 0; i < 30; i++) board.followWorldTarget(target, 1 / 30);
    expect(label.writes).toBe(0);
  });
});

describe('board camera limits', () => {
  it('reaches cards placed above the world origin, but no further', () => {
    const board: BoardManager = Object.create(BoardManager.prototype);
    for (const [key, value] of Object.entries({
      viewportEl: { clientWidth: 1280, clientHeight: 800 },
      worldEl: { offsetWidth: 6880, offsetHeight: 4240 },
      panX: 0, panY: 5000, zoom: 1,
    })) Reflect.set(board, key, value);
    Reflect.get(board, 'clampPan').call(board);
    // Viewport centre (400) shows world y = -800
    expect(Reflect.get(board, 'panY')).toBe(1200);
  });
});

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
