import { describe, expect, it } from 'vitest';
import { GameStateManager } from './GameState.js';

function afterAscension(withNode = true) {
  const game = new GameStateManager();
  game.unlocks.forEach(seal => { seal.unlocked = true; });
  if (withNode) game.unlockedGnoseUpgrades.add('gn_init_faith');
  game.bestRelicsToGet = 99999;
  game.faithPoints = 1e16;
  expect(game.performGnoseReset().success).toBe(true);
  expect(game.bestRelicsToGet).toBe(0);
  game.unlocks.forEach(seal => { seal.unlocked = true; });
  return game;
}

describe('passive fragments after post-Gnose transmutation', () => {
  it('establishes the new cycle record on the first transmutation and applies node resonance once', () => {
    const plain = afterAscension(false);
    const gnose = afterAscension();
    expect(plain.getRelicsRatePerSecond()).toBe(1);
    expect(gnose.getRelicsRatePerSecond()).toBe(4);
    for (const game of [plain, gnose]) {
      game.faithPoints = 1e16;
      expect(game.convertFaithToRelics()).toEqual({ gained: 53, success: true });
      expect(game.bestRelicsToGet).toBe(53);
    }
    expect(plain.getRelicsRatePerSecond()).toBe(5);
    expect(gnose.getRelicsRatePerSecond()).toBe(20);
  });

  it('does not stack passive production for equal or smaller transmutations', () => {
    const game = afterAscension();
    game.faithPoints = 1e16;
    game.convertFaithToRelics();
    for (const faith of [1e16, 1000, 1e16]) {
      game.tick(3);
      game.faithPoints = faith;
      expect(game.convertFaithToRelics().success).toBe(true);
      expect(game.bestRelicsToGet).toBe(53);
      expect(game.getRelicsRatePerSecond()).toBe(20);
    }
  });

  it('preserves the record in saves, then clears it on the next ascension', () => {
    const game = afterAscension();
    game.faithPoints = 1e16;
    game.convertFaithToRelics();
    const restored = new GameStateManager();
    restored.applySaveData(game.buildSaveData());
    expect(restored.bestRelicsToGet).toBe(53);
    expect(restored.getRelicsRatePerSecond()).toBe(20);
    restored.faithPoints = 1e16;
    expect(restored.performGnoseReset().success).toBe(true);
    expect(restored.bestRelicsToGet).toBe(0);
    expect(restored.getRelicsRatePerSecond()).toBe(0); // The relic seal must be opened again.
    restored.unlocks.forEach(seal => { seal.unlocked = true; });
    expect(restored.getRelicsRatePerSecond()).toBe(4);
  });

  it('updates Draupnir and Omniscience from current faith, without treating manual rewards as another automatic payment', () => {
    const game = afterAscension();
    game.unlockedGnoseUpgrades.add('gn_omniscience');
    game.relicUpgrades.find(relic => relic.id === 'relic_draupnir')!.level = 1;
    game.faithPoints = 1e16;
    const rate = game.getRelicsRatePerSecond();
    expect(rate).toBeCloseTo((1 + 53 * 1.05) * 16);
    game.convertFaithToRelics();
    expect(game.faithPoints).toBe(0);
    expect(game.getRelicsToGet()).toBe(0);
    expect(game.getRelicsRatePerSecond()).toBe(5 * 16);
    game.autoRelicsEnabled = false;
    expect(game.getRelicsRatePerSecond()).toBe(5 * 16);
  });
});
