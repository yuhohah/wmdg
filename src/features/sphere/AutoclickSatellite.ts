import { effectEasing, getVisualFps, VisualFrameClock } from '../../ui/visualTiming.js';

const TAU = Math.PI * 2;
const CANVAS_SIZE = 520;
const CENTER = CANVAS_SIZE / 2;
/** 1.0 wrapper width corresponds to 400px inside the 520px (-15% inset) canvas. */
const WRAPPER_SCALE = 400;

const GLOBE_RIM_RATIO = 0.258;
const R_CONTACT = 0.282;
const R_CRUISE = 0.452;
const R_WINDUP = 0.476;

const TRAIL_LEN = 18;
const MAX_IMPACTS = 4;
const MAX_SPARKS = 28;

interface SwoopSample {
  radius: number;
  angleOffset: number;
  charge: number;
  stretch: number;
}

interface TrailRing {
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly charge: Float32Array;
  head: number;
  count: number;
  sampleAccumSec: number;
}

interface ImpactBurst {
  active: boolean;
  age: number;
  duration: number;
  angle: number;
  isCrit: boolean;
}

interface SparkParticle {
  active: boolean;
  age: number;
  life: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  gold: boolean;
}

interface SatelliteNode {
  root: HTMLSpanElement;
  halo: HTMLSpanElement;
  body: HTMLSpanElement;
  outerRing: SVGGElement | null;
  innerRing: SVGGElement | null;
  trail: TrailRing;
  spinOuterDeg: number;
  spinInnerDeg: number;
  spinBoost: number;
  lastTransform: string;
  lastBodyTransform: string;
  lastHaloOpacity: string;
  lastOuterTransform: string;
  lastInnerTransform: string;
}

function createTrailRing(): TrailRing {
  return {
    x: new Float32Array(TRAIL_LEN),
    y: new Float32Array(TRAIL_LEN),
    charge: new Float32Array(TRAIL_LEN),
    head: 0,
    count: 0,
    sampleAccumSec: 0,
  };
}

function pushTrailPoint(trail: TrailRing, x: number, y: number, charge: number): void {
  trail.x[trail.head] = x;
  trail.y[trail.head] = y;
  trail.charge[trail.head] = charge;
  trail.head = (trail.head + 1) % TRAIL_LEN;
  if (trail.count < TRAIL_LEN) trail.count++;
}

function resetTrail(trail: TrailRing): void {
  trail.head = 0;
  trail.count = 0;
  trail.sampleAccumSec = 0;
}

const swoopScratch: SwoopSample = { radius: R_CRUISE, angleOffset: 0, charge: 0, stretch: 0 };

/**
 * Evaluates the 4-beat orbital cycle for u in [0, 1), where u = 0 is the grazing
 * kiss against the Sphere's rim:
 *   [0.00, 0.24) elastic rebound outward into cruise orbit
 *   [0.24, 0.68) celestial cruise & gradual mana charge
 *   [0.68, 0.81) subtle anticipation pullback & halo ignition
 *   [0.81, 1.00) swift Keplerian perihelion swoop into the Sphere
 */
function evaluateSwoop(u: number): SwoopSample {
  const p = ((u % 1) + 1) % 1;
  let radius: number;
  let charge: number;
  let stretch = 0;

  if (p < 0.24) {
    const t = p / 0.24;
    const easeOut = 1 - Math.pow(1 - t, 2.6);
    radius = R_CONTACT + (R_CRUISE - R_CONTACT) * easeOut;
    charge = Math.max(0, 1 - t * 2.1);
    stretch = -0.05 * Math.sin(t * Math.PI);
  } else if (p < 0.68) {
    const t = (p - 0.24) / 0.44;
    radius = R_CRUISE + Math.sin(t * Math.PI) * 0.008;
    charge = t * 0.42;
  } else if (p < 0.81) {
    const t = (p - 0.68) / 0.13;
    const s = 0.5 - 0.5 * Math.cos(t * Math.PI);
    radius = R_CRUISE + (R_WINDUP - R_CRUISE) * s;
    charge = 0.42 + 0.40 * s;
  } else {
    const t = (p - 0.81) / 0.19;
    const s = t * t * (2.3 - 1.3 * t);
    radius = R_WINDUP + (R_CONTACT - R_WINDUP) * s;
    charge = 0.82 + 0.18 * t;
    stretch = Math.sin(t * Math.PI) * 0.14;
  }

  let angleOffset = 0;
  if (p < 0.28) {
    angleOffset = 0.11 * Math.sin((p / 0.28) * Math.PI);
  } else if (p >= 0.58) {
    angleOffset = -0.14 * Math.sin(((p - 0.58) / 0.42) * Math.PI);
  }

  swoopScratch.radius = radius;
  swoopScratch.angleOffset = angleOffset;
  swoopScratch.charge = charge;
  swoopScratch.stretch = stretch;
  return swoopScratch;
}

