import type { ActiveBossBattle } from '../../../types.js';
import { odinParryCue } from '../../../systems/odinParry.js';
import {
  BLESSING_DURATION,
  FOLLOWER_FRAME_SIZE,
  PRAYER_DURATION,
  RISE_DURATION,
  followerAnimationFrame,
  isFollowerActionMirrored,
  loadFollowerSprites,
  type WalkDirection,
} from '../../followers/followerVisuals.js';
import {
  INCARNATION_CHANNEL_FRAME_SEC,
  INCARNATION_FRAME_SIZE,
  INCARNATION_FRAMES,
  INCARNATION_IDLE_FRAME_SEC,
  incarnationStageIndex,
  selectIncarnationWalkSheet,
} from '../../incarnation/incarnationSprites.js';
import {
  BOSS_SRC_H,
  BOSS_SRC_W,
  loadBossSprites,
  loadIncarnationProcessionSprite,
  type BossRenderFrame,
} from './BossSprites.js';
import {
  BOSS_SPHERE_CENTER,
  parryCardPosition,
  polylineLength,
  resolveMiracleFollowerActor,
  SPHERE_CIRCLE_RX,
  SPHERE_CIRCLE_RY,
  type BattleFollowerActor,
  type PathSample,
  type PendingBattleClimax,
} from './BattleChoreography.js';

const PHONE_MAX_WIDTH = 860;

/** The stage spans thousands of world pixels; phones show it zoomed out, so they draw fewer. */
export function battleCanvasScale(viewportWidth: number, worldWidth = 1, worldHeight = 1): number {
  const phone = viewportWidth <= PHONE_MAX_WIDTH;
  const pixelBudget = phone ? 1_600_000 : 2_000_000;
  return Math.min(phone ? 0.6 : 0.8, Math.sqrt(pixelBudget / worldWidth / worldHeight), 4096 / worldWidth, 4096 / worldHeight);
}

// Pixel speech bubble (3px grid) with a twinkling star matching FollowersArena.drawMiracleSpeechBubble
export function drawFollowerMiracleBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cycleTimer: number
): void {
  const px = 3;
  const bob = Math.sin(cycleTimer * 4) > 0 ? px : 0;
  const blink = Math.sin(cycleTimer * 6) > 0;

  const cols = 11;
  const rows = 8;
  const left = Math.round(x - (cols * px) / 2);
  const top = Math.round(y - 98 - bob);

  // Gold frame, dark plate, tail pointing at the devotee
  ctx.fillStyle = blink ? '#f6dc9a' : '#c99a4e';
  ctx.fillRect(left + px, top, (cols - 2) * px, rows * px);
  ctx.fillRect(left, top + px, cols * px, (rows - 2) * px);
  ctx.fillRect(left + 4 * px, top + rows * px, 3 * px, px);
  ctx.fillRect(left + 5 * px, top + (rows + 1) * px, px, px);
  ctx.fillStyle = '#0f0c0a';
  ctx.fillRect(left + px, top + px, (cols - 2) * px, (rows - 2) * px);
  ctx.fillRect(left + 5 * px, top + rows * px, px, px);

  // Four-point star
  const cx = left + 5 * px;
  const cy = top + 3 * px;
  ctx.fillStyle = '#f6dc9a';
  ctx.fillRect(cx, cy - px, px, 4 * px);
  ctx.fillRect(cx - px, cy, 3 * px, 2 * px);
  if (blink) {
    ctx.fillRect(cx - 2 * px, cy + px / 2, px, px);
    ctx.fillRect(cx + 2 * px, cy + px / 2, px, px);
  }
}

export interface DrawOrderEntry {
  kind: 0 | 1 | 2;
  index: number;
  y: number;
}

