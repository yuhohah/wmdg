import { GameStateManager } from '../../core/GameState.js';
import { AudioManager } from '../../systems/audio.js';
import { NotificationManager } from '../../systems/notifications.js';
import { GNOSE_BOSSES, BOSS_DAMAGE_READINESS_THRESHOLD } from '../../config/bosses.js';
import { formatNumber } from '../../systems/calculations.js';
import { formatFixed } from '../../systems/numberFormat.js';
import { events, GameEvents } from '../../core/EventBus.js';
import type { ActiveBossMiracle, BossRift, GnoseBoss } from '../../types.js';
import { icon } from '../../ui/icons.js';
import { effectEasing, visualFrameScale, VisualFrameClock } from '../../ui/visualTiming.js';
import { loadFollowerSprites } from '../followers/followerVisuals.js';
import { incarnationStageIndex } from '../incarnation/incarnationSprites.js';
import {
  BOSS_SPRITE_FOLDERS,
  bossSheetFrameCount,
  loadBossSprites,
  loadIncarnationProcessionSprite,
  onBossSpriteLoaded,
  resolveBossRenderFrame,
  type BossRenderFrame,
} from './battle/BossSprites.js';
import {
  BOSS_COMBAT_SPOT,
  BOSS_DESCENT_SPEED,
  BOSS_DISTANT_SPAWN,
  BOSS_SPHERE_CENTER,
  bossHpLabel,
  buildPolyline,
  CLIMAX_DURATION_SEC,
  computeProcessionRoutes,
  FOLLOWERS_FALLBACK_BOX,
  getElementWorldBox,
  INCARNATION_FALLBACK_SPAWN,
  INCARNATION_OUTBOUND_SPEED,
  PARRY_RECOVERY_SEC,
  parryCardPosition,
  polylineLength,
  PROCESSION_QUEUE_SPEED,
  resolveMiracleFollowerActor,
  RIFT_TELEGRAPH_BEFORE_ATTACK_SEC,
  SACRED_CIRCLE_RADIUS,
  samplePolylineAt,
  stepDamageTrail,
  syncBattleFollowerCohort,
  type BattleCameraTarget,
  type BattleFollowerActor,
  type BattleFollowerSnapshot,
  type DamageTrail,
  type PathSample,
  type PendingBattleClimax,
} from './battle/BattleChoreography.js';
import {
  battleCanvasScale,
  renderBattleWorldScene,
  type DrawOrderEntry,
} from './battle/BattleWorldRenderer.js';

export {
  battleCanvasScale,
  bossHpLabel,
  loadBossSprites,
  parryCardPosition,
  stepDamageTrail,
  type BattleCameraTarget,
  type BattleFollowerSnapshot,
  type DamageTrail,
};

export interface BossBattleModalOptions {
  gameState: GameStateManager;
  audio: AudioManager;
  notifications: NotificationManager;
  spawnFloatingText: (x: number, y: number, text: string, small?: boolean) => void;
  onBattleEnded?: (boss: GnoseBoss, victory: boolean) => void;
  onCameraFrame?: (target: BattleCameraTarget, elapsedSec: number) => void;
}

export class BossBattleModal {
  private options: BossBattleModalOptions;
  private worldStageEl: HTMLElement | null = null;
  private worldCanvasEl: HTMLCanvasElement | null = null;
  private worldCtx: CanvasRenderingContext2D | null = null;
  private worldCanvasScale = 1;

  private bossHpPlateEl: HTMLElement | null = null;
  private bossWorldHpLabelEl: HTMLElement | null = null;
  private bossHpFillEl: HTMLElement | null = null;
  private bossHpTrailEl: HTMLElement | null = null;
  private altarTrailEl: HTMLElement | null = null;
  private bossTrail: DamageTrail = { value: 100, holdSec: 0 };
  private altarTrail: DamageTrail = { value: 100, holdSec: 0 };
  private lastBossTrailWidth = '';
  private lastAltarTrailWidth = '';
  private lastBossAriaNow = '';
  private lastAltarAriaNow = '';
  private lastAttackDisabled = '';
  private bossHpValEl: HTMLElement | null = null;

  private sphereHpPlateEl: HTMLElement | null = null;
  private altarIntegrityFillEl: HTMLElement | null = null;
  private altarIntegrityValEl: HTMLElement | null = null;

  private attackDamageEl: HTMLElement | null = null;
  private combatFeedbackEl: HTMLElement | null = null;
  private riftsLayerEl: HTMLElement | null = null;
  private attackBtnEl: HTMLButtonElement | null = null;
  private miracleBtnEl: HTMLButtonElement | null = null;
  private phaseBannerEl: HTMLElement | null = null;
  private combatStatsEl: HTMLElement | null = null;
  private retreatBtnEl: HTMLButtonElement | null = null;
  private returnFocusEl: HTMLElement | null = null;
  private lastRiftsMissed = 0;
  private lastPhase = 1;

  // World Battle Scene State (Boss, Incarnation, Followers)
  private isBattleActive = false;
  private animFrameId: number | null = null;
  private speedMultiplier = 1;
  private activeBossIdForScene = 'boss_anubis';

  private bossX = BOSS_DISTANT_SPAWN.x;
  private bossY = BOSS_DISTANT_SPAWN.y;
  private bossState: 'awaiting_ritual' | 'walking' | 'attacking' | 'idle' = 'awaiting_ritual';
  private bossWalkTimeSec = 0;
  private bossAttackIndex = 0;
  private bossAttackFrameTimeSec = 0;
  private bossHitFlashSec = 0;
  private bossParryRecoverySec = 0;
  private cameraPhase: BattleCameraTarget['phase'] | null = null;
  private attackedRiftIds = new Set<string>();

  private incX = INCARNATION_FALLBACK_SPAWN.x;
  private incY = INCARNATION_FALLBACK_SPAWN.y;
  private incFacing: 1 | -1 = 1;
  private incState: 'walking_to_patio' | 'gathering_at_patio' | 'leading_procession' | 'guarding' | 'leading_return' | 'returning_to_altar' =
    'walking_to_patio';
  private incTimerSec = 0;
  private incWalkCycle = 0;
  private incCallRingProgress = 0;
  private incGuardSpot = {
    x: BOSS_SPHERE_CENTER.x + SACRED_CIRCLE_RADIUS,
    y: BOSS_SPHERE_CENTER.y,
  };

  private returnPath: PathSample[] = [];
  private returnS = 0;
  private followerReturnPaths = new Map<number, { path: PathSample[]; s: number }>();

  private patioGatherSpot = { x: 2200, y: 1165 };
  private outboundPath: PathSample[] = [];
  private incOutboundS = 0;
  private processionPath: PathSample[] = [];
  private incProcessionS = 0;
  private circleStartS = 0;
  private circleLength = 1;
  private queueSpacing = 52;

  private followerActors: BattleFollowerActor[] = [];
  private syncedFollowerTotal = -1;
  private spherePulseAlpha = 0;
  private phaseShockwaveAlpha = 0;
  private phaseBannerTimerSec = 0;
  private miracleBeam: { fromX: number; fromY: number; alpha: number } | null = null;
  private climaxState: PendingBattleClimax | null = null;

  // Dynamically expanded in ensureStageBounds() to cover any dragged card positions on the board
  private stageWidth = 3200;
  private stageHeight = 1900;
  private stageOriginX = 80;
  private stageOriginY = 0;

  private readonly drawOrderPool: DrawOrderEntry[] = [];

  constructor(options: BossBattleModalOptions) {
    this.options = options;
    this.initDOM();
    this.bindEvents();
    onBossSpriteLoaded(() => {
      if (this.isOpen()) {
        this.drawWorldScene();
      }
    });
  }

  public setSpeedMultiplier(mult: number): void {
    this.speedMultiplier = Math.max(0, mult);
  }

  public getChoreographySnapshot(): {
    bossState: 'awaiting_ritual' | 'walking' | 'attacking' | 'idle';
    bossX: number;
    bossY: number;
    combatStarted: boolean;
    incState: 'walking_to_patio' | 'gathering_at_patio' | 'leading_procession' | 'guarding' | 'leading_return' | 'returning_to_altar';
    incX: number;
    incY: number;
    incGuardSpot: { x: number; y: number };
    circleRadius: number;
    patioGatherSpot: { x: number; y: number };
    outboundPath: Array<{ x: number; y: number; s: number }>;
    processionPath: Array<{ x: number; y: number; s: number }>;
    circleStartS: number;
    followers: BattleFollowerSnapshot[];
    climaxRemainingSec: number;
    incarnationHome: { x: number; y: number };
    followerHomes: Array<{ id: number; x: number; y: number }>;
  } {
    return {
      incarnationHome: { x: this.outboundPath[0]?.x ?? this.incX, y: this.outboundPath[0]?.y ?? this.incY },
      followerHomes: this.followerActors.map(f => ({ id: f.id, x: f.startX, y: f.startY })),
      bossState: this.bossState,
      bossX: this.bossX,
      bossY: this.bossY,
      combatStarted: this.options.gameState.activeBossBattle?.combatStarted !== false,
      incState: this.incState,
      incX: this.incX,
      incY: this.incY,
      incGuardSpot: { ...this.incGuardSpot },
      circleRadius: SACRED_CIRCLE_RADIUS,
      patioGatherSpot: { ...this.patioGatherSpot },
      outboundPath: this.outboundPath.map((p) => ({ ...p })),
      processionPath: this.processionPath.map((p) => ({ ...p })),
      circleStartS: this.circleStartS,
      followers: this.followerActors.map((f) => ({
        id: f.id,
        x: f.x,
        y: f.y,
        state: f.state,
        trailS: f.trailS,
        stopS: f.stopS,
      })),
      climaxRemainingSec: this.climaxState?.remainingSec ?? 0,
    };
  }

