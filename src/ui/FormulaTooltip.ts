import type { GameStateManager } from '../core/GameState.js';
import { events, GameEvents } from '../core/EventBus.js';
import { getPurchaseFormulas } from '../systems/purchaseFormulas.js';

const TOOLTIP_SELECTOR = [
  '#btn-convert-one',
  '#btn-convert-max',
  '#btn-upgrade-incarnation',
  '#btn-unlock-single',
  '#btn-convert-relics',
  '#btn-gnose-reset',
  '#incarnation-altar-container',
  '#incarnation-blessing-panel',
  '.fervor-upgrade-card',
  '.relic-action-card',
  '.gnose-tree-node',
].join(', ');

/** One delegated hover surface for purchases, including cards rebuilt during play. */
export class FormulaTooltip {
  private el: HTMLDivElement;
  private costEl: HTMLElement;
  private bonusEl: HTMLElement;
  private target: HTMLElement | null = null;
  private resolvedTarget: HTMLElement | null = null;
  private x = 0;
  private y = 0;
  private lastContent = '';
  private cachedWidth = 0;
  private cachedHeight = 0;

  constructor(private game: GameStateManager) {
    this.el = document.createElement('div');
    this.el.id = 'nerds-formula-tooltip';
    this.el.className = 'formula-tooltip';
    this.el.setAttribute('role', 'tooltip');
    this.el.hidden = true;
    this.el.innerHTML = '<div class="formula-tooltip-label">Custo</div><code class="formula-tooltip-cost"></code><div class="formula-tooltip-label">Bônus</div><code class="formula-tooltip-bonus"></code>';
    this.costEl = this.el.querySelector('.formula-tooltip-cost')!;
    this.bonusEl = this.el.querySelector('.formula-tooltip-bonus')!;
    document.body.appendChild(this.el);

    document.addEventListener('pointermove', e => {
      if (!this.game.nerdsEnabled || e.pointerType === 'touch') return;
      const raw = e.target instanceof HTMLElement ? e.target : e.target instanceof Element ? e.target.parentElement : null;
      this.x = e.clientX;
      this.y = e.clientY;
      const nextResolved = raw?.closest<HTMLElement>(TOOLTIP_SELECTOR) ?? null;
      if (!nextResolved || nextResolved.closest('[inert], [aria-hidden="true"]')) {
        this.hide();
        return;
      }
      this.target = raw;
      if (nextResolved === this.resolvedTarget && !this.el.hidden && this.cachedWidth > 0) {
        this.positionTooltip();
        return;
      }
      this.update();
    });
    document.addEventListener('focusin', e => {
      if (!this.game.nerdsEnabled || !(e.target instanceof HTMLElement)) return;
      this.target = e.target;
      const rect = e.target.getBoundingClientRect();
      this.x = rect.left;
      this.y = rect.bottom;
      this.update();
    });
    document.addEventListener('focusout', () => this.hide());
    document.addEventListener('pointerleave', () => this.hide());
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.hide(); });
    window.addEventListener('blur', () => this.hide());
    window.addEventListener('resize', () => this.hide());
    window.addEventListener('scroll', () => this.hide(), true);
    document.addEventListener('wheel', () => this.hide(), { passive: true });

    const refreshIfOpen = () => {
      if (!this.el.hidden) this.update();
    };
    events.on(GameEvents.STATE_CHANGED, refreshIfOpen);
    events.on(GameEvents.GAME_TICK, refreshIfOpen);
  }

  public hide(): void {
    if (!this.el.hidden) this.el.hidden = true;
    this.target = null;
    this.resolvedTarget = null;
  }

  private positionTooltip(): void {
    const w = this.cachedWidth;
    const h = this.cachedHeight;
    const left = Math.max(8, Math.min(window.innerWidth - w - 8, this.x + 16));
    const top = this.y + h + 20 > window.innerHeight ? this.y - h - 12 : this.y + 16;
    this.el.style.left = `${left}px`;
    this.el.style.top = `${Math.max(8, Math.min(window.innerHeight - h - 8, top))}px`;
  }

  public update(): void {
    if (!this.game.nerdsEnabled) {
      this.hide();
      return;
    }
    if (!this.target?.isConnected && typeof document.elementFromPoint === 'function') {
      const hovered = document.elementFromPoint(this.x, this.y);
      this.target = hovered instanceof HTMLElement ? hovered : hovered?.parentElement ?? null;
    }
    if (!this.target?.isConnected) {
      this.hide();
      return;
    }
    const target = this.target.closest<HTMLElement>(TOOLTIP_SELECTOR);
    if (!target || target.closest('[inert], [aria-hidden="true"]')) {
      this.hide();
      return;
    }
    this.resolvedTarget = target;
    const id = target.id === 'btn-convert-one' || target.id === 'btn-convert-max' ? 'f_devotee'
      : target.id === 'btn-upgrade-incarnation' ? 'incarnation'
      : target.id === 'btn-convert-relics' ? 'transmute_relics'
      : target.id === 'btn-gnose-reset' ? 'gnose_reset'
      : target.id === 'incarnation-altar-container' || target.id === 'incarnation-blessing-panel' ? 'blessing'
      : target.id === 'btn-unlock-single' ? this.game.unlocks.find(u => !u.unlocked &&
        (!u.prerequisiteId || this.game.unlocks.some(p => p.id === u.prerequisiteId && p.unlocked)))?.id
      : target.id.replace(/^card-/, '');
    const bulk = target.id === 'btn-convert-max' || (this.game.hasGnoseUpgrade('gn_memoria_selos') && (
      (target.classList.contains('fervor-upgrade-card') && this.game.bulkFervorEnabled) ||
      (target.classList.contains('relic-action-card') && this.game.bulkRelicsEnabled)
    ));
    const formulas = id && getPurchaseFormulas(this.game, id, bulk);
    if (!formulas) {
      this.hide();
      return;
    }
    const content = `${formulas.cost}\n${formulas.bonus}`;
    const wasHidden = this.el.hidden;
    let needsMeasure = wasHidden || this.cachedWidth <= 0;
    if (content !== this.lastContent) {
      this.costEl.textContent = formulas.cost;
      this.bonusEl.textContent = formulas.bonus;
      this.lastContent = content;
      needsMeasure = true;
    }
    if (wasHidden) this.el.hidden = false;
    if (needsMeasure) {
      const rect = this.el.getBoundingClientRect();
      this.cachedWidth = rect.width;
      this.cachedHeight = rect.height;
    }
    this.positionTooltip();
  }
}
