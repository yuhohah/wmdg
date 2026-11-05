import { describe, expect, it } from 'vitest';
import { GameStateManager } from '../../core/GameState.js';
import { BOSS_DAMAGE_READINESS_THRESHOLD, BOSS_DEFENSE_READINESS_THRESHOLD, GNOSE_BOSSES } from '../../config/bosses.js';
import { GNOSE_UPGRADES } from '../../config/gnose.js';

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

// A cult near the first Guardian's targets, with room for each resource to grow.
function balancedCult(bossId = 'boss_anubis') {
  const g = eligibleCult();
  const req = GNOSE_BOSSES.find(b => b.id === bossId)!.requirements!;
  g.faithPoints = g.totalFaithAccumulated = 10 ** req.faithLog - 1;
  g.followers[0].count = req.followers;
  g.fervorPoints = 10 ** req.fervorLog - 1;
  g.fervorUpgrades[0].level = req.fervorLevels;
  g.relicPoints = 10 ** req.relicsLog - 1;
  g.relicUpgrades[0].level = req.relicLevels;
  g.incarnationStage = req.incarnationStage;
  g.totalGnoseEarned = Math.max(1, 10 ** req.gnoseLog - 1);
  GNOSE_UPGRADES.slice(0, req.gnoseNodes).forEach(u => g.unlockedGnoseUpgrades.add(u.id));
  return g;
}

function cultAtReadiness(readiness: number, bossId = 'boss_anubis') {
  const g = balancedCult(bossId);
  // Vary only Faith; the six-pillar geometric mean gives a precise boundary fixture.
  const boss = GNOSE_BOSSES.find(b => b.id === bossId)!;
  const current = g.getBossCombatBreakdown(bossId);
  const faithReadiness = current.pillarReadiness.faith * (readiness / current.cultReadiness) ** 6;
  g.faithPoints = g.totalFaithAccumulated = 10 ** (boss.requirements!.faithLog * faithReadiness) - 1;
  return g;
}

