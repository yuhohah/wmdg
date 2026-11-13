import type { ActiveBossBattle } from '../../../types.js';
import {
  FOLLOWER_FRAME_SIZE,
  followerAnimationFrame,
  loadFollowerSprites,
} from '../../followers/followerVisuals.js';
import { INCARNATION_FRAME_SIZE, incarnationStageIndex } from '../../incarnation/incarnationSprites.js';
import {
  BOSS_SRC_H,
  BOSS_SRC_W,
  loadBossSprites,
  loadIncarnationProcessionSprite,
  type BossRenderFrame,
} from './BossSprites.js';
import {
  BOSS_SPHERE_CENTER,
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
  incState: 'walking_to_patio' | 'gathering_at_patio' | 'leading_procession' | 'guarding' | 'leading_return' | 'returning_to_altar';
  incWalkCycle: number;
  incCallRingProgress: number;
  incGuardSpot: { x: number; y: number };
  returnPath: PathSample[];
  returnS: number;
  followerActors: BattleFollowerActor[];
  spherePulseAlpha: number;
  phaseShockwaveAlpha: number;
  miracleBeam: { fromX: number; fromY: number; alpha: number } | null;
  drawOrderPool: DrawOrderEntry[];
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

  // 2b. Special Attack 2 Canvas Overlays (Hades Chains & Anubis Balance Beam)
  if (battle && battle.activeRifts.some((r) => r.kind === 'hades_chains')) {
    ctx.save();
    ctx.strokeStyle = 'rgba(220, 62, 62, 0.85)';
    ctx.lineWidth = 3.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(sphereLocalX - 120, sphereLocalY - 75);
    ctx.lineTo(sphereLocalX + 120, sphereLocalY + 75);
    ctx.moveTo(sphereLocalX - 120, sphereLocalY + 75);
    ctx.lineTo(sphereLocalX + 120, sphereLocalY - 75);
    ctx.stroke();
    ctx.restore();
  }
  if (battle && battle.activeRifts.some((r) => r.kind === 'anubis_scales')) {
    ctx.save();
    ctx.strokeStyle = 'rgba(246, 220, 154, 0.72)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(sphereLocalX - 185, sphereLocalY - 10);
    ctx.lineTo(sphereLocalX + 185, sphereLocalY - 10);
    ctx.stroke();
    ctx.restore();
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
  if (bossState !== 'awaiting_ritual' && !(climax?.victory && climax.remainingSec <= 0)) {
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

      const animState =
        f.state === 'encircling'
          ? 'pray'
          : f.state === 'following_in_line' || f.state === 'returning_to_patio'
            ? 'walk'
            : 'idle';
      const { action, frame } = followerAnimationFrame(animState, f.walkCycle, f.prayCycle, false);
      const sheet = followerSheets[f.tier]?.[action];
      if (sheet && sheet.complete && sheet.naturalWidth > 0) {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.scale(f.facing, 1);
        ctx.drawImage(
          sheet,
          frame * FOLLOWER_FRAME_SIZE,
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
        const sheet =
          isWalking && incSprites.walk.complete && incSprites.walk.naturalWidth > 0
            ? incSprites.walk
            : incSprites.still;
        const frame = sheet === incSprites.walk ? Math.floor(incWalkCycle) % 8 : 0;
        if (sheet.complete && sheet.naturalWidth > 0) {
          ctx.save();
          ctx.translate(lx, ly);
          ctx.scale(incFacing, 1);
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
