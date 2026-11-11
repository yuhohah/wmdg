import { GameStateManager } from '../../core/GameState.js';
import { GNOSE_BOSSES } from '../../config/bosses.js';
import { formatNumber } from '../../systems/numberFormat.js';
import { EndingRitual, type RitualPhase } from './EndingRitual.js';
import type { AudioManager } from '../../systems/audio.js';

/** The ending waits for the battle's return choreography and any other dialog. */
export class CampaignEnding {
  private dialog?: HTMLDialogElement;
  private ritual?: EndingRitual;
  private phase: RitualPhase = 'complete';
  private ritualMusic = false;
  private launcher: HTMLButtonElement;

  constructor(private gs: GameStateManager, private save: () => unknown, private canPresent: () => boolean, private audio?: AudioManager) {
    this.launcher = document.createElement('button');
    this.launcher.className = 'ending-launcher';
    this.launcher.textContent = '✧ Conclusão / Leaderboard';
    this.launcher.hidden = true;
    this.launcher.addEventListener('click', () => this.open(false));
    document.body.append(this.launcher);
  }

  public update(): void {
    this.launcher.hidden = this.gs.campaignEnding === 'pending' || !this.canPresent();
    if (this.dialog || !this.canPresent() || document.querySelector('dialog[open], .modal-overlay.open')) return;
    if (this.gs.campaignEnding === 'pending' && this.gs.isCampaignComplete()) this.open(true);
  }

