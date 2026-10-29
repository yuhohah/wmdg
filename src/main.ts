/// <reference types="vite/client" />
import { ElapsedTimeCredit } from './systems/elapsedTime.js';
// --- App Manager for Cult of the Sphere (Modular Orchestrator) ---

import { AudioManager } from './systems/audio.js';
import { NotificationManager } from './systems/notifications.js';
import { SaveSystem, type SaveData } from './systems/saveSystem.js';
import { SettingsModal } from './ui/SettingsModal.js';
import { SaveDataModal } from './ui/SaveDataModal.js';
import { HUDController } from './ui/HUDController.js';
import { VisibleCardUpdates } from './ui/VisibleCardUpdates.js';
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
  private cardUpdates: VisibleCardUpdates;

  // Save & System State
  private lastSaveTime: number = Date.now();
  public isResetting: boolean = false;
  private isHapticsEnabled: boolean = true;
  private hiddenSinceMs: number | undefined;
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
        this.renderAllLists();
        events.emit(GameEvents.STATE_CHANGED);
      }
    });

    this.gnoseTab = new GnoseTab({
      gameState: this.gameState,
      audio: this.audio,
      notifications: this.notifications,
      spawnFloatingText: (x, y, t) => this.sphere.spawnFloatingText(x, y, t),
      onGnoseReset: () => {
        this.followersTab.syncFollowerCount(this.gameState.getTotalFollowersCount());
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
          this.processOfflineGains(imported.timestamp);
          this.saveProgress();
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
      onOpen: () => this.statsTab.updateUI(),
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

    // 6. Setup Listeners, Initial Renders & Loops
    this.board = new BoardManager();
    this.cardUpdates = this.setupCardUpdates();
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
      if (this.settingsModal.isOpen()) this.statsTab.updateUI();
      this.achievementsTab.checkAchievements();
      this.achievementsTab.updateRealtime();
      this.cardUpdates.update();
      if (this.gnoseTab.bossBattleModal.isOpen()) this.gnoseTab.bossBattleModal.updateUI();
      this.onboardingGuide.update();
    });

    events.on(GameEvents.GAME_TICK, () => {
      if (this.settingsModal.isOpen()) this.statsTab.updateUI();
      this.achievementsTab.checkAchievements();
      this.cardUpdates.update();
      if (this.gnoseTab.bossBattleModal.isOpen()) this.gnoseTab.bossBattleModal.updateUI();
      this.achievementsTab.updateRealtime();
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
        this.hiddenSinceMs ??= Date.now();
        if (!this.isResetting) {
          this.saveProgress();
        }
        this.gameLoop.pause();
        this.followersTab.pause();
      } else {
        if (this.hiddenSinceMs !== undefined) {
          this.processOfflineGains(this.hiddenSinceMs);
          this.hiddenSinceMs = undefined;
          this.saveProgress();
          this.refreshAllUI();
          if (this.pendingOfflineNotice) {
            this.notifications.showCustomPopup(this.pendingOfflineNotice.title, this.pendingOfflineNotice.desc, 'hourglass', 'VIGÍLIA SAGRADA');
            this.pendingOfflineNotice = undefined;
          }
        }
        this.gameLoop.resume();
        this.followersTab.resume();
      }
    });
  }

  public refreshAllUI(): void {
    this.updateUnlockedTabsVisibility();
    this.renderAllLists();
    this.hud.update();
    if (this.settingsModal.isOpen()) this.statsTab.updateUI();
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
    this.cardUpdates.invalidateAll();
    this.achievementsTab.renderList();
  }

  private setupCardUpdates(): VisibleCardUpdates {
    const views = new VisibleCardUpdates();
    views.register('card-altar-sphere', () => {}, () => this.hud.updateCard('card-altar-sphere'));
    views.register('card-followers', () => {}, () => this.followersTab.updateUI());
    views.register('card-incarnation', () => this.incarnationTab.updateUI(), () => this.incarnationTab.updateRealtime());
    views.register('card-unlocks', () => this.unlocksTab.renderList(), () => this.unlocksTab.updateButtonStates());
    views.register('card-fervor', () => this.fervorTab.renderList(), () => {
      this.hud.updateCard('card-fervor');
      this.fervorTab.updateButtonStates();
    });
    views.register('card-relics', () => this.relicsTab.renderList(), () => this.relicsTab.updateUI());
    views.register('card-gnose', () => this.gnoseTab.renderTree(), () => this.gnoseTab.updateUI());
    return views;
  }

  private startPassiveFaithLoop(): void {
    this.gameLoop.onTick((deltaSec) => {
      const unlockedCount = this.gameState.unlocks.filter(u => u.unlocked).length;
      this.gameState.tick(deltaSec);
      if (this.gameState.unlocks.filter(u => u.unlocked).length !== unlockedCount) {
        this.updateUnlockedTabsVisibility();
        this.renderAllLists();
      }
      // Walkers own miracle timers; keep their population in sync even off-screen.
      this.followersTab.syncFollowerCount(this.gameState.getTotalFollowersCount());
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
    if (this.hiddenSinceMs !== undefined) data.timestamp = this.hiddenSinceMs;
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
        this.saveProgress();
      }
      return true;
    }
    return false;
  }

  private processOfflineGains(lastTimestamp: number): void {
    if (!lastTimestamp || lastTimestamp <= 0) return;
    const now = Date.now();
    const elapsedSec = (now - lastTimestamp) / 1000;
    const { faithGained, fervorGained, relicGained } = new ElapsedTimeCredit(lastTimestamp).consume(this.gameState, now);

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