export interface BattleWorldRenderContext {
  ctx: CanvasRenderingContext2D;
  worldCanvasScale: number;
  stageWidth: number;
  stageHeight: number;
  stageOriginX: number;
  stageOriginY: number;
  battle: ActiveBossBattle | null;
  climax: PendingBattleClimax | null;
  bossId: string;
  phase: 1 | 2 | 3;
  bossFrame: BossRenderFrame;
  bossState: 'awaiting_ritual' | 'walking' | 'attacking' | 'idle';
  bossY: number;
  bossHitFlashSec: number;
  incarnationStage: number;
  incX: number;
  incY: number;
  incFacing: 1 | -1;
  incWalkDir?: WalkDirection;
  incState: 'walking_to_patio' | 'gathering_at_patio' | 'leading_procession' | 'guarding' | 'leading_return' | 'returning_to_altar';
  incWalkCycle: number;
  incAnimTimeSec?: number;
  incCallRingProgress: number;
  incGuardSpot: { x: number; y: number };
  returnPath: PathSample[];
  returnS: number;
  followerActors: BattleFollowerActor[];
  spherePulseAlpha: number;
  phaseShockwaveAlpha: number;
  miracleBeam: { fromX: number; fromY: number; alpha: number } | null;
  drawOrderPool: DrawOrderEntry[];
  promptScale?: number;
  smoothCombatSec?: number;
  odinRemainingOverride?: number;
}

function pushDrawOrder(
  pool: DrawOrderEntry[],
  count: number,
  kind: 0 | 1 | 2,
  index: number,
  y: number
): number {
  let slot = pool[count];
  if (!slot) {
    slot = { kind, index, y };
    pool[count] = slot;
  } else {
    slot.kind = kind;
    slot.index = index;
    slot.y = y;
  }
  return count + 1;
}

