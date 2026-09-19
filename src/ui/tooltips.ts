import type { BuyableItem, FervorUpgrade, Achievement, GameState, MechanicUnlock, RelicUpgrade } from '../types.js';
import { formatNumber } from '../systems/calculations.js';
import { DISPLAY_CONFIG } from '../config/display.js';

export class TooltipManager {
  private tooltipEl: HTMLElement;
  private currentAch: Achievement | null = null;

  constructor(tooltipId: string = 'cult-tooltip') {
    this.tooltipEl = document.getElementById(tooltipId)!;
  }

  public showItemTooltip(
    item: BuyableItem,
    totalFps: number,
    cost: number,
    currentTotalOutput: number,
    e: MouseEvent
  ): void {
    this.currentAch = null;

    let percentShare = '0%';
    if (totalFps > 0 && currentTotalOutput > 0) {
      percentShare = `${Math.min(100, Math.round((currentTotalOutput / totalFps) * 100))}%`;
    }

    let artHtml = '';
    if (DISPLAY_CONFIG.showTooltipArts && item.artUrl) {
      artHtml = `
        <div class="cult-tooltip-art-wrap">
          <img src="${item.artUrl}" class="cult-tooltip-art" alt="${item.name}" />
          <div class="cult-tooltip-art-overlay"></div>
        </div>
      `;
    }

    const symbolHtml = DISPLAY_CONFIG.showEmojisAndSymbols
      ? `<span class="cult-tooltip-symbol">${item.symbol}</span>`
      : '';

    this.tooltipEl.innerHTML = `
      ${artHtml}
      <div class="cult-tooltip-header">
        <div class="cult-tooltip-title">
          ${symbolHtml}
          <span>${item.name}</span>
        </div>
        <span class="cult-tooltip-tag">${item.id === 'f_devotee' ? 'CONGREGAÇÃO' : 'RELÍQUIA'}</span>
      </div>

      ${DISPLAY_CONFIG.showItemDescriptions && item.lore ? `<div class="cult-tooltip-lore">${item.lore}</div>` : ''}

      <div class="cult-tooltip-stats">
        <div class="tooltip-stat-item">
          <span class="tooltip-stat-label">REUNIDOS / ATIVOS</span>
          <span class="tooltip-stat-val">${formatNumber(item.count)}</span>
        </div>
        <div class="tooltip-stat-item">
          <span class="tooltip-stat-label">PRODUÇÃO TOTAL</span>
          <span class="tooltip-stat-val">+${formatNumber(currentTotalOutput)} / seg</span>
        </div>
        <div class="tooltip-stat-item">
          <span class="tooltip-stat-label">PARCELA DO CULTO</span>
          <span class="tooltip-stat-val">${percentShare}</span>
        </div>
        <div class="tooltip-stat-item">
          <span class="tooltip-stat-label">PRÓXIMO CUSTO</span>
          <span class="tooltip-stat-val">${formatNumber(cost)} Fé</span>
        </div>
      </div>
    `;

    this.tooltipEl.style.display = 'flex';
    this.position(e);
  }

  public showFervorTooltip(upg: FervorUpgrade, cost: number, mult: number, e: MouseEvent): void {
    this.currentAch = null;

    const symbolHtml = DISPLAY_CONFIG.showEmojisAndSymbols
      ? `<span class="cult-tooltip-symbol">${upg.icon}</span>`
      : '';

    this.tooltipEl.innerHTML = `
      <div class="cult-tooltip-header">
        <div class="cult-tooltip-title">
          ${symbolHtml}
          <span>${upg.name}</span>
        </div>
        <span class="cult-tooltip-tag" style="color: #f4f4f5; border-color: #71717a;">FERVOR</span>
      </div>

      <div class="cult-tooltip-lore">${upg.lore}</div>

      <div class="tooltip-buff-highlight" style="background: rgba(255, 255, 255, 0.05); border-color: #71717a; color: #ffffff;">
        <span>✦ MULTIPLICADOR ATUAL:</span>
        <span>x${mult.toFixed(2)}</span>
      </div>

      <div class="cult-tooltip-stats">
        <div class="tooltip-stat-item">
          <span class="tooltip-stat-label">NÍVEL ATUAL</span>
          <span class="tooltip-stat-val">${upg.level}</span>
        </div>
        <div class="tooltip-stat-item">
          <span class="tooltip-stat-label">PRÓXIMO CUSTO</span>
          <span class="tooltip-stat-val">${formatNumber(cost)} Fervor</span>
        </div>
      </div>
    `;

    this.tooltipEl.style.display = 'flex';
    this.position(e);
  }

