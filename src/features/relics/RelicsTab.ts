import { GameStateManager } from '../../core/GameState.js';
import { AudioManager } from '../../systems/audio.js';
import { TooltipManager } from '../../ui/tooltips.js';
import { NotificationManager } from '../../systems/notifications.js';
import { RelicUpgrade } from '../../types.js';
import { DISPLAY_CONFIG } from '../../config/display.js';
import { calculateRelicsToGet, formatNumber } from '../../systems/calculations.js';

export interface RelicsTabOptions {
  gameState: GameStateManager;
  audio: AudioManager;
  tooltips: TooltipManager;
  notifications: NotificationManager;
  spawnFloatingText: (x: number, y: number, text: string) => void;
  onRelicsTransmuted?: () => void;
  onUpgradePurchased?: () => void;
}

export class RelicsTab {
  private options: RelicsTabOptions;

  private tabBtnRelicsEl: HTMLElement | null = null;
  private hudDividerEl: HTMLElement | null = null;
  private hudItemEl: HTMLElement | null = null;
  private btnConvertRelicsEl: HTMLButtonElement | null = null;
  private relicsToGetEl: HTMLElement | null = null;
  private relicsConvertCooldownEl: HTMLElement | null = null;
  private relicsBalanceValEl: HTMLElement | null = null;
  private relicsExtraValEl: HTMLElement | null = null;
  private relicUpgradesListEl: HTMLElement | null = null;

  constructor(options: RelicsTabOptions) {
    this.options = options;
    this.initElements();
    this.bindEvents();
  }

  private initElements(): void {
    this.tabBtnRelicsEl = document.getElementById('tab-btn-relics');
    this.hudDividerEl = document.getElementById('hud-relic-divider');
    this.hudItemEl = document.getElementById('hud-relic-item');
    this.btnConvertRelicsEl = document.getElementById('btn-convert-relics') as HTMLButtonElement | null;
    this.relicsToGetEl = document.getElementById('relics-to-get');
    this.relicsConvertCooldownEl = document.getElementById('relics-convert-cooldown');
    this.relicsBalanceValEl = document.getElementById('relics-balance-val');
    this.relicsExtraValEl = document.getElementById('relics-extra-val');
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
        `+${result.gained} RELÍQUIAS!`
      );
      this.options.notifications.showCustomPopup(
        'FÉ TRANSMUTADA',
        `Você consagrou ${result.gained} Relíquias sagradas!`,
        '',
        'ALQUIMIA CÓSMICA'
      );
      this.updateUI();
      this.renderList();
      this.options.onRelicsTransmuted?.();
    }
  }

  public buyRelicUpgrade(relic: RelicUpgrade): void {
    const success = this.options.gameState.buyRelicUpgrade(relic);
    if (success) {
      this.options.audio.playTone(740, 'triangle', 0.2);
      this.options.tooltips.hide();
      this.updateUI();
      this.renderList();
      this.options.onUpgradePurchased?.();
    } else {
      this.options.audio.playTone(180, 'sawtooth', 0.1);
    }
  }

  public renderList(): void {
    if (!this.relicUpgradesListEl) return;
    this.relicUpgradesListEl.innerHTML = '';

    const relicPoints = this.options.gameState.relicPoints;

    this.options.gameState.relicUpgrades.forEach((relic) => {
      const isMax = relic.level >= relic.maxLevel;
      const canAfford = relicPoints >= relic.cost;
      const effectDesc = relic.effectText(relic.level, relicPoints);

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
             <span class="card-click-hint relic-hint">CLIQUE PARA CONSAGRAR</span>
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
            <span>${isMax ? 'CONCLUÍDO' : `${formatNumber(relic.cost)} Relíquias`}</span>
          </div>
          ${promptHtml}
        </div>
      `;

      card.addEventListener('click', () => {
        this.buyRelicUpgrade(relic);
      });

      card.addEventListener('mouseenter', (e: MouseEvent) => {
        this.options.tooltips.showRelicTooltip(relic, this.options.gameState.relicPoints, e);
      });
      card.addEventListener('mousemove', (e: MouseEvent) => {
        this.options.tooltips.position(e);
      });
      card.addEventListener('mouseleave', () => {
        this.options.tooltips.hide();
      });

      this.relicUpgradesListEl!.appendChild(card);
    });
  }

  public updateUI(): void {
    const toGet = calculateRelicsToGet(this.options.gameState.faithPoints);
    if (this.relicsToGetEl) {
      this.relicsToGetEl.textContent = formatNumber(toGet);
    }
    if (this.relicsConvertCooldownEl) {
      this.relicsConvertCooldownEl.textContent = `${Math.ceil(this.options.gameState.relicConvertCooldown)}`;
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
          benefitEl.textContent = relic.effectText(relic.level, relicPoints);
        }
      }
    });
  }

  public setTabVisibility(unlocked: boolean): void {
    if (this.tabBtnRelicsEl) {
      this.tabBtnRelicsEl.style.display = unlocked ? 'flex' : 'none';
    }
    if (this.hudDividerEl) {
      this.hudDividerEl.style.display = unlocked ? 'block' : 'none';
    }
    if (this.hudItemEl) {
      this.hudItemEl.style.display = unlocked ? 'flex' : 'none';
    }
  }
}
