import { describe, expect, it } from 'vitest';
import { GNOSE_UPGRADES, PROGRESSION_REVISION } from '../config/gnose.js';
import { GameStateManager } from '../core/GameState.js';
import { getPurchaseFormulas } from './purchaseFormulas.js';
import { applySaveDataToState, buildSaveDataFromState } from './saveSystem.js';

describe('gnose tree structure and mechanics', () => {
  it('merges Culto/Ruptura in Tier 1, Liturgia/Oficina in Tier 2, and keeps unlimited relics in Tier 1', () => {
    expect(GNOSE_UPGRADES.find((u) => u.id === 'gn_seal_automation')).toBeUndefined();
    expect(GNOSE_UPGRADES.find((u) => u.id === 'gn_ritual_automation')).toBeUndefined();
    expect(GNOSE_UPGRADES.find((u) => u.id === 'gn_relic_automation')).toBeUndefined();

    const cultSeal = GNOSE_UPGRADES.find((u) => u.id === 'gn_automation');
    expect(cultSeal).toBeDefined();
    expect(cultSeal?.tier).toBe(1);

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
    const revCurrentSave = buildSaveDataFromState(new GameStateManager());
    revCurrentSave.progressionRevision = PROGRESSION_REVISION;
    revCurrentSave.gnose!.defeatedBosses = ['boss_anubis', 'boss_cronos'];
    revCurrentSave.gnose!.unlockedUpgrades = ['gn_keep_relics'];

    const loadedCurrent = new GameStateManager();
    applySaveDataToState(loadedCurrent, revCurrentSave);
    expect(loadedCurrent.hasGnoseUpgrade('gn_keep_relics')).toBe(true);
    expect(loadedCurrent.hasGnoseUpgrade('gn_unlimited_relics')).toBe(false);
  });

  it('breaks eligible seals and converts followers from the single gn_automation node', () => {
    const gs = new GameStateManager();
    gs.faithPoints = 10_000;
    gs.autoFollowersEnabled = true;

    // Without gn_automation, neither seals nor followers are bought automatically.
    gs.runGnoseAutomation();
    expect(gs.unlocks.every((u) => !u.unlocked)).toBe(true);
    expect(gs.getTotalFollowersCount()).toBe(0);

    // With gn_automation and follower toggle paused, seals still open without buying followers.
    gs.unlockedGnoseUpgrades.add('gn_automation');
    gs.autoFollowersEnabled = false;
    gs.runGnoseAutomation();
    expect(gs.isIncarnationUnlocked()).toBe(true);
    expect(gs.isFervorUpgradesUnlocked()).toBe(true);
    expect(gs.getTotalFollowersCount()).toBe(0);

    // Enabling follower toggle recruits followers using remaining faith.
    gs.autoFollowersEnabled = true;
    gs.faithPoints = 10_000;
    gs.runGnoseAutomation();
    expect(gs.getTotalFollowersCount()).toBeGreaterThan(0);
  });

  it('migrates gn_seal_automation and legacy seal upgrades into gn_automation with accurate refunds', () => {
    // 1. Rev 7 save with both gn_automation (3) and gn_seal_automation (8) paid 11 -> refunds 5 (11 - 6).
    const bothRev7 = buildSaveDataFromState(new GameStateManager());
    bothRev7.progressionRevision = 7;
    bothRev7.gnose!.gnosePoints = 0;
    bothRev7.gnose!.defeatedBosses = ['boss_anubis'];
    bothRev7.gnose!.unlockedUpgrades = ['gn_automation', 'gn_seal_automation'];

    const loadedBothRev7 = new GameStateManager();
    applySaveDataToState(loadedBothRev7, bothRev7);
    expect(loadedBothRev7.hasGnoseUpgrade('gn_automation')).toBe(true);
    expect(loadedBothRev7.hasGnoseUpgrade('gn_seal_automation')).toBe(false);
    expect(loadedBothRev7.gnosePoints).toBe(5);

    // 2. Rev 7 save with only gn_seal_automation (8) -> migrates to gn_automation (6) and refunds 2.
    const onlySealRev7 = buildSaveDataFromState(new GameStateManager());
    onlySealRev7.progressionRevision = 7;
    onlySealRev7.gnose!.gnosePoints = 0;
    onlySealRev7.gnose!.defeatedBosses = ['boss_anubis'];
    onlySealRev7.gnose!.unlockedUpgrades = ['gn_seal_automation'];

    const loadedOnlySeal = new GameStateManager();
    applySaveDataToState(loadedOnlySeal, onlySealRev7);
    expect(loadedOnlySeal.hasGnoseUpgrade('gn_automation')).toBe(true);
    expect(loadedOnlySeal.gnosePoints).toBe(2);

    // 3. Rev 1 save with both gn_automation (1100) and gn_seal_automation (26000) -> refunds 27100 - 6 = 27094.
    const rev1Save = buildSaveDataFromState(new GameStateManager());
    rev1Save.progressionRevision = 1;
    rev1Save.gnose!.gnosePoints = 0;
    rev1Save.gnose!.defeatedBosses = ['boss_anubis'];
    rev1Save.gnose!.unlockedUpgrades = ['gn_automation', 'gn_seal_automation'];

    const loadedRev1 = new GameStateManager();
    applySaveDataToState(loadedRev1, rev1Save);
    expect(loadedRev1.hasGnoseUpgrade('gn_automation')).toBe(true);
    expect(loadedRev1.gnosePoints).toBe(27_094);

    // 4. Very old save with LEGACY_GNOSE_SEAL_AUTOMATIONS migrates to gn_automation and preserves Tier 2 guardian access.
    const legacySealSave = buildSaveDataFromState(new GameStateManager());
    legacySealSave.progressionRevision = 0;
    legacySealSave.gnose!.gnosePoints = 0;
    legacySealSave.gnose!.defeatedBosses = ['boss_anubis'];
    legacySealSave.gnose!.unlockedUpgrades = ['gn_fervor_seal', 'gn_relics_seal'];

    const loadedLegacySeal = new GameStateManager();
    applySaveDataToState(loadedLegacySeal, legacySealSave);
    expect(loadedLegacySeal.hasGnoseUpgrade('gn_automation')).toBe(true);
    expect(loadedLegacySeal.gnosePoints).toBe(10); // 4 + 12 - 6
    expect(loadedLegacySeal.defeatedBosses.has('boss_cronos')).toBe(true);
  });

  it('places calibrated Chama Astral and Alquimia Astral in Tier 1, scales Emanação Primordial, and refunds Revision 8 price drops', () => {
    const chama = GNOSE_UPGRADES.find((u) => u.id === 'gn_init_fervor');
    const alquimia = GNOSE_UPGRADES.find((u) => u.id === 'gn_relic_gain');
    expect(chama?.tier).toBe(1);
    expect(chama?.cost).toBe(4);
    expect(alquimia?.tier).toBe(1);
    expect(alquimia?.cost).toBe(8);

    const gs = new GameStateManager();
    const fuProd = gs.fervorUpgrades.find((u) => u.id === 'fu_prod')!;
    const fuRelics = gs.fervorUpgrades.find((u) => u.id === 'fu_relics')!;

    expect(gs.getFervorUpgradeEffect(fuProd, 0, 1)).toBeCloseTo(2, 6);
    expect(gs.getFervorUpgradeCostMultiplier(fuProd)).toBeCloseTo(1.8, 6);
    expect(gs.getFervorUpgradeEffect(fuRelics, 0, 1)).toBeCloseTo(3, 6);
    expect(gs.getFervorUpgradeCostMultiplier(fuRelics)).toBeCloseTo(5.0, 6);
    expect(gs.getRelicsBonusMultiplier()).toBeCloseTo(1.0, 6);

    gs.unlockedGnoseUpgrades.add('gn_init_fervor');
    gs.unlockedGnoseUpgrades.add('gn_relic_gain');
    expect(gs.getFervorUpgradeEffect(fuProd, 0, 1)).toBeCloseTo(2.18, 6);
    expect(gs.getFervorUpgradeCostMultiplier(fuProd)).toBeCloseTo(1.75, 6);
    expect(gs.getFervorUpgradeEffect(fuRelics, 0, 1)).toBeCloseTo(3.1, 6);
    expect(gs.getFervorUpgradeCostMultiplier(fuRelics)).toBeCloseTo(4.9, 6);
    // Direct 2.5x Transmutação multiplier applies immediately, even before leveling fu_relics.
    expect(gs.getRelicsBonusMultiplier()).toBeCloseTo(2.5, 6);
    fuRelics.level = 1;
    expect(gs.getRelicsBonusMultiplier()).toBeCloseTo(2.5 * 3.1, 6);

    // Gnosis Suprema keeps its full -0.05 cost scale reduction across rituals.
    gs.unlockedGnoseUpgrades.add('gn_apotheosis');
    expect(gs.getFervorUpgradeCostMultiplier(fuProd)).toBeCloseTo(1.7, 6);
    expect(gs.getFervorUpgradeCostMultiplier(fuRelics)).toBeCloseTo(4.85, 6);

    // Emanação Primordial: 1 + 0.025*sqrt(N); Congregação Esférica: 1 + sqrt(N); Coro Harmônico: 1 + N.
    gs.unlockedGnoseUpgrades.add('gn_init_faith');
    expect(gs.getGnoseFollowersSynergyMultiplier(100)).toBeCloseTo(1.25, 6);
    expect(gs.getGnoseFollowersSynergyMultiplier(400)).toBeCloseTo(1.5, 6);
    gs.unlockedGnoseUpgrades.add('gn_followers_syn');
    expect(gs.getGnoseFollowersSynergyMultiplier(100)).toBeCloseTo(11, 6);
    expect(gs.getGnoseFollowersSynergyMultiplier(400)).toBeCloseTo(21, 6);
    gs.unlockedGnoseUpgrades.add('gn_followers_cubic');
    expect(gs.getGnoseFollowersSynergyMultiplier(100)).toBeCloseTo(101, 6);

    // Revision 8 save owning both upgrades receives full price difference refunds (56 + 112 = 168).
    const rev8Save = buildSaveDataFromState(new GameStateManager());
    rev8Save.progressionRevision = 8;
    rev8Save.gnose!.gnosePoints = 0;
    rev8Save.gnose!.defeatedBosses = ['boss_anubis', 'boss_cronos'];
    rev8Save.gnose!.unlockedUpgrades = ['gn_init_fervor', 'gn_relic_gain'];

    const loadedRev8 = new GameStateManager();
    applySaveDataToState(loadedRev8, rev8Save);
    expect(loadedRev8.hasGnoseUpgrade('gn_init_fervor')).toBe(true);
    expect(loadedRev8.hasGnoseUpgrade('gn_relic_gain')).toBe(true);
    expect(loadedRev8.gnosePoints).toBe(168);
  });

  it('Vigília Perpétua keeps Blessing active and auto-evolves Incarnation before followers', () => {
    const gs = new GameStateManager();
    gs.unlocks.find((u) => u.id === 'unlock_incarnation')!.unlocked = true;
    gs.unlockedGnoseUpgrades.add('gn_bencao_eterna');
    gs.unlockedGnoseUpgrades.add('gn_automation');
    gs.faithPoints = 3e6; // Above stage 2 cost (2.5M)

    // Pausing autoIncarnationEnabled prevents evolution.
    gs.autoIncarnationEnabled = false;
    gs.autoFollowersEnabled = false;
    gs.runGnoseAutomation();
    expect(gs.incarnationStage).toBe(1);

    // Re-enabling evolves Incarnation even with auto-followers enabled, because Incarnation runs first.
    gs.autoIncarnationEnabled = true;
    gs.autoFollowersEnabled = true;
    gs.runGnoseAutomation();
    expect(gs.incarnationStage).toBe(2);
    expect(gs.faithPoints).toBeLessThan(3e6);

    // Save/load preserves autoIncarnationEnabled.
    gs.autoIncarnationEnabled = false;
    const saved = buildSaveDataFromState(gs);
    const loaded = new GameStateManager();
    applySaveDataToState(loaded, saved);
    expect(loaded.autoIncarnationEnabled).toBe(false);
  });
});
