import { GameStateManager } from '../../core/GameState.js';
import { AudioManager } from '../../systems/audio.js';
import { NotificationManager } from '../../systems/notifications.js';
import { INCARNATION_STAGES, BLESSING_SECONDS_PER_PRESS } from '../../config/incarnation.js';
import { formatNumber } from '../../systems/calculations.js';
import { IncarnationAltar } from '../../ui/incarnationAltar.js';
import { events, GameEvents } from '../../core/EventBus.js';

export interface IncarnationTabOptions {
  gameState: GameStateManager;
  audio: AudioManager;
  triggerHaptic: (pattern: number | number[]) => void;
  notifications: NotificationManager;
  spawnFloatingText?: (x: number, y: number, text: string) => void;
  onIncarnationEvolved?: (newStage: number) => void;
}

export class IncarnationTab {
  private options: IncarnationTabOptions;
  public altar: IncarnationAltar | null = null;

  // DOM Elements
  private stageBadgeEl: HTMLElement | null = null;
  private rateBadgeEl: HTMLElement | null = null;
  private btnUpgradeEl: HTMLButtonElement | null = null;
  private upgradeTitleEl: HTMLElement | null = null;
  private upgradeBenefitEl: HTMLElement | null = null;
  private upgradeCostValEl: HTMLElement | null = null;

  // Blessing 2x Elements
  private blessingPanelEl: HTMLElement | null = null;
  private blessingStatusEl: HTMLElement | null = null;
  private blessingFillEl: HTMLElement | null = null;

  constructor(options: IncarnationTabOptions) {
    this.options = options;
    this.initElements();
    this.bindEvents();
  }

  private initElements(): void {
    const altarContainer = document.getElementById('incarnation-altar-container');
    if (altarContainer) {
      this.altar = new IncarnationAltar('incarnation-altar-container', {
        triggerHaptic: this.options.triggerHaptic,
        onAltarClick: (e?: MouseEvent) => {
          this.handleAltarClick(e);
        }
      });
      this.altar.setStage(this.options.gameState.incarnationStage, true);
    }

    this.stageBadgeEl = document.getElementById('incarnation-stage-badge');
    this.rateBadgeEl = document.getElementById('incarnation-rate-badge');
    this.btnUpgradeEl = document.getElementById('btn-upgrade-incarnation') as HTMLButtonElement | null;
    this.upgradeTitleEl = document.getElementById('incarnation-upgrade-title');
    this.upgradeBenefitEl = document.getElementById('incarnation-upgrade-benefit');
    this.upgradeCostValEl = document.getElementById('incarnation-cost-val');

    this.blessingPanelEl = document.getElementById('incarnation-blessing-panel');
    this.blessingStatusEl = document.getElementById('incarnation-blessing-status');
    this.blessingFillEl = document.getElementById('incarnation-blessing-fill');
  }

  private bindEvents(): void {
    this.btnUpgradeEl?.addEventListener('click', () => {
      this.upgradeIncarnation();
    });
  }

  public handleAltarClick(e?: MouseEvent): void {
    this.options.audio.playTone(660, 'sine', 0.12);
    this.options.triggerHaptic(12);

    this.options.gameState.addIncarnationBoost(BLESSING_SECONDS_PER_PRESS);
    events.emit(GameEvents.STATE_CHANGED);

    let clientX = e?.clientX;
    let clientY = e?.clientY;
    if (!clientX || !clientY) {
      const rect = document.getElementById('incarnation-altar-container')?.getBoundingClientRect();
      clientX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
      clientY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    }

    if (this.options.spawnFloatingText) {
      this.options.spawnFloatingText(clientX, clientY, `+${BLESSING_SECONDS_PER_PRESS}s BÊNÇÃO 2X!`);
    }

    this.updateBlessingBar();
  }

  public updateBlessingBar(): void {
    if (!this.blessingFillEl || !this.blessingStatusEl) return;
    const boostSec = this.options.gameState.incarnationBoostTimer;
    const maxCap = this.options.gameState.getMaxIncarnationBoost();
    const percent = Math.min(100, Math.max(0, (boostSec / maxCap) * 100));

    this.blessingFillEl.style.width = `${percent.toFixed(1)}%`;

    if (boostSec > 0) {
      this.blessingStatusEl.textContent = `✦ 2× FÉ ATIVO · ${Math.ceil(boostSec)}s / ${maxCap}s`;
      this.blessingPanelEl?.classList.add('active');
    } else {
      this.blessingStatusEl.textContent = 'INATIVA (Clique no Altar para +2s)';
      this.blessingPanelEl?.classList.remove('active');
    }
  }

  public upgradeIncarnation(): void {
    const nextStage = INCARNATION_STAGES.find((s) => s.stage === this.options.gameState.incarnationStage + 1);
    if (!nextStage) return;

    const success = this.options.gameState.upgradeIncarnation();
    if (success) {
      this.options.triggerHaptic([20, 30, 40]);
      this.options.audio.playChime();
      this.altar?.evolveToStage(nextStage.stage);
      this.options.notifications.showCustomPopup(
        'A ENCARNAÇÃO RENASCE',
        `A Encarnação renasceu como ${nextStage.name}! Fervor/s multiplicado por ${formatNumber(nextStage.multiplier)}x.`,
        'crown',
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

    this.altar?.setStage(stage);

    if (this.stageBadgeEl) {
      const stageName = currentStage ? currentStage.name.toUpperCase() : `ESTÁGIO ${stage}`;
      const multText = currentStage ? ` (${formatNumber(currentStage.multiplier)}x)` : '';
      this.stageBadgeEl.textContent = `ESTÁGIO ${stage}: ${stageName}${multText}`;
    }
    if (this.rateBadgeEl) {
      const incFollowerMult = this.options.gameState.getEffectiveIncarnationFollowerMultiplier();
      this.rateBadgeEl.textContent = `x${incFollowerMult.toFixed(2)}`;
    }

    if (this.btnUpgradeEl && this.upgradeTitleEl && this.upgradeCostValEl) {
      if (nextStage) {
        const stageCost = this.options.gameState.getIncarnationStageCost(nextStage);
        this.upgradeTitleEl.textContent = 'EVOLUIR';
        if (this.upgradeBenefitEl) {
          this.upgradeBenefitEl.textContent = `${formatNumber(nextStage.multiplier)}x Fervor/s`;
          this.upgradeBenefitEl.style.display = 'block';
        }
        this.upgradeCostValEl.textContent = `${formatNumber(stageCost)} Fé`;
        this.btnUpgradeEl.disabled = this.options.gameState.faithPoints < stageCost;
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

    this.updateBlessingBar();
  }

  public updateUpgradeButtonState(): void {
    if (!this.btnUpgradeEl) return;
    const nextStage = INCARNATION_STAGES.find((s) => s.stage === this.options.gameState.incarnationStage + 1);
    if (nextStage) {
      const stageCost = this.options.gameState.getIncarnationStageCost(nextStage);
      this.btnUpgradeEl.disabled = this.options.gameState.faithPoints < stageCost;
    }
  }

  public updateRealtime(): void {
    if (this.rateBadgeEl) {
      const incFollowerMult = this.options.gameState.getEffectiveIncarnationFollowerMultiplier();
      this.rateBadgeEl.textContent = `x${incFollowerMult.toFixed(2)}`;
    }
    this.updateUpgradeButtonState();
    this.updateBlessingBar();
  }
}
