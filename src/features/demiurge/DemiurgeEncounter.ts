import { BOSS_COMBAT_SPOT, BOSS_SPHERE_CENTER } from '../gnose/battle/BattleChoreography.js';
import {
  BOSS_SRC_H,
  BOSS_SRC_W,
  bossLoopFrameCount,
   bossSheetFrameCount,
  demiurgeChannelingFrame,
  loadBossSprites,
} from '../gnose/battle/BossSprites.js';
import type { GameStateManager } from '../../core/GameState.js';
import type { AudioManager } from '../../systems/audio.js';
import {
  DEMIURGE_LABELS,
  DEMIURGE_RESOURCES,
  challengeDemiurge,
  summonDemiurge,
  tickDemiurge,
} from '../../systems/demiurge.js';
import { cultDialog } from '../../ui/CultDialog.js';
import { getVisualFps, VisualFrameClock } from '../../ui/visualTiming.js';
import { SaveSystem } from '../../systems/saveSystem.js';
import './demiurge.css';

const WALK_DURATION_SEC = 2;
const DRAIN_DURATION_SEC = 4;
const APPROACH_DURATION_SEC = 2.75;

interface EssencePalette {
  primary: string;
  secondary: string;
  glow: string;
}

const ESSENCE_PALETTES: readonly EssencePalette[] = [
  { primary: '#f6dc9a', secondary: '#c99a4e', glow: 'rgba(246, 220, 154, 0.46)' }, // Fé
  { primary: '#f2e8cf', secondary: '#e07a5f', glow: 'rgba(224, 122, 95, 0.44)' },  // Fiéis
  { primary: '#ffb35c', secondary: '#d0683a', glow: 'rgba(255, 145, 72, 0.48)' },  // Fervor
  { primary: '#fcd34d', secondary: '#d97706', glow: 'rgba(252, 211, 77, 0.46)' },  // Fragmentos
  { primary: '#e9d5ff', secondary: '#a855f7', glow: 'rgba(192, 132, 252, 0.56)' }, // Gnose
];

interface ApproachOrigin {
  x: number;
  y: number;
  w: number;
  h: number;
  wasDraining: boolean;
  resourceIdx: number;
  severSource: { x: number; y: number } | null;
  severOrb: { x: number; y: number };
}

