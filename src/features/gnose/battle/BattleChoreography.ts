import type { ActiveBossMiracle, BossRift, GnoseBoss } from '../../../types.js';
import { visibleFollowerTiers, type FollowerTier } from '../../followers/followerVisuals.js';
import { FollowersArena } from '../../followers/FollowersArena.js';

export interface BattleCameraTarget {
  phase: 'incarnation' | 'boss' | 'combat';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PathSample {
  x: number;
  y: number;
  s: number;
}

export interface BattleFollowerSnapshot {
  id: number;
  x: number;
  y: number;
  state: 'waiting_in_patio' | 'following_in_line' | 'encircling' | 'returning_to_patio';
  trailS: number;
  stopS: number;
}

export interface BattleFollowerActor {
  id: number;
  queueIndex: number;
  tier: FollowerTier;
  startX: number;
  startY: number;
  x: number;
  y: number;
  trailS: number;
  stopS: number;
  state: 'waiting_in_patio' | 'following_in_line' | 'encircling' | 'returning_to_patio';
  walkCycle: number;
  prayCycle: number;
  facing: 1 | -1;
}

export interface PendingBattleClimax {
  boss: GnoseBoss;
  victory: boolean;
  isRematch: boolean;
  durationSec: number;
  remainingSec: number;
  totalSec: number;
  cultReadiness: number;
}

export const BOSS_SPHERE_CENTER = { x: 1740, y: 854 };
// Concentric with the grand Hermetic engraving band (r = 494..582) on celestial-chart.svg,
// enclosing BOTH the Boss (x = 1415, y = 865) AND the Divine Sphere (x = 1740, y = 854).
export const SACRED_CIRCLE_RADIUS = 535;
export const SPHERE_CIRCLE_RX = SACRED_CIRCLE_RADIUS;
export const SPHERE_CIRCLE_RY = SACRED_CIRCLE_RADIUS;

export const BOSS_DISTANT_SPAWN = { x: 180, y: 854 };
export const BOSS_COMBAT_SPOT = { x: 1415, y: 865 };

export const INCARNATION_OUTBOUND_SPEED = 520;
export const PROCESSION_QUEUE_SPEED = 460;
export const BOSS_DESCENT_SPEED = 220;
export const MAX_PROCESSION_FOLLOWERS = 34;

// Lead time (in seconds) that the "APARAR" rift is visible BEFORE the Boss swings his attack
export const RIFT_TELEGRAPH_BEFORE_ATTACK_SEC = 0.65;
export const PARRY_RECOVERY_SEC = 0.6;
export const CLIMAX_DURATION_SEC = 1.5;

export const INCARNATION_FALLBACK_SPAWN = { x: 490, y: 728 };
export const FOLLOWERS_FALLBACK_BOX = { x: 2024, y: 1030, w: 512, h: 240 };

export function buildPolyline(points: Array<{ x: number; y: number }>): PathSample[] {
  if (points.length === 0) return [];
  const samples: PathSample[] = [{ x: points[0].x, y: points[0].y, s: 0 }];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const prev = samples[samples.length - 1];
    const cur = points[i];
    const seg = Math.hypot(cur.x - prev.x, cur.y - prev.y);
    if (seg < 0.01) continue;
    total += seg;
    samples.push({ x: cur.x, y: cur.y, s: total });
  }
  return samples;
}

export function polylineLength(samples: PathSample[]): number {
  return samples.length > 0 ? samples[samples.length - 1].s : 0;
}

export function samplePolylineAt(
  samples: PathSample[],
  s: number
): { x: number; y: number; dx: number; dy: number } {
  if (samples.length === 0) return { x: 0, y: 0, dx: 1, dy: 0 };
  if (samples.length === 1) return { x: samples[0].x, y: samples[0].y, dx: 1, dy: 0 };
  if (s <= 0) {
    return {
      x: samples[0].x,
      y: samples[0].y,
      dx: samples[1].x - samples[0].x,
      dy: samples[1].y - samples[0].y,
    };
  }
  const last = samples[samples.length - 1];
  if (s >= last.s) {
    const prev = samples[samples.length - 2];
    return {
      x: last.x,
      y: last.y,
      dx: last.x - prev.x,
      dy: last.y - prev.y,
    };
  }
  let lo = 0;
  let hi = samples.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].s <= s) lo = mid;
    else hi = mid;
  }
  const a = samples[lo];
  const b = samples[hi];
  const span = Math.max(1e-6, b.s - a.s);
  const t = (s - a.s) / span;
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    dx: b.x - a.x,
    dy: b.y - a.y,
  };
}

