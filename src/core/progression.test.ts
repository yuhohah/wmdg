import { describe, expect, it } from 'vitest';
import { GameStateManager } from './GameState.js';
import { ElapsedTimeCredit } from '../systems/elapsedTime.js';
import { GNOSE_UPGRADES } from '../config/gnose.js';
import { calculateMiracleReward } from '../systems/calculations.js';

function economy() {
  const g = new GameStateManager();
  g.unlocks.forEach(u => { u.unlocked = true; });
  g.followers[0].count = 100;
  g.addFervor(1e9); g.addRelics(1e6);
  g.relicUpgrades[5].level = 2;
  return g;
}

describe('progression invariants', () => {
  it('spends balances without losing the production earned by this cycle', () => {
    const g = economy(), rate = g.getFaithPerSecond(), click = g.getFaithPerClick();
    expect(g.buyFervorUpgrade(g.fervorUpgrades[0])).toBe(true);
    expect(g.getFaithPerSecond()).toBeGreaterThanOrEqual(rate);
    expect(g.getFaithPerClick()).toBeGreaterThanOrEqual(click);
    expect(g.buyRelicUpgrade(g.relicUpgrades[1])).toBe(true);
    expect(g.getFaithPerSecond()).toBeGreaterThanOrEqual(rate);
    expect(g.fervorPeakThisRun).toBe(1e9); expect(g.relicPeakThisRun).toBe(1e6);
  });

  it('resets peaks even with Cripta and never derives them from permanent history', () => {
    const g = economy(); g.faithPoints = 1e15; g.unlockedGnoseUpgrades.add('gn_keep_relics');
    expect(g.performGnoseReset().success).toBe(true);
    expect(g.fervorPeakThisRun).toBe(0); expect(g.relicPeakThisRun).toBe(0);
    expect(g.relicUpgrades[5].level).toBe(2);
    const save = g.buildSaveData(); delete save.stats.fervorPeakThisRun; delete save.stats.relicPeakThisRun;
    const loaded = new GameStateManager(); loaded.applySaveData(save);
    expect(loaded.fervorPeakThisRun).toBe(0); expect(loaded.relicPeakThisRun).toBe(0);
    expect(loaded.totalFervorGenerated).toBe(1e9);
  });

  it('migrates known balances and round-trips spent peaks', () => {
    const g = economy(), old = g.buildSaveData(); delete old.stats.fervorPeakThisRun; delete old.stats.relicPeakThisRun;
    const loaded = new GameStateManager(); loaded.applySaveData(old);
    expect(loaded.fervorPeakThisRun).toBe(g.fervorPoints);
    loaded.buyFervorUpgrade(loaded.fervorUpgrades[1]);
    const roundtrip = new GameStateManager(); roundtrip.applySaveData(loaded.buildSaveData());
    expect(roundtrip.fervorPeakThisRun).toBe(g.fervorPoints);
  });

  it('refunds old price differences once without crediting historical Gnose', () => {
    const g = economy(); g.gnosePoints = 7; g.totalGnoseEarned = 200;
    for (const id of ['gn_automation', 'gn_ritual_automation', 'gn_relic_automation', 'gn_keep_relics']) g.unlockedGnoseUpgrades.add(id);
    const save = g.buildSaveData(); delete save.progressionRevision;
    const migrated = new GameStateManager(); migrated.applySaveData(save);
    expect(migrated.gnosePoints).toBe(7 + Object.entries({gn_automation:8, gn_ritual_automation:15, gn_relic_automation:20, gn_keep_relics:78}).reduce((sum, [id, cost]) => sum + Math.max(0, cost - GNOSE_UPGRADES.find(u => u.id === id)!.cost), 0));
    expect(migrated.totalGnoseEarned).toBe(200);
    const reloaded = new GameStateManager(); reloaded.applySaveData(migrated.buildSaveData());
    expect(reloaded.gnosePoints).toBe(migrated.gnosePoints);
  });

  it('reserves an objective within 180 seconds and invests only to reduce its ETA', () => {
    const g = economy(); g.unlockedGnoseUpgrades.add('gn_automation');
    g.automationGoal = 'gnose'; g.automationGnoseTarget = 1;
    g.faithPoints = 1e15 - 100 * g.getFaithPerSecond();
    const followers = g.getTotalFollowersCount(), balance = g.faithPoints;
    g.runGnoseAutomation();
    expect(g.getTotalFollowersCount()).toBe(followers); expect(g.faithPoints).toBe(balance);
    g.incarnationStage = 5;
    g.faithPoints = 1e9;
    expect(g.shouldInvestInFollower()).toBe(true);
    g.runGnoseAutomation(); expect(g.getTotalFollowersCount()).toBeGreaterThan(followers);
    const restored = new GameStateManager(); restored.applySaveData(g.buildSaveData());
    expect(restored.automationGoal).toBe('gnose');
  });

  it('reserves a nearby Avatar investment on the route to a distant Gnose objective', () => {
    const g = economy(); g.unlockedGnoseUpgrades.add('gn_automation');
    g.automationGoal = 'gnose'; g.automationGnoseTarget = 1000;
    g.faithPoints = 2.5e6;
    const followers = g.getTotalFollowersCount();
    expect(g.getFollowerReservation()?.label).toBe('Avatar Consagrado');
    g.runGnoseAutomation(); expect(g.getTotalFollowersCount()).toBe(followers);
    expect(g.upgradeIncarnation()).toBe(true);
    expect(g.automationGoal).toBe('gnose'); expect(g.automationGnoseTarget).toBe(1000);
  });

  it('strengthens cycle Fervor smoothly through nodes and clears that power at Ascensão', () => {
    const g = economy(); g.unlockedGnoseUpgrades.add('gn_init_faith'); g.unlockedGnoseUpgrades.add('gn_memoria_selos');
    g.addFervor(1e24);
    const resonance = g.getFervorResonanceMultiplier();
    expect(resonance).toBeGreaterThan(1);
    expect(g.buyFervorUpgrade(g.fervorUpgrades[0])).toBe(true);
    expect(g.getFervorResonanceMultiplier()).toBe(resonance);
    g.faithPoints = 1e15; g.performGnoseReset();
    expect(g.getFervorResonanceMultiplier()).toBe(1);
  });

  it('refunds a price reduction once when migrating, while larger prices never charge old owners', () => {
    const upgrade = GNOSE_UPGRADES.find(u => u.id === 'gn_automation')!;
    const price = upgrade.cost;
    try {
      upgrade.cost = 4;
      const g = economy(); g.gnosePoints = 7; g.totalGnoseEarned = 200;
      g.unlockedGnoseUpgrades.add(upgrade.id);
      const save = g.buildSaveData(); delete save.progressionRevision;
      const loaded = new GameStateManager(); loaded.applySaveData(save);
      expect(loaded.gnosePoints).toBe(11); expect(loaded.totalGnoseEarned).toBe(200);
      const again = new GameStateManager(); again.applySaveData(loaded.buildSaveData());
      expect(again.gnosePoints).toBe(11);
    } finally { upgrade.cost = price; }
  });

  it('offers bounded bulk Ritos through Memória using normal per-level costs', () => {
    const g = economy();
    expect(g.buyMaxFervorUpgrade(g.fervorUpgrades[0])).toBe(0);
    g.unlockedGnoseUpgrades.add('gn_memoria_selos');
    const manual = new GameStateManager(); manual.applySaveData(g.buildSaveData());
    const bulk = g.buyMaxFervorUpgrade(g.fervorUpgrades[0]);
    for (let i = 0; i < bulk; i++) expect(manual.buyFervorUpgrade(manual.fervorUpgrades[0])).toBe(true);
    expect(bulk).toBeGreaterThan(1); expect(bulk).toBeLessThanOrEqual(100);
    expect(g.fervorPoints).toBe(manual.fervorPoints);
    expect(g.getFaithPerSecond()).toBe(manual.getFaithPerSecond());
  });

  it('unlocks the Gnose seal at the threshold without charging it a second time', () => {
    const g = economy(); const seal = g.unlocks.find(u => u.id === 'unlock_gnose')!; seal.unlocked = false;
    g.faithPoints = 1e15 - 1; expect(g.buyUnlock(seal)).toBe(false);
    g.faithPoints = 1e15; expect(g.buyUnlock(seal)).toBe(true);
    expect(g.faithPoints).toBe(1e15); expect(g.getGnoseToGet()).toBe(1);
  });

  it('requires Gnosis Suprema explicitly for Solar', () => {
    const g = economy(); g.incarnationStage = 4; g.faithPoints = 1e100;
    expect(g.upgradeIncarnation()).toBe(false);
    g.unlockedGnoseUpgrades.add('gn_apotheosis'); expect(g.upgradeIncarnation()).toBe(true);
  });

  it('rewards miracles with thirty seconds of production without stock interest', () => {
    expect(calculateMiracleReward(1e30, 1, 100)).toBe(3000);
    expect(calculateMiracleReward(0, 1, 0)).toBe(30);
  });

  it.each([60, 600, 3600, 86400])('credits %s seconds exactly once with the online integrator', seconds => {
    const g = economy();
    for (const u of GNOSE_UPGRADES) g.unlockedGnoseUpgrades.add(u.id);
    g.autoFollowersEnabled = false;
    g.tick(0.35);
    const save = g.buildSaveData(), online = new GameStateManager(), offline = new GameStateManager();
    online.applySaveData(save); offline.applySaveData(save);
    const credit = new ElapsedTimeCredit(1000);
    const gains = credit.consume(offline, 1000 + seconds * 1000);
    for (let i = 0; i < seconds * 10; i++) { online.tick(0.1); online.checkAchievements(); }
    expect(gains.seconds).toBe(seconds);
    for (const resource of ['faithPoints', 'fervorPoints', 'relicPoints'] as const) expect(offline[resource] / online[resource]).toBeCloseTo(1, 8);
    expect(offline.fervorUpgrades.map(u => u.level)).toEqual(online.fervorUpgrades.map(u => u.level));
    expect(credit.consume(offline, 1000 + seconds * 1000).seconds).toBe(0);
    expect(offline.totalClicks).toBe(save.stats.totalClicks);
    expect(offline.defeatedBosses.size).toBe(0);
  }, 60000);

  it('limits absence to 24 hours and discards the excess once', () => {
    const credit = new ElapsedTimeCredit(1000), g = new GameStateManager();
    expect(credit.consume(g, 1000 + 48 * 3600000).seconds).toBe(86400);
    expect(credit.consume(g, 1000 + 48 * 3600000).seconds).toBe(0);
  }, 60000);
});
