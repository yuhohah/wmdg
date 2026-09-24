// --- App Manager for Cult of the Sphere (Modular Orchestrator) ---

import { INCARNATION_STAGES } from './config/incarnation.js';
import { calculateFervorUpgradeCost } from './systems/calculations.js';
import { AudioManager } from './systems/audio.js';
import { NotificationManager } from './systems/notifications.js';
import { TooltipManager } from './ui/tooltips.js';
import { loadDisplayConfig } from './config/display.js';
import { SaveSystem, type SaveData } from './systems/saveSystem.js';
import { SettingsModal } from './ui/SettingsModal.js';
import { SaveDataModal } from './ui/SaveDataModal.js';
import { HUDController } from './ui/HUDController.js';
import { NavigationManager } from './ui/NavigationManager.js';
import { GameStateManager } from './core/GameState.js';
import { GameLoop } from './core/GameLoop.js';
import { events, GameEvents } from './core/EventBus.js';
import { FollowersTab } from './features/followers/FollowersTab.js';
import { IncarnationTab } from './features/incarnation/IncarnationTab.js';
import { FervorTab } from './features/fervor/FervorTab.js';
import { RelicsTab } from './features/relics/RelicsTab.js';
import { UnlocksTab } from './features/unlocks/UnlocksTab.js';
import { AchievementsTab } from './features/achievements/AchievementsTab.js';
import { StatsTab } from './features/stats/StatsTab.js';
import { SphereController } from './features/sphere/SphereController.js';

class AppManager {
  // Core Subsystems
  public audio: AudioManager;
  public notifications: NotificationManager;
  public tooltips: TooltipManager;
  public gameState: GameStateManager = new GameStateManager();
  public gameLoop: GameLoop = new GameLoop(10);

  // UI Controllers
  public hud: HUDController;
  public sphere: SphereController;
  public nav: NavigationManager;
  public settingsModal: SettingsModal;
  public saveDataModal: SaveDataModal;

  // Feature Tabs
  public followersTab: FollowersTab;
  public incarnationTab: IncarnationTab;
  public fervorTab: FervorTab;
  public relicsTab: RelicsTab;
  public unlocksTab: UnlocksTab;
  public achievementsTab: AchievementsTab;
  public statsTab: StatsTab;

  // Save & System State
  private lastSaveTime: number = Date.now();
  private isResetting: boolean = false;
  private isHapticsEnabled: boolean = true;

