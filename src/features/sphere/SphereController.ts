import { GameStateManager } from '../../core/GameState.js';
import { AudioManager } from '../../systems/audio.js';
import { NotificationManager } from '../../systems/notifications.js';
import { calculateMiracleReward, formatNumber } from '../../systems/calculations.js';
import { events, GameEvents } from '../../core/EventBus.js';
import { effectEasing } from '../../ui/visualTiming.js';
import { SphereSprite } from './SphereSprite.js';

export interface SphereControllerOptions {
  gameState: GameStateManager;
  audio: AudioManager;
  notifications: NotificationManager;
  triggerHaptic: (pattern: number | number[]) => void;
}

export class SphereController {
  private gameState: GameStateManager;
  private audio: AudioManager;
  private notifications: NotificationManager;
  private triggerHaptic: (pattern: number | number[]) => void;

  private divineSphereBtn: HTMLElement | null = null;
  private sphereAnimation: SphereSprite | null = null;
  private sphereGlobe: HTMLElement | null = null;
  private shockPool: HTMLElement[] = [];
  private shockIndex: number = 0;
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  constructor(options: SphereControllerOptions) {
    this.gameState = options.gameState;
    this.audio = options.audio;
    this.notifications = options.notifications;
    this.triggerHaptic = options.triggerHaptic;

    this.initElements();
    this.bindEvents();
  }

  private initElements(): void {
    this.divineSphereBtn = document.getElementById('divine-sphere-btn');
    if (!this.divineSphereBtn) return;

    // The sprite contains both rotation directions; pulse its canvas on clicks.
    this.divineSphereBtn.innerHTML =
      '<canvas class="sphere-layer sphere-globe sphere-sprite" aria-hidden="true"></canvas>';
    const canvas = this.divineSphereBtn.querySelector<HTMLCanvasElement>('.sphere-sprite')!;
    this.sphereGlobe = canvas;
    this.sphereAnimation = new SphereSprite(canvas);
    for (let i = 0; i < 3; i++) {
      const wave = document.createElement('span');
      wave.className = 'sphere-shock';
      this.divineSphereBtn.appendChild(wave);
      this.shockPool.push(wave);
    }
  }

  // Click feedback: the sprite pulses and a gold wave spreads, preserving rotation.
  // Transform/opacity only, so it all runs on the compositor.
  private playClickAnimation(isCrit: boolean): void {
    if (!this.sphereGlobe || this.reducedMotion.matches) return;

    this.sphereGlobe.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(0.95)', offset: 0.3 }, { transform: 'scale(1.03)', offset: 0.65 }, { transform: 'scale(1)' }],
      { duration: 340, easing: effectEasing(340) }
    );

    const waves = isCrit ? 2 : 1;
    for (let i = 0; i < waves; i++) {
      const wave = this.shockPool[this.shockIndex++ % this.shockPool.length];
      wave.classList.toggle('crit', isCrit);
      wave.animate(
        [{ transform: 'scale(0.4)', opacity: 1 }, { transform: `scale(${isCrit ? 1.55 : 1.35})`, opacity: 0 }],
        { duration: 700, delay: i * 150, easing: effectEasing(700), fill: 'backwards' }
      );
    }
  }

  private bindEvents(): void {
    this.divineSphereBtn?.addEventListener('click', (e: MouseEvent) => {
      this.onSphereClicked(e);
    });
  }

  public destroy(): void {
    this.sphereAnimation?.destroy();
  }

  public onSphereClicked(e?: MouseEvent): void {
    this.audio.init();
    this.triggerHaptic(8);
    const { fpc, isCrit } = this.gameState.addClick();

    events.emit(GameEvents.FAITH_CHANGED, fpc);
    events.emit(GameEvents.STATE_CHANGED);

    if (isCrit) {
      this.audio.playTone(920, 'triangle', 0.18);
      this.triggerHaptic([20, 40, 20]);
    } else {
      this.audio.playTone(580 + Math.random() * 180, 'sine', 0.08);
    }

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    if (e && e.clientX && e.clientY) {
      x = e.clientX;
      y = e.clientY;
    }
    const label = isCrit ? `✦ CRÍTICO! +${formatNumber(fpc)} FÉ` : `+${formatNumber(fpc)} FÉ`;
    this.spawnFloatingText(x, y, label);
    this.playClickAnimation(isCrit);
  }

  public grantMiracle(clientX: number, clientY: number): number {
    this.audio.init();

    // Sacred chord chime progression
    this.audio.playTone(523.25, 'sine', 0.14);
    setTimeout(() => this.audio.playTone(659.25, 'sine', 0.16), 60);
    setTimeout(() => this.audio.playTone(783.99, 'sine', 0.2), 120);
    setTimeout(() => this.audio.playTone(1046.50, 'triangle', 0.3), 180);

    const fps = this.gameState.getFaithPerSecond();
    const currentFaith = this.gameState.faithPoints;

    // Fórmula: 30x produção/s + 10% da Fé atual acumulada
    const finalReward = calculateMiracleReward(currentFaith, this.gameState.getFaithPerClick(), fps);

    this.gameState.faithPoints += finalReward;
    this.gameState.totalFaithAccumulated += finalReward;
    this.triggerHaptic([20, 30, 20]);

    this.spawnFloatingText(clientX, clientY, `MILAGRE! +${formatNumber(finalReward)} FÉ`);

    this.notifications.showCustomPopup(
      'Milagre Concedido!',
      `Um fiel pediu um sinal, e você respondeu: +${formatNumber(finalReward)} Fé.`,
      '',
      'GRAÇA DIVINA'
    );

    events.emit(GameEvents.MIRACLE_GRANTED, finalReward);
    events.emit(GameEvents.STATE_CHANGED);

    return finalReward;
  }

  public spawnFloatingText(x: number, y: number, text: string): void {
    const floatEl = document.createElement('div');
    floatEl.className = 'floating-faith-num';
    floatEl.textContent = text;
    floatEl.style.left = `${x}px`;
    floatEl.style.top = `${y}px`;

    document.body.appendChild(floatEl);
    setTimeout(() => {
      floatEl.remove();
    }, 850);
  }
}
