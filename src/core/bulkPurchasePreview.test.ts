import { describe, expect, it } from 'vitest';
import { GameStateManager } from './GameState.js';

describe('maximum purchase quantities', () => {
  it.each([0, 49, 50, 140, 1e10, 1e100])('previews the exact Fervor purchase with a balance of %s', balance => {
    const game = new GameStateManager();
    game.unlockedGnoseUpgrades.add('gn_memoria_selos');
    game.unlockedGnoseUpgrades.add('gn_init_fervor');
    game.fervorPoints = balance;
    const ritual = game.fervorUpgrades[0];
    const before = game.buildSaveData();
    const count = game.getMaxFervorUpgradeCount(ritual);
    expect(game.buildSaveData()).toEqual({ ...before, timestamp: expect.any(Number) });
    const level = ritual.level;
    expect(game.buyMaxFervorUpgrade(ritual)).toBe(count);
    expect(ritual.level - level).toBe(count);
    expect(count).toBeLessThanOrEqual(100);
  });

  it('reports zero while bulk purchases or the Phoenix ritual are locked', () => {
    const game = new GameStateManager();
    game.fervorPoints = 1e20;
    game.relicPoints = 1e20;
    expect(game.getMaxFervorUpgradeCount(game.fervorUpgrades[0])).toBe(0);
    expect(game.getMaxRelicUpgradeCount(game.relicUpgrades[0])).toBe(0);
    game.unlockedGnoseUpgrades.add('gn_memoria_selos');
    expect(game.getMaxFervorUpgradeCount(game.fervorUpgrades.find(u => u.id === 'fu_relics')!)).toBe(0);
  });

  it.each([0, 199, 200, 400, 1e20])('previews relic purchases with a balance of %s without exceeding the level cap', balance => {
    const game = new GameStateManager();
    game.unlockedGnoseUpgrades.add('gn_memoria_selos');
    game.relicPoints = balance;
    const relic = game.relicUpgrades[0];
    relic.level = relic.maxLevel - 2;
    const count = game.getMaxRelicUpgradeCount(relic);
    expect(relic.level).toBe(relic.maxLevel - 2);
    expect(game.relicPoints).toBe(balance);
    expect(game.buyMaxRelicUpgrade(relic)).toBe(count);
    expect(count).toBeLessThanOrEqual(2);
    expect(game.getMaxRelicUpgradeCount(relic)).toBe(0);
  });
});
