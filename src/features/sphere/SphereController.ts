import { canUseGameplayShortcut } from '../../ui/GameplayShortcuts.js';
import { GameStateManager } from '../../core/GameState.js';
import { AudioManager } from '../../systems/audio.js';
import { formatNumber } from '../../systems/calculations.js';
import { events, GameEvents } from '../../core/EventBus.js';
import { effectEasing } from '../../ui/visualTiming.js';
import { AutoclickSatelliteVisual } from './AutoclickSatellite.js';
import { SphereVisual } from './SphereVisual.js';

export interface SphereControllerOptions {
  gameState: GameStateManager;
  audio: AudioManager;
  triggerHaptic: (pattern: number | number[]) => void;
}

export class SphereController {
  private gameState: GameStateManager;
  private audio: AudioManager;
  private triggerHaptic: (pattern: number | number[]) => void;

  private divineSphereBtn: HTMLElement | null = null;
  private sphereAnimation: SphereVisual | null = null;
  private autoclickVisual: AutoclickSatelliteVisual | null = null;
  private unsubscribeState?: () => void;
  private unsubscribeTick?: () => void;
  private lastAutoClick: ReturnType<GameStateManager['getLastSphereAutoclick']> = null;
  private sphereGlobe: HTMLElement | null = null;
  private shockPool: HTMLElement[] = [];
  private shockIndex: number = 0;
  private floatingPool: HTMLDivElement[] = [];
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  constructor(options: SphereControllerOptions) {
    this.gameState = options.gameState;
    this.audio = options.audio;
    this.triggerHaptic = options.triggerHaptic;

    this.initElements();
    this.bindEvents();
  }

  private initElements(): void {
    this.divineSphereBtn = document.getElementById('divine-sphere-btn');
    if (!this.divineSphereBtn) return;

    // Pulse the wrapper independently of the approved animation inside it.
    this.divineSphereBtn.innerHTML =
      '<div class="sphere-layer sphere-globe sphere-sprite" aria-hidden="true"></div>';
    this.sphereGlobe = this.divineSphereBtn.querySelector<HTMLElement>('.sphere-sprite')!;
    this.sphereAnimation = new SphereVisual(this.sphereGlobe);
    const wrapper = this.divineSphereBtn.parentElement;
    if (wrapper) {
      this.autoclickVisual = new AutoclickSatelliteVisual(wrapper);
    }
    this.syncProgress();
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
    this.divineSphereBtn?.addEventListener('click', this.handleClick);
    document.addEventListener('keydown', this.handleKeyDown);
    this.unsubscribeState = events.on(GameEvents.STATE_CHANGED, this.syncProgress);
    this.unsubscribeTick = events.on(GameEvents.GAME_TICK, this.syncProgress);
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (this.gameState.activeBossBattle) return;
    if ((event.code !== 'Space' && event.key !== ' ') || !this.divineSphereBtn
      || !canUseGameplayShortcut(event, { allowedControl: this.divineSphereBtn })) return;
    // One click per press, with the same feedback as the mouse.
    event.preventDefault();
    if (!event.repeat) this.onSphereClicked();
  };

  private handleClick = (e: MouseEvent): void => {
    if (!e.isTrusted || this.gameState.activeBossBattle) return;
    this.onSphereClicked(e);
  };

  public syncProgress = (): void => {
    this.sphereAnimation?.setProgress(this.gameState.isIncarnationUnlocked(), this.gameState.incarnationStage);
    if (!this.autoclickVisual) return;
    const phase = this.gameState.getSphereAutoclickProgress();
    const rate = this.gameState.getSphereAutoclickRate();
    this.autoclickVisual.syncState(phase, rate);

    const autoClick = this.gameState.getLastSphereAutoclick();
    const clicked = autoClick !== null && autoClick !== this.lastAutoClick;
    this.lastAutoClick = autoClick;
    if (phase === null || !clicked || !autoClick) return;

    const canShowDom =
      document.visibilityState !== 'hidden' && Boolean(this.divineSphereBtn?.getClientRects().length);
    const impactPos = this.autoclickVisual.triggerImpact(autoClick.isCrit, canShowDom);
    if (canShowDom && impactPos) {
      this.sphereAnimation?.reactToClick();
      this.playClickAnimation(autoClick.isCrit);
      const label = autoClick.isCrit
        ? `✦ CRÍTICO! +${formatNumber(autoClick.fpc)} FÉ`
        : `+${formatNumber(autoClick.fpc)} FÉ`;
      this.spawnFloatingText(impactPos.clientX, impactPos.clientY, label, true);
    }
  };

  public destroy(): void {
    this.unsubscribeState?.();
    this.unsubscribeTick?.();
    this.divineSphereBtn?.removeEventListener('click', this.handleClick);
    document.removeEventListener('keydown', this.handleKeyDown);
    this.sphereAnimation?.destroy();
    this.autoclickVisual?.destroy();
    for (let i = 0; i < this.floatingPool.length; i++) {
      this.floatingPool[i].remove();
    }
    this.floatingPool.length = 0;
  }

  public onSphereClicked(e?: MouseEvent): void {
    if (this.gameState.activeBossBattle) return;
    this.audio.init();
    this.triggerHaptic(8);
    const { fpc, isCrit } = this.gameState.addClick();

    events.emit(GameEvents.FAITH_CHANGED, fpc);
    events.emit(GameEvents.STATE_CHANGED);
    this.sphereAnimation?.reactToClick();

    if (isCrit) {
      this.audio.playTone(920, 'triangle', 0.18);
      this.triggerHaptic([20, 40, 20]);
    } else {
      this.audio.playTone(580 + Math.random() * 180, 'sine', 0.08);
    }

    const sphereRect = this.divineSphereBtn?.getBoundingClientRect();
    let x = sphereRect ? sphereRect.left + sphereRect.width / 2 : window.innerWidth / 2;
    let y = sphereRect ? sphereRect.top + 8 : window.innerHeight / 2;
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

    // Fórmula escala gradualmente com as conquistas de fiéis; o saldo não entra no cálculo.
    const finalReward = this.gameState.getMiracleReward();

    this.gameState.faithPoints += finalReward;
    this.gameState.totalFaithAccumulated += finalReward;
    this.triggerHaptic([20, 30, 20]);

    this.spawnFloatingText(clientX, clientY, `MILAGRE! +${formatNumber(finalReward)} FÉ`);

    events.emit(GameEvents.MIRACLE_GRANTED, finalReward);
    events.emit(GameEvents.STATE_CHANGED);

    return finalReward;
  }

  public spawnFloatingText(x: number, y: number, text: string, small = false): void {
    let floatEl = this.floatingPool.pop();
    const nextClass = small ? 'floating-faith-num is-small' : 'floating-faith-num';
    if (!floatEl || !floatEl.isConnected) {
      floatEl = document.createElement('div');
      floatEl.className = nextClass;
      floatEl.textContent = text;
      floatEl.style.left = `${x}px`;
      floatEl.style.top = `${y}px`;
      document.body.appendChild(floatEl);
    } else {
      if (floatEl.className !== nextClass) floatEl.className = nextClass;
      floatEl.textContent = text;
      floatEl.style.left = `${x}px`;
      floatEl.style.top = `${y}px`;
      floatEl.hidden = false;
    }

    const ref = floatEl;
    setTimeout(() => {
      if (!ref.isConnected) return;
      if (this.floatingPool.length < 24) {
        ref.hidden = true;
        this.floatingPool.push(ref);
      } else {
        ref.remove();
      }
    }, 850);
  }
}
