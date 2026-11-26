import { isDemiurgeState, type DemiurgeState } from './demiurge.js';
import { computeSaveSignature, verifySaveSignature } from './saveSignature.js';
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
  LEGACY_GNOSE_RITUAL_RELIC_AUTOMATIONS,
  LEGACY_GNOSE_SEAL_AUTOMATION_DEFAULT_COST,
  LEGACY_GNOSE_SEAL_AUTOMATIONS,
  PROGRESSION_OLD_PRICES,
  PROGRESSION_REVISION,
  PROGRESSION_REVISION_1_PRICES,
  PROGRESSION_REVISION_2_PRICES,
  PROGRESSION_REVISION_3_PRICES,
  PROGRESSION_REVISION_4_PRICES,
  PROGRESSION_REVISION_5_PRICES,
  PROGRESSION_REVISION_6_PRICES,
  PROGRESSION_REVISION_7_PRICES,
  PROGRESSION_REVISION_8_PRICES,
  PROGRESSION_REVISION_9_PRICES,
  PROGRESSION_REVISION_10_PRICES,
  RETIRED_GNOSE_UPGRADES,
} from '../config/gnose.js';

export interface SaveData {
  demiurge?: DemiurgeState;
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
    targetFps?: 30 | 60;
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
  if (!optional(value, 'demiurge', isDemiurgeState)) return false;
  const stats = value.stats;
  if (!['faithPoints', 'totalFaithAccumulated', 'fervorPoints', 'relicPoints', 'bestRelicsToGet'].every(key => nonnegative(stats[key]))) return false;
  if (!integer(stats.totalClicks) || !integer(stats.incarnationStage) || stats.incarnationStage === 0) return false;
  if (!['fervorPeakThisRun', 'relicPeakThisRun', 'totalFervorGenerated', 'totalRelicsGenerated', 'incarnationBoostTimer', 'gameStartedAtMs']
    .every(key => optional(stats, key, nonnegative))) return false;
  if (!['hasSeenIntro', 'nerdsEnabled', 'hideGuidance', 'showHotkeys', 'convertMaxUnlocked', 'bulkFervorEnabled', 'bulkRelicsEnabled'].every(key => optional(stats, key, v => typeof v === 'boolean'))) return false;
  if (!optional(stats, 'targetFps', v => v === 30 || v === 60)) return false;
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
    if (!optional(gnose, 'bossCurseStacks', integer) || !optional(gnose, 'bossCurseBossId', v => v === null || typeof v === 'string')) return false;
    if (!['unlockedUpgrades', 'defeatedBosses', 'maxCurseDefeatedBosses'].every(key => optional(gnose, key, strings))) return false;
    if (!['confirmReset', 'skipBossProcession', 'autoFollowersEnabled', 'autoFervorEnabled', 'autoIncarnationEnabled', 'autoRelicsEnabled', 'autoRelicUpgradesEnabled']
      .every(key => optional(gnose, key, v => typeof v === 'boolean'))) return false;
    if (!optional(gnose, 'bestBossTimesSec', times => record(times) && Object.values(times).every(time => nonnegative(time) && time > 0))) return false;
  }
  return true;
}

interface SignedSaveEnvelope {
  v: number;
  payload: string;
  sig: string;
}

function isSignedSaveEnvelope(value: unknown): value is SignedSaveEnvelope {
  return (
    record(value) &&
    value.v === 1 &&
    typeof value.payload === 'string' &&
    typeof value.sig === 'string'
  );
}

export class SaveSystem {
  public static readonly CURRENT_VERSION = 1;
  private static readonly ENVELOPE_VERSION = 1;
  private static readonly STORAGE_KEY = 'cult_of_the_sphere_save_v1';
  private static readonly BACKUP_KEY = 'cult_of_the_sphere_save_backup';
  private static lastValidatedJson: string | null = null;

