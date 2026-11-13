import { getRelicUpgradeBulkCost } from '../../systems/relicCosts.js';
import { RELIC_SHORTCUTS } from '../../ui/GameplayShortcuts.js';
import { ETERNAL_RELIC_COST_GROWTH, ETERNAL_RELIC_FIXED_LEVELS } from '../../config/relics.js';
import { setHudSectionVisibility, setText } from '../../ui/dom.js';
import { AutomationToggle } from '../../ui/AutomationToggle.js';
import { GameStateManager } from '../../core/GameState.js';
import { AudioManager } from '../../systems/audio.js';
import { RelicUpgrade } from '../../types.js';
import { DISPLAY_CONFIG } from '../../config/display.js';
import { formatNumber } from '../../systems/calculations.js';

export interface RelicsTabOptions {
  gameState: GameStateManager;
  audio: AudioManager;
  spawnFloatingText: (x: number, y: number, text: string) => void;
  onRelicsTransmuted?: () => void;
  onUpgradePurchased?: () => void;
}

export class RelicsTab {
  private options: RelicsTabOptions;
  private renderedStructure: string = '';
  private bulkToggle: AutomationToggle;
  private relicAutomation: AutomationToggle;
  private transmutationAutomation: AutomationToggle;

  private hudDividerEl: HTMLElement | null = null;
  private hudItemEl: HTMLElement | null = null;
  private btnConvertRelicsEl: HTMLButtonElement | null = null;
  private relicsToGetEl: HTMLElement | null = null;
  private relicsConvertCooldownEl: HTMLElement | null = null;
  private relicsCooldownLineEl: HTMLElement | null = null;
  private relicUpgradesListEl: HTMLElement | null = null;

  constructor(options: RelicsTabOptions) {
    this.options = options;
    this.relicAutomation = new AutomationToggle('auto-relic-upgrades', {
      isUnlocked: () => options.gameState.hasGnoseUpgrade('gn_relic_automation'),
      isEnabled: () => options.gameState.autoRelicUpgradesEnabled,
      setEnabled: enabled => { options.gameState.autoRelicUpgradesEnabled = enabled; },
    });
    this.transmutationAutomation = new AutomationToggle('auto-transmutation', {
      isUnlocked: () => options.gameState.hasGnoseUpgrade('gn_omniscience'),
      isEnabled: () => options.gameState.autoRelicsEnabled,
      setEnabled: enabled => { options.gameState.autoRelicsEnabled = enabled; },
    });
    this.bulkToggle = new AutomationToggle('bulk-relics', {
      isUnlocked: () => options.gameState.hasGnoseUpgrade('gn_memoria_selos'),
      isEnabled: () => options.gameState.bulkRelicsEnabled,
      setEnabled: enabled => {
        options.gameState.bulkRelicsEnabled = enabled;
        this.renderList();
        this.updateButtonStates();
      },
    });
    this.initElements();
    this.bindEvents();
  }

  private initElements(): void {
    this.hudDividerEl = document.getElementById('hud-relic-divider');
    this.hudItemEl = document.getElementById('hud-relic-item');
    this.btnConvertRelicsEl = document.getElementById('btn-convert-relics') as HTMLButtonElement | null;
    this.relicsToGetEl = document.getElementById('relics-to-get');
    this.relicsConvertCooldownEl = document.getElementById('relics-convert-cooldown');
    this.relicsCooldownLineEl = document.getElementById('relics-cooldown-line');
    this.relicUpgradesListEl = document.getElementById('relic-upgrades-list');
  }

  private bindEvents(): void {
    this.btnConvertRelicsEl?.addEventListener('click', () => {
      this.convertFaithToRelics();
    });
  }

  public convertFaithToRelics(): void {
    const result = this.options.gameState.convertFaithToRelics();
    if (result.success && result.gained > 0) {
      this.options.audio.playChime();
      this.options.spawnFloatingText(
        window.innerWidth / 2,
        window.innerHeight / 2,
        `+${formatNumber(result.gained)} FRAGMENTOS!`
      );
      this.updateUI();
      this.renderList();
      this.options.onRelicsTransmuted?.();
    }
  }

