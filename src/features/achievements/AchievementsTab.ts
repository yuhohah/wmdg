import { achievementIcon } from '../../ui/achievementIcons.js';
import type { Achievement } from '../../types.js';
import { GameStateManager } from '../../core/GameState.js';
import { AudioManager } from '../../systems/audio.js';
import { NotificationManager } from '../../systems/notifications.js';

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
  private selectedId = '';
  private detailEl: HTMLElement | null = null;
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
    this.detailEl = document.getElementById('achievement-detail');
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
    this.modalEl?.classList.add('open');
    this.renderList();
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
    if (!this.isModalOpen() || !this.achievementsListEl) return;
    this.achievementsListEl.replaceChildren();
    const groups = [
      { prefix: 'ach_click_', name: 'Canalização' },
      { prefix: 'ach_f_', name: 'Congregação' },
      { prefix: 'ach_faith_', name: 'Fé acumulada' },
      { prefix: 'ach_fps_', name: 'Produção' },
      { prefix: 'ach_gnose_', name: 'Gnose' },
      { prefix: 'ach_boss_', name: 'Guardiões' },
    ];
    for (const group of groups) {
      const achievements = this.gameState.achievements.filter((ach) => ach.id.startsWith(group.prefix));
      if (!achievements.length) continue;
      const section = document.createElement('section');
      section.className = 'achievement-family';
      const heading = document.createElement('h4');
      heading.textContent = `${group.name} · ${achievements.filter((ach) => ach.unlocked).length}/${achievements.length}`;
      section.appendChild(heading);
      const grid = document.createElement('div');
      grid.className = 'achievement-grid';
      achievements.forEach((ach, index) => {
        const tile = document.createElement('button');
        tile.type = 'button';
        tile.className = 'achievement-tile';
        tile.id = `ach-card-${ach.id}`;
        tile.innerHTML = `${achievementIcon(ach.id)}<span class="achievement-rank" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>`;
        tile.addEventListener('click', () => {
          this.selectedId = ach.id;
          this.updateRealtime();
        });
        grid.appendChild(tile);
      });
      section.appendChild(grid);
      this.achievementsListEl.appendChild(section);
    }
    if (!this.selectedId) this.selectedId = this.gameState.achievements[0]?.id ?? '';
    this.updateRealtime();
  }

  public updateRealtime(): void {
    if (!this.isModalOpen()) return;
    const state = this.gameState.getSnapshot();
    for (const ach of this.gameState.achievements) {
      const tile = document.getElementById(`ach-card-${ach.id}`);
      if (!tile) continue;
      tile.classList.toggle('unlocked', ach.unlocked);
      tile.classList.toggle('selected', ach.id === this.selectedId);
      tile.setAttribute('aria-pressed', String(ach.id === this.selectedId));
      tile.setAttribute('aria-label', `${ach.name}: ${ach.unlocked ? 'desbloqueada' : 'bloqueada'}`);
      tile.title = `${ach.name} — ${ach.buffText}`;
    }
    const selected = this.gameState.achievements.find((ach) => ach.id === this.selectedId);
    if (selected && this.detailEl) {
      const progress = selected.getProgress(state);
      const percent = selected.unlocked ? 100 : Math.max(0, Math.min(100, progress.percent));
      this.detailEl.innerHTML = `
        <div class="achievement-detail-icon">${achievementIcon(selected.id)}</div>
        <span class="achievement-status">${selected.unlocked ? 'Conquista desbloqueada' : 'Conquista bloqueada'}</span>
        <h4>${selected.name}</h4>
        <p>${selected.desc}</p>
        <div class="ach-buff-chip">${selected.buffText}</div>
        <p class="achievement-progress-label">${selected.unlocked ? (selected.buffType === 'none' ? 'Concluída' : 'Concluída · bônus ativo') : `${progress.label} · ${Math.floor(percent)}%`}</p>
        <div class="ach-progress-container" role="progressbar" aria-label="Progresso da conquista" aria-valuenow="${Math.floor(percent)}" aria-valuemin="0" aria-valuemax="100"><div class="ach-progress-bar" style="width:${percent}%"></div></div>
        <p class="achievement-lore">${selected.lore}</p>`;
    }
    this.updateHeaderCount();
    const meter = document.getElementById('achievement-completion');
    if (meter instanceof HTMLProgressElement) {
      meter.max = Math.max(1, this.gameState.achievements.length);
      meter.value = this.gameState.achievements.filter((ach) => ach.unlocked).length;
    }
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
