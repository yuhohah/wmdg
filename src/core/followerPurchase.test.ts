import { describe, expect, it } from 'vitest';
import { GameStateManager } from './GameState.js';
import { calculateMaxAffordableFollowers, calculateCostDiscountMultiplier } from '../systems/calculations.js';

describe('Follower purchase production preview', () => {
  it.each(['none', 'gn_followers_syn', 'gn_followers_cubic'])('matches Convert Max with %s synergy and all production bonuses', (synergy) => {
    const game = new GameStateManager();
    game.unlocks.forEach((unlock) => { unlock.unlocked = true; });
    game.followers[0].count = 25;
    game.faithPoints = 1e6;
    game.fervorPoints = 1000;
    game.fervorUpgrades[3].level = 4;
    game.relicPoints = 100;
    game.relicUpgrades[0].level = 2;
    game.relicUpgrades[5].level = 1;
    game.incarnationStage = 3;
    game.incarnationBoostTimer = 20;
    game.totalGnoseEarned = 100;
    game.unlockedGnoseUpgrades.add('gn_init_faith');
    game.unlockedGnoseUpgrades.add('gn_followers_economy');
    game.defeatedBosses.add('boss_anubis');
    game.bossCurseTimerSec = 10;
    game.achievements.forEach((achievement) => { achievement.unlocked = true; });
    if (synergy !== 'none') game.unlockedGnoseUpgrades.add('gn_followers_syn');
    if (synergy === 'gn_followers_cubic') game.unlockedGnoseUpgrades.add(synergy);

    const { count } = calculateMaxAffordableFollowers(
      game.followers[0], game.faithPoints,
      calculateCostDiscountMultiplier(game.achievements), game.getDevoteeBaseMultiplier()
    );
    const stateBefore = game.buildSaveData();
    const rateBefore = game.getFaithPerSecond();
    const predictedGain = game.getFollowerPurchaseFaithGain(count);

    // Rendering a preview must not buy anything or mutate production inputs.
    expect(game.buildSaveData()).toEqual({ ...stateBefore, timestamp: expect.any(Number) });
    const purchase = game.buyMaxFollowers();
    expect(purchase.success).toBe(true);
    expect(purchase.count).toBe(count);
    expect(predictedGain).toBeCloseTo(game.getFaithPerSecond() - rateBefore, 5);
  });

  it('predicts the first follower with global bonuses and no existing production', () => {
    const game = new GameStateManager();
    game.faithPoints = 1000;
    game.unlockedGnoseUpgrades.add('gn_init_faith');
    expect(game.getFaithPerSecond()).toBe(0);
    const preview = game.getFollowerPurchaseFaithGain(1);
    expect(preview).toBe(8);
    expect(game.buyOneFollower()).toBe(true);
    expect(game.getFaithPerSecond()).toBe(preview);
  });

  it('returns zero for an empty or unaffordable batch', () => {
    const game = new GameStateManager();
    game.followers[0].count = 25;
    const purchase = game.buyMaxFollowers();
    expect(purchase.count).toBe(0);
    expect(game.getFollowerPurchaseFaithGain(purchase.count)).toBe(0);
  });
});
