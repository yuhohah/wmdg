import { GameStateManager } from '../../core/GameState.js';
import { AudioManager } from '../../systems/audio.js';
import { NotificationManager } from '../../systems/notifications.js';
import { GNOSE_BOSSES } from '../../config/bosses.js';
import { formatNumber } from '../../systems/calculations.js';
import { events, GameEvents } from '../../core/EventBus.js';
import type { GnoseBoss } from '../../types.js';
import { icon, iconOrText } from '../../ui/icons.js';

export interface BossBattleModalOptions {
  gameState: GameStateManager;
  audio: AudioManager;
  notifications: NotificationManager;
  spawnFloatingText: (x: number, y: number, text: string) => void;
  onBattleEnded?: (boss: GnoseBoss, victory: boolean) => void;
}

export class BossBattleModal {
  private options: BossBattleModalOptions;
  private overlayEl: HTMLElement | null = null;
  private bossSymbolEl: HTMLElement | null = null;
  private bossNameEl: HTMLElement | null = null;
  private bossTitleEl: HTMLElement | null = null;
  private bossMythEl: HTMLElement | null = null;
  private bossLoreEl: HTMLElement | null = null;

  private bossHpFillEl: HTMLElement | null = null;
  private bossHpValEl: HTMLElement | null = null;

  private synergyTotalEl: HTMLElement | null = null;
  private synFaithEl: HTMLElement | null = null;
  private synFollowersEl: HTMLElement | null = null;
  private synFervorEl: HTMLElement | null = null;
  private synRelicsEl: HTMLElement | null = null;
  private synIncarnationEl: HTMLElement | null = null;
  private synGnoseEl: HTMLElement | null = null;

  private altarIntegrityFillEl: HTMLElement | null = null;
  private altarIntegrityValEl: HTMLElement | null = null;
  private penaltyHintEl: HTMLElement | null = null;

  private arenaHintTopEl: HTMLElement | null = null;
  private sphereSubEl: HTMLElement | null = null;
  private riftsLayerEl: HTMLElement | null = null;
  private sphereBtnEl: HTMLElement | null = null;
  private combatStatsEl: HTMLElement | null = null;
  private retreatBtnEl: HTMLButtonElement | null = null;

  constructor(options: BossBattleModalOptions) {
    this.options = options;
    this.initDOM();
    this.bindEvents();
  }

