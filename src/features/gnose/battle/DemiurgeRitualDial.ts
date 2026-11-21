import type { BossRift } from '../../../types.js';
import {
  ritualPointer,
  ritualJudgement,
  ritualPassInfo,
  RITUAL_SAFE_HALF_WIDTH,
} from '../../../systems/demiurgeRitual.js';
import { formatFixed } from '../../../systems/numberFormat.js';

/** Render and click judgement share the last displayed needle position. */
export class DemiurgeRitualDial {
  readonly element = document.createElement('button');
  private remaining = -1;
  private observedAt = 0;
  private position = -1;
  private displayedElapsed = 0;
  private needle: SVGGElement;
  private readout: HTMLElement;
  private passEl: HTMLElement;
  constructor(readonly id: string, resolve: (position: number) => void) {
    const b = this.element;
    b.type = 'button';
    b.className = 'boss-rift-target demiurge-ritual-dial';
    b.dataset.riftId = id;
    b.setAttribute(
      'aria-label',
      'Ritual Sol e Lua: clique ou toque no mostrador quando o ponteiro cruzar a faixa verde central'
    );
    const half = (RITUAL_SAFE_HALF_WIDTH * 72 * Math.PI) / 180;
    const sx = (120 * Math.sin(half)).toFixed(2);
    const sy = (160 - 120 * Math.cos(half)).toFixed(2);
    const txIn = (107 * Math.sin(half)).toFixed(2);
    const tyIn = (160 - 107 * Math.cos(half)).toFixed(2);
    const txOut = (133 * Math.sin(half)).toFixed(2);
    const tyOut = (160 - 133 * Math.cos(half)).toFixed(2);
    b.innerHTML = `
      <header class="ritual-dial-header">
        <strong>RITUAL SOL E LUA</strong>
        <span class="ritual-pass">Passagem 1/4</span>
      </header>
      <svg viewBox="0 0 320 182" aria-hidden="true">
        <path class="ritual-track-moon" d="M45.87 122.92 A120 120 0 0 1 ${160 - Number(sx)} ${sy}"/>
        <path class="ritual-track-sun" d="M${160 + Number(sx)} ${sy} A120 120 0 0 1 274.13 122.92"/>
        <path class="ritual-safe-glow" d="M${160 - Number(sx)} ${sy} A120 120 0 0 1 ${160 + Number(sx)} ${sy}"/>
        <path class="ritual-safe" d="M${160 - Number(sx)} ${sy} A120 120 0 0 1 ${160 + Number(sx)} ${sy}"/>
        <line class="ritual-tick" x1="${160 - Number(txIn)}" y1="${tyIn}" x2="${160 - Number(txOut)}" y2="${tyOut}"/>
        <line class="ritual-tick" x1="${160 + Number(txIn)}" y1="${tyIn}" x2="${160 + Number(txOut)}" y2="${tyOut}"/>
        <text x="26" y="148" class="ritual-moon">☾</text>
        <text x="294" y="148" class="ritual-sun">☀</text>
        <text x="54" y="172" class="ritual-side-caption ritual-moon-caption">CURA BOSS</text>
        <text x="266" y="172" class="ritual-side-caption ritual-sun-caption">FERE ESFERA</text>
        <text x="160" y="21" class="ritual-center-label">▼ APARE AQUI ▼</text>
        <g class="ritual-needle">
          <path d="M160 160 L160 39"/>
          <path d="M153 52 L160 36 L167 52"/>
        </g>
        <circle cx="160" cy="160" r="7" class="ritual-pivot"/>
      </svg>
      <strong class="ritual-readout" role="status" aria-live="polite"></strong>
      <small>Toque quando o ponteiro cruzar o <b>centro verde</b></small>`;
    this.needle = b.querySelector<SVGGElement>('.ritual-needle')!;
    this.readout = b.querySelector<HTMLElement>('.ritual-readout')!;
    this.passEl = b.querySelector<HTMLElement>('.ritual-pass')!;
    b.addEventListener('pointerdown', (event) => event.stopPropagation());
    b.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!event.isTrusted) return;
      b.disabled = true;
      resolve(this.position);
    });
  }
  update(rift: BossRift, speed: number): void {
    const now = performance.now();
    if (rift.remainingSec !== this.remaining) {
      this.remaining = rift.remainingSec;
      this.observedAt = now;
    }
    const extrapolation = Math.min(0.1, (now - this.observedAt) / 1000) * Math.max(0, speed);
    this.displayedElapsed = Math.max(
      this.displayedElapsed,
      Math.min(rift.maxSec, rift.maxSec - rift.remainingSec + extrapolation)
    );
    this.position = ritualPointer(this.displayedElapsed);
    this.needle.setAttribute('transform', `rotate(${(this.position * 72).toFixed(2)} 160 160)`);
    const result = ritualJudgement(this.position);
    const passInfo = ritualPassInfo(this.displayedElapsed);
    this.passEl.textContent =
      passInfo.pass >= passInfo.total
        ? `Última chance (${passInfo.pass}/${passInfo.total})`
        : `Passagem ${passInfo.pass}/${passInfo.total}`;
    this.readout.textContent =
      result.side === 'center'
        ? '\u2726 ZONA VERDE — APARE AGORA! \u2726'
        : `${result.side === 'moon' ? '\u263e Lua · cura boss' : '\u2600 Sol · fere Esfera'} ${formatFixed(result.percent, 1)}%`;
    this.element.classList.toggle('in-safe-zone', result.side === 'center');
    this.element.classList.toggle('is-moon-side', result.side === 'moon');
    this.element.classList.toggle('is-sun-side', result.side === 'sun');
  }
}
