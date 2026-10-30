import { describe, expect, it } from 'vitest';
import { GameStateManager } from '../../core/GameState.js';
import { GNOSE_UPGRADES } from '../../config/gnose.js';

function cult() {
  const g = new GameStateManager();
  g.gnosePoints = GNOSE_UPGRADES.reduce((sum, u) => sum + u.cost, 0);
  g.totalGnoseEarned = 1000;
  g.defeatedBosses.add('boss_anubis');
  return g;
}

describe('unified seal automation and full-balance buyers', () => {
  it('preserves only Encarnação and pays for the other seals again after Ascension', () => {
    const g = cult();
    for (const id of ['gn_init_faith', 'gn_memoria_selos']) expect(g.buyGnoseUpgrade(id)).toBe(true);
    expect(g.isIncarnationUnlocked()).toBe(true);
    expect(g.isConvertMaxUnlocked()).toBe(true);
    expect(g.isFervorUpgradesUnlocked()).toBe(false);
    expect(g.isRelicsUnlocked()).toBe(false);

    // Buying the automation does not preserve or waive seal costs on Ascension.
    for (const u of g.unlocks) u.unlocked = true;
    g.faithPoints = 1e18;
    expect(g.performGnoseReset().success).toBe(true);
    expect(g.isIncarnationUnlocked()).toBe(true);
    expect(g.isFervorUpgradesUnlocked()).toBe(false);
    expect(g.isRelicsUnlocked()).toBe(false);
    expect(g.buyGnoseUpgrade('gn_seal_automation')).toBe(true);
    expect(g.isFervorUpgradesUnlocked()).toBe(false);
    g.faithPoints = 5000;
    g.runGnoseAutomation();
    expect(g.isFervorUpgradesUnlocked()).toBe(true);
    expect(g.faithPoints).toBe(0);
    expect(g.isRelicsUnlocked()).toBe(false);
    g.faithPoints = 1e18;
    g.performGnoseReset();
    expect(g.isFervorUpgradesUnlocked()).toBe(false);
    expect(g.isRelicsUnlocked()).toBe(false);
    expect(g.hasGnoseUpgrade('gn_seal_automation')).toBe(true);
    expect(g.isRelicsUnlocked()).toBe(false);
    g.faithPoints = 20005000;
    g.runGnoseAutomation();
    expect(g.isFervorUpgradesUnlocked()).toBe(true);
    expect(g.isRelicsUnlocked()).toBe(true);
    expect(g.faithPoints).toBe(0);
    g.faithPoints = 1e18;
    g.performGnoseReset();
    expect(g.isRelicsUnlocked()).toBe(false);
    expect(g.relicUpgrades.every(r => r.level === 0)).toBe(true);
  });

  it('buys all four seals in order only when affordable, without paying twice', () => {
    const g = cult();
    g.unlockedGnoseUpgrades.add('gn_seal_automation');
    g.faithPoints = 199;
    g.runGnoseAutomation();
    expect(g.unlocks.every(u => !u.unlocked)).toBe(true);
    expect(g.faithPoints).toBe(199);
    g.faithPoints = 200;
    g.runGnoseAutomation();
    expect(g.isIncarnationUnlocked()).toBe(true);
    expect(g.isFervorUpgradesUnlocked()).toBe(false);
    expect(g.faithPoints).toBe(0);
    g.faithPoints = 4999;
    g.runGnoseAutomation();
    expect(g.isFervorUpgradesUnlocked()).toBe(false);
    expect(g.faithPoints).toBe(4999);
    g.faithPoints = 20005000;
    g.runGnoseAutomation();
    expect(g.faithPoints).toBe(0);
    expect(g.isRelicsUnlocked()).toBe(true);
    expect(g.unlocks.find(u => u.id === 'unlock_gnose')!.unlocked).toBe(false);
    g.faithPoints = 1e15;
    g.runGnoseAutomation();
    expect(g.unlocks.every(u => u.unlocked)).toBe(true);
    expect(g.faithPoints).toBe(1e15);
    g.faithPoints = 1000;
    g.runGnoseAutomation();
    expect(g.faithPoints).toBe(1000);
  });

  it('pays for an affordable seal before spending the remainder on followers', () => {
    const g = cult();
    g.unlocks[0].unlocked = true;
    g.unlockedGnoseUpgrades.add('gn_seal_automation');
    g.unlockedGnoseUpgrades.add('gn_automation');
    g.faithPoints = 5020;
    g.runGnoseAutomation();
    expect(g.isFervorUpgradesUnlocked()).toBe(true);
    expect(g.getTotalFollowersCount()).toBe(1);
    expect(g.faithPoints).toBe(0);
  });

  it('places seal recovery in tier I and advanced automation behind Anubis', () => {
    const g = cult();
    g.defeatedBosses.clear();
    for (const id of ['gn_init_faith', 'gn_memoria_selos', 'gn_init_fervor', 'gn_seal_automation', 'gn_automation']) {
      expect(g.buyGnoseUpgrade(id)).toBe(true);
    }
    for (const id of ['gn_ritual_automation', 'gn_relic_automation']) {
      const node = GNOSE_UPGRADES.find(u => u.id === id)!;
      expect(node.cost).toBeGreaterThan(0);
      expect(node.tier).toBe(2);
      expect(g.canBuyGnoseUpgrade(node)).toBe(false);
    }
    g.defeatedBosses.add('boss_anubis');
    for (const id of ['gn_ritual_automation', 'gn_relic_automation']) {
      expect(g.buyGnoseUpgrade(id)).toBe(true);
    }
  });

  it('lets follower automation spend available Faith and pause without enabling other automations', () => {
    const g = cult();
    g.unlockedGnoseUpgrades.add('gn_automation');
    g.unlocks.forEach(u => u.unlocked = true);
    g.faithPoints = 1000; g.fervorPoints = 1000; g.relicPoints = 1000;
    g.autoFollowersEnabled = false;
    g.runGnoseAutomation();
    expect(g.faithPoints).toBe(1000);
    expect(g.getTotalFollowersCount()).toBe(0);
    g.autoFollowersEnabled = true;
    g.runGnoseAutomation();
    expect(g.getTotalFollowersCount()).toBeGreaterThan(1);
    expect(g.faithPoints).toBeLessThan(1000);
    expect(g.faithPoints).toBeLessThan(g.getItemCost(g.followers[0]));
    expect(g.fervorPoints).toBe(1000);
    expect(g.relicPoints).toBe(1000);
    expect(g.fervorUpgrades.every(u => u.level === 0)).toBe(true);
    expect(g.relicUpgrades.every(u => u.level === 0)).toBe(true);
    const rate = g.getRelicsRatePerSecond();
    g.autoRelicsEnabled = false;
    expect(g.getRelicsRatePerSecond()).toBe(rate);
  });

  it('buys rituals from all available Fervor using manual costs and respects Phoenix and pause', () => {
    const g = cult();
    g.unlocks.forEach(u => u.unlocked = true);
    g.unlockedGnoseUpgrades.add('gn_ritual_automation');
    g.fervorPoints = 1000;
    g.autoFervorEnabled = false;
    g.runGnoseAutomation();
    expect(g.fervorPoints).toBe(1000);
    g.autoFervorEnabled = true;
    const reference = new GameStateManager(); reference.fervorPoints = 1000;
    for (;;) {
      const next = reference.fervorUpgrades.filter(u => u.id !== 'fu_relics' && reference.getFervorUpgradeCost(u) <= reference.fervorPoints)
        .sort((a, b) => reference.getFervorUpgradeCost(a) - reference.getFervorUpgradeCost(b))[0];
      if (!next) break;
      reference.buyFervorUpgrade(next);
    }
    g.runGnoseAutomation();
    expect(g.fervorUpgrades.map(u => u.level)).toEqual(reference.fervorUpgrades.map(u => u.level));
    expect(g.fervorPoints).toBe(reference.fervorPoints);
    expect(g.getTotalFollowersCount()).toBe(0);
    expect(g.fervorUpgrades[5].level).toBe(0);
    g.relicUpgrades[2].level = 1;
    g.fervorPoints = 1e10;
    g.runGnoseAutomation();
    expect(g.fervorUpgrades[5].level).toBeGreaterThan(0);
  });

  it('buys relic levels from Fragments with no faith reset, normal costs, maxima and an independent pause', () => {
    const g = cult();
    g.unlocks.forEach(u => u.unlocked = true);
    g.unlockedGnoseUpgrades.add('gn_relic_automation');
    g.faithPoints = 1234; g.relicPoints = 1000;
    g.autoRelicUpgradesEnabled = false;
    g.runGnoseAutomation();
    expect(g.relicPoints).toBe(1000);
    g.autoRelicUpgradesEnabled = true;
    g.runGnoseAutomation();
    expect(g.relicUpgrades[2].level).toBe(1); // Phoenix unlock precedes minor repeated levels.
    expect(g.relicUpgrades[0].level).toBe(1);
    expect(g.relicPoints).toBe(50);
    expect(g.faithPoints).toBe(1234);
    expect(g.relicConvertCooldown).toBe(0);
    g.unlockedGnoseUpgrades.add('gn_omniscience');
    g.relicPoints = 1e6;
    const before = g.relicPoints;
    const remainingCost = g.relicUpgrades.reduce((sum, r) => sum + (r.maxLevel - r.level) * r.cost, 0);
    g.runGnoseAutomation();
    expect(g.relicUpgrades.every(r => r.level === r.maxLevel)).toBe(true);
    expect(g.relicPoints).toBe(before - remainingCost);
    const maxedBalance = g.relicPoints;
    g.runGnoseAutomation();
    expect(g.relicPoints).toBe(maxedBalance);
  });

  it('keeps unlocked nodes and independent pause settings through save/load and Ascension', () => {
    const g = cult();
    g.unlocks.forEach(u => u.unlocked = true);
    for (const id of ['gn_memoria_selos', 'gn_seal_automation', 'gn_automation', 'gn_ritual_automation', 'gn_relic_automation']) {
      g.unlockedGnoseUpgrades.add(id);
    }
    g.autoFollowersEnabled = g.autoRelicUpgradesEnabled = false;
    g.autoFervorEnabled = true;
    g.autoRelicsEnabled = false;
    const restored = new GameStateManager(); restored.applySaveData(g.buildSaveData());
    restored.faithPoints = 1e18;
    restored.performGnoseReset();
    expect(restored.autoFollowersEnabled).toBe(false);
    expect(restored.autoFervorEnabled).toBe(true);
    expect(restored.autoRelicUpgradesEnabled).toBe(false);
    expect(restored.autoRelicsEnabled).toBe(false);
    expect(restored.unlockedGnoseUpgrades).toEqual(g.unlockedGnoseUpgrades);
    const legacy = g.buildSaveData();
    delete legacy.gnose!.autoRelicUpgradesEnabled;
    legacy.gnose!.autoFollowersBudget = 100;
    legacy.gnose!.autoFervorBudget = 100;
    restored.applySaveData(legacy);
    expect(restored.hasGnoseUpgrade('gn_ritual_automation')).toBe(true);
    expect(restored.autoRelicUpgradesEnabled).toBe(true);
  });
  it.each([
    [['gn_fervor_seal'], 0],
    [['gn_relics_seal'], 8],
    [['gn_fervor_seal', 'gn_relics_seal'], 12],
    [['gn_seal_automation', 'gn_fervor_seal', 'gn_relics_seal'], 16],
  ] as const)('merges old seal purchases %j and refunds excess Gnose exactly once', (ids, refund) => {
    const g = new GameStateManager();
    g.gnosePoints = 10;
    g.totalGnoseEarned = 100;
    ids.forEach(id => g.unlockedGnoseUpgrades.add(id));
    const restored = new GameStateManager(); restored.applySaveData(g.buildSaveData());
    expect(restored.unlockedGnoseUpgrades).toEqual(new Set(['gn_seal_automation']));
    expect(restored.gnosePoints).toBe(10 + (ids.some(id => id === 'gn_seal_automation') ? refund : Math.max(0, refund + 4 - GNOSE_UPGRADES.find(u => u.id === 'gn_seal_automation')!.cost)));
    expect(restored.totalGnoseEarned).toBe(100);
    if (ids.some(id => id === 'gn_relics_seal')) expect(restored.isGnoseTierUnlocked(2)).toBe(true);
    const again = new GameStateManager(); again.applySaveData(restored.buildSaveData());
    expect(again.gnosePoints).toBe(restored.gnosePoints);
    expect(again.unlockedGnoseUpgrades).toEqual(restored.unlockedGnoseUpgrades);
  });

});
