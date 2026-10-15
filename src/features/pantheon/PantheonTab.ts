import { GameStateManager } from '../../core/GameState.js';
import { AudioManager } from '../../systems/audio.js';
import { TooltipManager } from '../../ui/tooltips.js';
import { NotificationManager } from '../../systems/notifications.js';
import { BOSS_GODS, DIVINE_FRAGMENTS, getBossHp, getBossRelicReward } from '../../config/bosses.js';
import { formatNumber } from '../../systems/calculations.js';

export interface PantheonTabOptions {
  gameState: GameStateManager;
  audio: AudioManager;
  tooltips: TooltipManager;
  notifications: NotificationManager;
  onInitiateBattle: (bossId: string) => void;
}

export class PantheonTab {
  private gameState: GameStateManager;
  private audio: AudioManager;
  private onInitiateBattle: (bossId: string) => void;

  private tabBtnPantheonEl: HTMLElement | null = null;
  private bossesListEl: HTMLElement | null = null;
  private fragmentsListEl: HTMLElement | null = null;

  constructor(options: PantheonTabOptions) {
    this.gameState = options.gameState;
    this.audio = options.audio;
    // options.tooltips & notifications available if needed
    this.onInitiateBattle = options.onInitiateBattle;

    this.initElements();
  }

  private initElements(): void {
    this.tabBtnPantheonEl = document.getElementById('tab-btn-pantheon');
    this.bossesListEl = document.getElementById('pantheon-bosses-list');
    this.fragmentsListEl = document.getElementById('pantheon-fragments-list');
  }

  public setTabVisibility(visible: boolean): void {
    if (!this.tabBtnPantheonEl) {
      this.tabBtnPantheonEl = document.getElementById('tab-btn-pantheon');
    }
    if (this.tabBtnPantheonEl) {
      this.tabBtnPantheonEl.style.display = visible ? 'inline-flex' : 'none';
    }
  }

  public updateUI(): void {
    this.renderBosses();
    this.renderFragments();
  }

  public renderBosses(): void {
    if (!this.bossesListEl) {
      this.bossesListEl = document.getElementById('pantheon-bosses-list');
    }
    if (!this.bossesListEl) return;

    this.bossesListEl.innerHTML = '';

    BOSS_GODS.forEach((boss) => {
      const record = this.gameState.bossRecords.get(boss.id) || {
        id: boss.id,
        defeated: false,
        ascensionLevel: 0
      };

      const isUnlocked = this.gameState.totalFaithAccumulated >= boss.unlockFaithReq;
      const currentHp = getBossHp(boss, record.ascensionLevel);
      const relicReward = getBossRelicReward(boss, record.ascensionLevel);
      const fragment = DIVINE_FRAGMENTS[boss.fragmentId];
      const hasFragment = this.gameState.hasFragment(boss.fragmentId);

      const card = document.createElement('div');
      card.className = `pantheon-god-card ${isUnlocked ? 'unlocked' : 'locked'}`;

      card.innerHTML = `
        <div class="god-card-header">
          <div class="god-title-group">
            <span class="god-tier-tag">DEUS CÓSMICO ${boss.satelliteIndex + 1}</span>
            <h4 class="god-name">${boss.name}</h4>
            <span class="god-subtitle">${boss.title} · <em>${boss.subtitle}</em></span>
          </div>
          <div class="god-ascension-badge">
            <span class="asc-label">ASCENSÃO</span>
            <span class="asc-value">${record.ascensionLevel > 0 ? `NÍVEL ${record.ascensionLevel}` : 'BASE'}</span>
          </div>
        </div>

        <p class="god-lore">${boss.lore}</p>

        <div class="god-stats-grid">
          <div class="god-stat-item">
            <span class="stat-label">VIDA DIVINA</span>
            <span class="stat-val hp-val">${formatNumber(currentHp)} HP</span>
          </div>
          <div class="god-stat-item">
            <span class="stat-label">TEMPO LIMITE</span>
            <span class="stat-val">${boss.timeLimitSec}s</span>
          </div>
          <div class="god-stat-item">
            <span class="stat-label">RECOMPENSA</span>
            <span class="stat-val reward-val">+${relicReward} Relíquias</span>
          </div>
          <div class="god-stat-item">
            <span class="stat-label">FRAGMENTO</span>
            <span class="stat-val ${hasFragment ? 'fragment-obtained' : 'fragment-missing'}">
              ${hasFragment ? `Conquistado` : fragment ? fragment.name : 'Desconhecido'}
            </span>
          </div>
        </div>

        <div class="god-card-actions">
          ${isUnlocked
            ? `<button class="btn-challenge-god ${record.defeated ? 'btn-rechallenge' : 'btn-first-challenge'}" data-boss-id="${boss.id}">
                ${record.defeated ? `DESAFIAR ASCENSÃO ${record.ascensionLevel + 1}` : 'DESAFIAR DIVINDADE'}
              </button>`
            : `<div class="god-req-lock">
                <span>REQUER:</span>
                <strong>${formatNumber(boss.unlockFaithReq)} FÉ ACUMULADA</strong>
              </div>`
          }
        </div>
      `;

      if (isUnlocked) {
        const challengeBtn = card.querySelector<HTMLButtonElement>('.btn-challenge-god');
        challengeBtn?.addEventListener('click', () => {
          this.audio.playTone(400, 'triangle', 0.15);
          this.onInitiateBattle(boss.id);
        });
      }

      this.bossesListEl!.appendChild(card);
    });
  }

  public renderFragments(): void {
    if (!this.fragmentsListEl) {
      this.fragmentsListEl = document.getElementById('pantheon-fragments-list');
    }
    if (!this.fragmentsListEl) return;

    this.fragmentsListEl.innerHTML = '';

    Object.values(DIVINE_FRAGMENTS).forEach((frag) => {
      const owned = this.gameState.hasFragment(frag.id);
      const fragCard = document.createElement('div');
      fragCard.className = `fragment-card ${owned ? 'owned' : 'missing'}`;

      fragCard.innerHTML = `
        <div class="fragment-icon">${owned ? frag.icon : '🔒'}</div>
        <div class="fragment-info">
          <div class="fragment-header-row">
            <span class="fragment-name">${frag.name}</span>
            <span class="fragment-status-tag">${owned ? 'ATIVO' : 'SELADO'}</span>
          </div>
          <span class="fragment-title">${frag.title}</span>
          <p class="fragment-effect">${frag.effectText}</p>
          <p class="fragment-lore">${frag.lore}</p>
        </div>
      `;

      this.fragmentsListEl!.appendChild(fragCard);
    });
  }
}
