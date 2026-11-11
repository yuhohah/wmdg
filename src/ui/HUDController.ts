import { setText } from './dom.js';
import { GameStateManager } from '../core/GameState.js';
import { formatNumber } from '../systems/calculations.js';
import { events, GameEvents } from '../core/EventBus.js';

export interface HUDControllerOptions {
  gameState: GameStateManager;
}

export type CurrencyId = 'faith' | 'followers' | 'fervor' | 'relics' | 'gnose';

interface CurrencyTooltipData {
  title: string;
  description: string;
  stats: string[];
}

export class HUDController {
  private gameState: GameStateManager;

  private faithCounterEl: HTMLElement | null = null;
  private faithPerSecCounterEl: HTMLElement | null = null;
  private followersCounterEl: HTMLElement | null = null;
  private sphereClickValEl: HTMLElement | null = null;

  private fervorCounterHudEl: HTMLElement | null = null;
  private fervorRateCounterHudEl: HTMLElement | null = null;

  private relicCounterHudEl: HTMLElement | null = null;
  private relicRateCounterHudEl: HTMLElement | null = null;

  private gnoseCounterHudEl: HTMLElement | null = null;
  private gnoseMultCounterHudEl: HTMLElement | null = null;

  private currencyItems = new Map<CurrencyId, HTMLElement>();
  private tooltipEl: HTMLDivElement | null = null;
  private tooltipTitleEl: HTMLElement | null = null;
  private tooltipDescEl: HTMLElement | null = null;
  private tooltipStatsEl: HTMLElement | null = null;
  private activeCurrency: CurrencyId | null = null;
  private activeAnchorEl: HTMLElement | null = null;

  constructor(options: HUDControllerOptions) {
    this.gameState = options.gameState;
    this.initElements();
    this.initCurrencyTooltips();
    this.bindEvents();
    this.update();
  }

  private initElements(): void {
    this.faithCounterEl = document.getElementById('faith-counter');
    this.faithPerSecCounterEl = document.getElementById('faith-per-sec-counter');
    this.followersCounterEl = document.getElementById('followers-counter');
    this.sphereClickValEl = document.getElementById('sphere-click-val');

    this.fervorCounterHudEl = document.getElementById('fervor-counter-hud');
    this.fervorRateCounterHudEl = document.getElementById('fervor-rate-counter-hud');

    this.relicCounterHudEl = document.getElementById('relic-counter-hud');
    this.relicRateCounterHudEl = document.getElementById('relic-rate-counter-hud');

    this.gnoseCounterHudEl = document.getElementById('gnose-counter-hud');
    this.gnoseMultCounterHudEl = document.getElementById('gnose-mult-counter-hud');
  }

