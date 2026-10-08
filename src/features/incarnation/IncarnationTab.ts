import { GameStateManager } from '../../core/GameState.js';
import { AudioManager } from '../../systems/audio.js';
import { NotificationManager } from '../../systems/notifications.js';
import { INCARNATION_STAGES } from '../../config/incarnation.js';
import { formatNumber, calculateIncarnationFollowerMultiplier } from '../../systems/calculations.js';

export interface IncarnationTabOptions {
  gameState: GameStateManager;
  audio: AudioManager;
  triggerHaptic: (pattern: number | number[]) => void;
  notifications: NotificationManager;
  onIncarnationEvolved?: (newStage: number) => void;
}

export class IncarnationTab {
  private options: IncarnationTabOptions;

  // DOM Elements
  private tabBtnIncarnationEl: HTMLElement | null = null;
  private stageBadgeEl: HTMLElement | null = null;
  private titleEl: HTMLElement | null = null;
  private descSubEl: HTMLElement | null = null;
  private rateBadgeEl: HTMLElement | null = null;
  private btnUpgradeEl: HTMLButtonElement | null = null;
  private upgradeTitleEl: HTMLElement | null = null;
  private upgradeBenefitEl: HTMLElement | null = null;
  private upgradeCostValEl: HTMLElement | null = null;

  constructor(options: IncarnationTabOptions) {
    this.options = options;
    this.initElements();
    this.bindEvents();
  }

  private initElements(): void {
    this.tabBtnIncarnationEl = document.getElementById('tab-btn-incarnation');
    this.stageBadgeEl = document.getElementById('incarnation-stage-badge');
    this.titleEl = document.getElementById('incarnation-title');
    this.descSubEl = document.getElementById('incarnation-desc-sub');
    this.rateBadgeEl = document.getElementById('incarnation-rate-badge');
    this.btnUpgradeEl = document.getElementById('btn-upgrade-incarnation') as HTMLButtonElement | null;
    this.upgradeTitleEl = document.getElementById('incarnation-upgrade-title');
    this.upgradeBenefitEl = document.getElementById('incarnation-upgrade-benefit');
    this.upgradeCostValEl = document.getElementById('incarnation-cost-val');
  }

  private bindEvents(): void {
    this.btnUpgradeEl?.addEventListener('click', () => {
      this.upgradeIncarnation();
    });
  }

  public upgradeIncarnation(): void {
    const nextStage = INCARNATION_STAGES.find((s) => s.stage === this.options.gameState.incarnationStage + 1);
    if (!nextStage) return;

    const success = this.options.gameState.upgradeIncarnation();
    if (success) {
      this.options.triggerHaptic([20, 30, 40]);
      this.options.audio.playChime();
      this.options.notifications.showCustomPopup(
        'A ENCARNAÇÃO RENASCE',
        `A Encarnação renasceu como ${nextStage.name}! Fervor/s multiplicado por ${formatNumber(nextStage.multiplier)}x.`,
        '👑',
        'EVOLUÇÃO'
      );
      this.updateUI();
      this.options.onIncarnationEvolved?.(this.options.gameState.incarnationStage);
    }
  }

  public updateUI(): void {
    const stage = this.options.gameState.incarnationStage;
    const currentStage = INCARNATION_STAGES.find((s) => s.stage === stage);
    const nextStage = INCARNATION_STAGES.find((s) => s.stage === stage + 1);

    if (this.stageBadgeEl) {
      const stageName = currentStage ? currentStage.name.toUpperCase() : `ESTÁGIO ${stage}`;
      const multText = currentStage ? ` (${formatNumber(currentStage.multiplier)}x)` : '';
      this.stageBadgeEl.textContent = `ESTÁGIO ${stage}: ${stageName}${multText}`;
    }
    if (this.titleEl) {
      this.titleEl.textContent = '';
      this.titleEl.style.display = 'none';
    }
    if (this.descSubEl) {
      this.descSubEl.textContent = '';
      this.descSubEl.style.display = 'none';
    }
    if (this.rateBadgeEl) {
      const incFollowerMult = calculateIncarnationFollowerMultiplier(
        this.options.gameState.fervorPoints,
        stage
      );
      this.rateBadgeEl.textContent = `x${incFollowerMult.toFixed(2)}`;
    }

    if (this.btnUpgradeEl && this.upgradeTitleEl && this.upgradeCostValEl) {
      if (nextStage) {
        this.upgradeTitleEl.textContent = 'EVOLUIR';
        if (this.upgradeBenefitEl) {
          this.upgradeBenefitEl.textContent = `${formatNumber(nextStage.multiplier)}x Fervor/s`;
          this.upgradeBenefitEl.style.display = 'block';
        }
        this.upgradeCostValEl.textContent = `${formatNumber(nextStage.cost)} Fé`;
        this.btnUpgradeEl.disabled = this.options.gameState.faithPoints < nextStage.cost;
      } else {
        this.upgradeTitleEl.textContent = 'ENCARNAÇÃO MÁXIMA';
        if (this.upgradeBenefitEl) {
          this.upgradeBenefitEl.textContent = 'Ápice Atingido';
          this.upgradeBenefitEl.style.display = 'block';
        }
        this.upgradeCostValEl.textContent = 'MÁX';
        this.btnUpgradeEl.disabled = true;
      }
    }
  }

  public updateUpgradeButtonState(): void {
    if (!this.btnUpgradeEl) return;
    const nextStage = INCARNATION_STAGES.find((s) => s.stage === this.options.gameState.incarnationStage + 1);
    if (nextStage) {
      this.btnUpgradeEl.disabled = this.options.gameState.faithPoints < nextStage.cost;
    }
  }

  public updateRealtime(): void {
    if (this.rateBadgeEl) {
      const incFollowerMult = calculateIncarnationFollowerMultiplier(
        this.options.gameState.fervorPoints,
        this.options.gameState.incarnationStage
      );
      this.rateBadgeEl.textContent = `x${incFollowerMult.toFixed(2)}`;
    }
    this.updateUpgradeButtonState();
  }

  public setTabVisibility(unlocked: boolean): void {
    if (this.tabBtnIncarnationEl) {
      this.tabBtnIncarnationEl.style.display = unlocked ? 'flex' : 'none';
    }
  }
}
