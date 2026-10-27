import { describe, expect, it } from 'vitest';
import { GameStateManager } from '../../core/GameState.js';
import { GNOSE_UPGRADES } from '../../config/gnose.js';
import { INCARNATION_STAGES } from '../../config/incarnation.js';

const automations = ['gn_auto_followers', 'gn_auto_fervor', 'gn_auto_relics'];
function prepared() {
  const g = new GameStateManager();
  g.unlocks.forEach(u => { u.unlocked = true; });
  g.followers[0].count = 10;
  g.incarnationStage = 3;
  g.faithPoints = 5000;
  g.fervorPoints = 1000;
  g.fervorUpgrades[0].level = 10;
  return g;
}

describe('Gnose tree revision', () => {
  it.each(automations)('makes %s purchasable in tier I without a boss or a later-tier prerequisite', id => {
    const g = new GameStateManager(); g.gnosePoints = 100;
    const buy = (key: string) => {
      const u = GNOSE_UPGRADES.find(n => n.id === key)!;
      expect(u.tier).toBe(1);
      for (const req of u.prerequisites) if (!g.hasGnoseUpgrade(req)) buy(req);
      expect(g.buyGnoseUpgrade(key)).toBe(true);
    };
    buy(id);
    expect(g.defeatedBosses.size).toBe(0);
    expect(g.gnosePoints).toBeGreaterThan(75);
  });

  it('grants the first restart faith immediately, once, and accounts only the credited difference', () => {
    const g = new GameStateManager(); g.gnosePoints = 1;
    expect(g.buyGnoseUpgrade('gn_init_faith')).toBe(true);
    expect(g.faithPoints).toBe(1000);
    expect(g.totalFaithAccumulated).toBe(1000);
    expect(g.buyGnoseUpgrade('gn_init_faith')).toBe(false);
    expect(g.faithPoints).toBe(1000);
    const restored = new GameStateManager(); restored.applySaveData(g.buildSaveData());
    expect(restored.faithPoints).toBe(1000);
    expect(restored.totalFaithAccumulated).toBe(1000);
  });

  it('never lowers a larger balance or grants the reward again on import', () => {
    const g = new GameStateManager(); g.gnosePoints = 1;
    g.faithPoints = g.totalFaithAccumulated = 1e6;
    g.buyGnoseUpgrade('gn_init_faith');
    expect(g.faithPoints).toBe(1e6);
    expect(g.totalFaithAccumulated).toBe(1e6);
    g.faithPoints = 1;
    const restored = new GameStateManager(); restored.applySaveData(g.buildSaveData());
    expect(restored.faithPoints).toBe(1);
  });

  it('spends normal costs within a bounded income budget before Omniscience', () => {
    const g = prepared();
    g.unlockedGnoseUpgrades.add('gn_auto_followers');
    g.unlockedGnoseUpgrades.add('gn_auto_fervor');
    const faith = g.faithPoints, fervor = g.fervorPoints;
    const faithBudget = Math.min(faith * 0.1, g.getFaithPerSecond() * 0.25);
    const fervorBudget = Math.min(fervor * 0.1, g.getFervorRatePerSecond() * 0.25);
    const levels = g.fervorUpgrades.reduce((n, u) => n + u.level, 0);
    g.runGnoseAutomation();
    expect(g.getTotalFollowersCount()).toBeGreaterThan(10);
    expect(g.faithPoints).toBeLessThan(faith);
    expect(faith - g.faithPoints).toBeLessThanOrEqual(faithBudget);
    expect(g.fervorPoints).toBeLessThan(fervor);
    expect(fervor - g.fervorPoints).toBeLessThanOrEqual(fervorBudget);
    expect(g.fervorUpgrades.reduce((n, u) => n + u.level, 0)).toBeGreaterThan(levels);
  });

  it('can recruit the first follower from seed faith without passive income', () => {
    const g = new GameStateManager(); g.faithPoints = 1000;
    g.unlockedGnoseUpgrades.add('gn_auto_followers');
    const cost = g.getItemCost(g.followers[0]);
    g.runGnoseAutomation();
    expect(g.getTotalFollowersCount()).toBe(1);
    expect(g.faithPoints).toBe(1000 - cost);
  });

  it('accumulates a low-income ritual budget across ticks and save/load instead of starving forever', () => {
    const g = new GameStateManager();
    g.unlocks.forEach(u => { u.unlocked = true; });
    g.unlockedGnoseUpgrades.add('gn_auto_fervor');
    g.tick(450);
    expect(g.fervorUpgrades[0].level).toBe(0);
    const restored = new GameStateManager(); restored.applySaveData(g.buildSaveData());
    restored.tick(60);
    expect(restored.fervorUpgrades[0].level).toBeGreaterThan(0);
    expect(restored.fervorPoints).toBeGreaterThanOrEqual(0);
  });

  it('lets Omniscience waive costs without granting unaffordable levels or ignoring toggles', () => {
    const g = prepared();
    for (const id of ['gn_auto_followers', 'gn_auto_fervor', 'gn_omniscience']) g.unlockedGnoseUpgrades.add(id);
    g.runGnoseAutomation();
    expect(g.getTotalFollowersCount()).toBeGreaterThan(10);
    expect(g.faithPoints).toBe(5000);
    expect(g.fervorPoints).toBe(1000);
    expect(g.fervorUpgrades[0].level).toBe(10); // Its next level costs more than 1,000.
    expect(g.fervorUpgrades[5].level).toBe(0); // Phoenix remains required.
    g.autoFollowersEnabled = g.autoFervorEnabled = false;
    const followers = g.getTotalFollowersCount(), levels = g.fervorUpgrades.map(u => u.level);
    g.runGnoseAutomation();
    expect(g.getTotalFollowersCount()).toBe(followers);
    expect(g.fervorUpgrades.map(u => u.level)).toEqual(levels);
  });

  it('keeps the free ritual automation bounded to 50 levels per ritual per second', () => {
    const g = prepared();
    g.unlockedGnoseUpgrades.add('gn_auto_fervor'); g.unlockedGnoseUpgrades.add('gn_omniscience');
    g.fervorPoints = 1e100;
    const before = g.fervorUpgrades.map(u => u.level);
    g.runGnoseAutomation();
    g.fervorUpgrades.forEach((u, i) => expect(u.level - before[i]).toBeLessThanOrEqual(50));
  });

  it.each([
    [[], 0.1], [['gn_alchemical_mind'], 0.25], [['gn_omniscience'], 1],
  ] as const)('evolves passive transmutation without spending faith (%j)', (upgrades, fraction) => {
    const g = prepared(); g.faithPoints = 1e12;
    g.unlockedGnoseUpgrades.add('gn_auto_relics');
    upgrades.forEach(id => g.unlockedGnoseUpgrades.add(id));
    const toGet = g.getRelicsToGet(), enabled = g.getRelicsRatePerSecond();
    g.autoRelicsEnabled = false;
    expect(enabled - g.getRelicsRatePerSecond()).toBeCloseTo(toGet * fraction, 7);
    expect(g.faithPoints).toBe(1e12);
  });

  it('makes Cosmic Pulse useful without manual clicks', () => {
    const g = prepared(); const fps = g.getFaithPerSecond(), fpc = g.getFaithPerClick();
    g.unlockedGnoseUpgrades.add('gn_click_power');
    expect(g.getFaithPerSecond()).toBeCloseTo(fps * 1.25, 6);
    expect(g.getFaithPerClick()).toBeCloseTo(fpc * 10, 6);
    expect(g.totalClicks).toBe(0);
  });

  it('evolves alchemy and faith-to-fervor formulas in the same effects used by the UI', () => {
    const g = prepared(); g.fervorUpgrades[5].level = 10; g.fervorUpgrades[4].level = 10;
    const originalRelics = g.getRelicsToGet(), originalFervor = g.getFervorRatePerSecond();
    g.unlockedGnoseUpgrades.add('gn_alchemical_mind');
    expect(g.getFervorUpgradeEffect(g.fervorUpgrades[5])).toBeCloseTo(4 ** (10 ** 0.6), 6);
    expect(g.getRelicsToGet()).toBeGreaterThan(originalRelics * 4);
    g.unlockedGnoseUpgrades.add('gn_synergy_boost');
    expect(g.getFervorRatePerSecond()).toBeGreaterThan(originalFervor * 5);
  });

  it('makes every restored relic level strengthen Harmony, up to sevenfold production', () => {
    const g = prepared(); g.relicUpgrades.forEach(r => { r.level = r.maxLevel; });
    const fps = g.getFaithPerSecond(), fpc = g.getFaithPerClick(), fervor = g.getFervorRatePerSecond();
    g.unlockedGnoseUpgrades.add('gn_relic_resonance');
    expect(g.getFaithPerSecond() / fps).toBeCloseTo(7, 7);
    expect(g.getFaithPerClick() / fpc).toBeCloseTo(7, 7);
    expect(g.getFervorRatePerSecond() / fervor).toBeCloseTo(7, 7);
    g.relicUpgrades[0].level--;
    expect(g.getRelicResonanceMultiplier()).toBeLessThan(7);
  });

  it('makes both final Avatar forms attainable through Apotheosis', () => {
    const g = prepared(); g.unlockedGnoseUpgrades.add('gn_apotheosis');
    expect(g.getIncarnationStageCost(INCARNATION_STAGES[3])).toBe(1e20);
    expect(g.getIncarnationStageCost(INCARNATION_STAGES[4])).toBe(1e36);
    g.faithPoints = 1e20;
    expect(g.upgradeIncarnation()).toBe(true);
    expect(g.upgradeIncarnation()).toBe(false); // Eclipse still consumed some of the balance.
    g.faithPoints = 1e36;
    expect(g.upgradeIncarnation()).toBe(true);
    expect(g.incarnationStage).toBe(5);
  });

  it('preserves all purchased IDs and automation switches on a save round trip', () => {
    const g = prepared(); GNOSE_UPGRADES.forEach(u => g.unlockedGnoseUpgrades.add(u.id));
    g.autoFollowersEnabled = false; g.autoFervorEnabled = false; g.autoRelicsEnabled = false;
    const restored = new GameStateManager(); restored.applySaveData(g.buildSaveData());
    expect([...restored.unlockedGnoseUpgrades]).toEqual([...g.unlockedGnoseUpgrades]);
    expect(restored.autoFollowersEnabled).toBe(false);
    expect(restored.autoFervorEnabled).toBe(false);
    expect(restored.autoRelicsEnabled).toBe(false);
    expect(restored.getFaithPerSecond()).toBe(g.getFaithPerSecond());
  });
});
