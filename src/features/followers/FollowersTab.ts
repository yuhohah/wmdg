import { GameStateManager } from '../../core/GameState.js';
import { AudioManager } from '../../systems/audio.js';
import { TooltipManager } from '../../ui/tooltips.js';
import { FollowersArena } from '../../ui/followersArena.js';
import {
  formatNumber,
  calculateCostDiscountMultiplier,
  calculateMaxAffordableFollowers,
  calculateIncarnationFollowerMultiplier
} from '../../systems/calculations.js';
import { getFervorUpgradeMultiplier } from '../../config/fervor.js';

export interface FollowersTabOptions {
  gameState: GameStateManager;
  audio: AudioManager;
  tooltips: TooltipManager;
  triggerHaptic: (pattern: number | number[]) => void;
  spawnFloatingText: (x: number, y: number, text: string) => void;
  onFollowersChanged?: () => void;
  grantMiracle: (clientX: number, clientY: number) => number;
}

export class FollowersTab {
  private options: FollowersTabOptions;
  private arena: FollowersArena | null = null;

  private totalCountEl: HTMLElement | null = null;
  private rateBadgeEl: HTMLElement | null = null;
  private btnConvertOneEl: HTMLButtonElement | null = null;
  private convertOneCostValEl: HTMLElement | null = null;
  private convertOneBenefitEl: HTMLElement | null = null;
  private btnConvertMaxEl: HTMLButtonElement | null = null;
  private convertMaxTitleEl: HTMLElement | null = null;
  private convertMaxSubEl: HTMLElement | null = null;
  private convertMaxCostLabelEl: HTMLElement | null = null;
  private convertMaxCostValEl: HTMLElement | null = null;

  constructor(options: FollowersTabOptions) {
    this.options = options;
    this.initElements();
    this.bindEvents();
  }

  private initElements(): void {
    const canvas = document.getElementById('followers-walk-canvas') as HTMLCanvasElement | null;
    if (canvas) {
      this.arena = new FollowersArena('followers-walk-canvas');
      this.arena.setOnClickCallback((_clientX, _clientY) => {
        this.options.audio.init();
        this.options.triggerHaptic(6);
        this.options.audio.playTone(480, 'triangle', 0.08);
      });
      this.arena.setOnMiracleClickCallback((clientX, clientY) => {
        this.options.grantMiracle(clientX, clientY);
      });
    }

    this.totalCountEl = document.getElementById('followers-total-count');
    this.rateBadgeEl = document.getElementById('followers-rate-badge');
    this.btnConvertOneEl = document.getElementById('btn-convert-one') as HTMLButtonElement | null;
    this.convertOneCostValEl = document.getElementById('convert-one-cost-val');
    this.convertOneBenefitEl = document.getElementById('convert-one-benefit');
    this.btnConvertMaxEl = document.getElementById('btn-convert-max') as HTMLButtonElement | null;
    this.convertMaxTitleEl = document.getElementById('convert-max-title');
    this.convertMaxSubEl = document.getElementById('convert-max-sub');
    this.convertMaxCostLabelEl = document.getElementById('convert-max-cost-label');
    this.convertMaxCostValEl = document.getElementById('convert-max-cost-val');
  }

  private bindEvents(): void {
    this.btnConvertOneEl?.addEventListener('click', () => {
      this.buyOneFollower();
    });

    this.btnConvertMaxEl?.addEventListener('click', () => {
      this.buyMaxFollowers();
    });
  }

  public buyOneFollower(): void {
    const devotee = this.options.gameState.followers[0];
    if (!devotee) return;

    const success = this.options.gameState.buyOneFollower(0);
    if (success) {
      this.options.triggerHaptic(12);
      this.options.audio.playTone(640, 'triangle', 0.15);
      this.arena?.onFollowersAdded(1);
      this.updateUI();
      this.options.onFollowersChanged?.();
    } else {
      this.options.audio.playTone(180, 'sawtooth', 0.1);
    }
  }

  public buyMaxFollowers(): void {
    const devotee = this.options.gameState.followers[0];
    if (!devotee) return;
    if (this.options.gameState.getTotalFollowersCount() < 25) return;

    const result = this.options.gameState.buyMaxFollowers(0);
    if (result.success && result.count > 0) {
      this.options.triggerHaptic([15, 20, 25]);
      this.options.audio.playTone(720, 'triangle', 0.25);
      this.arena?.onFollowersAdded(result.count);
      this.updateUI();
      this.options.spawnFloatingText(
        window.innerWidth / 3,
        window.innerHeight / 2,
        `+${result.count} FIÉIS!`
      );
      this.options.onFollowersChanged?.();
    } else {
      this.options.audio.playTone(180, 'sawtooth', 0.1);
    }
  }

