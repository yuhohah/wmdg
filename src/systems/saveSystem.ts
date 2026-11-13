// --- Save System for Cult of the Sphere ---

import type {
  Achievement,
  BuyableItem,
  FervorUpgrade,
  GameState as GameStateSnapshot,
  GnoseSaveData,
  MechanicUnlock,
  RelicUpgrade,
} from '../types.js';
import { INCARNATION_STAGES } from '../config/incarnation.js';
import { GNOSE_BOSSES } from '../config/bosses.js';
import {
  GNOSE_UPGRADES,
  LEGACY_GNOSE_AUTOMATIONS,
  LEGACY_GNOSE_SEAL_AUTOMATIONS,
  PROGRESSION_OLD_PRICES,
  PROGRESSION_REVISION,
  PROGRESSION_REVISION_1_PRICES,
  PROGRESSION_REVISION_2_PRICES,
  PROGRESSION_REVISION_3_PRICES,
  PROGRESSION_REVISION_4_PRICES,
  RETIRED_GNOSE_UPGRADES,
} from '../config/gnose.js';

export interface SaveData {
  version: number;
  timestamp: number;
  stats: {
    campaignEnding?: 'pending' | 'completed' | 'freeplay';
    faithPoints: number;
    totalFaithAccumulated: number;
    totalClicks: number;
    gameStartedAtMs?: number;
    fervorPoints: number;
    fervorPeakThisRun?: number;
    relicPeakThisRun?: number;
    totalFervorGenerated?: number;
    incarnationStage: number;
    relicPoints: number;
    totalRelicsGenerated?: number;
    bestRelicsToGet: number;
    incarnationBoostTimer?: number;
    hasSeenIntro?: boolean;
    seenCardTutorials?: string[];
    nerdsEnabled?: boolean;
    hideGuidance?: boolean;
    showHotkeys?: boolean;
    convertMaxUnlocked?: boolean;
    bulkFervorEnabled?: boolean;
    bulkRelicsEnabled?: boolean;
  };
  followers: Array<{ id: string; count: number }>;
  fervorUpgrades: Array<{ id: string; level: number }>;
  relicUpgrades: Array<{ id: string; level: number }>;
  unlocks: string[];
  achievements: string[];
  gnose?: GnoseSaveData;
  progressionRevision?: number;
}

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const nonnegative = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const integer = (value: unknown) => nonnegative(value) && Number.isInteger(value);
const strings = (value: unknown) => Array.isArray(value) && value.every(item => typeof item === 'string');
const optional = (object: Record<string, unknown>, key: string, check: (value: unknown) => boolean) =>
  object[key] === undefined || check(object[key]);

/** Check the actual persistence boundary, including legacy optional fields, before any mutation. */
export function isValidSaveData(value: unknown): value is SaveData {
  if (!record(value) || value.version !== SaveSystem.CURRENT_VERSION || !nonnegative(value.timestamp) || !record(value.stats)) return false;
  const stats = value.stats;
  if (!['faithPoints', 'totalFaithAccumulated', 'fervorPoints', 'relicPoints', 'bestRelicsToGet'].every(key => nonnegative(stats[key]))) return false;
  if (!integer(stats.totalClicks) || !integer(stats.incarnationStage) || stats.incarnationStage === 0) return false;
  if (!['fervorPeakThisRun', 'relicPeakThisRun', 'totalFervorGenerated', 'totalRelicsGenerated', 'incarnationBoostTimer', 'gameStartedAtMs']
    .every(key => optional(stats, key, nonnegative))) return false;
  if (!['hasSeenIntro', 'nerdsEnabled', 'hideGuidance', 'showHotkeys', 'convertMaxUnlocked', 'bulkFervorEnabled', 'bulkRelicsEnabled'].every(key => optional(stats, key, v => typeof v === 'boolean'))) return false;
  if (!optional(stats, 'seenCardTutorials', strings) || !optional(stats, 'campaignEnding', v => typeof v === 'string' && ['pending', 'completed', 'freeplay'].includes(v))) return false;
  for (const [key, field] of [['followers', 'count'], ['fervorUpgrades', 'level'], ['relicUpgrades', 'level']]) {
    const items = value[key];
    if (!Array.isArray(items) || !items.every(item => record(item) && typeof item.id === 'string' && integer(item[field]))) return false;
  }
  if (!strings(value.unlocks) || !strings(value.achievements) || !optional(value, 'progressionRevision', integer)) return false;
  if (value.gnose !== undefined) {
    if (!record(value.gnose)) return false;
    const gnose = value.gnose;
    if (!['gnosePoints', 'totalGnoseEarned', 'bossCurseTimerSec', 'automationAccumulatorSec', 'autoFollowersBudget', 'autoFervorBudget']
      .every(key => optional(gnose, key, nonnegative)) || !optional(gnose, 'gnoseResets', integer)) return false;
    if (!['unlockedUpgrades', 'defeatedBosses'].every(key => optional(gnose, key, strings))) return false;
    if (!['confirmReset', 'autoFollowersEnabled', 'autoFervorEnabled', 'autoRelicsEnabled', 'autoRelicUpgradesEnabled']
      .every(key => optional(gnose, key, v => typeof v === 'boolean'))) return false;
    if (!optional(gnose, 'bestBossTimesSec', times => record(times) && Object.values(times).every(time => nonnegative(time) && time > 0))) return false;
  }
  return true;
}