describe('Boss battle invariants', () => {
  it.each(['standard', 'anubis_scales', 'hades_chains', 'odin_raven', 'chaos_orbit'] as const)(
    'parries %s without damaging either combatant or triggering a phase shockwave', kind => {
      const g = preparedCult();
      g.startBossBattle('boss_anubis');
      const battle = g.activeBossBattle!;
      battle.altarIntegrity = 60;
      // Close enough to the phase boundary that the old parry damage triggered a shockwave.
      battle.bossHp = battle.bossMaxHp * 0.601;
      battle.activeRifts = [{
        id: 'parry', kind, groupId: 'attack', xPercent: 50, yPercent: 50,
        remainingSec: 2, maxSec: 2
      }];
      const hp = battle.bossHp;
      const result = g.clickBossRift('parry');
      expect(result.shattered).toBe(true);
      expect(result.damage).toBe(0);
      expect(result.victory).toBe(false);
      expect(battle.bossHp).toBe(hp);
      expect(battle.altarIntegrity).toBe(60);
      expect(battle.phase).toBe(1);
      expect(battle.activeRifts).toHaveLength(0);
      expect(battle.sphereCharge).toBe(25);
      expect(battle.comboStreak).toBe(1);
    }
  );

  it.each(GNOSE_BOSSES)('enforces both readiness thresholds against $name', boss => {
    for (const threshold of [BOSS_DAMAGE_READINESS_THRESHOLD, BOSS_DEFENSE_READINESS_THRESHOLD]) {
      const below = cultAtReadiness(threshold - 1e-6, boss.id).getBossCombatBreakdown(boss.id);
      const above = cultAtReadiness(threshold + 1e-6, boss.id).getBossCombatBreakdown(boss.id);
      expect(below.cultReadiness).toBeCloseTo(threshold - 1e-6, 8);
      expect(above.cultReadiness).toBeCloseTo(threshold + 1e-6, 8);
      if (threshold === BOSS_DAMAGE_READINESS_THRESHOLD) {
        expect(below.canDamageBoss).toBe(false);
        expect(below.clickDamage).toBe(0);
        expect(below.passiveDps).toBe(0);
        expect(below.riftDamage).toBe(0);
        expect(below.fulgorDamage).toBe(0);
        expect(above.canDamageBoss).toBe(true);
        expect(above.clickDamage).toBeGreaterThan(0);
      } else {
        expect(below.canWithstandBoss).toBe(false);
        expect(below.altarDamageOnMiss).toBe(100);
        expect(below.altarPressurePerSec).toBeGreaterThanOrEqual(25);
        expect(above.canWithstandBoss).toBe(true);
        expect(above.altarDamageOnMiss).toBeLessThan(100);
        expect(above.altarPressurePerSec).toBeLessThan(25);
      }
    }
  });

  it.each(['faith', 'followers', 'fervor', 'relics', 'incarnation', 'gnose', 'achievements'] as const)(
    'improves click damage and Sphere protection when %s develops', resource => {
      const g = balancedCult();
      const before = g.getBossCombatBreakdown();
      if (resource === 'faith') g.faithPoints = g.totalFaithAccumulated = 1e18;
      if (resource === 'followers') g.followers[0].count += 50;
      if (resource === 'fervor') g.fervorPoints *= 100;
      if (resource === 'relics') g.relicPoints *= 100;
      if (resource === 'incarnation') g.incarnationStage++;
      if (resource === 'gnose') g.totalGnoseEarned += 10;
      if (resource === 'achievements') g.achievements[0].unlocked = true;
      const after = g.getBossCombatBreakdown();
      expect(after.clickDamage).toBeGreaterThan(before.clickDamage);
      expect(after.altarDamageOnMiss).toBeLessThan(before.altarDamageOnMiss);
      expect(after.altarPressurePerSec).toBeLessThan(before.altarPressurePerSec);
    }
  );

  it('cannot replace a missing resource with extreme production or bypass damage thresholds with special attacks', () => {
    const g = balancedCult('boss_tiamat');
    g.relicPoints = g.totalRelicsGenerated = g.bestRelicsToGet = 0;
    g.relicUpgrades.forEach(u => { u.level = 0; });
    g.followers[0].count = 1e20;
    g.faithPoints = g.totalFaithAccumulated = 1e100;
    g.defeatedBosses.add('boss_tiamat');
    expect(g.startBossBattle('boss_tiamat', { isRematch: true })).toBe(true);
    const battle = g.activeBossBattle!;
    const hp = battle.bossHp;
    expect(g.getFaithPerSecond()).toBeGreaterThan(battle.bossMaxHp);
    expect(g.getBossCombatBreakdown().canDamageBoss).toBe(false);
    expect(g.addClick(() => 0).bossClickDamage).toBe(0); // Critical hits also respect the threshold.
    battle.sphereCharge = 100;
    expect(g.triggerSphereFulgor().damage).toBe(0);
    battle.activeRifts = [0, 1, 2].map(slot => ({
      id: `orbit-${slot}`, kind: 'chaos_orbit', groupId: 'orbit',
      xPercent: 50, yPercent: 50, remainingSec: 1, maxSec: 1
    }));
    for (const id of battle.activeRifts.map(r => r.id)) expect(g.clickBossRift(id).damage).toBe(0);
    expect(battle.bossHp).toBe(hp);
    g.tick(0.1);
    expect(battle.bossHp).toBe(hp);
  });

  it('loses an underprepared Sphere to pressure even while every rift is parried', () => {
    const g = eligibleCult();
    expect(g.startBossBattle('boss_anubis')).toBe(true);
    let elapsed = 0;
    while (g.activeBossBattle && elapsed < 4) {
      g.spawnBossRift({ forceStandard: true });
      g.clickBossRift(g.activeBossBattle.activeRifts[0].id);
      g.tick(0.1);
      elapsed += 0.1;
    }
    expect(g.activeBossBattle).toBeNull();
    expect(g.isBossDefeated('boss_anubis')).toBe(false);
    expect(elapsed).toBeLessThanOrEqual(4);
  });

  it('makes even a reduced special-attack miss lethal below the defense threshold', () => {
    const g = eligibleCult();
    g.startBossBattle('boss_anubis');
    g.activeBossBattle!.activeRifts = [{
      id: 'scales', kind: 'anubis_scales', xPercent: 50, yPercent: 50,
      remainingSec: 0.01, maxSec: 1
    }];
    g.tick(0.02);
    expect(g.activeBossBattle).toBeNull();
    expect(g.isBossDefeated('boss_anubis')).toBe(false);
  });

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
    const g = balancedCult();
    const before = g.getBossCombatBreakdown();
    if (resource === 'faith') g.totalFaithAccumulated = 1e18;
    if (resource === 'fervor') g.totalFervorGenerated = 1e12;
    if (resource === 'relics') g.totalRelicsGenerated = 1e9;
    const after = g.getBossCombatBreakdown();
    expect(after.passiveDps).toBeGreaterThan(before.passiveDps);
    expect(after.clickDamage).toBeGreaterThan(before.clickDamage);
    expect(after.riftDamage).toBe(0);
    if (resource !== 'faith') expect(after.altarDamageOnMiss).toBeLessThan(before.altarDamageOnMiss);
    expect(g.startBossBattle('boss_anubis')).toBe(true);
    const hp = g.activeBossBattle!.bossHp;
    g.tick(1);
    expect((hp - g.activeBossBattle!.bossHp) / hp).toBeCloseTo(after.passiveHpFractionPerSec, 10);
  });

  it('holds combat damage, rifts, and sphere clicks when awaitProcession is true until beginBossCombat is called', () => {
    const g = preparedCult();
    expect(g.startBossBattle('boss_anubis', { awaitProcession: true })).toBe(true);
    const initialHp = g.activeBossBattle!.bossHp;
    const initialIntegrity = g.activeBossBattle!.altarIntegrity;

    g.tick(15);
    expect(g.addClick(() => 1).bossClickDamage).toBe(0);
    expect(g.activeBossBattle!.bossHp).toBe(initialHp);
    expect(g.activeBossBattle!.altarIntegrity).toBe(initialIntegrity);
    expect(g.activeBossBattle!.activeRifts).toHaveLength(0);

    g.beginBossCombat();
    g.tick(1);
    expect(g.activeBossBattle!.bossHp).toBeLessThan(initialHp);
    expect(g.addClick(() => 1).bossClickDamage).toBeGreaterThan(0);
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
    const normal = balancedCult(), accelerated = balancedCult();
    normal.startBossBattle('boss_anubis');
    accelerated.startBossBattle('boss_anubis');
    for (let i = 0; i < 60; i++) normal.tick(0.1);
    accelerated.tick(6);
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
    expect(b.passiveDps).toBeLessThanOrEqual(1e18 * 0.018);
    expect(b.clickDamage).toBeLessThanOrEqual(1e18 * 0.0045);
    expect(b.riftDamage).toBeLessThanOrEqual(1e18 * 0.085);
  });

  it('limits combat pulses while continuing to grant faith for ordinary sphere clicks', () => {
    const g = balancedCult(); g.startBossBattle('boss_anubis');
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

  it('gates Hades and Odin behind Tier II and Tier III Gnose nodes', () => {
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

  it('escalates boss phases as HP drops, applies lethal 15% and 30% phase shockwaves, and tracks rift combo streaks', () => {
    const g = balancedCult();
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

    // Consecutive parries build the combo without dealing damage
    g.spawnBossRift();
    const secondRes = g.clickBossRift(battle.activeRifts[0].id);
    expect(secondRes.shattered).toBe(true);
    expect(firstRes.damage).toBe(0);
    expect(secondRes.damage).toBe(0);
    expect(battle.comboStreak).toBe(2);

    // Missing a rift resets comboStreak
    g.spawnBossRift();
    g.tick(3);
    expect(battle.comboStreak).toBe(0);

    // Restore Integrity to 100% and verify Phase II (-15%) and Phase III (-30%) shockwaves
    battle.altarIntegrity = 100;
    battle.activeMiracle = null;
    battle.bossHp = battle.bossMaxHp * 0.55;
    g.tick(0.1);
    expect(battle.phase).toBe(2);
    expect(battle.altarIntegrity).toBeLessThanOrEqual(85);
    expect(battle.altarIntegrity).toBeGreaterThan(84);
    expect(battle.activeMiracle).not.toBeNull();
    expect(battle.activeMiracle!.maxSec).toBe(1.5);

    battle.activeMiracle = null;
    const integrityBeforePhase3 = battle.altarIntegrity;
    battle.bossHp = battle.bossMaxHp * 0.20;
    g.tick(0.1);
    expect(battle.phase).toBe(3);
    expect(battle.altarIntegrity).toBeLessThanOrEqual(integrityBeforePhase3 - 30);
    expect(battle.activeMiracle).not.toBeNull();

    battle.activeRifts = [];
    g.spawnBossRift({ forceStandard: true });
    expect(battle.activeRifts[0].maxSec).toBeLessThan(phase1Window);
  });

  it('makes Phase II (15%) and Phase III (30%) shockwaves truly lethal when Sphere Integrity is low', () => {
    const g = preparedCult();
    g.startBossBattle('boss_anubis');
    const battle = g.activeBossBattle!;
    battle.altarIntegrity = 12;
    battle.bossHp = battle.bossMaxHp * 0.58;
    g.tick(0.05);
    expect(g.activeBossBattle).toBeNull();
    expect(g.isBossDefeated('boss_anubis')).toBe(false);
    expect(g.bossCurseTimerSec).toBeGreaterThan(0);
  });

  it('enforces the Tactical Triad: Sphere Fulgor Divino (pure attack), APARAR (no heal), and Faithful Miracle (1.5s window, sole +10% heal)', () => {
    const g = preparedCult();
    g.startBossBattle('boss_anubis');
    const battle = g.activeBossBattle!;
    battle.altarIntegrity = 60;

    // 1. APARAR charges the Sphere (+25%) without changing either combatant's health
    g.spawnBossRift({ forceStandard: true });
    const parryRes = g.clickBossRift(battle.activeRifts[0].id);
    expect(parryRes.shattered).toBe(true);
    expect(battle.altarIntegrity).toBe(60);
    expect(battle.sphereCharge).toBe(25);

    // 2. Boss clicks charge the Sphere (+8% per hit)
    battle.sphereCooldownSec = 0;
    g.addClick(() => 1);
    expect(battle.sphereCharge).toBe(33);

    // 3. At 100% charge, Fulgor Divino deals ~10% max HP damage and NEVER heals Sphere Integrity
    battle.sphereCharge = 100;
    const hpBeforeFulgor = battle.bossHp;
    const fulgorRes = g.triggerSphereFulgor();
    expect(fulgorRes.triggered).toBe(true);
    expect(fulgorRes.damage).toBeCloseTo(g.getBossCombatBreakdown('boss_anubis').fulgorDamage, 2);
    expect(battle.bossHp).toBeCloseTo(hpBeforeFulgor - fulgorRes.damage, 2);
    expect(battle.sphereCharge).toBe(0);
    expect(battle.altarIntegrity).toBe(60);

    // 4. Faithful Miracle on the wheel has a 1.5s window and is the SOLE source of +10% healing
    g.spawnBossMiracle(2);
    expect(battle.activeMiracle).not.toBeNull();
    expect(battle.activeMiracle!.maxSec).toBe(1.5);
    expect(battle.activeMiracle!.remainingSec).toBe(1.5);

    const miracleRes = g.clickBossMiracle();
    expect(miracleRes.triggered).toBe(true);
    expect(miracleRes.healed).toBe(10);
    expect(battle.altarIntegrity).toBe(70);
    expect(battle.activeMiracle).toBeNull();

    // Unclicked Miracle expires after 1.5s
    g.spawnBossMiracle(4);
    g.tick(1.6);
    expect(g.activeBossBattle!.activeMiracle).toBeNull();
  });

  describe('Anubis numbered scales', () => {
    function scalesBattle() {
      const g = preparedCult();
      g.startBossBattle('boss_anubis');
      const battle = g.activeBossBattle!;
      g.spawnBossRift({ forceSpecial: true });
      const [lower, higher] = [...battle.activeRifts].sort((a, b) => a.scaleValue! - b.scaleValue!);
      return { g, battle, lower, higher };
    }

    it('spawns two distinct positive numbers and varies which side has the larger number', () => {
      const { g, battle, lower, higher } = scalesBattle();
      expect(lower.scaleValue).toBeGreaterThan(0);
      expect(higher.scaleValue).toBeGreaterThan(lower.scaleValue!);
      expect(lower.slotIndex).not.toBe(higher.slotIndex);
      battle.activeRifts = [];
      g.spawnBossRift({ forceSpecial: true });
      const nextHigher = battle.activeRifts.reduce((a, b) => a.scaleValue! > b.scaleValue! ? a : b);
      expect(nextHigher.slotIndex).not.toBe(higher.slotIndex);
    });

    it.each([false, true])('deals the proper penalty when higher was clicked first: %s', higherFirst => {
      const { g, battle, lower, higher } = scalesBattle();
      const hp = battle.bossHp;
      const baseDamage = g.getBossCombatBreakdown().altarDamageOnMiss;
      if (higherFirst) {
        g.clickBossRift(higher.id);
        expect(battle.altarIntegrity).toBe(100);
      }
      const result = g.clickBossRift(lower.id);
      const multiplier = higherFirst ? 3 : 2;
      expect(result.shattered).toBe(false);
      expect(result.scaleDamageMultiplier).toBe(multiplier);
      expect(result.altarDamageTaken).toBeCloseTo(baseDamage * multiplier);
      expect(battle.altarIntegrity).toBeCloseTo(100 - baseDamage * multiplier);
      expect(battle.bossHp).toBe(hp);
      expect(battle.activeRifts).toHaveLength(0);
      expect(battle.comboStreak).toBe(0);
      const integrity = battle.altarIntegrity;
      expect(g.clickBossRift(lower.id).shattered).toBe(false);
      expect(g.clickBossRift(higher.id).shattered).toBe(false);
      expect(battle.altarIntegrity).toBe(integrity);
    });

    it('blocks with only the higher number and lets the lower expire harmlessly', () => {
      const { g, battle, lower, higher } = scalesBattle();
      const control = scalesBattle();
      control.battle.activeRifts = [];
      const hp = battle.bossHp;
      expect(g.clickBossRift(higher.id).shattered).toBe(true);
      expect(battle.bossHp).toBe(hp);
      expect(battle.altarIntegrity).toBe(100);
      expect(battle.sphereCharge).toBe(25);
      const duration = lower.maxSec + 0.01;
      g.tick(duration);
      control.g.tick(duration);
      expect(battle.altarIntegrity).toBe(control.battle.altarIntegrity);
      expect(battle.riftsMissed).toBe(0);
      expect(battle.comboStreak).toBe(1);
      expect(battle.activeRifts.some(r => r.id === lower.id)).toBe(false);
    });

    it('charges a single normal miss when neither number is selected', () => {
      const { g, battle, lower } = scalesBattle();
      const control = scalesBattle();
      control.battle.activeRifts = [];
      const baseDamage = g.getBossCombatBreakdown().altarDamageOnMiss;
      g.tick(lower.maxSec + 0.01);
      control.g.tick(lower.maxSec + 0.01);
      expect(battle.riftsMissed).toBe(1);
      expect(battle.altarIntegrity).toBeCloseTo(control.battle.altarIntegrity - baseDamage);
    });

    it('ends the battle when a wrong choice breaks the Sphere', () => {
      const { g, battle, lower } = scalesBattle();
      battle.altarIntegrity = 1;
      g.clickBossRift(lower.id);
      expect(g.activeBossBattle).toBeNull();
      expect(g.isBossDefeated('boss_anubis')).toBe(false);
      expect(g.bossCurseTimerSec).toBeGreaterThan(0);
    });
  });

  it('implements all 4 Guardian signature Attack 2 patterns in Phases II & III', () => {
    const g = preparedCult();
    GNOSE_UPGRADES.forEach(u => g.unlockedGnoseUpgrades.add(u.id));
    g.defeatedBosses.add('boss_anubis');
    g.defeatedBosses.add('boss_cronos');
    g.defeatedBosses.add('boss_odin');

    // 1. Anubis: choose only the larger numbered scale.
    g.startBossBattle('boss_anubis', { isRematch: true });
    g.activeBossBattle!.bossHp = g.activeBossBattle!.bossMaxHp * 0.5;
    g.activeBossBattle!.highestPhaseShocked = 2;
    g.spawnBossRift({ forceSpecial: true });
    const scales = [...g.activeBossBattle!.activeRifts].sort((a, b) => a.scaleValue! - b.scaleValue!);
    expect(scales).toHaveLength(2);
    expect(scales[0].scaleValue).toBeLessThan(scales[1].scaleValue!);
    expect(g.clickBossRift(scales[1].id).shattered).toBe(true);
    expect(g.activeBossBattle!.activeRifts).toHaveLength(1);
    g.retreatBossBattle();

    // 2. Hades (hades_chains): 2 crimson shackles reduce player click damage by 50% until broken
    g.startBossBattle('boss_cronos', { isRematch: true });
    g.activeBossBattle!.bossHp = g.activeBossBattle!.bossMaxHp * 0.5;
    g.activeBossBattle!.highestPhaseShocked = 2;
    const baseClick = g.getBossCombatBreakdown('boss_cronos').clickDamage;
    g.spawnBossRift({ forceSpecial: true });
    expect(g.activeBossBattle!.activeRifts).toHaveLength(2);
    expect(g.activeBossBattle!.activeRifts[0].kind).toBe('hades_chains');
    const chainedClick = g.getBossCombatBreakdown('boss_cronos').clickDamage;
    expect(chainedClick).toBeCloseTo(baseClick * 0.5, 2);
    const chainIds = g.activeBossBattle!.activeRifts.map(r => r.id);
    g.clickBossRift(chainIds[0]);
    expect(g.getBossCombatBreakdown('boss_cronos').clickDamage).toBeCloseTo(baseClick * 0.5, 2);
    const chainBreak = g.clickBossRift(chainIds[1]);
    expect(chainBreak.specialBonusTriggered).toBe(true);
    expect(g.getBossCombatBreakdown('boss_cronos').clickDamage).toBeCloseTo(baseClick, 2);
    g.retreatBossBattle();

    // 3. Odin (odin_raven): intercepting the raven early delays the next attack
    g.startBossBattle('boss_odin', { isRematch: true });
    g.activeBossBattle!.bossHp = g.activeBossBattle!.bossMaxHp * 0.5;
    g.activeBossBattle!.highestPhaseShocked = 2;
    g.spawnBossRift({ forceSpecial: true });
    expect(g.activeBossBattle!.activeRifts).toHaveLength(1);
    expect(g.activeBossBattle!.activeRifts[0].kind).toBe('odin_raven');
    const timerBeforeRaven = g.activeBossBattle!.riftSpawnTimerSec;
    const ravenRes = g.clickBossRift(g.activeBossBattle!.activeRifts[0].id);
    expect(ravenRes.specialBonusTriggered).toBe(true);
    expect(ravenRes.damage).toBe(0);
    expect(g.activeBossBattle!.riftSpawnTimerSec).toBeGreaterThan(timerBeforeRaven + 1.0);
    g.retreatBossBattle();

    // 4. Primordial Chaos (chaos_orbit): safely intercept all 3 orbital seals
    g.startBossBattle('boss_tiamat');
    g.activeBossBattle!.bossHp = g.activeBossBattle!.bossMaxHp * 0.5;
    g.activeBossBattle!.highestPhaseShocked = 2;
    g.spawnBossRift({ forceSpecial: true });
    expect(g.activeBossBattle!.activeRifts).toHaveLength(3);
    expect(g.activeBossBattle!.activeRifts[0].kind).toBe('chaos_orbit');
    const orbitIds = g.activeBossBattle!.activeRifts.map(r => r.id);
    const d1 = g.clickBossRift(orbitIds[0]).damage;
    const d2 = g.clickBossRift(orbitIds[1]).damage;
    const d3 = g.clickBossRift(orbitIds[2]);
    expect(d3.specialBonusTriggered).toBe(true);
    expect([d1, d2, d3.damage]).toEqual([0, 0, 0]);
    g.retreatBossBattle();
  });

  it('supports rematches (Relembrar Duelo) without curse on defeat, without duplicate rewards, and records best subjugation time', () => {
    const g = preparedCult();
    g.defeatedBosses.add('boss_anubis');
    expect(g.canChallengeBoss('boss_anubis')).toBe(false);
    expect(g.canChallengeBoss('boss_anubis', { isRematch: true })).toBe(true);

    // Rematch defeat does NOT apply Divine Curse
    expect(g.startBossBattle('boss_anubis', { isRematch: true })).toBe(true);
    g.activeBossBattle!.altarIntegrity = 1;
    g.spawnBossRift({ forceStandard: true });
    g.tick(5);
    expect(g.activeBossBattle).toBeNull();
    expect(g.bossCurseTimerSec).toBe(0);
    expect(g.isBossDefeated('boss_anubis')).toBe(true);
    expect(g.getBossRewardsMultiplier()).toBe(1.5);

    // Rematch victory records best subjugation time and persists across save/load
    expect(g.startBossBattle('boss_anubis', { isRematch: true })).toBe(true);
    g.tick(4.2);
    g.activeBossBattle!.bossHp = 1;
    g.activeBossBattle!.sphereCooldownSec = 0;
    g.addClick(() => 1);
    expect(g.activeBossBattle).toBeNull();
    const bestTime = g.getBossBestTimeSec('boss_anubis');
    expect(bestTime).not.toBeNull();
    expect(bestTime!).toBeGreaterThanOrEqual(4.0);
    expect(g.getBossRewardsMultiplier()).toBe(1.5);

    const restored = new GameStateManager();
    restored.applySaveData(g.buildSaveData());
    expect(restored.getBossBestTimeSec('boss_anubis')).toBe(bestTime);
  });

  it('scales cultReadiness, pillar diagnostics, damage, and battle time estimates with external game progression', () => {
    const weak = eligibleCult();
    const strong = preparedCult();
    strong.achievements.slice(0, 10).forEach(a => { a.unlocked = true; });
    strong.unlockedGnoseUpgrades.add('gn_init_faith');
    strong.unlockedGnoseUpgrades.add('gn_memoria_selos');

    const bWeak = weak.getBossCombatBreakdown('boss_anubis');
    const bStrong = strong.getBossCombatBreakdown('boss_anubis');

    expect(bStrong.cultReadiness).toBeGreaterThan(bWeak.cultReadiness);
    expect(bWeak.weakPillars.length).toBeGreaterThan(0);
    expect(bWeak.lowestTwoPillars).toHaveLength(2);
    expect(bWeak.lowestTwoPillars[0].readiness).toBeLessThanOrEqual(bWeak.lowestTwoPillars[1].readiness);
    expect(bStrong.altarPressurePerSec).toBeLessThan(bWeak.altarPressurePerSec);
    expect(bStrong.achievementsBonus).toBeGreaterThan(bWeak.achievementsBonus);
    expect(bStrong.passiveDps).toBeGreaterThan(bWeak.passiveDps);
    expect(bStrong.estimatedPassiveVictorySec).toBeLessThan(bWeak.estimatedPassiveVictorySec);
    expect(bStrong.estimatedAltarSurvivalSec).toBeGreaterThan(bWeak.estimatedAltarSurvivalSec);
  });
});
