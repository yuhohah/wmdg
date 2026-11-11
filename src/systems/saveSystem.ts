// --- Save System for Cult of the Sphere ---

import type { GnoseSaveData } from '../types.js';

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
  if (!['hasSeenIntro', 'nerdsEnabled'].every(key => optional(stats, key, v => typeof v === 'boolean'))) return false;
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
