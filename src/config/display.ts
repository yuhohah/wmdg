export interface DisplayConfig {
  showCardHeroArts: boolean;
  showTooltipArts: boolean;
  showEmojisAndSymbols: boolean;
  showItemDescriptions: boolean;
}

export const DISPLAY_CONFIG: DisplayConfig = {
  showCardHeroArts: true,
  showTooltipArts: true,
  showEmojisAndSymbols: false,
  showItemDescriptions: true
};

export function loadDisplayConfig(): DisplayConfig {
  return DISPLAY_CONFIG;
}

export function saveDisplayConfig(): void {
  // Config is fixed with emojis disabled
}
