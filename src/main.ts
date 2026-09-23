// --- App Manager for Cult of the Sphere (Modular Orchestrator) ---

import type { BuyableItem, FervorUpgrade, Achievement, GameState, MechanicUnlock, RelicUpgrade } from './types.js';
import { initialFollowers } from './config/followers.js';
import { initialMonuments } from './config/monuments.js';
import { initialFervorUpgrades, BASE_FERVOR_RATE, getFervorUpgradeMultiplier } from './config/fervor.js';
import { initialAchievements } from './config/achievements.js';
import { initialUnlocks } from './config/unlocks.js';
import { initialRelicUpgrades } from './config/relics.js';
import { INCARNATION_STAGES } from './config/incarnation.js';
import {
  calculateItemCost,
  calculateFervorUpgradeCost,
  calculateClickBuffMultiplier,
  calculatePassiveBuffMultiplier,
  calculateGlobalBuffMultiplier,
  calculateMonumentBuffMultiplier,
  calculateCostDiscountMultiplier,
  calculateMaxAffordableFollowers,
  calculateFervorFaithBonus,
  calculateFervorRate,
  calculateFaithPerClick,
  calculateFaithPerSecond,
  calculateRelicsToGet,
  calculateExtraRelicsPerSecond,
  calculateRelicFaithMultiplier,
  formatNumber
} from './systems/calculations.js';
import { AudioManager } from './systems/audio.js';
import { NotificationManager } from './systems/notifications.js';
import { TooltipManager } from './ui/tooltips.js';
import { loadDisplayConfig, DISPLAY_CONFIG } from './config/display.js';
import { FollowersArena } from './ui/followersArena.js';
import { IncarnationArena } from './ui/incarnationArena.js';
import { SaveSystem, type SaveData } from './systems/saveSystem.js';

class AppManager {
  // Screens & Panels
  private startScreen: HTMLElement;
  private gameplayScreen: HTMLElement;
  private settingsModal: HTMLElement;
  private panelLeft: HTMLElement;
  private panelRight: HTMLElement;
  private toggleLeftBtn: HTMLButtonElement;
  private toggleRightBtn: HTMLButtonElement;
  private expandLeftBtn: HTMLButtonElement;
  private expandRightBtn: HTMLButtonElement;

  // Center Frame Elements
  private divineSphereBtn: HTMLElement;
  private sphereClickValEl: HTMLElement | null;

  // HUD Elements
  private faithCounterEl: HTMLElement;
  private faithPerSecCounterEl: HTMLElement;
  private followersCounterEl: HTMLElement | null;
  private fervorCounterHudEl: HTMLElement | null;
  private fervorRateCounterHudEl: HTMLElement | null;
  private relicCounterHudEl: HTMLElement | null;
  private relicRateCounterHudEl: HTMLElement | null;

  // Buttons & Navigation
  private playBtn: HTMLButtonElement;
  private settingsBtn: HTMLButtonElement;
  private closeSettingsBtn: HTMLButtonElement;
  private closeSettingsFooterBtn: HTMLButtonElement;

  // Followers Arena & Custom Tab Elements
  private followersArena: FollowersArena | null = null;
  private followersTotalCountEl: HTMLElement | null = null;
  private followersRateBadgeEl: HTMLElement | null = null;
  private btnConvertOneEl: HTMLButtonElement | null = null;
  private convertOneCostValEl: HTMLElement | null = null;
  private convertOneBenefitEl: HTMLElement | null = null;
  private btnConvertMaxEl: HTMLButtonElement | null = null;
  private convertMaxTitleEl: HTMLElement | null = null;
  private convertMaxSubEl: HTMLElement | null = null;
  private convertMaxCostLabelEl: HTMLElement | null = null;
  private convertMaxCostValEl: HTMLElement | null = null;

  // List Containers for Options
  private fervorUpgradesListEl: HTMLElement;
  private unlocksListEl: HTMLElement;
  private tabBtnRelicsEl: HTMLButtonElement | null = null;
  private achievementsListEl: HTMLElement;

  // Fervor Elements
  private fervorCounterEl: HTMLElement;
  private fervorRateCounterEl: HTMLElement;
  private statFervorAccumEl: HTMLElement;
  private statFervorRateEl: HTMLElement;

  // Stats Elements
  private statTotalFaithEl: HTMLElement;
  private statClickFaithEl: HTMLElement;
  private statPassiveFaithEl: HTMLElement;
  private statTotalFollowersEl: HTMLElement;
  private statTotalClicksEl: HTMLElement;
  private statAchievementsCountEl: HTMLElement;
  private statCultTierEl: HTMLElement;

  // Subsystems
  private audio: AudioManager;
  private notifications: NotificationManager;
  private tooltips: TooltipManager;

  // Game Numeric State
  private faithPoints: number = 1;
  private totalFaithAccumulated: number = 1;
  private totalClicks: number = 0;
  private fervorPoints: number = 0;

  // Configured Data Arrays
  private followers: BuyableItem[] = initialFollowers.map((item) => ({ ...item }));
  private fervorUpgrades: FervorUpgrade[] = initialFervorUpgrades.map((u) => ({ ...u }));
  private monuments: BuyableItem[] = initialMonuments.map((m) => ({ ...m }));
  private achievements: Achievement[] = initialAchievements.map((a) => ({ ...a }));
  private unlocks: MechanicUnlock[] = initialUnlocks.map((u) => ({ ...u }));

  // Incarnation Elements & State
  private incarnationArena?: IncarnationArena;
  private incarnationStage: number = 1;
  private tabBtnIncarnationEl: HTMLElement | null = null;
  private tabBtnFervorEl: HTMLElement | null = null;
  private hudFervorDividerEl: HTMLElement | null = null;
  private hudFervorItemEl: HTMLElement | null = null;
  private hudRelicDividerEl: HTMLElement | null = null;
  private hudRelicItemEl: HTMLElement | null = null;
  private incarnationStageBadgeEl: HTMLElement | null = null;
  private incarnationTitleEl: HTMLElement | null = null;
  private incarnationDescSubEl: HTMLElement | null = null;
  private incarnationRateBadgeEl: HTMLElement | null = null;
  private btnUpgradeIncarnationEl: HTMLButtonElement | null = null;
  private incarnationUpgradeTitleEl: HTMLElement | null = null;
  private incarnationUpgradeBenefitEl: HTMLElement | null = null;
  private incarnationUpgradeCostValEl: HTMLElement | null = null;

  // Incarnation Boost (2x Fé/s) State & Elements
  private incarnationBoostTimer: number = 0;
  private readonly MAX_INCARNATION_BOOST: number = 60;
  private incarnationBoostCardEl: HTMLElement | null = null;
  private incarnationBoostBadgeEl: HTMLElement | null = null;
  private incarnationBoostTimerTextEl: HTMLElement | null = null;
  private incarnationBoostFillEl: HTMLElement | null = null;
  private incarnationBoostStatusEl: HTMLElement | null = null;

  // Relics (Alchemy) Elements
  private btnConvertRelicsEl: HTMLButtonElement | null = null;
  private relicsToGetEl: HTMLElement | null = null;
  private relicsConvertCooldownEl: HTMLElement | null = null;
  private relicsBalanceValEl: HTMLElement | null = null;
  private relicsExtraValEl: HTMLElement | null = null;
  private relicUpgradesListEl: HTMLElement | null = null;

  // Relics State
  private relicPoints: number = 0;
  private bestRelicsToGet: number = 0;
  private relicConvertCooldown: number = 0;
  private relicUpgrades: RelicUpgrade[] = initialRelicUpgrades.map((r) => ({ ...r }));

  // 6 Sphere Satellite Nodes State (Locked / Dormant by default)
  private sphereSatellitesUnlocked: boolean[] = [false, false, false, false, false, false];

  // Save & Progress State & Elements
  private btnManualSaveEl: HTMLButtonElement | null = null;
  private btnExportSaveEl: HTMLButtonElement | null = null;
  private btnImportSaveEl: HTMLButtonElement | null = null;
  private btnResetSaveEl: HTMLButtonElement | null = null;
  private saveStatusTextEl: HTMLElement | null = null;

  private saveDataModal: HTMLElement | null = null;
  private saveDataModalTitle: HTMLElement | null = null;
  private saveDataModalDesc: HTMLElement | null = null;
  private saveDataTextarea: HTMLTextAreaElement | null = null;
  private btnSaveDataAction: HTMLButtonElement | null = null;
  private closeSaveDataBtn: HTMLButtonElement | null = null;
  private saveDataMode: 'export' | 'import' = 'export';
  private lastSaveTime: number = Date.now();
  private isResetting: boolean = false;

  // Audio UI Elements
  private volumeSliderEl: HTMLInputElement | null = null;
  private musicToggleEl: HTMLInputElement | null = null;
  private sfxToggleEl: HTMLInputElement | null = null;
  private musicQuickBtnEl: HTMLButtonElement | null = null;
  private musicIconOnEl: HTMLElement | null = null;
  private musicIconOffEl: HTMLElement | null = null;

