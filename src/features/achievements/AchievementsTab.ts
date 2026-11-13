import { achievementIcon } from './achievementIcons.js';
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
  private tileCache = new Map<string, { tile: HTMLElement; unlocked: boolean | null; selected: boolean | null }>();
  private lastDetailKey = '';
  private lastUnlockedSummary = '';

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
    this.lastDetailKey = '';
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

  private updateHeaderCount(unlockedCount: number, totalCount: number): void {
    const key = `${unlockedCount}/${totalCount}`;
    if (key === this.lastUnlockedSummary) return;
    this.lastUnlockedSummary = key;
    if (this.progressEl) {
      this.progressEl.textContent = `${unlockedCount} / ${totalCount} conquistas desbloqueadas`;
    }
    const meter = document.getElementById('achievement-completion');
    if (meter instanceof HTMLProgressElement) {
      meter.max = Math.max(1, totalCount);
      meter.value = unlockedCount;
    }
  }

  public renderList(): void {
    if (!this.isModalOpen() || !this.achievementsListEl) return;
    this.achievementsListEl.replaceChildren();
    this.tileCache.clear();
    this.lastDetailKey = '';
    this.lastUnlockedSummary = '';
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
        tile.title = `${ach.name} — ${ach.buffText}`;
        tile.innerHTML = `${achievementIcon(ach.id)}<span class="achievement-rank" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>`;
        tile.addEventListener('click', () => {
          this.selectedId = ach.id;
          this.updateRealtime();
        });
        this.tileCache.set(ach.id, { tile, unlocked: null, selected: null });
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
    let unlockedCount = 0;
    let selected: Achievement | undefined;
    for (const ach of this.gameState.achievements) {
      if (ach.unlocked) unlockedCount++;
      const isSelected = ach.id === this.selectedId;
      if (isSelected) selected = ach;
      const cached = this.tileCache.get(ach.id);
      if (!cached) continue;
      if (cached.unlocked !== ach.unlocked) {
        cached.unlocked = ach.unlocked;
        cached.tile.classList.toggle('unlocked', ach.unlocked);
        cached.tile.setAttribute('aria-label', `${ach.name}: ${ach.unlocked ? 'desbloqueada' : 'bloqueada'}`);
      }
      if (cached.selected !== isSelected) {
        cached.selected = isSelected;
        cached.tile.classList.toggle('selected', isSelected);
        cached.tile.setAttribute('aria-pressed', String(isSelected));
      }
    }
    if (selected && this.detailEl) {
      if (selected.unlocked) {
        const detailKey = `${selected.id}|1`;
        if (detailKey !== this.lastDetailKey) {
          this.lastDetailKey = detailKey;
          this.detailEl.innerHTML = `
            <div class="achievement-detail-icon">${achievementIcon(selected.id)}</div>
            <span class="achievement-status">Conquista desbloqueada</span>
            <h4>${selected.name}</h4>
            <p>${selected.desc}</p>
            <div class="ach-buff-chip">${selected.buffText}</div>
            <p class="achievement-progress-label">${selected.buffType === 'none' ? 'Concluída' : 'Concluída · bônus ativo'}</p>
            <div class="ach-progress-container" role="progressbar" aria-label="Progresso da conquista" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100"><div class="ach-progress-bar" style="width:100%"></div></div>
            <p class="achievement-lore">${selected.lore}</p>`;
        }
      } else {
        const state = this.gameState.getSnapshot();
        const progress = selected.getProgress(state);
        const percent = Math.max(0, Math.min(100, progress.percent));
        const pctFloor = Math.floor(percent);
        const pctWidth = percent.toFixed(1);
        const detailKey = `${selected.id}|0|${pctWidth}|${progress.label}`;
        if (detailKey !== this.lastDetailKey) {
          const sameLockedItem = this.lastDetailKey.startsWith(`${selected.id}|0|`);
          this.lastDetailKey = detailKey;
          if (sameLockedItem) {
            const labelEl = this.detailEl.querySelector('.achievement-progress-label');
            const barEl = this.detailEl.querySelector<HTMLElement>('.ach-progress-bar');
            const progEl = this.detailEl.querySelector('.ach-progress-container');
            const labelText = `${progress.label} · ${pctFloor}%`;
            if (labelEl && labelEl.textContent !== labelText) labelEl.textContent = labelText;
            if (barEl) barEl.style.width = `${percent}%`;
            if (progEl) progEl.setAttribute('aria-valuenow', String(pctFloor));
          } else {
            this.detailEl.innerHTML = `
              <div class="achievement-detail-icon">${achievementIcon(selected.id)}</div>
              <span class="achievement-status">Conquista bloqueada</span>
              <h4>${selected.name}</h4>
              <p>${selected.desc}</p>
              <div class="ach-buff-chip">${selected.buffText}</div>
              <p class="achievement-progress-label">${progress.label} · ${pctFloor}%</p>
              <div class="ach-progress-container" role="progressbar" aria-label="Progresso da conquista" aria-valuenow="${pctFloor}" aria-valuemin="0" aria-valuemax="100"><div class="ach-progress-bar" style="width:${percent}%"></div></div>
              <p class="achievement-lore">${selected.lore}</p>`;
          }
        }
      }
    }
    this.updateHeaderCount(unlockedCount, this.gameState.achievements.length);
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
