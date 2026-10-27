import { describe, it, expect, beforeEach } from 'vitest';
import { GameStateManager } from '../../core/GameState.js';
import { GNOSE_UPGRADES } from '../../config/gnose.js';
import { GNOSE_BOSSES } from '../../config/bosses.js';
import {
  calculateGnoseToGet,
  calculateTotalGnoseMultiplier,
  calculateGnoseFollowersSynergyMultiplier
} from '../../systems/calculations.js';
import { getFervorUpgradeMultiplier } from '../../config/fervor.js';

describe('Gnose (True Prestige) System & Mythological Guardians', () => {
  let gameState: GameStateManager;

  beforeEach(() => {
    gameState = new GameStateManager();
  });

  it('initializes with locked gnose, 20 tree nodes across 4 tiers, and 4 mythological bosses', () => {
    expect(gameState.isGnoseUnlocked()).toBe(false);
    expect(gameState.gnosePoints).toBe(0);
    expect(gameState.totalGnoseEarned).toBe(0);
    expect(gameState.gnoseResets).toBe(0);
    expect(GNOSE_UPGRADES.length).toBe(20);
    expect(GNOSE_BOSSES.length).toBe(4);
    expect(GNOSE_BOSSES.map((b) => b.id)).toEqual([
      'boss_anubis',
      'boss_cronos',
      'boss_odin',
      'boss_tiamat'
    ]);
  });

  it('unlocks Selo da Gnose at 1e15 Fé with unlock_relics prerequisite', () => {
    const gnoseUnlock = gameState.unlocks.find((u) => u.id === 'unlock_gnose');
    expect(gnoseUnlock).toBeDefined();
    expect(gnoseUnlock?.cost).toBe(1e15);
    expect(gnoseUnlock?.prerequisiteId).toBe('unlock_relics');

    gameState.faithPoints = 1e15;
    expect(gameState.buyUnlock(gnoseUnlock!)).toBe(true);
    expect(gameState.isGnoseUnlocked()).toBe(true);
  });

  it('calculates Gnose gain on the DodecaDragons sub-exponential curve', () => {
    expect(calculateGnoseToGet(9.99e14)).toBe(0);
    expect(calculateGnoseToGet(1e15)).toBe(1);
    expect(calculateGnoseToGet(1e18)).toBe(Math.floor(Math.pow(1e3, 0.15))); // 2
    expect(calculateGnoseToGet(1e25)).toBe(Math.floor(Math.pow(1e10, 0.15))); // 31
    expect(calculateGnoseToGet(1e25, 2.5)).toBe(Math.floor(Math.pow(1e10, 0.15) * 2.5));
  });

  it('performs hard DodecaDragons reset by default, re-locking earlier Selos while keeping Achievements and Defeated Bosses', () => {
    gameState.unlocks.forEach((u) => {
      u.unlocked = true;
    });
    gameState.faithPoints = 1e18;
    gameState.followers[0].count = 120;
    gameState.fervorPoints = 500000;
    gameState.fervorUpgrades[0].level = 10;
    gameState.incarnationStage = 3;
    gameState.relicPoints = 5000;
    gameState.bestRelicsToGet = 250;
    gameState.relicUpgrades[0].level = 12;
    gameState.achievements[0].unlocked = true;
    gameState.defeatedBosses.add('boss_anubis');

    const result = gameState.performGnoseReset();
    expect(result.success).toBe(true);
    expect(result.gained).toBeGreaterThanOrEqual(2);
    expect(gameState.gnosePoints).toBe(result.gained);
    expect(gameState.totalGnoseEarned).toBe(result.gained);
    expect(gameState.gnoseResets).toBe(1);

    // Reset checks
    expect(gameState.faithPoints).toBe(1);
    expect(gameState.getTotalFollowersCount()).toBe(0);
    expect(gameState.fervorPoints).toBe(0);
    expect(gameState.fervorUpgrades[0].level).toBe(0);
    expect(gameState.incarnationStage).toBe(1);
    expect(gameState.relicPoints).toBe(0);
    expect(gameState.bestRelicsToGet).toBe(0);
    expect(gameState.relicUpgrades[0].level).toBe(0);

    // Earlier Selos re-locked
    expect(gameState.isIncarnationUnlocked()).toBe(false);
    expect(gameState.isFervorUpgradesUnlocked()).toBe(false);
    expect(gameState.isRelicsUnlocked()).toBe(false);

    // Persistent systems remain unlocked (including defeated bosses)
    expect(gameState.isGnoseUnlocked()).toBe(true);
    expect(gameState.achievements[0].unlocked).toBe(true);
    expect(gameState.isBossDefeated('boss_anubis')).toBe(true);
    expect(gameState.isGnoseTierUnlocked(2)).toBe(true);
  });

  it('scales passive multiplier with Total Gnose Earned so spending Gnose never reduces production', () => {
    gameState.unlocks.forEach((u) => {
      u.unlocked = true;
    });
    gameState.faithPoints = 1e25;
    gameState.performGnoseReset();

    const multBeforeSpend = gameState.getTotalGnosePassiveMultiplier();
    expect(multBeforeSpend).toBeGreaterThan(1);
    expect(multBeforeSpend).toBeCloseTo(calculateTotalGnoseMultiplier(gameState.totalGnoseEarned), 5);

    const bought = gameState.buyGnoseUpgrade('gn_init_faith');
    expect(bought).toBe(true);
    expect(gameState.gnosePoints).toBeLessThan(gameState.totalGnoseEarned);
    expect(gameState.getTotalGnosePassiveMultiplier()).toBe(multBeforeSpend);
  });

  it('enforces Guardian Boss locks on Tiers II, III, IV and applies Memória Hermética and Cripta Eterna on reset', () => {
    gameState.gnosePoints = 150;
    gameState.totalGnoseEarned = 150;

    expect(gameState.buyGnoseUpgrade('gn_init_faith')).toBe(true);
    expect(gameState.buyGnoseUpgrade('gn_memoria_selos')).toBe(true);
    expect(gameState.buyGnoseUpgrade('gn_init_fervor')).toBe(true);

    // Tier II is locked until Anúbis is defeated
    expect(gameState.isGnoseTierUnlocked(2)).toBe(false);
    expect(gameState.buyGnoseUpgrade('gn_keep_relics')).toBe(false);

    // Defeat Anúbis -> unlocks Tier II
    gameState.defeatedBosses.add('boss_anubis');
    expect(gameState.isGnoseTierUnlocked(2)).toBe(true);
    expect(gameState.buyGnoseUpgrade('gn_keep_relics')).toBe(true);

    // Memória Hermética unlocks earlier Selos immediately and enables Convert Max at 0 followers
    expect(gameState.isIncarnationUnlocked()).toBe(true);
    expect(gameState.isFervorUpgradesUnlocked()).toBe(true);
    expect(gameState.isRelicsUnlocked()).toBe(true);
    expect(gameState.isConvertMaxUnlocked()).toBe(true);

    // Upgrade a relic, then perform Gnose reset
    gameState.relicUpgrades[0].level = 15;
    gameState.faithPoints = 1e16;
    const res = gameState.performGnoseReset();
    expect(res.success).toBe(true);

    // Starts with 1000 Fé (gn_init_faith), keeps Selos open (gn_memoria_selos), keeps Relics (gn_keep_relics)
    expect(gameState.faithPoints).toBe(1000);
    expect(gameState.isIncarnationUnlocked()).toBe(true);
    expect(gameState.isFervorUpgradesUnlocked()).toBe(true);
    expect(gameState.isRelicsUnlocked()).toBe(true);
    expect(gameState.relicUpgrades[0].level).toBe(15);
  });

  it('runs Boss Battle without countdown timer: shattering Rifts defeats the Boss and missing 4 Rifts breaks Altar Integrity with mild 20s curse', () => {
    gameState.totalGnoseEarned = 5;
    gameState.followers[0].count = 10;

    // 1. Challenge Anúbis and let 4 rifts expire -> Altar Integrity drops to 0% and applies 20s curse (-25% FPS)
    const normalFps = gameState.getFaithPerSecond();
    expect(gameState.startBossBattle('boss_anubis')).toBe(true);
    expect(gameState.activeBossBattle).not.toBeNull();

    // Spawn 4 rifts and advance time past their window without clicking
    for (let i = 0; i < 4; i++) {
      gameState.spawnBossRift();
      gameState.tick(2.6);
    }

    expect(gameState.activeBossBattle).toBeNull();
    expect(gameState.isBossDefeated('boss_anubis')).toBe(false);
    expect(gameState.bossCurseTimerSec).toBeGreaterThan(0);
    expect(gameState.getFaithPerSecond()).toBeCloseTo(normalFps * 0.75, 4);

    // Wait out the 20s mild curse
    gameState.tick(20);
    expect(gameState.bossCurseTimerSec).toBe(0);
    expect(gameState.getFaithPerSecond()).toBeCloseTo(normalFps, 4);

    // 2. Re-challenge Anúbis and shatter rifts + click Sphere to win quickly
    expect(gameState.startBossBattle('boss_anubis')).toBe(true);
    for (let i = 0; i < 9; i++) {
      if (!gameState.activeBossBattle) break;
      gameState.spawnBossRift();
      const riftId = gameState.activeBossBattle.activeRifts[0].id;
      gameState.clickBossRift(riftId);
    }

    expect(gameState.activeBossBattle).toBeNull();
    expect(gameState.isBossDefeated('boss_anubis')).toBe(true);
    expect(gameState.isGnoseTierUnlocked(2)).toBe(true);
    expect(gameState.getFaithPerSecond()).toBeCloseTo(normalFps * 1.5, 4);
  });

  it('unlocks Tiamat (Endgame Boss) only when all 20/20 Gnose nodes are assimilated and grants Crepúsculo dos Deuses on victory', () => {
    gameState.totalGnoseEarned = 1000;
    expect(gameState.canChallengeBoss('boss_tiamat')).toBe(false);

    // Assimilate all 20 Gnose nodes
    GNOSE_UPGRADES.forEach((u) => {
      gameState.unlockedGnoseUpgrades.add(u.id);
    });
    expect(gameState.canChallengeBoss('boss_tiamat')).toBe(true);

    expect(gameState.startBossBattle('boss_tiamat')).toBe(true);
    for (let i = 0; i < 9; i++) {
      if (!gameState.activeBossBattle) break;
      gameState.spawnBossRift();
      const riftId = gameState.activeBossBattle.activeRifts[0].id;
      gameState.clickBossRift(riftId);
    }

    expect(gameState.isBossDefeated('boss_tiamat')).toBe(true);
    const newlyUnlocked = gameState.checkAchievements();
    expect(newlyUnlocked.some((a) => a.id === 'ach_boss_tiamat')).toBe(true);
  });

  it('scales Boss Battle HP bar drain, Click damage, Rift damage, and Altar protection across all 6 cult resources', () => {
    gameState.totalGnoseEarned = 1;
    const base = gameState.getBossCombatBreakdown('boss_anubis');

    // 1. Adding Fé increases faithBonus and passive DPS
    gameState.faithPoints = 1e9;
    gameState.totalFaithAccumulated = 1e9;
    const afterFaith = gameState.getBossCombatBreakdown('boss_anubis');
    expect(afterFaith.faithBonus).toBeGreaterThan(base.faithBonus);
    expect(afterFaith.passiveDps).toBeGreaterThan(base.passiveDps);

    // 2. Adding Fiéis increases followersBonus, passive DPS, and Altar heal on rift shatter
    gameState.followers[0].count = 50;
    const afterFollowers = gameState.getBossCombatBreakdown('boss_anubis');
    expect(afterFollowers.followersBonus).toBeGreaterThan(afterFaith.followersBonus);
    expect(afterFollowers.passiveDps).toBeGreaterThan(afterFaith.passiveDps);
    expect(afterFollowers.altarHealOnRift).toBeGreaterThan(0);

    // 3. Adding Fervor increases fervorBonus, passive DPS, and Sphere Click damage
    gameState.unlocks.forEach((u) => (u.unlocked = true));
    gameState.fervorPoints = 100000;
    gameState.fervorUpgrades[0].level = 5;
    const afterFervor = gameState.getBossCombatBreakdown('boss_anubis');
    expect(afterFervor.fervorBonus).toBeGreaterThan(afterFollowers.fervorBonus);
    expect(afterFervor.clickDamage).toBeGreaterThan(afterFollowers.clickDamage);

    // 4. Adding Relíquias increases relicsBonus, Rift critical damage, and mitigates Altar damage on miss
    gameState.relicPoints = 1000;
    gameState.relicUpgrades[0].level = 5;
    const afterRelics = gameState.getBossCombatBreakdown('boss_anubis');
    expect(afterRelics.relicsBonus).toBeGreaterThan(afterFervor.relicsBonus);
    expect(afterRelics.riftDamage).toBeGreaterThan(afterFervor.riftDamage);
    expect(afterRelics.altarDamageOnMiss).toBeLessThan(base.altarDamageOnMiss);

    // 5. Advancing Encarnação increases incarnationBonus, click damage, and passive DPS
    gameState.incarnationStage = 3;
    gameState.incarnationBoostTimer = 30;
    const afterIncarnation = gameState.getBossCombatBreakdown('boss_anubis');
    expect(afterIncarnation.incarnationBonus).toBeGreaterThan(afterRelics.incarnationBonus);
    expect(afterIncarnation.passiveDps).toBeGreaterThan(afterRelics.passiveDps);

    // 6. Adding Gnose increases gnoseBonus and overall multiplier
    gameState.gnosePoints = 100;
    gameState.totalGnoseEarned = 100;
    gameState.unlockedGnoseUpgrades.add('gn_init_faith');
    const afterGnose = gameState.getBossCombatBreakdown('boss_anubis');
    expect(afterGnose.gnoseBonus).toBeGreaterThan(afterIncarnation.gnoseBonus);
    expect(afterGnose.totalResourceMultiplier).toBeGreaterThan(afterIncarnation.totalResourceMultiplier);

    // Verify passive tick visibly drains Boss HP bar even when raw Fé/s is smaller than 1e18
    expect(gameState.startBossBattle('boss_anubis')).toBe(true);
    const initialHp = gameState.activeBossBattle!.bossHp;
    gameState.tick(1.0);
    expect(gameState.activeBossBattle!.bossHp).toBeLessThan(initialHp * 0.96);
  });

  it('evolves DodecaDragons formulas for MU6 (1 + Fiéis^1.5), MU10 (1 + Fiéis^3), and MU14 (3.5^(n^0.7))', () => {
    expect(calculateGnoseFollowersSynergyMultiplier(10, false, false)).toBe(1);
    expect(calculateGnoseFollowersSynergyMultiplier(10, true, false)).toBeCloseTo(1 + Math.pow(10, 1.5), 4);
    expect(calculateGnoseFollowersSynergyMultiplier(10, true, true)).toBe(1001);

    const fu1 = { ...gameState.fervorUpgrades[0], level: 5 };
    const normalFu1 = getFervorUpgradeMultiplier(fu1, 0, 0, false);
    const boostedFu1 = getFervorUpgradeMultiplier(fu1, 0, 0, true);
    expect(normalFu1).toBeCloseTo(Math.pow(2, Math.pow(5, 0.6)), 4);
    expect(boostedFu1).toBeCloseTo(Math.pow(3.5, Math.pow(5, 0.7)), 4);
    expect(boostedFu1).toBeGreaterThan(normalFu1);
  });

  it('applies gn_dilatacao (Dilatação Hermética) as an exact 2x multiplier to both click and passive faith', () => {
    gameState.followers[0].count = 10;
    const baseFpc = gameState.getFaithPerClick();
    const baseFps = gameState.getFaithPerSecond();

    gameState.unlockedGnoseUpgrades.add('gn_dilatacao');

    expect(gameState.getFaithPerClick()).toBeCloseTo(baseFpc * 2, 5);
    expect(gameState.getFaithPerSecond()).toBeCloseTo(baseFps * 2, 5);
  });

  it('runs Tier 4 automation on tick without spending Fé or Fervor and respects toggles', () => {
    gameState.unlocks.forEach((u) => {
      u.unlocked = true;
    });
    gameState.unlockedGnoseUpgrades.add('gn_auto_followers');
    gameState.unlockedGnoseUpgrades.add('gn_auto_fervor');

    gameState.faithPoints = 5000;
    gameState.fervorPoints = 1000;

    // Tick 1 second -> auto-recruits followers and fervor upgrades without deducting balances
    gameState.tick(1.0);
    expect(gameState.getTotalFollowersCount()).toBeGreaterThan(0);
    expect(gameState.faithPoints).toBeGreaterThanOrEqual(5000);
    expect(gameState.fervorUpgrades[0].level).toBeGreaterThan(0);
    expect(gameState.fervorPoints).toBeGreaterThanOrEqual(1000);
  });

  it('serializes and restores Gnose state and defeated bosses accurately', () => {
    gameState.gnosePoints = 42;
    gameState.totalGnoseEarned = 100;
    gameState.gnoseResets = 4;
    gameState.unlockedGnoseUpgrades.add('gn_init_faith');
    gameState.unlockedGnoseUpgrades.add('gn_memoria_selos');
    gameState.defeatedBosses.add('boss_anubis');
    gameState.defeatedBosses.add('boss_cronos');
    gameState.bossCurseTimerSec = 12;
    gameState.confirmGnoseReset = false;
    gameState.autoFollowersEnabled = false;

    const save = gameState.buildSaveData();
    const restored = new GameStateManager();
    restored.applySaveData(save);

    expect(restored.gnosePoints).toBe(42);
    expect(restored.totalGnoseEarned).toBe(100);
    expect(restored.gnoseResets).toBe(4);
    expect(restored.hasGnoseUpgrade('gn_init_faith')).toBe(true);
    expect(restored.hasGnoseUpgrade('gn_memoria_selos')).toBe(true);
    expect(restored.isBossDefeated('boss_anubis')).toBe(true);
    expect(restored.isBossDefeated('boss_cronos')).toBe(true);
    expect(restored.bossCurseTimerSec).toBe(12);
    expect(restored.confirmGnoseReset).toBe(false);
    expect(restored.autoFollowersEnabled).toBe(false);
  });
});