  constructor() {
    // 1. Instantiate Core Subsystems
    this.audio = new AudioManager();
    this.notifications = new NotificationManager('achievements-popup-container');
    this.tooltips = new TooltipManager('cult-tooltip');

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

    this.nav = new NavigationManager({
      audio: this.audio,
      triggerHaptic: (pattern) => this.triggerHaptic(pattern),
      onTabSwitched: (_panel, tabId) => this.handleTabSwitched(tabId),
      onScreenSwitched: (screen) => {
        if (screen === 'gameplay') {
          this.followersTab.resize();
          this.incarnationTab.resize();
        }
      }
    });

    // 3. Instantiate Feature Tabs
    this.followersTab = new FollowersTab({
      gameState: this.gameState,
      audio: this.audio,
      tooltips: this.tooltips,
      triggerHaptic: (p) => this.triggerHaptic(p),
      spawnFloatingText: (x, y, t) => this.sphere.spawnFloatingText(x, y, t),
      onFollowersChanged: () => events.emit(GameEvents.STATE_CHANGED),
      grantMiracle: (x, y) => this.sphere.grantMiracle(x, y)
    });

    this.incarnationTab = new IncarnationTab({
      gameState: this.gameState,
      audio: this.audio,
      triggerHaptic: (p) => this.triggerHaptic(p),
      spawnFloatingText: (x, y, t) => this.sphere.spawnFloatingText(x, y, t),
      notifications: this.notifications,
      onIncarnationEvolved: () => events.emit(GameEvents.STATE_CHANGED),
      onBoostAdded: () => this.hud.update()
    });

    this.fervorTab = new FervorTab({
      gameState: this.gameState,
      audio: this.audio,
      tooltips: this.tooltips,
      triggerHaptic: (p) => this.triggerHaptic(p),
      onUpgradePurchased: () => events.emit(GameEvents.STATE_CHANGED)
    });

    this.relicsTab = new RelicsTab({
      gameState: this.gameState,
      audio: this.audio,
      tooltips: this.tooltips,
      notifications: this.notifications,
      spawnFloatingText: (x, y, t) => this.sphere.spawnFloatingText(x, y, t),
      onRelicsTransmuted: () => events.emit(GameEvents.STATE_CHANGED),
      onUpgradePurchased: () => {
        events.emit(GameEvents.STATE_CHANGED);
        this.fervorTab.updateButtonStates();
      }
    });

    this.unlocksTab = new UnlocksTab({
      gameState: this.gameState,
      audio: this.audio,
      notifications: this.notifications,
      tooltips: this.tooltips,
      onUnlockPurchased: (unlock) => {
        this.updateUnlockedTabsVisibility();
        if (unlock.id === 'unlock_incarnation') {
          this.incarnationTab.updateUI();
        } else if (unlock.id === 'unlock_fervor_upgrades') {
          this.fervorTab.renderList();
        } else if (unlock.id === 'unlock_relics') {
          this.relicsTab.updateUI();
          this.relicsTab.renderList();
        }
        events.emit(GameEvents.STATE_CHANGED);
      }
    });

    this.achievementsTab = new AchievementsTab({
      gameState: this.gameState,
      audio: this.audio,
      notifications: this.notifications,
      tooltips: this.tooltips
    });

    this.statsTab = new StatsTab({
      gameState: this.gameState
    });

    // 4. Instantiate Modals
    this.saveDataModal = new SaveDataModal({
      onExport: () => SaveSystem.exportSave(this.gameState.buildSaveData()),
      onImport: (raw) => {
        const imported = SaveSystem.importSave(raw);
        if (!imported) return false;

        const ok = window.confirm('Deseja substituir o progresso atual pelos dados importados?');
        if (ok) {
          SaveSystem.save(imported);
          this.applySaveData(imported);
          this.followersTab.syncFollowerCount(this.gameState.getTotalFollowersCount());
          this.incarnationTab.setStage(this.gameState.incarnationStage);
          this.renderAllLists();
          this.updateUnlockedTabsVisibility();
          events.emit(GameEvents.STATE_CHANGED);
          return true;
        }
        return false;
      },
      notifications: this.notifications
    });

    this.settingsModal = new SettingsModal({
      audio: this.audio,
      getLastSaveTime: () => this.lastSaveTime,
      onManualSave: () => this.manualSave(),
      onExportSave: () => this.saveDataModal.openExport(),
      onImportSave: () => this.saveDataModal.openImport(),
      onResetSave: () => this.confirmHardReset(),
      onToggleHaptics: (enabled) => { this.isHapticsEnabled = enabled; },
      isHapticsEnabled: () => this.isHapticsEnabled,
      onTriggerHaptic: (pattern) => this.triggerHaptic(pattern)
    });

    loadDisplayConfig();

    // 5. Load Progress & Sync Views
    this.loadProgress();
    this.followersTab.syncFollowerCount(this.gameState.getTotalFollowersCount());
    this.incarnationTab.setStage(this.gameState.incarnationStage);

    // 6. Setup Listeners, Initial Renders & Loops
    this.setupReactiveListeners();
    this.setupSystemEvents();
    this.renderAllLists();
    this.updateUnlockedTabsVisibility();
    this.startPassiveFaithLoop();
    this.startAutoSaveLoop();
    this.hud.update();

    // 7. Global Window Helpers
    this.registerGlobalHelpers();
  }

