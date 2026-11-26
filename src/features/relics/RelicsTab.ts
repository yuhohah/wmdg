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

interface RelicCardRefs {
  cardEl: HTMLDivElement;
  badgeEl: HTMLElement | null;
  promptSpanEl: HTMLElement | null;
  costSpanEl: HTMLElement | null;
  benefitEl: HTMLElement | null;
}

export class RelicsTab {
  private options: RelicsTabOptions;
  private renderedStructure: string = '';
  private bulkToggle: AutomationToggle;
  private relicAutomation: AutomationToggle;
  private transmutationAutomation: AutomationToggle;
  private cardRefs = new Map<string, RelicCardRefs>();

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
      isUnlocked: () => options.gameState.hasGnoseUpgrade('gn_ritual_relic_automation'),
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
    this.btnConvertRelicsEl?.addEventListener('click', (e) => {
      if (!e.isTrusted) return;
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

  private finiteRelicsSummaryEl: HTMLElement | null = null;

  private computeStructureKey(foldFiniteRelics: boolean): string {
    let key = `${DISPLAY_CONFIG.showEmojisAndSymbols ? 1 : 0}:${foldFiniteRelics ? 1 : 0}`;
    const relics = this.options.gameState.relicUpgrades;
    for (let i = 0; i < relics.length; i++) {
      const r = relics[i];
      const maxLevel = this.options.gameState.getRelicMaxLevel(r);
      key += `|${r.id}:${Number.isFinite(maxLevel) ? maxLevel : 'inf'}`;
    }
    return key;
  }

  private formatFiniteRelicsSummary(maxedCount: number, totalCount: number): string {
    return `Relíquias com limite (${maxedCount}/${totalCount} no máximo)`;
  }

  public renderList(): void {
    this.bulkToggle.update();
    if (!this.relicUpgradesListEl) return;
    const foldFiniteRelics = this.options.gameState.hasGnoseUpgrade('gn_unlimited_relics');
    const structure = this.computeStructureKey(foldFiniteRelics);
    if (structure === this.renderedStructure) {
      this.updateButtonStates();
      return;
    }
    this.renderedStructure = structure;
    const finiteRelicsOpen = this.relicUpgradesListEl.querySelector<HTMLDetailsElement>('.finite-relics')?.open ?? false;
    this.relicUpgradesListEl.innerHTML = '';
    this.cardRefs.clear();
    this.finiteRelicsSummaryEl = null;

    const relicPoints = this.options.gameState.relicPoints;
    const peakRelics = Math.max(relicPoints, this.options.gameState.relicPeakThisRun);
    const bulkEnabled = this.isBulkEnabled();

    // Keep the two infinite relics directly accessible; fold capped relics into a collapsible section.
    let finiteRelics: HTMLDetailsElement | null = null;
    let finiteRelicsList: HTMLDivElement | null = null;
    if (foldFiniteRelics) {
      finiteRelics = document.createElement('details');
      finiteRelics.className = 'finite-relics';
      finiteRelics.open = finiteRelicsOpen;
      const summary = document.createElement('summary');
      this.finiteRelicsSummaryEl = summary;
      finiteRelicsList = document.createElement('div');
      finiteRelicsList.className = 'finite-relics-list';
      finiteRelics.append(summary, finiteRelicsList);
    }

    let finiteTotal = 0;
    let finiteMaxed = 0;

    this.options.gameState.relicUpgrades.forEach((relic, index) => {
      const maxLevel = this.options.gameState.getRelicMaxLevel(relic);
      const isFinite = Number.isFinite(maxLevel);
      const isMax = relic.level >= maxLevel;
      if (isFinite) {
        finiteTotal++;
        if (isMax) finiteMaxed++;
      }
      const { count, cost } = this.purchasePreview(relic, bulkEnabled);
      const canAfford = relicPoints >= cost && (!bulkEnabled || count > 0);
      const effectDesc = relic.effectText(relic.level, peakRelics, maxLevel);

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
             <span class="card-click-hint relic-hint">${this.purchaseHint(count, bulkEnabled)}</span>
           </div>`;

      card.innerHTML = `
        <div class="card-header-row">
          <div class="card-title-group">
            ${symbolHtml}
            <span class="card-name">${relic.name}</span>
            ${hotkeyHtml}
          </div>
          <span class="relic-level-badge ${isMax ? 'maxed' : ''}">(${formatNumber(relic.level)}/${isFinite ? maxLevel : '∞'})</span>
        </div>
        <div class="card-desc">
          <div class="relic-benefit-text">${effectDesc}</div>
          ${isFinite ? '' : `<div>Custo +${Math.round((ETERNAL_RELIC_COST_GROWTH - 1) * 100)}% por nível após o ${ETERNAL_RELIC_FIXED_LEVELS}º.</div>`}
        </div>
        <div class="card-footer-row">
          <div class="relic-cost-tag">
            <span>CUSTO:</span>
            <span>${isMax ? 'CONCLUÍDO' : `${Number.isFinite(cost) ? formatNumber(cost) : '∞'} Fragmentos`}</span>
          </div>
          ${promptHtml}
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (!e.isTrusted) return;
        const current = this.options.gameState.relicUpgrades.find(item => item.id === relic.id);
        if (current) this.buyRelicUpgrade(current);
      });

      this.cardRefs.set(relic.id, {
        cardEl: card,
        badgeEl: card.querySelector<HTMLElement>('.relic-level-badge'),
        promptSpanEl: card.querySelector<HTMLElement>('.card-click-prompt span'),
        costSpanEl: card.querySelector<HTMLElement>('.relic-cost-tag span:last-child'),
        benefitEl: card.querySelector<HTMLElement>('.relic-benefit-text'),
      });

      const container = finiteRelicsList && isFinite ? finiteRelicsList : this.relicUpgradesListEl!;
      container.appendChild(card);
    });
    if (finiteRelics) {
      setText(this.finiteRelicsSummaryEl, this.formatFiniteRelicsSummary(finiteMaxed, finiteTotal));
      this.relicUpgradesListEl.appendChild(finiteRelics);
    }
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
    const peakRelics = Math.max(relicPoints, this.options.gameState.relicPeakThisRun);
    const bulkEnabled = this.isBulkEnabled();
    const relics = this.options.gameState.relicUpgrades;
    let finiteTotal = 0;
    let finiteMaxed = 0;
    for (let i = 0; i < relics.length; i++) {
      const relic = relics[i];
      const refs = this.cardRefs.get(relic.id);
      if (!refs) continue;
      const maxLevel = this.options.gameState.getRelicMaxLevel(relic);
      const isFinite = Number.isFinite(maxLevel);
      const isMax = relic.level >= maxLevel;
      if (isFinite) {
        finiteTotal++;
        if (isMax) finiteMaxed++;
      }
      const { count, cost } = this.purchasePreview(relic, bulkEnabled);
      const canAfford = relicPoints >= cost && (!bulkEnabled || count > 0);
      const card = refs.cardEl;

      setText(refs.badgeEl, `(${formatNumber(relic.level)}/${isFinite ? maxLevel : '∞'})`);
      if (refs.badgeEl && refs.badgeEl.classList.contains('maxed') !== isMax) {
        refs.badgeEl.classList.toggle('maxed', isMax);
      }
      setText(refs.promptSpanEl, isMax ? 'NÍVEL MÁXIMO' : this.purchaseHint(count, bulkEnabled));
      const promptClass = isMax ? 'card-status-badge maxed-badge' : 'card-click-hint relic-hint';
      if (refs.promptSpanEl && refs.promptSpanEl.className !== promptClass) {
        refs.promptSpanEl.className = promptClass;
      }
      if (card.classList.contains('maxed') !== isMax) {
        card.classList.toggle('maxed', isMax);
      }
      setText(refs.costSpanEl, isMax ? 'CONCLUÍDO' : `${Number.isFinite(cost) ? formatNumber(cost) : '∞'} Fragmentos`);
      const shouldBeUnaffordable = !isMax && !canAfford;
      if (card.classList.contains('unaffordable') !== shouldBeUnaffordable) {
        card.classList.toggle('unaffordable', shouldBeUnaffordable);
      }
      if (refs.benefitEl) {
        setText(refs.benefitEl, relic.effectText(relic.level, peakRelics, maxLevel));
      }
    }
    if (this.finiteRelicsSummaryEl) {
      setText(this.finiteRelicsSummaryEl, this.formatFiniteRelicsSummary(finiteMaxed, finiteTotal));
    }
  }

  private isBulkEnabled(): boolean {
    return this.options.gameState.bulkRelicsEnabled && this.options.gameState.hasGnoseUpgrade('gn_memoria_selos');
  }

  private purchasePreview(relic: RelicUpgrade, bulkEnabled = this.isBulkEnabled()): { count: number; cost: number } {
    const game = this.options.gameState;
    const count = bulkEnabled ? game.getMaxRelicUpgradeCount(relic) : 1;
    return { count, cost: getRelicUpgradeBulkCost(relic, Math.max(1, count)) };
  }

  private purchaseHint(count: number, bulkEnabled = this.isBulkEnabled()): string {
    return bulkEnabled ? `RESTAURAR MÁXIMO (${formatNumber(count)})` : 'CLIQUE PARA RESTAURAR';
  }

  public setHudVisibility(unlocked: boolean): void {
    setHudSectionVisibility(this.hudDividerEl, this.hudItemEl, unlocked);
  }
}
