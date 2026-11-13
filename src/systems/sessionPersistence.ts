import type { GameLoop } from '../core/GameLoop.js';
import type { GameStateManager } from '../core/GameState.js';
import { cultDialog } from '../ui/CultDialog.js';
import type { AudioManager } from './audio.js';
import type { NotificationManager } from './notifications.js';
import { recoverOfflineProgress } from './offlineRecovery.js';
import { SaveSystem, type SaveData } from './saveSystem.js';

export interface SessionPersistenceHost {
  gameState: GameStateManager;
  gameLoop: GameLoop;
  audio: AudioManager;
  notifications: NotificationManager;
  getIsResetting: () => boolean;
  setIsResetting: (resetting: boolean) => void;
  onSaveStatusUpdated: () => void;
  onSyncAfterLoadOrOffline: () => void;
  pauseFollowers: () => void;
  resumeFollowers: () => void;
}

export class SessionPersistenceController {
  private host: SessionPersistenceHost;
  public lastSaveTime: number = Date.now();
  private hiddenSinceMs: number | undefined;
  private pendingOfflineNotice?: { title: string; desc: string };
  private offlineRecovery?: Promise<boolean>;
  private offlineCheckpoint?: SaveData;
  private offlineCreditedThroughMs = 0;

  constructor(host: SessionPersistenceHost) {
    this.host = host;
  }

  public applySaveData(save: SaveData): void {
    this.host.gameState.applySaveData(save);
    if (document.body.classList.contains('is-playing')) {
      this.host.gameState.startGameClock();
    }
    this.host.onSyncAfterLoadOrOffline();
  }

  public saveProgress(): boolean {
    if (this.host.getIsResetting()) return false;
    const data = this.offlineCheckpoint ?? this.host.gameState.buildSaveData();
    if (!this.offlineCheckpoint && this.hiddenSinceMs !== undefined) {
      data.timestamp = this.hiddenSinceMs;
    }
    const success = SaveSystem.save(data);
    if (success) {
      this.lastSaveTime = Date.now();
      this.host.onSaveStatusUpdated();
    }
    return success;
  }

  public loadProgress(): boolean {
    const data = SaveSystem.load();
    if (data) {
      this.applySaveData(data);
      this.lastSaveTime = data.timestamp || Date.now();
      if (data.timestamp) {
        // The constructor finishes creating the board and controls before recovery yields.
        queueMicrotask(() => {
          void this.processOfflineGains(data.timestamp);
        });
      }
      return true;
    }
    return false;
  }

  public showPendingOfflineNotice(): void {
    if (!this.pendingOfflineNotice || !document.body.classList.contains('is-playing')) return;
    const notice = this.pendingOfflineNotice;
    this.pendingOfflineNotice = undefined;
    this.host.notifications.showCustomPopup(notice.title, notice.desc, 'hourglass', '');
  }

  public async processOfflineGains(lastTimestamp: number, imported?: SaveData): Promise<boolean> {
    // Serialize visibility changes and imports, then account only for uncredited time.
    while (this.offlineRecovery) await this.offlineRecovery;
    const now = Date.now();
    const from = imported ? lastTimestamp : Math.max(lastTimestamp, this.offlineCreditedThroughMs);
    const source = imported ?? this.host.gameState.buildSaveData();
    source.timestamp = from;
    const wasRunning = this.host.gameLoop.isRunning();
    this.host.gameLoop.pause();
    this.host.pauseFollowers();
    this.offlineCheckpoint = this.host.gameState.buildSaveData();
    if (!imported) this.offlineCheckpoint.timestamp = from;

    const dialog = document.createElement('dialog');
    dialog.className = 'cult-dialog';
    dialog.setAttribute('aria-label', 'Atualizando o culto');
    dialog.innerHTML =
      '<h2 tabindex="-1">Reunindo a Fé acumulada</h2><p role="status">Seu progresso está sendo atualizado. Aguarde um instante.</p>';
    dialog.addEventListener('cancel', (event) => event.preventDefault());
    document.body.append(dialog);
    dialog.showModal();
    this.host.gameState.retreatBossBattle();

    const recovery = (async () => {
      try {
        const result = await recoverOfflineProgress(source, now);
        // Commit the fully calculated, validated candidate before changing the live state.
        if (!SaveSystem.save(result.save)) {
          throw new Error('Não foi possível salvar o progresso recuperado.');
        }
        this.applySaveData(result.save);
        this.host.gameState.relicConvertCooldown = 0;
        this.offlineCreditedThroughMs = now;
        this.pendingOfflineNotice = result.notice;
        this.lastSaveTime = now;
        this.host.onSaveStatusUpdated();
        return true;
      } catch (error) {
        console.error('Falha ao recuperar o progresso:', error);
        this.host.notifications.showCustomPopup(
          'Não foi possível atualizar o culto',
          'Seu progresso anterior foi preservado. Verifique o armazenamento do navegador e tente novamente.',
          'warning',
          'REGISTRO SAGRADO'
        );
        return false;
      }
    })();

    this.offlineRecovery = recovery;
    try {
      return await recovery;
    } finally {
      this.offlineRecovery = undefined;
      this.offlineCheckpoint = undefined;
      dialog.close();
      dialog.remove();
      this.host.onSyncAfterLoadOrOffline();
      if (wasRunning && document.visibilityState === 'visible') this.host.gameLoop.resume();
      if (document.visibilityState === 'visible') this.host.resumeFollowers();
    }
  }

  public manualSave(): void {
    const success = this.saveProgress();
    if (success) {
      this.host.audio.playTone(660, 'sine', 0.1);
      this.host.notifications.showCustomPopup(
        'Culto Salvo',
        'Seu progresso sagrado foi gravado com sucesso.',
        'codex',
        'REGISTRO SAGRADO'
      );
      this.host.onSaveStatusUpdated();
    } else {
      this.host.notifications.showCustomPopup(
        'Erro ao Salvar',
        'Não foi possível gravar no armazenamento do navegador.',
        'warning',
        'ALERTA'
      );
    }
  }

  public async confirmHardReset(): Promise<void> {
    const ok = await cultDialog(
      'Reiniciar o culto',
      'Deseja realmente reiniciar o culto do zero? Todo o progresso sagrado, fiéis e relíquias serão perdidos permanentemente.',
      'Reiniciar',
      'Cancelar'
    );
    if (ok) {
      this.host.setIsResetting(true);
      SaveSystem.resetSave();
      this.host.audio.playTone(220, 'sawtooth', 0.3);
      window.location.reload();
    }
  }

  public bindSystemEvents(onRefreshUI: () => void): void {
    window.addEventListener('beforeunload', () => {
      if (!this.host.getIsResetting()) {
        this.saveProgress();
      }
    });

    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'hidden') {
        this.hiddenSinceMs ??= Date.now();
        if (!this.host.getIsResetting()) {
          this.saveProgress();
        }
        this.host.gameLoop.pause();
        this.host.pauseFollowers();
      } else {
        const hiddenSince = this.hiddenSinceMs;
        this.hiddenSinceMs = undefined;
        if (hiddenSince !== undefined) {
          await this.processOfflineGains(hiddenSince);
          onRefreshUI();
          this.showPendingOfflineNotice();
        }
        if (document.visibilityState === 'visible' && !this.offlineRecovery) {
          this.host.gameLoop.resume();
          this.host.resumeFollowers();
        }
      }
    });
  }

  public startAutoSaveLoop(): void {
    window.setInterval(() => {
      this.saveProgress();
    }, 20000);
  }
}