function buildSatelliteNode(isTwin: boolean): SatelliteNode {
  const root = document.createElement('span');
  root.className = isTwin
    ? 'sphere-autoclick-satellite is-twin'
    : 'sphere-autoclick-satellite';
  root.hidden = true;
  if (isTwin) {
    root.setAttribute('aria-hidden', 'true');
  } else {
    root.setAttribute('role', 'img');
    root.setAttribute('aria-label', 'Satélite da Gnose: 1 clique automático por segundo');
    root.title = 'Satélite da Gnose · 1 clique por segundo';
  }

  root.innerHTML =
    `<span class="autoclick-halo" aria-hidden="true"></span>` +
    `<span class="autoclick-body">` +
      `<span class="autoclick-orb"></span>` +
      `<svg class="autoclick-gimbal" viewBox="-22 -22 44 44" fill="none" aria-hidden="true" focusable="false">` +
        `<g class="gimbal-outer">` +
          `<circle cx="0" cy="0" r="18.2" stroke="currentColor" stroke-width="1.05" stroke-opacity="0.72" stroke-dasharray="6.5 3"/>` +
          `<path d="M0 -21.2L1.8 -17.4L0 -15.6L-1.8 -17.4ZM0 21.2L1.4 18.2H-1.4ZM-20.2 0H-17.2M20.2 0H17.2" fill="currentColor" stroke="currentColor" stroke-width="0.9"/>` +
        `</g>` +
        `<g class="gimbal-inner">` +
          `<ellipse cx="0" cy="0" rx="15.2" ry="6.4" transform="rotate(-32)" stroke="currentColor" stroke-width="1.1" stroke-opacity="0.88"/>` +
          `<ellipse cx="0" cy="0" rx="15.2" ry="6.4" transform="rotate(52)" stroke="currentColor" stroke-width="0.9" stroke-opacity="0.58"/>` +
        `</g>` +
        `<path class="gimbal-spark" d="M0 -4.8L1.3 -1.3L4.8 0L1.3 1.3L0 4.8L-1.3 1.3L-4.8 0L-1.3 -1.3Z" fill="#fff6d6" fill-opacity="0.85"/>` +
      `</svg>` +
    `</span>`;

  return {
    root,
    halo: root.querySelector<HTMLSpanElement>('.autoclick-halo')!,
    body: root.querySelector<HTMLSpanElement>('.autoclick-body')!,
    outerRing: root.querySelector<SVGGElement>('.gimbal-outer'),
    innerRing: root.querySelector<SVGGElement>('.gimbal-inner'),
    trail: createTrailRing(),
    spinOuterDeg: isTwin ? 90 : 0,
    spinInnerDeg: isTwin ? -45 : 25,
    spinBoost: 0,
    lastTransform: '',
    lastBodyTransform: '',
    lastHaloOpacity: '',
    lastOuterTransform: '',
    lastInnerTransform: '',
  };
}

export class AutoclickSatelliteVisual {
  private readonly wrapper: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly nodes: [SatelliteNode, SatelliteNode];
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  private readonly impacts: ImpactBurst[] = Array.from({ length: MAX_IMPACTS }, () => ({
    active: false,
    age: 0,
    duration: 0.38,
    angle: 0,
    isCrit: false,
  }));
  private readonly sparks: SparkParticle[] = Array.from({ length: MAX_SPARKS }, () => ({
    active: false,
    age: 0,
    life: 0.4,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    size: 2,
    gold: true,
  }));

  private wrapperWidth = 400;
  private wrapperHeight = 400;
  private wrapperObserver?: ResizeObserver;
  private intersectionObserver?: IntersectionObserver;
  private visible = true;
  private destroyed = false;

  private activeRate = 0;
  private targetPhase: number | null = null;
  private smoothPhase = 0;
  private orbitAngle = -Math.PI / 4;
  private twinParity: 0 | 1 = 0;
  private lastLabelRate = -1;
  private rafId?: number;
  private readonly clock = new VisualFrameClock();

