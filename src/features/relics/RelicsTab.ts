import { cultDialog } from '../../ui/CultDialog.js';
import { AutomationToggle } from '../../ui/AutomationToggle.js';
import { GameStateManager } from '../../core/GameState.js';
import { AudioManager } from '../../systems/audio.js';
import { NotificationManager } from '../../systems/notifications.js';
import { RelicUpgrade } from '../../types.js';
import { DISPLAY_CONFIG } from '../../config/display.js';
import { formatNumber } from '../../systems/calculations.js';

export interface RelicsTabOptions {
  gameState: GameStateManager;
  audio: AudioManager;
  notifications: NotificationManager;
  spawnFloatingText: (x: number, y: number, text: string) => void;
  onRelicsTransmuted?: () => void;
  onUpgradePurchased?: () => void;
}

export class RelicsTab {
  private options: RelicsTabOptions;
  private renderedLevels: string = '';
  private relicAutomation: AutomationToggle;
  private transmutationAutomation: AutomationToggle;

  private hudDividerEl: HTMLElement | null = null;
  private hudItemEl: HTMLElement | null = null;
  private btnConvertRelicsEl: HTMLButtonElement | null = null;
  private relicsToGetEl: HTMLElement | null = null;
  private relicsConvertCooldownEl: HTMLElement | null = null;
  private relicsCooldownLineEl: HTMLElement | null = null;
  private relicsBalanceValEl: HTMLElement | null = null;
  private relicsExtraValEl: HTMLElement | null = null;
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
    this.relicsBalanceValEl = document.getElementById('relics-balance-val');
    this.relicsExtraValEl = document.getElementById('relics-extra-val');
    this.relicUpgradesListEl = document.getElementById('relic-upgrades-list');
  }

  private bindEvents(): void {
    this.btnConvertRelicsEl?.addEventListener('click', () => {
      const game = this.options.gameState;
      if (game.relicConvertCooldown > 0 || game.getRelicsToGet() <= 0) return;
      void cultDialog('Transmutação', () => `Perder ${formatNumber(game.faithPoints)} Fé para receber ${formatNumber(game.getRelicsToGet())} Fragmentos? Fiéis e produção permanecem.`, 'Transmutar', 'Cancelar')
        .then(confirmed => { if (confirmed) this.convertFaithToRelics(); });
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
      this.options.notifications.showCustomPopup(
        'TRANSMUTAÇÃO',
        `Sua Fé virou +${formatNumber(result.gained)} Fragmentos de deuses caídos.`,
        'relics',
        'TRANSMUTAÇÃO'
      );
      this.updateUI();
      this.renderList();
      this.options.onRelicsTransmuted?.();
    }
  }

  public buyRelicUpgrade(relic: RelicUpgrade, bulk = false): void {
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
    if (!this.relicUpgradesListEl) return;
    this.renderedLevels = this.options.gameState.relicUpgrades.map(r => r.level).join(',');
    this.relicUpgradesListEl.innerHTML = '';

    const relicPoints = this.options.gameState.relicPoints;

    this.options.gameState.relicUpgrades.forEach((relic) => {
      const isMax = relic.level >= relic.maxLevel;
      const canAfford = relicPoints >= relic.cost;
      const effectDesc = relic.effectText(relic.level, Math.max(relicPoints, this.options.gameState.relicPeakThisRun));

      const card = document.createElement('div');
      card.className = `cult-action-card relic-action-card ${isMax ? 'maxed' : (canAfford ? '' : 'unaffordable')}`;
      card.id = `card-${relic.id}`;

      const symbolHtml = DISPLAY_CONFIG.showEmojisAndSymbols
        ? `<span class="card-symbol">${relic.icon}</span>`
        : '';

      const promptHtml = isMax
        ? `<div class="card-click-prompt">
             <span class="card-status-badge maxed-badge">NÍVEL MÁXIMO</span>
           </div>`
        : `<div class="card-click-prompt">
             <span class="card-click-hint relic-hint">CLIQUE PARA RESTAURAR</span>
           </div>`;

      card.innerHTML = `
        <div class="card-header-row">
          <div class="card-title-group">
            ${symbolHtml}
            <span class="card-name">${relic.name}</span>
          </div>
          <span class="relic-level-badge ${isMax ? 'maxed' : ''}">(${relic.level}/${relic.maxLevel})</span>
        </div>
        <div class="card-desc">
          <div class="relic-benefit-text">${effectDesc}</div>
        </div>
        <div class="card-footer-row">
          <div class="relic-cost-tag">
            <span>CUSTO:</span>
            <span>${isMax ? 'CONCLUÍDO' : `${formatNumber(relic.cost)} Fragmentos`}</span>
          </div>
          ${promptHtml}
        </div>
      `;

      if (this.options.gameState.hasGnoseUpgrade('gn_memoria_selos') && relic.level < relic.maxLevel) {
        const bulk = document.createElement('button');
        bulk.className = 'btn-ritual-max'; bulk.textContent = 'Restaurar máximo';
        bulk.addEventListener('click', event => { event.stopPropagation(); this.buyRelicUpgrade(relic, true); });
        card.appendChild(bulk);
      }

      card.addEventListener('click', () => {
        this.buyRelicUpgrade(relic);
      });

      this.relicUpgradesListEl!.appendChild(card);
    });
  }

  public updateUI(): void {
    this.relicAutomation.update();
    this.transmutationAutomation.update();
    if (this.renderedLevels !== this.options.gameState.relicUpgrades.map(r => r.level).join(',')) {
      this.renderList();
    }
    const toGet = this.options.gameState.getRelicsToGet();
    if (this.relicsToGetEl) {
      this.relicsToGetEl.textContent = formatNumber(toGet);
    }
    const cooldown = this.options.gameState.relicConvertCooldown;
    if (this.relicsConvertCooldownEl) {
      this.relicsConvertCooldownEl.textContent = `${Math.ceil(cooldown)}`;
    }
    if (this.relicsCooldownLineEl) {
      this.relicsCooldownLineEl.style.display = cooldown > 0 ? 'block' : 'none';
    }
    if (this.relicsBalanceValEl) {
      this.relicsBalanceValEl.textContent = formatNumber(this.options.gameState.relicPoints);
    }
    if (this.relicsExtraValEl) {
      const extra = this.options.gameState.getRelicsRatePerSecond();
      this.relicsExtraValEl.textContent = formatNumber(extra);
    }

    if (this.btnConvertRelicsEl) {
      const canConvert = this.options.gameState.relicConvertCooldown <= 0 && toGet > 0;
      this.btnConvertRelicsEl.disabled = !canConvert;
    }

    this.updateButtonStates();
  }

  public updateButtonStates(): void {
    const relicPoints = this.options.gameState.relicPoints;
    this.options.gameState.relicUpgrades.forEach((relic) => {
      const isMax = relic.level >= relic.maxLevel;
      const canAfford = relicPoints >= relic.cost;
      const card = document.getElementById(`card-${relic.id}`);
      if (card) {
        if (isMax) {
          card.classList.remove('unaffordable');
          card.classList.add('maxed');
        } else if (canAfford) {
          card.classList.remove('unaffordable');
        } else {
          card.classList.add('unaffordable');
        }
        const benefitEl = card.querySelector('.relic-benefit-text');
        if (benefitEl && relic.id === 'relic_ark') {
          benefitEl.textContent = relic.effectText(relic.level, Math.max(relicPoints, this.options.gameState.relicPeakThisRun));
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
