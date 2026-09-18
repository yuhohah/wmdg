export interface DisplayConfig {
  textOnlyMode: boolean;
  showCardHeroArts: boolean;
  showTooltipArts: boolean;
  showEmojisAndSymbols: boolean;
  showItemDescriptions: boolean;
}

const STORAGE_KEY = 'cult_display_config_v1';

export const DISPLAY_CONFIG: DisplayConfig = {
  textOnlyMode: true,
  showCardHeroArts: false,
  showTooltipArts: false,
  showEmojisAndSymbols: false,
  showItemDescriptions: false
};

export function loadDisplayConfig(): DisplayConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      DISPLAY_CONFIG.textOnlyMode = parsed.textOnlyMode ?? true;
      DISPLAY_CONFIG.showCardHeroArts = parsed.showCardHeroArts ?? false;
      DISPLAY_CONFIG.showTooltipArts = parsed.showTooltipArts ?? false;
      DISPLAY_CONFIG.showEmojisAndSymbols = parsed.showEmojisAndSymbols ?? false;
      DISPLAY_CONFIG.showItemDescriptions = parsed.showItemDescriptions ?? false;
    }
  } catch {
    // Default fallback
  }
  return DISPLAY_CONFIG;
}

export function saveDisplayConfig(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DISPLAY_CONFIG));
  } catch {
    // Storage fallback
  }
}

export function setTextOnlyMode(enabled: boolean): void {
  DISPLAY_CONFIG.textOnlyMode = enabled;
  DISPLAY_CONFIG.showCardHeroArts = !enabled;
  DISPLAY_CONFIG.showTooltipArts = !enabled;
  DISPLAY_CONFIG.showEmojisAndSymbols = !enabled;
  DISPLAY_CONFIG.showItemDescriptions = !enabled;
  saveDisplayConfig();
}
