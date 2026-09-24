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

  private fervorCounterEl: HTMLElement | null = null;
  private fervorRateCounterEl: HTMLElement | null = null;
  private fervorCounterHudEl: HTMLElement | null = null;
  private fervorRateCounterHudEl: HTMLElement | null = null;

  private relicCounterHudEl: HTMLElement | null = null;
  private relicRateCounterHudEl: HTMLElement | null = null;

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

    this.fervorCounterEl = document.getElementById('fervor-counter');
    this.fervorRateCounterEl = document.getElementById('fervor-rate-counter');
    this.fervorCounterHudEl = document.getElementById('fervor-counter-hud');
    this.fervorRateCounterHudEl = document.getElementById('fervor-rate-counter-hud');

    this.relicCounterHudEl = document.getElementById('relic-counter-hud');
    this.relicRateCounterHudEl = document.getElementById('relic-rate-counter-hud');
  }

  private bindEvents(): void {
    events.on(GameEvents.STATE_CHANGED, () => this.update());
    events.on(GameEvents.GAME_TICK, () => this.update());
  }

  public update(): void {
    const faithInt = Math.floor(this.gameState.faithPoints);
    if (this.faithCounterEl) {
      this.faithCounterEl.textContent = formatNumber(faithInt);
    }

    const fps = this.gameState.getFaithPerSecond();
    const isBoosted = this.gameState.incarnationBoostTimer > 0;
    if (this.faithPerSecCounterEl) {
      this.faithPerSecCounterEl.textContent = `${formatNumber(fps)}/s${isBoosted ? ' (2x)' : ''}`;
      this.faithPerSecCounterEl.classList.toggle('boosted', isBoosted);
    }

    if (this.followersCounterEl) {
      this.followersCounterEl.textContent = formatNumber(this.gameState.getTotalFollowersCount());
    }

    const fpc = this.gameState.getFaithPerClick();
    if (this.sphereClickValEl) {
      this.sphereClickValEl.textContent = `+${formatNumber(fpc)} Fé`;
    }

    const fervor = Math.floor(this.gameState.fervorPoints);
    const fervorRate = this.gameState.getFervorRatePerSecond();
    if (this.fervorCounterEl) {
      this.fervorCounterEl.textContent = formatNumber(fervor);
    }
    if (this.fervorRateCounterEl) {
      this.fervorRateCounterEl.textContent = `+${fervorRate.toFixed(1)} / seg`;
    }
    if (this.fervorCounterHudEl) {
      this.fervorCounterHudEl.textContent = formatNumber(fervor);
    }
    if (this.fervorRateCounterHudEl) {
      this.fervorRateCounterHudEl.textContent = `${fervorRate.toFixed(1)}/s`;
    }

    const relic = Math.floor(this.gameState.relicPoints);
    const relicRate = this.gameState.getRelicsRatePerSecond();
    if (this.relicCounterHudEl) {
      this.relicCounterHudEl.textContent = formatNumber(relic);
    }
    if (this.relicRateCounterHudEl) {
      this.relicRateCounterHudEl.textContent = `${relicRate.toFixed(1)}/s`;
    }
  }
}