  private setupReactiveListeners(): void {
    events.on(GameEvents.STATE_CHANGED, () => {
      this.hud.update();
      this.statsTab.updateUI();
      this.achievementsTab.checkAchievements();
      this.achievementsTab.updateRealtime();
      this.updateItemButtonsState();
    });

    events.on(GameEvents.GAME_TICK, () => {
      if (this.gameState.incarnationBoostTimer > 0) {
        this.incarnationTab.updateBoostUI();
      }
      this.statsTab.updateUI();
      this.achievementsTab.checkAchievements();
      this.updateItemButtonsState();
      this.fervorTab.updateButtonStates();
      this.achievementsTab.updateRealtime();
      this.incarnationTab.updateRealtime();
      this.followersTab.updateRealtime();
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
        this.incarnationTab.pause();
      } else {
        this.gameLoop.resume();
        if (window.innerWidth > 860 || this.nav.getMobileView() === 'left') {
          this.followersTab.resume();
          this.incarnationTab.resume();
        }
      }
    });
  }

  private handleTabSwitched(tabId: string): void {
    if (tabId === 'tab-followers') {
      this.followersTab.updateUI();
      this.followersTab.resume();
      this.incarnationTab.pause();
      requestAnimationFrame(() => this.followersTab.resize());
    } else if (tabId === 'tab-incarnation') {
      this.incarnationTab.updateUI();
      this.incarnationTab.resume();
      this.followersTab.pause();
      requestAnimationFrame(() => this.incarnationTab.resize());
    } else {
      this.followersTab.pause();
      this.incarnationTab.pause();
    }

    if (tabId === 'tab-relics') {
      this.relicsTab.updateUI();
    }
  }

  private updateUnlockedTabsVisibility(): void {
    this.incarnationTab.setTabVisibility(this.gameState.isIncarnationUnlocked());
    this.fervorTab.setTabVisibility(this.gameState.isFervorUpgradesUnlocked());
    this.relicsTab.setTabVisibility(this.gameState.isRelicsUnlocked());
  }

  private renderAllLists(): void {
    this.followersTab.updateUI();
    this.incarnationTab.updateUI();
    this.fervorTab.renderList();
    this.unlocksTab.renderList();
    this.relicsTab.renderList();
    this.achievementsTab.renderList();
  }

  private updateItemButtonsState(): void {
    this.followersTab.updateUI();
    this.incarnationTab.updateUpgradeButtonState();
    this.unlocksTab.updateButtonStates();
    if (this.gameState.isRelicsUnlocked()) {
      this.relicsTab.updateUI();
    }

    // Update mobile navigation notification dots
    const devotee = this.gameState.followers[0];
    const canBuyDevotee = devotee ? this.gameState.faithPoints >= this.gameState.getItemCost(devotee) : false;
    const canBuyFervor = this.gameState.isFervorUpgradesUnlocked() && this.gameState.fervorUpgrades.some(u => this.gameState.fervorPoints >= calculateFervorUpgradeCost(u));
    const nextIncStage = INCARNATION_STAGES.find(s => s.stage === this.gameState.incarnationStage + 1);
    const canEvolveInc = this.gameState.isIncarnationUnlocked() && nextIncStage ? this.gameState.faithPoints >= nextIncStage.cost : false;
    const hasDevoteesAlert = canBuyDevotee || canBuyFervor || canEvolveInc;

    const canBuyUnlock = this.unlocksTab.hasAvailableUnlock();
    const canBuyRelic = this.gameState.isRelicsUnlocked() && this.gameState.relicUpgrades.some(r => r.level < r.maxLevel && this.gameState.relicPoints >= r.cost);
    const hasUnlocksAlert = canBuyUnlock || canBuyRelic;

    this.nav.updateBadges(hasDevoteesAlert, hasUnlocksAlert);
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
    this.incarnationTab.updateBoostUI();
    this.sphere.renderSatellites();
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
      console.log('Cult of the Sphere - Progresso carregado com sucesso do LocalStorage.');
      return true;
    }
    return false;
  }

  private manualSave(): void {
    const success = this.saveProgress();
    if (success) {
      this.audio.playTone(660, 'sine', 0.1);
      this.notifications.showCustomPopup('Culto Salvo', 'Seu progresso sagrado foi gravado com sucesso.', '', 'REGISTRO SAGRADO');
      this.settingsModal.updateSaveStatus();
    } else {
      this.notifications.showCustomPopup('Erro ao Salvar', 'Não foi possível gravar no armazenamento do navegador.', '', 'ALERTA');
    }
  }

  private confirmHardReset(): void {
    const ok = window.confirm('ATENÇÃO: Deseja realmente reiniciar o culto do zero? Todo o progresso sagrado, fiéis e relíquias serão perdidos permanentemente.');
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
    (window as any).cultGame = this;
    (window as any).unlockSphereSatellite = (index: number) => this.sphere.unlockSatellite(index);
    (window as any).lockSphereSatellite = (index: number) => this.sphere.lockSatellite(index);
    (window as any).unlockAllSphereSatellites = () => {
      for (let i = 0; i < 6; i++) this.sphere.unlockSatellite(i);
    };
    (window as any).lockAllSphereSatellites = () => {
      for (let i = 0; i < 6; i++) this.sphere.lockSatellite(i);
    };
    (window as any).triggerMiraclePlea = () => this.followersTab.triggerMiraclePlea();
  }
}

// Bootstrap Application
window.addEventListener('DOMContentLoaded', () => {
  new AppManager();
  console.log('Cult of the Sphere - Arquitetura Modular Inicializada.');
});
