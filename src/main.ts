import { ShortcutsHelp } from './ui/ShortcutsHelp.js';
import { GameplayShortcuts, createGameplayShortcutActions } from './ui/GameplayShortcuts.js';
/// <reference types="vite/client" />
import { recoverOfflineProgress } from './systems/offlineRecovery.js';
// --- App Manager for Cult of the Sphere (Modular Orchestrator) ---

import { AudioManager } from './systems/audio.js';
import { NotificationManager } from './systems/notifications.js';
import { SaveSystem, type SaveData } from './systems/saveSystem.js';
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
import { SphereVisual } from './features/sphere/SphereVisual.js';
import { OnboardingGuide } from './ui/OnboardingGuide.js';
import { FormulaTooltip } from './ui/FormulaTooltip.js';
import { BoardManager } from './ui/BoardManager.js';
import { hydrateIcons } from './ui/icons.js';
import { cultDialog } from './ui/CultDialog.js';
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
  private lastSaveTime: number = Date.now();
  public isResetting: boolean = false;
  private isHapticsEnabled: boolean = true;
  private hiddenSinceMs: number | undefined;
  private pendingOfflineNotice?: { title: string; desc: string };
  private offlineRecovery?: Promise<boolean>;
  private offlineCheckpoint?: SaveData;
  private offlineCreditedThroughMs = 0;

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
          const restored = await this.processOfflineGains(imported.timestamp, imported);
          if (!restored) return false;
          this.followersTab.syncFollowerCount(this.gameState.getTotalFollowersCount());
          this.refreshAllUI();
          this.showPendingOfflineNotice();
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
      getLastSaveTime: () => this.lastSaveTime,
      onManualSave: () => this.manualSave(),
      onExportSave: () => this.saveDataModal.openExport(),
      onImportSave: () => this.saveDataModal.openImport(),
      onResetSave: () => this.confirmHardReset(),
      onToggleHaptics: (enabled) => {
        this.isHapticsEnabled = enabled;
      },
      isHapticsEnabled: () => this.isHapticsEnabled,
      isGuidanceHidden: () => this.gameState.hideGuidance,
      onReplayTutorials: () => {
        this.onboardingGuide.restart();
        this.refreshAllUI();
        this.saveProgress();
      },
      onToggleHideGuidance: hidden => {
        this.gameState.hideGuidance = hidden;
        if (!hidden) this.onboardingGuide.restart();
        this.refreshAllUI();
        this.saveProgress();
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
    this.loadProgress();
    this.followersTab.syncFollowerCount(this.gameState.getTotalFollowersCount());

    // 6. Setup Listeners, Initial Renders & Loops
    this.board = new BoardManager();
    this.cardUpdates = this.setupCardUpdates();
    this.onboardingGuide.setOnFocusCard((cardId, immediate, targetSelector) => {
      this.board.centerOnCard(cardId, immediate, targetSelector);
    });
    this.campaignEnding = new CampaignEnding(this.gameState, () => this.saveProgress(),
      () => document.body.classList.contains('is-playing') && !this.gnoseTab.bossBattleModal.isOpen(), this.audio);
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
    void changelogModal.showIfUpdated();
  }

  private bindStartScreen(): void {
    const playBtn = document.getElementById('play-btn');
    const startScreen = document.getElementById('start-screen');
    const gameplayScreen = document.getElementById('gameplay-screen');
    const startSphereHost = document.getElementById('start-sphere');
    const startSphere = startSphereHost ? new SphereVisual(startSphereHost) : null;
    const syncStartSphere = () => startSphere?.setProgress(
      this.gameState.isIncarnationUnlocked(), this.gameState.incarnationStage,
    );
    syncStartSphere();
    const stopSyncStartSphere = events.on(GameEvents.STATE_CHANGED, syncStartSphere);

    playBtn?.addEventListener('click', () => {
      stopSyncStartSphere();
      startSphere?.destroy();
      this.gameState.startGameClock();
      this.saveProgress();
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
        this.showPendingOfflineNotice();
      });
    });
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

  private setupSystemEvents(): void {
    window.addEventListener('beforeunload', () => {
      if (!this.isResetting) {
        this.saveProgress();
      }
    });

    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'hidden') {
        this.hiddenSinceMs ??= Date.now();
        if (!this.isResetting) {
          this.saveProgress();
        }
        this.gameLoop.pause();
        this.followersTab.pause();
      } else {
        const hiddenSince = this.hiddenSinceMs;
        this.hiddenSinceMs = undefined;
        if (hiddenSince !== undefined) {
          await this.processOfflineGains(hiddenSince);
          this.refreshAllUI();
          this.showPendingOfflineNotice();
        }
        if (document.visibilityState === 'visible' && !this.offlineRecovery) {
          this.gameLoop.resume();
          this.followersTab.resume();
        }
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
    const tips = document.querySelector<HTMLElement>('.start-game-tips');
    if (tips) tips.hidden = this.gameState.hideGuidance;
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

  // --- Save / Load & Persistence ---

  private applySaveData(save: SaveData): void {
    this.gameState.applySaveData(save);
    if (document.body.classList.contains('is-playing')) this.gameState.startGameClock();
    this.sphere.syncProgress();
  }

  private saveProgress(): boolean {
    if (this.isResetting) return false;
    const data = this.offlineCheckpoint ?? this.gameState.buildSaveData();
    if (!this.offlineCheckpoint && this.hiddenSinceMs !== undefined) data.timestamp = this.hiddenSinceMs;
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
        // The constructor finishes creating the board and controls before recovery yields.
        queueMicrotask(() => { void this.processOfflineGains(data.timestamp); });
      }
      return true;
    }
    return false;
  }

  private showPendingOfflineNotice(): void {
    if (!this.pendingOfflineNotice || !document.body.classList.contains('is-playing')) return;
    const notice = this.pendingOfflineNotice;
    this.pendingOfflineNotice = undefined;
    this.notifications.showCustomPopup(notice.title, notice.desc, 'hourglass', '');
  }

  private async processOfflineGains(lastTimestamp: number, imported?: SaveData): Promise<boolean> {
    // Serialize visibility changes and imports, then account only for uncredited time.
    while (this.offlineRecovery) await this.offlineRecovery;
    const now = Date.now();
    const from = imported ? lastTimestamp : Math.max(lastTimestamp, this.offlineCreditedThroughMs);
    const source = imported ?? this.gameState.buildSaveData();
    source.timestamp = from;
    const wasRunning = this.gameLoop.isRunning();
    this.gameLoop.pause();
    this.followersTab.pause();
    this.offlineCheckpoint = this.gameState.buildSaveData();
    if (!imported) this.offlineCheckpoint.timestamp = from;

    const dialog = document.createElement('dialog');
    dialog.className = 'cult-dialog';
    dialog.setAttribute('aria-label', 'Atualizando o culto');
    dialog.innerHTML = '<h2 tabindex="-1">Reunindo a Fé acumulada</h2><p role="status">Seu progresso está sendo atualizado. Aguarde um instante.</p>';
    dialog.addEventListener('cancel', event => event.preventDefault());
    document.body.append(dialog);
    dialog.showModal();
    this.gameState.retreatBossBattle();
    const recovery = (async () => {
      try {
        const result = await recoverOfflineProgress(source, now);
        // Commit the fully calculated, validated candidate before changing the live state.
        if (!SaveSystem.save(result.save)) throw new Error('Não foi possível salvar o progresso recuperado.');
        this.applySaveData(result.save);
        this.gameState.relicConvertCooldown = 0;
        this.offlineCreditedThroughMs = now;
        this.pendingOfflineNotice = result.notice;
        this.lastSaveTime = now;
        this.settingsModal.updateSaveStatus();
        return true;
      } catch (error) {
        console.error('Falha ao recuperar o progresso:', error);
        this.notifications.showCustomPopup('Não foi possível atualizar o culto', 'Seu progresso anterior foi preservado. Verifique o armazenamento do navegador e tente novamente.', 'warning', 'REGISTRO SAGRADO');
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
      this.followersTab.syncFollowerCount(this.gameState.getTotalFollowersCount());
      this.refreshAllUI();
      if (wasRunning && document.visibilityState === 'visible') this.gameLoop.resume();
      if (document.visibilityState === 'visible') this.followersTab.resume();
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
