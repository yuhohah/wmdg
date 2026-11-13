import { FERVOR_SHORTCUTS } from '../../ui/GameplayShortcuts.js';
import { AutomationToggle } from '../../ui/AutomationToggle.js';
import { setHudSectionVisibility, setText } from '../../ui/dom.js';
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
  private renderedStructure = '';
  private automation: AutomationToggle;
  private bulkToggle: AutomationToggle;

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
    this.bulkToggle = new AutomationToggle('bulk-fervor', {
      isUnlocked: () => options.gameState.hasGnoseUpgrade('gn_memoria_selos'),
      isEnabled: () => options.gameState.bulkFervorEnabled,
      setEnabled: enabled => {
        options.gameState.bulkFervorEnabled = enabled;
        this.renderList();
        this.updateButtonStates();
      },
    });
    this.initElements();
  }

  private initElements(): void {
    this.listEl = document.getElementById('fervor-upgrades-list');
    this.hudDividerEl = document.getElementById('hud-fervor-divider');
    this.hudItemEl = document.getElementById('hud-fervor-item');
  }

  public buyUpgrade(upg: FervorUpgrade, bulk = this.isBulkEnabled()): void {
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
    this.bulkToggle.update();
    if (!this.listEl) return;
    const structure = JSON.stringify([
      DISPLAY_CONFIG.showEmojisAndSymbols,
      this.options.gameState.fervorUpgrades.filter(upg => upg.id !== 'fu_relics'
        || this.options.gameState.isPhoenixRelicUnlocked() || upg.level > 0).map(upg => upg.id),
    ]);
    if (structure === this.renderedStructure) {
      this.updateButtonStates();
      return;
    }
    this.renderedStructure = structure;
    this.listEl.innerHTML = '';

    const fervor = this.options.gameState.fervorPoints;
    const phoenixUnlocked = this.options.gameState.isPhoenixRelicUnlocked();

    this.options.gameState.fervorUpgrades.forEach((upg, index) => {
      if (upg.id === 'fu_relics' && !phoenixUnlocked && upg.level === 0) {
        return;
      }

      const { count, cost } = this.purchasePreview(upg);
      const canAfford = fervor >= cost && (!this.isBulkEnabled() || count > 0);

      const card = document.createElement('div');
      card.className = `cult-action-card fervor-upgrade-card ${canAfford ? '' : 'unaffordable'}`;
      card.id = `card-${upg.id}`;
      if (FERVOR_SHORTCUTS[index]) card.setAttribute('aria-keyshortcuts', FERVOR_SHORTCUTS[index].toUpperCase());

      const symbolHtml = DISPLAY_CONFIG.showEmojisAndSymbols
        ? `<span class="card-symbol">${upg.icon}</span>`
        : '';
      const hotkeyHtml = FERVOR_SHORTCUTS[index]
        ? `<kbd class="hotkey-badge">${FERVOR_SHORTCUTS[index].toUpperCase()}</kbd>`
        : '';

      card.innerHTML = `
        <div class="card-header-row">
          <div class="card-title-group">
            ${symbolHtml}
            <span class="card-name">${upg.name}</span>
            ${hotkeyHtml}
          </div>
          <span class="fervor-mult-tag">${this.multText(upg)}</span>
        </div>
        <div class="card-footer-row">
          <div class="cost-tag" style="font-weight: 800;">
            <span>CUSTO:</span>
            <span>${formatNumber(cost)} Fervor</span>
          </div>
          <div class="card-click-prompt">
            <span class="card-click-hint">${this.purchaseHint(count)}</span>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        const current = this.options.gameState.fervorUpgrades.find(item => item.id === upg.id);
        if (current) this.buyUpgrade(current);
      });

      this.listEl!.appendChild(card);
    });
  }

  public updateButtonStates(): void {
    const resonance = document.getElementById('fervor-resonance');
    if (resonance) {
      // Only Gnose nodes make this bonus exceed ×1; before that the line would just be noise.
      const mult = this.options.gameState.getFervorResonanceMultiplier();
      const shouldHide = mult <= 1;
      if (resonance.hidden !== shouldHide) resonance.hidden = shouldHide;
      setText(resonance, `Ressonância da Gnose: seu pico de Fervor rende ×${formatNumber(mult)} Fé`);
    }
    this.automation.update();
    this.bulkToggle.update();
    // The relic autobuyer can restore Phoenix while this card is already visible.
    if (this.options.gameState.isPhoenixRelicUnlocked() && !document.getElementById('card-fu_relics')) {
      this.renderList();
    }
    const fervor = this.options.gameState.fervorPoints;

    this.options.gameState.fervorUpgrades.forEach((upg) => {
      const { count, cost } = this.purchasePreview(upg);
      const card = document.getElementById(`card-${upg.id}`);
      if (card) {
        setText(card.querySelector('.card-click-hint'), this.purchaseHint(count));
        const affordable = fervor >= cost && (!this.isBulkEnabled() || count > 0);
        if (card.classList.contains('unaffordable') === affordable) {
          card.classList.toggle('unaffordable', !affordable);
        }
        const multTagEl = card.querySelector('.fervor-mult-tag');
        if (multTagEl) {
          setText(multTagEl, this.multText(upg));
        }
        const costSpanEls = card.querySelectorAll('.cost-tag span');
        if (costSpanEls.length >= 2) {
          setText(costSpanEls[1], `${formatNumber(cost)} Fervor`);
        }
      }
    });
  }

  /** Current effect and what the next level would give, so the player can judge each Rite. */
  private multText(upg: FervorUpgrade): string {
    const game = this.options.gameState;
    const count = this.isBulkEnabled() ? game.getMaxFervorUpgradeCount(upg) : 1;
    const next = game.getFervorUpgradeEffect({ ...upg, level: upg.level + count });
    return `x${formatNumber(game.getFervorUpgradeEffect(upg))} → x${formatNumber(next)}`;
  }

  private isBulkEnabled(): boolean {
    return this.options.gameState.bulkFervorEnabled && this.options.gameState.hasGnoseUpgrade('gn_memoria_selos');
  }

  private purchasePreview(upg: FervorUpgrade): { count: number; cost: number } {
    const game = this.options.gameState;
    const count = this.isBulkEnabled() ? game.getMaxFervorUpgradeCount(upg) : 1;
    let cost = 0;
    for (let i = 0; i < Math.max(1, count); i++) {
      cost += game.getFervorUpgradeCost({ ...upg, level: upg.level + i });
    }
    return { count, cost };
  }

  private purchaseHint(count: number): string {
    return this.isBulkEnabled() ? `MELHORAR MÁXIMO (${formatNumber(count)})` : 'MELHORAR';
  }

  public setHudVisibility(unlocked: boolean): void {
    setHudSectionVisibility(this.hudDividerEl, this.hudItemEl, unlocked);
  }
}
