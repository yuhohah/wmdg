import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SaveSystem } from './saveSystem.js';
import { GameStateManager } from '../core/GameState.js';

const primary = 'cult_of_the_sphere_save_v1';
const backup = 'cult_of_the_sphere_save_backup';
let storage: Map<string, string>;
beforeEach(() => {
  storage = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('save recovery and input validation', () => {
  it('rejects malformed collections and recovers the valid backup', () => {
    const good = new GameStateManager().buildSaveData();
    const bad = JSON.stringify({ ...good, followers: [null] });
    storage.set(primary, bad);
    storage.set(backup, JSON.stringify(good));
    expect(SaveSystem.deserialize(bad)).toBeNull();
    expect(SaveSystem.load()).toEqual(good);
  });

  it('does not overwrite a valid backup with an invalid primary', () => {
    const good = new GameStateManager().buildSaveData();
    storage.set(primary, '{"version":1}');
    storage.set(backup, JSON.stringify(good));
    expect(SaveSystem.save(good)).toBe(true);
    expect(storage.get(backup)).toBe(JSON.stringify(good));
  });

  it('rejects future versions and non-finite numbers before writing', () => {
    const game = new GameStateManager();
    const save = game.buildSaveData();
    expect(SaveSystem.deserialize(JSON.stringify({ ...save, version: 999 }))).toBeNull();
    const overflow = JSON.stringify({ ...save, stats: { ...save.stats, faithPoints: 1e300 } }).replace('1e+300', '1e309');
    expect(SaveSystem.deserialize(overflow)).toBeNull();
    save.stats.faithPoints = Infinity;
    expect(SaveSystem.save(save)).toBe(false);
    expect(storage.has(primary)).toBe(false);
    expect(() => game.applySaveData(save)).toThrow();
    expect(game.faithPoints).toBe(1);
  });

  it('accepts older saves without optional fields', () => {
    const save = new GameStateManager().buildSaveData();
    delete save.gnose;
    delete save.progressionRevision;
    delete save.stats.campaignEnding;
    delete save.stats.totalFervorGenerated;
    expect(SaveSystem.deserialize(JSON.stringify(save))).toEqual(save);
  });
});
