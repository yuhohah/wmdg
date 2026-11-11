import { describe, expect, it } from 'vitest';
import { GNOSE_UPGRADES, PROGRESSION_REVISION_1_PRICES } from './gnose.js';
import { GameStateManager } from '../core/GameState.js';

describe('Gnose cost progression', () => {
  it('lists every tier by ascending cost with prerequisites before their children', () => {
    const seen = new Set<string>();
    for (const [index, node] of GNOSE_UPGRADES.entries()) {
      for (const prerequisite of node.prerequisites) expect(seen.has(prerequisite)).toBe(true);
      const previous = GNOSE_UPGRADES[index - 1];
      if (previous?.tier === node.tier) expect(node.cost).toBeGreaterThanOrEqual(previous.cost);
      if (previous) expect(node.tier).toBeGreaterThanOrEqual(previous.tier);
      seen.add(node.id);
    }
  });

  it('reduces early price steps without raising any existing price', () => {
    for (const node of GNOSE_UPGRADES) expect(node.cost).toBeLessThanOrEqual(PROGRESSION_REVISION_1_PRICES[node.id]);
    const path = ['gn_init_faith', 'gn_memoria_selos', 'gn_automation', 'gn_seal_automation', 'gn_init_fervor'];
    const costs = path.map(id => GNOSE_UPGRADES.find(node => node.id === id)!.cost);
    for (let i = 1; i < costs.length; i++) expect(costs[i] / costs[i - 1]).toBeLessThanOrEqual(24);
  });

  it('refunds only purchased price differences once, preserving lifetime Gnose and progress', () => {
    const game = new GameStateManager();
    game.gnosePoints = 4;
    game.totalGnoseEarned = 100000;
    for (const id of ['gn_init_faith', 'gn_memoria_selos', 'gn_automation']) game.unlockedGnoseUpgrades.add(id);
    const save = game.buildSaveData();
    save.progressionRevision = 1;
    const restored = new GameStateManager();
    restored.applySaveData(save);
    expect(restored.gnosePoints).toBe(4 + (57 - 24) + (1100 - 300));
    expect(restored.totalGnoseEarned).toBe(game.totalGnoseEarned);
    expect(restored.unlockedGnoseUpgrades).toEqual(game.unlockedGnoseUpgrades);
    const again = new GameStateManager();
    again.applySaveData(restored.buildSaveData());
    expect(again.gnosePoints).toBe(restored.gnosePoints);
  });

  it('never assumes legacy saves paid revision 1 prices', () => {
    const game = new GameStateManager();
    game.unlockedGnoseUpgrades.add('gn_automation');
    const save = game.buildSaveData();
    delete save.progressionRevision;
    const restored = new GameStateManager();
    restored.applySaveData(save);
    expect(restored.gnosePoints).toBe(0); // The known legacy price was 8, below the new price.
    expect(restored.hasGnoseUpgrade('gn_automation')).toBe(true);
  });
});
