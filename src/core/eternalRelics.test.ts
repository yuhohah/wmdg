import { ETERNAL_RELIC_IDS } from '../config/relics.js';
import { describe, expect, it } from 'vitest';
import { GameStateManager } from './GameState.js';
import { GNOSE_AUTOMATION } from '../config/gnose.js';
import { getRelicUpgradeBulkCost } from '../systems/relicCosts.js';

function prepared() {
  const game = new GameStateManager();
  game.unlocks.forEach(seal => { seal.unlocked = true; });
  game.unlockedGnoseUpgrades.add('gn_memoria_selos');
  game.relicPoints = 100000;
  return game;
}

describe('Cripta Eterna relics', () => {
  it('unlocks purchases past level 20 only for Cornucopia and Torch after assimilation', () => {
    const game = prepared();
    for (const relic of game.relicUpgrades) relic.level = relic.maxLevel;
    for (const relic of game.relicUpgrades) expect(game.buyRelicUpgrade(relic)).toBe(false);
    game.unlockedGnoseUpgrades.add('gn_keep_relics');
    game.relicUpgrades.forEach((relic) => {
      expect(game.buyRelicUpgrade(relic)).toBe(ETERNAL_RELIC_IDS.includes(relic.id));
      expect(game.getRelicMaxLevel(relic)).toBe(ETERNAL_RELIC_IDS.includes(relic.id) ? Infinity : relic.maxLevel);
      if (ETERNAL_RELIC_IDS.includes(relic.id)) expect(relic.effectText(relic.level, 0, game.getRelicMaxLevel(relic))).toContain('/∞');
    });
  });

  it.each([0, 199, 200, 999, 1e12, 1e100])('buys the previewed maximum in bounded work with %s fragments', balance => {
    const game = prepared();
    game.unlockedGnoseUpgrades.add('gn_keep_relics');
    const relic = game.relicUpgrades[0];
    relic.level = 20;
    game.relicPoints = balance;
    const count = game.getMaxRelicUpgradeCount(relic);
    const totalCost = getRelicUpgradeBulkCost(relic, count);
    expect(totalCost).toBeLessThanOrEqual(balance);
    expect(getRelicUpgradeBulkCost(relic, count + 1)).toBeGreaterThan(balance);
    expect(game.buyMaxRelicUpgrade(relic)).toBe(count);
    expect(relic.level).toBe(20 + count);
    expect(game.relicPoints).toBe(Math.max(0, balance - totalCost));
    expect(game.relicPeakThisRun).toBe(count > 0 ? balance : 0);
  });

  it('preserves all restored levels through ascension and save reload, including levels above 20', () => {
    const game = prepared();
    game.unlockedGnoseUpgrades.add('gn_keep_relics');
    game.relicUpgrades.forEach((relic, i) => { relic.level = ETERNAL_RELIC_IDS.includes(relic.id) ? 250 + i : relic.maxLevel; });
    const levels = game.relicUpgrades.map(relic => relic.level);
    game.faithPoints = 1e16;
    expect(game.performGnoseReset().success).toBe(true);
    expect(game.relicUpgrades.map(relic => relic.level)).toEqual(levels);
    const restored = new GameStateManager();
    restored.applySaveData(game.buildSaveData());
    expect(restored.relicUpgrades.map(relic => relic.level)).toEqual(levels);
    expect(restored.getFaithPerSecond()).toBe(game.getFaithPerSecond());
  });

  it('keeps legacy caps and ascension reset behavior without Cripta Eterna', () => {
    const game = prepared();
    const save = game.buildSaveData();
    save.relicUpgrades[0].level = 250;
    game.applySaveData(save);
    expect(game.relicUpgrades[0].level).toBe(20);
    game.faithPoints = 1e16;
    expect(game.performGnoseReset().success).toBe(true);
    expect(game.relicUpgrades.every(relic => relic.level === 0)).toBe(true);
  });

  it('bounds automated purchases despite unlimited relic levels and a huge balance', () => {
    const game = prepared();
    game.unlockedGnoseUpgrades.add('gn_keep_relics');
    game.unlockedGnoseUpgrades.add('gn_relic_automation');
    game.relicUpgrades.forEach(relic => { relic.level = relic.maxLevel; });
    game.relicPoints = 1e100;
    game.runGnoseAutomation();
    for (const relic of game.relicUpgrades.filter(relic => ETERNAL_RELIC_IDS.includes(relic.id))) {
      expect(relic.level).toBeGreaterThan(20);
      expect(relic.level - 20).toBeLessThanOrEqual(GNOSE_AUTOMATION.maxRelicLevelsPerCycle);
    }
    expect(Number.isFinite(game.getFaithPerSecond())).toBe(true);
  });
});
