import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameStateManager } from '../core/GameState.js';
import { createGameplayShortcutActions, FERVOR_SHORTCUTS, RELIC_SHORTCUTS, GameplayShortcuts } from './GameplayShortcuts.js';

function fixture() {
  const gameState = new GameStateManager();
  const callbacks = {
    gameState,
    buyFollower: vi.fn(), buyMaxFollowers: vi.fn(), buyFervor: vi.fn(), buyRelic: vi.fn(),
    transmute: vi.fn(), collectMiracle: vi.fn(), boostIncarnation: vi.fn(), evolveIncarnation: vi.fn(),
  };
  return { gameState, callbacks, bindings: createGameplayShortcutActions(callbacks) };
}

afterEach(() => vi.unstubAllGlobals());

describe('gameplay shortcut bindings', () => {
  it('keeps purchases and incarnation actions locked until their normal unlocks', () => {
    const { callbacks, bindings } = fixture();
    for (const key of 'xqwertyasdfghiu') bindings[key]();
    expect(callbacks.buyMaxFollowers).not.toHaveBeenCalled();
    expect(callbacks.buyFervor).not.toHaveBeenCalled();
    expect(callbacks.buyRelic).not.toHaveBeenCalled();
    expect(callbacks.boostIncarnation).not.toHaveBeenCalled();
    expect(callbacks.evolveIncarnation).not.toHaveBeenCalled();
    bindings.z(); bindings.m();
    expect(callbacks.buyFollower).toHaveBeenCalledOnce();
    expect(callbacks.collectMiracle).toHaveBeenCalledOnce();
  });

  it('maps the actual upgrade lists in order and leaves J unassigned', () => {
    const { gameState, callbacks, bindings } = fixture();
    gameState.unlocks.forEach(seal => { seal.unlocked = true; });
    gameState.unlockedGnoseUpgrades.add('gn_memoria_selos');
    FERVOR_SHORTCUTS.forEach((key, index) => { bindings[key](); expect(callbacks.buyFervor).toHaveBeenLastCalledWith(index); });
    RELIC_SHORTCUTS.forEach((key, index) => { bindings[key](); expect(callbacks.buyRelic).toHaveBeenLastCalledWith(index); });
    bindings.x(); bindings.i(); bindings.u();
    expect(callbacks.buyMaxFollowers).toHaveBeenCalledOnce();
    expect(callbacks.boostIncarnation).toHaveBeenCalledOnce();
    expect(callbacks.evolveIncarnation).toHaveBeenCalledOnce();
    expect(bindings.j).toBeUndefined();
  });

  it('blocks hidden purchases during combat while keeping miracle collection available', () => {
    const { gameState, callbacks, bindings } = fixture();
    gameState.unlocks.forEach(seal => { seal.unlocked = true; });
    ['gn_init_faith', 'gn_memoria_selos', 'gn_automation'].forEach(id => gameState.unlockedGnoseUpgrades.add(id));
    expect(gameState.startBossBattle('boss_anubis')).toBe(true);
    for (const key of 'zxqwertyasdfghium') bindings[key]();
    expect(callbacks.buyFollower).not.toHaveBeenCalled();
    expect(callbacks.buyFervor).not.toHaveBeenCalled();
    expect(callbacks.buyRelic).not.toHaveBeenCalled();
    expect(callbacks.boostIncarnation).not.toHaveBeenCalled();
    expect(callbacks.collectMiracle).toHaveBeenCalledOnce();
  });

  it('transmutes with Caps Lock only when relics are unlocked and outside combat', () => {
    const { gameState, callbacks, bindings } = fixture();
    bindings.capslock();
    expect(callbacks.transmute).not.toHaveBeenCalled();
    gameState.unlocks.forEach(seal => { seal.unlocked = true; });
    callbacks.transmute.mockImplementation(() => { gameState.convertFaithToRelics(); });
    gameState.faithPoints = 1e16;
    bindings.capslock();
    expect(gameState.faithPoints).toBe(0);
    expect(gameState.relicPoints).toBe(53);
    gameState.faithPoints = 1e16;
    bindings.capslock(); // The normal transmutation cooldown still applies.
    expect(gameState.faithPoints).toBe(1e16);
    expect(gameState.relicPoints).toBe(53);
    ['gn_init_faith', 'gn_memoria_selos', 'gn_automation'].forEach(id => gameState.unlockedGnoseUpgrades.add(id));
    expect(gameState.startBossBattle('boss_anubis')).toBe(true);
    callbacks.transmute.mockClear();
    bindings.capslock();
    expect(callbacks.transmute).not.toHaveBeenCalled();
  });

  it('handles the physical Caps Lock press once without depending on its toggle state', () => {
    const action = vi.fn();
    const doc = Object.assign(new EventTarget(), {
      querySelector: (selector: string) => selector === '#gameplay-screen.active' ? {} : null,
    });
    vi.stubGlobal('document', doc);
    const shortcuts = new GameplayShortcuts({ capslock: action });
    const press = (repeat: boolean) => doc.dispatchEvent(Object.assign(new Event('keydown', { cancelable: true }), {
      key: 'CapsLock', code: 'CapsLock', repeat,
    }));
    press(false); press(true); press(false);
    expect(action).toHaveBeenCalledTimes(2);
    shortcuts.destroy();
  });

  it('handles letters once per press and preserves typing, modifiers, menus and teardown', () => {
    const action = vi.fn();
    const doc = Object.assign(new EventTarget(), {
      querySelector: vi.fn((selector: string) => selector === '#gameplay-screen.active' ? {} : null),
    });
    vi.stubGlobal('document', doc);
    const shortcuts = new GameplayShortcuts({ q: action });
    const press = (properties: object = {}, editable = false, buttonFocus = false) => {
      const event = Object.assign(new Event('keydown', { cancelable: true }), { key: 'q', repeat: false }, properties);
      Object.defineProperty(event, 'target', { value: { closest: (selector: string) => (selector.startsWith('input') ? editable : buttonFocus) ? {} : null } });
      doc.dispatchEvent(event);
      return event;
    };
    expect(press().defaultPrevented).toBe(true);
    expect(press({ key: 'Q' }).defaultPrevented).toBe(true);
    expect(press({}, false, true).defaultPrevented).toBe(true);
    expect(action).toHaveBeenCalledTimes(3);
    press({ repeat: true }); press({ ctrlKey: true }); press({ metaKey: true }); press({}, true);
    expect(action).toHaveBeenCalledTimes(3);
    doc.querySelector.mockImplementation(() => ({}));
    press();
    expect(action).toHaveBeenCalledTimes(3);
    doc.querySelector.mockImplementation(selector => selector === '#gameplay-screen.active' ? {} : null);
    shortcuts.destroy();
    press();
    expect(action).toHaveBeenCalledTimes(3);
  });
});
