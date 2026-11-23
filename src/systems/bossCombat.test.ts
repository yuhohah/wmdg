import { describe, expect, it } from 'vitest';
import { GNOSE_UPGRADES } from '../config/gnose.js';
import {
  BOSS_ANUBIS_WRONG_SCALE_MULT,
  BOSS_CHAOS_SEAL_MISS_MULT,
  BOSS_CURSE_MAX_STACKS,
  BOSS_HADES_CHAIN_2_MISS_MULT,
  BOSS_SPECIAL_MISS_MULT,
  COMBAT_BOSSES,
} from '../config/bosses.js';
import { newDemiurge } from './demiurge.js';
import { RITUAL_MAX_PENALTY, ritualJudgement } from './demiurgeRitual.js';
import {
  calculateBossCombatBreakdown,
  clickBossRift,
  getBossRiftMissDamageMultiplier,
  shouldSpawnSpecialBossRift,
  spawnBossRift,
  startBossBattle,
  tickBossBattle,
  type BossCombatStateHost,
} from './bossCombat.js';

function createHost(overrides: Partial<BossCombatStateHost> = {}): BossCombatStateHost {
  const unlockedGnoseUpgrades = new Set<string>(
    overrides.unlockedGnoseUpgrades ?? GNOSE_UPGRADES.map((u) => u.id)
  );
  return {
    faithPoints: 1e40,
    totalFaithAccumulated: 1e40,
    demiurge: newDemiurge(),
    fervorPoints: 1e12,
    totalFervorGenerated: 1e12,
    relicPoints: 1e8,
    bestRelicsToGet: 1e8,
    totalRelicsGenerated: 1e8,
    incarnationStage: 3,
    incarnationBoostTimer: 0,
    gnosePoints: 1e9,
    totalGnoseEarned: 1e9,
    fervorUpgrades: [],
    relicUpgrades: [],
    achievements: [],
    unlockedGnoseUpgrades,
    defeatedBosses: new Set<string>(),
    maxCurseDefeatedBosses: new Set<string>(),
    bestBossTimesSec: {},
    bossCurseTimerSec: 0,
    bossCurseStacks: 0,
    bossCurseBossId: null,
    activeBossBattle: null,
    riftIdCounter: 0,
    miracleIdCounter: 0,
    getTotalFollowersCount: () => 25,
    getFaithPerSecond: () => 1e35,
    getFaithPerClick: () => 1e33,
    getFervorRatePerSecond: () => 1e8,
    getRelicsRatePerSecond: () => 1e6,
    isIncarnationUnlocked: () => true,
    isGnoseUnlocked: () => true,
    hasGnoseUpgrade: (id: string) => unlockedGnoseUpgrades.has(id),
    areMiraclesUnlocked: () => true,
    ...overrides,
  };
}

function startReadyBattle(bossId: string, overrides: Partial<BossCombatStateHost> = {}): BossCombatStateHost {
  const bossIndex = COMBAT_BOSSES.findIndex((b) => b.id === bossId);
  const priorBosses = new Set(COMBAT_BOSSES.slice(0, Math.max(0, bossIndex)).map((b) => b.id));
  const host = createHost({ defeatedBosses: priorBosses, ...overrides });
  const started = startBossBattle(host, bossId);
  expect(started).toBe(true);
  expect(host.activeBossBattle).not.toBeNull();
  host.activeBossBattle!.combatStarted = true;
  host.activeBossBattle!.activeRifts = [];
  return host;
}