  public open(tribute = true): void {
    if (this.dialog || !this.canPresent()) return;
    if (this.gs.campaignEnding === 'pending' && !this.gs.isCampaignComplete()) return;
    const dialog = document.createElement('dialog');
    this.dialog = dialog;
    dialog.className = 'campaign-ending';
    dialog.setAttribute('aria-labelledby', 'ending-title');
    dialog.innerHTML = `
      <div class="ending-theatre">
        <canvas class="ending-ritual-canvas" role="img" aria-label="Ritual de conclusão: os quatro guardiões se reúnem ao redor da Esfera, os fiéis se ajoelham e o Avatar Solar conduz a homenagem. Ao fim, todos desaparecem."></canvas>
        <section class="ending-caption" aria-live="polite"></section>
        <div class="ending-credits" hidden><p class="ending-eyebrow">EQUIPE DE DESENVOLVIMENTO</p>
          <p>Luan de Paula · Rafael Machado<br>Arthur Rezendo · Pedro Santana</p>
          <span>Obrigado por dar vida a este universo.</span></div>
        <button class="ending-skip" type="button">Pular ritual</button>
      </div>
      <section class="ending-panel" hidden><div class="ending-copy"></div><div class="ending-actions"></div></section>`;
    dialog.querySelector('.ending-skip')?.addEventListener('click', () => this.ritual?.finish());
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      if (this.phase === 'complete') this.close();
      else this.ritual?.finish();
    });
    dialog.addEventListener('close', () => this.cleanup(), { once: true });
    document.body.append(dialog);
    document.body.classList.add('is-ending-active');
    dialog.showModal();
    if (tribute) this.startRitual();
    else this.showChoice();
  }

  private startRitual(): void {
    if (!this.dialog) return;
    this.ritual?.stop();
    this.dialog.querySelector<HTMLElement>('.ending-panel')!.hidden = true;
    this.dialog.querySelector<HTMLElement>('.ending-theatre')!.hidden = false;
    this.dialog.querySelector<HTMLElement>('.ending-credits')!.hidden = true;
    this.setRitualPhase('gathering');
    this.audio?.playBossBattleMusic();
    this.ritualMusic = true;
    this.ritual = new EndingRitual(this.dialog.querySelector('canvas')!, phase => this.setRitualPhase(phase));
    this.dialog.querySelector<HTMLButtonElement>('.ending-skip')?.focus({ preventScroll: true });
  }

  private setRitualPhase(phase: RitualPhase): void {
    if (!this.dialog) return;
    this.phase = phase;
    this.dialog.dataset.phase = phase;
    if (phase === 'complete') { this.showChoice(); return; }
    const caption = this.dialog.querySelector<HTMLElement>('.ending-caption')!;
    const credits = this.dialog.querySelector<HTMLElement>('.ending-credits')!;
    if (phase !== 'vanishing') credits.hidden = phase !== 'gratitude';
    if (phase === 'vanishing') return;
    const messages: Partial<Record<RitualPhase, string>> = {
      gathering: `<p class="ending-eyebrow">OPUS CONSUMMATUM · A ÚLTIMA PROCISSÃO</p><h1 id="ending-title">Todos os caminhos retornam à Esfera.</h1><p>Quatro guardiões. Um só círculo. O culto se reúne uma última vez.</p>`,
      invocation: `<p class="ending-eyebrow">O SELO DA CRIAÇÃO</p><h1 id="ending-title">A criação reconhece sua luz.</h1><p>Os antigos adversários oferecem seus selos. Os fiéis erguem sua última prece.</p>`,
      gratitude: `<p class="ending-eyebrow">VOCÊ COMPLETOU O JOGO</p><h1 id="ending-title">Obrigado por chegar até aqui.</h1><p>Da primeira centelha ao domínio do Caos, sua devoção deu vida à Esfera.<br>Esta homenagem é para você.</p>`,
    };
    caption.innerHTML = messages[phase] ?? '<h1 id="ending-title" class="ending-sr-only">O ritual se encerra</h1>';
  }

  private stopRitual(): void {
    this.ritual?.stop();
    this.ritual = undefined;
    if (this.ritualMusic) this.audio?.stopBossBattleMusic();
    this.ritualMusic = false;
  }

  private showChoice(): void {
    if (!this.dialog) return;
    this.stopRitual();
    this.phase = 'complete';
    this.dialog.dataset.phase = 'complete';
    const theatre = this.dialog.querySelector<HTMLElement>('.ending-theatre')!;
    theatre.hidden = true;
    // Keep a single accessible heading when the cinematic is replaced by the card.
    this.dialog.querySelector('.ending-caption')!.replaceChildren();
    this.dialog.querySelector<HTMLElement>('.ending-panel')!.hidden = false;
    const copy = this.dialog.querySelector<HTMLElement>('.ending-copy')!;
    const actions = this.dialog.querySelector<HTMLElement>('.ending-actions')!;
    actions.replaceChildren();
    if (this.gs.campaignEnding === 'pending') {
      this.gs.campaignEnding = 'completed';
      this.save();
    }
    copy.innerHTML = `<p class="ending-eyebrow">A ETERNIDADE É SUA</p><h1 id="ending-title">JOGO LIVRE? (LEADERBOARD)</h1><p>A jornada foi concluída. Seu culto pode continuar.<br>Expanda sua criação e enfrente novamente os guardiões para superar seus recordes.</p><details class="ending-records"><summary>Leaderboard local · seus melhores tempos</summary><p>Recordes deste save. Ranking online ainda indisponível.</p><ol>${GNOSE_BOSSES.map(boss => {
      const time = this.gs.getBossBestTimeSec(boss.id);
      return `<li><span>${boss.name}</span><strong>${time === undefined ? 'Sem registro' : `${time.toFixed(1)} s`}</strong></li>`;
    }).join('')}</ol><p>Fé acumulada: ${formatNumber(this.gs.totalFaithAccumulated)} · Ascensões: ${this.gs.gnoseResets}</p></details>`;
    this.button(actions, 'Sim, continuar em jogo livre', () => {
      this.gs.campaignEnding = 'freeplay';
      this.save();
      this.close();
    });
    this.button(actions, 'Rever ritual', () => this.startRitual());
    this.button(actions, 'Agora não', () => this.close());
    actions.querySelector('button')?.focus({ preventScroll: true });
  }

  private button(parent: HTMLElement, label: string, action: () => void): void {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', action);
    parent.append(button);
  }

  private close(): void { this.dialog?.close(); }

  private cleanup(): void {
    this.stopRitual();
    document.body.classList.remove('is-ending-active');
    this.dialog?.remove();
    this.dialog = undefined;
    this.update();
    if (!this.launcher.hidden) this.launcher.focus({ preventScroll: true });
  }
}
