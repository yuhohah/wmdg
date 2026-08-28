import { GameState } from './types';

export class SaveSystem {
  private static readonly STORAGE_KEY = 'IDLE_CLICKER_FAITH_SAVE_V3';
  private static readonly PREVIOUS_STORAGE_KEY = 'IDLE_CLICKER_FAITH_SAVE_V2';
  private static readonly CURRENT_VERSION = 3;

  public static getDefaultState(): GameState {
    return {
      version: this.CURRENT_VERSION,
      resources: {
        faith: { id: 'faith', amount: 0, totalEarned: 0, peakAmount: 0 }
      },
      upgrades: {},
      stats: {
        totalClicks: 0,
        manualFaithEarned: 0,
        startTime: Date.now(),
        playTimeSeconds: 0,
        lastSaveTimestamp: Date.now()
      },
      multipliers: {
        globalProduction: 1.0,
        globalClick: 1.0
      }
    };
  }

  public static save(state: GameState): boolean {
    try {
      state.stats.lastSaveTimestamp = Date.now();
      const serialized = JSON.stringify(state);
      localStorage.setItem(this.STORAGE_KEY, serialized);
      return true;
    } catch (e) {
      console.error('[SaveSystem] Failed to save game state:', e);
      return false;
    }
  }

  public static load(): GameState {
    try {
      let data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) {
        // Try migrating from V2
        const v2Data = localStorage.getItem(this.PREVIOUS_STORAGE_KEY);
        if (v2Data) {
          data = v2Data;
        }
      }

      if (!data) {
        return this.getDefaultState();
      }

      const parsed = JSON.parse(data) as GameState;
      const defaults = this.getDefaultState();

      return {
        version: this.CURRENT_VERSION,
        resources: {
          ...defaults.resources,
          ...(parsed.resources || {})
        },
        upgrades: {
          ...defaults.upgrades,
          ...(parsed.upgrades || {})
        },
        stats: {
          ...defaults.stats,
          ...(parsed.stats || {}),
          lastSaveTimestamp: parsed.stats?.lastSaveTimestamp || Date.now()
        },
        multipliers: {
          ...defaults.multipliers,
          ...(parsed.multipliers || {})
        }
      };
    } catch (e) {
      console.error('[SaveSystem] Failed to parse save, initializing fresh state:', e);
      return this.getDefaultState();
    }
  }

  public static clear(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (e) {
      console.error('[SaveSystem] Failed to clear save:', e);
    }
  }

  public static exportSave(): string {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    return raw ? btoa(raw) : '';
  }

  public static importSave(encoded: string): boolean {
    try {
      const decoded = atob(encoded);
      const parsed = JSON.parse(decoded);
      if (parsed && typeof parsed === 'object') {
        localStorage.setItem(this.STORAGE_KEY, decoded);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}
