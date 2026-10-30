import { AudioManager } from '../systems/audio.js';

export interface SettingsModalOptions {
  audio: AudioManager;
  onOpen?: () => void;
  getLastSaveTime: () => number;
  onManualSave: () => void;
  onExportSave: () => void;
  onImportSave: () => void;
  onResetSave: () => void;
  onToggleHaptics?: (enabled: boolean) => void;
  isHapticsEnabled?: () => boolean;
  isNerdsEnabled?: () => boolean;
  onToggleNerds?: (enabled: boolean) => void;
  onTriggerHaptic?: (pattern: number | number[]) => void;
}

export class SettingsModal {
  private modalEl: HTMLElement | null = null;
  private closeBtn: HTMLButtonElement | null = null;
  private closeFooterBtn: HTMLButtonElement | null = null;
  private settingsBtn: HTMLButtonElement | null = null;

  // Audio Controls
  private volumeSliderEl: HTMLInputElement | null = null;
  private musicToggleEl: HTMLInputElement | null = null;
  private sfxToggleEl: HTMLInputElement | null = null;
  private musicQuickBtnEl: HTMLButtonElement | null = null;
  private musicIconOnEl: HTMLElement | null = null;
  private musicIconOffEl: HTMLElement | null = null;

  // Haptics Controls
  private hapticsToggleEl: HTMLInputElement | null = null;
  private nerdsToggleEl: HTMLInputElement | null = null;

  // Save Progress Controls
  private saveStatusTextEl: HTMLElement | null = null;
  private btnManualSaveEl: HTMLButtonElement | null = null;
  private btnExportSaveEl: HTMLButtonElement | null = null;
  private btnImportSaveEl: HTMLButtonElement | null = null;
  private btnResetSaveEl: HTMLButtonElement | null = null;

  private options: SettingsModalOptions;

  constructor(options: SettingsModalOptions) {
    this.options = options;
    this.initElements();
    this.bindEvents();
    this.initAudioGestureListener();
    this.updateMusicUI();
  }

  private initElements(): void {
    this.modalEl = document.getElementById('settings-modal');
    this.closeBtn = document.getElementById('close-settings-btn') as HTMLButtonElement | null;
    this.closeFooterBtn = document.getElementById('close-settings-footer-btn') as HTMLButtonElement | null;
    this.settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement | null;

    this.volumeSliderEl = document.getElementById('volume-slider') as HTMLInputElement | null;
    this.musicToggleEl = document.getElementById('music-toggle') as HTMLInputElement | null;
    this.sfxToggleEl = document.getElementById('sfx-toggle') as HTMLInputElement | null;
    this.musicQuickBtnEl = document.getElementById('music-quick-btn') as HTMLButtonElement | null;
    this.musicIconOnEl = document.getElementById('music-icon-on');
    this.musicIconOffEl = document.getElementById('music-icon-off');

    this.hapticsToggleEl = document.getElementById('haptics-toggle') as HTMLInputElement | null;
    this.nerdsToggleEl = document.getElementById('nerds-toggle') as HTMLInputElement | null;

    this.saveStatusTextEl = document.getElementById('save-status-text');
    this.btnManualSaveEl = document.getElementById('btn-manual-save') as HTMLButtonElement | null;
    this.btnExportSaveEl = document.getElementById('btn-export-save') as HTMLButtonElement | null;
    this.btnImportSaveEl = document.getElementById('btn-import-save') as HTMLButtonElement | null;
    this.btnResetSaveEl = document.getElementById('btn-reset-save') as HTMLButtonElement | null;
  }

