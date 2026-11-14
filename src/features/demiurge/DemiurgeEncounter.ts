import { BOSS_COMBAT_SPOT } from '../gnose/battle/BattleChoreography.js';
import type { GameStateManager } from '../../core/GameState.js';
import { DEMIURGE_LABELS, DEMIURGE_RESOURCES, challengeDemiurge, summonDemiurge, tickDemiurge } from '../../systems/demiurge.js';
import { cultDialog } from '../../ui/CultDialog.js';
import { SaveSystem } from '../../systems/saveSystem.js';
import './demiurge.css';

const folder = '/assets/sprites/bosses/lateral/05-demiurgo/';
export class DemiurgeEncounter {
  private challengeButton = document.createElement('button');
  private actor = document.createElement('button');
  private canvas = document.createElement('canvas');
  private status = document.createElement('aside');
  private images = new Map<string, HTMLImageElement>();
  private announcing = false;
  private lossDialog?: HTMLDialogElement;
  private approachStart?: { x: number; y: number };
  private phase = '';

  constructor(private gs: GameStateManager, private save: () => unknown,
    private ready: () => boolean, private restart: () => Promise<void>, private focusSphere: () => void, private openBattle: () => boolean) {
    this.actor.type = 'button';
    this.actor.className = 'demiurge-actor';
    this.actor.setAttribute('aria-label', 'Desafiar o Demiurgo');
    this.actor.title = 'Desafiar o Demiurgo (clique, toque, Enter ou espaço)';
    this.canvas.width = 256; this.canvas.height = 192;
    this.canvas.setAttribute('aria-hidden', 'true');
    this.actor.append(this.canvas);
    const challenge = () => {
      if (document.querySelector('dialog[open], .modal-overlay.open') || !this.ready()) return;
      if (challengeDemiurge(this.gs)) {
        const rect = this.actor.getBoundingClientRect();
        this.approachStart = rect.width > 0 ? { x: rect.left, y: rect.top } : { x: 0, y: 24 };
        this.focusSphere(); this.save(); this.render();
      }
    };
    this.actor.addEventListener('click', challenge);
    this.challengeButton.type = 'button';
    this.challengeButton.className = 'demiurge-challenge';
    this.challengeButton.textContent = 'Redesafiar o Demiurgo';
    this.challengeButton.hidden = true;
    this.challengeButton.addEventListener('click', challenge);
    document.body.append(this.challengeButton);
    this.status.className = 'demiurge-status';
    this.actor.hidden = this.status.hidden = true;
    document.body.append(this.actor, this.status);
  }

  public update(seconds: number): void {
    if (!this.ready() || document.visibilityState === 'hidden') { this.actor.hidden = this.status.hidden = this.challengeButton.hidden = true; return; }
    const blocked = !!document.querySelector('dialog[open], .modal-overlay.open');
    if (!blocked && summonDemiurge(this.gs)) this.save();
    const d = this.gs.demiurge;
    if (d.phase === 'announced' && !this.announcing && !blocked) {
      this.announcing = true;
      void cultDialog('O Demiurgo apareceu',
        'O Demiurgo apareceu e deve ser derrotado! Ele vai consumir Fé, Fiéis, Fervor, Fragmentos e Gnose, nessa ordem. Se a Gnose chegar a zero, você perde o jogo. Clique ou toque nele para desafiá-lo: ele caminhará até a Esfera e os fiéis iniciarão a procissão para a batalha. Cada recurso e sua geração por segundo são drenados em até 4 segundos; recursos vazios são pulados. O encontro pausa enquanto você estiver fora do jogo.', 'Enfrentar o Demiurgo')
        .then(accepted => {
          if (accepted && this.gs.demiurge === d) { d.phase = 'walking'; d.elapsed = 0; this.save(); }
          this.announcing = false;
        });
    }
    if (!blocked) {
      tickDemiurge(this.gs, seconds);
      if (d.phase === 'approaching') {
        d.elapsed += seconds;
        if (d.elapsed >= 3 && this.openBattle()) { this.save(); }
      }
    }
    if (this.phase !== d.phase) { this.phase = d.phase; this.save(); }
    this.challengeButton.hidden = !['walking', 'draining', 'defeated'].includes(d.phase) || blocked;
    this.render();
    if (d.phase === 'lost' && !this.lossDialog && !blocked) this.showLoss();
    if (d.phase !== 'lost' && this.lossDialog) { this.lossDialog.close(); this.lossDialog.remove(); this.lossDialog = undefined; }
  }

