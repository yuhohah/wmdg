import { describe, expect, it } from 'vitest';
import { GameStateManager } from '../../core/GameState.js';

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
});
