import { describe, expect, it } from 'vitest';
import { GameStateManager } from '../../core/GameState.js';
import { SaveSystem } from '../../systems/saveSystem.js';
import { formatPlayTime } from './StatsTab.js';

describe('total campaign time', () => {
  it('starts on the first play and keeps counting across saves, including time away', () => {
    const game = new GameStateManager();
    expect(game.getTotalPlayTimeSeconds(1000)).toBe(0);
    game.startGameClock(1000);
    game.startGameClock(2000);
    const restored = new GameStateManager();
    restored.applySaveData(game.buildSaveData());
    expect(restored.getTotalPlayTimeSeconds(3662000)).toBe(3661);
    expect(formatPlayTime(restored.getTotalPlayTimeSeconds(3662000))).toBe('01h 01m 01s');
  });

  it('keeps the first start through ascension and resets it only for a new game', () => {
    const game = new GameStateManager();
    game.startGameClock(1000);
    game.unlocks.find(u => u.id === 'unlock_gnose')!.unlocked = true;
    game.faithPoints = 1e18;
    expect(game.performGnoseReset().success).toBe(true);
    expect(game.gameStartedAtMs).toBe(1000);
    game.resetToDefaults();
    expect(game.getTotalPlayTimeSeconds(3662000)).toBe(0);
  });

  it('accepts legacy saves and rejects an invalid start time', () => {
    const source = new GameStateManager().buildSaveData();
    delete source.stats.gameStartedAtMs;
    const game = new GameStateManager();
    game.applySaveData(source);
    expect(game.getTotalPlayTimeSeconds(3662000)).toBe(0);
    game.startGameClock(2000);
    expect(game.getTotalPlayTimeSeconds(3000)).toBe(1);
    source.stats.gameStartedAtMs = Infinity;
    expect(() => SaveSystem.serialize(source)).toThrow();
  });

  it('uses hours beyond a day without scientific notation, and handles clock rollback', () => {
    expect(formatPlayTime(360001)).toBe('100h 00m 01s');
    expect(formatPlayTime(59.9)).toBe('00h 00m 59s');
    const game = new GameStateManager();
    game.startGameClock(2000);
    expect(game.getTotalPlayTimeSeconds(1000)).toBe(0);
  });
});