  public buyRelicUpgrade(relic: RelicUpgrade, bulk = this.isBulkEnabled()): void {
    const success = bulk ? this.options.gameState.buyMaxRelicUpgrade(relic) > 0 : this.options.gameState.buyRelicUpgrade(relic);
    if (success) {
      this.options.audio.playTone(740, 'triangle', 0.2);
      this.updateUI();
      this.renderList();
      this.options.onUpgradePurchased?.();
    } else {
      this.options.audio.playTone(180, 'sawtooth', 0.1);
    }
  }

  public renderList(): void {
    this.bulkToggle.update();
    if (!this.relicUpgradesListEl) return;
    const structure = JSON.stringify([
      DISPLAY_CONFIG.showEmojisAndSymbols,
      this.options.gameState.hasGnoseUpgrade('gn_keep_relics'),
      this.options.gameState.relicUpgrades.map(r => [r.id, this.options.gameState.getRelicMaxLevel(r)]),
    ]);
    if (structure === this.renderedStructure) {
      this.updateButtonStates();
      return;
    }
    this.renderedStructure = structure;
    const finiteRelicsOpen = this.relicUpgradesListEl.querySelector<HTMLDetailsElement>('.finite-relics')?.open ?? false;
    this.relicUpgradesListEl.innerHTML = '';

    const relicPoints = this.options.gameState.relicPoints;

    // Keep the two eternal relics directly accessible; finite relics remain expandable.
    let finiteRelics: HTMLDetailsElement | null = null;
    if (this.options.gameState.hasGnoseUpgrade('gn_keep_relics')) {
      finiteRelics = document.createElement('details');
      finiteRelics.className = 'finite-relics';
      finiteRelics.open = finiteRelicsOpen;
      const summary = document.createElement('summary');
      summary.textContent = 'Relíquias com limite';
      finiteRelics.appendChild(summary);
    }

    this.options.gameState.relicUpgrades.forEach((relic, index) => {
      const isMax = relic.level >= this.options.gameState.getRelicMaxLevel(relic);
      const { count, cost } = this.purchasePreview(relic);
      const canAfford = relicPoints >= cost && (!this.isBulkEnabled() || count > 0);
      const maxLevel = this.options.gameState.getRelicMaxLevel(relic);
      const effectDesc = relic.effectText(relic.level, Math.max(relicPoints, this.options.gameState.relicPeakThisRun), maxLevel);

      const card = document.createElement('div');
      card.className = `cult-action-card relic-action-card ${isMax ? 'maxed' : (canAfford ? '' : 'unaffordable')}`;
      card.id = `card-${relic.id}`;
      if (RELIC_SHORTCUTS[index]) card.setAttribute('aria-keyshortcuts', RELIC_SHORTCUTS[index].toUpperCase());

      const symbolHtml = DISPLAY_CONFIG.showEmojisAndSymbols
        ? `<span class="card-symbol">${relic.icon}</span>`
        : '';
      const hotkeyHtml = RELIC_SHORTCUTS[index]
        ? `<kbd class="hotkey-badge">${RELIC_SHORTCUTS[index].toUpperCase()}</kbd>`
        : '';

      const promptHtml = isMax
        ? `<div class="card-click-prompt">
             <span class="card-status-badge maxed-badge">NÍVEL MÁXIMO</span>
           </div>`
        : `<div class="card-click-prompt">
             <span class="card-click-hint relic-hint">${this.purchaseHint(count)}</span>
           </div>`;

      card.innerHTML = `
        <div class="card-header-row">
          <div class="card-title-group">
            ${symbolHtml}
            <span class="card-name">${relic.name}</span>
            ${hotkeyHtml}
          </div>
          <span class="relic-level-badge ${isMax ? 'maxed' : ''}">(${formatNumber(relic.level)}/${Number.isFinite(maxLevel) ? maxLevel : '∞'})</span>
        </div>
        <div class="card-desc">
          <div class="relic-benefit-text">${effectDesc}</div>
          ${Number.isFinite(maxLevel) ? '' : `<div>Custo +${Math.round((ETERNAL_RELIC_COST_GROWTH - 1) * 100)}% por nível após o ${ETERNAL_RELIC_FIXED_LEVELS}º.</div>`}
        </div>
        <div class="card-footer-row">
          <div class="relic-cost-tag">
            <span>CUSTO:</span>
            <span>${isMax ? 'CONCLUÍDO' : `${Number.isFinite(cost) ? formatNumber(cost) : '∞'} Fragmentos`}</span>
          </div>
          ${promptHtml}
        </div>
      `;

      card.addEventListener('click', () => {
        const current = this.options.gameState.relicUpgrades.find(item => item.id === relic.id);
        if (current) this.buyRelicUpgrade(current);
      });

      const container = finiteRelics && Number.isFinite(maxLevel) ? finiteRelics : this.relicUpgradesListEl!;
      container.appendChild(card);
    });
    if (finiteRelics) this.relicUpgradesListEl.appendChild(finiteRelics);
  }

