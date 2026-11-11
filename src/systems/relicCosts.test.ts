import { describe, expect, it } from 'vitest';
import { initialRelicUpgrades, ETERNAL_RELIC_IDS } from '../config/relics.js';
import { getRelicUpgradeCost, getRelicUpgradeBulkCost, getMaxAffordableRelicLevels } from './relicCosts.js';
import { GameStateManager } from '../core/GameState.js';

describe('eternal relic price progression', () => {
  it.each(initialRelicUpgrades.filter(relic => ETERNAL_RELIC_IDS.includes(relic.id)))('keeps the first 20 prices and scales later levels for $id', original => {
    const relic = { ...original };
    for (let level = 0; level < 20; level++) expect(getRelicUpgradeCost(relic, level)).toBe(relic.cost);
    expect(getRelicUpgradeCost(relic, 20)).toBeCloseTo(relic.cost * 1.15, 8);
    expect(getRelicUpgradeCost(relic, 21)).toBeCloseTo(relic.cost * 1.3225, 8);
    expect(getRelicUpgradeCost(relic, 100)).toBeGreaterThan(relic.cost * 80000);
  });

  it('charges the geometric sum when buying across the original cap', () => {
    const relic = { ...initialRelicUpgrades[0], level: 19 };
    expect(getRelicUpgradeBulkCost(relic, 3)).toBeCloseTo(200 + 230 + 264.5, 8);
    expect(getMaxAffordableRelicLevels(relic, 700, Infinity)).toBe(3);
    expect(getMaxAffordableRelicLevels(relic, 694, Infinity)).toBe(2);
  });

  it.each([0, 18, 19, 20, 50])('matches individual costs when buying from level %s', level => {
    const relic = { ...initialRelicUpgrades.find(relic => relic.id === 'relic_torch')!, level };
    let total = 0;
    for (let n = 1; n <= 100; n++) {
      total += getRelicUpgradeCost(relic, level + n - 1);
      expect(getRelicUpgradeBulkCost(relic, n) / total).toBeCloseTo(1, 12);
    }
  });

  it('charges the same total for single and maximum purchases and updates the next price', () => {
    const game = new GameStateManager();
    game.unlockedGnoseUpgrades.add('gn_memoria_selos');
    game.unlockedGnoseUpgrades.add('gn_keep_relics');
    const relic = game.relicUpgrades[0];
    relic.level = 19;
    game.relicPoints = 700;
    expect(game.getMaxRelicUpgradeCount(relic)).toBe(3);
    expect(game.buyMaxRelicUpgrade(relic)).toBe(3);
    expect(relic.level).toBe(22);
    expect(game.relicPoints).toBeCloseTo(5.5, 8);
    expect(game.getRelicUpgradeCost(relic)).toBeCloseTo(304.175, 8);
    expect(game.buyRelicUpgrade(relic)).toBe(false);
    game.relicPoints = game.getRelicUpgradeCost(relic);
    expect(game.buyRelicUpgrade(relic)).toBe(true);
    expect(game.relicPoints).toBeCloseTo(0, 8);
  });

  it('preserves other relic prices and finite level caps', () => {
    for (const original of initialRelicUpgrades.filter(relic => !ETERNAL_RELIC_IDS.includes(relic.id))) {
      const relic = { ...original, level: original.maxLevel - 1 };
      expect(getRelicUpgradeCost(relic)).toBe(original.cost);
      expect(getMaxAffordableRelicLevels(relic, 1e100, relic.maxLevel)).toBe(1);
    }
  });

  it('bounds maximum calculations at extreme balances and rejects overflowing prices', () => {
    const relic = { ...initialRelicUpgrades[0], level: 20 };
    const count = getMaxAffordableRelicLevels(relic, Number.MAX_VALUE, Infinity);
    expect(count).toBeGreaterThan(1000);
    expect(count).toBeLessThan(6000);
    expect(getRelicUpgradeBulkCost(relic, count)).toBeLessThanOrEqual(Number.MAX_VALUE);
    expect(getRelicUpgradeBulkCost(relic, count + 1)).toBe(Infinity);
    relic.level = 1000000;
    expect(getMaxAffordableRelicLevels(relic, Number.MAX_VALUE, Infinity)).toBe(0);
    expect(getRelicUpgradeBulkCost(relic, 0)).toBe(0);
  });
});