  public updateUI(): void {
    const devotee = this.options.gameState.followers[0];
    if (!devotee) return;

    const totalCount = this.options.gameState.getTotalFollowersCount();
    const fervorFollowersMult = getFervorUpgradeMultiplier(
      this.options.gameState.fervorUpgrades[3],
      totalCount
    );
    const incFollowerMult = calculateIncarnationFollowerMultiplier(
      this.options.gameState.fervorPoints,
      this.options.gameState.incarnationStage
    );
    const followerOutput = devotee.count * devotee.baseEffect * fervorFollowersMult * incFollowerMult;

    if (this.totalCountEl) {
      this.totalCountEl.textContent = formatNumber(totalCount);
    }
    if (this.rateBadgeEl) {
      this.rateBadgeEl.textContent = `+${formatNumber(followerOutput)} PF/s`;
    }
    if (this.convertOneBenefitEl) {
      const ratePerFollower = devotee.baseEffect * fervorFollowersMult * incFollowerMult;
      const perFollower = ratePerFollower.toFixed(1);
      this.convertOneBenefitEl.textContent = `+${perFollower.endsWith('.0') ? Math.floor(ratePerFollower) : perFollower} Fé/s`;
    }

    const costOne = this.options.gameState.getItemCost(devotee);
    if (this.convertOneCostValEl) {
      this.convertOneCostValEl.textContent = `${formatNumber(costOne)} Fé`;
    }
    if (this.btnConvertOneEl) {
      this.btnConvertOneEl.disabled = this.options.gameState.faithPoints < costOne;
    }

    // Max Button Unlock (At 25 faithful)
    if (
      this.btnConvertMaxEl &&
      this.convertMaxTitleEl &&
      this.convertMaxSubEl &&
      this.convertMaxCostLabelEl &&
      this.convertMaxCostValEl
    ) {
      if (totalCount < 25) {
        this.btnConvertMaxEl.classList.add('locked');
        this.btnConvertMaxEl.disabled = true;
        this.convertMaxTitleEl.textContent = 'CONVERTER MÁXIMO';
        this.convertMaxSubEl.textContent = `Desbloqueia com 25 Fiéis (${totalCount}/25)`;
        this.convertMaxCostLabelEl.textContent = 'BLOQUEADO';
        this.convertMaxCostValEl.textContent = '';
      } else {
        this.btnConvertMaxEl.classList.remove('locked');
        const discount = calculateCostDiscountMultiplier(this.options.gameState.achievements);
        const mult = this.options.gameState.getDevoteeBaseMultiplier();
        const { count: maxCount, totalCost } = calculateMaxAffordableFollowers(
          devotee,
          this.options.gameState.faithPoints,
          discount,
          mult
        );
        const extraRate = maxCount * devotee.baseEffect * fervorFollowersMult * incFollowerMult;

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

    this.arena?.syncFollowerCount(totalCount);
  }

  public updateRealtime(): void {
    const devotee = this.options.gameState.followers[0];
    if (!devotee) return;
    const fervorFollowersMult = getFervorUpgradeMultiplier(
      this.options.gameState.fervorUpgrades[3],
      this.options.gameState.getTotalFollowersCount()
    );
    const incFollowerMult = calculateIncarnationFollowerMultiplier(
      this.options.gameState.fervorPoints,
      this.options.gameState.incarnationStage
    );
    const followerOutput = devotee.count * devotee.baseEffect * fervorFollowersMult * incFollowerMult;

    if (this.rateBadgeEl) {
      this.rateBadgeEl.textContent = `+${formatNumber(followerOutput)} PF/s`;
    }
    if (this.convertOneBenefitEl) {
      const ratePerFollower = devotee.baseEffect * fervorFollowersMult * incFollowerMult;
      const perFollower = ratePerFollower.toFixed(1);
      this.convertOneBenefitEl.textContent = `+${perFollower.endsWith('.0') ? Math.floor(ratePerFollower) : perFollower} Fé/s`;
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

  public syncFollowerCount(count: number): void {
    this.arena?.syncFollowerCount(count);
  }

  public onFollowersAdded(count: number): void {
    this.arena?.onFollowersAdded(count);
  }

  public triggerMiraclePlea(): void {
    this.arena?.triggerMiraclePlea();
  }
}