export class SaveSystem {
  public static readonly CURRENT_VERSION = 1;
  private static readonly STORAGE_KEY = 'cult_of_the_sphere_save_v1';
  private static readonly BACKUP_KEY = 'cult_of_the_sphere_save_backup';

  /**
   * Serializes the save data to a JSON string.
   */
  public static serialize(data: SaveData): string {
    if (!isValidSaveData(data)) throw new TypeError('Dados de progresso inválidos.');
    return JSON.stringify(data);
  }

  /**
   * Deserializes and validates a JSON string into SaveData.
   */
  public static deserialize(jsonStr: string): SaveData | null {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!isValidSaveData(parsed)) {
        return null;
      }
      return parsed;
    } catch (err) {
      console.error('Falha ao decodificar JSON do save:', err);
      return null;
    }
  }

  /**
   * Saves game data to localStorage, saving a backup copy first.
   */
  public static save(data: SaveData): boolean {
    try {
      const json = this.serialize(data);
      // Backup current valid save before overwriting
      const existing = localStorage.getItem(this.STORAGE_KEY);
      if (existing && this.deserialize(existing)) {
        localStorage.setItem(this.BACKUP_KEY, existing);
      }
      localStorage.setItem(this.STORAGE_KEY, json);
      return true;
    } catch (err) {
      console.error('Erro ao salvar no localStorage:', err);
      return false;
    }
  }

  /**
   * Loads game data from localStorage with automatic fallback to backup.
   */
  public static load(): SaveData | null {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed = this.deserialize(raw);
        if (parsed) return parsed;
      }

      // Try fallback backup if primary save is absent or corrupt
      const backup = localStorage.getItem(this.BACKUP_KEY);
      if (backup) {
        console.warn('Recuperando save a partir do backup...');
        const parsedBackup = this.deserialize(backup);
        if (parsedBackup) return parsedBackup;
      }
    } catch (err) {
      console.error('Erro ao carregar dados do save:', err);
    }
    return null;
  }

  /**
   * Encodes current SaveData into a portable Base64 string.
   */
  public static exportSave(data: SaveData): string {
    const json = this.serialize(data);
    return btoa(encodeURIComponent(json));
  }

  /**
   * Decodes an exported Base64 string into SaveData.
   */
  public static importSave(dataStr: string): SaveData | null {
    try {
      const cleanStr = dataStr.trim();
      const decodedJson = decodeURIComponent(atob(cleanStr));
      return this.deserialize(decodedJson);
    } catch (err) {
      console.error('Erro ao importar save string:', err);
      return null;
    }
  }

  /**
   * Clears all save keys from localStorage.
   */
  public static resetSave(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.BACKUP_KEY);
    } catch (err) {
      console.error('Erro ao limpar dados do save:', err);
    }
  }
}