  /**
   * Serializes the save data into a signed JSON envelope.
   */
  public static serialize(data: SaveData): string {
    if (!isValidSaveData(data)) throw new TypeError('Dados de progresso inválidos.');
    const payload = JSON.stringify(data);
    const envelope: SignedSaveEnvelope = {
      v: this.ENVELOPE_VERSION,
      payload,
      sig: computeSaveSignature(payload),
    };
    return JSON.stringify(envelope);
  }

  /**
   * Verifies the integrity signature and deserializes a signed JSON envelope into SaveData.
   */
  public static deserialize(jsonStr: string): SaveData | null {
    try {
      const envelope = JSON.parse(jsonStr);
      if (!isSignedSaveEnvelope(envelope)) {
        return null;
      }
      if (!verifySaveSignature(envelope.payload, envelope.sig)) {
        return null;
      }
      const parsed = JSON.parse(envelope.payload);
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
      if (existing && (existing === this.lastValidatedJson || this.deserialize(existing))) {
        localStorage.setItem(this.BACKUP_KEY, existing);
      }
      localStorage.setItem(this.STORAGE_KEY, json);
      this.lastValidatedJson = json;
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
        if (parsed) {
          this.lastValidatedJson = raw;
          return parsed;
        }
      }

      // Try fallback backup if primary save is absent or corrupt
      const backup = localStorage.getItem(this.BACKUP_KEY);
      if (backup) {
        console.warn('Recuperando save a partir do backup...');
        const parsedBackup = this.deserialize(backup);
        if (parsedBackup) {
          this.lastValidatedJson = backup;
          return parsedBackup;
        }
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
    this.lastValidatedJson = null;
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.BACKUP_KEY);
    } catch (err) {
      console.error('Erro ao limpar dados do save:', err);
    }
  }
}

export interface SaveStateHost {
  demiurge: DemiurgeState;
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
  targetFps: 30 | 60;
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
  maxCurseDefeatedBosses: Set<string>;
  bestBossTimesSec: Record<string, number>;
  bossCurseTimerSec: number;
  bossCurseStacks: number;
  bossCurseBossId: string | null;
  gnoseAutoAccumulatorSec: number;
  sphereAutoAccumulatorSec: number;
  confirmGnoseReset: boolean;
  skipBossProcession: boolean;
  autoFollowersEnabled: boolean;
  autoFervorEnabled: boolean;
  autoIncarnationEnabled: boolean;
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
    demiurge: { ...state.demiurge },
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
      targetFps: state.targetFps,
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
      maxCurseDefeatedBosses: Array.from(state.maxCurseDefeatedBosses),
      bestBossTimesSec: { ...state.bestBossTimesSec },
      bossCurseTimerSec: state.bossCurseTimerSec,
      bossCurseStacks: state.bossCurseStacks,
      bossCurseBossId: state.bossCurseBossId,
      automationAccumulatorSec: state.gnoseAutoAccumulatorSec,
      sphereAutoAccumulatorSec: state.sphereAutoAccumulatorSec,
      confirmReset: state.confirmGnoseReset,
      skipBossProcession: state.skipBossProcession,
      autoFollowersEnabled: state.autoFollowersEnabled,
      autoFervorEnabled: state.autoFervorEnabled,
      autoIncarnationEnabled: state.autoIncarnationEnabled,
      autoRelicsEnabled: state.autoRelicsEnabled,
      autoRelicUpgradesEnabled: state.autoRelicUpgradesEnabled,
    },
  };
}

