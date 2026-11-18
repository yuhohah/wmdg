import { afterEach, describe, expect, it, vi } from 'vitest';
import { BoardManager } from './BoardManager.js';

// The camera math needs no DOM: rendering hooks are stubbed and frames run to completion.
function board(fields: Record<string, unknown> = {}) {
  vi.stubGlobal('window', { requestAnimationFrame: (frame: (time: number) => void) => frame(performance.now() + 10_000) });
  return Object.assign(Object.create(BoardManager.prototype), {
    panX: 0, panY: 0, zoom: 1, currentFocusedCardId: 'card-altar-sphere', isCameraTransitioning: false,
    applyTransform: vi.fn(), updateZoomIndicator: vi.fn(), updateActiveQuickNav: vi.fn(),
    ...fields,
  }) as BoardManager;
}

describe('board camera', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('restores pan, zoom and the focused card', () => {
    const camera = board({ panX: -900, panY: 120, zoom: 1, currentFocusedCardId: 'card-gnose' });
    camera.restoreCamera({ panX: 40, panY: -60, zoom: 0.6, focusedCardId: 'card-relics' });
    expect(camera.getCamera()).toEqual({ panX: 40, panY: -60, zoom: 0.6, focusedCardId: 'card-relics' });
  });

  it('reports where an ongoing camera move is heading', () => {
    const camera = board({ panX: 10, panY: 10, zoom: 1, isCameraTransitioning: true, targetPanX: 300, targetPanY: -200, targetZoom: 0.8 });
    expect(camera.getCamera()).toEqual({ panX: 300, panY: -200, zoom: 0.8, focusedCardId: 'card-altar-sphere' });
  });
});