describe('Boss phase-based attack schedule', () => {
  it('follows Phase 1 normal only, Phase 2 mixed, Phase 3 special only', () => {
    for (let wave = 1; wave <= 6; wave++) {
      expect(shouldSpawnSpecialBossRift(1, wave)).toBe(false);
      expect(shouldSpawnSpecialBossRift(3, wave)).toBe(true);
    }
    const phase2 = [1, 2, 3, 4].map((wave) => shouldSpawnSpecialBossRift(2, wave));
    expect(phase2).toContain(false);
    expect(phase2).toContain(true);
  });

  it('spawns only standard rifts in Phase 1, both in Phase 2, and only special rifts in Phase 3', () => {
    const host = startReadyBattle('boss_anubis');
    const battle = host.activeBossBattle!;

    // Phase 1 (>60% HP): normal only
    battle.bossHp = battle.bossMaxHp * 0.9;
    battle.attackWaveCounter = 0;
    const p1Kinds: string[] = [];
    for (let i = 0; i < 4; i++) {
      battle.activeRifts = [];
      spawnBossRift(host);
      p1Kinds.push(battle.activeRifts[0].kind ?? 'standard');
    }
    expect(p1Kinds).toEqual(['standard', 'standard', 'standard', 'standard']);

    // Phase 2 (25%..60% HP): both normal and special
    battle.bossHp = battle.bossMaxHp * 0.45;
    battle.attackWaveCounter = 0;
    const p2Kinds: string[] = [];
    for (let i = 0; i < 4; i++) {
      battle.activeRifts = [];
      spawnBossRift(host);
      p2Kinds.push(battle.activeRifts[0].kind ?? 'standard');
    }
    expect(p2Kinds).toContain('standard');
    expect(p2Kinds).toContain('anubis_scales');

    // Phase 3 (<=25% HP): special only
    battle.bossHp = battle.bossMaxHp * 0.2;
    battle.attackWaveCounter = 0;
    const p3Kinds: string[] = [];
    for (let i = 0; i < 4; i++) {
      battle.activeRifts = [];
      spawnBossRift(host);
      p3Kinds.push(battle.activeRifts[0].kind ?? 'standard');
    }
    expect(p3Kinds).toEqual(['anubis_scales', 'anubis_scales', 'anubis_scales', 'anubis_scales']);
  });
});

