import { describe, expect, it } from 'vitest';
import { GameStateManager } from '../core/GameState.js';
import { ElapsedTimeCredit } from './elapsedTime.js';
import { recoverOfflineProgress } from './offlineRecovery.js';

describe('asynchronous offline recovery', () => {
  it('yields before crediting and leaves the original state intact until the result is committed', async () => {
    const game = new GameStateManager();
    game.followers[0].count = 20;
    const source = game.buildSaveData();
    source.timestamp = 1000;
    let release!: () => void;
    let first = true;
    const pending = recoverOfflineProgress(source, 121000, () => {
      if (!first) return Promise.resolve();
      first = false;
      return new Promise(resolve => { release = resolve; });
    });
    expect(game.faithPoints).toBe(1);
    expect(source.stats.faithPoints).toBe(1);
    release();
    const recovered = await pending;
    const reference = new GameStateManager();
    reference.applySaveData(source);
    new ElapsedTimeCredit(1000).consume(reference, 121000);
    expect(recovered.save.stats.faithPoints).toBeCloseTo(reference.faithPoints, 6);
    expect(recovered.notice?.title).toBe('VIGÍLIA SAGRADA (2m)');
    expect(game.faithPoints).toBe(1);
  });

  it('retains automation and blessing results across batch boundaries', async () => {
    const game = new GameStateManager();
    game.unlocks.forEach(u => u.unlocked = true);
    game.incarnationStage = 3;
    game.incarnationBoostTimer = 6;
    game.faithPoints = 1e12;
    game.unlockedGnoseUpgrades.add('gn_automation');
    const source = game.buildSaveData(); source.timestamp = 1000;
    const result = await recoverOfflineProgress(source, 61500, () => Promise.resolve());
    const reference = new GameStateManager(); reference.applySaveData(source);
    new ElapsedTimeCredit(1000).consume(reference, 61500);
    expect(result.save.stats.faithPoints / reference.faithPoints).toBeCloseTo(1, 10);
    expect(result.save.followers).toEqual(reference.buildSaveData().followers);
    expect(result.save.fervorUpgrades).toEqual(reference.buildSaveData().fervorUpgrades);
    expect(result.save.stats.incarnationBoostTimer).toBe(reference.incarnationBoostTimer);
  });
});
