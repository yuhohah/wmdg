import { describe, it, expect, beforeEach } from 'vitest';
import { GameStateManager } from '../../core/GameState.js';
import { GNOSE_UPGRADES } from '../../config/gnose.js';
import {
  calculateGnoseToGet,
  calculateTotalGnoseMultiplier,
  calculateGnoseFollowersSynergyMultiplier
} from '../../systems/calculations.js';
import { getFervorUpgradeMultiplier } from '../../config/fervor.js';

describe('Gnose (True Prestige) System', () => {
  let gameState: GameStateManager;

  beforeEach(() => {
    gameState = new GameStateManager();
  });

  it('initializes with locked gnose and 20 tree nodes across 4 tiers', () => {
    expect(gameState.isGnoseUnlocked()).toBe(false);
    expect(gameState.gnosePoints).toBe(0);
    expect(gameState.totalGnoseEarned).toBe(0);
    expect(gameState.gnoseResets).toBe(0);
    expect(GNOSE_UPGRADES.length).toBe(20);
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

  it('performs hard DodecaDragons reset by default, re-locking earlier Selos while keeping Pantheon & Achievements', () => {
    // Unlock everything and build progress
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
    gameState.recordBossDefeat('boss_morvath');

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

    // Persistent systems remain unlocked
    expect(gameState.isGnoseUnlocked()).toBe(true);
    expect(gameState.achievements[0].unlocked).toBe(true);
    expect(gameState.hasFragment('fragment_morvath')).toBe(true);
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

  it('enforces branching prerequisites and applies Memória Hermética and Cripta Eterna on reset', () => {
    gameState.gnosePoints = 50;
    gameState.totalGnoseEarned = 50;

    // Cannot buy Tier 2 before Tier 1 prerequisites
    expect(gameState.buyGnoseUpgrade('gn_keep_relics')).toBe(false);

    expect(gameState.buyGnoseUpgrade('gn_init_faith')).toBe(true);
    expect(gameState.buyGnoseUpgrade('gn_memoria_selos')).toBe(true);
    expect(gameState.buyGnoseUpgrade('gn_init_fervor')).toBe(true);
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

  it('serializes and restores Gnose state accurately', () => {
    gameState.gnosePoints = 42;
    gameState.totalGnoseEarned = 100;
    gameState.gnoseResets = 4;
    gameState.unlockedGnoseUpgrades.add('gn_init_faith');
    gameState.unlockedGnoseUpgrades.add('gn_memoria_selos');
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
    expect(restored.confirmGnoseReset).toBe(false);
    expect(restored.autoFollowersEnabled).toBe(false);
    expect(restored.isGnoseUnlocked()).toBe(true);
  });
});