describe('Special boss attacks deal more damage than normal attacks', () => {
  it('multiplies Anubis scales timeout and wrong-pan damage above standard miss damage', () => {
    const host = startReadyBattle('boss_anubis');
    const battle = host.activeBossBattle!;
    const breakdown = calculateBossCombatBreakdown(host, 'boss_anubis');
    const standardDamage = breakdown.altarDamageOnMiss;

    // 1. Timeout on Anubis scales
    spawnBossRift(host, { forceSpecial: true });
    battle.altarIntegrity = 100;
    const dt = battle.activeRifts[0].remainingSec + 0.01;
    tickBossBattle(host, dt);
    const timeoutDamage = 100 - battle.altarIntegrity - breakdown.altarPressurePerSec * dt;
    expect(timeoutDamage).toBeCloseTo(standardDamage * BOSS_SPECIAL_MISS_MULT, 3);
    expect(timeoutDamage).toBeGreaterThan(standardDamage);
    expect(battle.lastMissWasSpecial).toBe(true);

    // 2. Clicking the lighter (wrong) pan
    battle.activeRifts = [];
    battle.altarIntegrity = 100;
    spawnBossRift(host, { forceSpecial: true });
    const [a, b] = battle.activeRifts;
    const wrongPan = (a.scaleValue ?? 0) < (b.scaleValue ?? 0) ? a : b;
    const res = clickBossRift(host, wrongPan.id);
    expect(res.scaleDamageMultiplier).toBe(BOSS_ANUBIS_WRONG_SCALE_MULT);
    expect(res.altarDamageTaken).toBeCloseTo(standardDamage * BOSS_ANUBIS_WRONG_SCALE_MULT, 3);
    expect(res.altarDamageTaken!).toBeGreaterThan(standardDamage);
  });

  it('multiplies Odin raven early-click and timeout damage above standard miss damage', () => {
    const host = startReadyBattle('boss_odin');
    const battle = host.activeBossBattle!;
    const breakdown = calculateBossCombatBreakdown(host, 'boss_odin');
    const standardDamage = breakdown.altarDamageOnMiss;

    // 1. Early click (outside green cue)
    spawnBossRift(host, { forceSpecial: true });
    const raven = battle.activeRifts[0];
    battle.altarIntegrity = 100;
    const earlyRes = clickBossRift(host, raven.id, undefined, raven.maxSec);
    expect(earlyRes.altarDamageTaken).toBeCloseTo(standardDamage * BOSS_SPECIAL_MISS_MULT, 3);
    expect(earlyRes.altarDamageTaken!).toBeGreaterThan(standardDamage);

    // 2. Timeout
    battle.activeRifts = [];
    battle.altarIntegrity = 100;
    spawnBossRift(host, { forceSpecial: true });
    const dt = battle.activeRifts[0].remainingSec + 0.01;
    tickBossBattle(host, dt);
    const timeoutDamage = 100 - battle.altarIntegrity - breakdown.altarPressurePerSec * dt;
    expect(timeoutDamage).toBeCloseTo(standardDamage * BOSS_SPECIAL_MISS_MULT, 3);
    expect(timeoutDamage).toBeGreaterThan(standardDamage);
  });

  it('deals heavier damage on unparried Hades chains and Chaos orbit seals than standard attacks', () => {
    // Hades (boss_cronos, 2 chains in Phase 2)
    const hadesHost = startReadyBattle('boss_cronos');
    const hadesBattle = hadesHost.activeBossBattle!;
    const hadesBreakdown = calculateBossCombatBreakdown(hadesHost, 'boss_cronos');
    const hadesStd = hadesBreakdown.altarDamageOnMiss;
    hadesBattle.bossHp = hadesBattle.bossMaxHp * 0.45;
    hadesBattle.phase = 2;
    hadesBattle.highestPhaseShocked = 2;
    spawnBossRift(hadesHost, { forceSpecial: true });
    expect(hadesBattle.activeRifts).toHaveLength(2);
    hadesBattle.altarIntegrity = 100;
    const hadesDt = Math.max(...hadesBattle.activeRifts.map((r) => r.remainingSec)) + 0.01;
    tickBossBattle(hadesHost, hadesDt);
    const hadesMiss = 100 - hadesBattle.altarIntegrity - hadesBreakdown.altarPressurePerSec * hadesDt;
    expect(hadesMiss).toBeCloseTo(hadesStd * BOSS_HADES_CHAIN_2_MISS_MULT * 2, 3);
    expect(hadesMiss).toBeGreaterThan(hadesStd);

    // Chaos (boss_tiamat, 3 orbiting seals)
    const chaosHost = startReadyBattle('boss_tiamat');
    const chaosBattle = chaosHost.activeBossBattle!;
    const chaosBreakdown = calculateBossCombatBreakdown(chaosHost, 'boss_tiamat');
    const chaosStd = chaosBreakdown.altarDamageOnMiss;
    chaosBattle.bossHp = chaosBattle.bossMaxHp * 0.45;
    chaosBattle.phase = 2;
    chaosBattle.highestPhaseShocked = 2;
    spawnBossRift(chaosHost, { forceSpecial: true });
    expect(chaosBattle.activeRifts).toHaveLength(3);
    chaosBattle.altarIntegrity = 100;
    const chaosDt = Math.max(...chaosBattle.activeRifts.map((r) => r.remainingSec)) + 0.01;
    tickBossBattle(chaosHost, chaosDt);
    const chaosMiss = 100 - chaosBattle.altarIntegrity - chaosBreakdown.altarPressurePerSec * chaosDt;
    expect(chaosMiss).toBeCloseTo(chaosStd * BOSS_CHAOS_SEAL_MISS_MULT * 3, 3);
    expect(chaosMiss).toBeGreaterThan(chaosStd);
  });

  it('deals increased Demiurge ritual sun penalty above standard miss damage', () => {
    expect(RITUAL_MAX_PENALTY).toBe(55);
    const sunEdge = ritualJudgement(1);
    expect(sunEdge.side).toBe('sun');
    expect(sunEdge.percent).toBeCloseTo(55, 4);
  });

  it('preserves instant hitkill under 5/5 Curse even for a single missed multi-part special', () => {
    expect(
      getBossRiftMissDamageMultiplier({ kind: 'hades_chains', chainTotal: 3 }, BOSS_CURSE_MAX_STACKS)
    ).toBeGreaterThanOrEqual(1.0);
    expect(
      getBossRiftMissDamageMultiplier({ kind: 'chaos_orbit' }, BOSS_CURSE_MAX_STACKS)
    ).toBeGreaterThanOrEqual(1.0);

    const host = startReadyBattle('boss_cronos', {
      bossCurseStacks: BOSS_CURSE_MAX_STACKS,
      bossCurseBossId: 'boss_cronos',
      bossCurseTimerSec: 600,
    });
    const battle = host.activeBossBattle!;
    battle.bossHp = battle.bossMaxHp * 0.2; // Phase 3 (3 chains)
    battle.phase = 3;
    battle.highestPhaseShocked = 3;
    spawnBossRift(host, { forceSpecial: true });
    // Keep only 1 chain to verify even a single missed chain is still lethal at 5/5 Curse
    battle.activeRifts = [battle.activeRifts[0]];
    tickBossBattle(host, battle.activeRifts[0].remainingSec + 0.01);
    expect(host.activeBossBattle).toBeNull();
  });
});