  constructor() {
    // Cache DOM Elements
    this.startScreen = document.getElementById('start-screen')!;
    this.gameplayScreen = document.getElementById('gameplay-screen')!;
    this.settingsModal = document.getElementById('settings-modal')!;

    this.panelLeft = document.getElementById('panel-left')!;
    this.panelRight = document.getElementById('panel-right')!;
    this.toggleLeftBtn = document.getElementById('toggle-left-btn') as HTMLButtonElement;
    this.toggleRightBtn = document.getElementById('toggle-right-btn') as HTMLButtonElement;
    this.expandLeftBtn = document.getElementById('expand-left-btn') as HTMLButtonElement;
    this.expandRightBtn = document.getElementById('expand-right-btn') as HTMLButtonElement;

    this.divineSphereBtn = document.getElementById('divine-sphere-btn')!;
    this.sphereClickValEl = document.getElementById('sphere-click-val');

    this.faithCounterEl = document.getElementById('faith-counter')!;
    this.faithPerSecCounterEl = document.getElementById('faith-per-sec-counter')!;
    this.followersCounterEl = document.getElementById('followers-counter');
    this.fervorCounterHudEl = document.getElementById('fervor-counter-hud');
    this.fervorRateCounterHudEl = document.getElementById('fervor-rate-counter-hud');
    this.relicCounterHudEl = document.getElementById('relic-counter-hud');
    this.relicRateCounterHudEl = document.getElementById('relic-rate-counter-hud');

    this.playBtn = document.getElementById('play-btn') as HTMLButtonElement;
    this.settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;
    this.closeSettingsBtn = document.getElementById('close-settings-btn') as HTMLButtonElement;
    this.closeSettingsFooterBtn = document.getElementById('close-settings-footer-btn') as HTMLButtonElement;

    this.volumeSliderEl = document.getElementById('volume-slider') as HTMLInputElement | null;
    this.musicToggleEl = document.getElementById('music-toggle') as HTMLInputElement | null;
    this.sfxToggleEl = document.getElementById('sfx-toggle') as HTMLInputElement | null;
    this.musicQuickBtnEl = document.getElementById('music-quick-btn') as HTMLButtonElement | null;
    this.musicIconOnEl = document.getElementById('music-icon-on');
    this.musicIconOffEl = document.getElementById('music-icon-off');

    this.followersTotalCountEl = document.getElementById('followers-total-count');
    this.followersRateBadgeEl = document.getElementById('followers-rate-badge');
    this.btnConvertOneEl = document.getElementById('btn-convert-one') as HTMLButtonElement | null;
    this.convertOneCostValEl = document.getElementById('convert-one-cost-val');
    this.convertOneBenefitEl = document.getElementById('convert-one-benefit');
    this.btnConvertMaxEl = document.getElementById('btn-convert-max') as HTMLButtonElement | null;
    this.convertMaxTitleEl = document.getElementById('convert-max-title');
    this.convertMaxSubEl = document.getElementById('convert-max-sub');
    this.convertMaxCostLabelEl = document.getElementById('convert-max-cost-label');
    this.convertMaxCostValEl = document.getElementById('convert-max-cost-val');

    // Incarnation Elements
    this.tabBtnIncarnationEl = document.getElementById('tab-btn-incarnation');
    this.tabBtnFervorEl = document.getElementById('tab-btn-fervor');
    this.hudFervorDividerEl = document.getElementById('hud-fervor-divider');
    this.hudFervorItemEl = document.getElementById('hud-fervor-item');
    this.hudRelicDividerEl = document.getElementById('hud-relic-divider');
    this.hudRelicItemEl = document.getElementById('hud-relic-item');

    this.incarnationStageBadgeEl = document.getElementById('incarnation-stage-badge');
    this.incarnationTitleEl = document.getElementById('incarnation-title');
    this.incarnationDescSubEl = document.getElementById('incarnation-desc-sub');
    this.incarnationRateBadgeEl = document.getElementById('incarnation-rate-badge');
    this.btnUpgradeIncarnationEl = document.getElementById('btn-upgrade-incarnation') as HTMLButtonElement | null;
    this.incarnationUpgradeTitleEl = document.getElementById('incarnation-upgrade-title');
    this.incarnationUpgradeBenefitEl = document.getElementById('incarnation-upgrade-benefit');
    this.incarnationUpgradeCostValEl = document.getElementById('incarnation-cost-val');

    this.incarnationBoostCardEl = document.getElementById('incarnation-boost-card');
    this.incarnationBoostBadgeEl = document.getElementById('incarnation-boost-badge');
    this.incarnationBoostTimerTextEl = document.getElementById('incarnation-boost-timer-text');
    this.incarnationBoostFillEl = document.getElementById('incarnation-boost-fill');
    this.incarnationBoostStatusEl = document.getElementById('incarnation-boost-status');

    const arenaCanvas = document.getElementById('followers-walk-canvas');
    if (arenaCanvas) {
      this.followersArena = new FollowersArena('followers-walk-canvas');
      this.followersArena.setOnClickCallback((_clientX, _clientY) => {
        this.audio.playTone(660, 'sine', 0.08);
      });
      this.followersArena.setOnMiracleClickCallback((clientX, clientY) => {
        this.grantMiracle(clientX, clientY);
      });
    }

    const incCanvas = document.getElementById('incarnation-canvas');
    if (incCanvas) {
      this.incarnationArena = new IncarnationArena('incarnation-canvas');
      this.incarnationArena.setOnClickCallback((clientX, clientY) => {
        this.audio.playTone(880, 'sine', 0.12);
        this.addIncarnationBoost(2);
        this.spawnFloatingText(clientX, clientY, '+2s (2x FÉ)');
      });
    }

    this.fervorUpgradesListEl = document.getElementById('fervor-upgrades-list')!;
    this.unlocksListEl = document.getElementById('unlocks-list')!;
    this.tabBtnRelicsEl = document.getElementById('tab-btn-relics') as HTMLButtonElement | null;
    this.achievementsListEl = document.getElementById('achievements-list')!;
    this.btnConvertRelicsEl = document.getElementById('btn-convert-relics') as HTMLButtonElement | null;
    this.relicsToGetEl = document.getElementById('relics-to-get');
    this.relicsConvertCooldownEl = document.getElementById('relics-convert-cooldown');
    this.relicsBalanceValEl = document.getElementById('relics-balance-val');
    this.relicsExtraValEl = document.getElementById('relics-extra-val');
    this.relicUpgradesListEl = document.getElementById('relic-upgrades-list');

    this.fervorCounterEl = document.getElementById('fervor-counter')!;
    this.fervorRateCounterEl = document.getElementById('fervor-rate-counter')!;
    this.statFervorAccumEl = document.getElementById('stat-fervor-accum')!;
    this.statFervorRateEl = document.getElementById('stat-fervor-rate')!;

    this.statTotalFaithEl = document.getElementById('stat-total-faith')!;
    this.statClickFaithEl = document.getElementById('stat-click-faith')!;
    this.statPassiveFaithEl = document.getElementById('stat-passive-faith')!;
    this.statTotalFollowersEl = document.getElementById('stat-total-followers')!;
    this.statTotalClicksEl = document.getElementById('stat-total-clicks')!;
    this.statAchievementsCountEl = document.getElementById('stat-achievements-count')!;
    this.statCultTierEl = document.getElementById('stat-cult-tier')!;

    // Save & Settings Elements
    this.btnManualSaveEl = document.getElementById('btn-manual-save') as HTMLButtonElement | null;
    this.btnExportSaveEl = document.getElementById('btn-export-save') as HTMLButtonElement | null;
    this.btnImportSaveEl = document.getElementById('btn-import-save') as HTMLButtonElement | null;
    this.btnResetSaveEl = document.getElementById('btn-reset-save') as HTMLButtonElement | null;
    this.saveStatusTextEl = document.getElementById('save-status-text');

    this.saveDataModal = document.getElementById('save-data-modal');
    this.saveDataModalTitle = document.getElementById('save-data-modal-title');
    this.saveDataModalDesc = document.getElementById('save-data-modal-desc');
    this.saveDataTextarea = document.getElementById('save-data-textarea') as HTMLTextAreaElement | null;
    this.btnSaveDataAction = document.getElementById('btn-save-data-action') as HTMLButtonElement | null;
    this.closeSaveDataBtn = document.getElementById('close-save-data-btn') as HTMLButtonElement | null;

    // Instantiate Subsystems
    this.audio = new AudioManager();
    this.notifications = new NotificationManager('achievements-popup-container');
    this.tooltips = new TooltipManager('cult-tooltip');

    loadDisplayConfig();

    // Load saved game progress before initializing views
    this.loadProgress();

    if (this.followersArena) {
      this.followersArena.syncFollowerCount(this.getTotalFollowersCount());
    }
    if (this.incarnationArena) {
      this.incarnationArena.setStage(this.incarnationStage);
    }

    this.initEvents();
    this.renderAllLists();
    this.updateUnlockedTabsAndHUD();
    this.startPassiveFaithLoop();
    this.startAutoSaveLoop();
    this.updateHUD();
    this.renderSphereSatellites();

    // Expose helpers for satellite unlocking progression
    (window as any).cultGame = this;
    (window as any).unlockSphereSatellite = (index: number) => this.unlockSphereSatellite(index);
    (window as any).lockSphereSatellite = (index: number) => this.lockSphereSatellite(index);
    (window as any).unlockAllSphereSatellites = () => {
      for (let i = 0; i < 6; i++) this.unlockSphereSatellite(i);
    };
    (window as any).lockAllSphereSatellites = () => {
      for (let i = 0; i < 6; i++) this.lockSphereSatellite(i);
    };
    (window as any).triggerMiraclePlea = () => this.followersArena?.triggerMiraclePlea();
  }

