import { GameStateManager } from '../../core/GameState.js';
import { AudioManager } from '../../systems/audio.js';
import { TooltipManager } from '../../ui/tooltips.js';
import { FervorUpgrade } from '../../types.js';
import { DISPLAY_CONFIG } from '../../config/display.js';
import { getFervorUpgradeMultiplier } from '../../config/fervor.js';
import { calculateFervorUpgradeCost, formatNumber } from '../../systems/calculations.js';

export interface FervorTabOptions {
  gameState: GameStateManager;
  audio: AudioManager;
  tooltips: TooltipManager;
  triggerHaptic: (pattern: number | number[]) => void;
  onUpgradePurchased?: () => void;
}

export class FervorTab {
  private options: FervorTabOptions;

  private tabBtnFervorEl: HTMLElement | null = null;
  private listEl: HTMLElement | null = null;
  private hudDividerEl: HTMLElement | null = null;
  private hudItemEl: HTMLElement | null = null;

  constructor(options: FervorTabOptions) {
    this.options = options;
    this.initElements();
  }

  private initElements(): void {
    this.tabBtnFervorEl = document.getElementById('tab-btn-fervor');
    this.listEl = document.getElementById('fervor-upgrades-list');
    this.hudDividerEl = document.getElementById('hud-fervor-divider');
    this.hudItemEl = document.getElementById('hud-fervor-item');
  }

  public buyUpgrade(upg: FervorUpgrade): void {
    const success = this.options.gameState.buyFervorUpgrade(upg);
    if (success) {
      this.options.triggerHaptic(15);
      this.options.audio.playTone(720, 'sine', 0.18);
      this.options.tooltips.hide();
      this.renderList();
      this.options.onUpgradePurchased?.();
    } else {
      this.options.audio.playTone(180, 'sawtooth', 0.1);
    }
  }

  public renderList(): void {
    if (!this.listEl) return;
    this.listEl.innerHTML = '';

    const totalFollowers = this.options.gameState.getTotalFollowersCount();
    const faith = this.options.gameState.faithPoints;
    const fervor = this.options.gameState.fervorPoints;

    this.options.gameState.fervorUpgrades.forEach((upg) => {
      const cost = calculateFervorUpgradeCost(upg);
      const mult = getFervorUpgradeMultiplier(upg, totalFollowers, faith);
      const canAfford = fervor >= cost;

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
        this.buyUpgrade(upg);
      });

      card.addEventListener('mouseenter', (e: MouseEvent) => {
        this.options.tooltips.showFervorTooltip(upg, cost, mult, e);
      });
      card.addEventListener('mousemove', (e: MouseEvent) => {
        this.options.tooltips.position(e);
      });
      card.addEventListener('mouseleave', () => {
        this.options.tooltips.hide();
      });

      this.listEl!.appendChild(card);
    });
  }

  public updateButtonStates(): void {
    const fervor = this.options.gameState.fervorPoints;
    this.options.gameState.fervorUpgrades.forEach((upg) => {
      const cost = calculateFervorUpgradeCost(upg);
      const card = document.getElementById(`card-${upg.id}`);
      if (card) {
        if (fervor >= cost) {
          card.classList.remove('unaffordable');
        } else {
          card.classList.add('unaffordable');
        }
      }
    });
  }

  public setTabVisibility(unlocked: boolean): void {
    if (this.tabBtnFervorEl) {
      this.tabBtnFervorEl.style.display = unlocked ? 'flex' : 'none';
    }
    if (this.hudDividerEl) {
      this.hudDividerEl.style.display = unlocked ? 'block' : 'none';
    }
    if (this.hudItemEl) {
      this.hudItemEl.style.display = unlocked ? 'flex' : 'none';
    }
  }
}