describe('Riposte removal and 5/5 Curse winnability', () => {
  it('deals zero direct boss damage on parries even under 5/5 Curse', () => {
    const host = startReadyBattle('boss_cronos', {
      bossCurseStacks: BOSS_CURSE_MAX_STACKS,
      bossCurseBossId: 'boss_cronos',
      bossCurseTimerSec: 600,
    });
    const breakdown = calculateBossCombatBreakdown(host, 'boss_cronos');
    expect(breakdown.riftHpFraction).toBe(0);
    expect(breakdown.riftDamage).toBe(0);

    const battle = host.activeBossBattle!;
    const hpBefore = battle.bossHp;
    spawnBossRift(host, { forceStandard: true });
    const res = clickBossRift(host, battle.activeRifts[0].id);
    expect(res.shattered).toBe(true);
    expect(res.damage).toBe(0);
    expect(battle.bossHp).toBe(hpBefore);
  });

  it('allows defeating every cursed boss under 5/5 Curse with hitless parries and no Riposte', () => {
    const cursedBossIds = ['boss_cronos', 'boss_odin', 'boss_tiamat', 'boss_demiurge'] as const;

    for (const bossId of cursedBossIds) {
      const boss = COMBAT_BOSSES.find((b) => b.id === bossId)!;
      // Bare minimum defense readiness (~0.82) so we test the tightest valid 5/5 Curse scenario
      const minGnose = Math.ceil(Math.expm1(0.82 * Math.log1p(boss.readinessGnose)));
      const demiurge = newDemiurge();
      if (bossId === 'boss_demiurge') {
        demiurge.phase = 'approaching';
      }

      const host = startReadyBattle(bossId, {
        demiurge,
        gnosePoints: minGnose,
        totalGnoseEarned: minGnose,
        faithPoints: boss.maxHp * 0.2,
        totalFaithAccumulated: boss.maxHp * 0.5,
        getFaithPerSecond: () => boss.maxHp * 0.018,
        getFaithPerClick: () => boss.maxHp * 0.0045,
        bossCurseStacks: BOSS_CURSE_MAX_STACKS,
        bossCurseBossId: bossId,
        bossCurseTimerSec: 600,
      });

      const dt = 0.1;
      let elapsed = 0;
      let clickAccum = 0;
      // Simulate hitless play (parry every attack, 0 miracles caught, modest 2 CPS Sphere clicks)
      while (host.activeBossBattle && elapsed < 300) {
        const battle = host.activeBossBattle;

        // Parry active rifts cleanly
        for (const rift of [...battle.activeRifts]) {
          if (!host.activeBossBattle) break;
          if (rift.scaleHigherSelected) continue;
          const kind = rift.kind ?? 'standard';
          if (kind === 'hades_chains') {
            const minOrder = Math.min(
              ...battle.activeRifts
                .filter((r) => r.kind === 'hades_chains' && r.groupId === rift.groupId)
                .map((r) => r.chainOrder ?? 1)
            );
            if ((rift.chainOrder ?? 1) === minOrder) {
              clickBossRift(host, rift.id);
            }
          } else if (kind === 'odin_raven') {
            // Parry inside Odin's green cue window (remainingSec / maxSec around 0.25)
            if (rift.remainingSec / rift.maxSec <= 0.34) {
              clickBossRift(host, rift.id, undefined, rift.maxSec * 0.24);
            }
          } else if (kind === 'demiurge_ritual') {
            clickBossRift(host, rift.id, 0);
          } else {
            clickBossRift(host, rift.id);
          }
        }

        // Apply modest 2 CPS Sphere clicks (without crits)
        clickAccum += dt;
        if (host.activeBossBattle && clickAccum >= 0.5) {
          clickAccum -= 0.5;
          const bd = calculateBossCombatBreakdown(host, bossId);
          host.activeBossBattle.bossHp = Math.max(0, host.activeBossBattle.bossHp - bd.clickDamage);
          if (host.activeBossBattle.bossHp <= 0) {
            tickBossBattle(host, 0.01);
            break;
          }
        }

        if (host.activeBossBattle) {
          tickBossBattle(host, dt);
        }
        elapsed += dt;
      }

      expect(host.activeBossBattle, `${bossId} battle should finish within 300s`).toBeNull();
      expect(host.defeatedBosses.has(bossId), `${bossId} should be defeated under 5/5 Curse`).toBe(true);
      expect(host.maxCurseDefeatedBosses?.has(bossId)).toBe(true);
      expect(host.bossCurseStacks).toBe(0);
    }
  });
});
