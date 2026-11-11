import { describe, expect, it } from 'vitest';
import { GameStateManager } from './GameState.js';

describe('Sphere critical click milestones', () => {
  it('never rolls a critical until 250 clicks have been completed', () => {
    const game = new GameStateManager();
    for (let count = 0; count < 250; count++) {
      expect(game.getSphereCriticalChance()).toBe(0);
      expect(game.addClick(() => 0).isCrit).toBe(false);
    }
    expect(game.totalClicks).toBe(250);
    expect(game.getSphereCriticalChance()).toBe(0.05);
    const normal = game.getFaithPerClick();
    expect(game.addClick(() => 0.049)).toMatchObject({ isCrit: true, fpc: normal * 2 });
    expect(game.addClick(() => 0.05).isCrit).toBe(false);
  });

  it('raises chance from 5% to 10% after the thousandth click without changing the multiplier', () => {
    const game = new GameStateManager();
    game.totalClicks = 999;
    expect(game.addClick(() => 0.075).isCrit).toBe(false);
    expect(game.totalClicks).toBe(1000);
    expect(game.getSphereCriticalChance()).toBe(0.10);
    const normal = game.getFaithPerClick();
    expect(game.addClick(() => 0.075)).toMatchObject({ isCrit: true, fpc: normal * 2 });
    expect(game.addClick(() => 0.10).isCrit).toBe(false);
  });

  it.each([249, 250, 999, 1000])('preserves critical progress on save load and ascension (%s clicks)', clicks => {
    const game = new GameStateManager();
    game.totalClicks = clicks;
    game.unlocks.forEach(seal => { seal.unlocked = true; });
    game.faithPoints = 1e16;
    const chance = game.getSphereCriticalChance();
    const restored = new GameStateManager();
    restored.applySaveData(game.buildSaveData());
    expect(restored.getSphereCriticalChance()).toBe(chance);
    expect(restored.performGnoseReset().success).toBe(true);
    expect(restored.totalClicks).toBe(clicks);
    expect(restored.getSphereCriticalChance()).toBe(chance);
    restored.resetToDefaults();
    expect(restored.getSphereCriticalChance()).toBe(0);
  });

  it('shows both critical buffs on the matching achievements and keeps their existing faith bonuses', () => {
    const game = new GameStateManager();
    const unlock = game.achievements.find(achievement => achievement.id === 'ach_click_250')!;
    const improvement = game.achievements.find(achievement => achievement.id === 'ach_click_1000')!;
    expect(unlock.buffText).toContain('5%');
    expect(unlock.buffText).toContain('2×');
    expect(unlock.buffVal).toBe(0.35);
    expect(improvement.buffText).toContain('10%');
    expect(improvement.buffVal).toBe(0.50);
    game.totalClicks = 249;
    expect(unlock.check(game.getSnapshot())).toBe(false);
    game.totalClicks = 250;
    expect(unlock.check(game.getSnapshot())).toBe(true);
    expect(improvement.check(game.getSnapshot())).toBe(false);
    game.totalClicks = 1000;
    expect(improvement.check(game.getSnapshot())).toBe(true);
  });
});
