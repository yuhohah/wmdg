import { canUseGameplayShortcut } from '../../ui/GameplayShortcuts.js';
import { GameStateManager } from '../../core/GameState.js';
import { AudioManager } from '../../systems/audio.js';
import { calculateMiracleReward, formatNumber } from '../../systems/calculations.js';
import { events, GameEvents } from '../../core/EventBus.js';
import { effectEasing } from '../../ui/visualTiming.js';
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
  private unsubscribeState?: () => void;
  private unsubscribeTick?: () => void;
  private satellite: HTMLElement | null = null;
  private satelliteOrb: HTMLElement | null = null;
  private wrapperWidth = 400;
  private wrapperHeight = 400;
  private wrapperObserver?: ResizeObserver;
  private lastSatelliteTransform = '';
  private lastAutoClick: ReturnType<GameStateManager['getLastSphereAutoclick']> = null;
  private satelliteAngle = 0;
  private sphereGlobe: HTMLElement | null = null;
  private shockPool: HTMLElement[] = [];
  private shockIndex: number = 0;
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
      this.wrapperWidth = wrapper.clientWidth || 400;
      this.wrapperHeight = wrapper.clientHeight || 400;
      if (typeof ResizeObserver !== 'undefined') {
        this.wrapperObserver = new ResizeObserver((entries) => {
          const rect = entries[entries.length - 1]?.contentRect;
          if (rect && rect.width > 0 && rect.height > 0) {
            this.wrapperWidth = rect.width;
            this.wrapperHeight = rect.height;
          }
        });
        this.wrapperObserver.observe(wrapper);
      }
      this.satellite = document.createElement('span');
      this.satellite.className = 'sphere-autoclick-satellite';
      this.satellite.hidden = true;
      this.satellite.setAttribute('role', 'img');
      this.satellite.setAttribute('aria-label', 'Satélite da Gnose: 1 clique automático por segundo');
      this.satellite.title = 'Satélite da Gnose · 1 clique por segundo';
      this.satellite.innerHTML = '<span class="autoclick-orb"></span>';
      this.satelliteOrb = this.satellite.firstElementChild as HTMLElement | null;
      wrapper.appendChild(this.satellite);
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
    this.unsubscribeTick = events.on<number>(GameEvents.GAME_TICK, (deltaSec) => {
      this.satelliteAngle = (this.satelliteAngle + deltaSec * Math.PI / 4) % (Math.PI * 2);
      this.syncProgress();
    });
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if ((event.code !== 'Space' && event.key !== ' ') || !this.divineSphereBtn
      || !canUseGameplayShortcut(event, { allowedControl: this.divineSphereBtn })) return;
    // One click per press, with the same feedback and combat listeners as the mouse.
    event.preventDefault();
    if (!event.repeat) this.divineSphereBtn.click();
  };

  private handleClick = (e: MouseEvent): void => this.onSphereClicked(e);

  public syncProgress = (): void => {
    this.sphereAnimation?.setProgress(this.gameState.isIncarnationUnlocked(), this.gameState.incarnationStage);
    if (!this.satellite) return;
    const phase = this.gameState.getSphereAutoclickProgress();
    const shouldHide = phase === null;
    if (this.satellite.hidden !== shouldHide) this.satellite.hidden = shouldHide;
    const autoClick = this.gameState.getLastSphereAutoclick();
    const clicked = autoClick !== null && autoClick !== this.lastAutoClick;
    this.lastAutoClick = autoClick;
    if (phase === null) return;
    // At the click boundary the moon touches the globe, recoils, then falls inward again.
    const distance = phase < 0.25
      ? Math.sin((phase / 0.25) * Math.PI / 2)
      : phase < 0.55 ? 1 : Math.cos(((phase - 0.55) / 0.45) * Math.PI / 2);
    const radius = this.reducedMotion.matches ? 40 : 26 + distance * 17;
    const angle = this.reducedMotion.matches ? -Math.PI / 4 : this.satelliteAngle;
    const dx = Math.cos(angle) * (radius / 100) * this.wrapperWidth;
    const dy = Math.sin(angle) * (radius / 100) * this.wrapperHeight;
    const transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
    if (transform !== this.lastSatelliteTransform) {
      this.lastSatelliteTransform = transform;
      this.satellite.style.transform = transform;
    }
    if (clicked && autoClick
      && document.visibilityState !== 'hidden' && this.divineSphereBtn?.getClientRects().length) {
      this.sphereAnimation?.reactToClick();
      this.playClickAnimation(autoClick.isCrit);
      const rect = this.satellite.parentElement!.getBoundingClientRect();
      const contactRadius = this.reducedMotion.matches ? 0.40 : 0.26;
      const x = rect.left + rect.width * (0.5 + Math.cos(angle) * contactRadius);
      const y = rect.top + rect.height * (0.5 + Math.sin(angle) * contactRadius);
      const label = autoClick.isCrit
        ? `✦ CRÍTICO! +${formatNumber(autoClick.fpc)} FÉ`
        : `+${formatNumber(autoClick.fpc)} FÉ`;
      this.spawnFloatingText(x, y, label, true);
      if (!this.reducedMotion.matches && this.satelliteOrb) this.satelliteOrb.animate(
        [{ transform: 'scale(0.8)' },
          { transform: 'scale(1.18)', offset: 0.4 },
          { transform: 'scale(1)' }],
        { duration: 280, easing: effectEasing(280) }
      );
    }
  };

  public destroy(): void {
    this.wrapperObserver?.disconnect();
    this.unsubscribeState?.();
    this.unsubscribeTick?.();
    this.divineSphereBtn?.removeEventListener('click', this.handleClick);
    document.removeEventListener('keydown', this.handleKeyDown);
    this.sphereAnimation?.destroy();
    this.satellite?.remove();
  }

  public onSphereClicked(e?: MouseEvent): void {
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

    const fps = this.gameState.getFaithPerSecond();
    const currentFaith = this.gameState.faithPoints;

    // Maior entre 30 Fé, 15 cliques e 30 segundos de produção; o saldo não entra no cálculo.
    const finalReward = calculateMiracleReward(currentFaith, this.gameState.getFaithPerClick(), fps);

    this.gameState.faithPoints += finalReward;
    this.gameState.totalFaithAccumulated += finalReward;
    this.triggerHaptic([20, 30, 20]);

    this.spawnFloatingText(clientX, clientY, `MILAGRE! +${formatNumber(finalReward)} FÉ`);

    events.emit(GameEvents.MIRACLE_GRANTED, finalReward);
    events.emit(GameEvents.STATE_CHANGED);

    return finalReward;
  }

  public spawnFloatingText(x: number, y: number, text: string, small = false): void {
    const floatEl = document.createElement('div');
    floatEl.className = small ? 'floating-faith-num is-small' : 'floating-faith-num';
    floatEl.textContent = text;
    floatEl.style.left = `${x}px`;
    floatEl.style.top = `${y}px`;

    document.body.appendChild(floatEl);
    setTimeout(() => {
      floatEl.remove();
    }, 850);
  }
}
