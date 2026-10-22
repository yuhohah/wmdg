import { describe, it, expect, beforeEach } from 'vitest';
import { GameStateManager } from '../../core/GameState.js';
import { BOSS_GODS, getBossHp, getBossRelicReward } from '../../config/bosses.js';

describe('Pantheon & Boss Battle System', () => {
  let gameState: GameStateManager;

  beforeEach(() => {
    gameState = new GameStateManager();
  });

  it('initializes with locked pantheon and default boss records for all 6 cosmic gods', () => {
    expect(gameState.isPantheonUnlocked()).toBe(false);
    expect(BOSS_GODS.length).toBe(6);
    expect(gameState.bossRecords.size).toBe(6);
    expect(gameState.collectedFragments.size).toBe(0);

    const snapshot = gameState.getSnapshot();
    expect(snapshot.bossesDefeated).toBe(0);
    expect(snapshot.maxAscension).toBe(0);
  });

  it('verifies unlock_pantheon is retired in favor of unlock_gnose', () => {
    const pantheonUnlock = gameState.unlocks.find((u) => u.id === 'unlock_pantheon');
    expect(pantheonUnlock).toBeUndefined();

    const gnoseUnlock = gameState.unlocks.find((u) => u.id === 'unlock_gnose');
    expect(gnoseUnlock).toBeDefined();
    expect(gnoseUnlock?.prerequisiteId).toBe('unlock_relics');
  });

  it('scales boss HP and relic rewards with ascension', () => {
    const morvath = BOSS_GODS.find((b) => b.id === 'boss_morvath')!;
    const baseHp = getBossHp(morvath, 0);
    const asc1Hp = getBossHp(morvath, 1);
    const asc5Hp = getBossHp(morvath, 5);

    expect(baseHp).toBe(50000000);
    expect(asc1Hp).toBeGreaterThan(baseHp);
    expect(asc5Hp).toBeGreaterThan(asc1Hp);

    const baseReward = getBossRelicReward(morvath, 0);
    const asc1Reward = getBossRelicReward(morvath, 1);
    expect(asc1Reward).toBeGreaterThan(baseReward);
  });

  it('records boss victory, awards relics, unlocks fragments and satellite node', () => {
    const morvath = BOSS_GODS[0];
    const initialRelics = gameState.relicPoints;

    const { relicsGained, fragmentUnlocked } = gameState.recordBossDefeat(morvath.id);
    expect(relicsGained).toBeGreaterThan(0);
    expect(fragmentUnlocked).toBe(morvath.fragmentId);
    expect(gameState.hasFragment(morvath.fragmentId)).toBe(true);
    expect(gameState.relicPoints).toBe(initialRelics + relicsGained);

    // Node is unlocked on sphere
    expect(gameState.isSphereSatelliteUnlocked(morvath.satelliteIndex)).toBe(true);

    // Record ascension level increased
    const record = gameState.bossRecords.get(morvath.id);
    expect(record?.defeated).toBe(true);
    expect(record?.ascensionLevel).toBe(1);

    const snapshot = gameState.getSnapshot();
    expect(snapshot.bossesDefeated).toBe(1);
    expect(snapshot.maxAscension).toBe(1);
  });

  it('unlocks all 6 sphere satellites when all 6 cosmic gods are defeated', () => {
    BOSS_GODS.forEach((god) => {
      gameState.recordBossDefeat(god.id);
      expect(gameState.isSphereSatelliteUnlocked(god.satelliteIndex)).toBe(true);
    });

    const snapshot = gameState.getSnapshot();
    expect(snapshot.bossesDefeated).toBe(6);
    expect(gameState.collectedFragments.size).toBe(6);
  });

  it('applies fragment bonuses correctly across all 6 fragments', () => {
    // 1. Morvath: +25% FPC
    const initialFpc = gameState.getFaithPerClick();
    gameState.collectedFragments.add('fragment_morvath');
    const buffedFpc = gameState.getFaithPerClick();
    expect(buffedFpc).toBeCloseTo(initialFpc * 1.25, 4);

    // 2. Aethelgard: blessing cap 90s
    expect(gameState.getMaxIncarnationBoost()).toBe(60);
    gameState.collectedFragments.add('fragment_aethelgard');
    expect(gameState.getMaxIncarnationBoost()).toBe(90);

    // 3. Vael'Zaphir: 1.3x Fervor/s and 1s transmutation cooldown
    const baseFervorRate = gameState.getFervorRatePerSecond();
    gameState.collectedFragments.add('fragment_vaelzaphir');
    // If incarnation is unlocked, rate is boosted
    gameState.unlocks[0].unlocked = true; // unlock_incarnation
    const boostedFervorRate = gameState.getFervorRatePerSecond();
    expect(boostedFervorRate).toBeGreaterThan(baseFervorRate);

    // 4. Xul'Khor: 3x global faith & 2x relics on transmutation
    expect(gameState.getRelicsBonusMultiplier()).toBe(1.0);
    gameState.collectedFragments.add('fragment_xulkhor');
    expect(gameState.getRelicsBonusMultiplier()).toBe(2.0);

    // 5. Ouroboros: +5% FPC per relic upgrade level
    gameState.relicUpgrades[0].level = 10;
    const fpcBeforeOuroboros = gameState.getFaithPerClick();
    gameState.collectedFragments.add('fragment_ouroboros');
    const fpcWithOuroboros = gameState.getFaithPerClick();
    expect(fpcWithOuroboros).toBeGreaterThan(fpcBeforeOuroboros);

    // 6. Sol-Invictus: 5x global faith & 4x blessing
    gameState.followers[0].count = 10;
    const fpsBeforeSol = gameState.getFaithPerSecond();
    gameState.collectedFragments.add('fragment_solinvictus');
    const fpsWithSol = gameState.getFaithPerSecond();
    expect(fpsWithSol).toBeCloseTo(fpsBeforeSol * 5, 1);
  });

  it('serializes and deserializes pantheon data accurately for all bosses', () => {
    gameState.collectedFragments.add('fragment_morvath');
    gameState.collectedFragments.add('fragment_solinvictus');
    gameState.recordBossDefeat('boss_morvath');
    gameState.recordBossDefeat('boss_solinvictus');

    const saveData = gameState.buildSaveData();
    expect(saveData.pantheon).toBeDefined();
    expect(saveData.pantheon?.fragments).toContain('fragment_morvath');
    expect(saveData.pantheon?.fragments).toContain('fragment_solinvictus');

    const freshState = new GameStateManager();
    freshState.applySaveData(saveData);

    expect(freshState.hasFragment('fragment_morvath')).toBe(true);
    expect(freshState.hasFragment('fragment_solinvictus')).toBe(true);
    expect(freshState.isSphereSatelliteUnlocked(0)).toBe(true);
    expect(freshState.isSphereSatelliteUnlocked(5)).toBe(true);
  });
});
