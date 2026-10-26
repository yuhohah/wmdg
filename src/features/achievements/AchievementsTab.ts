import type { Achievement } from '../../types.js';
import { GameStateManager } from '../../core/GameState.js';
import { AudioManager } from '../../systems/audio.js';
import { NotificationManager } from '../../systems/notifications.js';
import { DISPLAY_CONFIG } from '../../config/display.js';
import { events, GameEvents } from '../../core/EventBus.js';

export interface AchievementsTabOptions {
  gameState: GameStateManager;
  audio: AudioManager;
  notifications: NotificationManager;
  onAchievementUnlocked?: (ach: Achievement) => void;
}

export class AchievementsTab {
  private gameState: GameStateManager;
  private audio: AudioManager;
  private notifications: NotificationManager;
  private onAchievementUnlocked?: (ach: Achievement) => void;

  private achievementsListEl: HTMLElement | null = null;
  private modalEl: HTMLElement | null = null;
  private hudBtnEl: HTMLButtonElement | null = null;
  private closeBtnEl: HTMLButtonElement | null = null;
  private closeFooterBtnEl: HTMLButtonElement | null = null;
  private progressEl: HTMLElement | null = null;

  constructor(options: AchievementsTabOptions) {
    this.gameState = options.gameState;
    this.audio = options.audio;
    this.notifications = options.notifications;
    this.onAchievementUnlocked = options.onAchievementUnlocked;

    this.initElements();
    this.bindEvents();
  }

  private initElements(): void {
    this.achievementsListEl = document.getElementById('achievements-list');
    this.modalEl = document.getElementById('achievements-modal');
    this.hudBtnEl = document.getElementById('achievements-hud-btn') as HTMLButtonElement | null;
    this.closeBtnEl = document.getElementById('close-achievements-btn') as HTMLButtonElement | null;
    this.closeFooterBtnEl = document.getElementById('close-achievements-footer-btn') as HTMLButtonElement | null;
    this.progressEl = document.getElementById('achievements-modal-progress');
  }

  private bindEvents(): void {
    this.hudBtnEl?.addEventListener('click', () => this.toggleModal());
    this.closeBtnEl?.addEventListener('click', () => this.closeModal());
    this.closeFooterBtnEl?.addEventListener('click', () => this.closeModal());

    this.modalEl?.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.closeModal();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isModalOpen()) {
        this.closeModal();
      }
    });
  }

  public isModalOpen(): boolean {
    return !!this.modalEl?.classList.contains('open');
  }

  public openModal(): void {
    this.renderList();
    this.modalEl?.classList.add('open');
  }

  public closeModal(): void {
    this.modalEl?.classList.remove('open');
  }

  public toggleModal(): void {
    if (this.isModalOpen()) {
      this.closeModal();
    } else {
      this.openModal();
    }
  }

  private updateHeaderCount(): void {
    const unlockedCount = this.gameState.achievements.filter((a) => a.unlocked).length;
    const totalCount = this.gameState.achievements.length;
    if (this.progressEl) {
      this.progressEl.textContent = `${unlockedCount} / ${totalCount} conquistas desbloqueadas`;
    }
  }

  public renderList(): void {
    if (!this.achievementsListEl) return;
    this.achievementsListEl.innerHTML = '';
    const state = this.gameState.getSnapshot();

    this.gameState.achievements.forEach((ach) => {
      const progress = ach.getProgress(state);

      const card = document.createElement('div');
      card.className = `cult-action-card ach-card ${ach.unlocked ? 'unlocked' : 'unaffordable'}`;
      card.id = `ach-card-${ach.id}`;

      const symbolHtml = DISPLAY_CONFIG.showEmojisAndSymbols
        ? `<span class="card-symbol">${ach.icon}</span>`
        : '';

      card.innerHTML = `
        <div class="card-header-row">
          <div class="card-title-group">
            ${symbolHtml}
            <span class="card-name">${ach.name}</span>
          </div>
          <span class="card-count-badge" id="ach-badge-${ach.id}">
            ${ach.unlocked ? 'DESBLOQUEADO' : 'BLOQUEADO'}
          </span>
        </div>
        <div class="card-desc">${ach.desc}</div>
        ${!ach.unlocked ? `
          <div class="ach-progress-info" id="ach-prog-info-${ach.id}">
            <span class="ach-progress-label">${progress.label}</span>
            <span class="ach-progress-pct">${Math.round(progress.percent)}%</span>
          </div>
          <div class="ach-progress-container" id="ach-prog-bar-wrap-${ach.id}">
            <div class="ach-progress-bar" id="ach-prog-bar-${ach.id}" style="width: ${progress.percent}%;"></div>
          </div>
        ` : ''}
      `;

      this.achievementsListEl!.appendChild(card);
    });

    this.updateHeaderCount();
  }

  public updateRealtime(): void {
    // Closed grimoire: nothing to show, and openModal() re-renders the list fresh
    if (!this.isModalOpen()) return;
    const state = this.gameState.getSnapshot();

    for (const ach of this.gameState.achievements) {
      const card = document.getElementById(`ach-card-${ach.id}`);
      if (!card) continue;

      const progress = ach.getProgress(state);

      if (ach.unlocked) {
        if (!card.classList.contains('unlocked')) {
          card.classList.add('unlocked');
          card.classList.remove('unaffordable');
          const badge = document.getElementById(`ach-badge-${ach.id}`);
          if (badge) {
            badge.textContent = 'DESBLOQUEADO';
            badge.style.color = '#ffffff';
            badge.style.borderColor = '#ffffff';
          }
          const progInfo = document.getElementById(`ach-prog-info-${ach.id}`);
          if (progInfo) progInfo.remove();
          const progWrap = document.getElementById(`ach-prog-bar-wrap-${ach.id}`);
          if (progWrap) progWrap.remove();
        }
      } else {
        const progInfo = document.getElementById(`ach-prog-info-${ach.id}`);
        if (progInfo) {
          const labelEl = progInfo.querySelector('.ach-progress-label');
          if (labelEl) labelEl.textContent = progress.label;
          const pctEl = progInfo.querySelector('.ach-progress-pct');
          if (pctEl) pctEl.textContent = `${Math.round(progress.percent)}%`;
        }
        const bar = document.getElementById(`ach-prog-bar-${ach.id}`);
        if (bar) {
          bar.style.width = `${progress.percent}%`;
        }
      }
    }

    this.updateHeaderCount();
  }

  public checkAchievements(): Achievement[] {
    const newlyUnlocked = this.gameState.checkAchievements();
    if (newlyUnlocked.length > 0) {
      newlyUnlocked.forEach((ach) => {
        this.notifications.showAchievementPopup(ach);
        this.audio.playTone(880, 'sine', 0.25);
        events.emit(GameEvents.ACHIEVEMENT_UNLOCKED, ach);
        this.onAchievementUnlocked?.(ach);
      });
      this.renderList();
    }
    return newlyUnlocked;
  }
}