  public updateUI(): void {
    this.bulkToggle.update();
    this.relicAutomation.update();
    this.transmutationAutomation.update();
    this.renderList();
    const toGet = this.options.gameState.getRelicsToGet();
    setText(this.relicsToGetEl, formatNumber(toGet));
    const cooldown = this.options.gameState.relicConvertCooldown;
    setText(this.relicsConvertCooldownEl, `${Math.ceil(cooldown)}`);
    if (this.relicsCooldownLineEl) {
      const visibility = cooldown > 0 ? 'visible' : 'hidden';
      if (this.relicsCooldownLineEl.style.visibility !== visibility) {
        this.relicsCooldownLineEl.style.visibility = visibility;
      }
    }

    if (this.btnConvertRelicsEl) {
      const canConvert = this.options.gameState.relicConvertCooldown <= 0 && toGet > 0;
      if (this.btnConvertRelicsEl.disabled !== !canConvert) {
        this.btnConvertRelicsEl.disabled = !canConvert;
      }
    }

  }

  public updateButtonStates(): void {
    const relicPoints = this.options.gameState.relicPoints;
    this.options.gameState.relicUpgrades.forEach((relic) => {
      const isMax = relic.level >= this.options.gameState.getRelicMaxLevel(relic);
      const { count, cost } = this.purchasePreview(relic);
      const canAfford = relicPoints >= cost && (!this.isBulkEnabled() || count > 0);
      const card = document.getElementById(`card-${relic.id}`);
      if (card) {
        const maxLevel = this.options.gameState.getRelicMaxLevel(relic);
        const badge = card.querySelector('.relic-level-badge');
        setText(badge, `(${formatNumber(relic.level)}/${Number.isFinite(maxLevel) ? maxLevel : '∞'})`);
        badge?.classList.toggle('maxed', isMax);
        const prompt = card.querySelector('.card-click-prompt span');
        setText(prompt, isMax ? 'NÍVEL MÁXIMO' : this.purchaseHint(count));
        const promptClass = isMax ? 'card-status-badge maxed-badge' : 'card-click-hint relic-hint';
        if (prompt && prompt.className !== promptClass) prompt.className = promptClass;
        card.classList.toggle('maxed', isMax);
        const costEl = card.querySelector('.relic-cost-tag span:last-child');
        setText(costEl, isMax ? 'CONCLUÍDO' : `${Number.isFinite(cost) ? formatNumber(cost) : '∞'} Fragmentos`);
        if (isMax) {
          if (card.classList.contains('unaffordable')) card.classList.remove('unaffordable');
        } else if (canAfford) {
          if (card.classList.contains('unaffordable')) card.classList.remove('unaffordable');
        } else {
          if (!card.classList.contains('unaffordable')) card.classList.add('unaffordable');
        }
        const benefitEl = card.querySelector('.relic-benefit-text');
        if (benefitEl) {
          setText(benefitEl, relic.effectText(relic.level, Math.max(relicPoints, this.options.gameState.relicPeakThisRun), maxLevel));
        }
      }
    });
  }

  private isBulkEnabled(): boolean {
    return this.options.gameState.bulkRelicsEnabled && this.options.gameState.hasGnoseUpgrade('gn_memoria_selos');
  }

  private purchasePreview(relic: RelicUpgrade): { count: number; cost: number } {
    const game = this.options.gameState;
    const count = this.isBulkEnabled() ? game.getMaxRelicUpgradeCount(relic) : 1;
    return { count, cost: getRelicUpgradeBulkCost(relic, Math.max(1, count)) };
  }

  private purchaseHint(count: number): string {
    return this.isBulkEnabled() ? `RESTAURAR MÁXIMO (${formatNumber(count)})` : 'CLIQUE PARA RESTAURAR';
  }

  public setHudVisibility(unlocked: boolean): void {
    setHudSectionVisibility(this.hudDividerEl, this.hudItemEl, unlocked);
  }
}
