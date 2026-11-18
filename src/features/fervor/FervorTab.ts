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

interface FervorCardRefs {
  cardEl: HTMLDivElement;
  hintEl: HTMLElement | null;
  multTagEl: HTMLElement | null;
  costValEl: HTMLElement | null;
}

export class FervorTab {
  private options: FervorTabOptions;
  private renderedStructure = '';
  private automation: AutomationToggle;
  private bulkToggle: AutomationToggle;
  private cardRefs = new Map<string, FervorCardRefs>();

  private listEl: HTMLElement | null = null;
  private resonanceEl: HTMLElement | null = null;
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
    this.resonanceEl = document.getElementById('fervor-resonance');
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

  private computeStructureKey(phoenixUnlocked: boolean): string {
    let key = DISPLAY_CONFIG.showEmojisAndSymbols ? '1' : '0';
    const upgrades = this.options.gameState.fervorUpgrades;
    for (let i = 0; i < upgrades.length; i++) {
      const upg = upgrades[i];
      if (upg.id !== 'fu_relics' || phoenixUnlocked || upg.level > 0) {
        key += `|${upg.id}`;
      }
    }
    return key;
  }

  public renderList(): void {
    this.bulkToggle.update();
    if (!this.listEl) return;
    const phoenixUnlocked = this.options.gameState.isPhoenixRelicUnlocked();
    const structure = this.computeStructureKey(phoenixUnlocked);
    if (structure === this.renderedStructure) {
      this.updateButtonStates();
      return;
    }
    this.renderedStructure = structure;
    this.listEl.innerHTML = '';
    this.cardRefs.clear();

    const fervor = this.options.gameState.fervorPoints;
    const followersCount = this.options.gameState.getTotalFollowersCount();
    const bulkEnabled = this.isBulkEnabled();

    this.options.gameState.fervorUpgrades.forEach((upg, index) => {
      if (upg.id === 'fu_relics' && !phoenixUnlocked && upg.level === 0) {
        return;
      }

      const { count, cost } = this.purchasePreview(upg, bulkEnabled);
      const canAfford = fervor >= cost && (!bulkEnabled || count > 0);

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
          <span class="fervor-mult-tag">${this.multText(upg, count, followersCount)}</span>
        </div>
        <div class="card-footer-row">
          <div class="cost-tag" style="font-weight: 800;">
            <span>CUSTO:</span>
            <span>${formatNumber(cost)} Fervor</span>
          </div>
          <div class="card-click-prompt">
            <span class="card-click-hint">${this.purchaseHint(count, bulkEnabled)}</span>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        const current = this.options.gameState.fervorUpgrades.find(item => item.id === upg.id);
        if (current) this.buyUpgrade(current);
      });

      const costSpanEls = card.querySelectorAll<HTMLElement>('.cost-tag span');
      this.cardRefs.set(upg.id, {
        cardEl: card,
        hintEl: card.querySelector<HTMLElement>('.card-click-hint'),
        multTagEl: card.querySelector<HTMLElement>('.fervor-mult-tag'),
        costValEl: costSpanEls.length >= 2 ? costSpanEls[1] : null,
      });

      this.listEl!.appendChild(card);
    });
  }

  public updateButtonStates(): void {
    const resonance = this.resonanceEl ?? (this.resonanceEl = document.getElementById('fervor-resonance'));
    if (resonance) {
      // Only Gnose nodes make this bonus exceed ×1; before that the line would just be noise.
      const mult = this.options.gameState.getFervorResonanceMultiplier();
      const shouldHide = mult <= 1;
      if (resonance.hidden !== shouldHide) resonance.hidden = shouldHide;
      if (!shouldHide) {
        setText(resonance, `Ressonância da Gnose: seu pico de Fervor rende ×${formatNumber(mult)} Fé`);
      }
    }
    this.automation.update();
    this.bulkToggle.update();
    // The relic autobuyer can restore Phoenix while this card is already visible.
    if (this.options.gameState.isPhoenixRelicUnlocked() && !this.cardRefs.has('fu_relics')) {
      this.renderList();
      return;
    }
    const fervor = this.options.gameState.fervorPoints;
    const followersCount = this.options.gameState.getTotalFollowersCount();
    const bulkEnabled = this.isBulkEnabled();

    const upgrades = this.options.gameState.fervorUpgrades;
    for (let i = 0; i < upgrades.length; i++) {
      const upg = upgrades[i];
      const refs = this.cardRefs.get(upg.id);
      if (!refs) continue;
      const { count, cost } = this.purchasePreview(upg, bulkEnabled);
      setText(refs.hintEl, this.purchaseHint(count, bulkEnabled));
      const affordable = fervor >= cost && (!bulkEnabled || count > 0);
      if (refs.cardEl.classList.contains('unaffordable') === affordable) {
        refs.cardEl.classList.toggle('unaffordable', !affordable);
      }
      if (refs.multTagEl) {
        setText(refs.multTagEl, this.multText(upg, count, followersCount));
      }
      if (refs.costValEl) {
        setText(refs.costValEl, `${formatNumber(cost)} Fervor`);
      }
    }
  }

  /** Current effect and what the next level would give, so the player can judge each Rite. */
  private multText(upg: FervorUpgrade, count: number, followersCount: number): string {
    const game = this.options.gameState;
    const current = game.getFervorUpgradeEffect(upg, followersCount, upg.level);
    const next = game.getFervorUpgradeEffect(upg, followersCount, upg.level + count);
    return `x${formatNumber(current)} → x${formatNumber(next)}`;
  }

  private isBulkEnabled(): boolean {
    return this.options.gameState.bulkFervorEnabled && this.options.gameState.hasGnoseUpgrade('gn_memoria_selos');
  }

  private purchasePreview(upg: FervorUpgrade, bulkEnabled = this.isBulkEnabled()): { count: number; cost: number } {
    const game = this.options.gameState;
    const count = bulkEnabled ? game.getMaxFervorUpgradeCount(upg) : 1;
    const cost = game.getFervorUpgradeBulkCost(upg, Math.max(1, count));
    return { count, cost };
  }

  private purchaseHint(count: number, bulkEnabled = this.isBulkEnabled()): string {
    return bulkEnabled ? `MELHORAR MÁXIMO (${formatNumber(count)})` : 'MELHORAR';
  }

  public setHudVisibility(unlocked: boolean): void {
    setHudSectionVisibility(this.hudDividerEl, this.hudItemEl, unlocked);
  }
}
