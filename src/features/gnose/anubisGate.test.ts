import { describe, expect, it } from 'vitest';
import { GameStateManager } from '../../core/GameState.js';
import { GNOSE_UPGRADES } from '../../config/gnose.js';

describe('Anubis entry requirement', () => {
  it('requires three purchased nodes, not merely currency or repeated ascensions', () => {
    const game = new GameStateManager();
    game.totalGnoseEarned = game.gnosePoints = 10000;
    game.gnoseResets = 100;
    for (const id of ['gn_init_faith', 'gn_memoria_selos', 'gn_automation']) {
      expect(game.canChallengeBoss('boss_anubis')).toBe(false);
      expect(game.startBossBattle('boss_anubis')).toBe(false);
      expect(game.buyGnoseUpgrade(id)).toBe(true);
    }
    expect(game.canChallengeBoss('boss_anubis')).toBe(true);
    expect(game.startBossBattle('boss_anubis')).toBe(true);
  });

  it('ignores retired and unknown IDs when counting purchased nodes', () => {
    const game = new GameStateManager();
    game.totalGnoseEarned = 1;
    ['gn_init_faith', 'gn_memoria_selos', 'gn_click_power', 'unknown'].forEach(id => game.unlockedGnoseUpgrades.add(id));
    expect(game.canChallengeBoss('boss_anubis')).toBe(false);
  });

  it.each([3, 4, 5, 6])('keeps Anubis available with %s assimilated nodes', count => {
    const game = new GameStateManager();
    game.totalGnoseEarned = 1;
    GNOSE_UPGRADES.filter(node => node.tier === 1).slice(0, count).forEach(node => game.unlockedGnoseUpgrades.add(node.id));
    expect(game.canChallengeBoss('boss_anubis')).toBe(true);
    const restored = new GameStateManager();
    restored.applySaveData(game.buildSaveData());
    expect(restored.canChallengeBoss('boss_anubis')).toBe(true);
  });

  it('preserves the rematch of previously defeated Anubis in legacy saves', () => {
    const game = new GameStateManager();
    game.defeatedBosses.add('boss_anubis');
    expect(game.canChallengeBoss('boss_anubis')).toBe(false);
    expect(game.canChallengeBoss('boss_anubis', { isRematch: true })).toBe(true);
  });
});