  public showAchievementTooltip(ach: Achievement, state: GameState, e: MouseEvent): void {
    this.currentAch = ach;

    const progress = ach.getProgress(state);

    const symbolHtml = DISPLAY_CONFIG.showEmojisAndSymbols
      ? `<span class="cult-tooltip-symbol">${ach.icon}</span>`
      : '';

    this.tooltipEl.innerHTML = `
      <div class="cult-tooltip-header">
        <div class="cult-tooltip-title">
          ${symbolHtml}
          <span>${ach.name}</span>
        </div>
        <span class="cult-tooltip-tag" style="${ach.unlocked ? 'color: #ffffff; border-color: #ffffff;' : 'border-color: #52525b;'}">
          ${ach.unlocked ? 'ALCANÇADO' : 'EM PROGRESSO'}
        </span>
      </div>

      <div class="cult-tooltip-lore">${ach.lore}</div>

      <div class="cult-tooltip-stats">
        <div class="tooltip-stat-item" style="grid-column: span 2;">
          <span class="tooltip-stat-label">PROGRESSO ATUAL</span>
          <span class="tooltip-stat-val" id="tooltip-ach-progress-val">${progress.label} (${Math.round(progress.percent)}%)</span>
        </div>
      </div>
    `;

    this.tooltipEl.style.display = 'flex';
    this.position(e);
  }

  public showUnlockTooltip(unlock: MechanicUnlock, canAfford: boolean, e: MouseEvent): void {
    this.currentAch = null;

    const symbolHtml = DISPLAY_CONFIG.showEmojisAndSymbols
      ? `<span class="cult-tooltip-symbol">${unlock.symbol}</span>`
      : '';

    this.tooltipEl.innerHTML = `
      <div class="cult-tooltip-header">
        <div class="cult-tooltip-title">
          ${symbolHtml}
          <span>${unlock.name}</span>
        </div>
        <span class="cult-tooltip-tag">MECÂNICA SAGRADA</span>
      </div>

      ${DISPLAY_CONFIG.showItemDescriptions && unlock.lore ? `<div class="cult-tooltip-lore">${unlock.lore}</div>` : ''}

      <div class="cult-tooltip-stats">
        <div class="tooltip-stat-item">
          <span class="tooltip-stat-label">STATUS</span>
          <span class="tooltip-stat-val" style="color: ${unlock.unlocked ? '#34d399' : (canAfford ? '#fbbf24' : '#94a3b8')}">
            ${unlock.unlocked ? '✓ DESBLOQUEADO' : 'AGUARDANDO FÉ'}
          </span>
        </div>
        <div class="tooltip-stat-item">
          <span class="tooltip-stat-label">CUSTO</span>
          <span class="tooltip-stat-val" style="color: var(--gold-accent);">${formatNumber(unlock.cost)} Fé</span>
        </div>
      </div>
    `;

    this.tooltipEl.style.display = 'flex';
    this.position(e);
  }

  public showRelicTooltip(relic: RelicUpgrade, relicPoints: number, e: MouseEvent): void {
    this.currentAch = null;

    const symbolHtml = DISPLAY_CONFIG.showEmojisAndSymbols
      ? `<span class="cult-tooltip-symbol">${relic.icon}</span>`
      : '';

    const isMax = relic.level >= relic.maxLevel;
    const effectText = relic.effectText(relic.level, relicPoints);

    this.tooltipEl.innerHTML = `
      <div class="cult-tooltip-header">
        <div class="cult-tooltip-title">
          ${symbolHtml}
          <span>${relic.name}</span>
        </div>
        <span class="cult-tooltip-tag" style="color: #c084fc; border-color: #8b5cf6;">RELÍQUIA MITOLÓGICA</span>
      </div>

      <div class="cult-tooltip-lore">${relic.lore}</div>

      <div class="tooltip-buff-highlight" style="background: rgba(139, 92, 246, 0.1); border-color: rgba(139, 92, 246, 0.4); color: #e9d5ff;">
        <span>✦ EFEITO ATUAL:</span>
        <span>${effectText}</span>
      </div>

      <div class="cult-tooltip-stats">
        <div class="tooltip-stat-item">
          <span class="tooltip-stat-label">NÍVEL DA RELÍQUIA</span>
          <span class="tooltip-stat-val">${relic.level} / ${relic.maxLevel}</span>
        </div>
        <div class="tooltip-stat-item">
          <span class="tooltip-stat-label">CUSTO DE CONSAGRAÇÃO</span>
          <span class="tooltip-stat-val" style="color: #c084fc;">${isMax ? 'MÁXIMO' : `${formatNumber(relic.cost)} Relíquias`}</span>
        </div>
      </div>
    `;

    this.tooltipEl.style.display = 'flex';
    this.position(e);
  }

  public updateRealtimeProgress(state: GameState): void {
    if (this.currentAch && this.tooltipEl.style.display !== 'none') {
      const p = this.currentAch.getProgress(state);
      const valEl = this.tooltipEl.querySelector('#tooltip-ach-progress-val');
      if (valEl) {
        valEl.textContent = `${p.label} (${Math.round(p.percent)}%)`;
      }
    }
  }

  public position(e: MouseEvent): void {
    const tooltipWidth = 340;
    const tooltipHeight = this.tooltipEl.offsetHeight || 280;
    const pad = 16;

    let x = e.clientX + pad;
    let y = e.clientY + pad;

    if (x + tooltipWidth > window.innerWidth) {
      x = e.clientX - tooltipWidth - pad;
    }
    if (y + tooltipHeight > window.innerHeight) {
      y = window.innerHeight - tooltipHeight - pad;
    }
    if (y < pad) y = pad;
    if (x < pad) x = pad;

    this.tooltipEl.style.left = `${x}px`;
    this.tooltipEl.style.top = `${y}px`;
  }

  public hide(): void {
    this.tooltipEl.style.display = 'none';
    this.currentAch = null;
  }
}
