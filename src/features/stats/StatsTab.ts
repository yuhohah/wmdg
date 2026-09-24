import { GameStateManager } from '../../core/GameState.js';
import { formatNumber } from '../../systems/calculations.js';

export interface StatsTabOptions {
  gameState: GameStateManager;
}

export class StatsTab {
  private gameState: GameStateManager;

  private statTotalFaithEl: HTMLElement | null = null;
  private statClickFaithEl: HTMLElement | null = null;
  private statPassiveFaithEl: HTMLElement | null = null;
  private statTotalFollowersEl: HTMLElement | null = null;
  private statTotalClicksEl: HTMLElement | null = null;
  private statFervorAccumEl: HTMLElement | null = null;
  private statFervorRateEl: HTMLElement | null = null;
  private statAchievementsCountEl: HTMLElement | null = null;
  private statCultTierEl: HTMLElement | null = null;

  constructor(options: StatsTabOptions) {
    this.gameState = options.gameState;
    this.initElements();
  }

  private initElements(): void {
    this.statTotalFaithEl = document.getElementById('stat-total-faith');
    this.statClickFaithEl = document.getElementById('stat-click-faith');
    this.statPassiveFaithEl = document.getElementById('stat-passive-faith');
    this.statTotalFollowersEl = document.getElementById('stat-total-followers');
    this.statTotalClicksEl = document.getElementById('stat-total-clicks');
    this.statFervorAccumEl = document.getElementById('stat-fervor-accum');
    this.statFervorRateEl = document.getElementById('stat-fervor-rate');
    this.statAchievementsCountEl = document.getElementById('stat-achievements-count');
    this.statCultTierEl = document.getElementById('stat-cult-tier');
  }

  public updateUI(): void {
    const totalFaith = this.gameState.totalFaithAccumulated;
    const fpc = this.gameState.getFaithPerClick();
    const fps = this.gameState.getFaithPerSecond();
    const followers = this.gameState.getTotalFollowersCount();
    const clicks = this.gameState.totalClicks;
    const fervor = this.gameState.fervorPoints;
    const fervorRate = this.gameState.getFervorRatePerSecond();
    const isBoosted = this.gameState.incarnationBoostTimer > 0;

    if (this.statTotalFaithEl) {
      this.statTotalFaithEl.textContent = formatNumber(Math.floor(totalFaith));
    }
    if (this.statClickFaithEl) {
      this.statClickFaithEl.textContent = `+${formatNumber(fpc)}`;
    }
    if (this.statPassiveFaithEl) {
      this.statPassiveFaithEl.textContent = `+${formatNumber(fps)} / seg${isBoosted ? ' (2x Bênção)' : ''}`;
    }
    if (this.statTotalFollowersEl) {
      this.statTotalFollowersEl.textContent = formatNumber(followers);
    }
    if (this.statTotalClicksEl) {
      this.statTotalClicksEl.textContent = formatNumber(clicks);
    }
    if (this.statFervorAccumEl) {
      this.statFervorAccumEl.textContent = formatNumber(Math.floor(fervor));
    }
    if (this.statFervorRateEl) {
      this.statFervorRateEl.textContent = `+${fervorRate.toFixed(1)} / seg`;
    }

    if (this.statAchievementsCountEl) {
      const unlockedCount = this.gameState.achievements.filter((a) => a.unlocked).length;
      this.statAchievementsCountEl.textContent = `${unlockedCount} / ${this.gameState.achievements.length}`;
    }

    if (this.statCultTierEl) {
      this.statCultTierEl.textContent = this.getCultTier(totalFaith);
    }
  }

  private getCultTier(totalFaith: number): string {
    if (totalFaith >= 1000000) return 'Apoteose Universal';
    if (totalFaith >= 100000) return 'Ordem do Eclipse';
    if (totalFaith >= 10000) return 'Santuário Cósmico';
    if (totalFaith >= 1000) return 'Irmandade Mística';
    return 'Círculo Inicial';
  }
}