export function bossHpLabel(phase: number, hpPercent: number, passiveVictorySec: number): string {
  const phaseTag = phase === 3 ? 'Fase III' : phase === 2 ? 'Fase II' : 'Fase I';
  // Rounded up so a living Guardian never reads 0%
  const label = `${phaseTag} · ${Math.ceil(hpPercent)}%`;
  return Number.isFinite(passiveVictorySec) ? `${label} · ~${passiveVictorySec}s` : label;
}

// Cards sit on an arc around the Sphere, on the side away from the Guardian (degrees, 0 = right, -90 = up).
// The arc stops short of the Guardian on one end and the Sphere's health plate on the other.
const PARRY_ARC_START_DEG = -105;
const PARRY_ARC_SPAN_DEG = 113;

export function parryCardPosition(
  rift: Pick<BossRift, 'kind' | 'slotIndex' | 'xPercent' | 'yPercent'>,
  sphere: { x: number; y: number },
  elapsedSec: number,
  scale: number
): { x: number; y: number } {
  const slot = rift.slotIndex ?? 0;
  let degrees: number;
  if (rift.kind === 'anubis_scales' || rift.kind === 'hades_chains') {
    degrees = slot === 0 ? -80 : -5;
  } else if (rift.kind === 'odin_raven') {
    degrees = -45;
  } else if (rift.kind === 'chaos_orbit') {
    degrees = [-100, -45, 5][slot] + Math.sin(elapsedSec * 0.55) * 3;
  } else {
    const turn = (Math.atan2(rift.yPercent - 50, rift.xPercent - 50) + Math.PI) / (Math.PI * 2);
    degrees = PARRY_ARC_START_DEG + turn * PARRY_ARC_SPAN_DEG;
  }
  // Cards grow as the camera zooms out, so the arc widens with them
  const radius = 120 + 110 * scale;
  const radians = (degrees * Math.PI) / 180;
  return {
    x: Math.round(sphere.x + Math.cos(radians) * radius),
    y: Math.round(sphere.y + Math.sin(radians) * radius),
  };
}

const TRAIL_HOLD_SEC = 0.35;
const TRAIL_SHRINK_PERCENT_PER_SEC = 40;

export interface DamageTrail {
  value: number;
  holdSec: number;
}

// The pause only re-arms once the trail catches up, so rapid hits cannot freeze it.
export function stepDamageTrail(trail: DamageTrail, currentPercent: number, elapsedSec: number): DamageTrail {
  if (currentPercent >= trail.value) return { value: currentPercent, holdSec: TRAIL_HOLD_SEC };
  if (trail.holdSec > 0) return { value: trail.value, holdSec: Math.max(0, trail.holdSec - elapsedSec) };
  const value = trail.value - TRAIL_SHRINK_PERCENT_PER_SEC * elapsedSec;
  return value <= currentPercent ? { value: currentPercent, holdSec: TRAIL_HOLD_SEC } : { value, holdSec: 0 };
}

export function measureSingleElementBox(
  el: HTMLElement | null,
  worldEl: HTMLElement | null
): { x: number; y: number; w: number; h: number } | null {
  if (!el || !worldEl) return null;

  // 1. Sum offsetLeft / offsetTop up to #dodeca-board-world (immune to pan/zoom transforms)
  let x = 0;
  let y = 0;
  let cur: HTMLElement | null = el;
  let reachedWorld = false;
  while (cur && cur !== document.body) {
    if (cur === worldEl) {
      reachedWorld = true;
      break;
    }
    x += cur.offsetLeft || 0;
    y += cur.offsetTop || 0;
    cur = cur.offsetParent as HTMLElement | null;
  }
  const w = el.offsetWidth || el.clientWidth || 0;
  const h = el.offsetHeight || el.clientHeight || 0;
  if (reachedWorld && w > 20 && h > 20) {
    return { x, y, w, h };
  }

  // 2. Fallback to getBoundingClientRect ratio
  const worldRect = worldEl.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const worldW = worldEl.offsetWidth || 6880;
  if (worldRect.width > 0 && elRect.width > 20 && elRect.height > 20) {
    const zoom = worldRect.width / worldW;
    return {
      x: (elRect.left - worldRect.left) / zoom,
      y: (elRect.top - worldRect.top) / zoom,
      w: el.offsetWidth || elRect.width / zoom,
      h: el.offsetHeight || elRect.height / zoom,
    };
  }

  return null;
}