  constructor(wrapper: HTMLElement) {
    this.wrapper = wrapper;
    this.wrapperWidth = wrapper.clientWidth || 400;
    this.wrapperHeight = wrapper.clientHeight || 400;

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'sphere-autoclick-fx';
    this.canvas.width = CANVAS_SIZE;
    this.canvas.height = CANVAS_SIZE;
    this.canvas.hidden = true;
    this.canvas.setAttribute('aria-hidden', 'true');
    this.ctx = this.canvas.getContext('2d');
    wrapper.appendChild(this.canvas);

    this.nodes = [buildSatelliteNode(false), buildSatelliteNode(true)];
    wrapper.appendChild(this.nodes[0].root);
    wrapper.appendChild(this.nodes[1].root);

    if (typeof ResizeObserver !== 'undefined') {
      this.wrapperObserver = new ResizeObserver((entries) => {
        const rect = entries[entries.length - 1]?.contentRect;
        if (rect && rect.width > 0 && rect.height > 0) {
          this.wrapperWidth = rect.width;
          this.wrapperHeight = rect.height;
          if (this.reducedMotion.matches && this.targetPhase !== null) {
            this.renderReducedMotion();
          }
        }
      });
      this.wrapperObserver.observe(wrapper);
    }

    if (typeof IntersectionObserver !== 'undefined') {
      this.intersectionObserver = new IntersectionObserver((entries) => {
        this.visible = entries[entries.length - 1]?.isIntersecting ?? true;
        this.syncLoopState();
      });
      this.intersectionObserver.observe(wrapper);
    }

    this.reducedMotion.addEventListener('change', this.handleMotionPrefChange);
    document.addEventListener('visibilitychange', this.syncLoopState);
  }

  public syncState(phase: number | null, rate: number): void {
    const prevNull = this.targetPhase === null;
    this.targetPhase = phase;
    this.activeRate = phase === null ? 0 : Math.max(0.25, rate);

    const primaryHidden = phase === null;
    const twinActive = phase !== null && this.activeRate >= 1.99;

    if (this.nodes[0].root.hidden !== primaryHidden) {
      this.nodes[0].root.hidden = primaryHidden;
      if (primaryHidden) resetTrail(this.nodes[0].trail);
    }
    if (this.nodes[1].root.hidden !== !twinActive) {
      this.nodes[1].root.hidden = !twinActive;
      if (!twinActive) resetTrail(this.nodes[1].trail);
    }
    const hideCanvas = primaryHidden || this.reducedMotion.matches;
    if (this.canvas.hidden !== hideCanvas) {
      this.canvas.hidden = hideCanvas;
      if (hideCanvas && this.ctx) this.ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }

    if (phase !== null) {
      if (prevNull) {
        this.smoothPhase = phase;
      }
      if (this.activeRate !== this.lastLabelRate) {
        this.lastLabelRate = this.activeRate;
        const rateLabel = Number.isInteger(this.activeRate)
          ? String(this.activeRate)
          : this.activeRate.toFixed(1).replace('.', ',');
        const noun = this.activeRate === 1 ? 'clique automático' : 'cliques automáticos';
        const shortNoun = this.activeRate === 1 ? 'clique' : 'cliques';
        this.nodes[0].root.setAttribute(
          'aria-label',
          `Satélite da Gnose: ${rateLabel} ${noun} por segundo`
        );
        this.nodes[0].root.title = `Satélite da Gnose · ${rateLabel} ${shortNoun} por segundo`;
        this.nodes[0].root.classList.toggle('is-accelerated', this.activeRate >= 1.49);
      }
      if (this.reducedMotion.matches) {
        this.renderReducedMotion();
      }
    }

    this.syncLoopState();
  }