  private initEvents(): void {
    // Start Game
    this.playBtn.addEventListener('click', () => {
      this.audio.init();
      this.audio.playMusic();
      this.switchScreen('gameplay');
      this.audio.playTone(440, 'sine', 0.1);
    });

    // Sphere Clicks
    this.divineSphereBtn.addEventListener('click', (e: MouseEvent) => {
      this.onSphereClicked(e);
    });

    // 6 Sphere Satellite Nodes Clicks
    const satelliteNodes = document.querySelectorAll<HTMLElement>('.sphere-satellite-node');
    satelliteNodes.forEach((node) => {
      const idxStr = node.getAttribute('data-node-index');
      const idx = idxStr ? parseInt(idxStr, 10) : 0;
      node.addEventListener('click', (e: MouseEvent) => {
        e.stopPropagation();
        if (this.sphereSatellitesUnlocked[idx]) {
          this.onSatelliteClicked(idx, e);
        } else {
          this.audio.playTone(220, 'sine', 0.08);
          const clientX = e.clientX || window.innerWidth / 2;
          const clientY = e.clientY || window.innerHeight / 2;
          this.spawnFloatingText(clientX, clientY, 'NÓ DORMENTE');
        }
      });
    });

    // Faithful Conversion Buttons
    this.btnConvertOneEl?.addEventListener('click', () => {
      this.buyOneFollower();
    });
    this.btnConvertMaxEl?.addEventListener('click', () => {
      this.buyMaxFollowers();
    });

    // Incarnation Upgrade Button
    this.btnUpgradeIncarnationEl?.addEventListener('click', () => {
      this.upgradeIncarnation();
    });

    // Relics Conversion Button
    this.btnConvertRelicsEl?.addEventListener('click', () => {
      this.convertFaithToRelics();
    });

    // Panels Toggle
    this.toggleLeftBtn.addEventListener('click', () => this.togglePanel('left', false));
    this.expandLeftBtn.addEventListener('click', () => this.togglePanel('left', true));
    this.toggleRightBtn.addEventListener('click', () => this.togglePanel('right', false));
    this.expandRightBtn.addEventListener('click', () => this.togglePanel('right', true));

    // Tabs Switching
    const tabButtons = document.querySelectorAll<HTMLButtonElement>('.panel-tab-btn');
    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const panel = btn.getAttribute('data-panel') as 'left' | 'right';
        const targetTab = btn.getAttribute('data-tab')!;
        this.switchTab(panel, targetTab, btn);
        this.audio.playTone(550, 'sine', 0.05);
      });
    });

    // Settings Modal
    this.settingsBtn.addEventListener('click', () => this.openSettings());
    this.closeSettingsBtn.addEventListener('click', () => this.closeSettings());
    this.closeSettingsFooterBtn.addEventListener('click', () => this.closeSettings());
    this.settingsModal.addEventListener('click', (e) => {
      if (e.target === this.settingsModal) this.closeSettings();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.settingsModal.classList.contains('open')) {
        this.closeSettings();
      }
    });

    // Audio / Soundtrack & Volume Controls
    this.initAudioEvents();

    // Save System Events
    this.btnManualSaveEl?.addEventListener('click', () => {
      this.manualSave();
    });

    this.btnExportSaveEl?.addEventListener('click', () => {
      this.openExportModal();
    });

    this.btnImportSaveEl?.addEventListener('click', () => {
      this.openImportModal();
    });

    this.btnResetSaveEl?.addEventListener('click', () => {
      this.confirmHardReset();
    });

    this.closeSaveDataBtn?.addEventListener('click', () => {
      this.closeSaveDataModal();
    });

    this.btnSaveDataAction?.addEventListener('click', () => {
      this.handleSaveDataAction();
    });

    this.saveDataModal?.addEventListener('click', (e) => {
      if (e.target === this.saveDataModal) this.closeSaveDataModal();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.saveDataModal?.classList.contains('open')) {
        this.closeSaveDataModal();
      }
    });

    window.addEventListener('beforeunload', () => {
      if (!this.isResetting) {
        this.saveProgress();
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && !this.isResetting) {
        this.saveProgress();
      }
    });
  }

  // --- Calculations Delegates ---

  private getGameState(): GameState {
    return {
      faith: this.faithPoints,
      totalFaith: this.totalFaithAccumulated,
      clicks: this.totalClicks,
      followers: this.getTotalFollowersCount(),
      monuments: this.getTotalMonumentsCount(),
      fps: this.getFaithPerSecond(),
      fervor: this.fervorPoints,
      relics: this.relicPoints,
      totalRelics: this.relicPoints
    };
  }

  private getFaithPerClick(): number {
    const clickBuff = calculateClickBuffMultiplier(this.achievements);
    const globalBuff = calculateGlobalBuffMultiplier(this.achievements);
    const fervorClickMult = getFervorUpgradeMultiplier(this.fervorUpgrades[2]);
    const fervorEffectMult = getFervorUpgradeMultiplier(this.fervorUpgrades[1]);
    const fervorFaithBonus = calculateFervorFaithBonus(this.fervorPoints, fervorEffectMult);

    return calculateFaithPerClick(clickBuff, globalBuff, fervorClickMult, fervorFaithBonus);
  }

  private getFaithPerSecond(): number {
    const fervorFollowersMult = getFervorUpgradeMultiplier(this.fervorUpgrades[3]);
    const monumentBuff = calculateMonumentBuffMultiplier(this.achievements);
    const passiveBuff = calculatePassiveBuffMultiplier(this.achievements);
    const globalBuff = calculateGlobalBuffMultiplier(this.achievements);
    const fervorEffectMult = getFervorUpgradeMultiplier(this.fervorUpgrades[1]);
    const fervorFaithBonus = calculateFervorFaithBonus(this.fervorPoints, fervorEffectMult);

    // Relic multipliers: Cornucópia (+20% per level) & Arca da Aliança (scale with relics count)
    const cornucopiaMult = 1 + (this.relicUpgrades[0].level * 0.20);
    const arkMult = calculateRelicFaithMultiplier(this.relicPoints, this.relicUpgrades[5].level);
    const relicFaithMult = cornucopiaMult * arkMult;

    // Incarnation boost: doubles faith per second when active!
    const incarnationBoostMult = this.incarnationBoostTimer > 0 ? 2.0 : 1.0;

    return calculateFaithPerSecond(
      this.followers,
      this.monuments,
      fervorFollowersMult,
      monumentBuff,
      passiveBuff,
      globalBuff,
      fervorFaithBonus,
      relicFaithMult,
      incarnationBoostMult
    );
  }

  private isIncarnationUnlocked(): boolean {
    return this.unlocks.find(u => u.id === 'unlock_incarnation')?.unlocked ?? false;
  }

  private isFervorUpgradesUnlocked(): boolean {
    return this.unlocks.find(u => u.id === 'unlock_fervor_upgrades')?.unlocked ?? false;
  }

  private isRelicsUnlocked(): boolean {
    return this.unlocks.find(u => u.id === 'unlock_relics')?.unlocked ?? false;
  }

  private getIncarnationStageMultiplier(): number {
    const st = INCARNATION_STAGES.find(s => s.stage === this.incarnationStage);
    return st ? st.multiplier : 1;
  }

  private getFervorRatePerSecond(): number {
    if (!this.isIncarnationUnlocked()) {
      return 0;
    }

    let prodMult = getFervorUpgradeMultiplier(this.fervorUpgrades[0]);
    // Tocha de Prometeu (+20% Fervor per level)
    const torchMult = 1 + (this.relicUpgrades[1].level * 0.20);
    prodMult *= torchMult;

    // Incarnation Stage multiplier (Stage 1 is 1x, Stage 2 is 100x, Stage 3 is 10000x)
    prodMult *= this.getIncarnationStageMultiplier();

    let synergyMult = getFervorUpgradeMultiplier(this.fervorUpgrades[4]);
    // Pena Solar de Fênix (1.5x boost on synergy)
    if (this.relicUpgrades[2].level >= 1) {
      synergyMult *= 1.5;
    }
    const hasSynergy = this.fervorUpgrades[4].level > 0;

    return calculateFervorRate(BASE_FERVOR_RATE, prodMult, this.faithPoints, synergyMult, hasSynergy);
  }

  private getRelicsRatePerSecond(): number {
    const extraPerSec = calculateExtraRelicsPerSecond(this.bestRelicsToGet);
    let autoGen = 0;
    if (this.relicUpgrades[4]?.level >= 1) {
      const toGet = calculateRelicsToGet(this.faithPoints);
      autoGen = toGet * 0.05;
    }
    return Math.max(1.0, extraPerSec) + autoGen;
  }

  private getTotalFollowersCount(): number {
    return this.followers.reduce((acc, curr) => acc + curr.count, 0);
  }

  private getTotalMonumentsCount(): number {
    return this.monuments.reduce((acc, curr) => acc + curr.count, 0);
  }

  private getDevoteeBaseMultiplier(): number {
    const caduceusLevel = this.relicUpgrades[3]?.level || 0;
    return Math.max(1.05, 1.10 - (caduceusLevel * 0.005));
  }

  private getItemCost(item: BuyableItem): number {
    const discount = calculateCostDiscountMultiplier(this.achievements);
    const customMult = item.id === 'f_devotee' ? this.getDevoteeBaseMultiplier() : undefined;
    return calculateItemCost(item, discount, customMult);
  }

  // --- Actions ---

  private onSphereClicked(e?: MouseEvent): void {
    this.audio.init();
    const fpc = this.getFaithPerClick();

    this.faithPoints += fpc;
    this.totalFaithAccumulated += fpc;
    this.totalClicks += 1;

    this.updateHUD();
    this.updateStatsTab();
    this.checkAchievements();
    this.updateAchievementsRealtime();
    this.updateItemButtonsState();

    this.audio.playTone(580 + Math.random() * 180, 'sine', 0.08);

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    if (e && e.clientX && e.clientY) {
      x = e.clientX;
      y = e.clientY;
    }
    this.spawnFloatingText(x, y, `+${formatNumber(fpc)} FÉ`);
  }

  private onSatelliteClicked(idx: number, e: MouseEvent): void {
    this.onSphereClicked(e);
    this.audio.playTone(740 + idx * 45, 'triangle', 0.12);
  }

  public grantMiracle(clientX: number, clientY: number): number {
    this.audio.init();

    // Sacred chord chime progression
    this.audio.playTone(523.25, 'sine', 0.14);
    setTimeout(() => this.audio.playTone(659.25, 'sine', 0.16), 60);
    setTimeout(() => this.audio.playTone(783.99, 'sine', 0.2), 120);
    setTimeout(() => this.audio.playTone(1046.50, 'triangle', 0.3), 180);

    const fps = this.getFaithPerSecond();
    const currentFaith = this.faithPoints;

    // Fórmula: 30x a produção por segundo + 10% dos Pontos de Fé atuais
    // Piso de segurança mínimo (ao menos 30 Fé ou 15x o clique) para garantir relevância no início
    const baseFromFps = 30 * fps;
    const bonusFromStockpile = 0.10 * currentFaith;
    const minReward = Math.max(30, this.getFaithPerClick() * 15);
    const calculated = Math.floor(baseFromFps + bonusFromStockpile);
    const finalReward = Math.max(minReward, calculated);

    this.faithPoints += finalReward;
    this.totalFaithAccumulated += finalReward;

    this.spawnFloatingText(clientX, clientY, `MILAGRE! +${formatNumber(finalReward)} FÉ`);

    this.notifications.showCustomPopup(
      'Milagre Concedido!',
      `A prece fervorosa foi atendida: +${formatNumber(finalReward)} Fé cósmica!`,
      '',
      'GRAÇA DIVINA'
    );

    this.updateHUD();
    this.updateStatsTab();
    this.checkAchievements();
    this.updateItemButtonsState();

    return finalReward;
  }

  public unlockSphereSatellite(index: number): void {
    if (index >= 0 && index < 6) {
      this.sphereSatellitesUnlocked[index] = true;
      this.renderSphereSatellites();
      this.audio.playTone(880, 'sine', 0.25);
    }
  }

  public lockSphereSatellite(index: number): void {
    if (index >= 0 && index < 6) {
      this.sphereSatellitesUnlocked[index] = false;
      this.renderSphereSatellites();
    }
  }

  public isSphereSatelliteUnlocked(index: number): boolean {
    return !!this.sphereSatellitesUnlocked[index];
  }

  public renderSphereSatellites(): void {
    const satelliteNodes = document.querySelectorAll<HTMLElement>('.sphere-satellite-node');
    satelliteNodes.forEach((node) => {
      const idxStr = node.getAttribute('data-node-index');
      const idx = idxStr ? parseInt(idxStr, 10) : 0;
      const isUnlocked = !!this.sphereSatellitesUnlocked[idx];
      if (isUnlocked) {
        node.classList.remove('state-locked');
        node.classList.add('state-unlocked');
        node.setAttribute('title', `Santuário Satélite ${this.getRomanNumeral(idx + 1)} (Desbloqueado)`);
      } else {
        node.classList.remove('state-unlocked');
        node.classList.add('state-locked');
        node.setAttribute('title', `Santuário Satélite ${this.getRomanNumeral(idx + 1)} (Oculto / Bloqueado)`);
      }
    });
  }

  private getRomanNumeral(num: number): string {
    const romans = ['I', 'II', 'III', 'IV', 'V', 'VI'];
    return romans[num - 1] || `${num}`;
  }

  // --- Incarnation Boost (2x Fé/seg) Methods ---

  public addIncarnationBoost(seconds: number = 2): void {
    this.incarnationBoostTimer = Math.min(this.MAX_INCARNATION_BOOST, this.incarnationBoostTimer + seconds);
    this.updateIncarnationBoostUI();
    this.updateHUD();
  }

  private updateIncarnationBoostUI(): void {
    const timer = this.incarnationBoostTimer;
    const max = this.MAX_INCARNATION_BOOST;
    const percent = Math.max(0, Math.min(100, (timer / max) * 100));

    if (this.incarnationBoostFillEl) {
      this.incarnationBoostFillEl.style.width = `${percent.toFixed(1)}%`;
    }

    if (this.incarnationBoostTimerTextEl) {
      this.incarnationBoostTimerTextEl.textContent = `${timer.toFixed(1)}s / ${max}s`;
    }

    if (this.incarnationBoostCardEl) {
      this.incarnationBoostCardEl.classList.toggle('active', timer > 0);
    }

    if (this.incarnationBoostBadgeEl) {
      if (timer > 0) {
        this.incarnationBoostBadgeEl.classList.remove('inactive');
        this.incarnationBoostBadgeEl.textContent = '2x FÉ ATIVO';
      } else {
        this.incarnationBoostBadgeEl.classList.add('inactive');
        this.incarnationBoostBadgeEl.textContent = '2x FÉ INATIVO';
      }
    }

    if (this.incarnationBoostStatusEl) {
      if (timer > 0) {
        this.incarnationBoostStatusEl.textContent = 'Bênção ativa! Dobrando produção de Fé/seg';
      } else {
        this.incarnationBoostStatusEl.textContent = 'Clique na Encarnação (+2s) para dobrar Fé/s';
      }
    }
  }

  private buyFervorUpgrade(upg: FervorUpgrade): void {
    const cost = calculateFervorUpgradeCost(upg);
    if (this.fervorPoints >= cost) {
      this.fervorPoints -= cost;
      upg.level += 1;

      this.audio.playTone(720, 'sine', 0.18);
      this.tooltips.hide();
      this.updateHUD();
      this.updateStatsTab();
      this.renderFervorUpgradesList();
    } else {
      this.audio.playTone(180, 'sawtooth', 0.1);
    }
  }

  private buyOneFollower(): void {
    const devotee = this.followers[0];
    if (!devotee) return;
    const cost = this.getItemCost(devotee);
    if (this.faithPoints >= cost) {
      this.faithPoints -= cost;
      devotee.count += 1;

      this.audio.playTone(640, 'triangle', 0.15);
      this.followersArena?.onFollowersAdded(1);
      this.updateHUD();
      this.updateStatsTab();
      this.checkAchievements();
      this.updateAchievementsRealtime();
      this.updateFollowersTab();
    } else {
      this.audio.playTone(180, 'sawtooth', 0.1);
    }
  }

  private buyMaxFollowers(): void {
    const devotee = this.followers[0];
    if (!devotee) return;
    if (this.getTotalFollowersCount() < 25) return;

    const discount = calculateCostDiscountMultiplier(this.achievements);
    const mult = this.getDevoteeBaseMultiplier();
    const { count, totalCost } = calculateMaxAffordableFollowers(devotee, this.faithPoints, discount, mult);

    if (count > 0 && this.faithPoints >= totalCost) {
      this.faithPoints -= totalCost;
      devotee.count += count;

      this.audio.playTone(720, 'triangle', 0.25);
      this.followersArena?.onFollowersAdded(count);
      this.updateHUD();
      this.updateStatsTab();
      this.checkAchievements();
      this.updateAchievementsRealtime();
      this.updateFollowersTab();
      this.spawnFloatingText(
        window.innerWidth / 3,
        window.innerHeight / 2,
        `+${count} FIÉIS!`
      );
    } else {
      this.audio.playTone(180, 'sawtooth', 0.1);
    }
  }

  private updateFollowersTab(): void {
    const devotee = this.followers[0];
    if (!devotee) return;

    const totalCount = this.getTotalFollowersCount();
    const fervorFollowersMult = getFervorUpgradeMultiplier(this.fervorUpgrades[3]);
    const followerOutput = devotee.count * devotee.baseEffect * fervorFollowersMult;

    if (this.followersTotalCountEl) {
      this.followersTotalCountEl.textContent = formatNumber(totalCount);
    }
    if (this.followersRateBadgeEl) {
      this.followersRateBadgeEl.textContent = `+${formatNumber(followerOutput)} PF/s`;
    }
    if (this.convertOneBenefitEl) {
      const perFollower = (devotee.baseEffect * fervorFollowersMult).toFixed(1);
      this.convertOneBenefitEl.textContent = `+${perFollower.endsWith('.0') ? Math.floor(devotee.baseEffect * fervorFollowersMult) : perFollower} Fé/s`;
    }

    const costOne = this.getItemCost(devotee);
    if (this.convertOneCostValEl) {
      this.convertOneCostValEl.textContent = `${formatNumber(costOne)} Fé`;
    }
    if (this.btnConvertOneEl) {
      this.btnConvertOneEl.disabled = this.faithPoints < costOne;
    }

    // Max Button Unlock (At 25 faithful)
    if (this.btnConvertMaxEl && this.convertMaxTitleEl && this.convertMaxSubEl && this.convertMaxCostLabelEl && this.convertMaxCostValEl) {
      if (totalCount < 25) {
        this.btnConvertMaxEl.classList.add('locked');
        this.btnConvertMaxEl.disabled = true;
        this.convertMaxTitleEl.textContent = 'CONVERTER MÁXIMO';
        this.convertMaxSubEl.textContent = `Desbloqueia com 25 Fiéis (${totalCount}/25)`;
        this.convertMaxCostLabelEl.textContent = 'BLOQUEADO';
        this.convertMaxCostValEl.textContent = '';
      } else {
        this.btnConvertMaxEl.classList.remove('locked');
        const discount = calculateCostDiscountMultiplier(this.achievements);
        const mult = this.getDevoteeBaseMultiplier();
        const { count: maxCount, totalCost } = calculateMaxAffordableFollowers(devotee, this.faithPoints, discount, mult);
        const extraRate = maxCount * devotee.baseEffect * fervorFollowersMult;

        if (maxCount > 0) {
          this.btnConvertMaxEl.disabled = false;
          this.convertMaxTitleEl.textContent = `CONVERTER MÁXIMO (+${formatNumber(maxCount)})`;
          this.convertMaxSubEl.textContent = `+${formatNumber(extraRate)} Fé/s`;
          this.convertMaxCostLabelEl.textContent = 'CUSTO:';
          this.convertMaxCostValEl.textContent = `${formatNumber(totalCost)} Fé`;
        } else {
          this.btnConvertMaxEl.disabled = true;
          this.convertMaxTitleEl.textContent = 'CONVERTER MÁXIMO (+0)';
          this.convertMaxSubEl.textContent = '+0 Fé/s';
          this.convertMaxCostLabelEl.textContent = 'CUSTO:';
          this.convertMaxCostValEl.textContent = `${formatNumber(costOne)} Fé`;
        }
      }
    }

    this.followersArena?.syncFollowerCount(totalCount);
  }

  // --- Incarnation Management ---

  private updateIncarnationTab(): void {
    const nextStage = INCARNATION_STAGES.find((s) => s.stage === this.incarnationStage + 1);

    if (this.incarnationStageBadgeEl) {
      this.incarnationStageBadgeEl.textContent = `ESTÁGIO ${this.incarnationStage}`;
    }
    if (this.incarnationTitleEl) {
      this.incarnationTitleEl.textContent = '';
      this.incarnationTitleEl.style.display = 'none';
    }
    if (this.incarnationDescSubEl) {
      this.incarnationDescSubEl.textContent = '';
      this.incarnationDescSubEl.style.display = 'none';
    }
    if (this.incarnationRateBadgeEl) {
      this.incarnationRateBadgeEl.textContent = `+${this.getFervorRatePerSecond().toFixed(1)} Fervor/s`;
    }

    if (this.btnUpgradeIncarnationEl && this.incarnationUpgradeTitleEl && this.incarnationUpgradeCostValEl) {
      if (nextStage) {
        this.incarnationUpgradeTitleEl.textContent = 'EVOLUIR';
        if (this.incarnationUpgradeBenefitEl) {
          this.incarnationUpgradeBenefitEl.textContent = '';
          this.incarnationUpgradeBenefitEl.style.display = 'none';
        }
        this.incarnationUpgradeCostValEl.textContent = `${formatNumber(nextStage.cost)} Fé`;
        this.btnUpgradeIncarnationEl.disabled = this.faithPoints < nextStage.cost;
      } else {
        this.incarnationUpgradeTitleEl.textContent = 'ENCARNAÇÃO MÁXIMA';
        if (this.incarnationUpgradeBenefitEl) {
          this.incarnationUpgradeBenefitEl.textContent = '';
          this.incarnationUpgradeBenefitEl.style.display = 'none';
        }
        this.incarnationUpgradeCostValEl.textContent = 'MÁX';
        this.btnUpgradeIncarnationEl.disabled = true;
      }
    }
  }

  private updateIncarnationUpgradeButtonState(): void {
    if (!this.btnUpgradeIncarnationEl) return;
    const nextStage = INCARNATION_STAGES.find((s) => s.stage === this.incarnationStage + 1);
    if (nextStage) {
      this.btnUpgradeIncarnationEl.disabled = this.faithPoints < nextStage.cost;
    } else {
      this.btnUpgradeIncarnationEl.disabled = true;
    }
  }

  private upgradeIncarnation(): void {
    const nextStage = INCARNATION_STAGES.find((s) => s.stage === this.incarnationStage + 1);
    if (!nextStage || this.faithPoints < nextStage.cost) return;

    this.faithPoints -= nextStage.cost;
    this.incarnationStage += 1;
    this.incarnationArena?.setStage(this.incarnationStage);

    this.audio.playChime();
    this.notifications.showCustomPopup(
      'EVOLUÇÃO SAGRADA',
      `A Encarnação atingiu o ${nextStage.name}! Multiplicador de Fervor: ${nextStage.multiplier}x.`,
      ''
    );

    this.updateIncarnationTab();
    this.updateHUD();
    this.updateItemButtonsState();
  }

  private updateUnlockedTabsAndHUD(): void {
    const incarnationUnlocked = this.isIncarnationUnlocked();
    const fervorUnlocked = this.isFervorUpgradesUnlocked();
    const relicsUnlocked = this.isRelicsUnlocked();

    // Left Panel: Incarnation Tab Button
    if (this.tabBtnIncarnationEl) {
      this.tabBtnIncarnationEl.style.display = incarnationUnlocked ? 'flex' : 'none';
    }

    // Top HUD Bar: Fervor Resource Box & Divider (Always visible in resources HUD)
    if (this.hudFervorItemEl) {
      this.hudFervorItemEl.style.display = 'flex';
    }
    if (this.hudFervorDividerEl) {
      this.hudFervorDividerEl.style.display = 'block';
    }

    // Left Panel: Fervor Tab Button
    if (this.tabBtnFervorEl) {
      this.tabBtnFervorEl.style.display = fervorUnlocked ? 'flex' : 'none';
    }

    // Right Panel: Relics Tab Button
    if (this.tabBtnRelicsEl) {
      this.tabBtnRelicsEl.style.display = relicsUnlocked ? 'flex' : 'none';
    }

    // Top HUD Bar: Relics Resource Box & Divider (Always visible in resources HUD)
    if (this.hudRelicItemEl) {
      this.hudRelicItemEl.style.display = 'flex';
    }
    if (this.hudRelicDividerEl) {
      this.hudRelicDividerEl.style.display = 'block';
    }
  }

  // --- Panels & Tabs Management ---

  private togglePanel(side: 'left' | 'right', open: boolean): void {
    this.audio.init();
    this.audio.playTone(open ? 400 : 320, 'triangle', 0.08);

    const panel = side === 'left' ? this.panelLeft : this.panelRight;
    const expandBtn = side === 'left' ? this.expandLeftBtn : this.expandRightBtn;

    if (open) {
      panel.classList.remove('collapsed');
      expandBtn.classList.remove('visible');
    } else {
      panel.classList.add('collapsed');
      expandBtn.classList.add('visible');
    }
  }

  private switchTab(panel: 'left' | 'right', targetTabId: string, clickedBtn: HTMLButtonElement): void {
    const parentAside = panel === 'left' ? this.panelLeft : this.panelRight;

    parentAside.querySelectorAll<HTMLButtonElement>('.panel-tab-btn').forEach((btn) => {
      btn.classList.remove('active');
    });
    clickedBtn.classList.add('active');

    parentAside.querySelectorAll<HTMLElement>('.tab-pane').forEach((pane) => {
      pane.classList.remove('active');
    });

    const targetPane = document.getElementById(targetTabId);
    if (targetPane) {
      targetPane.classList.add('active');
    }

    if (targetTabId === 'tab-followers') {
      this.updateFollowersTab();
      this.followersArena?.resize();
    }
    if (targetTabId === 'tab-incarnation') {
      this.updateIncarnationTab();
      this.incarnationArena?.resize();
    }
    if (targetTabId === 'tab-relics') {
      this.updateRelicsTab();
    }
  }

  // --- Render Lists ---

  private renderAllLists(): void {
    this.updateFollowersTab();
    this.updateIncarnationTab();
    this.renderFervorUpgradesList();
    this.renderUnlocksList();
    this.renderRelicUpgradesList();
    this.renderAchievementsList();
  }

  private renderFervorUpgradesList(): void {
    this.fervorUpgradesListEl.innerHTML = '';

    this.fervorUpgrades.forEach((upg) => {
      const cost = calculateFervorUpgradeCost(upg);
      const mult = getFervorUpgradeMultiplier(upg);
      const canAfford = this.fervorPoints >= cost;

      const card = document.createElement('div');
      card.className = `cult-action-card fervor-upgrade-card ${canAfford ? '' : 'unaffordable'}`;
      card.id = `card-${upg.id}`;

      const symbolHtml = DISPLAY_CONFIG.showEmojisAndSymbols
        ? `<span class="card-symbol">${upg.icon}</span>`
        : '';

      card.innerHTML = `
        <div class="card-header-row">
          <div class="card-title-group">
            ${symbolHtml}
            <span class="card-name">${upg.name}</span>
          </div>
          <span class="fervor-mult-tag">x${mult.toFixed(2)}</span>
        </div>
        <div class="card-desc">
          <div class="card-benefit" style="color: #94a3b8;">Nível ${upg.level} • Atualmente x${mult.toFixed(2)}</div>
        </div>
        <div class="card-footer-row">
          <div class="cost-tag" style="color: #ef4444; font-weight: 800;">
            <span>CUSTO:</span>
            <span>${formatNumber(cost)} Fervor</span>
          </div>
          <div class="card-click-prompt">
            <span class="card-click-hint">CLIQUE PARA AUMENTAR</span>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        this.buyFervorUpgrade(upg);
      });

      card.addEventListener('mouseenter', (e: MouseEvent) => {
        this.tooltips.showFervorTooltip(upg, cost, mult, e);
      });
      card.addEventListener('mousemove', (e: MouseEvent) => {
        this.tooltips.position(e);
      });
      card.addEventListener('mouseleave', () => {
        this.tooltips.hide();
      });

      this.fervorUpgradesListEl.appendChild(card);
    });
  }

  private renderAchievementsList(): void {
    this.achievementsListEl.innerHTML = '';
    const state = this.getGameState();

    this.achievements.forEach((ach) => {
      const progress = ach.getProgress(state);

      const card = document.createElement('div');
      card.className = `cult-action-card ach-card ${ach.unlocked ? 'unlocked' : 'unaffordable'}`;
      card.id = `ach-card-${ach.id}`;

      const symbolHtml = DISPLAY_CONFIG.showEmojisAndSymbols
        ? `<span class="card-symbol">${ach.icon}</span>`
        : '';

      card.innerHTML = `
        <div class="card-header-row">
          <div class="card-title-group">
            ${symbolHtml}
            <span class="card-name">${ach.name}</span>
          </div>
          <span class="card-count-badge" id="ach-badge-${ach.id}" style="${ach.unlocked ? 'color: #ffffff; border-color: #ffffff;' : ''}">
            ${ach.unlocked ? 'DESBLOQUEADO' : 'BLOQUEADO'}
          </span>
        </div>
        <div class="card-desc">${ach.desc}</div>
        ${!ach.unlocked ? `
          <div class="ach-progress-info" id="ach-prog-info-${ach.id}">
            <span class="ach-progress-label">${progress.label}</span>
            <span class="ach-progress-pct">${Math.round(progress.percent)}%</span>
          </div>
          <div class="ach-progress-container" id="ach-prog-bar-wrap-${ach.id}">
            <div class="ach-progress-bar" id="ach-prog-bar-${ach.id}" style="width: ${progress.percent}%;"></div>
          </div>
        ` : ''}
      `;

      card.addEventListener('mouseenter', (e: MouseEvent) => {
        this.tooltips.showAchievementTooltip(ach, this.getGameState(), e);
      });
      card.addEventListener('mousemove', (e: MouseEvent) => {
        this.tooltips.position(e);
      });
      card.addEventListener('mouseleave', () => {
        this.tooltips.hide();
      });

      this.achievementsListEl.appendChild(card);
    });
  }

  // --- Unlocks System ---

  private getCurrentUnlock(): MechanicUnlock | undefined {
    return this.unlocks.find((u) => {
      if (u.unlocked) return false;
      if (u.prerequisiteId) {
        const prereq = this.unlocks.find((p) => p.id === u.prerequisiteId);
        return prereq?.unlocked ?? false;
      }
      return true;
    });
  }

  private renderUnlocksList(): void {
    this.unlocksListEl.innerHTML = '';

    const currentUnlock = this.getCurrentUnlock();

    if (!currentUnlock) {
      const completedBanner = document.createElement('div');
      completedBanner.className = 'unlocks-completed-banner';
      completedBanner.innerHTML = `
        <div class="completed-icon">✨</div>
        <div class="completed-title">EXPANSÃO CÓSMICA CONCLUÍDA</div>
        <p class="completed-desc">Todas as novas ordens e mecânicas cósmicas foram adquiridas e despertadas.</p>
      `;
      this.unlocksListEl.appendChild(completedBanner);
      return;
    }

    const canAfford = this.faithPoints >= currentUnlock.cost;
    const card = document.createElement('div');
    card.className = `cult-action-card unlock-action-card ${canAfford ? '' : 'unaffordable'}`;
    card.id = `card-${currentUnlock.id}`;

    card.innerHTML = `
      <div class="card-header-row" style="margin-bottom: 0; width: 100%; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
        <span class="card-name" style="font-size: 13px; font-weight: 700; color: #ffffff;">${currentUnlock.name}</span>
        <div class="card-click-prompt">
          <span class="card-click-hint" style="font-size: 11px; padding: 5px 12px; font-weight: 800;">Desbloquear (${formatNumber(currentUnlock.cost)} Fé)</span>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      this.buyUnlock(currentUnlock);
    });

    this.unlocksListEl.appendChild(card);
  }

  private buyUnlock(unlock: MechanicUnlock): void {
    if (unlock.unlocked) return;
    if (this.faithPoints < unlock.cost) {
      this.audio.playTone(180, 'sawtooth', 0.1);
      return;
    }

    this.faithPoints -= unlock.cost;
    unlock.unlocked = true;
    this.tooltips.hide();

    if (unlock.id === 'unlock_incarnation') {
      this.updateUnlockedTabsAndHUD();
      this.updateIncarnationTab();
      this.notifications.showCustomPopup(
        'INCARNATION DESPERTADA',
        'A Encarnação Sagrada foi convocada! O Fervor começou a queimar a +1.0/s.',
        ''
      );
    } else if (unlock.id === 'unlock_fervor_upgrades') {
      this.updateUnlockedTabsAndHUD();
      this.renderFervorUpgradesList();
      this.notifications.showCustomPopup(
        'RITOS DE FERVOR',
        'Os Upgrades de Fervor foram revelados no painel esquerdo!',
        ''
      );
    } else if (unlock.id === 'unlock_relics') {
      this.updateUnlockedTabsAndHUD();
      this.updateRelicsTab();
      this.renderRelicUpgradesList();
      this.notifications.showCustomPopup(
        'NOVA MECÂNICA',
        'A aba de Relíquias sagradas foi despertada no santuário!',
        ''
      );
    }

    this.audio.playChime();
    this.renderUnlocksList();
    this.updateHUD();
    this.updateItemButtonsState();
  }

  // --- Relics (Mythological Alchemy) System ---

  private convertFaithToRelics(): void {
    const toGet = calculateRelicsToGet(this.faithPoints);
    if (this.relicConvertCooldown > 0 || toGet <= 0) return;

    this.relicPoints += toGet;
    if (toGet > this.bestRelicsToGet) {
      this.bestRelicsToGet = toGet;
    }
    this.faithPoints = 0;
    this.relicConvertCooldown = 3;

    this.audio.playChime();
    this.spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2, `+${toGet} RELÍQUIAS!`);
    this.notifications.showCustomPopup('FÉ TRANSMUTADA', `Você consagrou ${toGet} Relíquias sagradas!`, '', 'ALQUIMIA CÓSMICA');

    this.updateHUD();
    this.updateRelicsTab();
    this.renderRelicUpgradesList();
    this.updateItemButtonsState();
  }

  private buyRelicUpgrade(relic: RelicUpgrade): void {
    if (relic.level >= relic.maxLevel) return;
    if (this.relicPoints < relic.cost) {
      this.audio.playTone(180, 'sawtooth', 0.1);
      return;
    }

    this.relicPoints -= relic.cost;
    relic.level += 1;

    this.audio.playTone(740, 'triangle', 0.2);
    this.tooltips.hide();
    this.updateHUD();
    this.updateRelicsTab();
    this.renderRelicUpgradesList();
    this.updateItemButtonsState();
    this.updateFervorButtonsState();
  }

  private renderRelicUpgradesList(): void {
    if (!this.relicUpgradesListEl) return;
    this.relicUpgradesListEl.innerHTML = '';

    this.relicUpgrades.forEach((relic) => {
      const isMax = relic.level >= relic.maxLevel;
      const canAfford = this.relicPoints >= relic.cost;
      const effectDesc = relic.effectText(relic.level, this.relicPoints);

      const card = document.createElement('div');
      card.className = `cult-action-card relic-action-card ${isMax ? 'maxed' : (canAfford ? '' : 'unaffordable')}`;
      card.id = `card-${relic.id}`;

      const symbolHtml = DISPLAY_CONFIG.showEmojisAndSymbols
        ? `<span class="card-symbol">${relic.icon}</span>`
        : '';

      const promptHtml = isMax
        ? `<div class="card-click-prompt">
             <span class="card-status-badge maxed-badge">NÍVEL MÁXIMO</span>
           </div>`
        : `<div class="card-click-prompt">
             <span class="card-click-hint relic-hint">CLIQUE PARA CONSAGRAR</span>
           </div>`;

      card.innerHTML = `
        <div class="card-header-row">
          <div class="card-title-group">
            ${symbolHtml}
            <span class="card-name">${relic.name}</span>
          </div>
          <span class="relic-level-badge ${isMax ? 'maxed' : ''}">(${relic.level}/${relic.maxLevel})</span>
        </div>
        <div class="card-desc">
          <div class="relic-benefit-text">${effectDesc}</div>
        </div>
        <div class="card-footer-row">
          <div class="relic-cost-tag">
            <span>CUSTO:</span>
            <span>${isMax ? 'CONCLUÍDO' : `${formatNumber(relic.cost)} Relíquias`}</span>
          </div>
          ${promptHtml}
        </div>
      `;

      if (!isMax) {
        card.addEventListener('click', () => {
          this.buyRelicUpgrade(relic);
        });
      }

      card.addEventListener('mouseenter', (e: MouseEvent) => {
        this.tooltips.showRelicTooltip(relic, this.relicPoints, e);
      });
      card.addEventListener('mousemove', (e: MouseEvent) => {
        this.tooltips.position(e);
      });
      card.addEventListener('mouseleave', () => {
        this.tooltips.hide();
      });

      this.relicUpgradesListEl!.appendChild(card);
    });
  }

  private updateRelicsTab(): void {
    const toGet = calculateRelicsToGet(this.faithPoints);
    if (this.relicsToGetEl) {
      this.relicsToGetEl.textContent = formatNumber(toGet);
    }
    if (this.relicsConvertCooldownEl) {
      this.relicsConvertCooldownEl.textContent = `${Math.ceil(this.relicConvertCooldown)}`;
    }
    if (this.relicsBalanceValEl) {
      this.relicsBalanceValEl.textContent = formatNumber(this.relicPoints);
    }
    if (this.relicsExtraValEl) {
      const extra = this.getRelicsRatePerSecond();
      this.relicsExtraValEl.textContent = formatNumber(extra);
    }

    if (this.btnConvertRelicsEl) {
      const canConvert = this.relicConvertCooldown <= 0 && toGet > 0;
      this.btnConvertRelicsEl.disabled = !canConvert;
    }

    this.updateRelicButtonsState();
  }

  private updateRelicButtonsState(): void {
    this.relicUpgrades.forEach((relic) => {
      const isMax = relic.level >= relic.maxLevel;
      const canAfford = this.relicPoints >= relic.cost;
      const card = document.getElementById(`card-${relic.id}`);
      if (card) {
        if (isMax) {
          card.classList.remove('unaffordable');
          card.classList.add('maxed');
        } else if (canAfford) {
          card.classList.remove('unaffordable');
        } else {
          card.classList.add('unaffordable');
        }
        const benefitEl = card.querySelector('.relic-benefit-text');
        if (benefitEl && relic.id === 'relic_ark') {
          benefitEl.textContent = relic.effectText(relic.level, this.relicPoints);
        }
      }
    });
  }

  // --- Realtime Achievements Progress Update ---

  private updateAchievementsRealtime(): void {
    const state = this.getGameState();

    for (const ach of this.achievements) {
      const card = document.getElementById(`ach-card-${ach.id}`);
      if (!card) continue;

      const progress = ach.getProgress(state);

      if (ach.unlocked) {
        if (!card.classList.contains('unlocked')) {
          card.classList.add('unlocked');
          card.classList.remove('unaffordable');
          const badge = document.getElementById(`ach-badge-${ach.id}`);
          if (badge) {
            badge.textContent = 'DESBLOQUEADO';
            badge.style.color = '#ffffff';
            badge.style.borderColor = '#ffffff';
          }
          const progInfo = document.getElementById(`ach-prog-info-${ach.id}`);
          if (progInfo) progInfo.remove();
          const progWrap = document.getElementById(`ach-prog-bar-wrap-${ach.id}`);
          if (progWrap) progWrap.remove();
        }
      } else {
        const progInfo = document.getElementById(`ach-prog-info-${ach.id}`);
        if (progInfo) {
          const labelEl = progInfo.querySelector('.ach-progress-label');
          if (labelEl) labelEl.textContent = progress.label;
          const pctEl = progInfo.querySelector('.ach-progress-pct');
          if (pctEl) pctEl.textContent = `${Math.round(progress.percent)}%`;
        }
        const bar = document.getElementById(`ach-prog-bar-${ach.id}`);
        if (bar) {
          bar.style.width = `${progress.percent}%`;
        }
      }
    }

    this.tooltips.updateRealtimeProgress(state);
  }

  private updateItemButtonsState(): void {
    this.updateFollowersTab();
    this.updateIncarnationUpgradeButtonState();
    this.updateUnlocksButtonsState();
    if (this.isRelicsUnlocked()) {
      this.updateRelicsTab();
    }
  }

  private updateUnlocksButtonsState(): void {
    const currentUnlock = this.getCurrentUnlock();
    if (!currentUnlock) return;
    const canAfford = this.faithPoints >= currentUnlock.cost;
    const card = document.getElementById(`card-${currentUnlock.id}`);
    if (card) {
      if (canAfford) {
        card.classList.remove('unaffordable');
      } else {
        card.classList.add('unaffordable');
      }
    }
  }

  private updateFervorButtonsState(): void {
    this.fervorUpgrades.forEach((upg) => {
      const cost = calculateFervorUpgradeCost(upg);
      const card = document.getElementById(`card-${upg.id}`);
      if (card) {
        if (this.fervorPoints >= cost) {
          card.classList.remove('unaffordable');
        } else {
          card.classList.add('unaffordable');
        }
      }
    });
  }

  private checkAchievements(): void {
    const state = this.getGameState();
    let newlyUnlocked = false;

    for (const ach of this.achievements) {
      if (!ach.unlocked && ach.check(state)) {
        ach.unlocked = true;
        newlyUnlocked = true;
        this.notifications.showAchievementPopup(ach);
        this.audio.playTone(880, 'sine', 0.25);
      }
    }

    if (newlyUnlocked) {
      this.renderAchievementsList();
      this.updateStatsTab();
    }
  }

  // --- HUD & Stats Update ---

  private updateHUD(): void {
    const faithInt = Math.floor(this.faithPoints);
    this.faithCounterEl.textContent = formatNumber(faithInt);

    const fps = this.getFaithPerSecond();
    this.faithPerSecCounterEl.textContent = `${formatNumber(fps)}/s${this.incarnationBoostTimer > 0 ? ' (2x)' : ''}`;
    this.faithPerSecCounterEl.classList.toggle('boosted', this.incarnationBoostTimer > 0);

    if (this.followersCounterEl) {
      this.followersCounterEl.textContent = formatNumber(this.getTotalFollowersCount());
    }

    const fpc = this.getFaithPerClick();
    if (this.sphereClickValEl) {
      this.sphereClickValEl.textContent = `+${formatNumber(fpc)} Fé`;
    }

    if (this.fervorCounterEl) {
      this.fervorCounterEl.textContent = formatNumber(Math.floor(this.fervorPoints));
    }
    if (this.fervorRateCounterEl) {
      this.fervorRateCounterEl.textContent = `+${this.getFervorRatePerSecond().toFixed(1)} / seg`;
    }

    if (this.fervorCounterHudEl) {
      this.fervorCounterHudEl.textContent = formatNumber(Math.floor(this.fervorPoints));
    }
    if (this.fervorRateCounterHudEl) {
      this.fervorRateCounterHudEl.textContent = `${this.getFervorRatePerSecond().toFixed(1)}/s`;
    }

    if (this.relicCounterHudEl) {
      this.relicCounterHudEl.textContent = formatNumber(Math.floor(this.relicPoints));
    }
    if (this.relicRateCounterHudEl) {
      const relicRate = this.getRelicsRatePerSecond();
      this.relicRateCounterHudEl.textContent = `${relicRate.toFixed(1)}/s`;
    }
  }

  private updateStatsTab(): void {
    this.statTotalFaithEl.textContent = formatNumber(Math.floor(this.totalFaithAccumulated));
    this.statClickFaithEl.textContent = `+${formatNumber(this.getFaithPerClick())}`;
    this.statPassiveFaithEl.textContent = `+${formatNumber(this.getFaithPerSecond())} / seg${this.incarnationBoostTimer > 0 ? ' (2x Bênção)' : ''}`;
    this.statTotalFollowersEl.textContent = formatNumber(this.getTotalFollowersCount());
    this.statTotalClicksEl.textContent = formatNumber(this.totalClicks);

    if (this.statFervorAccumEl) {
      this.statFervorAccumEl.textContent = formatNumber(Math.floor(this.fervorPoints));
    }
    if (this.statFervorRateEl) {
      this.statFervorRateEl.textContent = `+${this.getFervorRatePerSecond().toFixed(1)} / seg`;
    }

    const unlockedCount = this.achievements.filter((a) => a.unlocked).length;
    this.statAchievementsCountEl.textContent = `${unlockedCount} / ${this.achievements.length}`;

    let tier = 'Círculo Inicial';
    if (this.totalFaithAccumulated >= 1000000) {
      tier = 'Apoteose Universal';
    } else if (this.totalFaithAccumulated >= 100000) {
      tier = 'Ordem do Eclipse';
    } else if (this.totalFaithAccumulated >= 10000) {
      tier = 'Santuário Cósmico';
    } else if (this.totalFaithAccumulated >= 1000) {
      tier = 'Irmandade Mística';
    }
    this.statCultTierEl.textContent = tier;
  }

  // --- Loops & Timers ---

  private startPassiveFaithLoop(): void {
    const tickInterval = 100;
    window.setInterval(() => {
      const deltaSec = tickInterval / 1000;
      const fps = this.getFaithPerSecond();
      if (fps > 0) {
        const gained = fps * deltaSec;
        this.faithPoints += gained;
        this.totalFaithAccumulated += gained;
      }

      const fervorRate = this.getFervorRatePerSecond();
      const fervorGained = fervorRate * deltaSec;
      this.fervorPoints += fervorGained;

      if (this.relicConvertCooldown > 0) {
        this.relicConvertCooldown = Math.max(0, this.relicConvertCooldown - deltaSec);
      }

      const relicRate = this.getRelicsRatePerSecond();
      if (relicRate > 0) {
        this.relicPoints += relicRate * deltaSec;
      }

      // Incarnation 2x Faith Boost Countdown
      if (this.incarnationBoostTimer > 0) {
        this.incarnationBoostTimer = Math.max(0, this.incarnationBoostTimer - deltaSec);
        this.updateIncarnationBoostUI();
      }

      this.updateHUD();
      this.updateStatsTab();
      this.checkAchievements();
      this.updateItemButtonsState();
      this.updateFervorButtonsState();
      this.updateAchievementsRealtime();
    }, tickInterval);
  }

  // --- Visuals ---

  private spawnFloatingText(x: number, y: number, text: string): void {
    const floatEl = document.createElement('div');
    floatEl.className = 'floating-faith-num';
    floatEl.textContent = text;
    floatEl.style.left = `${x}px`;
    floatEl.style.top = `${y}px`;

    document.body.appendChild(floatEl);
    setTimeout(() => {
      floatEl.remove();
    }, 850);
  }

  private switchScreen(screen: 'start' | 'gameplay'): void {
    if (screen === 'gameplay') {
      this.startScreen.classList.remove('active');
      this.gameplayScreen.classList.add('active');
      this.followersArena?.resize();
      this.incarnationArena?.resize();
    } else {
      this.gameplayScreen.classList.remove('active');
      this.startScreen.classList.add('active');
    }
  }

  private openSettings(): void {
    this.updateSaveStatusText();
    if (this.volumeSliderEl) {
      this.volumeSliderEl.value = String(Math.round(this.audio.getVolume() * 100));
    }
    if (this.musicToggleEl) {
      this.musicToggleEl.checked = this.audio.isMusicEnabled();
    }
    if (this.sfxToggleEl) {
      this.sfxToggleEl.checked = this.audio.isSfxEnabled();
    }
    this.settingsModal.classList.add('open');
  }

  private closeSettings(): void {
    this.settingsModal.classList.remove('open');
  }

  private updateMusicUI(): void {
    const isEnabled = this.audio.isMusicEnabled();
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
      this.musicQuickBtnEl.title = isEnabled
        ? 'Trilha Sonora: Ativa (Clique para silenciar)'
        : 'Trilha Sonora: Silenciada (Clique para tocar)';
    }
  }

  private initAudioEvents(): void {
    if (this.volumeSliderEl) {
      this.volumeSliderEl.value = String(Math.round(this.audio.getVolume() * 100));
      this.volumeSliderEl.addEventListener('input', () => {
        const val = parseFloat(this.volumeSliderEl!.value) / 100;
        this.audio.setVolume(val);
      });
    }

    if (this.musicToggleEl) {
      this.musicToggleEl.checked = this.audio.isMusicEnabled();
      this.musicToggleEl.addEventListener('change', () => {
        this.audio.setMusicEnabled(this.musicToggleEl!.checked);
        this.updateMusicUI();
      });
    }

    if (this.sfxToggleEl) {
      this.sfxToggleEl.checked = this.audio.isSfxEnabled();
      this.sfxToggleEl.addEventListener('change', () => {
        this.audio.setSfxEnabled(this.sfxToggleEl!.checked);
      });
    }

    if (this.musicQuickBtnEl) {
      this.musicQuickBtnEl.addEventListener('click', () => {
        this.audio.toggleMusic();
        this.updateMusicUI();
      });
    }

    this.updateMusicUI();

    // Start music on first user gesture anywhere if already inside gameplay
    const triggerAudioOnGesture = () => {
      this.audio.init();
      if (this.audio.isMusicEnabled()) {
        this.audio.playMusic();
      }
      window.removeEventListener('pointerdown', triggerAudioOnGesture);
      window.removeEventListener('keydown', triggerAudioOnGesture);
    };
    window.addEventListener('pointerdown', triggerAudioOnGesture);
    window.addEventListener('keydown', triggerAudioOnGesture);
  }

  // --- Save / Load / Persistence ---

  private buildSaveData(): SaveData {
    return {
      version: SaveSystem.CURRENT_VERSION,
      timestamp: Date.now(),
      stats: {
        faithPoints: this.faithPoints,
        totalFaithAccumulated: this.totalFaithAccumulated,
        totalClicks: this.totalClicks,
        fervorPoints: this.fervorPoints,
        incarnationStage: this.incarnationStage,
        relicPoints: this.relicPoints,
        bestRelicsToGet: this.bestRelicsToGet,
        incarnationBoostTimer: this.incarnationBoostTimer
      },
      followers: this.followers.map((f) => ({ id: f.id, count: f.count })),
      monuments: this.monuments.map((m) => ({ id: m.id, count: m.count })),
      fervorUpgrades: this.fervorUpgrades.map((u) => ({ id: u.id, level: u.level })),
      relicUpgrades: this.relicUpgrades.map((r) => ({ id: r.id, level: r.level })),
      unlocks: this.unlocks.filter((u) => u.unlocked).map((u) => u.id),
      achievements: this.achievements.filter((a) => a.unlocked).map((a) => a.id),
      sphereSatellites: [...this.sphereSatellitesUnlocked]
    };
  }

  private applySaveData(save: SaveData): void {
    if (!save || !save.stats) return;

    // Numeric stats
    this.faithPoints = typeof save.stats.faithPoints === 'number' ? Math.max(0, save.stats.faithPoints) : 1;
    this.totalFaithAccumulated = typeof save.stats.totalFaithAccumulated === 'number' ? Math.max(1, save.stats.totalFaithAccumulated) : 1;
    this.totalClicks = typeof save.stats.totalClicks === 'number' ? Math.max(0, save.stats.totalClicks) : 0;
    this.fervorPoints = typeof save.stats.fervorPoints === 'number' ? Math.max(0, save.stats.fervorPoints) : 0;
    this.incarnationStage = typeof save.stats.incarnationStage === 'number' ? Math.max(1, save.stats.incarnationStage) : 1;
    this.relicPoints = typeof save.stats.relicPoints === 'number' ? Math.max(0, save.stats.relicPoints) : 0;
    this.bestRelicsToGet = typeof save.stats.bestRelicsToGet === 'number' ? Math.max(0, save.stats.bestRelicsToGet) : 0;
    this.incarnationBoostTimer = typeof save.stats.incarnationBoostTimer === 'number'
      ? Math.max(0, Math.min(this.MAX_INCARNATION_BOOST, save.stats.incarnationBoostTimer))
      : 0;
    this.updateIncarnationBoostUI();

    // Followers
    if (Array.isArray(save.followers)) {
      save.followers.forEach((savedItem) => {
        const item = this.followers.find((f) => f.id === savedItem.id);
        if (item && typeof savedItem.count === 'number') {
          item.count = Math.max(0, savedItem.count);
        }
      });
    }

    // Monuments
    if (Array.isArray(save.monuments)) {
      save.monuments.forEach((savedItem) => {
        const item = this.monuments.find((m) => m.id === savedItem.id);
        if (item && typeof savedItem.count === 'number') {
          item.count = Math.max(0, savedItem.count);
        }
      });
    }

    // Fervor Upgrades
    if (Array.isArray(save.fervorUpgrades)) {
      save.fervorUpgrades.forEach((savedItem) => {
        const upg = this.fervorUpgrades.find((u) => u.id === savedItem.id);
        if (upg && typeof savedItem.level === 'number') {
          upg.level = Math.max(0, savedItem.level);
        }
      });
    }

    // Relic Upgrades
    if (Array.isArray(save.relicUpgrades)) {
      save.relicUpgrades.forEach((savedItem) => {
        const rel = this.relicUpgrades.find((r) => r.id === savedItem.id);
        if (rel && typeof savedItem.level === 'number') {
          rel.level = Math.max(0, Math.min(rel.maxLevel, savedItem.level));
        }
      });
    }

    // Unlocks
    if (Array.isArray(save.unlocks)) {
      this.unlocks.forEach((u) => {
        u.unlocked = save.unlocks.includes(u.id);
      });
    }

    // Achievements
    if (Array.isArray(save.achievements)) {
      this.achievements.forEach((a) => {
        a.unlocked = save.achievements.includes(a.id);
      });
    }

    // 6 Sphere Satellite Nodes
    if (Array.isArray(save.sphereSatellites)) {
      for (let i = 0; i < 6; i++) {
        this.sphereSatellitesUnlocked[i] = !!save.sphereSatellites[i];
      }
    } else {
      this.sphereSatellitesUnlocked = [false, false, false, false, false, false];
    }
    this.renderSphereSatellites();
  }

  private saveProgress(): boolean {
    if (this.isResetting) return false;
    const data = this.buildSaveData();
    const success = SaveSystem.save(data);
    if (success) {
      this.lastSaveTime = Date.now();
      this.updateSaveStatusText();
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
      this.updateSaveStatusText();
    } else {
      this.notifications.showCustomPopup('Erro ao Salvar', 'Não foi possível gravar no armazenamento do navegador.', '', 'ALERTA');
    }
  }

  private openExportModal(): void {
    this.saveDataMode = 'export';
    if (this.saveDataModalTitle) this.saveDataModalTitle.textContent = 'Exportar Progresso';
    if (this.saveDataModalDesc) {
      this.saveDataModalDesc.textContent = 'Copie o código abaixo para guardar seu progresso ou transferir para outro navegador:';
    }
    if (this.btnSaveDataAction) {
      this.btnSaveDataAction.textContent = 'Copiar Código';
    }

    const currentData = this.buildSaveData();
    const exportStr = SaveSystem.exportSave(currentData);
    if (this.saveDataTextarea) {
      this.saveDataTextarea.value = exportStr;
      this.saveDataTextarea.readOnly = true;
      this.saveDataTextarea.focus();
      this.saveDataTextarea.select();
    }

    this.saveDataModal?.classList.add('open');
  }

  private openImportModal(): void {
    this.saveDataMode = 'import';
    if (this.saveDataModalTitle) this.saveDataModalTitle.textContent = 'Importar Progresso';
    if (this.saveDataModalDesc) {
      this.saveDataModalDesc.textContent = 'Cole abaixo o código de backup gerado pela opção de Exportar:';
    }
    if (this.btnSaveDataAction) {
      this.btnSaveDataAction.textContent = 'Carregar Save';
    }

    if (this.saveDataTextarea) {
      this.saveDataTextarea.value = '';
      this.saveDataTextarea.readOnly = false;
      this.saveDataTextarea.placeholder = 'Cole o código Base64 do save aqui...';
      this.saveDataTextarea.focus();
    }

    this.saveDataModal?.classList.add('open');
  }

  private closeSaveDataModal(): void {
    this.saveDataModal?.classList.remove('open');
  }

  private handleSaveDataAction(): void {
    if (this.saveDataMode === 'export') {
      if (this.saveDataTextarea) {
        const text = this.saveDataTextarea.value;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(() => {
            this.notifications.showCustomPopup('Save Copiado', 'Chave de backup copiada para a área de transferência.', '', 'EXPORTAÇÃO');
            this.closeSaveDataModal();
          }).catch(() => {
            this.saveDataTextarea?.select();
            document.execCommand('copy');
            this.notifications.showCustomPopup('Save Copiado', 'Chave de backup copiada com sucesso.', '', 'EXPORTAÇÃO');
            this.closeSaveDataModal();
          });
        } else {
          this.saveDataTextarea.select();
          document.execCommand('copy');
          this.notifications.showCustomPopup('Save Copiado', 'Chave de backup copiada com sucesso.', '', 'EXPORTAÇÃO');
          this.closeSaveDataModal();
        }
      }
    } else {
      // Import mode
      const raw = this.saveDataTextarea?.value || '';
      if (!raw.trim()) {
        alert('Por favor, cole um código de save válido.');
        return;
      }

      const imported = SaveSystem.importSave(raw);
      if (!imported) {
        alert('Código de save inválido ou incompatível.');
        return;
      }

      const ok = window.confirm('Deseja substituir o progresso atual pelos dados importados?');
      if (ok) {
        SaveSystem.save(imported);
        this.applySaveData(imported);
        if (this.followersArena) {
          this.followersArena.syncFollowerCount(this.getTotalFollowersCount());
        }
        if (this.incarnationArena) {
          this.incarnationArena.setStage(this.incarnationStage);
        }
        this.renderAllLists();
        this.updateUnlockedTabsAndHUD();
        this.updateHUD();
        this.updateStatsTab();
        this.closeSaveDataModal();
        this.notifications.showCustomPopup('Progresso Restaurado', 'Seu culto foi restabelecido a partir do backup.', '', 'IMPORTAÇÃO');
      }
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

  private updateSaveStatusText(): void {
    if (!this.saveStatusTextEl) return;
    const diffSec = Math.floor((Date.now() - this.lastSaveTime) / 1000);
    if (diffSec < 5) {
      this.saveStatusTextEl.textContent = 'Salvo agora mesmo (Auto-save: 20s)';
    } else if (diffSec < 60) {
      this.saveStatusTextEl.textContent = `Salvo há ${diffSec}s (Auto-save: 20s)`;
    } else {
      const min = Math.floor(diffSec / 60);
      this.saveStatusTextEl.textContent = `Salvo há ${min}min (Auto-save: 20s)`;
    }
  }

  private startAutoSaveLoop(): void {
    window.setInterval(() => {
      this.saveProgress();
    }, 20000);
  }
}

// Bootstrap Application
window.addEventListener('DOMContentLoaded', () => {
  new AppManager();
  console.log('Cult of the Sphere - Arquitetura Modular Inicializada.');
});