  private ensureStageBounds(
    incBox: { x: number; y: number; w: number; h: number },
    fBox: { x: number; y: number; w: number; h: number }
  ): void {
    const pad = 200;
    const minX = Math.max(
      0,
      Math.floor(
        Math.min(
          80,
          BOSS_SPHERE_CENTER.x - SACRED_CIRCLE_RADIUS - pad,
          BOSS_DISTANT_SPAWN.x - pad,
          incBox.x - pad,
          fBox.x - pad
        )
      )
    );
    const minY = Math.max(
      0,
      Math.floor(
        Math.min(
          0,
          BOSS_SPHERE_CENTER.y - SACRED_CIRCLE_RADIUS - pad,
          BOSS_DISTANT_SPAWN.y - pad,
          incBox.y - pad,
          fBox.y - pad
        )
      )
    );
    const maxX = Math.ceil(
      Math.max(
        3100,
        BOSS_SPHERE_CENTER.x + SACRED_CIRCLE_RADIUS + pad,
        incBox.x + incBox.w + pad,
        fBox.x + fBox.w + pad
      )
    );
    const maxY = Math.ceil(
      Math.max(
        1840,
        BOSS_SPHERE_CENTER.y + SACRED_CIRCLE_RADIUS + pad,
        incBox.y + incBox.h + pad,
        fBox.y + fBox.h + pad
      )
    );

    const newW = Math.max(1600, maxX - minX);
    const newH = Math.max(1200, maxY - minY);

    if (
      minX !== this.stageOriginX ||
      minY !== this.stageOriginY ||
      newW !== this.stageWidth ||
      newH !== this.stageHeight
    ) {
      this.stageOriginX = minX;
      this.stageOriginY = minY;
      this.stageWidth = newW;
      this.stageHeight = newH;

      if (this.worldStageEl) {
        this.worldStageEl.style.left = `${this.stageOriginX}px`;
        this.worldStageEl.style.top = `${this.stageOriginY}px`;
        this.worldStageEl.style.width = `${this.stageWidth}px`;
        this.worldStageEl.style.height = `${this.stageHeight}px`;
      }
      if (this.isBattleActive) this.allocateWorldCanvas();
    }

    const sphereLocalX = BOSS_SPHERE_CENTER.x - this.stageOriginX;
    const sphereLocalY = BOSS_SPHERE_CENTER.y - this.stageOriginY;

    if (this.sphereHpPlateEl) {
      this.sphereHpPlateEl.style.left = `${sphereLocalX}px`;
      this.sphereHpPlateEl.style.top = `${sphereLocalY + 206}px`;
    }
    if (this.phaseBannerEl) {
      this.phaseBannerEl.style.left = `${sphereLocalX - 160}px`;
      this.phaseBannerEl.style.top = `${sphereLocalY - 265}px`;
    }
  }

  private initDOM(): void {
    document.getElementById('gnose-boss-battle-overlay')?.remove();
    if (typeof document.querySelectorAll === 'function') {
      document.querySelectorAll('#boss-world-stage').forEach((el) => el.remove());
    } else {
      document.getElementById('boss-world-stage')?.remove();
    }

    // World-space Battle Stage anchored around the central Sphere (1740, 854)
    const worldEl = document.getElementById('dodeca-board-world');
    const stage = document.createElement('div');
    stage.id = 'boss-world-stage';
    stage.className = 'boss-world-stage';
    stage.style.display = 'none';
    stage.style.left = `${this.stageOriginX}px`;
    stage.style.top = `${this.stageOriginY}px`;
    stage.style.width = `${this.stageWidth}px`;
    stage.style.height = `${this.stageHeight}px`;

    const sphereLocalX = BOSS_SPHERE_CENTER.x - this.stageOriginX;
    const sphereLocalY = BOSS_SPHERE_CENTER.y - this.stageOriginY;

    stage.innerHTML = `
      <canvas id="boss-world-canvas" class="boss-world-canvas" width="1" height="1" aria-hidden="true"></canvas>
      <div class="boss-arena-stage boss-world-interactive" id="boss-arena-stage">
        <button id="boss-arena-attack-btn" class="boss-attack-target boss-world-hitbox" type="button" aria-label="Atacar o guardião" aria-describedby="boss-attack-damage">
          <img id="boss-arena-portrait" class="boss-portrait" alt="" draggable="false" hidden>
          <span id="boss-arena-fallback" class="boss-portrait-fallback" aria-hidden="true" hidden></span>
          <span class="boss-attack-caption" aria-hidden="true">ATACAR <span id="boss-attack-damage"></span></span>
        </button>

        <!-- BARRA 1: VIDA DO CHEFE (EMBAIXO DO BOSS, ACOMPANHANDO SUA POSIÇÃO) -->
        <div class="boss-bar-section boss-world-hp-plate" id="boss-world-hp-plate">
          <div class="boss-bar-header">
            <span class="boss-bar-label" id="boss-world-hp-label">ANÚBIS</span>
            <span class="boss-bar-val" id="boss-hp-val">100%</span>
          </div>
          <div class="boss-bar-track boss-hp-track" role="progressbar" aria-label="Essência do guardião" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100">
            <div class="boss-bar-trail" id="boss-hp-trail" style="width: 100%;"></div>
            <div class="boss-bar-fill boss-hp-fill" id="boss-hp-fill" style="width: 100%;"></div>
          </div>
          <div class="boss-world-subline" id="boss-combat-feedback" role="status" aria-atomic="true"></div>
        </div>

        <!-- BARRA 2: VIDA / INTEGRIDADE DA ESFERA + BOTÃO RECUAR (EMBAIXO DA ESFERA CENTRAL) -->
        <div class="boss-bar-section altar-integrity-section sphere-world-hp-plate" id="sphere-world-hp-plate" style="left: ${sphereLocalX}px; top: ${sphereLocalY + 206}px;">
          <div class="boss-bar-header">
            <span class="boss-bar-label">${icon('shield')} INTEGRIDADE DA ESFERA</span>
            <span class="boss-bar-val" id="boss-altar-val">100%</span>
          </div>
          <div class="boss-bar-track altar-integrity-track" role="progressbar" aria-label="Integridade do altar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100">
            <div class="boss-bar-trail" id="boss-altar-trail" style="width: 100%;"></div>
            <div class="boss-bar-fill altar-integrity-fill" id="boss-altar-fill" style="width: 100%;"></div>
          </div>
          <div class="sphere-world-actions">
            <span class="boss-world-combo-stat" id="boss-combat-stats"></span>
            <button id="btn-boss-retreat" class="btn-boss-retreat btn-world-retreat" type="button" title="Cancela o combate sem penalidade. Atalho: Escape.">Recuar</button>
          </div>
        </div>

        <div class="boss-rifts-layer" id="boss-rifts-layer"></div>
      </div>
    `;

    const phaseBanner = document.createElement('div');
    phaseBanner.id = 'boss-phase-banner';
    phaseBanner.className = 'boss-phase-banner';
    phaseBanner.style.display = 'none';
    phaseBanner.style.left = `${sphereLocalX - 160}px`;
    phaseBanner.style.top = `${sphereLocalY - 265}px`;
    stage.appendChild(phaseBanner);
    this.phaseBannerEl = phaseBanner;

    if (worldEl) {
      worldEl.appendChild(stage);
    } else {
      document.body.appendChild(stage);
    }
    this.worldStageEl = stage;
    this.worldCanvasEl = stage.querySelector<HTMLCanvasElement>('#boss-world-canvas');
    if (this.worldCanvasEl) {
      try {
        this.worldCtx = this.worldCanvasEl.getContext('2d', { alpha: true });
      } catch {
        this.worldCtx = null;
      }
    }

    this.bossHpPlateEl = stage.querySelector('#boss-world-hp-plate');
    this.bossWorldHpLabelEl = stage.querySelector('#boss-world-hp-label');
    this.bossHpFillEl = stage.querySelector('#boss-hp-fill');
    this.bossHpTrailEl = stage.querySelector('#boss-hp-trail');
    this.altarTrailEl = stage.querySelector('#boss-altar-trail');
    this.bossHpValEl = stage.querySelector('#boss-hp-val');

    this.sphereHpPlateEl = stage.querySelector('#sphere-world-hp-plate');
    this.altarIntegrityFillEl = stage.querySelector('#boss-altar-fill');
    this.altarIntegrityValEl = stage.querySelector('#boss-altar-val');

    this.combatFeedbackEl = stage.querySelector('#boss-combat-feedback');
    this.combatStatsEl = stage.querySelector('#boss-combat-stats');
    this.retreatBtnEl = stage.querySelector('#btn-boss-retreat');

    this.attackDamageEl = stage.querySelector('#boss-attack-damage');
    this.riftsLayerEl = stage.querySelector('#boss-rifts-layer');
    this.attackBtnEl = stage.querySelector('#boss-arena-attack-btn');
  }

