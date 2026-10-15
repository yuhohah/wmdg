import { describe, it, expect, beforeEach } from 'vitest';
import { GameStateManager } from '../../core/GameState.js';
import { BOSS_GODS, getBossHp, getBossRelicReward } from '../../config/bosses.js';

describe('Pantheon & Boss Battle System', () => {
  let gameState: GameStateManager;

  beforeEach(() => {
    gameState = new GameStateManager();
  });

  it('initializes with locked pantheon and default boss records', () => {
    expect(gameState.isPantheonUnlocked()).toBe(false);
    expect(gameState.bossRecords.size).toBe(BOSS_GODS.length);
    expect(gameState.collectedFragments.size).toBe(0);

    const snapshot = gameState.getSnapshot();
    expect(snapshot.bossesDefeated).toBe(0);
    expect(snapshot.maxAscension).toBe(0);
  });

  it('unlocks pantheon when buying unlock_pantheon', () => {
    const pantheonUnlock = gameState.unlocks.find((u) => u.id === 'unlock_pantheon');
    expect(pantheonUnlock).toBeDefined();

    gameState.faithPoints = 15000;
    const bought = gameState.buyUnlock(pantheonUnlock!);
    expect(bought).toBe(true);
    expect(gameState.isPantheonUnlocked()).toBe(true);
  });

  it('scales boss HP and relic rewards with ascension', () => {
    const morvath = BOSS_GODS.find((b) => b.id === 'boss_morvath')!;
    const baseHp = getBossHp(morvath, 0);
    const asc1Hp = getBossHp(morvath, 1);
    const asc5Hp = getBossHp(morvath, 5);

    expect(baseHp).toBe(150000);
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

  it('applies fragment bonuses correctly to FPC and FPS', () => {
    // Morvath fragment: +25% FPC
    const initialFpc = gameState.getFaithPerClick();
    gameState.collectedFragments.add('fragment_morvath');
    const buffedFpc = gameState.getFaithPerClick();
    expect(buffedFpc).toBeCloseTo(initialFpc * 1.25, 4);

    // Xul'Khor fragment: 3x global faith
    // Followers are 0 by default, let's give 1 devotee
    gameState.followers[0].count = 10;
    gameState.collectedFragments.add('fragment_xulkhor');
    const fpsWithDevotees = gameState.getFaithPerSecond();
    expect(fpsWithDevotees).toBeGreaterThan(0);

    // Aethelgard fragment: blessing max cap 90s
    expect(gameState.getMaxIncarnationBoost()).toBe(60);
    gameState.collectedFragments.add('fragment_aethelgard');
    expect(gameState.getMaxIncarnationBoost()).toBe(90);
  });

  it('serializes and deserializes pantheon data accurately', () => {
    gameState.collectedFragments.add('fragment_morvath');
    gameState.recordBossDefeat('boss_morvath');

    const saveData = gameState.buildSaveData();
    expect(saveData.pantheon).toBeDefined();
    expect(saveData.pantheon?.fragments).toContain('fragment_morvath');
    expect(saveData.pantheon?.bosses.find((b) => b.id === 'boss_morvath')?.defeated).toBe(true);

    const freshState = new GameStateManager();
    freshState.applySaveData(saveData);

    expect(freshState.hasFragment('fragment_morvath')).toBe(true);
    const morvathRecord = freshState.bossRecords.get('boss_morvath');
    expect(morvathRecord?.defeated).toBe(true);
    expect(morvathRecord?.ascensionLevel).toBe(1);
    expect(freshState.isSphereSatelliteUnlocked(0)).toBe(true);
  });
});
