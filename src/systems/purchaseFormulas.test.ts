import { describe, expect, it } from 'vitest';
import { GameStateManager } from '../core/GameState.js';
import { GNOSE_UPGRADES } from '../config/gnose.js';
import { getPurchaseFormulas } from './purchaseFormulas.js';

describe('purchase formula presentation', () => {
  it('uses the effective follower scale and achievement discount, including bulk sums', () => {
    const game = new GameStateManager();
    game.relicUpgrades.find(r => r.id === 'relic_caduceus')!.level = 2;
    game.unlockedGnoseUpgrades.add('gn_init_faith');
    const achievement = game.achievements.find(a => a.buffType === 'cost_discount')!;
    achievement.unlocked = true;
    const formula = getPurchaseFormulas(game, 'f_devotee')!;
    expect(formula.cost).toContain('1.08^N');
    expect(formula.cost).toContain(String(1 - achievement.buffVal));
    expect(getPurchaseFormulas(game, 'f_devotee', true)?.cost).toContain('Σ[i=0…n−1]');
    expect(getPurchaseFormulas(game, 'f_devotee', true)?.bonus).toContain('Fiéis + n');
  });

  it('updates ritual cost and gain formulas after permanent coefficient upgrades', () => {
    const game = new GameStateManager();
    expect(getPurchaseFormulas(game, 'fu_prod')).toEqual({
      cost: 'C(nível) = ⌊50 × 1.8^nível⌋ Fervor', bonus: 'M_Fervor/s(nível) = 2^(nível^0.6)',
    });
    for (const id of ['gn_init_fervor', 'gn_fu1_boost', 'gn_apotheosis', 'gn_empyrean_fire']) game.unlockedGnoseUpgrades.add(id);
    const upgraded = getPurchaseFormulas(game, 'fu_prod')!;
    expect(upgraded.cost).toContain('1.6^nível');
    expect(upgraded.bonus).toContain('2.65^(nível^0.6)');
    for (const id of ['gn_relic_gain', 'gn_relic_refinement', 'gn_perfect_opus']) game.unlockedGnoseUpgrades.add(id);
    expect(getPurchaseFormulas(game, 'fu_relics')?.cost).toContain('4.15^nível');
    expect(getPurchaseFormulas(game, 'fu_relics')?.bonus).toContain('3.75^(nível^0.6)');
  });

  it('covers all purchasable upgrades without falling back to lore or descriptions', () => {
    const game = new GameStateManager();
    const purchases = [...game.fervorUpgrades, ...game.relicUpgrades, ...GNOSE_UPGRADES, ...game.unlocks];
    for (const item of purchases) {
      const formula = getPurchaseFormulas(game, item.id)!;
      expect(formula.cost, item.id).toBeTruthy();
      expect(formula.bonus, item.id).toBeTruthy();
      expect(formula.bonus).not.toContain('undefined');
      expect(formula.bonus).not.toContain(item.lore);
      expect(formula.bonus).not.toContain(item.desc);
    }
    expect(getPurchaseFormulas(game, 'relic_cornucopia')?.cost).toContain('200 Fragmentos');
    expect(getPurchaseFormulas(game, 'unlock_gnose')?.cost).toBe('C = 0 Fé; Fé ≥ 10^15');
    expect(getPurchaseFormulas(game, 'incarnation')?.cost).toContain('2500000 Fé');
    game.incarnationStage = 5;
    expect(getPurchaseFormulas(game, 'incarnation')).toBeNull();
    expect(getPurchaseFormulas(game, 'unknown')).toBeNull();
  });

  it('defaults Nerds off and preserves the setting through saves and ascensions', () => {
    const game = new GameStateManager();
    expect(game.nerdsEnabled).toBe(false);
    game.nerdsEnabled = true;
    game.unlocks.forEach(u => { u.unlocked = true; });
    game.faithPoints = 1e18;
    expect(game.performGnoseReset().success).toBe(true);
    const restored = new GameStateManager();
    restored.applySaveData(game.buildSaveData());
    expect(restored.nerdsEnabled).toBe(true);
    const oldSave = game.buildSaveData();
    delete oldSave.stats.nerdsEnabled;
    restored.applySaveData(oldSave);
    expect(restored.nerdsEnabled).toBe(false);
    game.resetToDefaults();
    expect(game.nerdsEnabled).toBe(false);
  });
});
