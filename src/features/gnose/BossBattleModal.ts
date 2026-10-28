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
  private attackDamageEl: HTMLElement | null = null;
  private bossPortraitEl: HTMLImageElement | null = null;
  private bossFallbackEl: HTMLElement | null = null;
  private combatFeedbackEl: HTMLElement | null = null;
  private riftsLayerEl: HTMLElement | null = null;
  private attackBtnEl: HTMLButtonElement | null = null;
  private combatStatsEl: HTMLElement | null = null;
  private retreatBtnEl: HTMLButtonElement | null = null;
  private returnFocusEl: HTMLElement | null = null;
  private backgroundInert = new Map<HTMLElement, boolean>();

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
          <button id="btn-boss-retreat" class="btn-boss-retreat" type="button" title="Cancela o combate sem penalidade. Atalho: Escape.">Recuar</button>
        </div>

        <!-- BARRA 1: ESSÊNCIA DO DEUS (HP DO BOSS) -->
        <div class="boss-bar-section">
          <div class="boss-bar-header">
            <span class="boss-bar-label">ESSÊNCIA DIVINA DO GUARDIÃO</span>
            <span class="boss-bar-val" id="boss-hp-val">100%</span>
          </div>
          <div class="boss-bar-track boss-hp-track" role="progressbar" aria-label="Essência do guardião" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100">
            <div class="boss-bar-fill boss-hp-fill" id="boss-hp-fill" style="width: 100%;"></div>
          </div>
        </div>

        <!-- SINERGIA DE RECURSOS DO CULTO (TODOS OS RECURSOS AFETAM O COMBATE) -->
        <details class="boss-synergy-panel" id="boss-synergy-panel">
          <summary class="boss-synergy-header">
            <span class="boss-synergy-title">RECURSOS DO CULTO</span>
            <span class="boss-synergy-total" id="boss-synergy-total">Poder Total: ×1.00</span>
          </summary>
          <div class="boss-synergy-pills">
            <span class="boss-synergy-pill" id="boss-syn-faith" title="Fé acumulada e Fé/s aumentam o DPS e o Pulso">Fé: +0%</span>
            <span class="boss-synergy-pill" id="boss-syn-followers" title="Fiéis Devotos aumentam o DPS e curam o Altar ao aparar Fendas">Fiéis: +0%</span>
            <span class="boss-synergy-pill" id="boss-syn-fervor" title="Fervor e Ritos aumentam o DPS, o dano dos ataques e a defesa do Altar">Fervor: +0%</span>
            <span class="boss-synergy-pill" id="boss-syn-relics" title="Fragmentos e Relíquias ampliam o dano crítico das Fendas e protegem o Altar">Relíquias: +0%</span>
            <span class="boss-synergy-pill" id="boss-syn-incarnation" title="Estágio da Encarnação e Bênção multiplicam o dano e protegem o Altar">Encarnação: +0%</span>
            <span class="boss-synergy-pill" id="boss-syn-gnose" title="Gnose e Nós da Árvore ampliam o dano contra os Deuses Antigos">Gnose: +0%</span>
          </div>
        </details>

        <div class="boss-arena-hint-top" id="boss-arena-hint-top"></div>

        <!-- O próprio guardião é o alvo; as fendas ficam sobre a arte. -->
        <div class="boss-arena-stage" id="boss-arena-stage">
          <button id="boss-arena-attack-btn" class="boss-attack-target" type="button" aria-label="Atacar o guardião" aria-describedby="boss-arena-hint-top boss-attack-damage">
            <img id="boss-arena-portrait" class="boss-portrait" alt="" draggable="false" hidden>
            <span id="boss-arena-fallback" class="boss-portrait-fallback" aria-hidden="true"></span>
            <span class="boss-attack-caption" aria-hidden="true">ATACAR <span id="boss-attack-damage"></span></span>
          </button>

          <!-- Camada de Fendas de Blasfêmia / Julgamento -->
          <div class="boss-rifts-layer" id="boss-rifts-layer"></div>

        </div>
        <div class="boss-combat-feedback" id="boss-combat-feedback" role="status" aria-atomic="true">Clique no guardião para atacar. Apare as fendas para defender o altar.</div>

        <!-- BARRA 2: INTEGRIDADE DO ALTAR (SEM TIMER DE RELÓGIO) -->
        <div class="boss-bar-section altar-integrity-section">
          <div class="boss-bar-header">
            <span class="boss-bar-label">${icon('shield')} INTEGRIDADE DO ALTAR</span>
            <span class="boss-bar-val" id="boss-altar-val">100%</span>
          </div>
          <div class="boss-bar-track altar-integrity-track" role="progressbar" aria-label="Integridade do altar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100">
            <div class="boss-bar-fill altar-integrity-fill" id="boss-altar-fill" style="width: 100%;"></div>
          </div>
        </div>
        <div class="boss-combat-stats" id="boss-combat-stats"></div>
        <details class="boss-battle-details">
          <summary>Sobre o guardião e as regras do combate</summary>
          <p class="boss-modal-lore" id="boss-modal-lore"></p>
          <p class="boss-penalty-hint" id="boss-penalty-hint"></p>
        </details>
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
    this.attackDamageEl = overlay.querySelector('#boss-attack-damage');
    this.bossPortraitEl = overlay.querySelector('#boss-arena-portrait');
    this.bossFallbackEl = overlay.querySelector('#boss-arena-fallback');
    this.combatFeedbackEl = overlay.querySelector('#boss-combat-feedback');
    this.riftsLayerEl = overlay.querySelector('#boss-rifts-layer');
    this.attackBtnEl = overlay.querySelector('#boss-arena-attack-btn');
    this.combatStatsEl = overlay.querySelector('#boss-combat-stats');
    this.retreatBtnEl = overlay.querySelector('#btn-boss-retreat');
    if (this.attackBtnEl) this.attackBtnEl.title = 'Clique para atacar, ou use Enter/Espaço com o alvo em foco. Até 5 ataques/s; 5% de chance de dano crítico dobrado.';
  }

  private bindEvents(): void {
    this.retreatBtnEl?.addEventListener('click', () => {
      this.options.gameState.retreatBossBattle();
      this.close();
    });

    this.bossPortraitEl?.addEventListener('error', () => {
      if (this.bossPortraitEl) this.bossPortraitEl.hidden = true;
      if (this.bossFallbackEl) this.bossFallbackEl.hidden = false;
    });

    this.attackBtnEl?.addEventListener('click', (e: MouseEvent) => {
      const battle = this.options.gameState.activeBossBattle;
      if (!battle || battle.sphereCooldownSec > 1e-8) return;
      const { bossClickDamage, isCrit } = this.options.gameState.addClick();
      this.options.audio.playTone(640 + Math.random() * 140, 'sine', 0.08);
      const rect = this.attackBtnEl!.getBoundingClientRect();
      const x = e.detail === 0 ? rect.x + rect.width / 2 : e.clientX;
      const y = e.detail === 0 ? rect.y + rect.height / 2 : e.clientY;
      this.showHitFeedback(isCrit ? 'Golpe crítico!' : 'Golpe desferido.', `−${(bossClickDamage / battle.bossMaxHp * 100).toFixed(2)}% de essência`);
      this.options.spawnFloatingText(
        x,
        y,
        `✦ ${isCrit ? 'CRÍTICO! ' : ''}-${formatNumber(bossClickDamage)} HP (-${(bossClickDamage / battle.bossMaxHp * 100).toFixed(2)}%)`
      );
      this.updateUI();
      events.emit(GameEvents.STATE_CHANGED);
    });

    this.options.gameState.onBossBattleFinished = ({ boss, victory }) => {
      this.handleBattleFinished(boss, victory);
    };

    document.addEventListener('keydown', (event) => {
      if (!this.isOpen()) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.options.gameState.retreatBossBattle();
        this.close();
      } else if (event.key === 'Tab') {
        const targets = Array.from(this.overlayEl!.querySelectorAll<HTMLElement>('summary, button:not(:disabled)'));
        const first = targets[0], last = targets[targets.length - 1];
        if (event.shiftKey && (document.activeElement === first || !this.overlayEl!.contains(document.activeElement))) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !this.overlayEl!.contains(document.activeElement))) {
          event.preventDefault();
          first?.focus();
        }
      }
      event.stopPropagation();
    }, true);

    document.addEventListener('focusin', (event) => {
      if (this.isOpen() && !this.overlayEl!.contains(event.target as Node)) this.retreatBtnEl?.focus();
    });
  }

  private isOpen(): boolean {
    return this.overlayEl?.style.display === 'flex';
  }

  private setText(el: HTMLElement | null, value: string): void {
    if (el && el.textContent !== value) el.textContent = value;
  }

  private showHitFeedback(label: string, detail: string): void {
    this.setText(this.combatFeedbackEl, `${label} ${detail}`);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const target = this.bossPortraitEl?.hidden ? this.bossFallbackEl : this.bossPortraitEl;
    target?.getAnimations().forEach(animation => animation.cancel());
    target?.animate([{ filter: 'brightness(1.5)' }, { filter: 'brightness(1)' }], { duration: 180 });
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
    if (this.bossNameEl) this.setText(this.bossNameEl, boss.name.toUpperCase());
    if (this.bossTitleEl) this.setText(this.bossTitleEl, boss.title);
    if (this.bossMythEl) this.setText(this.bossMythEl, boss.mythology.toUpperCase());
    if (this.bossLoreEl) this.setText(this.bossLoreEl, boss.lore);
    this.attackBtnEl?.setAttribute('aria-label', `Atacar ${boss.name}`);
    if (this.bossFallbackEl) {
      this.bossFallbackEl.innerHTML = iconOrText(boss.symbol);
      this.bossFallbackEl.hidden = Boolean(boss.portraitSrc);
    }
    if (this.bossPortraitEl) {
      this.bossPortraitEl.hidden = !boss.portraitSrc;
      if (boss.portraitSrc) this.bossPortraitEl.src = boss.portraitSrc;
      else this.bossPortraitEl.removeAttribute('src');
    }
    this.setText(this.combatFeedbackEl, 'Clique no guardião para atacar. Apare as fendas para defender o altar.');

    if (this.riftsLayerEl) {
      this.riftsLayerEl.innerHTML = '';
    }

    if (this.overlayEl) {
      this.returnFocusEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      for (const element of Array.from(document.body.children)) {
        if (element instanceof HTMLElement && element !== this.overlayEl) {
          this.backgroundInert.set(element, element.inert);
          element.inert = true;
        }
      }
      this.overlayEl.style.display = 'flex';
      this.overlayEl.classList.add('open', 'active');
    }

    this.options.audio.playTone(320, 'triangle', 0.25);
    this.updateUI();
    this.retreatBtnEl?.focus();
    return true;
  }

  public close(): void {
    const wasOpen = this.isOpen();
    if (this.overlayEl) {
      this.overlayEl.style.display = 'none';
      this.overlayEl.classList.remove('open', 'active');
    }
    if (this.riftsLayerEl) {
      this.riftsLayerEl.innerHTML = '';
    }
    for (const [element, inert] of this.backgroundInert) element.inert = inert;
    this.backgroundInert.clear();
    if (wasOpen && this.returnFocusEl?.isConnected) this.returnFocusEl.focus();
    this.returnFocusEl = null;
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
    if (!battle) {
      if (this.isOpen()) this.close();
      return;
    }

    const breakdown = this.options.gameState.getBossCombatBreakdown(battle.bossId);

    const hpPercent = Math.max(0, Math.min(100, (battle.bossHp / battle.bossMaxHp) * 100));
    if (this.bossHpFillEl) {
      const width = `${hpPercent.toFixed(1)}%`;
      if (this.bossHpFillEl.style.width !== width) this.bossHpFillEl.style.width = width;
      this.bossHpFillEl.parentElement?.setAttribute('aria-valuenow', hpPercent.toFixed(1));
    }
    if (this.bossHpValEl) {
      const dpsPctStr = (breakdown.passiveHpFractionPerSec * 100).toFixed(2);
      this.setText(this.bossHpValEl, `${formatNumber(battle.bossHp)} / ${formatNumber(battle.bossMaxHp)} (${hpPercent.toFixed(1)}% • -${dpsPctStr}%/s)`);
    }

    // Update Resource Synergy Panel
    if (this.synergyTotalEl) {
      this.setText(this.synergyTotalEl, `Ressonância: ×${breakdown.totalResourceMultiplier.toFixed(2)} (-${(breakdown.passiveHpFractionPerSec * 100).toFixed(2)}% HP/s)`);
    }
    const updatePill = (el: HTMLElement | null, label: string, bonus: number) => {
      if (!el) return;
      const pct = Math.round(bonus * 100);
      this.setText(el, `${label}: +${pct}%`);
      el.classList.toggle('active', pct > 0);
    };
    updatePill(this.synFaithEl, 'Fé', breakdown.faithBonus);
    updatePill(this.synFollowersEl, 'Fiéis', breakdown.followersBonus);
    updatePill(this.synFervorEl, 'Fervor', breakdown.fervorBonus);
    updatePill(this.synRelicsEl, 'Relíquias', breakdown.relicsBonus);
    updatePill(this.synIncarnationEl, 'Encarnação', breakdown.incarnationBonus);
    updatePill(this.synGnoseEl, 'Gnose', breakdown.gnoseBonus);

    const riftPctText = `${(breakdown.riftHpFraction * 100).toFixed(1)}%`;
    if (this.arenaHintTopEl) {
      const healHint =
        breakdown.altarHealOnRift >= 1
          ? ` e restaurar <strong>+${breakdown.altarHealOnRift.toFixed(0)}% do Altar</strong>`
          : '';
      const hint = `Ataque o <strong>guardião</strong> e apare as <strong>Fendas Divinas</strong> para causar <strong>${riftPctText} de dano</strong>${healHint}.`;
      if (this.arenaHintTopEl.innerHTML !== hint) this.arenaHintTopEl.innerHTML = hint;
    }

    if (this.attackDamageEl) {
      this.setText(this.attackDamageEl, `−${(breakdown.clickHpFraction * 100).toFixed(2)}% por golpe`);
    }

    if (this.attackBtnEl) {
      const cooling = battle.sphereCooldownSec > 1e-8;
      // Keep keyboard focus stable during the short cooldown.
      this.attackBtnEl.setAttribute('aria-disabled', String(cooling));
    }

    const altarPercent = Math.max(
      0,
      Math.min(100, (battle.altarIntegrity / battle.maxAltarIntegrity) * 100)
    );
    if (this.altarIntegrityFillEl) {
      const width = `${altarPercent.toFixed(0)}%`;
      if (this.altarIntegrityFillEl.style.width !== width) this.altarIntegrityFillEl.style.width = width;
      this.altarIntegrityFillEl.parentElement?.setAttribute('aria-valuenow', altarPercent.toFixed(0));
      this.altarIntegrityFillEl.parentElement?.classList.toggle('is-critical', altarPercent <= 25);
    }
    if (this.altarIntegrityValEl) {
      this.setText(this.altarIntegrityValEl, `${altarPercent <= 25 ? 'EM RISCO · ' : ''}${altarPercent.toFixed(0)}%`);
    }
    if (this.penaltyHintEl) {
      const healStr =
        breakdown.altarHealOnRift >= 1
          ? ` Aparar Fenda restaura +${breakdown.altarHealOnRift.toFixed(0)}% de Integridade.`
          : '';
      this.setText(this.penaltyHintEl, `Cada Fenda ignorada drena ${breakdown.altarDamageOnMiss.toFixed(0)}% da Integridade (mitigado por Relíquias, Fervor e Encarnação).${healStr} Derrota: −25% Fé/s e Fervor/s por 20 s. Recuar (Esc) não aplica penalidade.`);
    }

    if (this.combatStatsEl) {
      this.setText(this.combatStatsEl, `Dano passivo: −${(breakdown.passiveHpFractionPerSec * 100).toFixed(2)}%/s · Fendas aparadas: ${battle.riftsShattered} · Próxima fenda: ${Math.max(0, battle.riftSpawnTimerSec).toFixed(1)}s`);
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
    const riftPctLabel = `-${(riftHpFraction * 100).toFixed(1)}%`;

    // Remove expired/shattered rift elements
    Array.from(this.riftsLayerEl.children).forEach((child) => {
      const el = child as HTMLElement;
      const riftId = el.getAttribute('data-rift-id');
      if (!riftId || !activeIds.has(riftId)) {
        const hadFocus = el.contains(document.activeElement);
        el.remove();
        if (hadFocus && this.isOpen()) this.attackBtnEl?.focus({ preventScroll: true });
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
        riftEl.setAttribute('aria-label', 'Aparar Fenda Divina: causa dano e protege o altar');
        riftEl.style.left = `clamp(58px, ${rift.xPercent}%, calc(100% - 58px))`;
        riftEl.style.top = `clamp(38px, ${rift.yPercent}%, calc(100% - 38px))`;
        riftEl.innerHTML = `
          <span class="boss-rift-core">✦</span>
          <span class="boss-rift-label">APARAR (${riftPctLabel})</span>
          <span class="boss-rift-timer"></span>
          <span class="boss-rift-window" aria-hidden="true"><span class="boss-rift-window-fill"></span></span>
        `;
        riftEl.addEventListener('click', (e: MouseEvent) => {
          e.stopPropagation();
          const currentBreakdown = this.options.gameState.getBossCombatBreakdown(
            this.options.gameState.activeBossBattle?.bossId
          );
          const res = this.options.gameState.clickBossRift(rift.id);
          if (res.shattered) {
            this.showHitFeedback('Fenda aparada!', `−${(currentBreakdown.riftHpFraction * 100).toFixed(1)}% de essência. Altar protegido.`);
            this.options.audio.playTone(880, 'triangle', 0.16);
            const x = e.clientX || window.innerWidth / 2;
            const y = e.clientY || window.innerHeight / 2;
            const pctStr = (currentBreakdown.riftHpFraction * 100).toFixed(1);
            this.options.spawnFloatingText(x, y, `✦ FENDA ROMPIDA! -${pctStr}% HP`);
            this.updateUI();
            events.emit(GameEvents.STATE_CHANGED);
          }
        });
        this.riftsLayerEl!.appendChild(riftEl);
      }

      const percentLabel = `Aparar Fenda Divina: ${(riftHpFraction * 100).toFixed(1)}% de dano ao guardião`;
      if (riftEl.getAttribute('aria-label') !== percentLabel) riftEl.setAttribute('aria-label', percentLabel);
      const labelSpan = riftEl.querySelector<HTMLElement>('.boss-rift-label');
      if (labelSpan) {
        this.setText(labelSpan, `APARAR (${riftPctLabel})`);
      }

      const timerSpan = riftEl.querySelector<HTMLElement>('.boss-rift-timer');
      if (timerSpan) {
        this.setText(timerSpan, `${Math.max(0, rift.remainingSec).toFixed(1)}s`);
      }
      riftEl.classList.toggle('is-urgent', rift.remainingSec <= 1);
      const windowFill = riftEl.querySelector<HTMLElement>('.boss-rift-window-fill');
      if (windowFill) windowFill.style.width = `${Math.max(0, Math.min(100, rift.remainingSec / rift.maxSec * 100))}%`;
    });
  }
}
