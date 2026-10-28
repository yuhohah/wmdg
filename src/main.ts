/// <reference types="vite/client" />
// --- App Manager for Cult of the Sphere (Modular Orchestrator) ---

import { AudioManager } from './systems/audio.js';
import { NotificationManager } from './systems/notifications.js';
import { SaveSystem, type SaveData } from './systems/saveSystem.js';
import { SettingsModal } from './ui/SettingsModal.js';
import { SaveDataModal } from './ui/SaveDataModal.js';
import { HUDController } from './ui/HUDController.js';
import { GameStateManager } from './core/GameState.js';
import { GameLoop } from './core/GameLoop.js';
import { events, GameEvents } from './core/EventBus.js';
import { FollowersTab } from './features/followers/FollowersTab.js';
import { IncarnationTab } from './features/incarnation/IncarnationTab.js';
import { FervorTab } from './features/fervor/FervorTab.js';
import { RelicsTab } from './features/relics/RelicsTab.js';
import { GnoseTab } from './features/gnose/GnoseTab.js';
import { UnlocksTab } from './features/unlocks/UnlocksTab.js';
import { AchievementsTab } from './features/achievements/AchievementsTab.js';
import { StatsTab } from './features/stats/StatsTab.js';
import { SphereController } from './features/sphere/SphereController.js';
import { OnboardingGuide } from './ui/OnboardingGuide.js';
import { BoardManager } from './ui/BoardManager.js';
import { hydrateIcons } from './ui/icons.js';
import { cultDialog } from './ui/CultDialog.js';
import { TestMenu } from './ui/TestMenu.js';
import { formatNumber } from './systems/calculations.js';

export function isDevMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    Boolean(import.meta.env?.DEV) ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '0.0.0.0' ||
    window.location.search.includes('test') ||
    window.location.search.includes('dev') ||
    localStorage.getItem('cult_dev_mode') === 'true'
  );
}

class AppManager {
  // Core Subsystems
  public audio: AudioManager;
  public notifications: NotificationManager;
  public gameState: GameStateManager = new GameStateManager();
  public gameLoop: GameLoop = new GameLoop(10);

  // UI Controllers
  public hud: HUDController;
  public sphere: SphereController;
  public settingsModal: SettingsModal;
  public saveDataModal: SaveDataModal;
  public onboardingGuide: OnboardingGuide;
  public board: BoardManager;

  // Feature Tabs
  public followersTab: FollowersTab;
  public incarnationTab: IncarnationTab;
  public fervorTab: FervorTab;
  public relicsTab: RelicsTab;
  public gnoseTab: GnoseTab;
  public unlocksTab: UnlocksTab;
  public achievementsTab: AchievementsTab;
  public statsTab: StatsTab;
  public testMenu?: TestMenu;

  // Save & System State
  private lastSaveTime: number = Date.now();
  public isResetting: boolean = false;
  private isHapticsEnabled: boolean = true;
  private pendingOfflineNotice?: { title: string; desc: string };

