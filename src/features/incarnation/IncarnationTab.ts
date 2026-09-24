import { GameStateManager } from '../../core/GameState.js';
import { AudioManager } from '../../systems/audio.js';
import { NotificationManager } from '../../systems/notifications.js';
import { IncarnationArena } from '../../ui/incarnationArena.js';
import { INCARNATION_STAGES } from '../../config/incarnation.js';
import { formatNumber, calculateIncarnationFollowerMultiplier } from '../../systems/calculations.js';

export interface IncarnationTabOptions {
  gameState: GameStateManager;
  audio: AudioManager;
  triggerHaptic: (pattern: number | number[]) => void;
  spawnFloatingText: (x: number, y: number, text: string) => void;
  notifications: NotificationManager;
  onIncarnationEvolved?: (newStage: number) => void;
  onBoostAdded?: () => void;
}

export class IncarnationTab {
  private options: IncarnationTabOptions;
  private arena: IncarnationArena | null = null;

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

  // Boost Elements
  private boostCardEl: HTMLElement | null = null;
  private boostBadgeEl: HTMLElement | null = null;
  private boostTimerTextEl: HTMLElement | null = null;
  private boostFillEl: HTMLElement | null = null;
  private boostStatusEl: HTMLElement | null = null;

  constructor(options: IncarnationTabOptions) {
    this.options = options;
    this.initElements();
    this.bindEvents();
  }

  private initElements(): void {
    const canvas = document.getElementById('incarnation-canvas') as HTMLCanvasElement | null;
    if (canvas) {
      this.arena = new IncarnationArena('incarnation-canvas');
      this.arena.setOnClickCallback((clientX, clientY) => {
        this.addIncarnationBoost(2, clientX, clientY);
      });
      this.arena.setStage(this.options.gameState.incarnationStage);
    }

    this.tabBtnIncarnationEl = document.getElementById('tab-btn-incarnation');
    this.stageBadgeEl = document.getElementById('incarnation-stage-badge');
    this.titleEl = document.getElementById('incarnation-title');
    this.descSubEl = document.getElementById('incarnation-desc-sub');
    this.rateBadgeEl = document.getElementById('incarnation-rate-badge');
    this.btnUpgradeEl = document.getElementById('btn-upgrade-incarnation') as HTMLButtonElement | null;
    this.upgradeTitleEl = document.getElementById('incarnation-upgrade-title');
    this.upgradeBenefitEl = document.getElementById('incarnation-upgrade-benefit');
    this.upgradeCostValEl = document.getElementById('incarnation-upgrade-cost-val');

    this.boostCardEl = document.getElementById('incarnation-boost-card');
    this.boostBadgeEl = document.getElementById('incarnation-boost-badge');
    this.boostTimerTextEl = document.getElementById('incarnation-boost-timer-text');
    this.boostFillEl = document.getElementById('incarnation-boost-fill');
    this.boostStatusEl = document.getElementById('incarnation-boost-status');
  }

  private bindEvents(): void {
    this.btnUpgradeEl?.addEventListener('click', () => {
      this.upgradeIncarnation();
    });
  }

  public addIncarnationBoost(seconds: number = 2, clientX?: number, clientY?: number): void {
    this.options.audio.init();
    this.options.triggerHaptic(12);
    this.options.audio.playTone(660, 'sine', 0.12);

    this.options.gameState.addIncarnationBoost(seconds);
    this.updateBoostUI();

    const x = clientX !== undefined ? clientX : window.innerWidth / 2;
    const y = clientY !== undefined ? clientY - 30 : window.innerHeight / 2;
    this.options.spawnFloatingText(x, y, `+${seconds}s BÊNÇÃO 2X!`);
    this.options.onBoostAdded?.();
  }

  public upgradeIncarnation(): void {
    const nextStage = INCARNATION_STAGES.find((s) => s.stage === this.options.gameState.incarnationStage + 1);
    if (!nextStage) return;

    const success = this.options.gameState.upgradeIncarnation();
    if (success) {
      this.arena?.setStage(this.options.gameState.incarnationStage);
      this.options.triggerHaptic([20, 30, 40]);
      this.options.audio.playChime();
      this.options.notifications.showCustomPopup(
        'EVOLUÇÃO SAGRADA',
        `A Encarnação atingiu o ${nextStage.name}! Poder sobre os Fiéis ampliado (${nextStage.multiplier}x).`,
        ''
      );
      this.updateUI();
      this.options.onIncarnationEvolved?.(this.options.gameState.incarnationStage);
    }
  }

  public updateUI(): void {
    const stage = this.options.gameState.incarnationStage;
    const nextStage = INCARNATION_STAGES.find((s) => s.stage === stage + 1);

    if (this.stageBadgeEl) {
      this.stageBadgeEl.textContent = `ESTÁGIO ${stage}`;
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
          this.upgradeBenefitEl.textContent = '';
          this.upgradeBenefitEl.style.display = 'none';
        }
        this.upgradeCostValEl.textContent = `${formatNumber(nextStage.cost)} Fé`;
        this.btnUpgradeEl.disabled = this.options.gameState.faithPoints < nextStage.cost;
      } else {
        this.upgradeTitleEl.textContent = 'ENCARNAÇÃO MÁXIMA';
        if (this.upgradeBenefitEl) {
          this.upgradeBenefitEl.textContent = '';
          this.upgradeBenefitEl.style.display = 'none';
        }
        this.upgradeCostValEl.textContent = 'MÁX';
        this.btnUpgradeEl.disabled = true;
      }
    }

    this.updateBoostUI();
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

  public updateBoostUI(): void {
    const timer = this.options.gameState.incarnationBoostTimer;
    const max = this.options.gameState.MAX_INCARNATION_BOOST;
    const percent = Math.max(0, Math.min(100, (timer / max) * 100));

    if (this.boostFillEl) {
      this.boostFillEl.style.width = `${percent.toFixed(1)}%`;
    }
    if (this.boostTimerTextEl) {
      this.boostTimerTextEl.textContent = `${timer.toFixed(1)}s / ${max}s`;
    }
    if (this.boostCardEl) {
      this.boostCardEl.classList.toggle('active', timer > 0);
    }
    if (this.boostBadgeEl) {
      if (timer > 0) {
        this.boostBadgeEl.classList.remove('inactive');
        this.boostBadgeEl.textContent = '2x FÉ ATIVO';
      } else {
        this.boostBadgeEl.classList.add('inactive');
        this.boostBadgeEl.textContent = '2x FÉ INATIVO';
      }
    }
    if (this.boostStatusEl) {
      if (timer > 0) {
        this.boostStatusEl.textContent = 'Bênção ativa! Dobrando produção de Fé/seg';
      } else {
        this.boostStatusEl.textContent = 'Clique na Encarnação (+2s) para dobrar Fé/s';
      }
    }
  }

  public setStage(stage: number): void {
    this.arena?.setStage(stage);
    this.updateUI();
  }

  public setTabVisibility(unlocked: boolean): void {
    if (this.tabBtnIncarnationEl) {
      this.tabBtnIncarnationEl.style.display = unlocked ? 'flex' : 'none';
    }
  }

  public pause(): void {
    this.arena?.pause();
  }

  public resume(): void {
    this.arena?.resume();
  }

  public resize(): void {
    this.arena?.resize();
  }
}
