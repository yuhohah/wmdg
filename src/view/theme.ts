import { TextStyle } from 'pixi.js';

export const THEME = {
  colors: {
    // Monochrome spectrum
    bgDark: 0x050505,
    panelBg: 0x0d0d0d,
    panelBgLight: 0x141414,
    cardBg: 0x121212,
    cardBgHover: 0x1c1c1c,
    cardBorder: 0x262626,
    cardBorderLight: 0x404040,
    cardBorderActive: 0x888888,

    // Monochrome Accents & Tones
    pureWhite: 0xffffff,
    silverLight: 0xf5f5f5,
    silver: 0xd4d4d8,
    silverDark: 0xa1a1aa,
    grayMuted: 0x71717a,
    grayDark: 0x3f3f46,
    blackPure: 0x000000,

    // Text hierarchy
    textPrimary: 0xffffff,
    textSecondary: 0xd4d4d8,
    textMuted: 0x71717a,
    textDark: 0x0a0a0a,

    // Buttons
    btnPrimary: 0xffffff,
    btnPrimaryHover: 0xe4e4e7,
    btnSuccess: 0xffffff,
    btnSuccessHover: 0xd4d4d8,
    btnSecondary: 0x1f1f1f,
    btnSecondaryHover: 0x2e2e2e,
    btnDisabled: 0x18181b,
    btnDisabledText: 0x52525b,
    btnDisabledBorder: 0x27272a
  },

  fonts: {
    heading: 'Nunito, Fredoka, sans-serif',
    body: 'Nunito, sans-serif',
    numbers: 'Fredoka, Nunito, sans-serif',
    mono: 'JetBrains Mono, monospace'
  },

  getTextStyle(options: Partial<TextStyle>): TextStyle {
    return new TextStyle({
      fontFamily: 'Nunito, Fredoka, sans-serif',
      fill: 0xffffff,
      fontSize: 16,
      ...options
    });
  }
};
