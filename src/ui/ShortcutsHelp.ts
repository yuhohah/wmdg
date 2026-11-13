import { initialFervorUpgrades } from '../config/fervor.js';
import { initialRelicUpgrades } from '../config/relics.js';
import { CARD_NAV_SHORTCUTS, FERVOR_SHORTCUTS, RELIC_SHORTCUTS } from './GameplayShortcuts.js';

/** Hover opens temporarily; clicking pins the list until dismissed. */
export class ShortcutsHelp {
  private pinned = false;
  private hovering = false;
  private suppressed = false;
  private root = document.getElementById('shortcuts-help');
  private button = document.getElementById('shortcuts-help-button');
  private panel = document.getElementById('shortcuts-help-panel');

  constructor() {
    if (!this.root || !this.button || !this.panel) return;
    const row = (key: string, label: string) => `<div><dt><kbd>${key}</kbd></dt><dd>${label}</dd></div>`;
    const group = (title: string, rows: string) => `<section class="shortcuts-help-group"><h3>${title}</h3><dl>${rows}</dl></section>`;
    const sequence = (keys: readonly string[], names: string[], label: string, description: string, actionRows = '') =>
      `<section class="shortcuts-help-group"><h3>${label}</h3>
        <div class="shortcuts-help-sequence">${keys.map(key => `<kbd>${key.toUpperCase()}</kbd>`).join(' ')}<span>${description}</span></div>
        <details><summary>Ver cada atalho</summary><dl>${names.map((name, i) => row(keys[i].toUpperCase(), name)).join('')}</dl></details>
        ${actionRows ? `<dl>${actionRows}</dl>` : ''}
      </section>`;
    this.panel.innerHTML = `<h2>Atalhos de teclado</h2>
      ${sequence(CARD_NAV_SHORTCUTS.map(({ key }) => key), CARD_NAV_SHORTCUTS.map(({ label }) => label), 'Navegação', 'Ir para os cards na ordem da lista')}
      ${group('Esfera', row('Espaço', 'Tocar a Esfera'))}
      ${group('Fiéis', row('Z', 'Comprar um Fiel') + row('X', 'Comprar o máximo, quando liberado') + row('M', 'Coletar milagre disponível, inclusive em duelo'))}
      ${group('Encarnação', row('I', 'Carregar a Bênção') + row('U', 'Evoluir a Encarnação'))}
      ${sequence(FERVOR_SHORTCUTS, initialFervorUpgrades.map(upgrade => upgrade.name), 'Ritos de Fervor', 'Comprar na ordem da lista')}
      ${sequence(RELIC_SHORTCUTS, initialRelicUpgrades.map(upgrade => upgrade.name), 'Relíquias', 'Comprar na ordem da lista', row('Caps Lock', 'Transmutar Fé em Fragmentos'))}`;
    this.root.addEventListener('mouseenter', () => { this.hovering = true; this.suppressed = false; this.update(); });
    this.root.addEventListener('mouseleave', () => { this.hovering = false; this.suppressed = false; this.update(); });
    this.button.addEventListener('click', () => {
      this.pinned = !this.pinned;
      this.suppressed = !this.pinned;
      this.update();
    });
    document.addEventListener('click', event => {
      if (event.target instanceof Node && !this.root?.contains(event.target)) this.close();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') this.close();
    });
  }

  private update(): void {
    const open = this.pinned || (this.hovering && !this.suppressed);
    if (this.panel) this.panel.hidden = !open;
    this.button?.setAttribute('aria-expanded', String(open));
    this.root?.classList.toggle('is-open', open);
  }

  private close(): void {
    this.pinned = false;
    this.suppressed = true;
    this.update();
  }
}