  constructor() {
    // 0. Fill static [data-icon] placeholders with the game's engraved icon set
    hydrateIcons();

    // 1. Instantiate Core Subsystems
    this.audio = new AudioManager();
    this.notifications = new NotificationManager('achievements-popup-container');

    // 2. Instantiate UI & Sphere Controllers
    this.hud = new HUDController({
      gameState: this.gameState
    });

    this.sphere = new SphereController({
      gameState: this.gameState,
      audio: this.audio,
      notifications: this.notifications,
      triggerHaptic: (pattern) => this.triggerHaptic(pattern)
    });

    // 3. Instantiate Feature Tabs
    this.followersTab = new FollowersTab({
      gameState: this.gameState,
      audio: this.audio,
      triggerHaptic: (p) => this.triggerHaptic(p),
      spawnFloatingText: (x, y, t) => this.sphere.spawnFloatingText(x, y, t),
      onFollowersChanged: () => events.emit(GameEvents.STATE_CHANGED),
      grantMiracle: (x, y) => this.sphere.grantMiracle(x, y)
    });

    this.incarnationTab = new IncarnationTab({
      gameState: this.gameState,
      audio: this.audio,
      triggerHaptic: (p) => this.triggerHaptic(p),
      notifications: this.notifications,
      spawnFloatingText: (x, y, t) => this.sphere.spawnFloatingText(x, y, t),
      onIncarnationEvolved: () => events.emit(GameEvents.STATE_CHANGED)
    });

    this.fervorTab = new FervorTab({
      gameState: this.gameState,
      audio: this.audio,
      triggerHaptic: (p) => this.triggerHaptic(p),
      onUpgradePurchased: () => events.emit(GameEvents.STATE_CHANGED)
    });

    this.relicsTab = new RelicsTab({
      gameState: this.gameState,
      audio: this.audio,
      notifications: this.notifications,
      spawnFloatingText: (x, y, t) => this.sphere.spawnFloatingText(x, y, t),
      onRelicsTransmuted: () => events.emit(GameEvents.STATE_CHANGED),
      onUpgradePurchased: () => {
        events.emit(GameEvents.STATE_CHANGED);
        this.fervorTab.renderList();
        this.fervorTab.updateButtonStates();
      }
    });

    this.gnoseTab = new GnoseTab({
      gameState: this.gameState,
      audio: this.audio,
      notifications: this.notifications,
      spawnFloatingText: (x, y, t) => this.sphere.spawnFloatingText(x, y, t),
      onGnoseReset: () => {
        this.followersTab.syncFollowerCount(this.gameState.getTotalFollowersCount());
        this.incarnationTab.updateUI();
        this.refreshAllUI();
        this.board.centerOnCard('card-altar-sphere', true);
      },
      onUpgradePurchased: () => {
        this.refreshAllUI();
      }
    });

    this.unlocksTab = new UnlocksTab({
      gameState: this.gameState,
      audio: this.audio,
      notifications: this.notifications,
      onUnlockPurchased: () => {
        this.refreshAllUI();
      }
    });

    this.achievementsTab = new AchievementsTab({
      gameState: this.gameState,
      audio: this.audio,
      notifications: this.notifications
    });

    this.statsTab = new StatsTab({
      gameState: this.gameState
    });

    // 4. Instantiate Modals
    this.saveDataModal = new SaveDataModal({
      onExport: () => SaveSystem.exportSave(this.gameState.buildSaveData()),
      onImport: async (raw) => {
        const imported = SaveSystem.importSave(raw);
        if (!imported) return false;

        const ok = await cultDialog(
          'Restaurar o culto',
          'Deseja substituir o progresso atual pelos dados importados?',
          'Restaurar',
          'Cancelar'
        );
        if (ok) {
          SaveSystem.save(imported);
          this.applySaveData(imported);
          this.followersTab.syncFollowerCount(this.gameState.getTotalFollowersCount());
          this.refreshAllUI();
          return true;
        }
        return null;
      },
      notifications: this.notifications
    });

    this.onboardingGuide = new OnboardingGuide({
      gameState: this.gameState,
      notifications: this.notifications,
      audio: this.audio
    });

    this.settingsModal = new SettingsModal({
      audio: this.audio,
      getLastSaveTime: () => this.lastSaveTime,
      onManualSave: () => this.manualSave(),
      onExportSave: () => this.saveDataModal.openExport(),
      onImportSave: () => this.saveDataModal.openImport(),
      onResetSave: () => this.confirmHardReset(),
      onToggleHaptics: (enabled) => {
        this.isHapticsEnabled = enabled;
      },
      isHapticsEnabled: () => this.isHapticsEnabled,
      onTriggerHaptic: (pattern) => this.triggerHaptic(pattern)
    });

    // 5. Load Progress & Sync Views
    this.loadProgress();
    this.followersTab.syncFollowerCount(this.gameState.getTotalFollowersCount());
    this.incarnationTab.updateUI();

    // 6. Setup Listeners, Initial Renders & Loops
    this.board = new BoardManager();
    this.onboardingGuide.setOnFocusCard((cardId, immediate) => {
      this.board.centerOnCard(cardId, immediate);
    });
    this.bindStartScreen();
    this.setupReactiveListeners();
    this.setupSystemEvents();
    this.renderAllLists();
    this.updateUnlockedTabsVisibility();
    this.startPassiveFaithLoop();
    this.startAutoSaveLoop();
    this.hud.update();
    this.statsTab.updateUI();
    this.onboardingGuide.update();

    // 7. Developer-only / Localhost Test Menu & Global Window Helpers
    if (isDevMode()) {
      this.testMenu = new TestMenu(this);
    }
    this.registerGlobalHelpers();
  }

