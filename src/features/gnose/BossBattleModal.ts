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
  private preparationSummaryEl: HTMLElement | null = null;
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
  private lastRiftsMissed = 0;
  private lastPhase = 1;

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
      <div class="modal-slide-card boss-battle-card" role="dialog" aria-modal="true" aria-label="Confronto com o Guardião">
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

        <!-- SINERGIA DE RECURSOS DO CULTO (TODOS OS RECURSOS AFETAM O COMBATE E O TEMPO) -->
        <details class="boss-synergy-panel" id="boss-synergy-panel">
          <summary class="boss-synergy-header">
            <span class="boss-synergy-title">SINERGIA DO CULTO &amp; TEMPO ESTIMADO</span>
            <span class="boss-synergy-total" id="boss-synergy-total">Poder Total: ×1.00</span>
          </summary>
          <div class="boss-synergy-pills">
            <span class="boss-synergy-pill" id="boss-syn-faith" title="Fé acumulada e Fé/s aumentam o DPS e o Pulso">Fé: +0%</span>
            <span class="boss-synergy-pill" id="boss-syn-followers" title="Fiéis Devotos aumentam o DPS e curam o Altar ao aparar Fendas">Fiéis: +0%</span>
            <span class="boss-synergy-pill" id="boss-syn-fervor" title="Fervor e Ritos aumentam o DPS, o dano dos ataques e a defesa do Altar">Fervor: +0%</span>
            <span class="boss-synergy-pill" id="boss-syn-relics" title="Fragmentos e Relíquias ampliam o dano crítico das Fendas e protegem o Altar">Relíquias: +0%</span>
            <span class="boss-synergy-pill" id="boss-syn-incarnation" title="Estágio da Encarnação e Bênção multiplicam o dano e protegem o Altar">Encarnação: +0%</span>
            <span class="boss-synergy-pill" id="boss-syn-gnose" title="Gnose, Nós da Árvore e Conquistas ampliam o dano contra os Deuses Antigos">Gnose: +0%</span>
          </div>
          <p class="boss-penalty-hint" id="boss-preparation-summary"></p>
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
        <div class="boss-combat-feedback" id="boss-combat-feedback" role="status" aria-atomic="true">Clique no guardião para atacar. Apare as fendas para defender o altar e acumular Combo.</div>

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
    this.preparationSummaryEl = overlay.querySelector('#boss-preparation-summary');
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
      if (!battle) return;
      const { fpc, bossClickDamage, isCrit } = this.options.gameState.addClick();
      const rect = this.attackBtnEl!.getBoundingClientRect();
      const x = e.detail === 0 ? rect.x + rect.width / 2 : e.clientX;
      const y = e.detail === 0 ? rect.y + rect.height / 2 : e.clientY;
      if (bossClickDamage > 0) {
        this.options.audio.playTone(640 + Math.random() * 140, 'sine', 0.08);
        this.showHitFeedback(
          isCrit ? 'Golpe crítico!' : 'Golpe desferido.',
          `−${((bossClickDamage / battle.bossMaxHp) * 100).toFixed(2)}% de essência`
        );
        this.options.spawnFloatingText(
          x,
          y,
          `✦ ${isCrit ? 'CRÍTICO! ' : ''}-${formatNumber(bossClickDamage)} HP (-${((bossClickDamage / battle.bossMaxHp) * 100).toFixed(2)}%)`
        );
      } else {
        this.options.spawnFloatingText(x, y, `+${formatNumber(fpc)} FÉ`);
      }
      this.updateUI();
      events.emit(GameEvents.STATE_CHANGED);
    });

    this.options.gameState.onBossBattleFinished = ({ boss, victory }) => {
      this.handleBattleFinished(boss, victory);
    };

    document.addEventListener('keydown', (event) => {
      if (!this.isOpen()) return;
      if (event.key === 'Escape') {
        const testOverlay = document.getElementById('test-menu-overlay');
        if (testOverlay?.classList.contains('visible')) return;
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

    this.lastRiftsMissed = 0;
    this.lastPhase = 1;

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
    this.setText(this.combatFeedbackEl, 'Clique no guardião para atacar. Apare as fendas para defender o altar e acumular Combo.');

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
        'Maldição Divina Leve: -25% de Fé/s e Fervor/s por 20 segundos. Fortaleça Fé, Fiéis, Fervor, Relíquias, Encarnação e Gnose para acelerar o combate e resistir mais tempo.',
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
    const phase = battle.phase ?? this.options.gameState.getBossPhase();

    if (battle.riftsMissed > this.lastRiftsMissed) {
      this.lastRiftsMissed = battle.riftsMissed;
      this.options.audio.playTone(210, 'sawtooth', 0.14);
      this.setText(
        this.combatFeedbackEl,
        `Fenda colapsou! −${breakdown.altarDamageOnMiss.toFixed(0)}% de Integridade do Altar (Combo reiniciado).`
      );
    } else if (phase > this.lastPhase) {
      this.lastPhase = phase;
      const phaseLabel = phase === 3 ? 'Fase III: Apocalipse Divino!' : 'Fase II: Fúria do Guardião!';
      this.setText(this.combatFeedbackEl, `${phaseLabel} As Fendas surgem e colapsam mais rápido.`);
    }

    const hpPercent = Math.max(0, Math.min(100, (battle.bossHp / battle.bossMaxHp) * 100));
    if (this.bossHpFillEl) {
      const width = `${hpPercent.toFixed(1)}%`;
      if (this.bossHpFillEl.style.width !== width) this.bossHpFillEl.style.width = width;
      this.bossHpFillEl.parentElement?.setAttribute('aria-valuenow', hpPercent.toFixed(1));
    }
    const remainingPassiveSec =
      breakdown.passiveDps > 0 ? Math.ceil(battle.bossHp / breakdown.passiveDps) : Infinity;
    const etaStr = Number.isFinite(remainingPassiveSec) ? `~${remainingPassiveSec}s` : '∞';
    if (this.bossHpValEl) {
      const dpsPctStr = (breakdown.passiveHpFractionPerSec * 100).toFixed(2);
      const phaseTag = phase === 3 ? 'Fase III' : phase === 2 ? 'Fase II' : 'Fase I';
      this.setText(
        this.bossHpValEl,
        `${phaseTag} · ${formatNumber(battle.bossHp)} / ${formatNumber(battle.bossMaxHp)} (${hpPercent.toFixed(1)}% • -${dpsPctStr}%/s • ${etaStr})`
      );
    }

    // Update Resource Synergy Panel
    if (this.synergyTotalEl) {
      const readinessPct = Math.round(breakdown.cultReadiness * 100);
      this.setText(
        this.synergyTotalEl,
        `Preparo: ${readinessPct}% · Poder: ×${breakdown.totalResourceMultiplier.toFixed(2)} (Tempo passivo: ${etaStr})`
      );
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

    const gs = this.options.gameState;
    const survivalSec = Math.round(breakdown.estimatedAltarSurvivalSec);
    this.setText(
      this.preparationSummaryEl,
      `Preparo do Culto: ${Math.round(breakdown.cultReadiness * 100)}% (Resistência estimada do Altar: ~${survivalSec}s vs Tempo passivo de vitória: ~${Math.round(breakdown.estimatedPassiveVictorySec)}s). Já produzido: ${formatNumber(gs.totalFaithAccumulated)} Fé · ${formatNumber(gs.totalFervorGenerated)} Fervor · ${formatNumber(gs.totalRelicsGenerated)} Fragmentos. Evoluir todos os recursos acelera a vitória e reduz a pressão sobre o Altar.`
    );
    const setHint = (el: HTMLElement | null, hint: string) => {
      if (el && el.title !== hint) el.title = hint;
    };
    setHint(this.synFaithEl, `Fé já gerada: ${formatNumber(gs.totalFaithAccumulated)}; saldo: ${formatNumber(gs.faithPoints)}; produção: ${formatNumber(gs.getFaithPerSecond())}/s. Fortalece dano passivo, ataques e fendas.`);
    setHint(this.synFervorEl, `Fervor já gerado: ${formatNumber(gs.totalFervorGenerated)}; saldo: ${formatNumber(gs.fervorPoints)}; produção: ${formatNumber(gs.getFervorRatePerSecond())}/s. Ritos e histórico fortalecem dano e defesa do altar.`);
    setHint(this.synRelicsEl, `Fragmentos já gerados: ${formatNumber(gs.totalRelicsGenerated)}; saldo: ${formatNumber(gs.relicPoints)}; produção: ${formatNumber(gs.getRelicsRatePerSecond())}/s. Relíquias e histórico fortalecem fendas, defesa e recuperação do altar.`);

    const comboStreak = battle.comboStreak ?? 0;
    const comboMult = 1 + Math.min(0.3, comboStreak * 0.05);
    const effectiveRiftPct = Math.min(0.12, breakdown.riftHpFraction * comboMult);
    const riftPctText = `${(effectiveRiftPct * 100).toFixed(1)}%`;
    if (this.arenaHintTopEl) {
      const healHint =
        breakdown.altarHealOnRift >= 1
          ? ` e restaurar <strong>+${breakdown.altarHealOnRift.toFixed(0)}% do Altar</strong>`
          : '';
      const comboHint = comboStreak > 0 ? ` · <strong>Combo ×${comboMult.toFixed(2)}</strong>` : '';
      const hint = `Ataque o <strong>guardião</strong> e apare as <strong>Fendas Divinas</strong> para causar <strong>${riftPctText} de dano</strong>${healHint}${comboHint}.`;
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
          ? ` Aparar Fenda restaura +${breakdown.altarHealOnRift.toFixed(0)}% de Integridade e acumula até +30% de Combo.`
          : '';
      this.setText(this.penaltyHintEl, `Cada Fenda ignorada drena ${breakdown.altarDamageOnMiss.toFixed(0)}% da Integridade (mitigado por Relíquias, Fervor, Fiéis, Conquistas e Encarnação).${healStr} Derrota: −25% Fé/s e Fervor/s por 20 s. Recuar (Esc) não aplica penalidade.`);
    }

    if (this.combatStatsEl) {
      this.setText(
        this.combatStatsEl,
        `Dano passivo: −${(breakdown.passiveHpFractionPerSec * 100).toFixed(2)}%/s (${etaStr}) · Fendas: ${battle.riftsShattered} (Combo: ${comboStreak}) · Próxima fenda: ${Math.max(0, battle.riftSpawnTimerSec).toFixed(1)}s`
      );
    }

    this.syncRiftsDOM(battle.activeRifts, effectiveRiftPct);
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
          const maxHp = this.options.gameState.activeBossBattle?.bossMaxHp ?? 1;
          const res = this.options.gameState.clickBossRift(rift.id);
          if (res.shattered) {
            const actualPct = ((res.damage / maxHp) * 100).toFixed(1);
            const healStr =
              currentBreakdown.altarHealOnRift >= 1
                ? ` +${currentBreakdown.altarHealOnRift.toFixed(0)}% Altar.`
                : '';
            const comboTag = (res.comboStreak ?? 1) > 1 ? ` (Combo ×${res.comboStreak})` : '';
            this.showHitFeedback(
              `Fenda aparada!${comboTag}`,
              `−${actualPct}% de essência.${healStr}`
            );
            this.options.audio.playTone(880, 'triangle', 0.16);
            const x = e.clientX || window.innerWidth / 2;
            const y = e.clientY || window.innerHeight / 2;
            this.options.spawnFloatingText(
              x,
              y,
              `✦ FENDA ROMPIDA! -${actualPct}% HP${healStr ? ` (${healStr.trim()})` : ''}`
            );
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
