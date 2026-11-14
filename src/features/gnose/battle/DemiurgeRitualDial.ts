import type { BossRift } from '../../../types.js';
import { ritualPointer, ritualJudgement, RITUAL_SAFE_HALF_WIDTH } from '../../../systems/demiurgeRitual.js';

/** Render and click judgement share the last displayed needle position. */
export class DemiurgeRitualDial {
  readonly element = document.createElement('button');
  private remaining = -1;
  private observedAt = 0;
  private position = -1;
  private displayedElapsed = 0;
  private needle: SVGGElement;
  private readout: HTMLElement;
  constructor(readonly id: string, resolve: (position: number) => void) {
    const b = this.element;
    b.type = 'button'; b.className = 'boss-rift-target demiurge-ritual-dial';
    b.dataset.riftId = id;
    b.setAttribute('aria-label', 'Ritual Sol e Lua: clique, toque ou pressione espaço para parar o ponteiro na faixa verde central');
    const half = RITUAL_SAFE_HALF_WIDTH * 72 * Math.PI / 180;
    const x = 120 * Math.sin(half), y = 160 - 120 * Math.cos(half);
    b.innerHTML = `<strong>SOL E LUA</strong>
      <svg viewBox="0 0 320 190" aria-hidden="true">
        <path class="ritual-track" d="M45.87 122.92 A120 120 0 0 1 274.13 122.92"/>
        <path class="ritual-safe" d="M${160-x} ${y} A120 120 0 0 1 ${160+x} ${y}"/>
        <text x="24" y="148" class="ritual-moon">☾</text><text x="296" y="148" class="ritual-sun">☀</text>
        <text x="160" y="20" class="ritual-center-label">ACERTE AQUI</text>
        <g class="ritual-needle"><path d="M160 160 L160 43"/><path d="M154 53 L160 40 L166 53"/></g>
        <circle cx="160" cy="160" r="6" fill="#ead8ac"/>
      </svg><span class="ritual-readout"></span><span>Parar ponteiro · 2 idas e voltas</span>
      <small>Lua: cura o boss · Sol: fere a Esfera<br>Sem ação: cura máxima ao terminar na Lua</small>`;
    this.needle = b.querySelector<SVGGElement>('.ritual-needle')!;
    this.readout = b.querySelector<HTMLElement>('.ritual-readout')!;
    b.addEventListener('click', event => { event.stopPropagation(); b.disabled = true; resolve(this.position); });
  }
  update(rift: BossRift, speed: number): void {
    const now = performance.now();
    if (rift.remainingSec !== this.remaining) { this.remaining = rift.remainingSec; this.observedAt = now; }
    const extrapolation = Math.min(0.1, (now - this.observedAt) / 1000) * Math.max(0, speed);
    this.displayedElapsed = Math.max(this.displayedElapsed, Math.min(rift.maxSec, rift.maxSec - rift.remainingSec + extrapolation));
    this.position = ritualPointer(this.displayedElapsed);
    this.needle.setAttribute('transform', `rotate(${this.position * 72} 160 160)`);
    const result = ritualJudgement(this.position);
    this.readout.textContent = result.side === 'center' ? 'Zona verde · aparar' :
      `${result.side === 'moon' ? 'Lua · cura' : 'Sol · dano'} ${result.percent.toFixed(1)}%`;
    this.element.classList.toggle('in-safe-zone', result.side === 'center');
  }
}