export function getElementWorldBox(
  elId: string,
  fallback: { x: number; y: number; w: number; h: number },
  fallbackCardId?: string
): { x: number; y: number; w: number; h: number } {
  const worldEl = document.getElementById('dodeca-board-world');
  const primary = measureSingleElementBox(document.getElementById(elId), worldEl);
  if (primary) return primary;

  if (fallbackCardId) {
    const cardBox = measureSingleElementBox(document.getElementById(fallbackCardId), worldEl);
    if (cardBox) {
      return {
        x: cardBox.x + 16,
        y: cardBox.y + 44,
        w: Math.max(fallback.w, cardBox.w - 32),
        h: Math.max(fallback.h, cardBox.h > 80 ? cardBox.h - 56 : fallback.h),
      };
    }
  }

  return fallback;
}

export interface ProcessionRoutesResult {
  patioGatherSpot: { x: number; y: number };
  outboundPath: PathSample[];
  incGuardSpot: { x: number; y: number };
  circleStartS: number;
  processionPath: PathSample[];
  circleLength: number;
}

export function computeProcessionRoutes(
  incStart: { x: number; y: number },
  fBox: { x: number; y: number; w: number; h: number }
): ProcessionRoutesResult {
  const cx = BOSS_SPHERE_CENTER.x;
  const cy = BOSS_SPHERE_CENTER.y;

  // Gathering point inside Pátio dos Fiéis (#followers-walk-canvas), oriented slightly toward the Sphere
  const fCenterX = fBox.x + fBox.w * 0.5;
  const fCenterY = fBox.y + fBox.h * 0.5;
  const toSphereX = cx - fCenterX;
  const toSphereY = cy - fCenterY;
  const toSphereDist = Math.max(1, Math.hypot(toSphereX, toSphereY));
  const gatherSpot = {
    x: fCenterX + (toSphereX / toSphereDist) * Math.min(fBox.w * 0.22, 95),
    y: fBox.y + fBox.h * 0.56 + (toSphereY / toSphereDist) * Math.min(fBox.h * 0.16, 42),
  };

  // 1. Outbound path: Altar da Encarnação -> Pátio dos Fiéis
  //    Uses taut-string exterior tangent skirting around the Divine Sphere (skirtR = 330)
  //    whenever the straight line segment comes within 310px of the Sphere center.
  const segDx = gatherSpot.x - incStart.x;
  const segDy = gatherSpot.y - incStart.y;
  const segLenSq = segDx * segDx + segDy * segDy;
  const projT =
    segLenSq > 1
      ? Math.max(
          0,
          Math.min(1, ((cx - incStart.x) * segDx + (cy - incStart.y) * segDy) / segLenSq)
        )
      : 0;
  const distToSphere = Math.hypot(
    incStart.x + segDx * projT - cx,
    incStart.y + segDy * projT - cy
  );

  const outboundWaypoints: Array<{ x: number; y: number }> = [incStart];
  const skirtR = 330;
  const d0 = Math.hypot(incStart.x - cx, incStart.y - cy);
  const d1 = Math.hypot(gatherSpot.x - cx, gatherSpot.y - cy);

  if (distToSphere < 310 && d0 > 220 && d1 > 220) {
    const a0 = Math.atan2(incStart.y - cy, incStart.x - cx);
    const a1 = Math.atan2(gatherSpot.y - cy, gatherSpot.x - cx);
    let deltaA = Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0));
    // If nearly 180° opposite across the Sphere, prefer skirting south (y > cy)
    if (Math.abs(deltaA) > Math.PI - 0.12) {
      const southSign = Math.cos(a0) >= 0 ? 1 : -1;
      deltaA = southSign * Math.abs(deltaA);
    }
    const dir = deltaA >= 0 ? 1 : -1;
    const a1Unwrapped = a0 + deltaA;
    const alpha0 = Math.acos(Math.min(1, skirtR / Math.max(skirtR, d0)));
    const alpha1 = Math.acos(Math.min(1, skirtR / Math.max(skirtR, d1)));
    const hasTautArc = Math.abs(deltaA) > alpha0 + alpha1;
    const arcStart = hasTautArc ? a0 + dir * alpha0 : a0 + deltaA * 0.35;
    const arcEnd = hasTautArc ? a1Unwrapped - dir * alpha1 : a0 + deltaA * 0.65;
    const arcSteps = 18;
    for (let k = 0; k <= arcSteps; k++) {
      const theta = arcStart + ((arcEnd - arcStart) * k) / arcSteps;
      outboundWaypoints.push({
        x: cx + Math.cos(theta) * skirtR,
        y: cy + Math.sin(theta) * skirtR,
      });
    }
  }
  outboundWaypoints.push(gatherSpot);
  const outboundPath = buildPolyline(outboundWaypoints);

  // 2. Return single-file procession path:
  //    Pátio dos Fiéis -> exterior clockwise C1-tangent curve onto the grand R = 535 circle
  //    -> full 360° clockwise lap around BOTH Boss and Sphere, ending at the Incarnation's circle station.
  const phiG = Math.atan2(gatherSpot.y - cy, gatherSpot.x - cx);
  const distG = Math.hypot(gatherSpot.x - cx, gatherSpot.y - cy);
  const alpha =
    distG > SACRED_CIRCLE_RADIUS + 8
      ? Math.max(0.28, Math.acos(Math.min(1, SACRED_CIRCLE_RADIUS / distG)))
      : 0.38;
  const entryAngle = phiG + alpha;

  const entryPt = {
    x: cx + Math.cos(entryAngle) * SPHERE_CIRCLE_RX,
    y: cy + Math.sin(entryAngle) * SPHERE_CIRCLE_RY,
  };
  const incGuardSpot = { ...entryPt };

  const chordDist = Math.hypot(entryPt.x - gatherSpot.x, entryPt.y - gatherSpot.y);
  const handleLen = Math.min(220, chordDist * 0.45);
  const ctrlPt = {
    x: entryPt.x + Math.sin(entryAngle) * handleLen,
    y: entryPt.y - Math.cos(entryAngle) * handleLen,
  };

  const leadInPts: Array<{ x: number; y: number }> = [];
  const approachSteps = 20;
  for (let k = 0; k <= approachSteps; k++) {
    const t = k / approachSteps;
    const omt = 1 - t;
    leadInPts.push({
      x: omt * omt * gatherSpot.x + 2 * omt * t * ctrlPt.x + t * t * entryPt.x,
      y: omt * omt * gatherSpot.y + 2 * omt * t * ctrlPt.y + t * t * entryPt.y,
    });
  }

  const leadInSamples = buildPolyline(leadInPts);
  const circleStartS = polylineLength(leadInSamples);

  const processionPts: Array<{ x: number; y: number }> = [...leadInPts];
  const circleSteps = 120;
  for (let k = 1; k <= circleSteps; k++) {
    const theta = entryAngle + (k / circleSteps) * Math.PI * 2;
    processionPts.push({
      x: cx + Math.cos(theta) * SPHERE_CIRCLE_RX,
      y: cy + Math.sin(theta) * SPHERE_CIRCLE_RY,
    });
  }

  const processionPath = buildPolyline(processionPts);
  const totalLen = polylineLength(processionPath);
  const circleLength = Math.max(1, totalLen - circleStartS);

  return {
    patioGatherSpot: gatherSpot,
    outboundPath,
    incGuardSpot,
    circleStartS,
    processionPath,
    circleLength,
  };
}