  private render(): void {
    const d = this.gs.demiurge;
    const visible = ['walking', 'draining', 'approaching'].includes(d.phase);
    this.actor.hidden = this.status.hidden = !visible;
    if (!visible) return;
    const anchors = DEMIURGE_RESOURCES.map(key => document.querySelector<HTMLElement>(`[data-currency="${key}"]`)?.getBoundingClientRect());
    const target = anchors[d.target];
    if (!target) return;
    const previous = d.target === 0 ? { left: -64, width: 0, bottom: target.bottom } : anchors[d.target - 1] ?? target;
    const progress = d.phase === 'walking' ? Math.min(1, d.elapsed / 2) : 1;
    const startX = previous.left - 110;
    const endX = target.left - 110;
    this.actor.style.left = `${Math.max(0, Math.min(window.innerWidth - 128, startX + (endX - startX) * progress))}px`;
    this.actor.style.top = `${Math.max(0, previous.bottom + (target.bottom - previous.bottom) * progress - 50)}px`;
    this.actor.style.width = '128px'; this.actor.style.height = '96px';
    if (d.phase === 'approaching') {
      const world = document.getElementById('dodeca-board-world');
      if (world) {
        const rect = world.getBoundingClientRect();
        const scale = rect.width / world.offsetWidth;
        const end = { x: rect.left + (BOSS_COMBAT_SPOT.x - 158) * scale,
          y: rect.top + (BOSS_COMBAT_SPOT.y - 215) * scale };
        const start = this.approachStart ?? { x: target.left - 110, y: target.bottom - 50 };
        const t = Math.min(1, d.elapsed / 3);
        this.actor.style.left = `${start.x + (end.x - start.x) * t}px`;
        this.actor.style.top = `${start.y + (end.y - start.y) * t}px`;
        this.actor.style.width = `${128 + (320 * scale - 128) * t}px`;
        this.actor.style.height = `${96 + (240 * scale - 96) * t}px`;
      }
    }
    this.status.textContent = d.phase === 'approaching' ? 'O Demiurgo caminha até a Esfera…'
      : `Demiurgo · ${d.phase === 'walking' ? 'Indo até' : 'Drenando'} ${DEMIURGE_LABELS[d.target]} · Clique para desafiar`;
    this.actor.disabled = d.phase === 'approaching';
    const key = d.phase === 'walking' || d.phase === 'approaching' ? 'andar' : 'idle';
    let im = this.images.get(key);
    if (!im) { im = new Image(); im.src = key === 'idle' ? `${folder}idle.png` : `${folder}${key}/spritesheet.png`; this.images.set(key, im); }
    const ctx = this.canvas.getContext('2d');
    if (ctx && im.complete && im.naturalWidth) {
      const frame = key === 'idle' ? 0 : Math.floor(d.elapsed * 10) % 17;
      ctx.clearRect(0, 0, 256, 192); ctx.drawImage(im, frame * 256, 0, 256, 192, 0, 0, 256, 192);
    }
  }

  private showLoss(): void {
    const dialog = document.createElement('dialog');
    this.lossDialog = dialog;
    dialog.className = 'cult-dialog';
    dialog.setAttribute('aria-labelledby', 'demiurge-loss-title');
    dialog.innerHTML = '<h2 id="demiurge-loss-title">O Demiurgo consumiu a Gnose</h2><p>Você perdeu o jogo. A última centelha do culto se apagou.</p><div class="cult-dialog-actions"><button type="button" data-export>Exportar progresso</button><button type="button" data-restart>Reiniciar o culto</button></div>';
    dialog.addEventListener('cancel', e => e.preventDefault());
    dialog.querySelector('[data-export]')!.addEventListener('click', () => SaveSystem.exportSave(this.gs.buildSaveData()));
    dialog.querySelector('[data-restart]')!.addEventListener('click', () => { void this.restart(); });
    document.body.append(dialog); dialog.showModal();
    this.save();
  }
}