export function applySaveDataToState(state: SaveStateHost, save: SaveData): void {
  if (!isValidSaveData(save)) throw new TypeError('Dados de progresso inválidos.');
  state.retreatBossBattle();
  state.resetToDefaults();
  if (isDemiurgeState(save.demiurge)) state.demiurge = { ...save.demiurge };
  if (state.demiurge.phase === 'fighting' || state.demiurge.phase === 'approaching') {
    state.demiurge.phase = save.gnose?.defeatedBosses?.includes('boss_demiurge') ? 'defeated' : 'walking';
    state.demiurge.elapsed = 0;
  }
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
  if (save.stats.targetFps === 60 || save.stats.targetFps === 30) {
    state.targetFps = save.stats.targetFps;
  }
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
    if (Array.isArray(save.gnose.maxCurseDefeatedBosses)) {
      state.maxCurseDefeatedBosses = new Set(save.gnose.maxCurseDefeatedBosses);
    } else {
      state.maxCurseDefeatedBosses.clear();
    }
    state.bestBossTimesSec = {};
    if (save.gnose.bestBossTimesSec && typeof save.gnose.bestBossTimesSec === 'object') {
      for (const [k, v] of Object.entries(save.gnose.bestBossTimesSec)) {
        if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
          state.bestBossTimesSec[k] = v;
        }
      }
    }
    const revision = save.progressionRevision ?? 0;
    let paidPrices: Readonly<Record<string, number>> | undefined;
    if (revision < PROGRESSION_REVISION) {
      // Unversioned saves only have known historical prices for a few nodes.
      // Never assume they paid the later, much higher revision 1 prices.
      paidPrices =
        revision < 1
          ? PROGRESSION_OLD_PRICES
          : revision < 2
            ? PROGRESSION_REVISION_1_PRICES
            : revision < 3
              ? PROGRESSION_REVISION_2_PRICES
              : revision < 4
                ? PROGRESSION_REVISION_3_PRICES
                : revision < 5
                  ? PROGRESSION_REVISION_4_PRICES
                  : revision < 6
                    ? PROGRESSION_REVISION_5_PRICES
                    : revision < 7
                      ? PROGRESSION_REVISION_6_PRICES
                      : revision < 8
                        ? PROGRESSION_REVISION_7_PRICES
                        : revision < 9
                          ? PROGRESSION_REVISION_8_PRICES
                          : revision < 10
                            ? PROGRESSION_REVISION_9_PRICES
                            : PROGRESSION_REVISION_10_PRICES;
      for (const [id, paid] of Object.entries(paidPrices)) {
        const current = GNOSE_UPGRADES.find((u) => u.id === id);
        if (current && state.hasGnoseUpgrade(id)) {
          state.gnosePoints += Math.max(0, paid - current.cost);
        }
      }
    }
    migrateGnoseUpgrades(state, revision, paidPrices);
    state.bossCurseTimerSec =
      typeof save.gnose.bossCurseTimerSec === 'number' ? Math.max(0, save.gnose.bossCurseTimerSec) : 0;
    state.bossCurseStacks =
      typeof save.gnose.bossCurseStacks === 'number'
        ? Math.max(0, Math.min(5, Math.floor(save.gnose.bossCurseStacks)))
        : 0;
    state.bossCurseBossId =
      state.bossCurseStacks > 0 && typeof save.gnose.bossCurseBossId === 'string'
        ? save.gnose.bossCurseBossId
        : null;
    state.sphereAutoAccumulatorSec = Number.isFinite(save.gnose.sphereAutoAccumulatorSec)
      ? Math.max(0, Math.min(1, save.gnose.sphereAutoAccumulatorSec!))
      : 0;
    state.gnoseAutoAccumulatorSec = Number.isFinite(save.gnose.automationAccumulatorSec)
      ? Math.max(0, Math.min(1, save.gnose.automationAccumulatorSec!))
      : 0;
    state.confirmGnoseReset = typeof save.gnose.confirmReset === 'boolean' ? save.gnose.confirmReset : true;
    state.skipBossProcession =
      typeof save.gnose.skipBossProcession === 'boolean' ? save.gnose.skipBossProcession : false;
    state.autoFollowersEnabled =
      typeof save.gnose.autoFollowersEnabled === 'boolean' ? save.gnose.autoFollowersEnabled : true;
    state.autoFervorEnabled =
      typeof save.gnose.autoFervorEnabled === 'boolean' ? save.gnose.autoFervorEnabled : true;
    state.autoIncarnationEnabled =
      typeof save.gnose.autoIncarnationEnabled === 'boolean' ? save.gnose.autoIncarnationEnabled : true;
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
    state.maxCurseDefeatedBosses.clear();
    state.bestBossTimesSec = {};
    state.bossCurseTimerSec = 0;
    state.bossCurseStacks = 0;
    state.bossCurseBossId = null;
  }
  if (Array.isArray(save.achievements)) {
    state.achievements.forEach((a) => {
      if (a.id.startsWith('ach_curse_') && a.check(state.getSnapshot())) {
        a.unlocked = true;
      }
    });
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

export function migrateGnoseUpgrades(
  state: SaveStateHost,
  revision = PROGRESSION_REVISION,
  paidPrices?: Readonly<Record<string, number>>
): void {
  for (const upgrade of RETIRED_GNOSE_UPGRADES) {
    if (!state.unlockedGnoseUpgrades.delete(upgrade.id)) continue;
    state.gnosePoints += paidPrices?.[upgrade.id] ?? upgrade.cost ?? 0;
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
    const replacement = GNOSE_UPGRADES.find((upgrade) => upgrade.id === 'gn_automation')!;
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
  if (state.unlockedGnoseUpgrades.delete('gn_seal_automation')) {
    const replacement = GNOSE_UPGRADES.find((upgrade) => upgrade.id === 'gn_automation')!;
    const paidSeal = paidPrices?.gn_seal_automation ?? LEGACY_GNOSE_SEAL_AUTOMATION_DEFAULT_COST;
    if (state.hasGnoseUpgrade(replacement.id)) {
      const paidAuto = paidPrices?.gn_automation ?? replacement.cost;
      const effectiveAutoPaid = Math.min(paidAuto, replacement.cost);
      state.gnosePoints += Math.max(0, effectiveAutoPaid + paidSeal - replacement.cost);
    } else {
      state.gnosePoints += Math.max(0, paidSeal - replacement.cost);
      state.unlockedGnoseUpgrades.add(replacement.id);
    }
  }
  const ritualRelicAutomations = LEGACY_GNOSE_RITUAL_RELIC_AUTOMATIONS.filter((upgrade) =>
    state.unlockedGnoseUpgrades.delete(upgrade.id)
  );
  if (ritualRelicAutomations.length > 0) {
    const replacement = GNOSE_UPGRADES.find((upgrade) => upgrade.id === 'gn_ritual_relic_automation')!;
    const paid = ritualRelicAutomations.reduce(
      (sum, upgrade) => sum + (paidPrices?.[upgrade.id] ?? upgrade.cost),
      0
    );
    const tier2Guardian = GNOSE_BOSSES.find((boss) => boss.unlocksTier === 2);
    const hasTier2Access =
      (tier2Guardian ? state.defeatedBosses.has(tier2Guardian.id) : false) ||
      GNOSE_UPGRADES.some((u) => u.tier >= 2 && state.unlockedGnoseUpgrades.has(u.id));
    if (hasTier2Access) {
      state.gnosePoints += state.hasGnoseUpgrade(replacement.id)
        ? paid
        : Math.max(0, paid - replacement.cost);
      state.unlockedGnoseUpgrades.add(replacement.id);
    } else {
      // Player had not reached Tier 2 yet; refund so Hades is not bypassed.
      state.gnosePoints += paid;
    }
  }
  if (revision < 7 && state.hasGnoseUpgrade('gn_keep_relics')) {
    // Prior to revision 7, Cripta Eterna also removed the cap on Cornucópia and Tocha.
    state.unlockedGnoseUpgrades.add('gn_unlimited_relics');
  }
  const validIds = new Set(GNOSE_UPGRADES.map((upgrade) => upgrade.id));
  state.unlockedGnoseUpgrades = new Set(
    [...state.unlockedGnoseUpgrades].filter((id) => validIds.has(id))
  );
}