export function syncBattleFollowerCohort(
  currentActors: BattleFollowerActor[],
  totalCount: number,
  initialSpawn: boolean,
  patioGatherSpot: { x: number; y: number },
  circleStartS: number,
  circleLength: number
): { actors: BattleFollowerActor[]; queueSpacing: number } {
  const fBox = getElementWorldBox(
    'followers-walk-canvas',
    FOLLOWERS_FALLBACK_BOX,
    'card-followers'
  );
  const liveArena = FollowersArena.latestInstance;
  const liveWalkers = liveArena?.walkers ?? [];
  const arenaDims = liveArena?.getArenaDimensions() ?? { width: 400, height: 220 };

  const effectiveTotal = Math.max(1, Math.floor(totalCount));
  const repTiers = visibleFollowerTiers(effectiveTotal);
  const desiredCount = Math.min(
    MAX_PROCESSION_FOLLOWERS,
    Math.max(repTiers.length, Math.min(effectiveTotal, 28))
  );

  const sortedTiers: FollowerTier[] = [...repTiers].sort((a, b) => b - a);
  while (sortedTiers.length < desiredCount) {
    sortedTiers.push(0);
  }

  if (!initialSpawn && currentActors.length === desiredCount) {
    for (let i = 0; i < desiredCount; i++) {
      currentActors[i].tier = sortedTiers[i] ?? 0;
    }
    const slotStep = desiredCount > 0 ? circleLength / (desiredCount + 1) : 52;
    return {
      actors: currentActors,
      queueSpacing: desiredCount > 0 ? Math.min(56, slotStep) : 52,
    };
  }

  const rawActors: BattleFollowerActor[] = [];
  for (let i = 0; i < desiredCount; i++) {
    const existing = !initialSpawn ? currentActors[i] : undefined;
    if (existing) {
      existing.tier = sortedTiers[i] ?? existing.tier;
      rawActors.push(existing);
      continue;
    }

    let startX: number;
    let startY: number;
    const liveW = liveWalkers[i];
    if (liveW && arenaDims.width > 0 && arenaDims.height > 0) {
      startX = fBox.x + (liveW.x / arenaDims.width) * fBox.w;
      startY = fBox.y + (liveW.y / arenaDims.height) * fBox.h;
    } else {
      const cols = 7;
      const row = Math.floor(i / cols);
      const col = i % cols;
      startX =
        fBox.x +
        fBox.w * 0.16 +
        col * ((fBox.w * 0.68) / Math.max(1, cols - 1)) +
        ((i * 17) % 11) -
        5;
      startY = fBox.y + fBox.h * 0.34 + (row % 4) * 32 + ((i * 13) % 9) - 4;
    }

    rawActors.push({
      id: i + 1,
      queueIndex: i,
      tier: sortedTiers[i] ?? 0,
      startX,
      startY,
      x: startX,
      y: startY,
      trailS: 0,
      stopS: 0,
      state: 'waiting_in_patio',
      walkCycle: liveW ? liveW.walkCycle : (i * 0.7) % 8,
      prayCycle: liveW ? liveW.prayCycle : (i * 0.35) % 2,
      facing: -1,
    });
  }

  if (initialSpawn) {
    rawActors.sort((a, b) => {
      const da = Math.hypot(a.startX - patioGatherSpot.x, a.startY - patioGatherSpot.y);
      const db = Math.hypot(b.startX - patioGatherSpot.x, b.startY - patioGatherSpot.y);
      return da - db;
    });
    for (let i = 0; i < rawActors.length; i++) {
      rawActors[i].tier = sortedTiers[i] ?? 0;
      rawActors[i].id = i + 1;
    }
  }

  const count = rawActors.length;
  let queueSpacing = 52;
  if (count > 0) {
    const slotStep = circleLength / (count + 1);
    queueSpacing = Math.min(56, slotStep);
    for (let i = 0; i < count; i++) {
      const actor = rawActors[i];
      actor.queueIndex = i;
      actor.stopS = circleStartS + (count - i) * slotStep;
    }
  }

  return { actors: rawActors, queueSpacing };
}

export function resolveMiracleFollowerActor(
  followerActors: BattleFollowerActor[],
  miracle: ActiveBossMiracle | null | undefined
): BattleFollowerActor | null {
  const total = followerActors.length;
  if (!miracle || total === 0) return null;
  let encirclingCount = 0;
  for (let i = 0; i < total; i++) {
    if (followerActors[i].state === 'encircling') encirclingCount++;
  }
  if (encirclingCount === 0) {
    return followerActors[miracle.followerSlot % total] ?? null;
  }
  let target = miracle.followerSlot % encirclingCount;
  for (let i = 0; i < total; i++) {
    const actor = followerActors[i];
    if (actor.state === 'encircling') {
      if (target === 0) return actor;
      target--;
    }
  }
  return followerActors[0] ?? null;
}