  private bindStartScreen(): void {
    const playBtn = document.getElementById('play-btn');
    const startScreen = document.getElementById('start-screen');
    const gameplayScreen = document.getElementById('gameplay-screen');

    playBtn?.addEventListener('click', () => {
      this.audio.init();
      this.audio.playMusic();
      this.audio.playTone(440, 'sine', 0.1);
      startScreen?.classList.remove('active');
      gameplayScreen?.classList.add('active');
      // Cheap hook for play-time styles (a body:has() selector re-ran style recalcs on every DOM change)
      document.body.classList.add('is-playing');
      requestAnimationFrame(() => {
        this.board.centerOnCard('card-altar-sphere', true);
        this.followersTab.resize();
        this.incarnationTab.altar?.resize();
        this.onboardingGuide.update();
        if (this.pendingOfflineNotice) {
          this.notifications.showCustomPopup(
            this.pendingOfflineNotice.title,
            this.pendingOfflineNotice.desc,
            'hourglass',
            'VIGÍLIA SAGRADA'
          );
          this.pendingOfflineNotice = undefined;
        }
      });
    });
  }

  private setupReactiveListeners(): void {
    events.on(GameEvents.STATE_CHANGED, () => {
      this.hud.update();
      this.statsTab.updateUI();
      this.achievementsTab.checkAchievements();
      this.achievementsTab.updateRealtime();
      this.updateItemButtonsState();
      this.onboardingGuide.update();
    });

    events.on(GameEvents.GAME_TICK, () => {
      this.statsTab.updateUI();
      this.achievementsTab.checkAchievements();
      this.updateItemButtonsState();
      this.fervorTab.updateButtonStates();
      this.achievementsTab.updateRealtime();
      this.incarnationTab.updateRealtime();
      this.followersTab.updateRealtime();
      this.onboardingGuide.update();
    });
  }

  private setupSystemEvents(): void {
    window.addEventListener('beforeunload', () => {
      if (!this.isResetting) {
        this.saveProgress();
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        if (!this.isResetting) {
          this.saveProgress();
        }
        this.gameLoop.pause();
        this.followersTab.pause();
      } else {
        this.gameLoop.resume();
        this.followersTab.resume();
      }
    });
  }

  public refreshAllUI(): void {
    this.updateUnlockedTabsVisibility();
    this.renderAllLists();
    this.hud.update();
    this.statsTab.updateUI();
    events.emit(GameEvents.STATE_CHANGED);
  }

  public updateUnlockedTabsVisibility(): void {
    const inc = this.gameState.isIncarnationUnlocked();
    const ferv = this.gameState.isFervorUpgradesUnlocked();
    const rel = this.gameState.isRelicsUnlocked();
    const gno = this.gameState.isGnoseUnlocked();

    this.fervorTab.setHudVisibility(ferv);
    this.relicsTab.setHudVisibility(rel);
    this.gnoseTab.setHudVisibility(gno);

    if (this.board) {
      this.board.setCardUnlocked('card-incarnation', inc);
      this.board.setCardUnlocked('card-fervor', ferv);
      this.board.setCardUnlocked('card-relics', rel);
      this.board.setCardUnlocked('card-gnose', gno);
    }
  }

  public renderAllLists(): void {
    this.followersTab.updateUI();
    this.incarnationTab.updateUI();
    this.fervorTab.renderList();
    this.unlocksTab.renderList();
    this.relicsTab.renderList();
    this.gnoseTab.renderTree();
    this.gnoseTab.updateUI();
    this.achievementsTab.renderList();
  }

  private updateItemButtonsState(): void {
    this.followersTab.updateUI();
    this.incarnationTab.updateUpgradeButtonState();
    this.unlocksTab.updateButtonStates();
    if (this.gameState.isRelicsUnlocked()) {
      this.relicsTab.updateUI();
    }
    if (this.gameState.isGnoseUnlocked() || this.gameState.activeBossBattle) {
      this.gnoseTab.updateUI();
    }
  }

  private startPassiveFaithLoop(): void {
    this.gameLoop.onTick((deltaSec) => {
      this.gameState.tick(deltaSec);
      events.emit(GameEvents.GAME_TICK, deltaSec);
    });
    this.gameLoop.start();
  }