  private bindEvents(): void {
    if (this.nerdsToggleEl) {
      this.nerdsToggleEl.checked = this.options.isNerdsEnabled?.() ?? false;
      this.nerdsToggleEl.addEventListener('change', () => {
        this.options.onToggleNerds?.(this.nerdsToggleEl!.checked);
      });
    }
    // Open/Close triggers
    this.settingsBtn?.addEventListener('click', () => this.toggle());

    this.closeBtn?.addEventListener('click', () => this.close());
    this.closeFooterBtn?.addEventListener('click', () => this.close());

    this.modalEl?.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.close();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });

    // Audio Event listeners
    if (this.volumeSliderEl) {
      this.volumeSliderEl.value = String(Math.round(this.options.audio.getVolume() * 100));
      this.volumeSliderEl.addEventListener('input', () => {
        const val = parseFloat(this.volumeSliderEl!.value) / 100;
        this.options.audio.setVolume(val);
      });
    }

    if (this.musicToggleEl) {
      this.musicToggleEl.checked = this.options.audio.isMusicEnabled();
      this.musicToggleEl.addEventListener('change', () => {
        this.options.audio.setMusicEnabled(this.musicToggleEl!.checked);
        this.updateMusicUI();
      });
    }

    if (this.sfxToggleEl) {
      this.sfxToggleEl.checked = this.options.audio.isSfxEnabled();
      this.sfxToggleEl.addEventListener('change', () => {
        this.options.audio.setSfxEnabled(this.sfxToggleEl!.checked);
      });
    }

    if (this.musicQuickBtnEl) {
      this.musicQuickBtnEl.addEventListener('click', () => {
        this.options.audio.toggleMusic();
        this.updateMusicUI();
      });
    }

    // Haptics Event listener
    if (this.hapticsToggleEl) {
      const enabled = this.options.isHapticsEnabled ? this.options.isHapticsEnabled() : true;
      this.hapticsToggleEl.checked = enabled;
      this.hapticsToggleEl.addEventListener('change', () => {
        const isChecked = this.hapticsToggleEl!.checked;
        this.options.onToggleHaptics?.(isChecked);
        if (isChecked) {
          this.options.onTriggerHaptic?.(15);
        }
      });
    }

    // Save System Event listeners
    this.btnManualSaveEl?.addEventListener('click', () => {
      this.options.onManualSave();
    });

    this.btnExportSaveEl?.addEventListener('click', () => {
      this.options.onExportSave();
    });

    this.btnImportSaveEl?.addEventListener('click', () => {
      this.options.onImportSave();
    });

    this.btnResetSaveEl?.addEventListener('click', () => {
      this.options.onResetSave();
    });
  }

  private initAudioGestureListener(): void {
    const triggerAudioOnGesture = () => {
      this.options.audio.init();
      if (this.options.audio.isMusicEnabled()) {
        this.options.audio.playMusic();
      }
      if (!this.options.audio.isMusicEnabled() || !this.options.audio.isMusicPaused()) {
        window.removeEventListener('click', triggerAudioOnGesture);
        window.removeEventListener('pointerdown', triggerAudioOnGesture);
        window.removeEventListener('keydown', triggerAudioOnGesture);
      }
    };
    window.addEventListener('click', triggerAudioOnGesture);
    window.addEventListener('pointerdown', triggerAudioOnGesture);
    window.addEventListener('keydown', triggerAudioOnGesture);
  }

  public isOpen(): boolean {
    return !!this.modalEl?.classList.contains('open');
  }

  public toggle(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  public open(): void {
    if (this.nerdsToggleEl) this.nerdsToggleEl.checked = this.options.isNerdsEnabled?.() ?? false;
    this.modalEl?.classList.add('open');
    this.updateSaveStatus();
    this.options.onOpen?.();
    if (this.volumeSliderEl) {
      this.volumeSliderEl.value = String(Math.round(this.options.audio.getVolume() * 100));
    }
    if (this.musicToggleEl) {
      this.musicToggleEl.checked = this.options.audio.isMusicEnabled();
    }
    if (this.sfxToggleEl) {
      this.sfxToggleEl.checked = this.options.audio.isSfxEnabled();
    }
    if (this.hapticsToggleEl && this.options.isHapticsEnabled) {
      this.hapticsToggleEl.checked = this.options.isHapticsEnabled();
    }
  }

  public close(): void {
    this.modalEl?.classList.remove('open');
  }

  public updateMusicUI(): void {
    const isEnabled = this.options.audio.isMusicEnabled();
    if (this.musicIconOnEl) {
      this.musicIconOnEl.style.display = isEnabled ? 'block' : 'none';
    }
    if (this.musicIconOffEl) {
      this.musicIconOffEl.style.display = isEnabled ? 'none' : 'block';
    }
    if (this.musicToggleEl) {
      this.musicToggleEl.checked = isEnabled;
    }
    if (this.musicQuickBtnEl) {
      this.musicQuickBtnEl.classList.toggle('muted', !isEnabled);
    }
  }

  public updateSaveStatus(): void {
    if (!this.isOpen() || !this.saveStatusTextEl) return;
    const lastTime = this.options.getLastSaveTime();
    const diffSec = Math.floor((Date.now() - lastTime) / 1000);
    if (diffSec < 5) {
      this.saveStatusTextEl.textContent = 'Salvo agora mesmo (Auto-save: 20s)';
    } else if (diffSec < 60) {
      this.saveStatusTextEl.textContent = `Salvo há ${diffSec}s (Auto-save: 20s)`;
    } else {
      const min = Math.floor(diffSec / 60);
      this.saveStatusTextEl.textContent = `Salvo há ${min}min (Auto-save: 20s)`;
    }
  }
}