  /**
   * Triggers impact visuals on the satellite that just struck the Sphere and returns
   * the viewport client coordinates where the floating Faith text should spawn.
   */
  public triggerImpact(isCrit: boolean, canAnimateDom = true): { clientX: number; clientY: number } | null {
    const twinActive = this.activeRate >= 1.99;
    // When twin satellites alternate, the satellite currently completing its swoop strikes,
    // then parity flips so each orb glides on a full 1-second orbital period.
    const strikingIndex: 0 | 1 = twinActive ? (this.twinParity === 1 ? 0 : 1) : 0;
    if (twinActive) {
      this.twinParity = this.twinParity === 0 ? 1 : 0;
    }
    this.smoothPhase = 0;

    if (!canAnimateDom) return null;

    const strikeAngle = this.reducedMotion.matches
      ? (strikingIndex === 0 ? -Math.PI / 4 : (3 * Math.PI) / 4)
      : this.orbitAngle + (strikingIndex === 1 ? Math.PI : 0);

    const strikingNode = this.nodes[strikingIndex];
    strikingNode.spinBoost = isCrit ? 340 : 210;
    strikingNode.root.classList.toggle('is-crit-flash', isCrit);

    if (!this.reducedMotion.matches) {
      this.spawnImpactBurst(strikeAngle, isCrit);
      const impactDur = isCrit ? 340 : 260;
      strikingNode.body.animate(
        [
          { transform: 'scale(1.26, 0.82)' },
          { transform: 'scale(0.92, 1.08)', offset: 0.42 },
          { transform: 'scale(1, 1)' },
        ],
        { duration: impactDur, easing: effectEasing(impactDur) }
      );
    }

    const rect = this.wrapper.getBoundingClientRect();
    const contactR = this.reducedMotion.matches ? 0.38 : GLOBE_RIM_RATIO + 0.02;
    return {
      clientX: rect.left + rect.width * (0.5 + Math.cos(strikeAngle) * contactR),
      clientY: rect.top + rect.height * (0.5 + Math.sin(strikeAngle) * contactR),
    };
  }

  private spawnImpactBurst(angle: number, isCrit: boolean): void {
    let slot = this.impacts.find((b) => !b.active);
    if (!slot) {
      slot = this.impacts.reduce((oldest, cur) => (cur.age > oldest.age ? cur : oldest), this.impacts[0]);
    }
    slot.active = true;
    slot.age = 0;
    slot.duration = isCrit ? 0.48 : 0.34;
    slot.angle = angle;
    slot.isCrit = isCrit;

    const rimPx = GLOBE_RIM_RATIO * WRAPPER_SCALE;
    const cx = CENTER + Math.cos(angle) * rimPx;
    const cy = CENTER + Math.sin(angle) * rimPx;
    const tangentX = -Math.sin(angle);
    const tangentY = Math.cos(angle);
    const normalX = Math.cos(angle);
    const normalY = Math.sin(angle);

    const sparkCount = isCrit ? 11 : 7;
    for (let i = 0; i < sparkCount; i++) {
      const p = this.sparks.find((s) => !s.active);
      if (!p) break;
      const side = (i % 2 === 0 ? 1 : -1) * (0.35 + Math.random() * 0.85);
      const speedTangential = (55 + Math.random() * 75) * side * (isCrit ? 1.25 : 1);
      const speedOutward = 18 + Math.random() * 48;
      p.active = true;
      p.age = 0;
      p.life = 0.26 + Math.random() * 0.22;
      p.x = cx + normalX * 3;
      p.y = cy + normalY * 3;
      p.vx = tangentX * speedTangential + normalX * speedOutward;
      p.vy = tangentY * speedTangential + normalY * speedOutward;
      p.size = (isCrit ? 2.6 : 2.0) + Math.random() * 1.4;
      p.gold = isCrit || i % 3 !== 0;
    }
  }

  private handleMotionPrefChange = (): void => {
    const hideCanvas = this.targetPhase === null || this.reducedMotion.matches;
    this.canvas.hidden = hideCanvas;
    if (hideCanvas && this.ctx) {
      this.ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }
    if (this.reducedMotion.matches && this.targetPhase !== null) {
      this.renderReducedMotion();
    }
    this.syncLoopState();
  };