  public triggerHaptic(pattern: number | number[] = 8): void {
    if (this.isHapticsEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignored
      }
    }
  }

  // --- Save / Load & Persistence ---

  private applySaveData(save: SaveData): void {
    this.gameState.applySaveData(save);
  }

  private saveProgress(): boolean {
    if (this.isResetting) return false;
    const data = this.gameState.buildSaveData();
    const success = SaveSystem.save(data);
    if (success) {
      this.lastSaveTime = Date.now();
      this.settingsModal.updateSaveStatus();
    }
    return success;
  }

  private loadProgress(): boolean {
    const data = SaveSystem.load();
    if (data) {
      this.applySaveData(data);
      this.lastSaveTime = data.timestamp || Date.now();
      if (data.timestamp) {
        this.processOfflineGains(data.timestamp);
      }
      return true;
    }
    return false;
  }

  private processOfflineGains(lastTimestamp: number): void {
    if (!lastTimestamp || lastTimestamp <= 0) return;
    const now = Date.now();
    const elapsedSec = (now - lastTimestamp) / 1000;
    // Pelo menos 15s de ausência para calcular ganhos offline
    if (elapsedSec < 15) return;

    // Teto de 24 horas (86.400 segundos) de ausência
    const offlineSec = Math.min(86400, elapsedSec);

    const fps = this.gameState.getFaithPerSecond();
    let faithGained = 0;
    if (fps > 0) {
      faithGained = fps * offlineSec;
      this.gameState.faithPoints += faithGained;
      this.gameState.totalFaithAccumulated += faithGained;
    }

    const fervorRate = this.gameState.getFervorRatePerSecond();
    let fervorGained = 0;
    if (fervorRate > 0) {
      fervorGained = fervorRate * offlineSec;
      this.gameState.addFervor(fervorGained);
    }

    const relicRate = this.gameState.getRelicsRatePerSecond();
    let relicGained = 0;
    if (relicRate > 0) {
      relicGained = relicRate * offlineSec;
      this.gameState.addRelics(relicGained);
    }

    // Executa automações gnósticas acumuladas se desbloqueadas (até 60 ciclos)
    if (this.gameState.hasGnoseUpgrade('gn_automation')) {
      const autoSteps = Math.min(60, Math.floor(offlineSec));
      for (let i = 0; i < autoSteps; i++) {
        this.gameState.runGnoseAutomation();
      }
    }

    if (faithGained > 0 || fervorGained > 0 || relicGained > 0) {
      const minutes = Math.floor(elapsedSec / 60);
      const hours = (elapsedSec / 3600).toFixed(1);
      const timeStr = elapsedSec >= 3600 ? `${hours}h` : `${minutes}m`;

      const parts: string[] = [];
      if (faithGained > 0) parts.push(`+${formatNumber(faithGained)} Fé`);
      if (fervorGained > 0) parts.push(`+${formatNumber(fervorGained)} Fervor`);
      if (relicGained > 0) parts.push(`+${formatNumber(relicGained)} Fragmentos`);

      this.pendingOfflineNotice = {
        title: `VIGÍLIA SAGRADA (${timeStr})`,
        desc: `Durante sua ausência, o culto continuou ardendo: ${parts.join(', ')} acumulados.`
      };
    }
  }

  private manualSave(): void {
    const success = this.saveProgress();
    if (success) {
      this.audio.playTone(660, 'sine', 0.1);
      this.notifications.showCustomPopup(
        'Culto Salvo',
        'Seu progresso sagrado foi gravado com sucesso.',
        'codex',
        'REGISTRO SAGRADO'
      );
      this.settingsModal.updateSaveStatus();
    } else {
      this.notifications.showCustomPopup(
        'Erro ao Salvar',
        'Não foi possível gravar no armazenamento do navegador.',
        'warning',
        'ALERTA'
      );
    }
  }

  private async confirmHardReset(): Promise<void> {
    const ok = await cultDialog(
      'Reiniciar o culto',
      'Deseja realmente reiniciar o culto do zero? Todo o progresso sagrado, fiéis e relíquias serão perdidos permanentemente.',
      'Reiniciar',
      'Cancelar'
    );
    if (ok) {
      this.isResetting = true;
      SaveSystem.resetSave();
      this.audio.playTone(220, 'sawtooth', 0.3);
      window.location.reload();
    }
  }

  private startAutoSaveLoop(): void {
    window.setInterval(() => {
      this.saveProgress();
    }, 20000);
  }

  private registerGlobalHelpers(): void {
    if (isDevMode()) {
      (window as any).cultGame = this;
      (window as any).game = this;
      (window as any).testMenu = this.testMenu;
      (window as any).triggerMiraclePlea = () => this.followersTab.triggerMiraclePlea();
    }
  }
}

// Bootstrap Application
const startApp = () => {
  new AppManager();
};

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
