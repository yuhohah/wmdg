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
  private satelliteNodes: NodeListOf<HTMLElement> | null = null;

  constructor(options: SphereControllerOptions) {
    this.gameState = options.gameState;
    this.audio = options.audio;
    this.notifications = options.notifications;
    this.triggerHaptic = options.triggerHaptic;

    this.initElements();
    this.bindEvents();
    this.renderSatellites();
  }

  private initElements(): void {
    this.divineSphereBtn = document.getElementById('divine-sphere-btn');
    this.satelliteNodes = document.querySelectorAll<HTMLElement>('.sphere-satellite-node');
  }

  private bindEvents(): void {
    this.divineSphereBtn?.addEventListener('click', (e: MouseEvent) => {
      this.onSphereClicked(e);
    });

    this.satelliteNodes?.forEach((node) => {
      const idxStr = node.getAttribute('data-node-index');
      const idx = idxStr ? parseInt(idxStr, 10) : 0;
      node.addEventListener('click', (e: MouseEvent) => {
        e.stopPropagation();
        if (this.isSatelliteUnlocked(idx)) {
          this.onSatelliteClicked(idx, e);
        } else {
          this.audio.playTone(220, 'sine', 0.08);
          const clientX = e.clientX || window.innerWidth / 2;
          const clientY = e.clientY || window.innerHeight / 2;
          this.spawnFloatingText(clientX, clientY, 'NÓ DORMENTE');
        }
      });
    });
  }

  public onSphereClicked(e?: MouseEvent): void {
    this.audio.init();
    this.triggerHaptic(8);
    const fpc = this.gameState.getFaithPerClick();

    this.gameState.faithPoints += fpc;
    this.gameState.totalFaithAccumulated += fpc;
    this.gameState.totalClicks += 1;

    events.emit(GameEvents.FAITH_CHANGED, fpc);
    events.emit(GameEvents.STATE_CHANGED);

    this.audio.playTone(580 + Math.random() * 180, 'sine', 0.08);

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    if (e && e.clientX && e.clientY) {
      x = e.clientX;
      y = e.clientY;
    }
    this.spawnFloatingText(x, y, `+${formatNumber(fpc)} FÉ`);
  }

  public onSatelliteClicked(idx: number, e: MouseEvent): void {
    this.triggerHaptic(12);
    this.onSphereClicked(e);
    this.audio.playTone(740 + idx * 45, 'triangle', 0.12);
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
      `A prece fervorosa foi atendida: +${formatNumber(finalReward)} Fé cósmica!`,
      '',
      'GRAÇA DIVINA'
    );

    events.emit(GameEvents.MIRACLE_GRANTED, finalReward);
    events.emit(GameEvents.STATE_CHANGED);

    return finalReward;
  }

  public unlockSatellite(index: number): void {
    if (index >= 0 && index < 6) {
      this.gameState.sphereSatellitesUnlocked[index] = true;
      this.renderSatellites();
      this.audio.playTone(880, 'sine', 0.25);
      events.emit(GameEvents.STATE_CHANGED);
    }
  }

  public lockSatellite(index: number): void {
    if (index >= 0 && index < 6) {
      this.gameState.sphereSatellitesUnlocked[index] = false;
      this.renderSatellites();
      events.emit(GameEvents.STATE_CHANGED);
    }
  }

  public isSatelliteUnlocked(index: number): boolean {
    return !!this.gameState.sphereSatellitesUnlocked[index];
  }

  public renderSatellites(): void {
    if (!this.satelliteNodes) {
      this.satelliteNodes = document.querySelectorAll<HTMLElement>('.sphere-satellite-node');
    }
    this.satelliteNodes?.forEach((node) => {
      const idxStr = node.getAttribute('data-node-index');
      const idx = idxStr ? parseInt(idxStr, 10) : 0;
      const isUnlocked = !!this.gameState.sphereSatellitesUnlocked[idx];
      if (isUnlocked) {
        node.classList.remove('state-locked');
        node.classList.add('state-unlocked');
        node.setAttribute('title', `Santuário Satélite ${this.getRomanNumeral(idx + 1)} (Desbloqueado)`);
      } else {
        node.classList.remove('state-unlocked');
        node.classList.add('state-locked');
        node.setAttribute('title', `Santuário Satélite ${this.getRomanNumeral(idx + 1)} (Oculto / Bloqueado)`);
      }
    });
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

  private getRomanNumeral(num: number): string {
    const romans = ['I', 'II', 'III', 'IV', 'V', 'VI'];
    return romans[num - 1] || `${num}`;
  }
}