  private initDOM(): void {
    const existing = document.getElementById('gnose-boss-battle-overlay');
    if (existing) {
      existing.remove();
    }

    const overlay = document.createElement('div');
    overlay.id = 'gnose-boss-battle-overlay';
    overlay.className = 'modal-overlay boss-battle-overlay';
    overlay.style.display = 'none';

    overlay.innerHTML = `
      <div class="modal-slide-card boss-battle-card" role="dialog" aria-modal="true" aria-label="Julgamento dos Deuses Antigos">
        <div class="boss-battle-header">
          <div class="boss-identity-group">
            <div class="boss-emblem-box" id="boss-modal-symbol">${icon('scales')}</div>
            <div class="boss-identity-text">
              <span class="boss-myth-badge" id="boss-modal-myth">MITOLOGIA EGÍPCIA</span>
              <h3 class="boss-modal-name" id="boss-modal-name">ANÚBIS</h3>
              <span class="boss-modal-title" id="boss-modal-title">O Pesador de Almas</span>
            </div>
          </div>
          <button id="btn-boss-retreat" class="btn-boss-retreat" type="button">Recuar</button>
        </div>

        <p class="boss-modal-lore" id="boss-modal-lore"></p>

        <!-- BARRA 1: ESSÊNCIA DO DEUS (HP DO BOSS) -->
        <div class="boss-bar-section">
          <div class="boss-bar-header">
            <span class="boss-bar-label">ESSÊNCIA DIVINA DO GUARDIÃO</span>
            <span class="boss-bar-val" id="boss-hp-val">100%</span>
          </div>
          <div class="boss-bar-track boss-hp-track">
            <div class="boss-bar-fill boss-hp-fill" id="boss-hp-fill" style="width: 100%;"></div>
          </div>
        </div>

        <!-- SINERGIA DE RECURSOS DO CULTO (TODOS OS RECURSOS AFETAM O COMBATE) -->
        <div class="boss-synergy-panel" id="boss-synergy-panel">
          <div class="boss-synergy-header">
            <span class="boss-synergy-title">✦ RESSONÂNCIA DOS RECURSOS NO COMBATE</span>
            <span class="boss-synergy-total" id="boss-synergy-total">Poder Total: ×1.00</span>
          </div>
          <div class="boss-synergy-pills">
            <span class="boss-synergy-pill" id="boss-syn-faith" title="Fé acumulada e Fé/s aumentam o DPS e o Pulso">Fé: +0%</span>
            <span class="boss-synergy-pill" id="boss-syn-followers" title="Fiéis Devotos aumentam o DPS e curam o Altar ao aparar Fendas">Fiéis: +0%</span>
            <span class="boss-synergy-pill" id="boss-syn-fervor" title="Fervor e Ritos aumentam o DPS, o Pulso da Esfera e a defesa do Altar">Fervor: +0%</span>
            <span class="boss-synergy-pill" id="boss-syn-relics" title="Fragmentos e Relíquias ampliam o dano crítico das Fendas e protegem o Altar">Relíquias: +0%</span>
            <span class="boss-synergy-pill" id="boss-syn-incarnation" title="Estágio da Encarnação e Bênção multiplicam o dano e protegem o Altar">Encarnação: +0%</span>
            <span class="boss-synergy-pill" id="boss-syn-gnose" title="Gnose e Nós da Árvore ampliam o dano contra os Deuses Antigos">Gnose: +0%</span>
          </div>
        </div>

        <!-- ARENA CENTRAL: ESFERA DE CANALIZAÇÃO + FENDAS DIVINAS -->
        <div class="boss-arena-stage" id="boss-arena-stage">
          <div class="boss-arena-hint-top" id="boss-arena-hint-top">
            ✦ Clique nas <strong>Fendas Divinas</strong> para aparar os golpes e causar <strong>12% de Dano Crítico</strong>!
          </div>

          <div class="boss-arena-center">
            <button id="boss-arena-sphere-btn" class="divine-sphere-btn boss-arena-sphere" type="button" aria-label="Canalizar Esfera contra o Guardião">
              <span class="boss-sphere-caption">PULSAR<br>ESFERA<br><small id="boss-sphere-sub">-1.5% HP</small></span>
            </button>
          </div>

          <!-- Camada de Fendas de Blasfêmia / Julgamento -->
          <div class="boss-rifts-layer" id="boss-rifts-layer"></div>

          <div class="boss-combat-stats" id="boss-combat-stats">
            DPS Passivo: +0 Fé/s • Fendas Aparadas: 0
          </div>
        </div>

        <!-- BARRA 2: INTEGRIDADE DO ALTAR (SEM TIMER DE RELÓGIO) -->
        <div class="boss-bar-section altar-integrity-section">
          <div class="boss-bar-header">
            <span class="boss-bar-label">${icon('shield')} INTEGRIDADE DO ALTAR (SEM LIMITE DE TEMPO)</span>
            <span class="boss-bar-val" id="boss-altar-val">100%</span>
          </div>
          <div class="boss-bar-track altar-integrity-track">
            <div class="boss-bar-fill altar-integrity-fill" id="boss-altar-fill" style="width: 100%;"></div>
          </div>
          <div class="boss-penalty-hint" id="boss-penalty-hint">
            Cada Fenda ignorada drena 25% da Integridade. Se cair a 0%, aplica Maldição Leve (-25% Fé/s e Fervor/s por 20s).
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlayEl = overlay;

    this.bossSymbolEl = overlay.querySelector('#boss-modal-symbol');
    this.bossNameEl = overlay.querySelector('#boss-modal-name');
    this.bossTitleEl = overlay.querySelector('#boss-modal-title');
    this.bossMythEl = overlay.querySelector('#boss-modal-myth');
    this.bossLoreEl = overlay.querySelector('#boss-modal-lore');

    this.bossHpFillEl = overlay.querySelector('#boss-hp-fill');
    this.bossHpValEl = overlay.querySelector('#boss-hp-val');

    this.synergyTotalEl = overlay.querySelector('#boss-synergy-total');
    this.synFaithEl = overlay.querySelector('#boss-syn-faith');
    this.synFollowersEl = overlay.querySelector('#boss-syn-followers');
    this.synFervorEl = overlay.querySelector('#boss-syn-fervor');
    this.synRelicsEl = overlay.querySelector('#boss-syn-relics');
    this.synIncarnationEl = overlay.querySelector('#boss-syn-incarnation');
    this.synGnoseEl = overlay.querySelector('#boss-syn-gnose');

    this.altarIntegrityFillEl = overlay.querySelector('#boss-altar-fill');
    this.altarIntegrityValEl = overlay.querySelector('#boss-altar-val');
    this.penaltyHintEl = overlay.querySelector('#boss-penalty-hint');

    this.arenaHintTopEl = overlay.querySelector('#boss-arena-hint-top');
    this.sphereSubEl = overlay.querySelector('#boss-sphere-sub');
    this.riftsLayerEl = overlay.querySelector('#boss-rifts-layer');
    this.sphereBtnEl = overlay.querySelector('#boss-arena-sphere-btn');
    this.combatStatsEl = overlay.querySelector('#boss-combat-stats');
    this.retreatBtnEl = overlay.querySelector('#btn-boss-retreat');
  }

  private bindEvents(): void {
    this.retreatBtnEl?.addEventListener('click', () => {
      this.options.gameState.retreatBossBattle();
      this.close();
    });

    this.sphereBtnEl?.addEventListener('click', (e: MouseEvent) => {
      if (!this.options.gameState.activeBossBattle) return;
      const breakdown = this.options.gameState.getBossCombatBreakdown(
        this.options.gameState.activeBossBattle.bossId
      );
      const { bossClickDamage } = this.options.gameState.addClick();
      this.options.audio.playTone(640 + Math.random() * 140, 'sine', 0.08);
      const x = e.clientX || window.innerWidth / 2;
      const y = e.clientY || window.innerHeight / 2;
      this.options.spawnFloatingText(
        x,
        y,
        `✦ -${formatNumber(bossClickDamage)} HP (-${(breakdown.clickHpFraction * 100).toFixed(1)}%)`
      );
      this.updateUI();
      events.emit(GameEvents.STATE_CHANGED);
    });

    this.options.gameState.onBossBattleFinished = ({ boss, victory }) => {
      this.handleBattleFinished(boss, victory);
    };
  }

  public openForBoss(bossId: string): boolean {
    const boss = GNOSE_BOSSES.find((b) => b.id === bossId);
    if (!boss) return false;

    const started = this.options.gameState.startBossBattle(bossId);
    if (!started) {
      this.options.audio.playTone(180, 'sawtooth', 0.12);
      return false;
    }

    if (this.bossSymbolEl) this.bossSymbolEl.innerHTML = iconOrText(boss.symbol);
    if (this.bossNameEl) this.bossNameEl.textContent = boss.name.toUpperCase();
    if (this.bossTitleEl) this.bossTitleEl.textContent = boss.title;
    if (this.bossMythEl) this.bossMythEl.textContent = boss.mythology.toUpperCase();
    if (this.bossLoreEl) this.bossLoreEl.textContent = boss.lore;

    if (this.riftsLayerEl) {
      this.riftsLayerEl.innerHTML = '';
    }

    if (this.overlayEl) {
      this.overlayEl.style.display = 'flex';
      this.overlayEl.classList.add('open', 'active');
    }

    this.options.audio.playTone(320, 'triangle', 0.25);
    this.updateUI();
    return true;
  }

  public close(): void {
    if (this.overlayEl) {
      this.overlayEl.style.display = 'none';
      this.overlayEl.classList.remove('open', 'active');
    }
    if (this.riftsLayerEl) {
      this.riftsLayerEl.innerHTML = '';
    }
  }

  private handleBattleFinished(boss: GnoseBoss, victory: boolean): void {
    this.close();

    if (victory) {
      this.options.audio.playChime();
      this.options.notifications.showCustomPopup(
        `${boss.name.toUpperCase()} SUBJUGADO!`,
        `${boss.rewardName}: ${boss.rewardDesc}`,
        boss.symbol,
        'VITÓRIA MITOLÓGICA'
      );
    } else {
      this.options.audio.playTone(150, 'sawtooth', 0.35);
      this.options.notifications.showCustomPopup(
        `ALTAR ROMPIDO POR ${boss.name.toUpperCase()}`,
        'Maldição Divina Leve: -25% de Fé/s e Fervor/s por 20 segundos. Você pode desafiar novamente quando quiser.',
        'warning',
        'RECUO DO ALTAR'
      );
    }

    this.options.onBattleEnded?.(boss, victory);
    events.emit(GameEvents.STATE_CHANGED);
  }

  public updateUI(): void {
    const battle = this.options.gameState.activeBossBattle;
    if (!battle) return;

    const breakdown = this.options.gameState.getBossCombatBreakdown(battle.bossId);

    const hpPercent = Math.max(0, Math.min(100, (battle.bossHp / battle.bossMaxHp) * 100));
    if (this.bossHpFillEl) {
      this.bossHpFillEl.style.width = `${hpPercent.toFixed(1)}%`;
    }
    if (this.bossHpValEl) {
      const dpsPctStr = (breakdown.passiveHpFractionPerSec * 100).toFixed(2);
      this.bossHpValEl.textContent = `${formatNumber(battle.bossHp)} / ${formatNumber(battle.bossMaxHp)} (${hpPercent.toFixed(1)}% • -${dpsPctStr}%/s)`;
    }

    // Update Resource Synergy Panel
    if (this.synergyTotalEl) {
      this.synergyTotalEl.textContent = `Poder Total: ×${breakdown.totalResourceMultiplier.toFixed(2)} (-${(breakdown.passiveHpFractionPerSec * 100).toFixed(2)}% HP/s)`;
    }
    const updatePill = (el: HTMLElement | null, label: string, bonus: number) => {
      if (!el) return;
      const pct = Math.round(bonus * 100);
      el.textContent = `${label}: +${pct}%`;
      el.classList.toggle('active', pct > 0);
    };
    updatePill(this.synFaithEl, 'Fé', breakdown.faithBonus);
    updatePill(this.synFollowersEl, 'Fiéis', breakdown.followersBonus);
    updatePill(this.synFervorEl, 'Fervor', breakdown.fervorBonus);
    updatePill(this.synRelicsEl, 'Relíquias', breakdown.relicsBonus);
    updatePill(this.synIncarnationEl, 'Encarnação', breakdown.incarnationBonus);
    updatePill(this.synGnoseEl, 'Gnose', breakdown.gnoseBonus);

    const riftPctText = `${(breakdown.riftHpFraction * 100).toFixed(0)}%`;
    if (this.arenaHintTopEl) {
      const healHint =
        breakdown.altarHealOnRift >= 1
          ? ` e restaurar <strong>+${breakdown.altarHealOnRift.toFixed(0)}% do Altar</strong>`
          : '';
      this.arenaHintTopEl.innerHTML = `✦ Clique nas <strong>Fendas Divinas</strong> para aparar golpes, causar <strong>${riftPctText} de Dano Crítico</strong>${healHint}!`;
    }

    if (this.sphereSubEl) {
      this.sphereSubEl.textContent = `-${(breakdown.clickHpFraction * 100).toFixed(1)}% HP`;
    }

    const altarPercent = Math.max(
      0,
      Math.min(100, (battle.altarIntegrity / battle.maxAltarIntegrity) * 100)
    );
    if (this.altarIntegrityFillEl) {
      this.altarIntegrityFillEl.style.width = `${altarPercent.toFixed(0)}%`;
    }
    if (this.altarIntegrityValEl) {
      this.altarIntegrityValEl.textContent = `${altarPercent.toFixed(0)}%`;
    }
    if (this.penaltyHintEl) {
      const healStr =
        breakdown.altarHealOnRift >= 1
          ? ` Aparar Fenda restaura +${breakdown.altarHealOnRift.toFixed(0)}% de Integridade.`
          : '';
      this.penaltyHintEl.textContent = `Cada Fenda ignorada drena ${breakdown.altarDamageOnMiss.toFixed(0)}% da Integridade (mitigado por Relíquias, Fervor e Encarnação).${healStr}`;
    }

    if (this.combatStatsEl) {
      this.combatStatsEl.textContent = `DPS Passivo: ${formatNumber(breakdown.passiveDps)}/s (-${(breakdown.passiveHpFractionPerSec * 100).toFixed(2)}%/s) • Pulso: -${(breakdown.clickHpFraction * 100).toFixed(1)}% • Fendas Aparadas: ${battle.riftsShattered}`;
    }

    this.syncRiftsDOM(battle.activeRifts, breakdown.riftHpFraction);
  }

  private syncRiftsDOM(
    activeRifts: Array<{
      id: string;
      xPercent: number;
      yPercent: number;
      remainingSec: number;
      maxSec: number;
    }>,
    riftHpFraction: number
  ): void {
    if (!this.riftsLayerEl) return;

    const activeIds = new Set(activeRifts.map((r) => r.id));
    const riftPctLabel = `-${(riftHpFraction * 100).toFixed(0)}%`;

    // Remove expired/shattered rift elements
    Array.from(this.riftsLayerEl.children).forEach((child) => {
      const el = child as HTMLElement;
      const riftId = el.getAttribute('data-rift-id');
      if (!riftId || !activeIds.has(riftId)) {
        el.remove();
      }
    });

    // Add or update current rifts
    activeRifts.forEach((rift) => {
      let riftEl = this.riftsLayerEl!.querySelector<HTMLButtonElement>(
        `[data-rift-id="${rift.id}"]`
      );
      if (!riftEl) {
        riftEl = document.createElement('button');
        riftEl.type = 'button';
        riftEl.className = 'boss-rift-target';
        riftEl.setAttribute('data-rift-id', rift.id);
        riftEl.style.left = `${rift.xPercent}%`;
        riftEl.style.top = `${rift.yPercent}%`;
        riftEl.innerHTML = `
          <span class="boss-rift-core">✦</span>
          <span class="boss-rift-label">APARAR (${riftPctLabel})</span>
          <span class="boss-rift-timer"></span>
        `;
        riftEl.addEventListener('click', (e: MouseEvent) => {
          e.stopPropagation();
          const currentBreakdown = this.options.gameState.getBossCombatBreakdown(
            this.options.gameState.activeBossBattle?.bossId
          );
          const res = this.options.gameState.clickBossRift(rift.id);
          if (res.shattered) {
            this.options.audio.playTone(880, 'triangle', 0.16);
            const x = e.clientX || window.innerWidth / 2;
            const y = e.clientY || window.innerHeight / 2;
            const pctStr = (currentBreakdown.riftHpFraction * 100).toFixed(0);
            this.options.spawnFloatingText(x, y, `✦ FENDA ROMPIDA! -${pctStr}% HP`);
            this.updateUI();
            events.emit(GameEvents.STATE_CHANGED);
          }
        });
        this.riftsLayerEl!.appendChild(riftEl);
      }

      const labelSpan = riftEl.querySelector<HTMLElement>('.boss-rift-label');
      if (labelSpan) {
        labelSpan.textContent = `APARAR (${riftPctLabel})`;
      }

      const timerSpan = riftEl.querySelector<HTMLElement>('.boss-rift-timer');
      if (timerSpan) {
        timerSpan.textContent = `${Math.max(0, rift.remainingSec).toFixed(1)}s`;
      }
    });
  }
}
