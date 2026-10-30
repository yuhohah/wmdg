import type { GameStateManager } from '../core/GameState.js';
import { getPurchaseFormulas } from '../systems/purchaseFormulas.js';

/** One delegated hover surface for purchases, including cards rebuilt during play. */
export class FormulaTooltip {
  private el: HTMLDivElement;
  private costEl: HTMLElement;
  private bonusEl: HTMLElement;
  private target: HTMLElement | null = null;
  private x = 0;
  private y = 0;
  private lastContent = '';

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
      if (e.pointerType === 'touch') return;
      this.target = e.target instanceof HTMLElement ? e.target : e.target instanceof Element ? e.target.parentElement : null;
      this.x = e.clientX;
      this.y = e.clientY;
      this.update();
    });
    document.addEventListener('focusin', e => {
      if (!(e.target instanceof HTMLElement)) return;
      this.target = e.target;
      const rect = e.target.getBoundingClientRect();
      this.x = rect.left;
      this.y = rect.bottom;
      this.update();
    });
    document.addEventListener('focusout', () => this.hide());
    document.addEventListener('pointerdown', () => this.hide());
    document.addEventListener('pointerleave', () => this.hide());
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.hide(); });
    window.addEventListener('blur', () => this.hide());
    window.addEventListener('resize', () => this.hide());
    window.addEventListener('scroll', () => this.hide(), true);
    document.addEventListener('wheel', () => this.hide(), { passive: true });
  }

  public hide(): void {
    this.el.hidden = true;
    this.target = null;
  }

  public update(): void {
    if (!this.game.nerdsEnabled || !this.target?.isConnected) {
      this.hide();
      return;
    }
    const target = this.target.closest<HTMLElement>(
      '#btn-convert-one, #btn-convert-max, #btn-upgrade-incarnation, #btn-unlock-single, .fervor-upgrade-card, .relic-action-card, .gnose-tree-node'
    );
    if (!target || target.closest('[inert], [aria-hidden="true"]')) {
      this.hide();
      return;
    }
    const id = target.id === 'btn-convert-one' || target.id === 'btn-convert-max' ? 'f_devotee'
      : target.id === 'btn-upgrade-incarnation' ? 'incarnation'
      : target.id === 'btn-unlock-single' ? this.game.unlocks.find(u => !u.unlocked &&
        (!u.prerequisiteId || this.game.unlocks.some(p => p.id === u.prerequisiteId && p.unlocked)))?.id
      : target.id.replace(/^card-/, '');
    const bulk = target.id === 'btn-convert-max' || !!this.target.closest('.btn-ritual-max');
    const formulas = id && getPurchaseFormulas(this.game, id, bulk);
    if (!formulas) {
      this.hide();
      return;
    }
    const content = `${formulas.cost}\n${formulas.bonus}`;
    if (content !== this.lastContent) {
      this.costEl.textContent = formulas.cost;
      this.bonusEl.textContent = formulas.bonus;
      this.lastContent = content;
    }
    this.el.hidden = false;
    const rect = this.el.getBoundingClientRect();
    const left = Math.max(8, Math.min(window.innerWidth - rect.width - 8, this.x + 16));
    const top = this.y + rect.height + 20 > window.innerHeight ? this.y - rect.height - 12 : this.y + 16;
    this.el.style.left = `${left}px`;
    this.el.style.top = `${Math.max(8, Math.min(window.innerHeight - rect.height - 8, top))}px`;
  }
}