export interface SaveStateHost {
  campaignEnding: 'pending' | 'completed' | 'freeplay';
  faithPoints: number;
  totalFaithAccumulated: number;
  totalClicks: number;
  gameStartedAtMs: number;
  fervorPoints: number;
  fervorPeakThisRun: number;
  relicPeakThisRun: number;
  totalFervorGenerated: number;
  incarnationStage: number;
  relicPoints: number;
  totalRelicsGenerated: number;
  bestRelicsToGet: number;
  incarnationBoostTimer: number;
  hasSeenIntro: boolean;
  seenCardTutorials: Set<string>;
  hideGuidance: boolean;
  showHotkeys: boolean;
  convertMaxUnlocked: boolean;
  bulkFervorEnabled: boolean;
  bulkRelicsEnabled: boolean;
  nerdsEnabled: boolean;
  followers: BuyableItem[];
  fervorUpgrades: FervorUpgrade[];
  relicUpgrades: RelicUpgrade[];
  unlocks: MechanicUnlock[];
  achievements: Achievement[];
  gnosePoints: number;
  totalGnoseEarned: number;
  gnoseResets: number;
  unlockedGnoseUpgrades: Set<string>;
  defeatedBosses: Set<string>;
  bestBossTimesSec: Record<string, number>;
  bossCurseTimerSec: number;
  gnoseAutoAccumulatorSec: number;
  sphereAutoAccumulatorSec: number;
  confirmGnoseReset: boolean;
  autoFollowersEnabled: boolean;
  autoFervorEnabled: boolean;
  autoRelicsEnabled: boolean;
  autoRelicUpgradesEnabled: boolean;
  resetToDefaults(): void;
  retreatBossBattle(): void;
  getMaxIncarnationBoost(): number;
  isConvertMaxUnlocked(): boolean;
  isRelicsUnlocked(): boolean;
  isIncarnationUnlocked(): boolean;
  hasGnoseUpgrade(upgradeId: string): boolean;
  getRelicMaxLevel(relic: RelicUpgrade): number;
  getSnapshot(): GameStateSnapshot;
}

export function buildSaveDataFromState(state: SaveStateHost): SaveData {
  return {
    version: SaveSystem.CURRENT_VERSION,
    progressionRevision: PROGRESSION_REVISION,
    timestamp: Date.now(),
    stats: {
      campaignEnding: state.campaignEnding,
      faithPoints: state.faithPoints,
      totalFaithAccumulated: state.totalFaithAccumulated,
      totalClicks: state.totalClicks,
      gameStartedAtMs: state.gameStartedAtMs,
      fervorPoints: state.fervorPoints,
      fervorPeakThisRun: state.fervorPeakThisRun,
      relicPeakThisRun: state.relicPeakThisRun,
      totalFervorGenerated: state.totalFervorGenerated,
      incarnationStage: state.incarnationStage,
      relicPoints: state.relicPoints,
      totalRelicsGenerated: state.totalRelicsGenerated,
      bestRelicsToGet: state.bestRelicsToGet,
      incarnationBoostTimer: state.incarnationBoostTimer,
      hasSeenIntro: state.hasSeenIntro,
      seenCardTutorials: Array.from(state.seenCardTutorials),
      hideGuidance: state.hideGuidance,
      showHotkeys: state.showHotkeys,
      convertMaxUnlocked: state.isConvertMaxUnlocked(),
      bulkFervorEnabled: state.bulkFervorEnabled,
      bulkRelicsEnabled: state.bulkRelicsEnabled,
      nerdsEnabled: state.nerdsEnabled,
    },
    followers: state.followers.map((f) => ({ id: f.id, count: f.count })),
    fervorUpgrades: state.fervorUpgrades.map((u) => ({ id: u.id, level: u.level })),
    relicUpgrades: state.relicUpgrades.map((r) => ({ id: r.id, level: r.level })),
    unlocks: state.unlocks.filter((u) => u.unlocked).map((u) => u.id),
    achievements: state.achievements.filter((a) => a.unlocked).map((a) => a.id),
    gnose: {
      gnosePoints: state.gnosePoints,
      totalGnoseEarned: state.totalGnoseEarned,
      gnoseResets: state.gnoseResets,
      unlockedUpgrades: Array.from(state.unlockedGnoseUpgrades),
      defeatedBosses: Array.from(state.defeatedBosses),
      bestBossTimesSec: { ...state.bestBossTimesSec },
      bossCurseTimerSec: state.bossCurseTimerSec,
      automationAccumulatorSec: state.gnoseAutoAccumulatorSec,
      sphereAutoAccumulatorSec: state.sphereAutoAccumulatorSec,
      confirmReset: state.confirmGnoseReset,
      autoFollowersEnabled: state.autoFollowersEnabled,
      autoFervorEnabled: state.autoFervorEnabled,
      autoRelicsEnabled: state.autoRelicsEnabled,
      autoRelicUpgradesEnabled: state.autoRelicUpgradesEnabled,
    },
  };
}