export function renderBattleWorldScene(rc: BattleWorldRenderContext): void {
  const {
    ctx,
    worldCanvasScale,
    stageWidth,
    stageHeight,
    stageOriginX,
    stageOriginY,
    battle,
    climax,
    bossId,
    phase,
    bossFrame,
    bossState,
    bossY,
    bossHitFlashSec,
    incarnationStage,
    incX,
    incY,
    incFacing,
    incState,
    incWalkCycle,
    incCallRingProgress,
    incGuardSpot,
    returnPath,
    returnS,
    followerActors,
    spherePulseAlpha,
    phaseShockwaveAlpha,
    miracleBeam,
    drawOrderPool,
  } = rc;

  ctx.setTransform(worldCanvasScale, 0, 0, worldCanvasScale, 0, 0);
  ctx.clearRect(0, 0, stageWidth, stageHeight);
  ctx.imageSmoothingEnabled = false;

  const sphereLocalX = BOSS_SPHERE_CENTER.x - stageOriginX;
  const sphereLocalY = BOSS_SPHERE_CENTER.y - stageOriginY;

  // 1. Grand Sacred Protective Circle etched on the cathedral floor around BOTH Boss and Divine Sphere
  //    Intensifies visually in Phase II (gold/amber) and Phase III (crimson/solar fury)
  ctx.save();
  ctx.strokeStyle =
    phase >= 3
      ? 'rgba(232, 93, 93, 0.82)'
      : phase === 2
        ? 'rgba(246, 205, 110, 0.68)'
        : 'rgba(201, 154, 78, 0.42)';
  ctx.lineWidth = phase >= 3 ? 3 : phase === 2 ? 2.5 : 2;
  ctx.setLineDash([12, 9]);
  ctx.beginPath();
  ctx.ellipse(sphereLocalX, sphereLocalY, SPHERE_CIRCLE_RX, SPHERE_CIRCLE_RY, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle =
    phase >= 3
      ? 'rgba(246, 220, 154, 0.58)'
      : phase === 2
        ? 'rgba(224, 138, 82, 0.42)'
        : 'rgba(169, 155, 224, 0.24)';
  ctx.lineWidth = phase >= 2 ? 2 : 1.5;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.ellipse(
    sphereLocalX,
    sphereLocalY,
    SPHERE_CIRCLE_RX + 28,
    SPHERE_CIRCLE_RY + 28,
    0,
    0,
    Math.PI * 2
  );
  ctx.stroke();
  ctx.restore();

  // 2b. Signature Guardian Parry Canvas Overlays (connected directly to live parry card positions)
  const promptScale = rc.promptScale ?? 1;
  const smoothCombatSec = rc.smoothCombatSec ?? battle?.elapsedCombatSec ?? 0;
  const spherePoint = { x: sphereLocalX, y: sphereLocalY };

  if (battle && battle.activeRifts.length > 0) {
    // Anúbis: Golden Balance of Maat suspending both Scale Pans above the Sphere
    const scaleRifts = battle.activeRifts.filter((r) => r.kind === 'anubis_scales');
    if (scaleRifts.length > 0) {
      const leftPos = parryCardPosition(
        { kind: 'anubis_scales', slotIndex: 0, xPercent: 28, yPercent: 32 },
        spherePoint,
        smoothCombatSec,
        promptScale
      );
      const rightPos = parryCardPosition(
        { kind: 'anubis_scales', slotIndex: 1, xPercent: 72, yPercent: 32 },
        spherePoint,
        smoothCombatSec,
        promptScale
      );
      const beamY = Math.min(leftPos.y, rightPos.y) - Math.round(58 * promptScale);
      const settled = scaleRifts.some((r) => r.scaleHigherSelected);
      ctx.save();
      ctx.strokeStyle = settled ? 'rgba(74, 222, 128, 0.78)' : 'rgba(246, 220, 154, 0.9)';
      ctx.lineWidth = 3;
      // Central pillar from Sphere crown to fulcrum
      ctx.beginPath();
      ctx.moveTo(sphereLocalX, sphereLocalY - 110);
      ctx.lineTo(sphereLocalX, beamY);
      // Crossbar
      ctx.moveTo(leftPos.x, beamY);
      ctx.lineTo(rightPos.x, beamY);
      ctx.stroke();

      // Suspension chains to each pan
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(leftPos.x, beamY);
      ctx.lineTo(leftPos.x, leftPos.y);
      ctx.moveTo(rightPos.x, beamY);
      ctx.lineTo(rightPos.x, rightPos.y);
      ctx.stroke();

      // Fulcrum diamond
      ctx.setLineDash([]);
      ctx.fillStyle = settled ? '#4ade80' : '#fff0bb';
      ctx.beginPath();
      ctx.moveTo(sphereLocalX, beamY - 9);
      ctx.lineTo(sphereLocalX + 9, beamY);
      ctx.lineTo(sphereLocalX, beamY + 9);
      ctx.lineTo(sphereLocalX - 9, beamY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Hades: Crimson-Iron Shackle Ring outside the Sphere + Taut Chains + Sequence Guide (1º → 2º)
    const chainRifts = battle.activeRifts.filter((r) => r.kind === 'hades_chains');
    if (chainRifts.length > 0) {
      ctx.save();
      // Shackle rings outside #divine-sphere-btn so the Sphere never hides them
      ctx.strokeStyle = 'rgba(224, 85, 85, 0.88)';
      ctx.lineWidth = 3.5;
      ctx.setLineDash([10, 6]);
      ctx.beginPath();
      ctx.arc(sphereLocalX, sphereLocalY, 150, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(125, 41, 27, 0.82)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(sphereLocalX, sphereLocalY, 164, 0, Math.PI * 2);
      ctx.stroke();

      // Sort by chainOrder so index 0 is the active unlocked chain
      const ordered = [...chainRifts].sort((a, b) => (a.chainOrder ?? 0) - (b.chainOrder ?? 0));
      const positions = ordered.map((r) =>
        parryCardPosition(r, spherePoint, smoothCombatSec, promptScale)
      );

      // Taut iron-crimson chain from Sphere perimeter to every unbroken link
      for (let i = 0; i < positions.length; i++) {
        const p = positions[i];
        const angle = Math.atan2(p.y - sphereLocalY, p.x - sphereLocalX);
        const sx = sphereLocalX + Math.cos(angle) * 148;
        const sy = sphereLocalY + Math.sin(angle) * 148;
        ctx.strokeStyle = i === 0 ? 'rgba(251, 191, 36, 0.95)' : 'rgba(224, 85, 85, 0.72)';
        ctx.lineWidth = i === 0 ? 4 : 3;
        ctx.setLineDash(i === 0 ? [8, 4] : [5, 6]);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }

      // Directional sequence sightline from current unlocked link (1º) to next link (2º)
      if (positions.length >= 2) {
        ctx.strokeStyle = 'rgba(246, 220, 154, 0.78)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(positions[0].x, positions[0].y);
        ctx.lineTo(positions[1].x, positions[1].y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Odin: Runic Trajectory & Contracting Emerald/Amber/Crimson Halo around the Sphere
    const odinRift = battle.activeRifts.find((r) => r.kind === 'odin_raven');
    if (odinRift) {
      const cue = odinParryCue({
        remainingSec: rc.odinRemainingOverride ?? odinRift.remainingSec,
        maxSec: odinRift.maxSec,
      });
      const color = cue.green
        ? 'rgba(74, 222, 128, 0.92)'
        : cue.readySoon
          ? 'rgba(251, 191, 36, 0.88)'
          : 'rgba(239, 68, 68, 0.78)';
      const shrinkRatio = Math.max(0, Math.min(1, (cue.diameter - 64) / 94));
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = cue.green ? 4.5 : 3;
      ctx.setLineDash(cue.green ? [] : [9, 6]);
      ctx.beginPath();
      ctx.arc(sphereLocalX, sphereLocalY, 146 + shrinkRatio * 54, 0, Math.PI * 2);
      ctx.stroke();

      // Sightline from Odin toward the Sphere
      ctx.lineWidth = 2.5;
      ctx.setLineDash([7, 7]);
      ctx.beginPath();
      ctx.moveTo(bossFrame.lx + 36, bossFrame.ly - 92);
      ctx.lineTo(sphereLocalX - 146, sphereLocalY);
      ctx.stroke();
      ctx.restore();
    }

    // Caos Primordial: Contracting Astral-Violet Void Vortex & Orbital Seal Chords
    const chaosRifts = battle.activeRifts.filter((r) => r.kind === 'chaos_orbit');
    if (chaosRifts.length > 0) {
      const ratio = Math.max(
        0,
        Math.min(1, chaosRifts[0].remainingSec / Math.max(0.1, chaosRifts[0].maxSec))
      );
      const pts = chaosRifts.map((r) =>
        parryCardPosition(r, spherePoint, smoothCombatSec, promptScale)
      );
      ctx.save();
      // Contracting void ring around the Sphere
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.88)';
      ctx.lineWidth = 3.5;
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.arc(sphereLocalX, sphereLocalY, 142 + ratio * 48, 0, Math.PI * 2);
      ctx.stroke();

      // Radial collapse beams to Sphere
      ctx.strokeStyle = 'rgba(216, 180, 254, 0.72)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 5]);
      for (const p of pts) {
        const ang = Math.atan2(p.y - sphereLocalY, p.x - sphereLocalX);
        ctx.beginPath();
        ctx.moveTo(sphereLocalX + Math.cos(ang) * 142, sphereLocalY + Math.sin(ang) * 142);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }

      // Eldritch chords linking remaining seals
      if (pts.length >= 2) {
        ctx.strokeStyle = 'rgba(192, 132, 252, 0.55)';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        if (pts.length === 3) ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
    }

    // Demiurgo: Split Lunar (Left) & Solar (Right) Eclipse Halo + Staff Conduit
    if (battle.activeRifts.some((r) => r.kind === 'demiurge_ritual')) {
      const pulse = 0.5 + 0.5 * Math.sin(smoothCombatSec * 4.8);
      const staffX = bossFrame.drawLeft + bossFrame.drawW * 0.72;
      const staffY = bossFrame.drawTop + bossFrame.drawH * 0.14;
      const orbX = bossFrame.drawLeft + bossFrame.drawW * 0.74;
      const orbY = bossFrame.drawTop + bossFrame.drawH * 0.48;
      ctx.save();
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.84)';
      ctx.beginPath();
      ctx.arc(sphereLocalX, sphereLocalY, 156, Math.PI * 0.56, Math.PI * 1.44);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(245, 158, 11, 0.86)';
      ctx.beginPath();
      ctx.arc(sphereLocalX, sphereLocalY, 156, -Math.PI * 0.44, Math.PI * 0.44);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(74, 222, 128, 0.95)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(sphereLocalX, sphereLocalY, 156, -Math.PI * 0.56, -Math.PI * 0.44);
      ctx.stroke();

      // Astral aura around Demiurge's raised Sun/Moon staff and chained orb
      ctx.strokeStyle = `rgba(246, 220, 154, ${(0.45 + 0.3 * pulse).toFixed(2)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(staffX, staffY, 22 + pulse * 6, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(192, 132, 252, ${(0.4 + 0.25 * pulse).toFixed(2)})`;
      ctx.setLineDash([7, 6]);
      ctx.beginPath();
      ctx.moveTo(orbX, orbY);
      ctx.quadraticCurveTo(
        (orbX + sphereLocalX) * 0.5,
        Math.min(orbY, sphereLocalY) - 64,
        sphereLocalX - 152,
        sphereLocalY
      );
      ctx.stroke();
      ctx.restore();
    }
  }

  // 2c. Incarnation Call Wave inside the Pátio dos Fiéis (when summoning the queue)
  if (incCallRingProgress > 0) {
    const incLocalX = incX - stageOriginX;
    const incLocalY = incY - stageOriginY - 40;
    const radius = 24 + incCallRingProgress * 280;
    const alpha = Math.max(0, (1 - incCallRingProgress) * 0.72);
    ctx.save();
    ctx.strokeStyle = `rgba(246, 220, 154, ${alpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(incLocalX, incLocalY, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 3. Impact Shockwave on the Sphere when the Boss strikes, plus Phase II / III Shockwave
  if (spherePulseAlpha > 0) {
    ctx.save();
    const radius = 140 + (1 - spherePulseAlpha) * 110;
    ctx.strokeStyle = `rgba(224, 138, 82, ${spherePulseAlpha * 0.75})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(sphereLocalX, sphereLocalY, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (phaseShockwaveAlpha > 0) {
    ctx.save();
    const radius = 90 + (1 - phaseShockwaveAlpha) * 440;
    ctx.strokeStyle =
      phase >= 3
        ? `rgba(232, 93, 93, ${phaseShockwaveAlpha * 0.85})`
        : `rgba(246, 205, 110, ${phaseShockwaveAlpha * 0.85})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(bossFrame.lx, bossFrame.ly - 70, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 3b. Miracle Healing Beam (Faithful -> Sphere)
  if (miracleBeam && miracleBeam.alpha > 0) {
    ctx.save();
    ctx.strokeStyle = `rgba(246, 220, 154, ${miracleBeam.alpha})`;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(miracleBeam.fromX, miracleBeam.fromY);
    ctx.lineTo(sphereLocalX, sphereLocalY);
    ctx.stroke();
    ctx.restore();
  }

  // 4. Depth-sorted rendering of Followers, Incarnation, and Boss (zero per-frame closures)
  const miracleActor = resolveMiracleFollowerActor(followerActors, battle?.activeMiracle);
  const followerSheets = loadFollowerSprites();
  const incStageIdx = incarnationStageIndex(incarnationStage);
  const incSprites = loadIncarnationProcessionSprite(incStageIdx);

  let orderCount = 0;
  for (let i = 0; i < followerActors.length; i++) {
    orderCount = pushDrawOrder(drawOrderPool, orderCount, 0, i, followerActors[i].y);
  }
  orderCount = pushDrawOrder(drawOrderPool, orderCount, 1, 0, incY);
  if ((bossState !== 'awaiting_ritual' || bossId === 'boss_demiurge') && !(climax?.victory && climax.remainingSec <= 0)) {
    orderCount = pushDrawOrder(drawOrderPool, orderCount, 2, 0, bossY);
  }
  drawOrderPool.length = orderCount;
  drawOrderPool.sort((a, b) => a.y - b.y);

  for (let i = 0; i < orderCount; i++) {
    const entry = drawOrderPool[i];
    if (entry.kind === 0) {
      const f = followerActors[entry.index];
      const isMiracleBearer = miracleActor?.id === f.id;
      const lx = Math.round(f.x - stageOriginX);
      const ly = Math.round(f.y - stageOriginY);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(lx - 12, ly - 2, 24, 4);

      if (isMiracleBearer) {
        ctx.save();
        ctx.fillStyle = 'rgba(246, 220, 154, 0.32)';
        ctx.beginPath();
        ctx.ellipse(lx, ly - 2, 28, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f6dc9a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(lx, ly - 38, 42, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      let resolved: { action: ReturnType<typeof followerAnimationFrame>['action']; frame: number };
      if (f.riseTimerSec > 0) {
        resolved = followerAnimationFrame(
          'rise',
          f.walkCycle,
          Math.max(0, RISE_DURATION - f.riseTimerSec),
          false,
          f.idleCycle,
          f.walkDir
        );
      } else if (f.state === 'encircling') {
        if (f.blessingTimerSec > 0) {
          resolved = followerAnimationFrame(
            'pray',
            f.walkCycle,
            PRAYER_DURATION + Math.max(0, BLESSING_DURATION - f.blessingTimerSec),
            false,
            f.idleCycle,
            f.walkDir
          );
        } else if (climax?.victory) {
          const victorySec = Math.max(0, climax.totalSec - climax.remainingSec);
          resolved = followerAnimationFrame(
            'pray',
            f.walkCycle,
            PRAYER_DURATION + Math.min(BLESSING_DURATION - 0.01, victorySec * 0.8),
            false,
            f.idleCycle,
            f.walkDir
          );
        } else {
          resolved = followerAnimationFrame('pray', f.walkCycle, f.prayCycle, true, f.idleCycle, f.walkDir);
        }
      } else if (f.state === 'following_in_line' || f.state === 'returning_to_patio') {
        resolved = followerAnimationFrame('walk', f.walkCycle, 0, false, f.idleCycle, f.walkDir);
      } else {
        resolved = followerAnimationFrame('idle', f.walkCycle, 0, false, f.idleCycle, f.walkDir);
      }

      const tierSheets = followerSheets[f.tier];
      let sheet = tierSheets?.[resolved.action];
      let drawAction = resolved.action;
      let drawFrame = resolved.frame;
      if (!sheet || !sheet.complete || sheet.naturalWidth === 0) {
        sheet = tierSheets?.andar;
        drawAction = 'andar';
        drawFrame = 0;
      }
      if (sheet && sheet.complete && sheet.naturalWidth > 0) {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.scale(isFollowerActionMirrored(drawAction) ? f.facing : 1, 1);
        ctx.drawImage(
          sheet,
          drawFrame * FOLLOWER_FRAME_SIZE,
          0,
          FOLLOWER_FRAME_SIZE,
          FOLLOWER_FRAME_SIZE,
          -40,
          -74,
          80,
          80
        );
        ctx.restore();
      }

      if (isMiracleBearer) {
        drawFollowerMiracleBubble(ctx, lx, ly, f.prayCycle);
      }
    } else if (entry.kind === 1) {
      const lx = Math.round(incX - stageOriginX);
      const ly = Math.round(incY - stageOriginY);

      ctx.fillStyle = 'rgba(246, 220, 154, 0.24)';
      ctx.beginPath();
      ctx.ellipse(lx, ly - 2, 34, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      if (incState === 'guarding') {
        ctx.save();
        ctx.strokeStyle = 'rgba(246, 220, 154, 0.45)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(lx, ly - 64);
        ctx.lineTo(sphereLocalX, sphereLocalY);
        ctx.stroke();
        ctx.restore();
      }

      if (incSprites) {
        const isWalking =
          incState === 'walking_to_patio' ||
          incState === 'returning_to_altar' ||
          (incState === 'leading_return' && returnS < polylineLength(returnPath)) ||
          (incState === 'leading_procession' &&
            Math.hypot(incX - incGuardSpot.x, incY - incGuardSpot.y) > 4);
        const ready = (img: HTMLImageElement) => img.complete && img.naturalWidth > 0;
        let sheet: HTMLImageElement;
        let frame = 0;
        let mirror = false;

        if (isWalking) {
          const picked = selectIncarnationWalkSheet(incSprites, rc.incWalkDir ?? 'side');
          sheet = picked.sheet;
          mirror = picked.mirror;
          frame = sheet !== incSprites.still ? Math.floor(Math.max(0, incWalkCycle)) % INCARNATION_FRAMES : 0;
        } else {
          const animSec = rc.incAnimTimeSec ?? 0;
          const isChanneling =
            incState === 'gathering_at_patio' || incState === 'guarding' || Boolean(climax?.victory);
          if (isChanneling && ready(incSprites.channel)) {
            sheet = incSprites.channel;
            frame = Math.floor(Math.max(0, animSec) / INCARNATION_CHANNEL_FRAME_SEC) % INCARNATION_FRAMES;
          } else if (ready(incSprites.idle)) {
            sheet = incSprites.idle;
            frame = Math.floor(Math.max(0, animSec) / INCARNATION_IDLE_FRAME_SEC) % INCARNATION_FRAMES;
          } else {
            sheet = incSprites.still;
            frame = 0;
          }
        }

        if (ready(sheet)) {
          ctx.save();
          ctx.translate(lx, ly);
          ctx.scale(mirror ? incFacing : 1, 1);
          ctx.drawImage(
            sheet,
            frame * INCARNATION_FRAME_SIZE,
            0,
            INCARNATION_FRAME_SIZE,
            INCARNATION_FRAME_SIZE,
            -64,
            -128,
            128,
            128
          );
          ctx.restore();
        }
      }

      if (incState !== 'guarding') {
        const caption =
          incState === 'leading_return'
            ? '\u2726 DE VOLTA AO PÁTIO \u2726'
            : incState === 'returning_to_altar'
              ? '\u2726 RETORNANDO AO ALTAR \u2726'
              : incState === 'walking_to_patio'
                ? '\u2726 BUSCANDO OS FIÉIS \u2726'
                : incState === 'gathering_at_patio'
                  ? '\u2726 CONVOCANDO A FILA \u2726'
                  : '\u2726 FORMANDO A RODA SAGRADA \u2726';
        ctx.save();
        ctx.font = '700 13px VT323, monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f6dc9a';
        ctx.fillText(caption, lx, ly - 134);
        ctx.restore();
      }
    } else {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.beginPath();
      ctx.ellipse(bossFrame.lx, bossFrame.ly + 14, 82, 22, 0, 0, Math.PI * 2);
      ctx.fill();

      if (bossFrame.sheet) {
        ctx.save();
        let additiveBoostAlpha = 0;
        if (climax?.victory) {
          const isDefeatAnimation = bossFrame.sheet === loadBossSprites(bossId)?.defeat;
          if (isDefeatAnimation) {
            // Preserve the generated artwork, dissolving only the last tenth of the sequence.
            ctx.globalAlpha = Math.min(1, Math.max(0, climax.remainingSec / (climax.totalSec * 0.1)));
          } else {
            // A failed or not-yet-loaded sheet keeps the existing victory fade as fallback.
            const fade = Math.max(0, climax.remainingSec / climax.totalSec);
            ctx.globalAlpha = fade;
            additiveBoostAlpha = fade * 0.75;
          }
        } else if (bossHitFlashSec > 0) {
          additiveBoostAlpha = 0.55;
        }
        ctx.drawImage(
          bossFrame.sheet,
          bossFrame.frame * BOSS_SRC_W,
          0,
          BOSS_SRC_W,
          BOSS_SRC_H,
          bossFrame.drawLeft,
          bossFrame.drawTop,
          bossFrame.drawW,
          bossFrame.drawH
        );
        if (additiveBoostAlpha > 0) {
          // Hardware-accelerated additive pass brightens only opaque sprite pixels without a full-canvas software filter
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = additiveBoostAlpha;
          ctx.drawImage(
            bossFrame.sheet,
            bossFrame.frame * BOSS_SRC_W,
            0,
            BOSS_SRC_W,
            BOSS_SRC_H,
            bossFrame.drawLeft,
            bossFrame.drawTop,
            bossFrame.drawW,
            bossFrame.drawH
          );
        }
        ctx.restore();
      }
    }
  }

  // 5. ~1.5s Climax Overlay on the World Stage (Victory Dissolution Beams or Defeat Sphere Fracture)
  if (climax && climax.remainingSec > 0) {
    const progress = 1 - climax.remainingSec / Math.max(0.1, climax.totalSec);
    ctx.save();
    if (climax.victory) {
      ctx.fillStyle = '#fff3c4';
      ctx.font = '700 32px VT323, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('VITÓRIA', sphereLocalX, sphereLocalY - 240 - progress * 20);
      ctx.globalAlpha = Math.max(0, 1 - progress * 3);
      ctx.strokeStyle = 'rgba(255, 240, 187, 0.72)';
      ctx.lineWidth = 2.5;
      for (const f of followerActors) {
        const lx = Math.round(f.x - stageOriginX);
        const ly = Math.round(f.y - stageOriginY - 40);
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(bossFrame.lx, bossFrame.ly - 84);
        ctx.stroke();
      }
      const incLx = Math.round(incX - stageOriginX);
      const incLy = Math.round(incY - stageOriginY - 64);
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(incLx, incLy);
      ctx.lineTo(bossFrame.lx, bossFrame.ly - 84);
      ctx.stroke();

      ctx.strokeStyle = '#fff3c4';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(bossFrame.lx, bossFrame.ly - 84, 30 + progress * 160, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(232, 82, 82, 0.9)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(sphereLocalX, sphereLocalY, 90 + progress * 140, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(sphereLocalX - 95, sphereLocalY - 80);
      ctx.lineTo(sphereLocalX - 18, sphereLocalY - 12);
      ctx.lineTo(sphereLocalX + 24, sphereLocalY + 18);
      ctx.lineTo(sphereLocalX + 98, sphereLocalY + 86);
      ctx.moveTo(sphereLocalX + 82, sphereLocalY - 76);
      ctx.lineTo(sphereLocalX + 10, sphereLocalY - 6);
      ctx.lineTo(sphereLocalX - 88, sphereLocalY + 78);
      ctx.stroke();
    }
    ctx.restore();
  }
}
