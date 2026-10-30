import { describe, expect, it } from 'vitest';
import { GameStateManager } from '../../core/GameState.js';
import { GNOSE_UPGRADES } from '../../config/gnose.js';
import { INCARNATION_STAGES } from '../../config/incarnation.js';

const automations = ['gn_automation'];
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
    const g = new GameStateManager(); g.gnosePoints = GNOSE_UPGRADES.reduce((sum, u) => sum + u.cost, 0);
    const buy = (key: string) => {
      const u = GNOSE_UPGRADES.find(n => n.id === key)!;
      expect(u.tier).toBe(1);
      for (const req of u.prerequisites) if (!g.hasGnoseUpgrade(req)) buy(req);
      expect(g.buyGnoseUpgrade(key)).toBe(true);
    };
    buy(id);
    expect(g.defeatedBosses.size).toBe(0);
    expect(g.gnosePoints).toBeGreaterThan(0);
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

  it('recruits the maximum affordable followers with normal costs', () => {
    const g = new GameStateManager(); g.faithPoints = 1000;
    g.unlockedGnoseUpgrades.add('gn_automation');
    const reference = new GameStateManager(); reference.faithPoints = 1000;
    while (reference.buyOneFollower()) { /* manual reference */ }
    g.runGnoseAutomation();
    expect(g.getTotalFollowersCount()).toBe(reference.getTotalFollowersCount());
    expect(g.faithPoints).toBe(reference.faithPoints);
    expect(g.fervorUpgrades.every(u => u.level === 0)).toBe(true);
  });

  it('lets Omniscience waive costs without granting unaffordable levels or ignoring toggles', () => {
    const g = prepared();
    for (const id of ['gn_automation', 'gn_ritual_automation', 'gn_omniscience']) g.unlockedGnoseUpgrades.add(id);
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
    g.unlockedGnoseUpgrades.add('gn_ritual_automation'); g.unlockedGnoseUpgrades.add('gn_omniscience');
    g.fervorPoints = 1e100;
    const before = g.fervorUpgrades.map(u => u.level);
    g.runGnoseAutomation();
    g.fervorUpgrades.forEach((u, i) => expect(u.level - before[i]).toBeLessThanOrEqual(50));
  });

  it.each([
    [[], 0], [['gn_omniscience'], 1],
  ] as const)('evolves passive transmutation without spending faith (%j)', (upgrades, fraction) => {
    const g = prepared(); g.faithPoints = 1e12;
    g.unlockedGnoseUpgrades.add('gn_automation');
    upgrades.forEach(id => g.unlockedGnoseUpgrades.add(id));
    const toGet = g.getRelicsToGet(), enabled = g.getRelicsRatePerSecond();
    g.autoRelicsEnabled = false;
    expect(enabled - g.getRelicsRatePerSecond()).toBeCloseTo(toGet * fraction * g.getGnoseReconstructionMultiplier(), 7);
    expect(g.faithPoints).toBe(1e12);
  });

  it('reduces the follower cost scale and grants an early production synergy', () => {
    const g = prepared(); g.followers[0].count = 100;
    const rate = g.getFaithPerSecond(), click = g.getFaithPerClick(), cost = g.getItemCost(g.followers[0]);
    g.unlockedGnoseUpgrades.add('gn_init_faith');
    expect(g.getDevoteeBaseMultiplier()).toBeCloseTo(1.09, 10);
    expect(g.getItemCost(g.followers[0])).toBeLessThan(cost);
    expect(g.getFaithPerSecond()).toBeCloseTo(rate * 44, 5);
    expect(g.getFaithPerClick()).toBeCloseTo(click * 44, 5);
    expect(g.followers[0].costMultiplier).toBe(1.10); // The configured base is never rewritten.
  });

  it('improves ritual bases in small steps without replacing the level exponent', () => {
    const g = prepared(), rito = g.fervorUpgrades[0];
    const gains: number[] = [];
    for (const level of [0, 1, 10, 100]) {
      rito.level = level;
      g.unlockedGnoseUpgrades.delete('gn_init_fervor');
      const before = g.getFervorUpgradeEffect(rito), cost = g.getFervorUpgradeCost(rito);
      g.unlockedGnoseUpgrades.add('gn_init_fervor');
      expect(g.getFervorUpgradeEffect(rito)).toBeCloseTo(2.05 ** (level ** 0.6), 6);
      expect(g.getFervorUpgradeCost(rito)).toBe(Math.floor(rito.baseCost * 1.75 ** level));
      expect(g.getFervorUpgradeCost(rito)).toBeLessThanOrEqual(cost);
      gains.push(g.getFervorUpgradeEffect(rito) / before);
    }
    expect(gains[0]).toBe(1);
    expect(gains[1]).toBeCloseTo(1.025, 7);
    expect(gains[3]).toBeGreaterThan(gains[2]);
    g.unlockedGnoseUpgrades.add('gn_fu1_boost');
    expect(g.getFervorUpgradeEffect(rito)).toBeCloseTo(2.35 ** (rito.level ** 0.6), 6);
    const effect = g.getFervorUpgradeEffect(rito);
    g.unlockedGnoseUpgrades.delete('gn_init_fervor');
    expect(g.getFervorUpgradeEffect(rito)).toBe(effect);
  });

  it('improves the Fragment ritual while leaving the transmutation formula unchanged', () => {
    const g = prepared(), rito = g.fervorUpgrades[5];
    g.unlockedGnoseUpgrades.add('gn_relic_gain');
    for (const faith of [0, 1e3, 1e15, 1e30]) {
      g.faithPoints = faith;
      expect(g.getRelicsToGet()).toBe(Math.floor(Math.log2(faith + 1)));
    }
    rito.level = 10;
    expect(g.getFervorUpgradeEffect(rito)).toBeCloseTo(3.05 ** (10 ** 0.6), 6);
    expect(g.getFervorUpgradeCost(rito)).toBe(Math.floor(rito.baseCost * 4.9 ** 10));
    expect(g.getRelicsToGet()).toBe(Math.floor(Math.log2(g.faithPoints + 1) * g.getFervorUpgradeEffect(rito)));
    g.unlockedGnoseUpgrades.add('gn_omniscience');
    const gain = g.getRelicsToGet(), rate = g.getRelicsRatePerSecond();
    g.autoRelicsEnabled = false;
    expect(rate - g.getRelicsRatePerSecond()).toBeCloseTo(gain * g.getGnoseReconstructionMultiplier(), 7);
  });

  it('slightly improves Ascension while preserving its formula, threshold and unrelated production', () => {
    const g = prepared();
    const incarnation = g.getEffectiveIncarnationFollowerMultiplier(), lifetime = g.getTotalGnosePassiveMultiplier();
    const ratios: number[] = [];
    for (const faith of [1e21, 1e30]) {
      g.faithPoints = faith; g.unlockedGnoseUpgrades.delete('gn_gnose_mult');
      const before = g.getGnoseToGet();
      g.unlockedGnoseUpgrades.add('gn_gnose_mult');
      expect(g.getGnoseGainExponent()).toBe(0.28);
      expect(g.getGnoseToGet()).toBe(Math.floor((faith / 1e15) ** 0.28));
      ratios.push(g.getGnoseToGet() / before);
    }
    expect(ratios[1]).toBeGreaterThan(ratios[0]);
    g.faithPoints = 1e15 - 1; expect(g.getGnoseToGet()).toBe(0);
    g.faithPoints = 1e15; expect(g.getGnoseToGet()).toBe(1);
    expect(g.getEffectiveIncarnationFollowerMultiplier()).toBe(incarnation);
    for (const id of ['gn_omniscience', 'gn_apotheosis']) g.unlockedGnoseUpgrades.add(id);
    expect(g.getGnoseGainExponent()).toBe(0.28);
    expect(g.getTotalGnosePassiveMultiplier()).toBe(lifetime);
  });

  it('uses the same softened ritual cost for manual purchases and free automation', () => {
    const g = prepared(), rito = g.fervorUpgrades[0];
    rito.level = 20;
    const normalCost = g.getFervorUpgradeCost(rito);
    g.unlockedGnoseUpgrades.add('gn_apotheosis');
    const newCost = g.getFervorUpgradeCost(rito);
    expect(newCost).toBeLessThan(normalCost);
    g.fervorPoints = newCost;
    expect(g.buyFervorUpgrade(rito)).toBe(true);
    expect(g.fervorPoints).toBe(0);
    rito.level = 20; g.fervorPoints = newCost;
    g.unlockedGnoseUpgrades.add('gn_ritual_automation'); g.unlockedGnoseUpgrades.add('gn_omniscience');
    g.runGnoseAutomation();
    expect(rito.level).toBe(21);
    expect(g.fervorPoints).toBe(newCost);
  });

  it('preserves relic levels without granting extra passive transmutations', () => {
    const g = prepared();
    const rate = g.getRelicsRatePerSecond();
    g.unlockedGnoseUpgrades.add('gn_keep_relics');
    expect(g.getRelicsRatePerSecond()).toBe(rate * 4);
  });

  it('keeps all new purchases and their prerequisites reachable in the intended tiers', () => {
    expect([1, 2, 3, 4].map(tier => GNOSE_UPGRADES.filter(u => u.tier === tier).length)).toEqual([6, 6, 4, 4]);
    const g = prepared(); g.gnosePoints = GNOSE_UPGRADES.reduce((sum, u) => sum + u.cost, 0);
    const economy = GNOSE_UPGRADES.find(u => u.id === 'gn_followers_economy')!;
    expect(g.canBuyGnoseUpgrade(economy)).toBe(false);
    g.defeatedBosses.add('boss_anubis');
    expect(g.canBuyGnoseUpgrade(economy)).toBe(false);
    g.unlockedGnoseUpgrades.add('gn_init_faith'); g.unlockedGnoseUpgrades.add('gn_followers_syn');
    expect(g.buyGnoseUpgrade(economy.id)).toBe(true);
    const refinement = GNOSE_UPGRADES.find(u => u.id === 'gn_relic_refinement')!;
    expect(g.canBuyGnoseUpgrade(refinement)).toBe(false);
    g.defeatedBosses.add('boss_cronos'); g.unlockedGnoseUpgrades.add('gn_relic_gain');
    g.unlockedGnoseUpgrades.add('gn_keep_relics');
    expect(g.buyGnoseUpgrade(refinement.id)).toBe(true);
    for (const id of ['gn_empyrean_fire', 'gn_perfect_opus']) {
      const upgrade = GNOSE_UPGRADES.find(u => u.id === id)!;
      expect(g.canBuyGnoseUpgrade(upgrade)).toBe(false);
      g.defeatedBosses.add('boss_odin');
      expect(g.canBuyGnoseUpgrade(upgrade)).toBe(false);
    }
  });

  it('keeps ritual evolutions stronger while preserving the level exponent', () => {
    for (const [index, stages, bases] of [
      [0, ['gn_init_fervor', 'gn_fu1_boost', 'gn_empyrean_fire'], [2, 2.05, 2.35, 2.65]],
      [5, ['gn_relic_gain', 'gn_relic_refinement', 'gn_perfect_opus'], [3, 3.05, 3.4, 3.75]],
    ] as const) {
      for (const level of [1, 10, 100]) {
        const g = prepared(), rite = g.fervorUpgrades[index]; rite.level = level;
        let previous = g.getFervorUpgradeEffect(rite);
        for (let i = 0; i < stages.length; i++) {
          g.unlockedGnoseUpgrades.add(stages[i]);
          const effect = g.getFervorUpgradeEffect(rite), ratio = effect / previous;
          expect(effect).toBeCloseTo(bases[i + 1] ** (level ** 0.6), 5);
          expect(ratio).toBeGreaterThan(1);
          previous = effect;
        }
      }
    }
  });

  it('makes later cost reductions stronger without rewriting configured costs or cancelling Hermes', () => {
    const g = prepared(), rite = g.fervorUpgrades[5]; rite.level = 10;
    const costs = [g.getFervorUpgradeCost(rite)];
    for (const id of ['gn_relic_gain', 'gn_relic_refinement', 'gn_perfect_opus']) {
      g.unlockedGnoseUpgrades.add(id); costs.push(g.getFervorUpgradeCost(rite));
    }
    expect(costs[0] / costs[1]).toBeLessThan(costs[1] / costs[2]);
    expect(costs[1] / costs[2]).toBeLessThan(costs[2] / costs[3]);
    expect(rite.costMultiplier).toBe(5);
    g.unlockedGnoseUpgrades.add('gn_init_faith');
    expect(g.getDevoteeBaseMultiplier()).toBeCloseTo(1.09, 10);
    g.unlockedGnoseUpgrades.add('gn_followers_economy');
    expect(g.getDevoteeBaseMultiplier()).toBeCloseTo(1.075, 10);
    g.relicUpgrades[3].level = 5;
    expect(g.getDevoteeBaseMultiplier()).toBeCloseTo(1.05, 10);
    const restored = new GameStateManager(); restored.applySaveData(g.buildSaveData());
    expect(restored.getFervorUpgradeCost(restored.fervorUpgrades[5])).toBe(costs[3]);
    expect(restored.getDevoteeBaseMultiplier()).toBe(g.getDevoteeBaseMultiplier());
  });

  it('refunds retired purchases, merges old automations and never refunds them twice', () => {
    const g = prepared(); g.gnosePoints = 10; g.totalGnoseEarned = 100000;
    for (const id of ['gn_init_faith', 'gn_click_power', 'gn_dilatacao', 'gn_altar_resonance',
      'gn_alchemical_mind', 'gn_synergy_boost', 'gn_relic_resonance',
      'gn_auto_followers', 'gn_auto_fervor', 'gn_auto_relics']) g.unlockedGnoseUpgrades.add(id);
    g.autoFollowersEnabled = false;
    const restored = new GameStateManager(); restored.applySaveData(g.buildSaveData());
    expect(restored.gnosePoints).toBe(18650 - Math.min(16, GNOSE_UPGRADES.find(u => u.id === 'gn_automation')!.cost));
    expect(restored.totalGnoseEarned).toBe(100000);
    expect(restored.unlockedGnoseUpgrades).toEqual(new Set(['gn_init_faith', 'gn_automation']));
    expect(restored.autoFollowersEnabled).toBe(false);
    expect(restored.isGnoseTierUnlocked(2)).toBe(true);
    expect(restored.isGnoseTierUnlocked(3)).toBe(true);
    const again = new GameStateManager(); again.applySaveData(restored.buildSaveData());
    expect(again.gnosePoints).toBe(restored.gnosePoints);
    expect(again.unlockedGnoseUpgrades).toEqual(restored.unlockedGnoseUpgrades);
  });

  it.each(['gn_auto_followers', 'gn_auto_fervor', 'gn_auto_relics'])('migrates a partial legacy automation purchase (%s)', id => {
    const g = prepared(); g.gnosePoints = 0; g.unlockedGnoseUpgrades.add(id);
    const restored = new GameStateManager(); restored.applySaveData(g.buildSaveData());
    expect(restored.hasGnoseUpgrade('gn_automation')).toBe(true);
    expect(restored.hasGnoseUpgrade(id)).toBe(false);
    expect(restored.gnosePoints).toBe(Math.max(0, (id === 'gn_auto_followers' ? 3 : id === 'gn_auto_fervor' ? 5 : 8) - GNOSE_UPGRADES.find(u => u.id === 'gn_automation')!.cost));
  });

  it('refunds legacy automations in full if their replacement is already owned', () => {
    const g = prepared(); g.gnosePoints = 0;
    for (const id of ['gn_automation', 'gn_auto_followers', 'gn_auto_fervor', 'gn_auto_relics']) g.unlockedGnoseUpgrades.add(id);
    const restored = new GameStateManager(); restored.applySaveData(g.buildSaveData());
    expect(restored.gnosePoints).toBe(16);
    expect(restored.unlockedGnoseUpgrades).toEqual(new Set(['gn_automation']));
  });

  it('keeps every prerequisite reachable and gates Primordial Chaos on all current purchases', () => {
    const g = prepared(); g.gnosePoints = GNOSE_UPGRADES.reduce((sum, u) => sum + u.cost, 0);
    for (const id of ['boss_anubis', 'boss_cronos', 'boss_odin']) g.defeatedBosses.add(id);
    for (const upgrade of GNOSE_UPGRADES) {
      expect(g.canChallengeBoss('boss_tiamat')).toBe(false);
      expect(g.buyGnoseUpgrade(upgrade.id)).toBe(true);
    }
    expect(g.canChallengeBoss('boss_tiamat')).toBe(true);
  });

  it('makes both final Avatar forms attainable through Apotheosis', () => {
    const g = prepared(); g.unlockedGnoseUpgrades.add('gn_apotheosis');
    expect(g.getIncarnationStageCost(INCARNATION_STAGES[3])).toBe(1e20);
    expect(g.getIncarnationStageCost(INCARNATION_STAGES[4])).toBe(1e30);
    g.faithPoints = g.getIncarnationStageCost(INCARNATION_STAGES[3]);
    expect(g.upgradeIncarnation()).toBe(true);
    expect(g.upgradeIncarnation()).toBe(false); // Eclipse still consumed some of the balance.
    g.faithPoints = g.getIncarnationStageCost(INCARNATION_STAGES[4]);
    expect(g.upgradeIncarnation()).toBe(true);
    expect(g.incarnationStage).toBe(5);
  });

  it('preserves all purchased IDs and automation switches on a save round trip', () => {
    const g = prepared(); GNOSE_UPGRADES.forEach(u => g.unlockedGnoseUpgrades.add(u.id));
    g.autoFollowersEnabled = false; g.autoFervorEnabled = false; g.autoRelicsEnabled = false; g.autoRelicUpgradesEnabled = false;
    const restored = new GameStateManager(); restored.applySaveData(g.buildSaveData());
    expect([...restored.unlockedGnoseUpgrades]).toEqual([...g.unlockedGnoseUpgrades]);
    expect(restored.autoFollowersEnabled).toBe(false);
    expect(restored.autoFervorEnabled).toBe(false);
    expect(restored.autoRelicsEnabled).toBe(false);
    expect(restored.autoRelicUpgradesEnabled).toBe(false);
    expect(restored.getFaithPerSecond()).toBe(g.getFaithPerSecond());
  });
});
