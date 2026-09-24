import type { Achievement } from '../../types.js';
import { GameStateManager } from '../../core/GameState.js';
import { AudioManager } from '../../systems/audio.js';
import { NotificationManager } from '../../systems/notifications.js';
import { TooltipManager } from '../../ui/tooltips.js';
import { DISPLAY_CONFIG } from '../../config/display.js';
import { events, GameEvents } from '../../core/EventBus.js';

export interface AchievementsTabOptions {
  gameState: GameStateManager;
  audio: AudioManager;
  notifications: NotificationManager;
  tooltips: TooltipManager;
  onAchievementUnlocked?: (ach: Achievement) => void;
}

export class AchievementsTab {
  private gameState: GameStateManager;
  private audio: AudioManager;
  private notifications: NotificationManager;
  private tooltips: TooltipManager;
  private onAchievementUnlocked?: (ach: Achievement) => void;

  private achievementsListEl: HTMLElement | null = null;

  constructor(options: AchievementsTabOptions) {
    this.gameState = options.gameState;
    this.audio = options.audio;
    this.notifications = options.notifications;
    this.tooltips = options.tooltips;
    this.onAchievementUnlocked = options.onAchievementUnlocked;

    this.initElements();
  }

  private initElements(): void {
    this.achievementsListEl = document.getElementById('achievements-list');
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
          <span class="card-count-badge" id="ach-badge-${ach.id}" style="${ach.unlocked ? 'color: #ffffff; border-color: #ffffff;' : ''}">
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

      card.addEventListener('mouseenter', (e: MouseEvent) => {
        this.tooltips.showAchievementTooltip(ach, this.gameState.getSnapshot(), e);
      });
      card.addEventListener('mousemove', (e: MouseEvent) => {
        this.tooltips.position(e);
      });
      card.addEventListener('mouseleave', () => {
        this.tooltips.hide();
      });

      this.achievementsListEl!.appendChild(card);
    });
  }

  public updateRealtime(): void {
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

    this.tooltips.updateRealtimeProgress(state);
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
