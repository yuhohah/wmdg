import type { MechanicUnlock } from '../../types.js';
import { GameStateManager } from '../../core/GameState.js';
import { AudioManager } from '../../systems/audio.js';
import { NotificationManager } from '../../systems/notifications.js';
import { TooltipManager } from '../../ui/tooltips.js';
import { formatNumber } from '../../systems/calculations.js';
import { events, GameEvents } from '../../core/EventBus.js';

export interface UnlocksTabOptions {
  gameState: GameStateManager;
  audio: AudioManager;
  notifications: NotificationManager;
  tooltips: TooltipManager;
  onUnlockPurchased?: (unlock: MechanicUnlock) => void;
}

export class UnlocksTab {
  private gameState: GameStateManager;
  private audio: AudioManager;
  private notifications: NotificationManager;
  private tooltips: TooltipManager;
  private onUnlockPurchased?: (unlock: MechanicUnlock) => void;

  private unlocksListEl: HTMLElement | null = null;

  constructor(options: UnlocksTabOptions) {
    this.gameState = options.gameState;
    this.audio = options.audio;
    this.notifications = options.notifications;
    this.tooltips = options.tooltips;
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

  public hasAvailableUnlock(): boolean {
    const current = this.getCurrentUnlock();
    return current ? this.gameState.faithPoints >= current.cost : false;
  }

  public renderList(): void {
    if (!this.unlocksListEl) return;
    this.unlocksListEl.innerHTML = '';

    const currentUnlock = this.getCurrentUnlock();

    if (!currentUnlock) {
      const completedBanner = document.createElement('div');
      completedBanner.className = 'unlocks-completed-banner';
      completedBanner.innerHTML = `
        <div class="completed-icon">✨</div>
        <div class="completed-title">EXPANSÃO CÓSMICA CONCLUÍDA</div>
        <p class="completed-desc">Todas as novas ordens e mecânicas cósmicas foram adquiridas e despertadas.</p>
      `;
      this.unlocksListEl.appendChild(completedBanner);
      return;
    }

    const canAfford = this.gameState.faithPoints >= currentUnlock.cost;
    const card = document.createElement('div');
    card.className = `cult-action-card unlock-action-card ${canAfford ? '' : 'unaffordable'}`;
    card.id = `card-${currentUnlock.id}`;

    card.innerHTML = `
      <div class="card-header-row" style="margin-bottom: 0; width: 100%; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
        <span class="card-name" style="font-size: 13px; font-weight: 700; color: #ffffff;">${currentUnlock.name}</span>
        <div class="card-click-prompt">
          <span class="card-click-hint" style="font-size: 11px; padding: 5px 12px; font-weight: 800;">Desbloquear (${formatNumber(currentUnlock.cost)} Fé)</span>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      this.buyUnlock(currentUnlock);
    });

    this.unlocksListEl.appendChild(card);
  }

  public buyUnlock(unlock: MechanicUnlock): void {
    if (unlock.unlocked) return;
    if (this.gameState.faithPoints < unlock.cost) {
      this.audio.playTone(180, 'sawtooth', 0.1);
      return;
    }

    this.gameState.faithPoints -= unlock.cost;
    unlock.unlocked = true;
    this.tooltips.hide();

    if (unlock.id === 'unlock_incarnation') {
      this.notifications.showCustomPopup(
        'INCARNATION DESPERTADA',
        'A Encarnação Sagrada foi convocada! O Fervor começou a queimar a +1.0/s.',
        ''
      );
    } else if (unlock.id === 'unlock_fervor_upgrades') {
      this.notifications.showCustomPopup(
        'RITOS DE FERVOR',
        'Os Upgrades de Fervor foram revelados no painel esquerdo!',
        ''
      );
    } else if (unlock.id === 'unlock_relics') {
      this.notifications.showCustomPopup(
        'NOVA MECÂNICA',
        'A aba de Relíquias sagradas foi despertada no santuário!',
        ''
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
    const card = document.getElementById(`card-${currentUnlock.id}`);
    if (card) {
      card.classList.toggle('unaffordable', !canAfford);
    }
  }
}
