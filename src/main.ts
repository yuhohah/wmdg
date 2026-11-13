import { ShortcutsHelp } from './ui/ShortcutsHelp.js';
import { GameplayShortcuts, createGameplayShortcutActions } from './ui/GameplayShortcuts.js';
/// <reference types="vite/client" />
// --- App Manager for Cult of the Sphere (Modular Orchestrator) ---

import { AudioManager } from './systems/audio.js';
import { NotificationManager } from './systems/notifications.js';
import { SaveSystem } from './systems/saveSystem.js';
import { SessionPersistenceController } from './systems/sessionPersistence.js';
import { SettingsModal } from './ui/SettingsModal.js';
import { ChangelogModal } from './ui/ChangelogModal.js';
import { GAME_VERSION } from './config/changelog.js';
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
import { FormulaTooltip } from './ui/FormulaTooltip.js';
import { BoardManager } from './ui/BoardManager.js';
import { hydrateIcons } from './ui/icons.js';
import { cultDialog } from './ui/CultDialog.js';
import { bindStartScreen } from './ui/StartScreenController.js';
import { CampaignEnding } from './features/ending/CampaignEnding.js';
import { TestMenu } from './ui/TestMenu.js';

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
  public persistence: SessionPersistenceController;

  // UI Controllers
  public hud: HUDController;
  public sphere: SphereController;
  public settingsModal: SettingsModal;
  public saveDataModal: SaveDataModal;
  public onboardingGuide: OnboardingGuide;
  private formulaTooltip: FormulaTooltip;
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
  public campaignEnding: CampaignEnding;
  private cardUpdates: VisibleCardUpdates;

  // Save & System State
  public isResetting: boolean = false;
  private isHapticsEnabled: boolean = true;

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
      spawnFloatingText: (x, y, t, small) => this.sphere.spawnFloatingText(x, y, t, small),
      onGnoseReset: () => {
        this.followersTab.syncFollowerCount(this.gameState.getTotalFollowersCount());
        this.refreshAllUI();
        this.board.setCardCollapsed('card-relics', false);
        this.board.centerOnCard('card-altar-sphere', true);
      },
      onUpgradePurchased: () => {
        this.refreshAllUI();
      },
      onBossDefeated: () => this.board.centerOnCard('card-gnose'),
      onBattleCamera: (target, elapsedSec) => this.board.followWorldTarget(target, elapsedSec),
    });

    this.unlocksTab = new UnlocksTab({
      gameState: this.gameState,
      audio: this.audio,
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

    this.persistence = new SessionPersistenceController({
      gameState: this.gameState,
      gameLoop: this.gameLoop,
      audio: this.audio,
      notifications: this.notifications,
      getIsResetting: () => this.isResetting,
      setIsResetting: (resetting) => {
        this.isResetting = resetting;
      },
      onSaveStatusUpdated: () => this.settingsModal?.updateSaveStatus(),
      onSyncAfterLoadOrOffline: () => {
        this.sphere.syncProgress();
        this.followersTab?.syncFollowerCount(this.gameState.getTotalFollowersCount());
        if (this.board && this.cardUpdates) {
          this.refreshAllUI();
        }
      },
      pauseFollowers: () => this.followersTab.pause(),
      resumeFollowers: () => this.followersTab.resume(),
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
          const restored = await this.persistence.processOfflineGains(imported.timestamp, imported);
          if (!restored) return false;
          this.followersTab.syncFollowerCount(this.gameState.getTotalFollowersCount());
          this.refreshAllUI();
          this.persistence.showPendingOfflineNotice();
          return true;
        }
        return null;
      },
      notifications: this.notifications
    });

    this.onboardingGuide = new OnboardingGuide({
      gameState: this.gameState,
      audio: this.audio
    });

    this.formulaTooltip = new FormulaTooltip(this.gameState);
    const changelogModal = new ChangelogModal();
    const versionLabel = document.getElementById('game-version');
    if (versionLabel) versionLabel.textContent = `Versão ${GAME_VERSION}`;
    this.settingsModal = new SettingsModal({
      audio: this.audio,
      onShowChangelog: () => { void changelogModal.open(); },
      getLastSaveTime: () => this.persistence.lastSaveTime,
      onManualSave: () => this.persistence.manualSave(),
      onExportSave: () => this.saveDataModal.openExport(),
      onImportSave: () => this.saveDataModal.openImport(),
      onResetSave: () => this.persistence.confirmHardReset(),
      onToggleHaptics: (enabled) => {
        this.isHapticsEnabled = enabled;
      },
      isHapticsEnabled: () => this.isHapticsEnabled,
      isGuidanceHidden: () => this.gameState.hideGuidance,
      onReplayTutorials: () => {
        this.onboardingGuide.restart();
        this.refreshAllUI();
        this.persistence.saveProgress();
      },
      onToggleHideGuidance: hidden => {
        this.gameState.hideGuidance = hidden;
        if (!hidden) this.onboardingGuide.restart();
        this.refreshAllUI();
        this.persistence.saveProgress();
      },
      isShowHotkeysEnabled: () => this.gameState.showHotkeys,
      onToggleShowHotkeys: enabled => {
        this.gameState.showHotkeys = enabled;
        this.updateUnlockedTabsVisibility();
        this.persistence.saveProgress();
      },
      isNerdsEnabled: () => this.gameState.nerdsEnabled,
      onToggleNerds: enabled => {
        this.gameState.nerdsEnabled = enabled;
        this.formulaTooltip.hide();
      },
      onTriggerHaptic: (pattern) => this.triggerHaptic(pattern)
    });

    new ShortcutsHelp();
    new GameplayShortcuts(createGameplayShortcutActions({
      gameState: this.gameState,
      focusCard: cardId => this.board?.centerOnCard(cardId),
      buyFollower: () => this.followersTab.buyOneFollower(),
      buyMaxFollowers: () => this.followersTab.buyMaxFollowers(),
      buyFervor: index => this.fervorTab.buyUpgrade(this.gameState.fervorUpgrades[index]),
      buyRelic: index => this.relicsTab.buyRelicUpgrade(this.gameState.relicUpgrades[index]),
      transmute: () => this.relicsTab.convertFaithToRelics(),
      collectMiracle: () => {
        if (this.gameState.activeBossBattle) document.getElementById('boss-miracle-btn')?.click();
        else this.followersTab.arena?.collectAvailableMiracle();
      },
      boostIncarnation: () => this.incarnationTab.handleAltarClick(),
      evolveIncarnation: () => this.incarnationTab.upgradeIncarnation(),
    }));

    // 5. Load Progress & Sync Views
    this.persistence.loadProgress();
    this.followersTab.syncFollowerCount(this.gameState.getTotalFollowersCount());

    // 6. Setup Listeners, Initial Renders & Loops
    this.board = new BoardManager();
    this.cardUpdates = this.setupCardUpdates();
    this.onboardingGuide.setOnFocusCard((cardId, immediate, targetSelector) => {
      this.board.centerOnCard(cardId, immediate, targetSelector);
    });
    this.campaignEnding = new CampaignEnding(
      this.gameState,
      () => this.persistence.saveProgress(),
      () => document.body.classList.contains('is-playing') && !this.gnoseTab.bossBattleModal.isOpen(),
      this.audio
    );
    bindStartScreen({
      gameState: this.gameState,
      audio: this.audio,
      onStartPlay: () => {
        this.persistence.saveProgress();
      },
      onStartFrameReady: () => {
        this.board.centerOnCard('card-altar-sphere', true);
        this.followersTab.resize();
        this.incarnationTab.altar?.resize();
        this.onboardingGuide.update();
        this.persistence.showPendingOfflineNotice();
      },
    });
    this.setupReactiveListeners();
    this.persistence.bindSystemEvents(() => this.refreshAllUI());
    this.renderAllLists();
    this.updateUnlockedTabsVisibility();
    this.startPassiveFaithLoop();
    this.persistence.startAutoSaveLoop();
    this.hud.update();
    this.onboardingGuide.update();

    // 7. Developer-only / Localhost Test Menu & Global Window Helpers
    if (isDevMode()) {
      this.testMenu = new TestMenu(this);
    }
    this.registerGlobalHelpers();
    void changelogModal.showIfUpdated();
  }

  private setupReactiveListeners(): void {
    events.on(GameEvents.STATE_CHANGED, () => {
      this.statsTab.updateUI();
      this.achievementsTab.checkAchievements();
      this.achievementsTab.updateRealtime();
      this.updateCompletedCards();
      this.cardUpdates.update();
      if (this.gnoseTab.bossBattleModal.isOpen()) this.gnoseTab.bossBattleModal.updateUI();
      this.onboardingGuide.update();
      this.formulaTooltip.update();
      this.campaignEnding.update();
    });

    events.on(GameEvents.GAME_TICK, () => {
      this.statsTab.updateUI();
      this.achievementsTab.checkAchievements();
      this.updateCompletedCards();
      this.cardUpdates.update();
      if (this.gnoseTab.bossBattleModal.isOpen()) this.gnoseTab.bossBattleModal.updateUI();
      this.achievementsTab.updateRealtime();
      this.onboardingGuide.update();
      this.campaignEnding.update();
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
    const tips = document.querySelector<HTMLElement>('.start-game-tips');
    if (tips) tips.hidden = this.gameState.hideGuidance;
    document.body.classList.toggle('hide-hotkeys', !this.gameState.showHotkeys);
    const inc = this.gameState.isIncarnationUnlocked();
    const ferv = this.gameState.isFervorUpgradesUnlocked();
    const rel = this.gameState.isRelicsUnlocked();
    const gno = this.gameState.isGnoseUnlocked();

    this.fervorTab.setHudVisibility(inc);
    this.relicsTab.setHudVisibility(rel);
    this.gnoseTab.setHudVisibility(gno);
    this.unlocksTab.syncVisibility();

    if (this.board) {
      this.board.setCardUnlocked('card-incarnation', inc);
      this.board.setCardUnlocked('card-fervor', ferv);
      this.board.setCardUnlocked('card-relics', rel);
      this.board.setCardUnlocked('card-gnose', gno);
    }
  }

  private updateCompletedCards(): void {
    const gs = this.gameState;
    let allRelicsMaxed = gs.relicUpgrades.length > 0;
    for (let i = 0; i < gs.relicUpgrades.length; i++) {
      const relic = gs.relicUpgrades[i];
      if (relic.level < gs.getRelicMaxLevel(relic)) {
        allRelicsMaxed = false;
        break;
      }
    }
    this.board.setCardCompleted('card-relics', allRelicsMaxed);
  }

  public renderAllLists(): void {
    this.updateCompletedCards();
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
      this.fervorTab.updateButtonStates();
    });
    views.register('card-relics', () => this.relicsTab.renderList(), () => this.relicsTab.updateUI());
    views.register('card-gnose', () => this.gnoseTab.renderTree(), () => this.gnoseTab.updateUI());
    return views;
  }

  private countUnlockedSeals(): number {
    let count = 0;
    const unlocks = this.gameState.unlocks;
    for (let i = 0; i < unlocks.length; i++) {
      if (unlocks[i].unlocked) count++;
    }
    return count;
  }

  private startPassiveFaithLoop(): void {
    this.gameLoop.onTick((deltaSec) => {
      const unlockedCount = this.countUnlockedSeals();
      this.gameState.tick(deltaSec);
      if (this.countUnlockedSeals() !== unlockedCount) {
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
