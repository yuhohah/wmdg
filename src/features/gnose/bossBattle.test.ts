import { describe, expect, it } from 'vitest';
import { GameStateManager } from '../../core/GameState.js';
import { GNOSE_BOSSES } from '../../config/bosses.js';

function eligibleCult() {
  const g = new GameStateManager();
  g.totalGnoseEarned = 1;
  return g;
}

function preparedCult() {
  const g = eligibleCult();
  g.followers[0].count = 1000;
  g.faithPoints = g.totalFaithAccumulated = 1e15;
  g.fervorPoints = 1e9;
  g.fervorUpgrades.forEach(u => { u.level = 100; });
  g.relicUpgrades.forEach(u => { u.level = 20; });
  g.relicPoints = 10000;
  g.incarnationStage = 3;
  return g;
}

describe('Boss battle invariants', () => {
  it('presents Primordial Chaos as the final boss while preserving legacy victories and rewards', () => {
    const boss = GNOSE_BOSSES.at(-1)!;
    expect(boss.name).toBe('Caos Primordial');
    expect(boss.unlocksTier).toBe('endgame');
    const g = eligibleCult(); g.defeatedBosses.add('boss_tiamat');
    g.achievements.find(a => a.id === 'ach_boss_tiamat')!.unlocked = true;
    const restored = new GameStateManager(); restored.applySaveData(g.buildSaveData());
    expect(restored.isBossDefeated(boss.id)).toBe(true);
    expect(restored.getBossRewardsMultiplier()).toBe(10);
    expect(restored.canChallengeBoss(boss.id)).toBe(false);
    expect(restored.achievements.find(a => a.id === 'ach_boss_tiamat')!.unlocked).toBe(true);
  });

  it.each(['faith', 'fervor', 'relics'] as const)('keeps %s generated before the fight useful after its balance is spent', resource => {
    const g = eligibleCult();
    const before = g.getBossCombatBreakdown();
    if (resource === 'faith') g.totalFaithAccumulated = 1e18;
    if (resource === 'fervor') g.totalFervorGenerated = 1e12;
    if (resource === 'relics') g.totalRelicsGenerated = 1e9;
    const after = g.getBossCombatBreakdown();
    expect(after.passiveDps).toBeGreaterThan(before.passiveDps);
    expect(after.clickDamage).toBeGreaterThan(before.clickDamage);
    expect(after.riftDamage).toBeGreaterThan(before.riftDamage);
    if (resource !== 'faith') expect(after.altarDamageOnMiss).toBeLessThan(before.altarDamageOnMiss);
    expect(g.startBossBattle('boss_anubis')).toBe(true);
    const hp = g.activeBossBattle!.bossHp;
    g.tick(1);
    expect(g.activeBossBattle!.bossHp).toBeCloseTo(hp - after.passiveDps, -4);
  });

  it('counts production, offline credits and transmutations without losing history to spending or Ascension', () => {
    const g = eligibleCult(); g.unlocks.forEach(u => { u.unlocked = true; });
    const gains = g.tick(2);
    expect(g.totalFervorGenerated).toBeCloseTo(gains.fervorGained, 7);
    expect(g.totalRelicsGenerated).toBeCloseTo(gains.relicGained, 7);
    g.addFervor(1000); g.addRelics(500); // Same credit path as offline production.
    const fervorHistory = g.totalFervorGenerated;
    expect(g.buyFervorUpgrade(g.fervorUpgrades[0])).toBe(true);
    expect(g.totalFervorGenerated).toBe(fervorHistory);
    g.faithPoints = 1e18;
    const relicHistory = g.totalRelicsGenerated;
    const transmutation = g.convertFaithToRelics();
    expect(transmutation.success).toBe(true);
    expect(g.totalRelicsGenerated).toBe(relicHistory + transmutation.gained);
    g.faithPoints = 1e18;
    const history = [g.totalFervorGenerated, g.totalRelicsGenerated];
    expect(g.performGnoseReset().success).toBe(true);
    expect(g.fervorPoints).toBe(0);
    expect(g.relicPoints).toBe(0);
    expect([g.totalFervorGenerated, g.totalRelicsGenerated]).toEqual(history);
    const restored = new GameStateManager(); restored.applySaveData(g.buildSaveData());
    expect([restored.totalFervorGenerated, restored.totalRelicsGenerated]).toEqual(history);
    restored.applySaveData(restored.buildSaveData());
    expect([restored.totalFervorGenerated, restored.totalRelicsGenerated]).toEqual(history);
    restored.resetToDefaults();
    expect([restored.totalFervorGenerated, restored.totalRelicsGenerated]).toEqual([0, 0]);
  });

  it('loads saves without production counters from their known balances and best transmutation', () => {
    const g = eligibleCult(); g.unlocks.forEach(u => { u.unlocked = true; });
    g.fervorPoints = 1500; g.relicPoints = 300; g.bestRelicsToGet = 500;
    const save = g.buildSaveData();
    delete save.stats.totalFervorGenerated; delete save.stats.totalRelicsGenerated;
    const restored = new GameStateManager(); restored.applySaveData(save);
    expect(restored.totalFervorGenerated).toBe(1500);
    expect(restored.totalRelicsGenerated).toBe(500);
    expect(restored.buildSaveData().stats.totalRelicsGenerated).toBe(500);
  });

  it('rejects a second challenge without changing the current fight', () => {
    const g = eligibleCult();
    g.startBossBattle('boss_anubis');
    g.activeBossBattle!.altarIntegrity = 25;
    const battle = g.activeBossBattle;
    expect(g.startBossBattle('boss_anubis')).toBe(false);
    expect(g.activeBossBattle).toBe(battle);
    expect(battle!.altarIntegrity).toBe(25);
  });

  it('clears transient combat when importing another save without awarding a victory or curse', () => {
    const g = eligibleCult();
    g.startBossBattle('boss_anubis');
    g.applySaveData(new GameStateManager().buildSaveData());
    expect(g.activeBossBattle).toBeNull();
    expect(g.defeatedBosses.size).toBe(0);
    expect(g.bossCurseTimerSec).toBe(0);
  });

  it('rejects Ascension while fighting without resetting resources', () => {
    const g = eligibleCult();
    g.faithPoints = 1e18;
    g.startBossBattle('boss_anubis');
    expect(g.performGnoseReset().success).toBe(false);
    expect(g.faithPoints).toBe(1e18);
    expect(g.gnoseResets).toBe(0);
    expect(g.activeBossBattle).not.toBeNull();
  });

  it('processes intervening rifts equally at normal and accelerated speeds', () => {
    const normal = eligibleCult(), accelerated = eligibleCult();
    normal.startBossBattle('boss_anubis');
    accelerated.startBossBattle('boss_anubis');
    for (let i = 0; i < 100; i++) normal.tick(0.1);
    accelerated.tick(10);
    expect(accelerated.activeBossBattle!.riftsMissed).toBe(normal.activeBossBattle!.riftsMissed);
    expect(accelerated.activeBossBattle!.altarIntegrity).toBe(normal.activeBossBattle!.altarIntegrity);
    expect(accelerated.activeBossBattle!.bossHp).toBeCloseTo(normal.activeBossBattle!.bossHp, -4);
    expect(accelerated.activeBossBattle!.activeRifts).toHaveLength(normal.activeBossBattle!.activeRifts.length);
  });

  it('applies defeat before later passive damage can award a victory during a large tick', () => {
    const normal = eligibleCult(), accelerated = eligibleCult();
    normal.startBossBattle('boss_anubis'); accelerated.startBossBattle('boss_anubis');
    normal.activeBossBattle!.altarIntegrity = accelerated.activeBossBattle!.altarIntegrity = 1;
    normal.activeBossBattle!.bossHp = accelerated.activeBossBattle!.bossHp
      = normal.getBossCombatBreakdown().passiveDps * 4;
    normal.spawnBossRift(); accelerated.spawnBossRift();
    for (let i = 0; i < 100; i++) normal.tick(0.1);
    accelerated.tick(10);
    expect(accelerated.isBossDefeated('boss_anubis')).toBe(normal.isBossDefeated('boss_anubis'));
    expect(accelerated.isBossDefeated('boss_anubis')).toBe(false);
    expect(accelerated.bossCurseTimerSec).toBeCloseTo(normal.bossCurseTimerSec, 6);
  });

  it('reports final damage percentages and caps extreme production as well as percentage damage', () => {
    const g = eligibleCult(); g.followers[0].count = 1e20;
    const b = g.getBossCombatBreakdown('boss_anubis');
    expect(b.passiveHpFractionPerSec).toBeCloseTo(b.passiveDps / 1e18, 8);
    expect(b.clickHpFraction).toBeCloseTo(b.clickDamage / 1e18, 8);
    expect(b.riftHpFraction).toBeCloseTo(b.riftDamage / 1e18, 8);
    expect(b.passiveDps).toBeLessThanOrEqual(1e18 * 0.025);
    expect(b.clickDamage).toBeLessThanOrEqual(1e18 * 0.006);
    expect(b.riftDamage).toBeLessThanOrEqual(1e18 * 0.12);
  });

  it('limits combat pulses while continuing to grant faith for ordinary sphere clicks', () => {
    const g = eligibleCult(); g.startBossBattle('boss_anubis');
    expect(g.addClick(() => 1).bossClickDamage).toBeGreaterThan(0);
    const faith = g.faithPoints;
    const blocked = g.addClick(() => 1);
    expect(blocked.bossClickDamage).toBe(0);
    expect(g.faithPoints).toBeGreaterThan(faith);
    g.tick(0.2);
    expect(g.addClick(() => 1).bossClickDamage).toBeGreaterThan(0);
  });

  it('keeps passive victory viable for a prepared cult while rewarding active defense', () => {
    const fight = (active: boolean) => {
      const g = preparedCult(); g.startBossBattle('boss_anubis');
      let elapsed = 0, rifts = 0;
      while (g.activeBossBattle && elapsed < 120) {
        g.tick(0.1); elapsed += 0.1;
        if (active && g.activeBossBattle) {
          const rift = g.activeBossBattle.activeRifts.find(r => r.maxSec - r.remainingSec >= 0.8);
          if (rift) { g.clickBossRift(rift.id); rifts++; }
          else g.addClick(() => 1);
        }
      }
      expect(g.isBossDefeated('boss_anubis')).toBe(true);
      return { elapsed, rifts };
    };
    const passive = fight(false), active = fight(true);
    expect(passive.elapsed).toBeGreaterThanOrEqual(30);
    expect(passive.elapsed).toBeLessThanOrEqual(90);
    expect(active.elapsed).toBeGreaterThanOrEqual(8);
    expect(active.elapsed).toBeLessThan(passive.elapsed * 0.75);
    expect(active.rifts).toBeGreaterThan(0);
  });

  it('gates Cronos and Odin behind Tier II and Tier III Gnose nodes', () => {
    const g = eligibleCult();
    g.defeatedBosses.add('boss_anubis');
    expect(g.canChallengeBoss('boss_cronos')).toBe(false);
    g.unlockedGnoseUpgrades.add('gn_followers_syn');
    expect(g.canChallengeBoss('boss_cronos')).toBe(false);
    g.unlockedGnoseUpgrades.add('gn_bencao_eterna');
    expect(g.canChallengeBoss('boss_cronos')).toBe(true);

    g.defeatedBosses.add('boss_cronos');
    expect(g.canChallengeBoss('boss_odin')).toBe(false);
    g.unlockedGnoseUpgrades.add('gn_followers_cubic');
    expect(g.canChallengeBoss('boss_odin')).toBe(false);
    g.unlockedGnoseUpgrades.add('gn_gnose_mult');
    expect(g.canChallengeBoss('boss_odin')).toBe(true);
  });

  it('escalates boss phases as HP drops and tracks rift combo streaks', () => {
    const g = eligibleCult();
    g.startBossBattle('boss_anubis');
    const battle = g.activeBossBattle!;
    expect(battle.phase).toBe(1);
    expect(battle.comboStreak).toBe(0);

    // Phase 1 rift window
    g.spawnBossRift();
    const phase1Window = battle.activeRifts[0].maxSec;
    const firstRes = g.clickBossRift(battle.activeRifts[0].id);
    expect(firstRes.shattered).toBe(true);
    expect(battle.comboStreak).toBe(1);

    // Second consecutive rift deals higher damage due to comboStreak
    g.spawnBossRift();
    const secondRes = g.clickBossRift(battle.activeRifts[0].id);
    expect(secondRes.shattered).toBe(true);
    expect(secondRes.damage).toBeGreaterThan(firstRes.damage);
    expect(battle.comboStreak).toBe(2);

    // Missing a rift resets comboStreak
    g.spawnBossRift();
    g.tick(10);
    expect(battle.comboStreak).toBe(0);

    // Drop HP to Phase 2 (<= 60%) and Phase 3 (<= 25%)
    battle.bossHp = battle.bossMaxHp * 0.55;
    g.tick(0.1);
    expect(battle.phase).toBe(2);

    battle.bossHp = battle.bossMaxHp * 0.20;
    g.tick(0.1);
    expect(battle.phase).toBe(3);

    battle.activeRifts = [];
    g.spawnBossRift();
    expect(battle.activeRifts[0].maxSec).toBeLessThan(phase1Window);
  });

  it('scales cultReadiness, damage, and battle time estimates with external game progression', () => {
    const weak = eligibleCult();
    const strong = preparedCult();
    strong.achievements.slice(0, 10).forEach(a => { a.unlocked = true; });
    strong.unlockedGnoseUpgrades.add('gn_init_faith');
    strong.unlockedGnoseUpgrades.add('gn_memoria_selos');

    const bWeak = weak.getBossCombatBreakdown('boss_anubis');
    const bStrong = strong.getBossCombatBreakdown('boss_anubis');

    expect(bStrong.cultReadiness).toBeGreaterThan(bWeak.cultReadiness);
    expect(bStrong.achievementsBonus).toBeGreaterThan(bWeak.achievementsBonus);
    expect(bStrong.passiveDps).toBeGreaterThan(bWeak.passiveDps);
    expect(bStrong.estimatedPassiveVictorySec).toBeLessThan(bWeak.estimatedPassiveVictorySec);
    expect(bStrong.estimatedAltarSurvivalSec).toBeGreaterThan(bWeak.estimatedAltarSurvivalSec);
  });
});
