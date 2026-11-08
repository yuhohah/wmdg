import type { MechanicUnlock } from '../../types.js';
import { GameStateManager } from '../../core/GameState.js';
import { AudioManager } from '../../systems/audio.js';
import { formatNumber } from '../../systems/calculations.js';
import { events, GameEvents } from '../../core/EventBus.js';
import { icon } from '../../ui/icons.js';

export interface UnlocksTabOptions {
  gameState: GameStateManager;
  audio: AudioManager;
  onUnlockPurchased?: (unlock: MechanicUnlock) => void;
}

export class UnlocksTab {
  private gameState: GameStateManager;
  private audio: AudioManager;
  private onUnlockPurchased?: (unlock: MechanicUnlock) => void;

  private unlocksListEl: HTMLElement | null = null;

  constructor(options: UnlocksTabOptions) {
    this.gameState = options.gameState;
    this.audio = options.audio;
    this.onUnlockPurchased = options.onUnlockPurchased;

    this.initElements();
  }

  private initElements(): void {
    this.unlocksListEl = document.getElementById('unlocks-list');
  }

  public getCurrentUnlock(): MechanicUnlock | undefined {
    return this.gameState.unlocks.find((u) => {
      if (u.unlocked) return false;
      if (u.prerequisiteId) {
        const prereq = this.gameState.unlocks.find((p) => p.id === u.prerequisiteId);
        return prereq?.unlocked ?? false;
      }
      return true;
    });
  }

  // Separate from renderList: a hidden card never becomes visible, so it would never render again.
  public syncVisibility(): void {
    const hasUnlock = !!this.getCurrentUnlock();
    const cardUnlocksEl = document.getElementById('card-unlocks');
    const rayEl = document.getElementById('ray-unlocks');
    const quickBtn = document.querySelector<HTMLElement>('.quicknav-btn[data-target="card-unlocks"]');

    if (cardUnlocksEl) cardUnlocksEl.style.display = hasUnlock ? 'flex' : 'none';
    if (rayEl) rayEl.style.display = hasUnlock ? '' : 'none';
    if (quickBtn) quickBtn.style.display = hasUnlock ? 'inline-flex' : 'none';
  }

  public renderList(): void {
    if (!this.unlocksListEl) return;
    this.unlocksListEl.innerHTML = '';

    const currentUnlock = this.getCurrentUnlock();
    if (!currentUnlock) return;

    const canAfford = this.gameState.faithPoints >= currentUnlock.cost;
    const btn = document.createElement('button');
    btn.id = 'btn-unlock-single';
    btn.className = `btn-unlock-mechanic ${canAfford ? 'affordable' : 'unaffordable'}`;
    btn.setAttribute('aria-label', `Desbloquear ${currentUnlock.name}`);

    btn.innerHTML = `
      <div class="unlock-btn-badge">${icon('unlock')} DESBLOQUEAR NOVA MECÂNICA</div>
      <div class="unlock-btn-main">
        <span class="unlock-btn-name">${currentUnlock.name}</span>
        <span class="unlock-btn-cost">${currentUnlock.id === 'unlock_gnose' ? 'Atingir ' : ''}${formatNumber(currentUnlock.cost)} Fé${currentUnlock.id === 'unlock_gnose' ? ' · sem gasto' : ''}</span>
      </div>
    `;

    btn.addEventListener('click', () => {
      this.buyUnlock(currentUnlock);
    });

    this.unlocksListEl.appendChild(btn);
  }

  public buyUnlock(unlock: MechanicUnlock): void {
    if (unlock.unlocked) return;
    if (!this.gameState.buyUnlock(unlock)) {
      this.audio.playTone(180, 'sawtooth', 0.1);
      return;
    }

    this.audio.playChime();
    this.renderList();

    events.emit(GameEvents.UNLOCK_BOUGHT, unlock);
    events.emit(GameEvents.STATE_CHANGED);

    this.onUnlockPurchased?.(unlock);
  }

  public updateButtonStates(): void {
    const currentUnlock = this.getCurrentUnlock();
    if (!currentUnlock) return;
    const canAfford = this.gameState.faithPoints >= currentUnlock.cost;
    const btn = document.getElementById('btn-unlock-single');
    if (btn) {
      btn.classList.toggle('unaffordable', !canAfford);
      btn.classList.toggle('affordable', canAfford);
    }
  }
}
