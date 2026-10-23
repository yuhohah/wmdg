import { GameStateManager } from '../../core/GameState.js';
import { AudioManager } from '../../systems/audio.js';
import { NotificationManager } from '../../systems/notifications.js';
import { formatNumber } from '../../systems/calculations.js';
import { events, GameEvents } from '../../core/EventBus.js';

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
  }

  private bindEvents(): void {
    this.divineSphereBtn?.addEventListener('click', (e: MouseEvent) => {
      this.onSphereClicked(e);
    });
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
    const baseFromFps = 30 * fps;
    const bonusFromStockpile = 0.10 * currentFaith;
    const minReward = Math.max(30, this.gameState.getFaithPerClick() * 15);
    const calculated = Math.floor(baseFromFps + bonusFromStockpile);
    const finalReward = Math.max(minReward, calculated);

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