  private renderReducedMotion(): void {
    const angles = [-Math.PI / 4, (3 * Math.PI) / 4];
    const count = this.activeRate >= 1.99 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const node = this.nodes[i];
      const dx = Math.cos(angles[i]) * 0.42 * this.wrapperWidth;
      const dy = Math.sin(angles[i]) * 0.42 * this.wrapperHeight;
      const transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
      if (node.lastTransform !== transform) {
        node.lastTransform = transform;
        node.root.style.transform = transform;
      }
      if (node.lastBodyTransform !== '') {
        node.lastBodyTransform = '';
        node.body.style.transform = '';
      }
    }
  }

  private syncLoopState = (): void => {
    const shouldRun =
      !this.destroyed &&
      this.targetPhase !== null &&
      !this.reducedMotion.matches &&
      this.visible &&
      document.visibilityState !== 'hidden';

    if (shouldRun && this.rafId === undefined) {
      this.clock.reset();
      this.rafId = requestAnimationFrame(this.frame);
    } else if (!shouldRun && this.rafId !== undefined) {
      cancelAnimationFrame(this.rafId);
      this.rafId = undefined;
    }
  };

  private frame = (nowMs: number): void => {
    this.rafId = undefined;
    if (this.destroyed || this.targetPhase === null || this.reducedMotion.matches) return;

    const frameSec = this.clock.tick(nowMs);
    if (frameSec !== null) {
      const dt = Math.min(0.05, Math.max(0, frameSec === 0 ? 1 / getVisualFps() : frameSec));
      if (!document.body?.classList.contains('is-campaign-ending')) {
        this.stepSimulation(dt);
        this.drawCanvas(dt);
      }
    }

    this.syncLoopState();
  };

  private stepSimulation(dt: number): void {
    if (this.targetPhase === null) return;

    // Phase-locked progression: smooth continuous advance + gentle circular drift correction.
    this.smoothPhase = (this.smoothPhase + dt * this.activeRate) % 1;
    let phaseErr = this.targetPhase - this.smoothPhase;
    if (phaseErr > 0.5) phaseErr -= 1;
    else if (phaseErr < -0.5) phaseErr += 1;
    this.smoothPhase = (this.smoothPhase + phaseErr * Math.min(1, dt * 8.5) + 1) % 1;

    // Base orbital precession speed scales subtly with Tier rate while staying regal.
    const angularSpeed = (Math.PI / 4.2) * (0.85 + Math.min(1.6, this.activeRate) * 0.22);
    this.orbitAngle = (this.orbitAngle + dt * angularSpeed) % TAU;

    const twinActive = this.activeRate >= 1.99;
    const count = twinActive ? 2 : 1;

    for (let i = 0; i < count; i++) {
      const node = this.nodes[i];
      const u = twinActive
        ? ((this.twinParity * 0.5 + this.smoothPhase * 0.5 + i * 0.5) % 1)
        : this.smoothPhase;

      const sample = evaluateSwoop(u);
      const angle = this.orbitAngle + (i === 1 ? Math.PI : 0) + sample.angleOffset;

      const normX = Math.cos(angle) * sample.radius;
      const normY = Math.sin(angle) * sample.radius;
      const dx = normX * this.wrapperWidth;
      const dy = normY * this.wrapperHeight;

      // Orient stretch subtly toward the Sphere during the dive while keeping the globe crisp.
      const transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0)`;
      if (node.lastTransform !== transform) {
        node.lastTransform = transform;
        node.root.style.transform = transform;
      }

      if (Math.abs(sample.stretch) > 0.004) {
        const diveDeg = ((angle + Math.PI) * 180) / Math.PI;
        const sx = (1 + sample.stretch).toFixed(3);
        const sy = (1 - sample.stretch * 0.65).toFixed(3);
        const bt = `rotate(${diveDeg.toFixed(1)}deg) scale(${sx}, ${sy}) rotate(${(-diveDeg).toFixed(1)}deg)`;
        if (node.lastBodyTransform !== bt) {
          node.lastBodyTransform = bt;
          node.body.style.transform = bt;
        }
      } else if (node.lastBodyTransform !== '') {
        node.lastBodyTransform = '';
        node.body.style.transform = '';
      }

      const haloAlpha = (0.22 + sample.charge * 0.78).toFixed(2);
      if (node.lastHaloOpacity !== haloAlpha) {
        node.lastHaloOpacity = haloAlpha;
        node.halo.style.opacity = haloAlpha;
      }

      // Spin miniature armillary gimbal rings continuously + decay post-impact torque.
      node.spinBoost *= Math.exp(-dt / 0.26);
      node.spinOuterDeg = (node.spinOuterDeg + dt * (48 + sample.charge * 65 + node.spinBoost)) % 360;
      node.spinInnerDeg = (node.spinInnerDeg - dt * (72 + sample.charge * 80 + node.spinBoost * 1.2)) % 360;
      const outerTransform = `rotate(${node.spinOuterDeg.toFixed(1)})`;
      if (node.lastOuterTransform !== outerTransform) {
        node.lastOuterTransform = outerTransform;
        node.outerRing?.setAttribute('transform', outerTransform);
      }
      const innerTransform = `rotate(${node.spinInnerDeg.toFixed(1)})`;
      if (node.lastInnerTransform !== innerTransform) {
        node.lastInnerTransform = innerTransform;
        node.innerRing?.setAttribute('transform', innerTransform);
      }

      // Sample trail points in normalized 520x520 canvas space (~60Hz density so 30 FPS and 60 FPS share identical wake length).
      const nextCanvasX = CENTER + normX * WRAPPER_SCALE;
      const nextCanvasY = CENTER + normY * WRAPPER_SCALE;
      node.trail.sampleAccumSec += dt;
      if (node.trail.sampleAccumSec >= 0.014 || node.trail.count === 0) {
        if (node.trail.sampleAccumSec >= 0.028 && node.trail.count > 0) {
          const prevIdx = (node.trail.head - 1 + TRAIL_LEN) % TRAIL_LEN;
          pushTrailPoint(
            node.trail,
            (node.trail.x[prevIdx] + nextCanvasX) * 0.5,
            (node.trail.y[prevIdx] + nextCanvasY) * 0.5,
            (node.trail.charge[prevIdx] + sample.charge) * 0.5
          );
        }
        node.trail.sampleAccumSec = 0;
        pushTrailPoint(node.trail, nextCanvasX, nextCanvasY, sample.charge);
      }
    }
  }

  private drawCanvas(dt: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const cruiseR = R_CRUISE * WRAPPER_SCALE;
    const twinActive = this.activeRate >= 1.99;

    // 1. Whisper-faint Hermetic astrolabe orbital guide ring & cardinal ticks
    ctx.save();
    ctx.translate(CENTER, CENTER);
    ctx.rotate(this.orbitAngle * 0.22);
    ctx.strokeStyle = 'rgba(222, 220, 205, 0.11)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 7]);
    ctx.beginPath();
    ctx.arc(0, 0, cruiseR, 0, TAU);
    ctx.stroke();

    if (this.activeRate >= 1.49) {
      ctx.strokeStyle = 'rgba(246, 220, 154, 0.09)';
      ctx.setLineDash([2, 9]);
      ctx.beginPath();
      ctx.arc(0, 0, cruiseR - 7, 0, TAU);
      ctx.stroke();
    }

    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(246, 220, 154, 0.18)';
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      ctx.beginPath();
      ctx.moveTo(c * (cruiseR - 4), s * (cruiseR - 4));
      ctx.lineTo(c * (cruiseR + 4), s * (cruiseR + 4));
      ctx.stroke();
    }
    ctx.restore();

    // 2. Tapered luminous comet wake & pre-contact ley filament for each active satellite
    const satCount = twinActive ? 2 : 1;
    for (let s = 0; s < satCount; s++) {
      const trail = this.nodes[s].trail;
      if (trail.count >= 2) {
        const oldest = (trail.head - trail.count + TRAIL_LEN) % TRAIL_LEN;
        for (let i = 1; i < trail.count; i++) {
          const prevIdx = (oldest + i - 1) % TRAIL_LEN;
          const curIdx = (oldest + i) % TRAIL_LEN;
          const frac = i / (trail.count - 1);
          const ch = trail.charge[curIdx];
          const alpha = frac * frac * (0.24 + ch * 0.34);
          ctx.strokeStyle = s === 1
            ? `rgba(228, 232, 245, ${alpha.toFixed(3)})`
            : `rgba(246, 220, 154, ${alpha.toFixed(3)})`;
          ctx.lineWidth = 0.8 + frac * (3.6 + ch * 2.8);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(trail.x[prevIdx], trail.y[prevIdx]);
          ctx.lineTo(trail.x[curIdx], trail.y[curIdx]);
          ctx.stroke();
        }

        // Pre-strike aether filament connecting diving satellite to the Sphere's rim
        const newestIdx = (trail.head - 1 + TRAIL_LEN) % TRAIL_LEN;
        const newestCharge = trail.charge[newestIdx];
        if (newestCharge > 0.72) {
          const sx = trail.x[newestIdx];
          const sy = trail.y[newestIdx];
          const ang = Math.atan2(sy - CENTER, sx - CENTER);
          const rx = CENTER + Math.cos(ang) * (GLOBE_RIM_RATIO * WRAPPER_SCALE);
          const ry = CENTER + Math.sin(ang) * (GLOBE_RIM_RATIO * WRAPPER_SCALE);
          const tetherAlpha = ((newestCharge - 0.72) / 0.28) * 0.55;
          const grad = ctx.createLinearGradient(sx, sy, rx, ry);
          grad.addColorStop(0, `rgba(255, 244, 206, ${tetherAlpha.toFixed(3)})`);
          grad.addColorStop(1, `rgba(246, 220, 154, ${(tetherAlpha * 0.25).toFixed(3)})`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(rx, ry);
          ctx.stroke();
        }
      }
    }

    // 3. Impact crescent shock-arcs & core resonance lance
    const baseRim = GLOBE_RIM_RATIO * WRAPPER_SCALE;
    for (let i = 0; i < MAX_IMPACTS; i++) {
      const imp = this.impacts[i];
      if (!imp.active) continue;
      imp.age += dt;
      if (imp.age >= imp.duration) {
        imp.active = false;
        continue;
      }
      const p = imp.age / imp.duration;
      const fade = Math.pow(1 - p, 1.65);
      const spread = (0.24 + p * 0.58) * (imp.isCrit ? 1.25 : 1);
      const arcR = baseRim + p * (imp.isCrit ? 18 : 12);

      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = imp.isCrit
        ? `rgba(255, 226, 138, ${(fade * 0.92).toFixed(3)})`
        : `rgba(246, 220, 154, ${(fade * 0.78).toFixed(3)})`;
      ctx.lineWidth = (imp.isCrit ? 3.2 : 2.2) * (1 - p * 0.55);
      ctx.beginPath();
      ctx.arc(CENTER, CENTER, arcR, imp.angle - spread, imp.angle + spread);
      ctx.stroke();

      if (imp.isCrit) {
        ctx.strokeStyle = `rgba(255, 250, 228, ${(fade * 0.65).toFixed(3)})`;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(CENTER, CENTER, baseRim + p * 8, imp.angle - spread * 0.7, imp.angle + spread * 0.7);
        ctx.stroke();
      }

      // Brief inward pulse lance into the Sphere's core
      if (p < 0.55) {
        const lanceFade = 1 - p / 0.55;
        const rx = CENTER + Math.cos(imp.angle) * (baseRim + 2);
        const ry = CENTER + Math.sin(imp.angle) * (baseRim + 2);
        const ix = CENTER + Math.cos(imp.angle) * (baseRim * (0.35 + (1 - lanceFade) * 0.25));
        const iy = CENTER + Math.sin(imp.angle) * (baseRim * (0.35 + (1 - lanceFade) * 0.25));
        const grad = ctx.createLinearGradient(rx, ry, ix, iy);
        grad.addColorStop(0, `rgba(255, 246, 214, ${(lanceFade * 0.85).toFixed(3)})`);
        grad.addColorStop(1, 'rgba(246, 220, 154, 0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = imp.isCrit ? 2.8 : 1.9;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(ix, iy);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 4. Tangential diamond stardust sparks
    for (let i = 0; i < MAX_SPARKS; i++) {
      const sp = this.sparks[i];
      if (!sp.active) continue;
      sp.age += dt;
      if (sp.age >= sp.life) {
        sp.active = false;
        continue;
      }
      const drag = Math.exp(-dt * 5.5);
      sp.vx *= drag;
      sp.vy *= drag;
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;

      const fade = 1 - sp.age / sp.life;
      const r = sp.size * (0.45 + fade * 0.65);
      ctx.fillStyle = sp.gold
        ? `rgba(255, 228, 152, ${(fade * 0.9).toFixed(3)})`
        : `rgba(235, 234, 222, ${(fade * 0.8).toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(sp.x, sp.y - r);
      ctx.lineTo(sp.x + r * 0.75, sp.y);
      ctx.lineTo(sp.x, sp.y + r);
      ctx.lineTo(sp.x - r * 0.75, sp.y);
      ctx.closePath();
      ctx.fill();
    }
  }

  public destroy(): void {
    this.destroyed = true;
    if (this.rafId !== undefined) cancelAnimationFrame(this.rafId);
    this.wrapperObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    this.reducedMotion.removeEventListener('change', this.handleMotionPrefChange);
    document.removeEventListener('visibilitychange', this.syncLoopState);
    this.canvas.remove();
    this.nodes[0].root.remove();
    this.nodes[1].root.remove();
  }
}
