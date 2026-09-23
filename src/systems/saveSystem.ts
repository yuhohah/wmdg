// --- Save System for Cult of the Sphere ---

export interface SaveData {
  version: number;
  timestamp: number;
  stats: {
    faithPoints: number;
    totalFaithAccumulated: number;
    totalClicks: number;
    fervorPoints: number;
    incarnationStage: number;
    relicPoints: number;
    bestRelicsToGet: number;
    incarnationBoostTimer?: number;
  };
  followers: Array<{ id: string; count: number }>;
  monuments?: Array<{ id: string; count: number }>;
  fervorUpgrades: Array<{ id: string; level: number }>;
  relicUpgrades: Array<{ id: string; level: number }>;
  unlocks: string[];
  achievements: string[];
  sphereSatellites?: boolean[];
}

export class SaveSystem {
  public static readonly CURRENT_VERSION = 1;
  private static readonly STORAGE_KEY = 'cult_of_the_sphere_save_v1';
  private static readonly BACKUP_KEY = 'cult_of_the_sphere_save_backup';

  /**
   * Serializes the save data to a JSON string.
   */
  public static serialize(data: SaveData): string {
    return JSON.stringify(data);
  }

  /**
   * Deserializes and validates a JSON string into SaveData.
   */
  public static deserialize(jsonStr: string): SaveData | null {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed || typeof parsed !== 'object' || typeof parsed.version !== 'number') {
        return null;
      }
      return parsed as SaveData;
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
      if (existing) {
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