export function applySaveDataToState(state: SaveStateHost, save: SaveData): void {
  if (!isValidSaveData(save)) throw new TypeError('Dados de progresso inválidos.');
  state.retreatBossBattle();
  state.resetToDefaults();
  state.campaignEnding =
    save.stats.campaignEnding === 'completed' || save.stats.campaignEnding === 'freeplay'
      ? save.stats.campaignEnding
      : 'pending';
  state.retreatBossBattle();

  state.faithPoints = typeof save.stats.faithPoints === 'number' ? Math.max(0, save.stats.faithPoints) : 0;
  state.totalFaithAccumulated =
    typeof save.stats.totalFaithAccumulated === 'number' ? Math.max(0, save.stats.totalFaithAccumulated) : 0;
  state.totalClicks = typeof save.stats.totalClicks === 'number' ? Math.max(0, save.stats.totalClicks) : 0;
  state.gameStartedAtMs = save.stats.gameStartedAtMs ?? 0;
  state.fervorPoints = typeof save.stats.fervorPoints === 'number' ? Math.max(0, save.stats.fervorPoints) : 0;
  state.totalFervorGenerated = Math.max(
    state.fervorPoints,
    Number.isFinite(save.stats.totalFervorGenerated) ? save.stats.totalFervorGenerated! : 0
  );
  state.incarnationStage =
    typeof save.stats.incarnationStage === 'number'
      ? Math.min(INCARNATION_STAGES.length, Math.max(1, save.stats.incarnationStage))
      : 1;
  state.relicPoints = typeof save.stats.relicPoints === 'number' ? Math.max(0, save.stats.relicPoints) : 0;
  state.fervorPeakThisRun = Math.max(
    state.fervorPoints,
    Number.isFinite(save.stats.fervorPeakThisRun) ? save.stats.fervorPeakThisRun! : 0
  );
  state.relicPeakThisRun = Math.max(
    state.relicPoints,
    Number.isFinite(save.stats.relicPeakThisRun) ? save.stats.relicPeakThisRun! : 0
  );
  state.bestRelicsToGet =
    typeof save.stats.bestRelicsToGet === 'number' ? Math.max(0, save.stats.bestRelicsToGet) : 0;
  state.incarnationBoostTimer =
    typeof save.stats.incarnationBoostTimer === 'number'
      ? Math.max(0, Math.min(state.getMaxIncarnationBoost(), save.stats.incarnationBoostTimer))
      : 0;
  state.hasSeenIntro = typeof save.stats.hasSeenIntro === 'boolean' ? save.stats.hasSeenIntro : false;
  state.nerdsEnabled = save.stats.nerdsEnabled === true;
  state.hideGuidance = save.stats.hideGuidance === true;
  state.showHotkeys = save.stats.showHotkeys !== false;
  state.convertMaxUnlocked = save.stats.convertMaxUnlocked === true;
  state.bulkFervorEnabled = save.stats.bulkFervorEnabled === true;
  state.bulkRelicsEnabled = save.stats.bulkRelicsEnabled === true;
  state.seenCardTutorials = new Set(
    Array.isArray(save.stats.seenCardTutorials)
      ? save.stats.seenCardTutorials.filter((id) => typeof id === 'string')
      : []
  );

  if (Array.isArray(save.followers)) {
    save.followers.forEach((savedItem) => {
      const item = state.followers.find((f) => f.id === savedItem.id);
      if (item && typeof savedItem.count === 'number') {
        item.count = Math.max(0, savedItem.count);
      }
    });
  }

  if (Array.isArray(save.fervorUpgrades)) {
    save.fervorUpgrades.forEach((savedItem) => {
      const upg = state.fervorUpgrades.find((u) => u.id === savedItem.id);
      if (upg && typeof savedItem.level === 'number') {
        upg.level = Math.max(0, savedItem.level);
      }
    });
  }

  if (Array.isArray(save.unlocks)) {
    state.unlocks.forEach((u) => {
      u.unlocked = save.unlocks.includes(u.id);
    });
  }

  if (!state.isRelicsUnlocked()) {
    state.relicPoints = 0;
    state.bestRelicsToGet = 0;
  }

  state.totalRelicsGenerated = Math.max(
    state.relicPoints,
    state.bestRelicsToGet,
    Number.isFinite(save.stats.totalRelicsGenerated) ? save.stats.totalRelicsGenerated! : 0
  );

  if (Array.isArray(save.achievements)) {
    state.achievements.forEach((a) => {
      a.unlocked = a.id.startsWith('ach_click_')
        ? a.check(state.getSnapshot())
        : save.achievements.includes(a.id) || (a.id.startsWith('ach_f_') && a.check(state.getSnapshot()));
    });
  }

  if (save.gnose) {
    state.gnosePoints = typeof save.gnose.gnosePoints === 'number' ? Math.max(0, save.gnose.gnosePoints) : 0;
    state.totalGnoseEarned =
      typeof save.gnose.totalGnoseEarned === 'number' ? Math.max(0, save.gnose.totalGnoseEarned) : 0;
    state.gnoseResets = typeof save.gnose.gnoseResets === 'number' ? Math.max(0, save.gnose.gnoseResets) : 0;
    if (Array.isArray(save.gnose.unlockedUpgrades)) {
      state.unlockedGnoseUpgrades = new Set(save.gnose.unlockedUpgrades);
    } else {
      state.unlockedGnoseUpgrades.clear();
    }
    if (Array.isArray(save.gnose.defeatedBosses)) {
      state.defeatedBosses = new Set(save.gnose.defeatedBosses);
    } else {
      state.defeatedBosses.clear();
    }
    state.bestBossTimesSec = {};
    if (save.gnose.bestBossTimesSec && typeof save.gnose.bestBossTimesSec === 'object') {
      for (const [k, v] of Object.entries(save.gnose.bestBossTimesSec)) {
        if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
          state.bestBossTimesSec[k] = v;
        }
      }
    }
    if ((save.progressionRevision ?? 0) < PROGRESSION_REVISION) {
      // Unversioned saves only have known historical prices for a few nodes.
      // Never assume they paid the later, much higher revision 1 prices.
      const revision = save.progressionRevision ?? 0;
      const paidPrices =
        revision < 1
          ? PROGRESSION_OLD_PRICES
          : revision < 2
            ? PROGRESSION_REVISION_1_PRICES
            : revision < 3
              ? PROGRESSION_REVISION_2_PRICES
              : revision < 4
                ? PROGRESSION_REVISION_3_PRICES
                : PROGRESSION_REVISION_4_PRICES;
      for (const [id, paid] of Object.entries(paidPrices)) {
        if (state.hasGnoseUpgrade(id)) {
          state.gnosePoints += Math.max(0, paid - GNOSE_UPGRADES.find((u) => u.id === id)!.cost);
        }
      }
    }
    migrateGnoseUpgrades(state);
    state.bossCurseTimerSec =
      typeof save.gnose.bossCurseTimerSec === 'number' ? Math.max(0, save.gnose.bossCurseTimerSec) : 0;
    state.sphereAutoAccumulatorSec = Number.isFinite(save.gnose.sphereAutoAccumulatorSec)
      ? Math.max(0, Math.min(1, save.gnose.sphereAutoAccumulatorSec!))
      : 0;
    state.gnoseAutoAccumulatorSec = Number.isFinite(save.gnose.automationAccumulatorSec)
      ? Math.max(0, Math.min(1, save.gnose.automationAccumulatorSec!))
      : 0;
    state.confirmGnoseReset = typeof save.gnose.confirmReset === 'boolean' ? save.gnose.confirmReset : true;
    state.autoFollowersEnabled =
      typeof save.gnose.autoFollowersEnabled === 'boolean' ? save.gnose.autoFollowersEnabled : true;
    state.autoFervorEnabled =
      typeof save.gnose.autoFervorEnabled === 'boolean' ? save.gnose.autoFervorEnabled : true;
    state.autoRelicsEnabled =
      typeof save.gnose.autoRelicsEnabled === 'boolean' ? save.gnose.autoRelicsEnabled : true;
    state.autoRelicUpgradesEnabled =
      typeof save.gnose.autoRelicUpgradesEnabled === 'boolean'
        ? save.gnose.autoRelicUpgradesEnabled
        : true;
  } else {
    state.gnosePoints = 0;
    state.totalGnoseEarned = 0;
    state.gnoseResets = 0;
    state.unlockedGnoseUpgrades.clear();
    state.defeatedBosses.clear();
    state.bestBossTimesSec = {};
    state.bossCurseTimerSec = 0;
  }

  if (Array.isArray(save.relicUpgrades)) {
    save.relicUpgrades.forEach((savedItem) => {
      const rel = state.relicUpgrades.find((r) => r.id === savedItem.id);
      if (rel && typeof savedItem.level === 'number') {
        rel.level = Math.max(
          0,
          Math.min(state.getRelicMaxLevel(rel), Number.MAX_SAFE_INTEGER, savedItem.level)
        );
      }
    });
  }

  if (state.hasGnoseUpgrade('gn_bencao_eterna') && state.isIncarnationUnlocked()) {
    state.incarnationBoostTimer = state.getMaxIncarnationBoost();
  }
}

