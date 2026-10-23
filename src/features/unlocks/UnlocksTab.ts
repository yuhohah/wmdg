import type { MechanicUnlock } from '../../types.js';
import { GameStateManager } from '../../core/GameState.js';
import { AudioManager } from '../../systems/audio.js';
import { NotificationManager } from '../../systems/notifications.js';
import { formatNumber } from '../../systems/calculations.js';
import { events, GameEvents } from '../../core/EventBus.js';

export interface UnlocksTabOptions {
  gameState: GameStateManager;
  audio: AudioManager;
  notifications: NotificationManager;
  onUnlockPurchased?: (unlock: MechanicUnlock) => void;
}

export class UnlocksTab {
  private gameState: GameStateManager;
  private audio: AudioManager;
  private notifications: NotificationManager;
  private onUnlockPurchased?: (unlock: MechanicUnlock) => void;

  private unlocksListEl: HTMLElement | null = null;

  constructor(options: UnlocksTabOptions) {
    this.gameState = options.gameState;
    this.audio = options.audio;
    this.notifications = options.notifications;
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

  public renderList(): void {
    if (!this.unlocksListEl) return;
    this.unlocksListEl.innerHTML = '';

    const currentUnlock = this.getCurrentUnlock();
    const cardUnlocksEl = document.getElementById('card-unlocks');
    const rayEl = document.getElementById('ray-unlocks');
    const quickBtn = document.querySelector<HTMLElement>('.quicknav-btn[data-target="card-unlocks"]');

    if (!currentUnlock) {
      if (cardUnlocksEl) cardUnlocksEl.style.display = 'none';
      if (rayEl) rayEl.style.display = 'none';
      if (quickBtn) quickBtn.style.display = 'none';
      return;
    }

    if (cardUnlocksEl) cardUnlocksEl.style.display = 'flex';
    if (rayEl) rayEl.style.display = '';
    if (quickBtn) quickBtn.style.display = 'inline-flex';

    const canAfford = this.gameState.faithPoints >= currentUnlock.cost;
    const btn = document.createElement('button');
    btn.id = 'btn-unlock-single';
    btn.className = `btn-unlock-mechanic ${canAfford ? 'affordable' : 'unaffordable'}`;
    btn.setAttribute('aria-label', `Desbloquear ${currentUnlock.name}`);

    btn.innerHTML = `
      <div class="unlock-btn-badge">🔓 DESBLOQUEAR NOVA MECÂNICA</div>
      <div class="unlock-btn-main">
        <span class="unlock-btn-name">${currentUnlock.name}</span>
        <span class="unlock-btn-cost">${formatNumber(currentUnlock.cost)} Fé</span>
      </div>
    `;

    btn.addEventListener('click', () => {
      this.buyUnlock(currentUnlock);
    });

    this.unlocksListEl.appendChild(btn);
  }

  public buyUnlock(unlock: MechanicUnlock): void {
    if (unlock.unlocked) return;
    if (this.gameState.faithPoints < unlock.cost) {
      this.audio.playTone(180, 'sawtooth', 0.1);
      return;
    }

    this.gameState.faithPoints -= unlock.cost;
    unlock.unlocked = true;

    if (unlock.id === 'unlock_incarnation') {
      this.notifications.showCustomPopup(
        'A ESFERA GANHOU CORPO',
        'A Encarnação desceu ao altar e acendeu o Fervor (+1/s).',
        '🔥',
        'NOVA MECÂNICA'
      );
    } else if (unlock.id === 'unlock_fervor_upgrades') {
      this.notifications.showCustomPopup(
        'RITOS DE FERVOR',
        'As melhorias de Fervor estão liberadas no card de Fervor.',
        '🕯️',
        'NOVA MECÂNICA'
      );
    } else if (unlock.id === 'unlock_relics') {
      this.notifications.showCustomPopup(
        'O RELICÁRIO SE ABRIU',
        'Transmute sua Fé em Fragmentos e restaure relíquias no card de Relíquias.',
        '⚱️',
        'NOVA MECÂNICA'
      );
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
