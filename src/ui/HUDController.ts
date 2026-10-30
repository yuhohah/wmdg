import { setText } from './dom.js';
import { GameStateManager } from '../core/GameState.js';
import { formatNumber } from '../systems/calculations.js';
import { events, GameEvents } from '../core/EventBus.js';

export interface HUDControllerOptions {
  gameState: GameStateManager;
}

export class HUDController {
  private gameState: GameStateManager;

  private faithCounterEl: HTMLElement | null = null;
  private faithPerSecCounterEl: HTMLElement | null = null;
  private followersCounterEl: HTMLElement | null = null;
  private sphereClickValEl: HTMLElement | null = null;

  private fervorCounterHudEl: HTMLElement | null = null;
  private fervorRateCounterHudEl: HTMLElement | null = null;

  private relicCounterHudEl: HTMLElement | null = null;
  private relicRateCounterHudEl: HTMLElement | null = null;

  private gnoseCounterHudEl: HTMLElement | null = null;
  private gnoseMultCounterHudEl: HTMLElement | null = null;

  constructor(options: HUDControllerOptions) {
    this.gameState = options.gameState;
    this.initElements();
    this.bindEvents();
    this.update();
  }

  private initElements(): void {
    this.faithCounterEl = document.getElementById('faith-counter');
    this.faithPerSecCounterEl = document.getElementById('faith-per-sec-counter');
    this.followersCounterEl = document.getElementById('followers-counter');
    this.sphereClickValEl = document.getElementById('sphere-click-val');

    this.fervorCounterHudEl = document.getElementById('fervor-counter-hud');
    this.fervorRateCounterHudEl = document.getElementById('fervor-rate-counter-hud');

    this.relicCounterHudEl = document.getElementById('relic-counter-hud');
    this.relicRateCounterHudEl = document.getElementById('relic-rate-counter-hud');

    this.gnoseCounterHudEl = document.getElementById('gnose-counter-hud');
    this.gnoseMultCounterHudEl = document.getElementById('gnose-mult-counter-hud');
  }

  private bindEvents(): void {
    events.on(GameEvents.STATE_CHANGED, () => this.update());
    events.on(GameEvents.GAME_TICK, () => this.update());
  }

  public update(): void {
    const faithInt = Math.floor(this.gameState.faithPoints);
    if (this.faithCounterEl) {
      setText(this.faithCounterEl, formatNumber(faithInt));
    }

    const fps = this.gameState.getFaithPerSecond();
    const isBoosted = this.gameState.incarnationBoostTimer > 0;
    if (this.faithPerSecCounterEl) {
      setText(this.faithPerSecCounterEl, `${formatNumber(fps)}/s${isBoosted ? ' (2x)' : ''}`);
      this.faithPerSecCounterEl.classList.toggle('boosted', isBoosted);
    }

    if (this.followersCounterEl) {
      setText(this.followersCounterEl, formatNumber(this.gameState.getTotalFollowersCount()));
    }

    const fervor = Math.floor(this.gameState.fervorPoints);
    const fervorRate = this.gameState.getFervorRatePerSecond();
    if (this.fervorCounterHudEl) {
      setText(this.fervorCounterHudEl, formatNumber(fervor));
    }
    if (this.fervorRateCounterHudEl) {
      setText(this.fervorRateCounterHudEl, `${formatNumber(fervorRate)}/s`);
    }

    const relic = Math.floor(this.gameState.relicPoints);
    const relicRate = this.gameState.getRelicsRatePerSecond();
    if (this.relicCounterHudEl) {
      setText(this.relicCounterHudEl, formatNumber(relic));
    }
    if (this.relicRateCounterHudEl) {
      setText(this.relicRateCounterHudEl, `${formatNumber(relicRate)}/s`);
    }

    const gnose = Math.floor(this.gameState.gnosePoints);
    const gnoseMult = this.gameState.getTotalGnosePassiveMultiplier();
    if (this.gnoseCounterHudEl) {
      setText(this.gnoseCounterHudEl, formatNumber(gnose));
    }
    if (this.gnoseMultCounterHudEl) {
      setText(this.gnoseMultCounterHudEl, `×${formatNumber(gnoseMult)}`);
    }
  }

  public updateCard(id: string): void {
    if (id === 'card-altar-sphere') {
      setText(this.sphereClickValEl, `+${formatNumber(this.gameState.getFaithPerClick())} Fé`);
    }
  }
}
