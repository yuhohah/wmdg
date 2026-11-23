import { describe, expect, it } from 'vitest';
import { GNOSE_UPGRADES, PROGRESSION_REVISION } from '../config/gnose.js';
import { GameStateManager } from '../core/GameState.js';
import { getPurchaseFormulas } from './purchaseFormulas.js';
import { applySaveDataToState, buildSaveDataFromState } from './saveSystem.js';

describe('gnose tree structure and mechanics', () => {
  it('merges Liturgia Autônoma and Oficina Autônoma into one Tier 2 node and adds unlimited relics in Tier 1', () => {
    expect(GNOSE_UPGRADES.find((u) => u.id === 'gn_ritual_automation')).toBeUndefined();
    expect(GNOSE_UPGRADES.find((u) => u.id === 'gn_relic_automation')).toBeUndefined();

    const merged = GNOSE_UPGRADES.find((u) => u.id === 'gn_ritual_relic_automation');
    expect(merged).toBeDefined();
    expect(merged?.tier).toBe(2);

    const unlimited = GNOSE_UPGRADES.find((u) => u.id === 'gn_unlimited_relics');
    expect(unlimited).toBeDefined();
    expect(unlimited?.tier).toBe(1);

    for (const tier of [1, 2, 3, 4] as const) {
      const costs = GNOSE_UPGRADES.filter((u) => u.tier === tier).map((u) => u.cost);
      expect(costs).toEqual([...costs].sort((a, b) => a - b));
    }

    const gs = new GameStateManager();
    for (const upg of GNOSE_UPGRADES) {
      const formulas = getPurchaseFormulas(gs, upg.id);
      expect(formulas, `missing purchase formula for ${upg.id}`).not.toBeNull();
      expect(formulas?.bonus).toBeTruthy();
    }
  });

  it('removes Cornucópia and Tocha caps only with gn_unlimited_relics, not with Cripta Eterna', () => {
    const gs = new GameStateManager();
    const cornucopia = gs.relicUpgrades.find((r) => r.id === 'relic_cornucopia')!;
    const torch = gs.relicUpgrades.find((r) => r.id === 'relic_torch')!;
    const phoenix = gs.relicUpgrades.find((r) => r.id === 'relic_phoenix')!;

    expect(gs.getRelicMaxLevel(cornucopia)).toBe(20);
    expect(gs.getRelicMaxLevel(torch)).toBe(20);
    expect(gs.getRelicMaxLevel(phoenix)).toBe(1);

    // Cripta Eterna preserves levels on ascension, without removing caps.
    gs.unlockedGnoseUpgrades.add('gn_keep_relics');
    expect(gs.getRelicMaxLevel(cornucopia)).toBe(20);
    expect(gs.getRelicMaxLevel(torch)).toBe(20);

    cornucopia.level = 20;
    torch.level = 20;
    phoenix.level = 1;
    gs.relicPoints = 1e12;
    expect(gs.buyRelicUpgrade(cornucopia)).toBe(false);
    expect(gs.buyRelicUpgrade(torch)).toBe(false);

    // Ascension preserves finite relics 100% and Cornucópia/Tocha 50%.
    gs.unlocks.forEach((u) => { u.unlocked = true; });
    gs.faithPoints = 1e16;
    const res = gs.performGnoseReset();
    expect(res.success).toBe(true);
    expect(phoenix.level).toBe(1);
    expect(cornucopia.level).toBe(10);
    expect(torch.level).toBe(10);

    // Tier 1 node removes the cap on Cornucópia and Tocha only.
    gs.unlockedGnoseUpgrades.delete('gn_keep_relics');
    gs.unlockedGnoseUpgrades.add('gn_unlimited_relics');
    expect(gs.getRelicMaxLevel(cornucopia)).toBe(Infinity);
    expect(gs.getRelicMaxLevel(torch)).toBe(Infinity);
    expect(gs.getRelicMaxLevel(phoenix)).toBe(1);

    cornucopia.level = 20;
    torch.level = 20;
    gs.relicPoints = 1e6;
    expect(gs.buyRelicUpgrade(cornucopia)).toBe(true);
    expect(gs.buyRelicUpgrade(torch)).toBe(true);
    expect(cornucopia.level).toBe(21);
    expect(torch.level).toBe(21);

    // Without Cripta Eterna, Ascension resets relic levels even with gn_unlimited_relics.
    gs.unlocks.forEach((u) => { u.unlocked = true; });
    gs.faithPoints = 1e16;
    gs.performGnoseReset();
    expect(cornucopia.level).toBe(0);
    expect(torch.level).toBe(0);
    expect(phoenix.level).toBe(0);
  });

  it('runs both ritual and relic automation from the merged gn_ritual_relic_automation node', () => {
    const gs = new GameStateManager();
    gs.unlocks.forEach((u) => { u.unlocked = true; });
    gs.fervorPoints = 1e6;
    gs.relicPoints = 1e6;

    // Without the merged node, neither ritual nor relic automation runs.
    gs.runGnoseAutomation();
    expect(gs.fervorUpgrades.every((u) => u.level === 0)).toBe(true);
    expect(gs.relicUpgrades.every((r) => r.level === 0)).toBe(true);

    // With the merged node, both automations run and respect their independent toggles.
    gs.unlockedGnoseUpgrades.add('gn_ritual_relic_automation');
    gs.autoFervorEnabled = true;
    gs.autoRelicUpgradesEnabled = false;
    gs.runGnoseAutomation();
    expect(gs.fervorUpgrades.some((u) => u.level > 0)).toBe(true);
    expect(gs.relicUpgrades.every((r) => r.level === 0)).toBe(true);

    gs.autoFervorEnabled = false;
    gs.autoRelicUpgradesEnabled = true;
    gs.runGnoseAutomation();
    expect(gs.relicUpgrades.some((r) => r.level > 0)).toBe(true);
  });

  it('migrates legacy revision 6 and revision 5 saves safely', () => {
    // 1. Rev 6 player still in Tier 1 (Hades not defeated) gets refunded and does not bypass Tier 2.
    const tier1Source = new GameStateManager();
    const tier1Save = buildSaveDataFromState(tier1Source);
    tier1Save.progressionRevision = 6;
    tier1Save.gnose!.gnosePoints = 0;
    tier1Save.gnose!.defeatedBosses = ['boss_anubis'];
    tier1Save.gnose!.unlockedUpgrades = ['gn_memoria_selos', 'gn_ritual_automation', 'gn_relic_automation'];

    const loadedTier1 = new GameStateManager();
    applySaveDataToState(loadedTier1, tier1Save);
    expect(loadedTier1.hasGnoseUpgrade('gn_ritual_relic_automation')).toBe(false);
    expect(loadedTier1.isGnoseTierUnlocked(2)).toBe(false);
    expect(loadedTier1.gnosePoints).toBe(19);

    // 2. Rev 6 player in Tier 2+ migrates to gn_ritual_relic_automation and keeps unlimited relics from old Cripta Eterna.
    const tier2Source = new GameStateManager();
    const tier2Save = buildSaveDataFromState(tier2Source);
    tier2Save.progressionRevision = 6;
    tier2Save.gnose!.gnosePoints = 5;
    tier2Save.gnose!.defeatedBosses = ['boss_anubis', 'boss_cronos'];
    tier2Save.gnose!.unlockedUpgrades = ['gn_ritual_automation', 'gn_relic_automation', 'gn_keep_relics'];
    tier2Save.relicUpgrades = [{ id: 'relic_cornucopia', level: 35 }];

    const loadedTier2 = new GameStateManager();
    applySaveDataToState(loadedTier2, tier2Save);
    expect(loadedTier2.hasGnoseUpgrade('gn_ritual_relic_automation')).toBe(true);
    expect(loadedTier2.hasGnoseUpgrade('gn_keep_relics')).toBe(true);
    expect(loadedTier2.hasGnoseUpgrade('gn_unlimited_relics')).toBe(true);
    expect(loadedTier2.relicUpgrades.find((r) => r.id === 'relic_cornucopia')?.level).toBe(35);
    expect(loadedTier2.gnosePoints).toBe(5);

    // 3. Rev 5 player who paid 20 + 25 = 45 for separate automations gets migrated and refunded 15 Gnose.
    const rev5Save = buildSaveDataFromState(new GameStateManager());
    rev5Save.progressionRevision = 5;
    rev5Save.gnose!.gnosePoints = 0;
    rev5Save.gnose!.defeatedBosses = ['boss_anubis', 'boss_cronos'];
    rev5Save.gnose!.unlockedUpgrades = ['gn_ritual_automation', 'gn_relic_automation'];

    const loadedRev5 = new GameStateManager();
    applySaveDataToState(loadedRev5, rev5Save);
    expect(loadedRev5.hasGnoseUpgrade('gn_ritual_relic_automation')).toBe(true);
    expect(loadedRev5.gnosePoints).toBe(15);

    // 4. Current revision save owning only Cripta Eterna does NOT auto-grant gn_unlimited_relics.
    const rev7Save = buildSaveDataFromState(new GameStateManager());
    rev7Save.progressionRevision = PROGRESSION_REVISION;
    rev7Save.gnose!.defeatedBosses = ['boss_anubis', 'boss_cronos'];
    rev7Save.gnose!.unlockedUpgrades = ['gn_keep_relics'];

    const loadedRev7 = new GameStateManager();
    applySaveDataToState(loadedRev7, rev7Save);
    expect(loadedRev7.hasGnoseUpgrade('gn_keep_relics')).toBe(true);
    expect(loadedRev7.hasGnoseUpgrade('gn_unlimited_relics')).toBe(false);
  });
});