  private bindEvents(): void {
    this.retreatBtnEl?.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      this.options.gameState.retreatBossBattle();
      this.close();
    });

    this.attackBtnEl?.addEventListener('click', (e: MouseEvent) => {
      const battle = this.options.gameState.activeBossBattle;
      if (!battle || battle.combatStarted === false) return;
      const { fpc, bossClickDamage, bossIsCrit } = this.options.gameState.addClick();
      const rect = this.attackBtnEl!.getBoundingClientRect();
      const x = e.detail === 0 ? rect.x + rect.width / 2 : e.clientX;
      const y = e.detail === 0 ? rect.y + rect.height / 2 : e.clientY;
      this.onPlayerAttackHit(fpc, bossClickDamage, bossIsCrit, x, y);
    });

    // Clicking the central Divine Sphere during combat shows normal attack feedback.
    const sphereBtn = document.getElementById('divine-sphere-btn');
    sphereBtn?.addEventListener('click', (e: MouseEvent) => {
      const battle = this.options.gameState.activeBossBattle;
      if (!battle || !this.isOpen() || battle.combatStarted === false) return;
      this.bossHitFlashSec = 0.18;
      const breakdown = this.options.gameState.getBossCombatBreakdown(battle.bossId);
      this.showHitFeedback(`\u2212${formatFixed(breakdown.clickHpFraction * 100, 2)}%`);
      if (e.clientX && e.clientY) {
        this.options.spawnFloatingText(
          e.clientX,
          e.clientY - 28,
          `\u2212${formatFixed(breakdown.clickHpFraction * 100, 2)}%`,
          true
        );
      }
      this.updateUI();
    });

    this.options.gameState.onBossBattleFinished = ({ boss, victory, isRematch, durationSec }) => {
      this.handleBattleFinished(boss, victory, isRematch ?? false, durationSec ?? 0);
    };

    document.addEventListener('keydown', (event) => {
      if (!this.isOpen()) return;
      if (event.key === 'Escape') {
        if (document.querySelector('dialog[open]')) return;
        const testOverlay = document.getElementById('test-menu-overlay');
        if (testOverlay?.classList.contains('visible')) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        this.options.gameState.retreatBossBattle();
        this.close();
      }
    }, true);
  }

  private onPlayerAttackHit(
    fpc: number,
    bossClickDamage: number,
    isCrit: boolean,
    x: number,
    y: number
  ): void {
    const battle = this.options.gameState.activeBossBattle;
    if (!battle) return;
    if (bossClickDamage > 0) {
      this.bossHitFlashSec = 0.18;
      this.options.audio.playTone(640 + Math.random() * 140, 'sine', 0.08);
      const pct = formatFixed((bossClickDamage / battle.bossMaxHp) * 100, 2);
      this.showHitFeedback(`${isCrit ? 'Crítico! ' : ''}\u2212${pct}%`);
      this.options.spawnFloatingText(
        x,
        y,
        isCrit ? `\u2726 CRÍTICO! \u2212${pct}%` : `\u2212${pct}%`,
        true
      );
    } else {
      if (!this.options.gameState.getBossCombatBreakdown(battle.bossId).canDamageBoss) {
        this.showHitFeedback(`Sem dano: Prontidão abaixo de ${BOSS_DAMAGE_READINESS_THRESHOLD * 100}%.`);
      }
      this.options.spawnFloatingText(x, y, `+${formatNumber(fpc)} FÉ`, true);
    }
    this.updateUI();
    events.emit(GameEvents.STATE_CHANGED);
  }

  public isOpen(): boolean {
    return this.isBattleActive && this.worldStageEl?.style.display === 'block';
  }

  private setText(el: HTMLElement | null, value: string): void {
    if (el && el.textContent !== value) el.textContent = value;
  }

  private showHitFeedback(text: string): void {
    this.setText(this.combatFeedbackEl, text);
    if (typeof window === 'undefined' || !window.matchMedia) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.attackBtnEl?.getAnimations?.().forEach((animation) => animation.cancel());
    this.attackBtnEl?.animate?.(
      [{ transform: 'scale(0.96)' }, { transform: 'scale(1)' }],
      { duration: 150, easing: effectEasing(150) }
    );
  }

  private showPhaseBanner(text: string): void {
    this.phaseBannerTimerSec = 2.6;
    if (this.phaseBannerEl) {
      this.setText(this.phaseBannerEl, text);
      this.phaseBannerEl.style.display = 'block';
    }
  }

  public openForBoss(bossId: string, options?: { isRematch?: boolean }): boolean {
    const boss = GNOSE_BOSSES.find((b) => b.id === bossId);
    if (!boss) return false;

    const started = this.options.gameState.startBossBattle(bossId, {
      awaitProcession: true,
      isRematch: options?.isRematch === true,
    });
    if (!started) {
      this.options.audio.playTone(180, 'sawtooth', 0.12);
      return false;
    }

    this.activeBossIdForScene = bossId;
    this.lastRiftsMissed = 0;
    this.lastPhase = 1;
    this.bossTrail = { value: 100, holdSec: 0 };
    this.altarTrail = { value: 100, holdSec: 0 };
    this.lastBossTrailWidth = '';
    this.lastAltarTrailWidth = '';
    this.lastBossAriaNow = '';
    this.lastAltarAriaNow = '';
    this.lastAttackDisabled = '';
    this.isBattleActive = true;
    this.climaxState = null;
    this.miracleBeam = null;
    this.phaseShockwaveAlpha = 0;
    this.phaseBannerTimerSec = 0;
    if (this.phaseBannerEl) {
      this.phaseBannerEl.style.display = 'none';
    }

    // Preload lateral boss, active incarnation walk, and follower sprites
    loadBossSprites(bossId);
    loadIncarnationProcessionSprite(incarnationStageIndex(this.options.gameState.incarnationStage));
    loadFollowerSprites();

    this.allocateWorldCanvas();

    // Mark active battle on body first so Altar & Pátio hide their internal sprites without duplicating
    document.body.classList.add('is-boss-battle-active');

    if (this.worldStageEl) {
      this.worldStageEl.style.display = 'block';
    }

    // Initialize world choreography state from exact Altar da Encarnação & Pátio dos Fiéis coordinates
    this.initBattleChoreography();

    if (this.bossWorldHpLabelEl) this.setText(this.bossWorldHpLabelEl, boss.name.toUpperCase());
    this.attackBtnEl?.setAttribute('aria-label', `Atacar ${boss.name}`);

    this.setText(
      this.combatFeedbackEl,
      'A roda dos Fiéis está se formando...'
    );

    if (this.riftsLayerEl) {
      this.riftsLayerEl.innerHTML = '';
    }
    this.miracleBtnEl = null;

    this.returnFocusEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    this.updateBattleCamera(0);

    this.options.audio.playBossBattleMusic?.();
    this.options.audio.playTone(320, 'triangle', 0.25);
    this.updateUI();
    this.drawWorldScene();
    this.startWorldLoop();
    return true;
  }

  public close(): void {
    const pendingClimax = this.climaxState;
    this.climaxState = null;
    const wasOpen = this.isOpen();
    this.isBattleActive = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.worldStageEl) {
      this.worldStageEl.style.display = 'none';
    }
    if (this.riftsLayerEl) {
      this.riftsLayerEl.innerHTML = '';
    }
    if (this.phaseBannerEl) {
      this.phaseBannerEl.style.display = 'none';
    }
    this.miracleBtnEl = null;
    // Give the canvas memory back: it is by far the largest allocation in the game.
    if (this.worldCanvasEl) {
      this.worldCanvasEl.width = 1;
      this.worldCanvasEl.height = 1;
    }
    document.body.classList.remove('is-boss-battle-active', 'is-courtyard-visible');
    this.options.audio.stopBossBattleMusic?.();
    if (wasOpen) {
      document.getElementById('btn-zoom-reset')?.click();
      if (this.returnFocusEl?.isConnected) this.returnFocusEl.focus({ preventScroll: true });
    }
    this.returnFocusEl = null;

    if (pendingClimax) {
      this.presentBattleResultPopup(pendingClimax);
    }
  }

  private buildProcessionRoutes(
    incStart: { x: number; y: number },
    fBox: { x: number; y: number; w: number; h: number }
  ): void {
    const routes = computeProcessionRoutes(incStart, fBox);
    this.patioGatherSpot = routes.patioGatherSpot;
    this.outboundPath = routes.outboundPath;
    this.incOutboundS = 0;
    this.incGuardSpot = routes.incGuardSpot;
    this.circleStartS = routes.circleStartS;
    this.processionPath = routes.processionPath;
    this.circleLength = routes.circleLength;
    this.incProcessionS = 0;
  }

  private initBattleChoreography(): void {
    // 1. Boss stays above out of sight until the Faithful + Incarnation complete the 360° circle
    this.bossX = BOSS_DISTANT_SPAWN.x;
    this.bossY = BOSS_DISTANT_SPAWN.y;
    this.bossState = 'awaiting_ritual';
    this.bossWalkTimeSec = 0;
    this.bossAttackIndex = 0;
    this.bossAttackFrameTimeSec = 0;
    this.bossParryRecoverySec = 0;
    this.cameraPhase = null;
    this.bossHitFlashSec = 0;
    this.attackedRiftIds.clear();

    // 2. Incarnation starts from her stone pedestal in #incarnation-altar-canvas and heads to the Pátio dos Fiéis
    const incBox = getElementWorldBox(
      'incarnation-altar-canvas',
      { x: 280, y: 530, w: 420, h: 210 },
      'card-incarnation'
    );
    const fBox = getElementWorldBox(
      'followers-walk-canvas',
      FOLLOWERS_FALLBACK_BOX,
      'card-followers'
    );

    this.ensureStageBounds(incBox, fBox);

    this.incX = incBox.x + incBox.w * 0.5;
    this.incY = incBox.y + incBox.h - 12;
    this.incFacing = fBox.x >= this.incX ? 1 : -1;
    this.incState = 'walking_to_patio';
    document.body.classList.add('is-courtyard-visible');
    this.incTimerSec = 0;
    this.incWalkCycle = 0;
    this.incCallRingProgress = 0;
    this.returnPath = [];
    this.returnS = 0;
    this.followerReturnPaths.clear();

    this.buildProcessionRoutes({ x: this.incX, y: this.incY }, fBox);

    // 3. Followers wait inside #followers-walk-canvas (Pátio dos Fiéis) until the Incarnation arrives to lead them in single file
    this.syncedFollowerTotal = -1;
    this.followerActors = [];
    this.syncBattleFollowers(this.options.gameState.getTotalFollowersCount(), true);
    const bossId = this.options.gameState.activeBossBattle?.bossId ?? this.activeBossIdForScene;
    this.syncAttackHitbox(this.getBossRenderFrame(bossId));
  }

  private syncBattleFollowers(totalCount: number, initialSpawn = false): void {
    if (totalCount === this.syncedFollowerTotal && !initialSpawn) return;
    this.syncedFollowerTotal = totalCount;

    const synced = syncBattleFollowerCohort(
      this.followerActors,
      totalCount,
      initialSpawn,
      this.patioGatherSpot,
      this.circleStartS,
      this.circleLength
    );
    this.followerActors = synced.actors;
    this.queueSpacing = synced.queueSpacing;
  }

  private startWorldLoop(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    const clock = new VisualFrameClock();
    const step = (nowMs: number) => {
      if (!this.isBattleActive || (this.worldStageEl && !this.worldStageEl.isConnected)) {
        if (this.isBattleActive) this.close();
        return;
      }
      const frameSec = clock.tick(nowMs);
      if (frameSec !== null && document.visibilityState !== 'hidden') {
        const elapsedSec = Math.min(0.1, frameSec);
        this.updateWorldScene(elapsedSec);
        this.updateDamageTrails(elapsedSec);
        if (this.isBattleActive) {
          this.drawWorldScene();
        }
      }
      if (this.isBattleActive) {
        this.animFrameId = requestAnimationFrame(step);
      }
    };
    this.animFrameId = requestAnimationFrame(step);
  }

  private updateDamageTrails(elapsedSec: number): void {
    const battle = this.options.gameState.activeBossBattle;
    if (!battle) return;
    this.bossTrail = stepDamageTrail(this.bossTrail, (battle.bossHp / battle.bossMaxHp) * 100, elapsedSec);
    this.altarTrail = stepDamageTrail(this.altarTrail, (battle.altarIntegrity / battle.maxAltarIntegrity) * 100, elapsedSec);
    if (this.bossHpTrailEl) {
      const next = `${this.bossTrail.value.toFixed(2)}%`;
      if (next !== this.lastBossTrailWidth) {
        this.lastBossTrailWidth = next;
        this.bossHpTrailEl.style.width = next;
      }
    }
    if (this.altarTrailEl) {
      const next = `${this.altarTrail.value.toFixed(2)}%`;
      if (next !== this.lastAltarTrailWidth) {
        this.lastAltarTrailWidth = next;
        this.altarTrailEl.style.width = next;
      }
    }
  }

  private allocateWorldCanvas(): void {
    if (!this.worldCanvasEl) return;
    this.worldCanvasScale = battleCanvasScale(window.innerWidth, this.stageWidth, this.stageHeight);
    this.worldCanvasEl.width = Math.max(1, Math.floor(this.stageWidth * this.worldCanvasScale));
    this.worldCanvasEl.height = Math.max(1, Math.floor(this.stageHeight * this.worldCanvasScale));
    // A reduced canvas is scaled up on screen, where smoothing reads better than hard pixels.
    this.worldCanvasEl.style.imageRendering = this.worldCanvasScale < 1 ? 'auto' : '';
  }

  private triggerBossAttackSwing(rift?: BossRift): void {
    if (this.bossParryRecoverySec > 0) return;
    this.bossState = 'attacking';
    this.bossAttackFrameTimeSec = 0;
    const phase = this.options.gameState.activeBossBattle?.phase ?? 1;
    if (phase >= 2 && typeof rift?.attackIndex === 'number') {
      this.bossAttackIndex = rift.attackIndex % 2;
    } else {
      this.bossAttackIndex = (this.bossAttackIndex + 1) % 2;
    }
  }

  public stepSceneForTest(elapsedSec: number): void {
    this.updateWorldScene(elapsedSec);
    if (this.isBattleActive) {
      this.drawWorldScene();
    }
  }

  private updateBattleCamera(elapsedSec: number): void {
    let target: BattleCameraTarget;
    if (this.incState === 'leading_return' || this.incState === 'returning_to_altar') {
      target = { phase: 'incarnation', x: this.incX, y: this.incY - 65, width: 900, height: 700 };
    } else if (this.bossState === 'awaiting_ritual') {
      target = { phase: 'incarnation', x: this.incX, y: this.incY - 65, width: 680, height: 560 };
    } else if (this.bossState === 'walking') {
      target = { phase: 'boss', x: this.bossX, y: this.bossY - 90, width: 760, height: 580 };
    } else {
      target = {
        phase: 'combat', x: BOSS_SPHERE_CENTER.x, y: BOSS_SPHERE_CENTER.y,
        width: SACRED_CIRCLE_RADIUS * 2 + 140, height: SACRED_CIRCLE_RADIUS * 2 + 140,
      };
    }
    const revealBoss = target.phase === 'boss' && this.cameraPhase !== 'boss';
    this.cameraPhase = target.phase;
    this.options.onCameraFrame?.(target, revealBoss ? 0 : elapsedSec);
  }

  private getBossRenderFrame(bossId: string): BossRenderFrame {
    return resolveBossRenderFrame({
      bossId,
      bossX: this.bossX,
      bossY: this.bossY,
      stageOriginX: this.stageOriginX,
      stageOriginY: this.stageOriginY,
      bossState: this.bossState,
      bossWalkTimeSec: this.bossWalkTimeSec,
      bossAttackIndex: this.bossAttackIndex,
      bossAttackFrameTimeSec: this.bossAttackFrameTimeSec,
      climaxVictory: this.climaxState?.victory,
      climaxRemainingSec: this.climaxState?.remainingSec,
      climaxTotalSec: this.climaxState?.totalSec,
    });
  }

  private syncAttackHitbox(renderFrame: BossRenderFrame): void {
    if (this.climaxState) {
      if (this.attackBtnEl) this.attackBtnEl.style.display = 'none';
      if (this.bossHpPlateEl) this.bossHpPlateEl.style.display = 'none';
      return;
    }
    const bossVisible = this.bossState !== 'awaiting_ritual' && !this.climaxState;
    const displayVal = bossVisible ? '' : 'none';

    if (this.attackBtnEl) {
      if (this.attackBtnEl.style.display !== displayVal) {
        this.attackBtnEl.style.display = displayVal;
      }
      if (bossVisible) {
        const leftPx = `${renderFrame.hitLeft}px`;
        const topPx = `${renderFrame.hitTop}px`;
        const widthPx = `${renderFrame.hitWidth}px`;
        const heightPx = `${renderFrame.hitHeight}px`;
        if (this.attackBtnEl.style.left !== leftPx) this.attackBtnEl.style.left = leftPx;
        if (this.attackBtnEl.style.top !== topPx) this.attackBtnEl.style.top = topPx;
        if (this.attackBtnEl.style.width !== widthPx) this.attackBtnEl.style.width = widthPx;
        if (this.attackBtnEl.style.height !== heightPx) this.attackBtnEl.style.height = heightPx;
      }
    }
    if (this.bossHpPlateEl) {
      const hpDisplayVal = this.bossState !== 'awaiting_ritual' ? '' : 'none';
      if (this.bossHpPlateEl.style.display !== hpDisplayVal) {
        this.bossHpPlateEl.style.display = hpDisplayVal;
      }
      if (this.bossState !== 'awaiting_ritual') {
        const hpLeftPx = `${renderFrame.lx}px`;
        const hpTopPx = `${renderFrame.ly + 30}px`;
        if (this.bossHpPlateEl.style.left !== hpLeftPx) this.bossHpPlateEl.style.left = hpLeftPx;
        if (this.bossHpPlateEl.style.top !== hpTopPx) this.bossHpPlateEl.style.top = hpTopPx;
      }
    }
  }

  private formatRitualStatsLabel(): string {
    if (this.bossState === 'walking') return 'O Guardião se aproxima da Esfera…';
    if (this.incState === 'walking_to_patio') return 'Ritual: buscando os Fiéis...';
    if (this.incState === 'gathering_at_patio') return 'Ritual: convocando a fila...';
    const total = this.followerActors.length;
    let encircling = 0;
    for (let i = 0; i < total; i++) {
      if (this.followerActors[i].state === 'encircling') encircling++;
    }
    return `Ritual: roda ${encircling}/${total}`;
  }

  private beginVictoryReturn(): void {
    this.incState = 'leading_return';
    document.body.classList.add('is-courtyard-visible');
    this.incCallRingProgress = 0;
    this.bossHitFlashSec = 0;
    // The guard station is also the circle entrance. Retrace its approach to the patio.
    const approach = this.processionPath.filter(p => p.s <= this.circleStartS + 0.01).reverse();
    this.returnPath = buildPolyline([{ x: this.incX, y: this.incY }, ...approach]);
    this.returnS = 0;
    this.followerReturnPaths.clear();
    for (const f of this.followerActors) {
      // Finish the clockwise arc to the exit, then follow the Incarnation home.
      const remainingArc = this.processionPath.filter(p => p.s > f.trailS);
      const path = buildPolyline([
        { x: f.x, y: f.y }, ...remainingArc, ...approach,
        { x: f.startX, y: f.startY }
      ]);
      this.followerReturnPaths.set(f.id, { path, s: 0 });
      f.state = 'returning_to_patio';
    }
    this.setText(this.combatFeedbackEl, 'Vitória! A Encarnação conduz os Fiéis de volta ao pátio.');
    this.attackBtnEl?.setAttribute('aria-disabled', 'true');
    if (this.attackBtnEl) this.attackBtnEl.style.display = 'none';
    if (this.bossHpPlateEl) this.bossHpPlateEl.style.display = 'none';
  }

  private updateVictoryReturn(dt: number, elapsedSec: number): void {
    this.returnS = Math.min(polylineLength(this.returnPath), this.returnS + PROCESSION_QUEUE_SPEED * dt);
    const sample = samplePolylineAt(this.returnPath, this.returnS);
    this.incX = sample.x;
    this.incY = sample.y;
    if (Math.abs(sample.dx) > 0.2) this.incFacing = sample.dx >= 0 ? 1 : -1;
    this.incWalkCycle += dt / 0.15;

    if (this.incState === 'leading_return') {
      for (const f of this.followerActors) {
        const route = this.followerReturnPaths.get(f.id);
        if (!route || f.state === 'waiting_in_patio') continue;
        route.s = Math.min(polylineLength(route.path), route.s + PROCESSION_QUEUE_SPEED * dt);
        const point = samplePolylineAt(route.path, route.s);
        f.x = point.x;
        f.y = point.y;
        if (Math.abs(point.dx) > 0.2) f.facing = point.dx >= 0 ? 1 : -1;
        f.walkCycle += dt / 0.14;
        if (route.s >= polylineLength(route.path)) {
          f.x = f.startX;
          f.y = f.startY;
          f.state = 'waiting_in_patio';
        }
      }
      if (this.returnS >= polylineLength(this.returnPath) &&
          this.followerActors.every(f => f.state === 'waiting_in_patio')) {
        this.incState = 'returning_to_altar';
        this.returnPath = buildPolyline([...this.outboundPath].reverse());
        this.returnS = 0;
        this.setText(this.combatFeedbackEl, 'Os Fiéis estão no pátio. A Encarnação retorna ao altar.');
      }
    } else if (this.returnS >= polylineLength(this.returnPath)) {
      this.close();
      return;
    }
    this.updateBattleCamera(elapsedSec);
  }

  private updateWorldScene(elapsedSec: number): void {
    const frameScale = visualFrameScale(elapsedSec);
    const dt = elapsedSec * Math.max(0.25, Math.min(this.speedMultiplier, 4));

    if (this.climaxState && (this.incState === 'leading_return' || this.incState === 'returning_to_altar')) {
      this.updateVictoryReturn(dt, elapsedSec);
      return;
    }

    if (this.climaxState) {
      this.followerActors.forEach(f => { f.prayCycle = (f.prayCycle + elapsedSec) % 3.3; });
      this.climaxState.remainingSec = Math.max(0, this.climaxState.remainingSec - elapsedSec);
      this.bossHitFlashSec = this.climaxState.victory ? 0.5 : 0;
      if (this.climaxState.remainingSec <= 0) {
        if (this.climaxState.victory) this.beginVictoryReturn();
        else this.close();
      }
      return;
    }

    const battle = this.options.gameState.activeBossBattle;
    this.bossParryRecoverySec = Math.max(0, this.bossParryRecoverySec - dt);

    if (this.bossHitFlashSec > 0) {
      this.bossHitFlashSec = Math.max(0, this.bossHitFlashSec - elapsedSec);
    }
    if (this.spherePulseAlpha > 0) {
      this.spherePulseAlpha = Math.max(0, this.spherePulseAlpha - elapsedSec * 1.8);
    }
    if (this.phaseShockwaveAlpha > 0) {
      this.phaseShockwaveAlpha = Math.max(0, this.phaseShockwaveAlpha - elapsedSec * 0.9);
    }
    if (this.miracleBeam) {
      this.miracleBeam.alpha = Math.max(0, this.miracleBeam.alpha - elapsedSec * 1.6);
      if (this.miracleBeam.alpha <= 0) {
        this.miracleBeam = null;
      }
    }
    if (this.phaseBannerTimerSec > 0) {
      this.phaseBannerTimerSec = Math.max(0, this.phaseBannerTimerSec - elapsedSec);
      if (this.phaseBannerTimerSec <= 0 && this.phaseBannerEl) {
        this.phaseBannerEl.style.display = 'none';
      }
    }

    // Keep follower count synced once combat has started (freeze initial cohort during the pre-battle ritual)
    if (this.bossState !== 'awaiting_ritual') {
      this.syncBattleFollowers(this.options.gameState.getTotalFollowersCount(), false);
    }

    // 1. Update Incarnation
    this.incTimerSec += dt;
    const outboundLen = polylineLength(this.outboundPath);
    const processionLen = polylineLength(this.processionPath);

    if (this.incState === 'walking_to_patio') {
      this.incOutboundS = Math.min(outboundLen, this.incOutboundS + INCARNATION_OUTBOUND_SPEED * dt);
      const sample = samplePolylineAt(this.outboundPath, this.incOutboundS);
      this.incX = sample.x;
      this.incY = sample.y;
      if (Math.abs(sample.dx) > 0.2) {
        this.incFacing = sample.dx >= 0 ? 1 : -1;
      }
      this.incWalkCycle += dt / 0.14;

      if (this.incOutboundS >= outboundLen - 0.5) {
        this.incX = this.patioGatherSpot.x;
        this.incY = this.patioGatherSpot.y;
        this.incState = 'gathering_at_patio';
        this.incTimerSec = 0;
        this.incCallRingProgress = 0.01;
      }
    } else if (this.incState === 'gathering_at_patio') {
      this.incCallRingProgress = Math.min(1, this.incCallRingProgress + dt * 1.45);
      this.incWalkCycle += dt * 1.2;
      this.incFacing = BOSS_SPHERE_CENTER.x >= this.incX ? 1 : -1;
      if (this.incTimerSec >= 0.6) {
        this.incState = 'leading_procession';
        document.body.classList.remove('is-courtyard-visible');
        this.incTimerSec = 0;
      }
    } else if (this.incState === 'leading_procession') {
      this.incProcessionS += PROCESSION_QUEUE_SPEED * dt;
      if (this.incCallRingProgress > 0 && this.incCallRingProgress < 1) {
        this.incCallRingProgress = Math.min(1, this.incCallRingProgress + dt * 1.1);
      } else {
        this.incCallRingProgress = 0;
      }

      if (this.incProcessionS < processionLen) {
        const sample = samplePolylineAt(this.processionPath, this.incProcessionS);
        this.incX = sample.x;
        this.incY = sample.y;
        if (Math.abs(sample.dx) > 0.2) {
          this.incFacing = sample.dx >= 0 ? 1 : -1;
        }
        this.incWalkCycle += dt / 0.15;
      } else {
        this.incX = this.incGuardSpot.x;
        this.incY = this.incGuardSpot.y;
        this.incFacing = BOSS_SPHERE_CENTER.x >= this.incX ? 1 : -1;
        const maxRequiredS =
          this.followerActors.length > 0
            ? Math.max(
                ...this.followerActors.map(
                  (f) => f.stopS + (f.queueIndex + 1) * this.queueSpacing
                )
              )
            : processionLen;
        if (this.incProcessionS >= Math.max(processionLen, maxRequiredS)) {
          this.incState = 'guarding';
        }
      }
    } else {
      // Guarding on the Sacred Circle and channeling power
      this.incProcessionS += PROCESSION_QUEUE_SPEED * dt;
      this.incFacing = BOSS_SPHERE_CENTER.x >= this.incX ? 1 : -1;
      this.incWalkCycle += 0.02 * frameScale;
      this.incCallRingProgress = 0;
    }

    // 2. Update Faithful
    const queueActive =
      this.incState === 'leading_procession' || this.incState === 'guarding';

    for (const f of this.followerActors) {
      if (!queueActive) {
        f.state = 'waiting_in_patio';
        f.trailS = 0;
        f.x = f.startX;
        f.y = f.startY;
        f.facing = this.incX >= f.x ? 1 : -1;
        f.prayCycle = (f.prayCycle + dt * 0.35) % 3.3;
        continue;
      }

      const rawDesiredS = this.incProcessionS - (f.queueIndex + 1) * this.queueSpacing;
      const leadInWindow = Math.max(
        48,
        Math.hypot(f.startX - this.patioGatherSpot.x, f.startY - this.patioGatherSpot.y)
      );

      if (rawDesiredS >= f.stopS) {
        const slot = samplePolylineAt(this.processionPath, f.stopS);
        f.state = 'encircling';
        f.trailS = f.stopS;
        f.x = slot.x;
        f.y = slot.y;
        f.facing = BOSS_SPHERE_CENTER.x >= f.x ? 1 : -1;
        f.prayCycle = (f.prayCycle + dt * 0.55) % 3.3;
      } else if (rawDesiredS > 0) {
        const sample = samplePolylineAt(this.processionPath, rawDesiredS);
        f.state = 'following_in_line';
        f.trailS = rawDesiredS;
        f.x = sample.x;
        f.y = sample.y;
        if (Math.abs(sample.dx) > 0.2) {
          f.facing = sample.dx >= 0 ? 1 : -1;
        }
        f.walkCycle += (dt * PROCESSION_QUEUE_SPEED) / 36;
      } else if (rawDesiredS > -leadInWindow) {
        const u = (rawDesiredS + leadInWindow) / leadInWindow;
        const nextX = f.startX + (this.patioGatherSpot.x - f.startX) * u;
        const nextY = f.startY + (this.patioGatherSpot.y - f.startY) * u;
        const dx = nextX - f.x;
        if (Math.abs(dx) > 0.1) {
          f.facing = dx >= 0 ? 1 : -1;
        }
        f.state = 'following_in_line';
        f.trailS = 0;
        f.x = nextX;
        f.y = nextY;
        f.walkCycle += (dt * PROCESSION_QUEUE_SPEED) / 38;
      } else {
        f.state = 'waiting_in_patio';
        f.trailS = 0;
        f.x = f.startX;
        f.y = f.startY;
        f.facing = this.patioGatherSpot.x >= f.x ? 1 : -1;
        f.prayCycle = (f.prayCycle + dt * 0.35) % 3.3;
      }
    }

    // 3. Update Boss
    if (this.bossState === 'awaiting_ritual') {
      const allEncircling =
        this.followerActors.length === 0 ||
        this.followerActors.every((f) => f.state === 'encircling');
      if (this.incState === 'guarding' && allEncircling) {
        this.bossState = 'walking';
        this.bossX = BOSS_DISTANT_SPAWN.x;
        this.bossY = BOSS_DISTANT_SPAWN.y;
        this.bossWalkTimeSec = 0;
        const boss = battle ? GNOSE_BOSSES.find((b) => b.id === battle.bossId) : undefined;
        if (boss) {
          this.setText(
            this.combatFeedbackEl,
            `${boss.name} se aproxima. Prepare-se para aparar!`
          );
        }
        this.options.audio.playTone(240, 'sawtooth', 0.22);
        this.updateUI();
      } else if (this.combatStatsEl) {
        this.setText(this.combatStatsEl, this.formatRitualStatsLabel());
      }
    } else if (this.bossState === 'walking') {
      // Hold rift spawning while the Boss is descending toward the Sphere
      if (battle) {
        battle.riftSpawnTimerSec = Math.max(battle.riftSpawnTimerSec, 0.25);
        if (battle.activeRifts.length > 0) {
          battle.activeRifts.length = 0;
        }
      }

      const dx = BOSS_COMBAT_SPOT.x - this.bossX;
      const dy = BOSS_COMBAT_SPOT.y - this.bossY;
      const dist = Math.hypot(dx, dy);
      if (dist > 6) {
        const move = Math.min(dist, BOSS_DESCENT_SPEED * dt);
        this.bossX += (dx / dist) * move;
        this.bossY += (dy / dist) * move;
        this.bossWalkTimeSec += dt;
      } else {
        this.bossX = BOSS_COMBAT_SPOT.x;
        this.bossY = BOSS_COMBAT_SPOT.y;
        this.bossState = 'idle';
        this.options.gameState.beginBossCombat();
        if (battle) {
          battle.riftSpawnTimerSec = Math.min(battle.riftSpawnTimerSec, 0.2);
        }
      }
    } else if (this.bossState === 'attacking') {
      this.bossAttackFrameTimeSec += dt;
      const bossId = battle?.bossId ?? this.activeBossIdForScene;
      const sheet = loadBossSprites(bossId)?.attacks[this.bossAttackIndex];
      const attackDuration = bossSheetFrameCount(sheet) * (BOSS_SPRITE_FOLDERS[bossId]?.attackFrameSec ?? 0.115);
      // Trigger impact wave on the Sphere mid-swing
      if (
        this.bossAttackFrameTimeSec >= 0.85 &&
        this.bossAttackFrameTimeSec - dt < 0.85
      ) {
        this.spherePulseAlpha = 0.85;
      }
      if (this.bossAttackFrameTimeSec >= attackDuration) {
        this.bossState = 'idle';
      }
    } else {
      // Boss is in 'idle' stance at the Sphere: "APARAR" appears first, then after RIFT_TELEGRAPH_BEFORE_ATTACK_SEC the Boss swings!
      this.bossWalkTimeSec += dt * 0.35;
      if (battle && this.bossParryRecoverySec <= 0) {
        for (const rift of battle.activeRifts) {
          if (this.attackedRiftIds.has(rift.id)) continue;
          const riftAgeSec = rift.maxSec - rift.remainingSec;
          if (riftAgeSec >= RIFT_TELEGRAPH_BEFORE_ATTACK_SEC) {
            this.attackedRiftIds.add(rift.id);
            this.triggerBossAttackSwing(rift);
            break;
          }
        }
      }
    }
    this.updateBattleCamera(elapsedSec);
  }

  private drawWorldScene(): void {
    const battle = this.options.gameState.activeBossBattle;
    const climax = this.climaxState;
    if (!battle && !climax) return;

    const bossId = battle?.bossId ?? climax?.boss.id ?? this.activeBossIdForScene;
    const phase = (battle?.phase ?? this.lastPhase ?? 1) as 1 | 2 | 3;

    // Synchronize the attack hitbox with the exact rendered Boss sprite frame (hidden while awaiting ritual or in climax)
    const bossFrame = this.getBossRenderFrame(bossId);
    this.syncAttackHitbox(bossFrame);

    const ctx = this.worldCtx;
    if (!ctx) return;

    renderBattleWorldScene({
      ctx,
      worldCanvasScale: this.worldCanvasScale,
      stageWidth: this.stageWidth,
      stageHeight: this.stageHeight,
      stageOriginX: this.stageOriginX,
      stageOriginY: this.stageOriginY,
      battle,
      climax,
      bossId,
      phase,
      bossFrame,
      bossState: this.bossState,
      bossY: this.bossY,
      bossHitFlashSec: this.bossHitFlashSec,
      incarnationStage: this.options.gameState.incarnationStage,
      incX: this.incX,
      incY: this.incY,
      incFacing: this.incFacing,
      incState: this.incState,
      incWalkCycle: this.incWalkCycle,
      incCallRingProgress: this.incCallRingProgress,
      incGuardSpot: this.incGuardSpot,
      returnPath: this.returnPath,
      returnS: this.returnS,
      followerActors: this.followerActors,
      spherePulseAlpha: this.spherePulseAlpha,
      phaseShockwaveAlpha: this.phaseShockwaveAlpha,
      miracleBeam: this.miracleBeam,
      drawOrderPool: this.drawOrderPool,
    });
  }

  private presentBattleResultPopup(result: PendingBattleClimax): void {
    const { boss, victory, isRematch, durationSec, cultReadiness } = result;
    if (victory) {
      this.options.audio.playChime();
      if (isRematch) {
        const bestSec = this.options.gameState.getBossBestTimeSec(boss.id) ?? durationSec;
        this.options.notifications.showCustomPopup(
          `${boss.name.toUpperCase()} SUBJUGADO!`,
          `Duelo relembrado em ${formatFixed(durationSec, 1)}s (melhor tempo: ${formatFixed(bestSec, 1)}s).`,
          boss.symbol,
          'MEMÓRIA DE DUELO'
        );
      } else {
        this.options.notifications.showCustomPopup(
          `${boss.name.toUpperCase()} SUBJUGADO!`,
          `${boss.rewardName}: ${boss.rewardDesc}`,
          boss.symbol,
          'VITÓRIA MITOLÓGICA'
        );
      }
    } else {
      this.options.audio.playTone(150, 'sawtooth', 0.35);
      const diagnosis = `Prontidão ${(cultReadiness * 100).toFixed(0)}%: acumule Gnose total para aumentar a proteção e apare os ataques.`;
      const cursePrefix = isRematch
        ? 'Revanche sem Maldição.'
        : 'Maldição: -25% de Fé/s e Fervor/s por 20s.';
      this.options.notifications.showCustomPopup(
        `ALTAR ROMPIDO POR ${boss.name.toUpperCase()}`,
        `${cursePrefix} ${diagnosis}`,
        'warning',
        'RECUO DO ALTAR'
      );
    }

    this.options.onBattleEnded?.(boss, victory);
    events.emit(GameEvents.STATE_CHANGED);
  }

  private handleBattleFinished(
    boss: GnoseBoss,
    victory: boolean,
    isRematch = false,
    durationSec = 0
  ): void {
    const breakdown = this.options.gameState.getBossCombatBreakdown(boss.id);
    const pending: PendingBattleClimax = {
      boss,
      victory,
      isRematch,
      durationSec,
      remainingSec: CLIMAX_DURATION_SEC,
      totalSec: CLIMAX_DURATION_SEC,
      cultReadiness: breakdown.cultReadiness,
    };

    // If the scene is still in 'awaiting_ritual' (e.g. synchronous unit test skipping choreography), close immediately
    if (this.bossState === 'awaiting_ritual' || !this.isOpen()) {
      this.climaxState = pending;
      this.close();
      return;
    }

    // Otherwise run the ~1.5s visual climax on the world stage before closing
    this.climaxState = pending;
    if (this.riftsLayerEl) {
      this.riftsLayerEl.innerHTML = '';
    }
    this.miracleBtnEl = null;
    if (victory) {
      this.options.audio.playChime();
      this.setText(
        this.combatFeedbackEl,
        `A Roda dos Fiéis dissolve ${boss.name}!`
      );
      if (this.bossHpFillEl) this.bossHpFillEl.style.width = '0%';
    } else {
      this.options.audio.playTone(150, 'sawtooth', 0.35);
      this.setText(
        this.combatFeedbackEl,
        `A Esfera trinca diante de ${boss.name}!`
      );
      if (this.altarIntegrityFillEl) this.altarIntegrityFillEl.style.width = '0%';
    }
    this.drawWorldScene();
  }

  public updateUI(): void {
    if (!this.isOpen()) return;
    if (this.climaxState) return;
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
      // Miss feedback must never restart a swing that a successful parry just cancelled.
      if (this.bossParryRecoverySec <= 0) this.spherePulseAlpha = 0.9;
      this.setText(
        this.combatFeedbackEl,
        `Golpe não aparado! −${breakdown.altarDamageOnMiss.toFixed(0)}% da Esfera.`
      );
    } else if (phase > this.lastPhase) {
      this.lastPhase = phase;
      this.phaseShockwaveAlpha = 1.0;
      this.spherePulseAlpha = 1.0;
      this.options.audio.playTone(phase === 3 ? 165 : 195, 'sawtooth', 0.32);
      const bannerText =
        phase === 3
          ? 'FASE III — FÚRIA PRIMORDIAL'
          : 'FASE II — O GUARDIÃO DESPERTA';
      this.showPhaseBanner(bannerText);
      const phaseLabel =
        phase === 3
          ? 'Fase III: −30% da Esfera.'
          : 'Fase II: −15% da Esfera.';
      this.setText(this.combatFeedbackEl, `${phaseLabel} Golpes mais rápidos.`);
    }

    const hpPercent = Math.max(0, Math.min(100, (battle.bossHp / battle.bossMaxHp) * 100));
    if (this.bossHpFillEl) {
      const hpFixed = hpPercent.toFixed(1);
      const width = `${hpFixed}%`;
      if (this.bossHpFillEl.style.width !== width) this.bossHpFillEl.style.width = width;
      if (this.lastBossAriaNow !== hpFixed) {
        this.lastBossAriaNow = hpFixed;
        this.bossHpFillEl.parentElement?.setAttribute('aria-valuenow', hpFixed);
      }
    }
    const remainingPassiveSec =
      breakdown.passiveDps > 0 ? Math.ceil(battle.bossHp / breakdown.passiveDps) : Infinity;
    this.setText(this.bossHpValEl, bossHpLabel(phase, hpPercent, remainingPassiveSec));

    const comboStreak = battle.comboStreak ?? 0;

    if (this.attackDamageEl) {
      this.setText(this.attackDamageEl, `\u2212${formatFixed(breakdown.clickHpFraction * 100, 2)}%`);
    }

    if (this.attackBtnEl) {
      const cooling = battle.sphereCooldownSec > 1e-8 || battle.combatStarted === false || !breakdown.canDamageBoss;
      const disabledStr = String(cooling);
      if (this.lastAttackDisabled !== disabledStr) {
        this.lastAttackDisabled = disabledStr;
        this.attackBtnEl.setAttribute('aria-disabled', disabledStr);
      }
    }

    const altarPercent = Math.max(
      0,
      Math.min(100, (battle.altarIntegrity / battle.maxAltarIntegrity) * 100)
    );
    if (this.altarIntegrityFillEl) {
      const altarFixed = altarPercent.toFixed(0);
      const width = `${altarFixed}%`;
      if (this.altarIntegrityFillEl.style.width !== width) this.altarIntegrityFillEl.style.width = width;
      if (this.lastAltarAriaNow !== altarFixed) {
        this.lastAltarAriaNow = altarFixed;
        this.altarIntegrityFillEl.parentElement?.setAttribute('aria-valuenow', altarFixed);
        const isCritical = altarPercent <= 25;
        if (this.altarIntegrityFillEl.parentElement?.classList.contains('is-critical') !== isCritical) {
          this.altarIntegrityFillEl.parentElement?.classList.toggle('is-critical', isCritical);
        }
      }
    }
    if (this.altarIntegrityValEl) {
      this.setText(this.altarIntegrityValEl, `${altarPercent <= 25 ? 'EM RISCO \u00b7 ' : ''}${altarPercent.toFixed(0)}%`);
    }

    if (this.combatStatsEl) {
      if (battle.combatStarted === false) {
        this.setText(this.combatStatsEl, this.formatRitualStatsLabel());
      } else {
        const warning = !breakdown.canDamageBoss
          ? `Sem dano: Prontidão abaixo de ${BOSS_DAMAGE_READINESS_THRESHOLD * 100}%.`
          : !breakdown.canWithstandBoss
            ? 'Um golpe não aparado destrói a Esfera.'
            : '';
        const combo = comboStreak > 0 ? `Combo ×${formatNumber(comboStreak)}` : '';
        this.setText(this.combatStatsEl, [warning, combo].filter(Boolean).join(' '));
      }
    }

    this.syncRiftsDOM(battle.activeRifts);
    this.syncMiracleDOM(battle.activeMiracle ?? null);
  }

  private syncMiracleDOM(miracle: ActiveBossMiracle | null): void {
    if (!this.riftsLayerEl) return;

    if (!miracle || miracle.remainingSec <= 0) {
      if (this.miracleBtnEl) {
        this.miracleBtnEl.remove();
        this.miracleBtnEl = null;
      }
      return;
    }

    const actor = resolveMiracleFollowerActor(this.followerActors, miracle);
    const lx = actor
      ? Math.round(actor.x - this.stageOriginX)
      : Math.round(BOSS_SPHERE_CENTER.x - this.stageOriginX + SACRED_CIRCLE_RADIUS * 0.7);
    const ly = actor
      ? Math.round(actor.y - this.stageOriginY - 58)
      : Math.round(BOSS_SPHERE_CENTER.y - this.stageOriginY - 180);

    if (!this.miracleBtnEl || this.miracleBtnEl.getAttribute('data-miracle-id') !== miracle.id) {
      if (this.miracleBtnEl) {
        this.miracleBtnEl.remove();
      }
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'boss-miracle-btn';
      btn.className = 'boss-miracle-target';
      btn.setAttribute('data-miracle-id', miracle.id);
      btn.setAttribute('aria-label', 'Canalizar Milagre do Fiel: restaura +10% de Integridade da Esfera');
      btn.addEventListener('click', (e: MouseEvent) => {
        e.stopPropagation();
        const res = this.options.gameState.clickBossMiracle();
        if (res.triggered) {
          this.miracleBeam = { fromX: lx, fromY: ly + 18, alpha: 1.0 };
          this.options.audio.playChime();
          this.showHitFeedback(`Milagre! +${res.healed.toFixed(0)}% da Esfera.`);
          const x = e.clientX || window.innerWidth / 2;
          const y = e.clientY || window.innerHeight / 2;
          this.options.spawnFloatingText(x, y, '\u2726 MILAGRE! +10% ESFERA');
          this.updateUI();
          this.drawWorldScene();
          events.emit(GameEvents.STATE_CHANGED);
        }
      });
      this.riftsLayerEl.appendChild(btn);
      this.miracleBtnEl = btn;
    }

    this.miracleBtnEl.style.left = `${lx}px`;
    this.miracleBtnEl.style.top = `${ly}px`;
    this.setText(
      this.miracleBtnEl,
      `\u2726 MILAGRE +10% (${formatFixed(Math.max(0, miracle.remainingSec), 1)}s)`
    );
  }

  private syncRiftsDOM(activeRifts: BossRift[]): void {
    if (!this.riftsLayerEl) return;

    const activeIds = new Set(activeRifts.map((r) => r.id));

    // Remove expired/shattered rift elements (keep miracle button intact)
    Array.from(this.riftsLayerEl.children).forEach((child) => {
      const el = child as HTMLElement;
      const riftId = el.getAttribute('data-rift-id');
      if (!riftId) return;
      if (!activeIds.has(riftId)) {
        const hadFocus = el.contains(document.activeElement);
        el.remove();
        if (hadFocus && this.isOpen()) this.attackBtnEl?.focus({ preventScroll: true });
      }
    });

    const promptScale = Number(document.getElementById('dodeca-board-world')?.style.getPropertyValue('--boss-prompt-scale')) || 1;
    const sphereLocal = { x: BOSS_SPHERE_CENTER.x - this.stageOriginX, y: BOSS_SPHERE_CENTER.y - this.stageOriginY };
    const elapsedCombatSec = this.options.gameState.activeBossBattle?.elapsedCombatSec ?? 0;

    activeRifts.forEach((rift) => {
      const kind = rift.kind ?? 'standard';
      const pos = parryCardPosition(rift, sphereLocal, elapsedCombatSec, promptScale);
      const labelText =
        kind === 'anubis_scales'
          ? 'PESAR'
          : kind === 'hades_chains'
            ? 'GRILHÃO'
            : kind === 'odin_raven'
              ? 'CORVO'
              : kind === 'chaos_orbit'
                ? 'COLAPSO'
                : 'APARAR';
      const detailText =
        kind === 'anubis_scales'
          ? 'Clique no maior peso'
          : kind === 'hades_chains'
            ? 'Quebre para recuperar os cliques'
            : kind === 'odin_raven'
              ? 'Apare para atrasar o ataque'
              : kind === 'chaos_orbit'
                ? 'Apare os três selos'
                : 'Ataque aparado';

      let riftEl = this.riftsLayerEl!.querySelector<HTMLButtonElement>(
        `[data-rift-id="${rift.id}"]`
      );
      if (!riftEl) {
        riftEl = document.createElement('button');
        riftEl.type = 'button';
        const kindClass = kind !== 'standard' ? ` boss-rift-${kind.replace('_', '-')}` : '';
        riftEl.className = `boss-rift-target${kindClass}`;
        riftEl.setAttribute('data-rift-id', rift.id);
        riftEl.setAttribute('data-rift-kind', kind);
        riftEl.setAttribute('aria-label', kind === 'anubis_scales'
          ? `Pesar: peso ${rift.scaleValue}. Escolha apenas o maior peso.`
          : `${labelText}: aparar golpe do Guardião e carregar a Esfera`);
        riftEl.style.left = `${pos.x}px`;
        riftEl.style.top = `${pos.y}px`;
        riftEl.innerHTML = `
          ${kind === 'anubis_scales'
            ? `<span class="boss-rift-number"><small>PESO</small>${rift.scaleValue}</span>`
            : `<span class="boss-rift-core" aria-hidden="true">${icon('shield')}</span>`}
          <span class="boss-rift-label">${labelText}</span>
          <span class="boss-rift-damage">${detailText}</span>
          <span class="boss-rift-timer"></span>
          <span class="boss-rift-window" aria-hidden="true"><span class="boss-rift-window-fill"></span></span>
        `;
        riftEl.addEventListener('click', (e: MouseEvent) => {
          e.stopPropagation();
          const res = this.options.gameState.clickBossRift(rift.id);
          if (res.altarDamageTaken !== undefined) {
            this.lastRiftsMissed = this.options.gameState.activeBossBattle?.riftsMissed ?? this.lastRiftsMissed;
            this.spherePulseAlpha = 0.9;
            this.showHitFeedback(`Peso menor! −${res.altarDamageTaken.toFixed(0)}% da Esfera (×${formatNumber(res.scaleDamageMultiplier ?? 1)}).`);
            this.options.spawnFloatingText(
              e.clientX || window.innerWidth / 2, e.clientY || window.innerHeight / 2,
              `−${formatFixed(res.altarDamageTaken, 1)}% ESFERA (×${formatNumber(res.scaleDamageMultiplier ?? 1)})`
            );
            this.updateUI();
            this.drawWorldScene();
            events.emit(GameEvents.STATE_CHANGED);
          } else if (res.shattered) {
            // Parry interrupts/cancels the Boss's attack swing and flashes the Boss sprite
            this.attackedRiftIds.add(rift.id);
            this.bossHitFlashSec = 0.28;
            this.bossState = 'idle';
            this.bossAttackFrameTimeSec = 0;
            this.bossParryRecoverySec = PARRY_RECOVERY_SEC;
            this.spherePulseAlpha = 0;
            this.lastRiftsMissed = this.options.gameState.activeBossBattle?.riftsMissed ?? this.lastRiftsMissed;
            // A stale target from another pending rift cannot immediately replay the cancelled swing.
            this.options.gameState.activeBossBattle?.activeRifts.forEach(r => this.attackedRiftIds.add(r.id));
            const comboTag = (res.comboStreak ?? 1) > 1 ? ` Combo ×${formatNumber(res.comboStreak ?? 1)} ·` : '';
            let specialMsg = res.kind === 'anubis_scales'
              ? 'Não clique no peso menor.'
              : 'Ataque aparado';
            if (res.specialBonusTriggered) {
              if (res.kind === 'hades_chains') {
                specialMsg = 'Grilhões quebrados! Cliques normais de novo.';
              } else if (res.kind === 'odin_raven') {
                specialMsg = 'Corvo interceptado! Próximo ataque atrasado.';
              } else if (res.kind === 'chaos_orbit') {
                specialMsg = 'Colapso revertido!';
              }
            }
            this.showHitFeedback(`Aparado!${comboTag} ${specialMsg}`);
            this.options.audio.playTone(880, 'triangle', 0.16);
            const x = e.clientX || window.innerWidth / 2;
            const y = e.clientY || window.innerHeight / 2;
            this.options.spawnFloatingText(
              x,
              y,
              '\u2726 APARADO!'
            );
            this.updateUI();
            this.drawWorldScene();
            events.emit(GameEvents.STATE_CHANGED);
          }
        });
        this.riftsLayerEl!.appendChild(riftEl);
      }

      riftEl.style.left = `${pos.x}px`;
      riftEl.style.top = `${pos.y}px`;
      const labelEl = riftEl.querySelector<HTMLElement>('.boss-rift-label');
      this.setText(labelEl, labelText);
      this.setText(riftEl.querySelector<HTMLElement>('.boss-rift-damage'), detailText);
      const timerEl = riftEl.querySelector<HTMLElement>('.boss-rift-timer');
      this.setText(timerEl, `${formatFixed(Math.max(0, rift.remainingSec), 1)}s`);
      const fillEl = riftEl.querySelector<HTMLElement>('.boss-rift-window-fill');
      if (fillEl && rift.maxSec > 0) {
        const pct = Math.max(0, Math.min(100, (rift.remainingSec / rift.maxSec) * 100));
        fillEl.style.width = `${pct.toFixed(0)}%`;
      }
      if (kind === 'odin_raven') {
        riftEl.classList.toggle('is-crit-window', rift.remainingSec >= rift.maxSec * 0.35);
      }
      riftEl.classList.toggle('is-urgent', rift.remainingSec <= 0.9);
    });
  }
}
