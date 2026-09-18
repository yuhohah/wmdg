// --- App Manager for Cult of the Sphere (Modular Orchestrator) ---

import type { BuyableItem, FervorUpgrade, Achievement, GameState } from './types.js';
import { initialFollowers } from './config/followers.js';
import { initialMonuments } from './config/monuments.js';
import { initialFervorUpgrades, BASE_FERVOR_RATE, getFervorUpgradeMultiplier } from './config/fervor.js';
import { initialAchievements } from './config/achievements.js';
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
  formatNumber
} from './systems/calculations.js';
import { AudioManager } from './systems/audio.js';
import { NotificationManager } from './systems/notifications.js';
import { TooltipManager } from './ui/tooltips.js';
import { loadDisplayConfig, DISPLAY_CONFIG, setTextOnlyMode } from './config/display.js';
import { FollowersArena } from './ui/followersArena.js';

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
  private monumentsListEl: HTMLElement;
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
  private followers: BuyableItem[] = initialFollowers;
  private fervorUpgrades: FervorUpgrade[] = initialFervorUpgrades;
  private monuments: BuyableItem[] = initialMonuments;
  private achievements: Achievement[] = initialAchievements;

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

    this.playBtn = document.getElementById('play-btn') as HTMLButtonElement;
    this.settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;
    this.closeSettingsBtn = document.getElementById('close-settings-btn') as HTMLButtonElement;
    this.closeSettingsFooterBtn = document.getElementById('close-settings-footer-btn') as HTMLButtonElement;

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

    const arenaCanvas = document.getElementById('followers-walk-canvas');
    if (arenaCanvas) {
      this.followersArena = new FollowersArena('followers-walk-canvas');
      this.followersArena.setOnClickCallback((clientX, clientY) => {
        this.audio.playTone(660, 'sine', 0.08);
        this.spawnFloatingText(clientX, clientY, '🙏 ORAÇÃO');
      });
    }

    this.fervorUpgradesListEl = document.getElementById('fervor-upgrades-list')!;
    this.monumentsListEl = document.getElementById('monuments-list')!;
    this.achievementsListEl = document.getElementById('achievements-list')!;

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

    // Instantiate Subsystems
    this.audio = new AudioManager();
    this.notifications = new NotificationManager('achievements-popup-container');
    this.tooltips = new TooltipManager('cult-tooltip');

    loadDisplayConfig();
    document.body.classList.toggle('text-only-mode', DISPLAY_CONFIG.textOnlyMode);

    this.initEvents();
    this.renderAllLists();
    this.startPassiveFaithLoop();
    this.updateHUD();
  }

  private initEvents(): void {
    // Start Game
    this.playBtn.addEventListener('click', () => {
      this.audio.init();
      this.switchScreen('gameplay');
      this.audio.playTone(440, 'sine', 0.1);
    });

    // Sphere Clicks
    this.divineSphereBtn.addEventListener('click', (e: MouseEvent) => {
      this.onSphereClicked(e);
    });

    // Faithful Conversion Buttons
    this.btnConvertOneEl?.addEventListener('click', () => {
      this.buyOneFollower();
    });
    this.btnConvertMaxEl?.addEventListener('click', () => {
      this.buyMaxFollowers();
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

    const textOnlyToggle = document.getElementById('text-only-toggle') as HTMLInputElement | null;
    if (textOnlyToggle) {
      textOnlyToggle.checked = DISPLAY_CONFIG.textOnlyMode;
      textOnlyToggle.addEventListener('change', () => {
        setTextOnlyMode(textOnlyToggle.checked);
        document.body.classList.toggle('text-only-mode', DISPLAY_CONFIG.textOnlyMode);
        this.renderAllLists();
      });
    }
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
      fervor: this.fervorPoints
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

    return calculateFaithPerSecond(
      this.followers,
      this.monuments,
      fervorFollowersMult,
      monumentBuff,
      passiveBuff,
      globalBuff,
      fervorFaithBonus
    );
  }

  private getFervorRatePerSecond(): number {
    const prodMult = getFervorUpgradeMultiplier(this.fervorUpgrades[0]);
    const synergyMult = getFervorUpgradeMultiplier(this.fervorUpgrades[4]);
    const hasSynergy = this.fervorUpgrades[4].level > 0;

    return calculateFervorRate(BASE_FERVOR_RATE, prodMult, this.faithPoints, synergyMult, hasSynergy);
  }

  private getTotalFollowersCount(): number {
    return this.followers.reduce((acc, curr) => acc + curr.count, 0);
  }

  private getTotalMonumentsCount(): number {
    return this.monuments.reduce((acc, curr) => acc + curr.count, 0);
  }

  private getItemCost(item: BuyableItem): number {
    const discount = calculateCostDiscountMultiplier(this.achievements);
    return calculateItemCost(item, discount);
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

  private buyItem(item: BuyableItem): void {
    const cost = this.getItemCost(item);
    if (this.faithPoints >= cost) {
      this.faithPoints -= cost;
      item.count += 1;

      this.audio.playTone(620, 'triangle', 0.15);
      this.updateHUD();
      this.updateStatsTab();
      this.checkAchievements();
      this.updateAchievementsRealtime();
      this.renderAllLists();
    } else {
      this.audio.playTone(180, 'sawtooth', 0.1);
    }
  }

  private buyFervorUpgrade(upg: FervorUpgrade): void {
    const cost = calculateFervorUpgradeCost(upg);
    if (this.fervorPoints >= cost) {
      this.fervorPoints -= cost;
      upg.level += 1;

      this.audio.playTone(720, 'sine', 0.18);
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
    const { count, totalCost } = calculateMaxAffordableFollowers(devotee, this.faithPoints, discount);

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
      this.convertOneBenefitEl.textContent = `+${perFollower.endsWith('.0') ? Math.floor(devotee.baseEffect * fervorFollowersMult) : perFollower} Fé / seg`;
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
        this.convertMaxCostValEl.textContent = '🔒';
      } else {
        this.btnConvertMaxEl.classList.remove('locked');
        const discount = calculateCostDiscountMultiplier(this.achievements);
        const { count: maxCount, totalCost } = calculateMaxAffordableFollowers(devotee, this.faithPoints, discount);

        if (maxCount > 0) {
          this.btnConvertMaxEl.disabled = false;
          this.convertMaxTitleEl.textContent = `CONVERTER MÁXIMO (+${formatNumber(maxCount)})`;
          this.convertMaxSubEl.textContent = 'Comprar todos os fiéis possíveis';
          this.convertMaxCostLabelEl.textContent = 'CUSTO:';
          this.convertMaxCostValEl.textContent = `${formatNumber(totalCost)} Fé`;
        } else {
          this.btnConvertMaxEl.disabled = true;
          this.convertMaxTitleEl.textContent = 'CONVERTER MÁXIMO (+0)';
          this.convertMaxSubEl.textContent = 'Fé insuficiente para novos fiéis';
          this.convertMaxCostLabelEl.textContent = 'CUSTO:';
          this.convertMaxCostValEl.textContent = `${formatNumber(costOne)} Fé`;
        }
      }
    }

    this.followersArena?.syncFollowerCount(totalCount);
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
    }
  }

  // --- Render Lists ---

  private renderAllLists(): void {
    this.updateFollowersTab();
    this.renderFervorUpgradesList();
    this.renderItemList(this.monuments, this.monumentsListEl, false);
    this.renderAchievementsList();
  }

  private renderItemList(items: BuyableItem[], container: HTMLElement, isHeroFollower: boolean): void {
    container.innerHTML = '';

    items.forEach((item) => {
      const cost = this.getItemCost(item);
      const canAfford = this.faithPoints >= cost;

      const card = document.createElement('div');
      card.className = `cult-action-card ${canAfford ? '' : 'unaffordable'}`;
      card.id = `card-${item.id}`;

      let heroPreview = '';
      if (DISPLAY_CONFIG.showCardHeroArts && isHeroFollower && item.artUrl) {
        heroPreview = `
          <div class="card-hero-preview">
            <img src="${item.artUrl}" alt="${item.name}">
          </div>
        `;
      }

      const symbolHtml = DISPLAY_CONFIG.showEmojisAndSymbols
        ? `<span class="card-symbol">${item.symbol}</span>`
        : '';

      card.innerHTML = `
        ${heroPreview}
        <div class="card-header-row">
          <div class="card-title-group">
            ${symbolHtml}
            <span class="card-name">${item.name}</span>
          </div>
          <span class="card-count-badge">x${item.count}</span>
        </div>
        <div class="card-desc">
          ${DISPLAY_CONFIG.showItemDescriptions && item.desc ? `<div class="card-desc-text">${item.desc}</div>` : ''}
          <div class="card-benefit">${item.benefitText}</div>
        </div>
        <div class="card-footer-row">
          <div class="cost-tag">
            <span>CUSTO:</span>
            <span>${formatNumber(cost)} Fé</span>
          </div>
          <button class="btn-buy-card" ${canAfford ? '' : 'disabled'}>
            REUNIR
          </button>
        </div>
      `;

      const buyBtn = card.querySelector('.btn-buy-card') as HTMLButtonElement;
      buyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.buyItem(item);
      });

      card.addEventListener('mouseenter', (e: MouseEvent) => {
        const totalFps = this.getFaithPerSecond();
        const fervorFollowersMult = getFervorUpgradeMultiplier(this.fervorUpgrades[3]);
        const perUnitBuffed = item.id.startsWith('m_')
          ? item.baseEffect * calculateMonumentBuffMultiplier(this.achievements)
          : item.baseEffect * fervorFollowersMult;
        const currentTotalOutput = item.count * perUnitBuffed;
        this.tooltips.showItemTooltip(item, totalFps, cost, currentTotalOutput, e);
      });
      card.addEventListener('mousemove', (e: MouseEvent) => {
        this.tooltips.position(e);
      });
      card.addEventListener('mouseleave', () => {
        this.tooltips.hide();
      });

      container.appendChild(card);
    });
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
          ${upg.desc}
          <div class="card-benefit" style="color: #fca5a5;">Nível ${upg.level} • Atualmente x${mult.toFixed(2)}</div>
        </div>
        <div class="card-footer-row">
          <div class="cost-tag" style="color: #fca5a5;">
            <span>CUSTO:</span>
            <span>${formatNumber(cost)} Fervor</span>
          </div>
          <button class="btn-buy-fervor" ${canAfford ? '' : 'disabled'}>
            AUMENTAR
          </button>
        </div>
      `;

      const buyBtn = card.querySelector('.btn-buy-fervor') as HTMLButtonElement;
      buyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
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
    const updateContainer = (items: BuyableItem[]) => {
      items.forEach((item) => {
        const cost = this.getItemCost(item);
        const card = document.getElementById(`card-${item.id}`);
        if (card) {
          const btn = card.querySelector<HTMLButtonElement>('.btn-buy-card');
          if (btn) btn.disabled = this.faithPoints < cost;
          if (this.faithPoints >= cost) {
            card.classList.remove('unaffordable');
          } else {
            card.classList.add('unaffordable');
          }
        }
      });
    };

    this.updateFollowersTab();
    updateContainer(this.monuments);
  }

  private updateFervorButtonsState(): void {
    this.fervorUpgrades.forEach((upg) => {
      const cost = calculateFervorUpgradeCost(upg);
      const card = document.getElementById(`card-${upg.id}`);
      if (card) {
        const btn = card.querySelector<HTMLButtonElement>('.btn-buy-fervor');
        if (btn) btn.disabled = this.fervorPoints < cost;
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
        this.audio.playTone(784, 'sine', 0.35);
      }
    }

    if (newlyUnlocked) {
      this.updateAchievementsRealtime();
      this.updateHUD();
      this.updateStatsTab();
    }
  }

  // --- HUD & Stats Update ---

  private updateHUD(): void {
    const faithInt = Math.floor(this.faithPoints);
    this.faithCounterEl.textContent = formatNumber(faithInt);

    const fps = this.getFaithPerSecond();
    this.faithPerSecCounterEl.textContent = `${formatNumber(fps)}/s`;

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
  }

  private updateStatsTab(): void {
    this.statTotalFaithEl.textContent = formatNumber(Math.floor(this.totalFaithAccumulated));
    this.statClickFaithEl.textContent = `+${formatNumber(this.getFaithPerClick())}`;
    this.statPassiveFaithEl.textContent = `+${formatNumber(this.getFaithPerSecond())} / seg`;
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
      const fps = this.getFaithPerSecond();
      if (fps > 0) {
        const gained = fps * (tickInterval / 1000);
        this.faithPoints += gained;
        this.totalFaithAccumulated += gained;
      }

      const fervorRate = this.getFervorRatePerSecond();
      const fervorGained = fervorRate * (tickInterval / 1000);
      this.fervorPoints += fervorGained;

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
    } else {
      this.gameplayScreen.classList.remove('active');
      this.startScreen.classList.add('active');
    }
  }

  private openSettings(): void {
    this.settingsModal.classList.add('open');
  }

  private closeSettings(): void {
    this.settingsModal.classList.remove('open');
  }
}

// Bootstrap Application
window.addEventListener('DOMContentLoaded', () => {
  new AppManager();
  console.log('🔮 Cult of the Sphere - Arquitetura Modular Inicializada.');
});
