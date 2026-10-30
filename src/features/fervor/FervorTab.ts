import { AutomationToggle } from '../../ui/AutomationToggle.js';
import { setText } from '../../ui/dom.js';
import { GameStateManager } from '../../core/GameState.js';
import { AudioManager } from '../../systems/audio.js';
import { FervorUpgrade } from '../../types.js';
import { DISPLAY_CONFIG } from '../../config/display.js';
import { formatNumber } from '../../systems/calculations.js';

export interface FervorTabOptions {
  gameState: GameStateManager;
  audio: AudioManager;
  triggerHaptic: (pattern: number | number[]) => void;
  onUpgradePurchased?: () => void;
}

export class FervorTab {
  private options: FervorTabOptions;
  private automation: AutomationToggle;

  private listEl: HTMLElement | null = null;
  private hudDividerEl: HTMLElement | null = null;
  private hudItemEl: HTMLElement | null = null;

  constructor(options: FervorTabOptions) {
    this.options = options;
    this.automation = new AutomationToggle('auto-fervor', {
      isUnlocked: () => options.gameState.hasGnoseUpgrade('gn_ritual_automation'),
      isEnabled: () => options.gameState.autoFervorEnabled,
      setEnabled: enabled => { options.gameState.autoFervorEnabled = enabled; },
    });
    this.initElements();
  }

  private initElements(): void {
    this.listEl = document.getElementById('fervor-upgrades-list');
    this.hudDividerEl = document.getElementById('hud-fervor-divider');
    this.hudItemEl = document.getElementById('hud-fervor-item');
  }

  public buyUpgrade(upg: FervorUpgrade, bulk = false): void {
    const success = bulk ? this.options.gameState.buyMaxFervorUpgrade(upg) > 0 : this.options.gameState.buyFervorUpgrade(upg);
    if (success) {
      this.options.triggerHaptic(15);
      this.options.audio.playTone(720, 'sine', 0.18);
      this.renderList();
      this.options.onUpgradePurchased?.();
    } else {
      this.options.audio.playTone(180, 'sawtooth', 0.1);
    }
  }

  public renderList(): void {
    if (!this.listEl) return;
    this.listEl.innerHTML = '';

    const fervor = this.options.gameState.fervorPoints;
    const phoenixUnlocked = this.options.gameState.isPhoenixRelicUnlocked();

    this.options.gameState.fervorUpgrades.forEach((upg) => {
      if (upg.id === 'fu_relics' && !phoenixUnlocked && upg.level === 0) {
        return;
      }

      const cost = this.options.gameState.getFervorUpgradeCost(upg);
      const mult = this.options.gameState.getFervorUpgradeEffect(upg);
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
        <div class="card-footer-row">
          <div class="cost-tag" style="font-weight: 800;">
            <span>CUSTO:</span>
            <span>${formatNumber(cost)} Fervor</span>
          </div>
          <div class="card-click-prompt">
            <span class="card-click-hint">CLIQUE PARA AUMENTAR</span>
          </div>
        </div>
      `;

      if (this.options.gameState.hasGnoseUpgrade('gn_memoria_selos')) {
        const bulk = document.createElement('button');
        bulk.className = 'btn-ritual-max'; bulk.textContent = 'Ritualizar máximo';
        bulk.addEventListener('click', event => { event.stopPropagation(); this.buyUpgrade(upg, true); });
        card.appendChild(bulk);
      }

      card.addEventListener('click', () => {
        this.buyUpgrade(upg);
      });

      this.listEl!.appendChild(card);
    });
  }

  public updateButtonStates(): void {
    const resonance = document.getElementById('fervor-resonance');
    if (resonance) setText(resonance, `Ressonância do pico: ×${formatNumber(this.options.gameState.getFervorResonanceMultiplier())} Fé`);
    this.automation.update();
    // The relic autobuyer can restore Phoenix while this card is already visible.
    if (this.options.gameState.isPhoenixRelicUnlocked() && !document.getElementById('card-fu_relics')) {
      this.renderList();
    }
    const fervor = this.options.gameState.fervorPoints;

    this.options.gameState.fervorUpgrades.forEach((upg) => {
      const cost = this.options.gameState.getFervorUpgradeCost(upg);
      const mult = this.options.gameState.getFervorUpgradeEffect(upg);
      const card = document.getElementById(`card-${upg.id}`);
      if (card) {
        if (fervor >= cost) {
          card.classList.remove('unaffordable');
        } else {
          card.classList.add('unaffordable');
        }
        const multTagEl = card.querySelector('.fervor-mult-tag');
        if (multTagEl) {
          setText(multTagEl, `x${mult.toFixed(2)}`);
        }
        const costSpanEls = card.querySelectorAll('.cost-tag span');
        if (costSpanEls.length >= 2) {
          setText(costSpanEls[1], `${formatNumber(cost)} Fervor`);
        }
      }
    });
  }

  public setHudVisibility(unlocked: boolean): void {
    if (this.hudDividerEl) {
      this.hudDividerEl.style.display = unlocked ? 'block' : 'none';
    }
    if (this.hudItemEl) {
      this.hudItemEl.style.display = unlocked ? '' : 'none';
    }
  }
}
