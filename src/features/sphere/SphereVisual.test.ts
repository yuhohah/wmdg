import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SphereVisual, sphereFormForProgress } from './SphereVisual.js';
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
  let intersect: (visible: boolean) => void;
  const cleanup: Array<() => void> = [];

  beforeEach(() => {
    images = [];
    media = Object.assign(new EventTarget(), { matches: false });
    host = new Element();
    button = Object.assign(new Element(), { querySelector: () => host });
    doc = Object.assign(new EventTarget(), {
      visibilityState: 'visible',
      createElement: (tag: string) => {
        if (tag !== 'img') return new Element();
        const image = new ArtImage();
        images.push(image);
        return image;
      },
      getElementById: (id: string) => id === 'divine-sphere-btn' ? button : null,
    });
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
    // Only these DOM operations are needed by the native-image player.
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

  it('plays the selected assets without restarting a form when unrelated state changes', () => {
    const view = visual();
    const image = images[0];
    expect(image.src).toMatch(/nucleo\.png$/);
    expect(image.classList.contains('sphere-art-spinning')).toBe(true);
    view.setProgress(true, 1);
    expect(image.src).toMatch(/meridiano\.svg$/);
    expect(image.classList.contains('sphere-art-spinning')).toBe(false);
    view.setProgress(true, 2);
    expect(image.src).toMatch(/equador\.svg$/);
    view.setProgress(true, 3);
    expect(image.src).toMatch(/orbitas-v2\.apng$/);
    view.setProgress(true, 4);
    expect(image.src).toMatch(/plenitude\.apng$/);
    const writes = image.writes.length;
    view.setProgress(true, 4);
    view.setProgress(true, 5);
    expect(image.writes).toHaveLength(writes);
    view.setProgress(false, 1);
    expect(image.src).toMatch(/nucleo\.png$/);
    expect(image.classList.contains('sphere-art-spinning')).toBe(true);
  });

  it('uses matching stills for reduced motion, hidden pages and an off-screen altar', () => {
    const view = visual();
    view.setProgress(true, 3);
    const image = images[0];
    media.matches = true;
    media.dispatchEvent(new Event('change'));
    expect(image.src).toMatch(/orbitas-v2\.png$/);
    media.matches = false;
    media.dispatchEvent(new Event('change'));
    expect(image.src).toMatch(/orbitas-v2\.apng$/);
    intersect(false);
    expect(image.src).toMatch(/orbitas-v2\.png$/);
    intersect(true);
    doc.visibilityState = 'hidden';
    doc.dispatchEvent(new Event('visibilitychange'));
    view.setProgress(true, 4);
    expect(image.src).toMatch(/plenitude\.png$/);
    doc.visibilityState = 'visible';
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(image.src).toMatch(/plenitude\.apng$/);
    view.setProgress(false, 1);
    media.matches = true;
    media.dispatchEvent(new Event('change'));
    expect(image.classList.contains('sphere-art-spinning')).toBe(false);
  });

  it('falls back to the matching still if animation loading fails, without repeated retries', () => {
    const view = visual();
    view.setProgress(true, 2);
    const image = images[0];
    image.onerror?.();
    expect(image.src).toMatch(/equador\.png$/);
    const writes = image.writes.length;
    image.onerror?.();
    intersect(false);
    intersect(true);
    expect(image.writes).toHaveLength(writes);
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
    const clicks = gameState.totalClicks;
    const faith = gameState.faithPoints;
    button.dispatchEvent(new Event('click'));
    expect(gameState.totalClicks).toBe(clicks + 1);
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
    sphere.destroy();
    const writes = image.writes.length;
    gameState.incarnationStage = 1;
    events.emit(GameEvents.STATE_CHANGED);
    events.emit(GameEvents.GAME_TICK, 0.1);
    expect(image.writes).toHaveLength(writes);
  });
});