function cubicBezier(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

function cubicBezierTangent(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const mt = 1 - t;
  return 3 * mt * mt * (p1 - p0) + 6 * mt * t * (p2 - p1) + 3 * t * t * (p3 - p2);
}

export class DemiurgeEncounter {
  private sceneCanvas = document.createElement('canvas');
  private sceneCtx: CanvasRenderingContext2D | null = null;
  private canvasW = 0;
  private canvasH = 0;
  private canvasDpr = 1;

  private challengeButton = document.createElement('button');
  private actor = document.createElement('button');
  private actorPrompt = document.createElement('span');
  private status = document.createElement('aside');
  private statusTitle = document.createElement('strong');
  private statusSub = document.createElement('span');
  private statusMeter = document.createElement('div');
  private statusMeterFill = document.createElement('span');

  private announcing = false;
  private lossDialog?: HTMLDialogElement;
  private phase = '';

  // Smooth visual state gated by VisualFrameClock (30 FPS default / 60 FPS optional)
  private rafId: number | null = null;
  private visualClock = new VisualFrameClock();
  private sceneTimeSec = 0;
  private walkCycleSec = 0;
  private lastServerPhase = '';
  private lastServerTarget = -1;
  private lastServerElapsed = -1;
  private lastServerStampMs = 0;
  private smoothElapsed = 0;

  private hasVisualPos = false;
  private visualX = -220;
  private visualY = 64;
  private visualW = 176;
  private visualH = 132;
  private facing: 1 | -1 = 1;
  private walkStart = { x: -220, y: 64 };
  private approachOrigin?: ApproachOrigin;
  private playedImpactSound = false;
  private trailHistory: Array<{ x: number; y: number; w: number; h: number }> = [];

  // Cached DOM references & dirty-checked state to avoid 10Hz/60Hz reflow storms
  private currencyEls: Array<HTMLElement | null> = [];
  private worldEl: HTMLElement | null = null;
  private reducedMotionQuery: MediaQueryList | null =
    typeof window !== 'undefined' ? (window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null) : null;
  private cachedAnchors: Array<DOMRect | undefined> | null = null;
  private hudClean = false;
  private lastDrainPctStr = '';
  private lastHitTransform = '';
  private lastHitW = -1;
  private lastHitH = -1;
  private lastStatusColor = '';
  private lastMeterWidth = '';
  private lastMeterBg = '';

  constructor(
    private gs: GameStateManager,
    private save: () => unknown,
    private ready: () => boolean,
    private restart: () => Promise<void>,
    private frameArena: (
      target: { x: number; y: number; width: number; height: number },
      elapsedSec: number
    ) => void,
    private openBattle: () => boolean,
    private audio?: AudioManager
  ) {
    this.sceneCanvas.className = 'demiurge-scene-canvas';
    this.sceneCanvas.width = 1;
    this.sceneCanvas.height = 1;
    this.sceneCanvas.hidden = true;
    this.sceneCanvas.setAttribute('aria-hidden', 'true');
    this.sceneCtx = this.sceneCanvas.getContext('2d');

    this.actor.type = 'button';
    this.actor.className = 'demiurge-actor';
    this.actor.setAttribute('aria-label', 'Desafiar o Demiurgo');
    this.actor.title = 'Clique ou toque para desafiar o Demiurgo';
    this.actorPrompt.className = 'demiurge-actor-prompt';
    this.actorPrompt.textContent = '⚔ Desafiar';
    this.actorPrompt.setAttribute('aria-hidden', 'true');
    this.actor.append(this.actorPrompt);

    const challenge = (event: MouseEvent) => {
      if (!event.isTrusted) return;
      if (this.hasBlockingModal() || !this.ready()) return;
      const prevPhase = this.gs.demiurge.phase;
      const prevTarget = this.gs.demiurge.target;
      const anchors = this.measureResourceAnchors(true);
      const targetRect = anchors[prevTarget];
      const fromRematch = prevPhase === 'defeated' || !this.hasVisualPos;

      if (challengeDemiurge(this.gs)) {
        const defaultW = window.innerWidth <= 860 ? 144 : 176;
        const defaultH = window.innerWidth <= 860 ? 108 : 132;
        const startX = fromRematch ? window.innerWidth * 0.5 - 220 : this.visualX;
        const startY = fromRematch ? -defaultH - 16 : this.visualY;
        const startW = fromRematch ? defaultW : this.visualW;
        const startH = fromRematch ? defaultH : this.visualH;
        const orbNormX = this.facing === 1 ? 0.74 : 0.26;

        this.approachOrigin = {
          x: startX,
          y: startY,
          w: startW,
          h: startH,
          wasDraining: prevPhase === 'draining',
          resourceIdx: prevTarget,
          severSource:
            prevPhase === 'draining' && targetRect
              ? { x: targetRect.left + targetRect.width * 0.5, y: targetRect.bottom - 2 }
              : null,
          severOrb: { x: startX + startW * orbNormX, y: startY + startH * 0.48 },
        };
        this.visualX = startX;
        this.visualY = startY;
        this.visualW = startW;
        this.visualH = startH;
        this.hasVisualPos = true;
        this.playedImpactSound = false;
        this.trailHistory.length = 0;
        this.smoothElapsed = 0;
        this.lastServerPhase = 'approaching';
        this.lastServerElapsed = 0;
        this.lastServerStampMs = performance.now();

        loadBossSprites('boss_demiurge');
        this.audio?.playTone(215, 'triangle', 0.22);
        this.save();
        this.syncHudCorruption();
        this.ensureVisualLoop();
        this.renderFrame(0.016);
      }
    };

    this.actor.addEventListener('click', challenge);

    this.challengeButton.type = 'button';
    this.challengeButton.className = 'demiurge-challenge';
    this.challengeButton.textContent = 'Enfrentar o Demiurgo';
    this.challengeButton.hidden = true;
    this.challengeButton.addEventListener('click', challenge);

    this.status.className = 'demiurge-status';
    this.statusTitle.className = 'demiurge-status-title';
    this.statusSub.className = 'demiurge-status-sub';
    this.statusMeter.className = 'demiurge-status-meter';
    this.statusMeterFill.className = 'demiurge-status-meter-fill';
    this.statusMeter.append(this.statusMeterFill);
    this.status.append(this.statusTitle, this.statusSub, this.statusMeter);

    this.actor.hidden = true;
    this.status.hidden = true;
    document.body.append(this.sceneCanvas, this.actor, this.status, this.challengeButton);

    window.addEventListener('resize', () => {
      this.cachedAnchors = null;
    });
  }

  private hasBlockingModal(): boolean {
    return !!document.querySelector('dialog[open], .modal-overlay.open');
  }

  private getCurrencyEl(index: number): HTMLElement | null {
    const cached = this.currencyEls[index];
    if (cached && cached.isConnected) return cached;
    const key = DEMIURGE_RESOURCES[index];
    const found = document.querySelector<HTMLElement>(`[data-currency="${key}"]`);
    this.currencyEls[index] = found;
    return found;
  }

  private getWorldEl(): HTMLElement | null {
    if (this.worldEl && this.worldEl.isConnected) return this.worldEl;
    this.worldEl = document.getElementById('dodeca-board-world');
    return this.worldEl;
  }

  public update(seconds: number): void {
    const d = this.gs.demiurge;
    // Fast path for 99% of gameplay before Tiamat/Caos Primordial is defeated
    if (
      d.phase === 'dormant' &&
      this.phase === 'dormant' &&
      !this.gs.isBossDefeated('boss_tiamat') &&
      this.hudClean &&
      this.actor.hidden &&
      this.challengeButton.hidden &&
      !this.lossDialog &&
      this.rafId === null
    ) {
      return;
    }

    this.cachedAnchors = null;

    if (!this.ready() || document.visibilityState === 'hidden') {
      this.hideVisuals();
      this.syncHudCorruption();
      return;
    }

    const blocked = this.hasBlockingModal();
    if (!blocked && summonDemiurge(this.gs)) this.save();

    if (d.phase === 'announced' && !this.announcing && !blocked) {
      this.announcing = true;
      loadBossSprites('boss_demiurge');
      void cultDialog(
        'O Demiurgo apareceu',
        'O Demiurgo apareceu e deve ser derrotado! Ele vai consumir Fé, Fiéis, Fervor, Fragmentos e Gnose, nessa ordem. Se a Gnose chegar a zero, você perde o jogo. Clique ou toque nele para desafiá-lo: ele deixará os recursos, descerá até a Esfera e os Fiéis iniciarão a procissão para a batalha. Cada recurso e sua geração por segundo são drenados em até 4 segundos; recursos vazios são pulados. O encontro pausa enquanto você estiver fora do jogo.',
        'Enfrentar o Demiurgo'
      ).then((accepted) => {
        if (accepted && this.gs.demiurge === d) {
          d.phase = 'walking';
          d.elapsed = 0;
          this.hasVisualPos = false;
          this.save();
          this.ensureVisualLoop();
        }
        this.announcing = false;
      });
    }

    if (!blocked) {
      tickDemiurge(this.gs, seconds);
      if (d.phase === 'approaching') {
        d.elapsed += seconds;
        if (d.elapsed >= APPROACH_DURATION_SEC && this.openBattle()) {
          this.save();
          this.hideVisuals(blocked);
          this.syncHudCorruption();
          return;
        }
      }
    }

    if (this.phase !== d.phase) {
      this.phase = d.phase;
      this.save();
    }

    const activeWalkOrDrain = d.phase === 'walking' || d.phase === 'draining';
    const canChallenge = (activeWalkOrDrain || d.phase === 'defeated') && !blocked;
    if (this.challengeButton.hidden !== !canChallenge) {
      this.challengeButton.hidden = !canChallenge;
    }
    if (canChallenge) {
      const label = d.phase === 'defeated' ? 'Redesafiar o Demiurgo' : '⚔ Enfrentar o Demiurgo';
      if (this.challengeButton.textContent !== label) {
        this.challengeButton.textContent = label;
      }
    }

    this.syncHudCorruption();

    if (activeWalkOrDrain || d.phase === 'approaching') {
      loadBossSprites('boss_demiurge');
      this.ensureVisualLoop();
    } else {
      this.hideVisuals(blocked);
    }

    if (d.phase === 'lost' && !this.lossDialog && !blocked) this.showLoss();
    if (d.phase !== 'lost' && this.lossDialog) {
      this.lossDialog.close();
      this.lossDialog.remove();
      this.lossDialog = undefined;
    }
  }

  private ensureVisualLoop(): void {
    if (this.rafId !== null) return;
    this.visualClock.reset();
    const step = (nowMs: number) => {
      this.rafId = null;
      const d = this.gs.demiurge;
      const active =
        this.ready() &&
        document.visibilityState !== 'hidden' &&
        (d.phase === 'walking' || d.phase === 'draining' || d.phase === 'approaching');
      if (!active) {
        this.hideVisuals();
        return;
      }
      const frameSec = this.visualClock.tick(nowMs);
      if (frameSec !== null) {
        const dt = Math.max(0.001, Math.min(0.05, frameSec === 0 ? 1 / getVisualFps() : frameSec));
        const blocked = this.hasBlockingModal();
        this.syncSmoothElapsed(nowMs, blocked);
        this.renderFrame(dt, blocked);
      }
      this.rafId = window.requestAnimationFrame(step);
    };
    this.rafId = window.requestAnimationFrame(step);
  }

  private hideVisuals(blocked?: boolean): void {
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (!this.actor.hidden) this.actor.hidden = true;
    if (!this.status.hidden) this.status.hidden = true;
    const phase = this.gs.demiurge.phase;
    const shouldHideChallenge =
      !this.ready() ||
      document.visibilityState === 'hidden' ||
      !(phase === 'walking' || phase === 'draining' || phase === 'defeated') ||
      (blocked ?? this.hasBlockingModal());
    if (this.challengeButton.hidden !== shouldHideChallenge) {
      this.challengeButton.hidden = shouldHideChallenge;
    }
    if (!this.sceneCanvas.hidden) {
      this.sceneCanvas.hidden = true;
      this.sceneCanvas.width = 1;
      this.sceneCanvas.height = 1;
      this.canvasW = 0;
      this.canvasH = 0;
    }
  }

  private syncHudCorruption(): void {
    const d = this.gs.demiurge;
    const defeated = this.gs.isBossDefeated('boss_demiurge') || d.phase === 'defeated' || d.phase === 'dormant';
    if (defeated) {
      if (this.hudClean) return;
      for (let i = 0; i < DEMIURGE_RESOURCES.length; i++) {
        const el = this.getCurrencyEl(i);
        if (!el) continue;
        el.classList.remove('is-demiurge-draining', 'is-demiurge-drained', 'is-demiurge-critical');
        el.style.removeProperty('--demiurge-drain-pct');
      }
      this.lastDrainPctStr = '';
      this.hudClean = true;
      return;
    }

    this.hudClean = false;
    const hasPastDrained =
      d.phase === 'walking' ||
      d.phase === 'draining' ||
      d.phase === 'approaching' ||
      d.phase === 'fighting' ||
      d.phase === 'lost';
    for (let i = 0; i < DEMIURGE_RESOURCES.length; i++) {
      const el = this.getCurrencyEl(i);
      if (!el) continue;
      const isDrainingThis = d.phase === 'draining' && d.target === i;
      const isCritical = isDrainingThis && i === 4;
      const isDrainedPast = hasPastDrained && i < d.target;
      if (el.classList.contains('is-demiurge-draining') !== isDrainingThis) {
        el.classList.toggle('is-demiurge-draining', isDrainingThis);
      }
      if (el.classList.contains('is-demiurge-critical') !== isCritical) {
        el.classList.toggle('is-demiurge-critical', isCritical);
      }
      if (el.classList.contains('is-demiurge-drained') !== isDrainedPast) {
        el.classList.toggle('is-demiurge-drained', isDrainedPast);
      }
      if (isDrainingThis) {
        const pctStr = `${Math.max(0, Math.min(100, (1 - this.smoothElapsed / DRAIN_DURATION_SEC) * 100)).toFixed(1)}%`;
        if (this.lastDrainPctStr !== pctStr) {
          this.lastDrainPctStr = pctStr;
          el.style.setProperty('--demiurge-drain-pct', pctStr);
        }
      } else if (el.style.getPropertyValue('--demiurge-drain-pct')) {
        el.style.removeProperty('--demiurge-drain-pct');
      }
    }
  }

  private syncSmoothElapsed(nowMs: number, blocked = this.hasBlockingModal()): void {
    const d = this.gs.demiurge;

    if (d.phase !== this.lastServerPhase || d.target !== this.lastServerTarget) {
      const prevPhase = this.lastServerPhase;
      this.lastServerPhase = d.phase;
      this.lastServerTarget = d.target;
      this.lastServerElapsed = d.elapsed;
      this.lastServerStampMs = nowMs;
      this.smoothElapsed = d.elapsed;
      this.cachedAnchors = null;

      if (d.phase === 'walking') {
        const anchors = this.measureResourceAnchors(true);
        const baseW = window.innerWidth <= 860 ? 144 : 176;
        const baseH = window.innerWidth <= 860 ? 108 : 132;
        const perch = this.computePerch(anchors[d.target], baseW, baseH);
        if (!this.hasVisualPos || (d.target === 0 && prevPhase !== 'walking' && prevPhase !== 'draining')) {
          this.walkStart = { x: -baseW - 36, y: perch.y - 6 };
          this.visualX = this.walkStart.x;
          this.visualY = this.walkStart.y;
          this.visualW = baseW;
          this.visualH = baseH;
          this.facing = 1;
          this.hasVisualPos = true;
        } else {
          this.walkStart = { x: this.visualX, y: this.visualY };
        }
      } else if (d.phase === 'draining') {
        this.audio?.playTone(152 + d.target * 20, 'sine', 0.13);
      }
      return;
    }

    if (d.elapsed !== this.lastServerElapsed) {
      this.lastServerElapsed = d.elapsed;
      this.lastServerStampMs = nowMs;
    }

    const maxDur =
      d.phase === 'walking'
        ? WALK_DURATION_SEC
        : d.phase === 'draining'
          ? DRAIN_DURATION_SEC
          : APPROACH_DURATION_SEC;
    const extrap = blocked ? 0 : Math.min(0.11, Math.max(0, (nowMs - this.lastServerStampMs) / 1000));
    this.smoothElapsed = Math.min(maxDur, Math.max(this.smoothElapsed, d.elapsed + extrap));
  }

  private measureResourceAnchors(force = false): Array<DOMRect | undefined> {
    if (!force && this.cachedAnchors) return this.cachedAnchors;
    let lastValid: DOMRect | undefined;
    const raw: Array<DOMRect | undefined> = new Array(DEMIURGE_RESOURCES.length);
    for (let i = 0; i < DEMIURGE_RESOURCES.length; i++) {
      const el = this.getCurrencyEl(i);
      const rect = el?.getBoundingClientRect();
      if (rect && rect.width > 0 && rect.height > 0) {
        lastValid = rect;
        raw[i] = rect;
      }
    }
    const firstValid = raw.find(Boolean) ?? lastValid;
    for (let i = 0; i < raw.length; i++) {
      if (!raw[i]) raw[i] = firstValid;
    }
    this.cachedAnchors = raw;
    return raw;
  }

  private computePerch(
    targetRect: DOMRect | undefined,
    drawW: number,
    drawH: number
  ): { x: number; y: number; targetCx: number; targetBottom: number } {
    const fallbackCx = Math.min(window.innerWidth - 80, 140 + this.gs.demiurge.target * 120);
    const targetCx = targetRect ? targetRect.left + targetRect.width * 0.5 : fallbackCx;
    const targetBottom = targetRect ? targetRect.bottom : 68;
    const idealLeft = targetCx - drawW * 0.72;
    const x = Math.max(-14, Math.min(window.innerWidth - drawW + 14, idealLeft));
    const y = Math.max(8, targetBottom - drawH * 0.12);
    return { x, y, targetCx, targetBottom };
  }

  private ensureSceneCanvasSize(): CanvasRenderingContext2D | null {
    const ctx = this.sceneCtx;
    if (!ctx) return null;
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (this.sceneCanvas.hidden) {
      this.sceneCanvas.hidden = false;
    }
    if (w !== this.canvasW || h !== this.canvasH || dpr !== this.canvasDpr) {
      this.canvasW = w;
      this.canvasH = h;
      this.canvasDpr = dpr;
      this.sceneCanvas.width = Math.floor(w * dpr);
      this.sceneCanvas.height = Math.floor(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return ctx;
  }

  private renderFrame(dt: number, blocked = this.hasBlockingModal()): void {
    const d = this.gs.demiurge;
    if (!(d.phase === 'walking' || d.phase === 'draining' || d.phase === 'approaching')) {
      this.hideVisuals(blocked);
      return;
    }

    const reducedMotion = !!this.reducedMotionQuery?.matches;
    this.sceneTimeSec += dt;

    const anchors = this.measureResourceAnchors();
    const ctx = this.ensureSceneCanvasSize();
    if (!ctx) return;

    const sprites = loadBossSprites('boss_demiurge');
    const targetRect = anchors[d.target];
    const baseW = window.innerWidth <= 860 ? 144 : 176;
    const baseH = window.innerWidth <= 860 ? 108 : 132;
    const perch = this.computePerch(targetRect, baseW, baseH);

    let sheet: HTMLImageElement | null = null;
    let frame = 0;

    if (d.phase === 'walking') {
      const u = Math.max(0, Math.min(1, this.smoothElapsed / WALK_DURATION_SEC));
      const smooth = u * u * (3 - 2 * u);
      const speedBell = Math.sin(u * Math.PI);
      this.walkCycleSec += dt * (0.85 + 0.55 * speedBell);
      const coilSurge = reducedMotion ? 0 : speedBell * Math.sin(this.walkCycleSec * 8.4) * 0.016;
      const s = Math.max(0, Math.min(1, smooth + coilSurge));
      const bobY = reducedMotion ? 0 : Math.sin(this.walkCycleSec * 8.4) * 3.2 * speedBell;

      const dx = perch.x - this.walkStart.x;
      if (dx < -6) this.facing = -1;
      else if (dx > 6) this.facing = 1;

      this.visualW = baseW;
      this.visualH = baseH;
      this.visualX = this.walkStart.x + dx * s;
      this.visualY = this.walkStart.y + (perch.y - this.walkStart.y) * s + bobY;
      this.hasVisualPos = true;

      sheet = sprites?.walk ?? null;
      frame = Math.floor(this.walkCycleSec / 0.086) % bossLoopFrameCount(sheet ?? undefined);

      const curseStacks = this.gs.getBossCurseStacks();
      const curseTag = curseStacks > 0 ? ` · Maldição ${curseStacks}/5` : '';
      this.updateStatusBanner(
        `Demiurgo · Rastejando até ${DEMIURGE_LABELS[d.target]}${curseTag}`,
        curseStacks >= 5
          ? 'Clique no Demiurgo para iniciar o duelo (HITKILL se errar aparo — ou purifique contra Caos Primordial)'
          : 'Clique no Demiurgo para interromper e iniciar o duelo',
        null,
        ESSENCE_PALETTES[d.target]?.primary
      );
    } else if (d.phase === 'draining') {
      const floatY = reducedMotion ? 0 : Math.sin(this.sceneTimeSec * 3.4) * 2.2;
      // Smoothly settle onto exact perch if slightly offset
      const settle = 1 - Math.exp(-12 * dt);
      this.visualW = baseW;
      this.visualH = baseH;
      this.visualX = this.hasVisualPos ? this.visualX + (perch.x - this.visualX) * settle : perch.x;
      this.visualY = (this.hasVisualPos ? this.visualY + (perch.y - this.visualY) * settle : perch.y) + floatY * 0.18;
      this.hasVisualPos = true;
      this.facing = perch.targetCx >= this.visualX + baseW * 0.42 ? 1 : -1;

      sheet = sprites?.attacks[1] ?? sprites?.walk ?? null;
      frame = sprites?.attacks[1]?.complete
        ? demiurgeChannelingFrame(this.smoothElapsed, DRAIN_DURATION_SEC)
        : 0;

      const drainRatio = Math.max(0, Math.min(1, this.smoothElapsed / DRAIN_DURATION_SEC));
      const remainingPct = Math.round((1 - drainRatio) * 100);
      const palette = ESSENCE_PALETTES[d.target] ?? ESSENCE_PALETTES[0];

      const orbNormX = this.facing === 1 ? 0.74 : 0.26;
      const staffNormX = this.facing === 1 ? 0.71 : 0.29;
      const orbX = this.visualX + this.visualW * orbNormX;
      const orbY = this.visualY + this.visualH * 0.48;
      const staffX = this.visualX + this.visualW * staffNormX;
      const staffY = this.visualY + this.visualH * 0.14;

      this.drawResourceSiphon(
        ctx,
        perch.targetCx,
        perch.targetBottom - 2,
        orbX,
        orbY,
        staffX,
        staffY,
        drainRatio,
        palette,
        reducedMotion
      );
      this.syncHudCorruption();

      const curseStacks = this.gs.getBossCurseStacks();
      const curseTag = curseStacks > 0 ? ` · Maldição ${curseStacks}/5` : '';
      this.updateStatusBanner(
        `Demiurgo · Drenando ${DEMIURGE_LABELS[d.target]} (${remainingPct}%)${curseTag}`,
        d.target === 4
          ? 'PERIGO FINAL: se a Gnose zerar, o culto se apaga! Clique nele agora!'
          : curseStacks >= 5
            ? 'Clique no Demiurgo para detê-lo (HITKILL se errar aparo — ou purifique na Gnose)'
            : 'Clique no Demiurgo para detê-lo e levá-lo à Esfera',
        1 - drainRatio,
        palette.primary
      );
    } else if (d.phase === 'approaching') {
      if (!blocked && dt > 0) {
        this.frameArena(
          {
            x: (BOSS_COMBAT_SPOT.x + BOSS_SPHERE_CENTER.x) * 0.5,
            y: BOSS_SPHERE_CENTER.y - 16,
            width: 1060,
            height: 700,
          },
          dt
        );
      }

      const world = this.getWorldEl();
      const worldRect = world?.getBoundingClientRect();
      const worldScale =
        world && worldRect && world.offsetWidth > 0 ? worldRect.width / world.offsetWidth : 0.75;
      const endW = 320 * worldScale;
      const endH = 240 * worldScale;
      const endX = worldRect
        ? worldRect.left + (BOSS_COMBAT_SPOT.x - 158) * worldScale
        : window.innerWidth * 0.34 - endW * 0.5;
      const endY = worldRect
        ? worldRect.top + (BOSS_COMBAT_SPOT.y - 215) * worldScale
        : window.innerHeight * 0.52 - endH * 0.5;
      const sphereX = worldRect
        ? worldRect.left + BOSS_SPHERE_CENTER.x * worldScale
        : window.innerWidth * 0.62;
      const sphereY = worldRect
        ? worldRect.top + BOSS_SPHERE_CENTER.y * worldScale
        : window.innerHeight * 0.52;

      const origin: ApproachOrigin = this.approachOrigin ?? {
        x: this.visualX,
        y: this.visualY,
        w: this.visualW,
        h: this.visualH,
        wasDraining: false,
        resourceIdx: d.target,
        severSource: null,
        severOrb: { x: this.visualX + this.visualW * 0.74, y: this.visualY + this.visualH * 0.48 },
      };

      const u = Math.max(0, Math.min(1, this.smoothElapsed / APPROACH_DURATION_SEC));

      // 1. Severance burst when breaking away from resource drain
      if (origin.wasDraining && u < 0.24) {
        this.drawSeveranceBurst(
          ctx,
          origin.severOrb,
          origin.severSource,
          u / 0.24,
          ESSENCE_PALETTES[origin.resourceIdx] ?? ESSENCE_PALETTES[0]
        );
      }

      // 2. Curved serpentine descent (0 -> 0.78), then opening strike at the Sphere (0.78 -> 1.0)
      if (u < 0.78) {
        const sRaw = Math.max(0, Math.min(1, u / 0.78));
        const s =
          sRaw < 0.5 ? 4 * sRaw * sRaw * sRaw : 1 - Math.pow(-2 * sRaw + 2, 3) / 2;

        const p0x = origin.x;
        const p0y = origin.y - (origin.wasDraining ? Math.sin(Math.min(1, u / 0.16) * Math.PI) * 10 : 0);
        const p3x = endX;
        const p3y = endY;
        const p1x = p0x + (p3x - p0x) * 0.26;
        const p1y = Math.max(p0y + 88, p0y + (p3y - p0y) * 0.46);
        // Approach slightly from the left of BOSS_COMBAT_SPOT so tangent dx > 0 on arrival, turning right toward the Sphere!
        const p2x = p3x - 84 * worldScale;
        const p2y = p3y - 26 * worldScale;

        const bx = cubicBezier(p0x, p1x, p2x, p3x, s);
        const by = cubicBezier(p0y, p1y, p2y, p3y, s);
        const tx = cubicBezierTangent(p0x, p1x, p2x, p3x, s);

        if (tx < -5) this.facing = -1;
        else if (tx > 5) this.facing = 1;

        const speedBell = Math.sin(sRaw * Math.PI);
        this.walkCycleSec += dt * (1.05 + 0.65 * speedBell);
        const waveY = reducedMotion ? 0 : Math.sin(this.walkCycleSec * 9.0) * 4.5 * speedBell;

        this.visualW = origin.w + (endW - origin.w) * s;
        this.visualH = origin.h + (endH - origin.h) * s;
        this.visualX = bx;
        this.visualY = by + waveY;

        if (!reducedMotion && dt > 0) {
          this.trailHistory.push({
            x: this.visualX,
            y: this.visualY,
            w: this.visualW,
            h: this.visualH,
          });
          if (this.trailHistory.length > 7) this.trailHistory.shift();
          this.drawApproachTrail(ctx);
        }

        if (origin.wasDraining && u < 0.12 && sprites?.attacks[1]?.complete) {
          sheet = sprites.attacks[1];
          frame = Math.min(15, 11 + Math.floor((u / 0.12) * 5));
        } else {
          sheet = sprites?.walk ?? null;
          frame = Math.floor(this.walkCycleSec / 0.082) % bossLoopFrameCount(sheet ?? undefined);
        }

        this.updateStatusBanner(
          'O Demiurgo abandona os recursos…',
          'Ele serpenteia até o Altar para atacar a Esfera Divina!',
          null,
          '#f6dc9a'
        );
      } else {
        // Arrived at exact BOSS_COMBAT_SPOT: hurl opening dark orb against the Sphere!
        this.facing = 1;
        this.visualW = endW;
        this.visualH = endH;
        this.visualX = endX;
        this.visualY = endY;

        const strikeU = Math.max(0, Math.min(1, (u - 0.78) / 0.22));
        const strikeSheet = sprites?.attacks[0];
        if (strikeSheet?.complete && strikeSheet.naturalWidth > 0) {
          sheet = strikeSheet;
          const total = bossSheetFrameCount(strikeSheet);
          frame = Math.min(total - 1, Math.floor(strikeU * total));
        } else {
          sheet = sprites?.walk ?? null;
          frame = 0;
        }

        if (strikeU >= 0.38) {
          const projT = Math.min(1, (strikeU - 0.38) / 0.44);
          if (projT >= 0.88 && !this.playedImpactSound) {
            this.playedImpactSound = true;
            this.audio?.playTone(168, 'sawtooth', 0.18);
          }
          this.drawOpeningSphereAssault(
            ctx,
            endX + endW * 0.8,
            endY + endH * 0.47,
            sphereX,
            sphereY,
            worldScale,
            projT
          );
        }

        this.updateStatusBanner(
          'O Demiurgo investe contra a Esfera!',
          'A Encarnação convoca os Fiéis para formar a roda sagrada…',
          null,
          '#c084fc'
        );
      }
    }

    // Fallback to idle.png if chosen sheet is still decoding
    if (!(sheet && sheet.complete && sheet.naturalWidth > 0)) {
      if (sprites?.idle.complete && sprites.idle.naturalWidth > 0) {
        sheet = sprites.idle;
        frame = 0;
      } else {
        sheet = null;
      }
    }

    this.drawDemiurgeSprite(ctx, sheet, frame);
    this.syncActorHitbox(d.phase);
  }

  private drawDemiurgeSprite(
    ctx: CanvasRenderingContext2D,
    sheet: HTMLImageElement | null,
    frame: number
  ): void {
    const x = this.visualX;
    const y = this.visualY;
    const w = this.visualW;
    const h = this.visualH;

    // Grounded serpentine shadow beneath coils
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.94, w * 0.27, h * 0.085, 0, 0, Math.PI * 2);
    ctx.fill();

    if (sheet) {
      ctx.imageSmoothingEnabled = false;
      ctx.translate(x + w * 0.5, y);
      ctx.scale(this.facing, 1);
      ctx.drawImage(sheet, frame * BOSS_SRC_W, 0, BOSS_SRC_W, BOSS_SRC_H, -w * 0.5, 0, w, h);
    }
    ctx.restore();
  }

  private drawResourceSiphon(
    ctx: CanvasRenderingContext2D,
    srcX: number,
    srcY: number,
    orbX: number,
    orbY: number,
    staffX: number,
    staffY: number,
    drainRatio: number,
    palette: EssencePalette,
    reducedMotion: boolean
  ): void {
    const t = this.sceneTimeSec;
    const sway = reducedMotion ? 0 : Math.sin(t * 5.2) * 14;
    const c1x = srcX + (orbX - srcX) * 0.2 + sway;
    const c1y = srcY + Math.max(18, (orbY - srcY) * 0.45);
    const c2x = orbX - (orbX - srcX) * 0.18 - sway * 0.65;
    const c2y = orbY - Math.max(14, (orbY - srcY) * 0.35);

    ctx.save();

    // 1. Corrupting siphon flare at HUD resource bottom edge
    const srcGlow = ctx.createRadialGradient(srcX, srcY, 2, srcX, srcY, 26);
    srcGlow.addColorStop(0, palette.primary);
    srcGlow.addColorStop(0.45, palette.glow);
    srcGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = srcGlow;
    ctx.beginPath();
    ctx.arc(srcX, srcY, 26, 0, Math.PI * 2);
    ctx.fill();

    // 2. Twin intertwined sinuous siphon tendrils
    ctx.lineCap = 'round';
    ctx.strokeStyle = palette.glow;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(srcX, srcY);
    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, orbX, orbY);
    ctx.stroke();

    ctx.strokeStyle = palette.primary;
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 5]);
    ctx.lineDashOffset = -t * 48;
    ctx.beginPath();
    ctx.moveTo(srcX, srcY);
    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, orbX, orbY);
    ctx.stroke();

    ctx.strokeStyle = palette.secondary;
    ctx.lineWidth = 1.6;
    ctx.lineDashOffset = -t * 34 + 6;
    ctx.beginPath();
    ctx.moveTo(srcX, srcY);
    ctx.bezierCurveTo(c1x - sway * 1.3, c1y + 6, c2x + sway * 1.1, c2y - 5, orbX, orbY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Flowing essence motes accelerating into the Demiurge's chained dark orb
    const moteCount = reducedMotion ? 6 : 15;
    for (let i = 0; i < moteCount; i++) {
      const raw = (t * 1.28 + i / moteCount) % 1;
      // Gravity-well acceleration as essence approaches the orb
      const s = raw * raw * (0.55 + 0.45 * raw);
      const spiral = reducedMotion ? 0 : (1 - s) * Math.sin(t * 8.5 + i * 2.05) * 6.5;
      const mx = cubicBezier(srcX, c1x, c2x, orbX, s) + spiral;
      const my = cubicBezier(srcY, c1y, c2y, orbY, s);
      const radius = (1 - s * 0.45) * (i % 3 === 0 ? 3.4 : 2.3);

      ctx.fillStyle = i % 2 === 0 ? palette.primary : palette.secondary;
      ctx.globalAlpha = Math.min(1, raw * 3.5) * (1 - s * 0.2);
      ctx.beginPath();
      ctx.arc(mx, my, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 4. Accretion vortex around the chained black orb + Sun/Moon staff glint
    const orbRadius = 13 + drainRatio * 8 + Math.sin(t * 7.5) * 2;
    const orbGrad = ctx.createRadialGradient(orbX, orbY, 3, orbX, orbY, orbRadius + 10);
    orbGrad.addColorStop(0, 'rgba(12, 8, 18, 0.92)');
    orbGrad.addColorStop(0.45, palette.glow);
    orbGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = orbGrad;
    ctx.beginPath();
    ctx.arc(orbX, orbY, orbRadius + 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = palette.primary;
    ctx.lineWidth = 1.8;
    ctx.setLineDash([5, 4]);
    ctx.lineDashOffset = t * 28;
    ctx.beginPath();
    ctx.arc(orbX, orbY, orbRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Subtle resonance halo on raised Sun/Moon staff head
    ctx.setLineDash([]);
    ctx.strokeStyle = `rgba(246, 220, 154, ${(0.3 + 0.25 * Math.sin(t * 5.2)).toFixed(2)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(staffX, staffY, 11 + Math.sin(t * 5.2) * 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  private drawSeveranceBurst(
    ctx: CanvasRenderingContext2D,
    orb: { x: number; y: number },
    source: { x: number; y: number } | null,
    progress: number,
    palette: EssencePalette
  ): void {
    const alpha = Math.max(0, 1 - progress);
    ctx.save();
    ctx.strokeStyle = palette.primary;
    ctx.globalAlpha = alpha * 0.9;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, 12 + progress * 46, 0, Math.PI * 2);
    ctx.stroke();

    if (source) {
      ctx.beginPath();
      ctx.arc(source.x, source.y, 8 + progress * 28, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2 + 0.3;
      const r1 = 10 + progress * 22;
      const r2 = 18 + progress * 44;
      ctx.beginPath();
      ctx.moveTo(orb.x + Math.cos(ang) * r1, orb.y + Math.sin(ang) * r1);
      ctx.lineTo(orb.x + Math.cos(ang) * r2, orb.y + Math.sin(ang) * r2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawApproachTrail(ctx: CanvasRenderingContext2D): void {
    const len = this.trailHistory.length;
    if (len < 2) return;
    ctx.save();
    for (let i = 0; i < len - 1; i++) {
      const p = this.trailHistory[i];
      const ratio = (i + 1) / len;
      ctx.fillStyle = `rgba(192, 132, 252, ${(ratio * 0.14).toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(
        p.x + p.w * 0.5,
        p.y + p.h * 0.88,
        p.w * 0.2 * ratio,
        p.h * 0.065 * ratio,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.restore();
  }

  private drawOpeningSphereAssault(
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    sphereX: number,
    sphereY: number,
    worldScale: number,
    projT: number
  ): void {
    const targetX = sphereX - 54 * worldScale;
    const targetY = sphereY;
    const ease = 1 - Math.pow(1 - projT, 2);
    const px = fromX + (targetX - fromX) * ease;
    const py = fromY + (targetY - fromY) * ease - Math.sin(projT * Math.PI) * 26 * worldScale;

    ctx.save();
    if (projT < 0.94) {
      const r = Math.max(8, 16 * worldScale);
      const grad = ctx.createRadialGradient(px, py, 2, px, py, r * 1.9);
      grad.addColorStop(0, '#181024');
      grad.addColorStop(0.5, 'rgba(192, 132, 252, 0.85)');
      grad.addColorStop(1, 'rgba(246, 220, 154, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, r * 1.9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#120d18';
      ctx.strokeStyle = '#f6dc9a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, r * 0.72, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    if (projT >= 0.82) {
      const impactU = Math.min(1, (projT - 0.82) / 0.18);
      const ringR = (58 + impactU * 96) * worldScale;
      ctx.strokeStyle = `rgba(246, 220, 154, ${((1 - impactU) * 0.9).toFixed(2)})`;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(sphereX, sphereY, ringR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(192, 132, 252, ${((1 - impactU) * 0.75).toFixed(2)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(sphereX, sphereY, ringR * 0.76, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private syncActorHitbox(phase: string): void {
    const interactive = phase === 'walking' || phase === 'draining';
    if (this.actor.hidden) this.actor.hidden = false;
    if (this.actor.disabled !== !interactive) this.actor.disabled = !interactive;
    const isApproaching = phase === 'approaching';
    if (this.actor.classList.contains('is-approaching') !== isApproaching) {
      this.actor.classList.toggle('is-approaching', isApproaching);
    }
    const isDraining = phase === 'draining';
    if (this.actor.classList.contains('is-draining') !== isDraining) {
      this.actor.classList.toggle('is-draining', isDraining);
    }

    const padX = this.visualW * 0.1;
    const padTop = this.visualH * 0.04;
    const hitX = Math.round(this.visualX + padX);
    const hitY = Math.round(this.visualY + padTop);
    const hitW = Math.round(this.visualW * 0.8);
    const hitH = Math.round(this.visualH * 0.92);

    const transform = `translate3d(${hitX}px, ${hitY}px, 0)`;
    if (this.lastHitTransform !== transform) {
      this.lastHitTransform = transform;
      this.actor.style.transform = transform;
    }
    if (this.lastHitW !== hitW) {
      this.lastHitW = hitW;
      this.actor.style.width = `${hitW}px`;
    }
    if (this.lastHitH !== hitH) {
      this.lastHitH = hitH;
      this.actor.style.height = `${hitH}px`;
    }
  }

  private updateStatusBanner(
    title: string,
    sub: string,
    meterRatio: number | null,
    accentColor = '#ead8ac'
  ): void {
    if (this.status.hidden) this.status.hidden = false;
    if (this.statusTitle.textContent !== title) this.statusTitle.textContent = title;
    if (this.statusSub.textContent !== sub) this.statusSub.textContent = sub;
    if (this.lastStatusColor !== accentColor) {
      this.lastStatusColor = accentColor;
      this.statusTitle.style.color = accentColor;
    }
    if (meterRatio === null) {
      if (!this.statusMeter.hidden) this.statusMeter.hidden = true;
    } else {
      if (this.statusMeter.hidden) this.statusMeter.hidden = false;
      const widthStr = `${Math.max(0, Math.min(100, meterRatio * 100)).toFixed(1)}%`;
      if (this.lastMeterWidth !== widthStr) {
        this.lastMeterWidth = widthStr;
        this.statusMeterFill.style.width = widthStr;
      }
      if (this.lastMeterBg !== accentColor) {
        this.lastMeterBg = accentColor;
        this.statusMeterFill.style.background = accentColor;
      }
    }
  }

  private showLoss(): void {
    const dialog = document.createElement('dialog');
    this.lossDialog = dialog;
    dialog.className = 'cult-dialog';
    dialog.setAttribute('aria-labelledby', 'demiurge-loss-title');
    dialog.innerHTML =
      '<h2 id="demiurge-loss-title">O Demiurgo consumiu a Gnose</h2><p>Você perdeu o jogo. A última centelha do culto se apagou.</p><div class="cult-dialog-actions"><button type="button" data-export>Exportar progresso</button><button type="button" data-restart>Reiniciar o culto</button></div>';
    dialog.addEventListener('cancel', (e) => e.preventDefault());
    dialog
      .querySelector('[data-export]')!
      .addEventListener('click', () => SaveSystem.exportSave(this.gs.buildSaveData()));
    dialog.querySelector('[data-restart]')!.addEventListener('click', () => {
      void this.restart();
    });
    document.body.append(dialog);
    dialog.showModal();
    this.save();
  }
}
