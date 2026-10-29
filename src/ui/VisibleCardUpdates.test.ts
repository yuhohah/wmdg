import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VisibleCardUpdates } from './VisibleCardUpdates.js';
import { GameStateManager } from '../core/GameState.js';

describe('card presentation visibility', () => {
  const element = {};
  let intersect: (visible: boolean) => void;
  let visibilityState: string;

  beforeEach(() => {
    visibilityState = 'visible';
    vi.stubGlobal('document', {
      getElementById: () => element,
      get visibilityState() { return visibilityState; },
    });
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: (entries: object[]) => void) {
        intersect = visible => callback([{
          target: element, isIntersecting: visible,
          intersectionRect: { width: visible ? 100 : 0, height: visible ? 100 : 0 },
        }]);
      }
      observe() {}
      disconnect() {}
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('defers hidden renders and shows the latest state immediately on entry and reentry', () => {
    const views = new VisibleCardUpdates();
    let value = 1;
    const render = vi.fn();
    const update = vi.fn(() => value);
    views.register('card', render, update);
    views.invalidateAll();
    views.update();
    expect(render).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();

    value = 2;
    intersect(true);
    expect(render).toHaveBeenCalledTimes(1);
    expect(update).toHaveLastReturnedWith(2);
    views.update();
    expect(render).toHaveBeenCalledTimes(1);

    intersect(false);
    value = 3;
    views.invalidateAll();
    views.invalidateAll();
    expect(render).toHaveBeenCalledTimes(1);
    intersect(true);
    expect(render).toHaveBeenCalledTimes(2);
    expect(update).toHaveLastReturnedWith(3);
    views.destroy();
  });

  it('preserves production and countdowns while hidden and renders current resources on return', () => {
    const gs = new GameStateManager();
    gs.followers[0].count = 10;
    for (const unlock of gs.unlocks) unlock.unlocked = true;
    gs.incarnationBoostTimer = 10;
    gs.relicConvertCooldown = 3;
    gs.bossCurseTimerSec = 20;
    const initial = { faith: gs.faithPoints, fervor: gs.fervorPoints, relics: gs.relicPoints };
    const views = new VisibleCardUpdates();
    const render = vi.fn();
    const update = vi.fn(() => gs.faithPoints);
    views.register('card', render, update);

    for (let i = 0; i < 20; i++) {
      gs.tick(0.1);
      views.update();
    }
    expect(update).not.toHaveBeenCalled();
    expect(gs.faithPoints).toBeGreaterThan(initial.faith);
    expect(gs.fervorPoints).toBeGreaterThan(initial.fervor);
    expect(gs.relicPoints).toBeGreaterThan(initial.relics);
    expect(gs.incarnationBoostTimer).toBeCloseTo(8);
    expect(gs.relicConvertCooldown).toBeCloseTo(1);
    expect(gs.bossCurseTimerSec).toBeCloseTo(18);
    intersect(true);
    expect(update).toHaveLastReturnedWith(gs.faithPoints);
    views.destroy();
  });

  it('does not flush when the document is hidden and catches up on the next visible update', () => {
    const views = new VisibleCardUpdates();
    const render = vi.fn();
    const update = vi.fn();
    views.register('card', render, update);
    visibilityState = 'hidden';
    intersect(true);
    views.update();
    expect(render).not.toHaveBeenCalled();
    visibilityState = 'visible';
    views.update();
    expect(render).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledOnce();
    views.destroy();
  });
});