  private initCurrencyTooltips(): void {
    const selectorMap: Record<CurrencyId, string> = {
      faith: '.resource-item-faith',
      followers: '.resource-item-followers',
      fervor: '.resource-item-fervor',
      relics: '.resource-item-relic',
      gnose: '.resource-item-gnose',
    };

    (Object.keys(selectorMap) as CurrencyId[]).forEach((currency) => {
      const el = document.querySelector<HTMLElement>(selectorMap[currency]);
      if (!el) return;
      el.dataset.currency = currency;
      if (!el.hasAttribute('tabindex')) {
        el.tabIndex = 0;
      }
      this.currencyItems.set(currency, el);

      el.addEventListener('mouseenter', () => this.showTooltip(currency, el));
      el.addEventListener('mouseleave', () => {
        if (this.activeAnchorEl === el) this.hideTooltip();
      });
      el.addEventListener('focusin', () => this.showTooltip(currency, el));
      el.addEventListener('focusout', () => {
        if (this.activeAnchorEl === el) this.hideTooltip();
      });
    });

    const existing = document.getElementById('currency-tooltip') as HTMLDivElement | null;
    if (existing) {
      existing.remove();
    }

    const tooltip = document.createElement('div');
    tooltip.id = 'currency-tooltip';
    tooltip.className = 'currency-tooltip';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.hidden = true;
    tooltip.innerHTML =
      '<div class="currency-tooltip-title"></div>' +
      '<div class="currency-tooltip-desc"></div>' +
      '<div class="currency-tooltip-stats"></div>';
    document.body.appendChild(tooltip);

    this.tooltipEl = tooltip;
    this.tooltipTitleEl = tooltip.querySelector('.currency-tooltip-title');
    this.tooltipDescEl = tooltip.querySelector('.currency-tooltip-desc');
    this.tooltipStatsEl = tooltip.querySelector('.currency-tooltip-stats');

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hideTooltip();
    });
    window.addEventListener('blur', () => this.hideTooltip());
    window.addEventListener('resize', () => this.hideTooltip());
  }

  public getCurrencyTooltipData(currency: CurrencyId): CurrencyTooltipData {
    switch (currency) {
      case 'faith': {
        const faith = Math.floor(this.gameState.faithPoints);
        const fps = this.gameState.getFaithPerSecond();
        const fpc = this.gameState.getFaithPerClick();
        const isBoosted = this.gameState.incarnationBoostTimer > 0;
        return {
          title: 'Fé',
          description:
            'Devoção arrancada das mentes mortais. Usada para converter Fiéis, romper Selos e ser transmutada em Fragmentos.',
          stats: [
            `Saldo: ${formatNumber(faith)} Fé`,
            `Produção: +${formatNumber(fps)}/s${isBoosted ? ' (2×)' : ''} · +${formatNumber(fpc)}/clique`,
          ],
        };
      }
      case 'followers': {
        const count = this.gameState.getTotalFollowersCount();
        const devotee = this.gameState.followers[0];
        const nextCost = devotee ? this.gameState.getItemCost(devotee) : 20;
        const nextGain = this.gameState.getFollowerPurchaseFaithGain(1);
        return {
          title: 'Fiéis',
          description:
            'Almas devotadas que entoam cânticos no Pátio dos Fiéis para gerar Fé continuamente.',
          stats: [
            `Congregação: ${formatNumber(count)} Fiéis`,
            `Próximo Fiel: ${formatNumber(nextCost)} Fé (+${formatNumber(nextGain)} Fé/s)`,
          ],
        };
      }
      case 'fervor': {
        const fervor = Math.floor(this.gameState.fervorPoints);
        const fervorRate = this.gameState.getFervorRatePerSecond();
        const followerMult = this.gameState.getEffectiveIncarnationFollowerMultiplier();
        return {
          title: 'Fervor',
          description:
            'Chama extática canalizada pelo Altar da Encarnação. Alimenta Ritos de Fervor e amplifica a geração de Fé.',
          stats: [
            `Saldo: ${formatNumber(fervor)} Fervor (+${formatNumber(fervorRate)}/s)`,
            `Multiplicador dos Fiéis: ×${formatNumber(followerMult)}`,
          ],
        };
      }
      case 'relics': {
        const relics = Math.floor(this.gameState.relicPoints);
        const relicRate = this.gameState.getRelicsRatePerSecond();
        const pending = this.gameState.getRelicsToGet();
        return {
          title: 'Fragmentos',
          description:
            'Restos de deuses caídos, obtidos ao transmutar Fé. Restauram as Relíquias Divinas do ciclo atual.',
          stats: [
            `Saldo: ${formatNumber(relics)} Fragmentos (+${formatNumber(relicRate)}/s)`,
            `Ao transmutar agora: +${formatNumber(pending)} Fragmentos`,
          ],
        };
      }
      case 'gnose': {
        const gnose = Math.floor(this.gameState.gnosePoints);
        const totalGnose = Math.floor(this.gameState.totalGnoseEarned);
        const gnoseMult = this.gameState.getTotalGnosePassiveMultiplier();
        const nodes = this.gameState.unlockedGnoseUpgrades.size;
        return {
          title: 'Gnose',
          description:
            'Sabedoria transcendental obtida ao ascender na Câmara da Gnose. Concede bônus permanentes entre ciclos.',
          stats: [
            `Saldo: ${formatNumber(gnose)} Gnose (Total: ${formatNumber(totalGnose)})`,
            `Multiplicador Passivo: ×${formatNumber(gnoseMult)} · Nós: ${nodes}`,
          ],
        };
      }
    }
  }

  private showTooltip(currency: CurrencyId, anchorEl: HTMLElement): void {
    this.activeCurrency = currency;
    this.activeAnchorEl = anchorEl;
    this.renderActiveTooltip();
  }

  public hideTooltip(): void {
    this.activeCurrency = null;
    this.activeAnchorEl = null;
    if (this.tooltipEl) {
      this.tooltipEl.hidden = true;
    }
  }

  private renderActiveTooltip(): void {
    if (!this.activeCurrency || !this.activeAnchorEl || !this.tooltipEl) return;
    if (!this.activeAnchorEl.isConnected || this.activeAnchorEl.style.display === 'none') {
      this.hideTooltip();
      return;
    }

    const data = this.getCurrencyTooltipData(this.activeCurrency);
    if (this.tooltipTitleEl) {
      setText(this.tooltipTitleEl, data.title);
    }
    if (this.tooltipDescEl) {
      setText(this.tooltipDescEl, data.description);
    }
    if (this.tooltipStatsEl) {
      setText(this.tooltipStatsEl, data.stats.join('\n'));
    }

    this.tooltipEl.hidden = false;
    const anchorRect = this.activeAnchorEl.getBoundingClientRect();
    const tipRect = this.tooltipEl.getBoundingClientRect();
    const left = Math.max(
      8,
      Math.min(window.innerWidth - tipRect.width - 8, anchorRect.left)
    );
    const top = Math.max(8, anchorRect.bottom + 8);
    this.tooltipEl.style.left = `${left}px`;
    this.tooltipEl.style.top = `${top}px`;
  }

  private bindEvents(): void {
    events.on(GameEvents.STATE_CHANGED, () => this.update());
    events.on(GameEvents.GAME_TICK, () => this.update());
  }

  public update(): void {
    const faithInt = Math.floor(this.gameState.faithPoints);
    if (this.faithCounterEl) {
      setText(this.faithCounterEl, formatNumber(faithInt));
    }

    const fps = this.gameState.getFaithPerSecond();
    const isBoosted = this.gameState.incarnationBoostTimer > 0;
    if (this.faithPerSecCounterEl) {
      setText(this.faithPerSecCounterEl, `${formatNumber(fps)}/s${isBoosted ? ' (2×)' : ''}`);
      this.faithPerSecCounterEl.classList.toggle('boosted', isBoosted);
    }

    if (this.followersCounterEl) {
      setText(this.followersCounterEl, formatNumber(this.gameState.getTotalFollowersCount()));
    }

    const fervor = Math.floor(this.gameState.fervorPoints);
    const fervorRate = this.gameState.getFervorRatePerSecond();
    if (this.fervorCounterHudEl) {
      setText(this.fervorCounterHudEl, formatNumber(fervor));
    }
    if (this.fervorRateCounterHudEl) {
      setText(this.fervorRateCounterHudEl, `${formatNumber(fervorRate)}/s`);
    }

    const relic = Math.floor(this.gameState.relicPoints);
    const relicRate = this.gameState.getRelicsRatePerSecond();
    if (this.relicCounterHudEl) {
      setText(this.relicCounterHudEl, formatNumber(relic));
    }
    if (this.relicRateCounterHudEl) {
      setText(this.relicRateCounterHudEl, `${formatNumber(relicRate)}/s`);
    }

    const gnose = Math.floor(this.gameState.gnosePoints);
    const gnoseMult = this.gameState.getTotalGnosePassiveMultiplier();
    if (this.gnoseCounterHudEl) {
      setText(this.gnoseCounterHudEl, formatNumber(gnose));
    }
    if (this.gnoseMultCounterHudEl) {
      setText(this.gnoseMultCounterHudEl, `×${formatNumber(gnoseMult)}`);
    }

    if (this.activeCurrency) {
      this.renderActiveTooltip();
    }
  }

  public updateCard(id: string): void {
    if (id === 'card-altar-sphere') {
      setText(this.sphereClickValEl, `+${formatNumber(this.gameState.getFaithPerClick())} Fé`);
    }
  }
}