export function migrateGnoseUpgrades(state: SaveStateHost): void {
  for (const upgrade of RETIRED_GNOSE_UPGRADES) {
    if (!state.unlockedGnoseUpgrades.delete(upgrade.id)) continue;
    state.gnosePoints += upgrade.cost;
    // Owning a later-tier purchase already made that tier accessible in old saves.
    const guardian = GNOSE_BOSSES.find((boss) => boss.unlocksTier === upgrade.tier);
    if (guardian) state.defeatedBosses.add(guardian.id);
  }
  const automations = LEGACY_GNOSE_AUTOMATIONS.filter((upgrade) =>
    state.unlockedGnoseUpgrades.delete(upgrade.id)
  );
  if (automations.length > 0) {
    const automation = GNOSE_UPGRADES.find((upgrade) => upgrade.id === 'gn_automation')!;
    const previousCost = automations.reduce((sum, upgrade) => sum + upgrade.cost, 0);
    state.gnosePoints += state.hasGnoseUpgrade(automation.id)
      ? previousCost
      : Math.max(0, previousCost - automation.cost);
    state.unlockedGnoseUpgrades.add(automation.id);
  }
  const sealAutomations = LEGACY_GNOSE_SEAL_AUTOMATIONS.filter((upgrade) =>
    state.unlockedGnoseUpgrades.delete(upgrade.id)
  );
  if (sealAutomations.length > 0) {
    const replacement = GNOSE_UPGRADES.find((upgrade) => upgrade.id === 'gn_seal_automation')!;
    const paid = sealAutomations.reduce((sum, upgrade) => sum + upgrade.cost, 0);
    state.gnosePoints += state.hasGnoseUpgrade(replacement.id)
      ? paid
      : Math.max(0, paid - replacement.cost);
    state.unlockedGnoseUpgrades.add(replacement.id);
    // Preserve access granted by a tier-II purchase in older saves.
    for (const upgrade of sealAutomations) {
      const guardian = GNOSE_BOSSES.find((boss) => boss.unlocksTier === upgrade.tier);
      if (guardian) state.defeatedBosses.add(guardian.id);
    }
  }
  const validIds = new Set(GNOSE_UPGRADES.map((upgrade) => upgrade.id));
  state.unlockedGnoseUpgrades = new Set(
    [...state.unlockedGnoseUpgrades].filter((id) => validIds.has(id))
  );
}

