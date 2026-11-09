import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SphereVisual, sphereFormForProgress } from './SphereVisual.js';
import { SphereMotion } from './SphereMotion.js';
import { SphereController } from './SphereController.js';
import { GameStateManager } from '../../core/GameState.js';
import { events, GameEvents } from '../../core/EventBus.js';

class Element extends EventTarget {
  dataset: Record<string, string> = {};
  className = '';
  innerHTML = '';
  classes = new Set<string>();
  classList = {
    toggle: (name: string, enabled: boolean) => enabled ? this.classes.add(name) : this.classes.delete(name),
    contains: (name: string) => this.classes.has(name),
  };
  appendChild = vi.fn();
  remove = vi.fn();
  animate = vi.fn();
}

class ArtImage extends Element {
  alt = '';
  decoding = '';
  draggable = true;
  onerror: (() => void) | null = null;
  onload: (() => void) | null = null;
  writes: string[] = [];
  set src(value: string) { this.writes.push(value); }
  get src() { return this.writes.at(-1) ?? ''; }
}

describe('Esfera progression visuals', () => {
  let images: ArtImage[];
  let media: EventTarget & { matches: boolean };
  let doc: EventTarget & { visibilityState: string };
  let host: Element;
  let button: Element;
  let clearCanvas: ReturnType<typeof vi.fn>;
  let intersect: (visible: boolean) => void;
  const cleanup: Array<() => void> = [];

  beforeEach(() => {
    images = [];
    clearCanvas = vi.fn();
    media = Object.assign(new EventTarget(), { matches: false });
    host = new Element();
    button = Object.assign(new Element(), { querySelector: () => host });
    doc = Object.assign(new EventTarget(), {
      visibilityState: 'visible',
      createElement: (tag: string) => {
        if (tag === 'canvas') return Object.assign(new Element(), { getContext: () => new Proxy({}, { get: (_, key) => key === 'clearRect' ? clearCanvas : vi.fn(), set: () => true }) });
        if (tag !== 'img') return new Element();
        const image = new ArtImage();
        images.push(image);
        return image;
      },
      getElementById: (id: string) => id === 'divine-sphere-btn' ? button : null,
    });
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('window', { matchMedia: () => media, innerWidth: 1280, innerHeight: 800 });
    vi.stubGlobal('document', doc);
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: (entries: object[]) => void) {
        intersect = visible => callback([{ isIntersecting: visible }]);
      }
      observe() {}
      disconnect() {}
    });
  });

  afterEach(() => {
    cleanup.splice(0).forEach(destroy => destroy());
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const visual = () => {
    // Keep lifecycle tests independent of a browser engine.
    const element: HTMLElement = Object.assign(Object.create(null), host);
    const view = new SphereVisual(element);
    cleanup.push(() => view.destroy());
    return view;
  };

  it('uses the seal before stage numbers, and keeps the final form for Eclipse and Solar', () => {
    expect(sphereFormForProgress(false, 5).id).toBe('nucleo');
    expect([1, 2, 3, 4, 5].map(stage => sphereFormForProgress(true, stage).id))
      .toEqual(['meridiano', 'equador', 'orbitas', 'plenitude', 'plenitude']);
    expect([NaN, 0, -1].map(stage => sphereFormForProgress(true, stage).id))
      .toEqual(['meridiano', 'meridiano', 'meridiano']);
    expect(sphereFormForProgress(true, 99).id).toBe('plenitude');
  });

  it('loads approved cores and does not reload them on clicks or unrelated state changes', () => {
    const view = visual();
    expect(images.at(-1)?.src).toMatch(/nucleo\.png$/);
    view.setProgress(true, 1);
    expect(images.at(-1)?.src).toMatch(/engraved-globe\.png$/);
    const count = images.length;
    view.setProgress(true, 2);
    view.reactToClick();
    expect(images).toHaveLength(count);
    view.setProgress(true, 3);
    expect(images.at(-1)?.src).toMatch(/meridian-globe\.png$/);
    view.setProgress(true, 4);
    expect(images.at(-1)?.src).toMatch(/hollow-globe\.png$/);
    view.setProgress(true, 5);
    expect(host.dataset.sphereForm).toBe('plenitude');
  });

  it('suspends frames for reduced motion, hidden pages and an off-screen altar', () => {
    visual();
    const raf = vi.mocked(requestAnimationFrame);
    raf.mockClear();
    media.matches = true;
    media.dispatchEvent(new Event('change'));
    expect(cancelAnimationFrame).toHaveBeenCalled();
    expect(raf).not.toHaveBeenCalled();
    media.matches = false;
    media.dispatchEvent(new Event('change'));
    expect(raf).toHaveBeenCalledTimes(1);
    raf.mockClear();
    intersect(false);
    expect(raf).not.toHaveBeenCalled();
    intersect(true);
    expect(raf).toHaveBeenCalledTimes(1);
    raf.mockClear();
    doc.visibilityState = 'hidden';
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(raf).not.toHaveBeenCalled();
  });

  it.each([60, 120])('renders at 30 FPS on a %i Hz display without slowing rotation', hz => {
    const advance = vi.spyOn(SphereMotion.prototype, 'advance');
    visual();
    clearCanvas.mockClear();
    const raf = vi.mocked(requestAnimationFrame);
    for (let i = 0; i <= hz; i++) raf.mock.lastCall![0](i * 1000 / hz);
    expect(clearCanvas).toHaveBeenCalledTimes(31);
    expect(advance.mock.calls.reduce((seconds, [dt]) => seconds + dt, 0)).toBeCloseTo(1);
  });

  it('resets the frame clock on resume so hidden time does not move the sphere', () => {
    const advance = vi.spyOn(SphereMotion.prototype, 'advance');
    visual();
    const raf = vi.mocked(requestAnimationFrame);
    raf.mock.lastCall![0](0);
    raf.mock.lastCall![0](1000 / 30);
    intersect(false);
    intersect(true);
    advance.mockClear();
    raf.mock.lastCall![0](10000);
    expect(advance).toHaveBeenLastCalledWith(0);
    raf.mock.lastCall![0](10000 + 1000 / 30);
    expect(advance.mock.lastCall![0]).toBeCloseTo(1 / 30);
  });

  it('falls back to the initial core after a load error without retrying failed sources', () => {
    const view = visual();
    view.setProgress(true, 3);
    images.at(-1)?.onerror?.();
    expect(images.at(-1)?.src).toMatch(/nucleo\.png$/);
    images.at(-1)?.onerror?.();
    const count = images.length;
    intersect(false);
    intersect(true);
    expect(images).toHaveLength(count);
  });

  it('follows real seal purchases, evolutions, save restoration and Ascensão without changing rewards', () => {
    const gameState = new GameStateManager();
    const audio = { init: vi.fn(), playTone: vi.fn() };
    const options = Object.assign(Object.create(null), { gameState, audio, triggerHaptic: vi.fn() });
    const sphere = new SphereController(options);
    cleanup.push(() => sphere.destroy());
    vi.spyOn(sphere, 'spawnFloatingText').mockImplementation(() => {});
    const image = images[0];
    expect(host.dataset.sphereForm).toBe('nucleo');
    const react = vi.spyOn(SphereVisual.prototype, 'reactToClick');
    const clicks = gameState.totalClicks;
    const faith = gameState.faithPoints;
    button.dispatchEvent(new Event('click'));
    expect(gameState.totalClicks).toBe(clicks + 1);
    expect(react).toHaveBeenCalledTimes(1);
    expect(gameState.faithPoints).toBeGreaterThan(faith);
    expect(image.writes).toHaveLength(1);
    gameState.faithPoints = 1e40;
    expect(gameState.buyUnlock(gameState.unlocks.find(u => u.id === 'unlock_incarnation')!)).toBe(true);
    events.emit(GameEvents.STATE_CHANGED);
    expect(host.dataset.sphereForm).toBe('meridiano');
    for (const form of ['equador', 'orbitas', 'plenitude']) {
      expect(gameState.upgradeIncarnation()).toBe(true);
      events.emit(GameEvents.STATE_CHANGED);
      expect(host.dataset.sphereForm).toBe(form);
    }
    const save = gameState.buildSaveData();
    gameState.unlocks.forEach(unlock => { unlock.unlocked = true; });
    gameState.performGnoseReset();
    events.emit(GameEvents.STATE_CHANGED);
    expect(host.dataset.sphereForm).toBe('nucleo');
    gameState.applySaveData(save);
    sphere.syncProgress();
    expect(host.dataset.sphereForm).toBe('plenitude');
    gameState.unlocks.forEach(unlock => { unlock.unlocked = true; });
    gameState.performGnoseReset();
    events.emit(GameEvents.GAME_TICK, 0.1);
    expect(host.dataset.sphereForm).toBe('nucleo');
    gameState.unlockedGnoseUpgrades.add('gn_seal_automation');
    gameState.faithPoints = 200;
    gameState.runGnoseAutomation();
    events.emit(GameEvents.GAME_TICK, 0.1);
    expect(host.dataset.sphereForm).toBe('meridiano');
    expect(react).toHaveBeenCalledTimes(1);
    sphere.destroy();
    const writes = image.writes.length;
    gameState.incarnationStage = 1;
    events.emit(GameEvents.STATE_CHANGED);
    events.emit(GameEvents.GAME_TICK, 0.1);
    expect(image.writes).toHaveLength(writes);
  });
});
