import type { GameStateManager } from '../core/GameState.js';
import { formatNumber } from './calculations.js';
import { formatFixed } from './numberFormat.js';

const MIN_OFFLINE_NOTICE_SEC = 60;

export function buildOfflineNotice(
  elapsedSec: number,
  { faithGained, fervorGained, relicGained }: { faithGained: number; fervorGained: number; relicGained: number }
): { title: string; desc: string } | undefined {
  if (elapsedSec < MIN_OFFLINE_NOTICE_SEC) return undefined;
  const parts: string[] = [];
  if (faithGained > 0) parts.push(`+${formatNumber(faithGained)} Fé`);
  if (fervorGained > 0) parts.push(`+${formatNumber(fervorGained)} Fervor`);
  if (relicGained > 0) parts.push(`+${formatNumber(relicGained)} Fragmentos`);
  if (parts.length === 0) return undefined;
  const timeStr = elapsedSec >= 3600 ? `${formatFixed(elapsedSec / 3600, 1)}h` : `${Math.floor(elapsedSec / 60)}m`;
  return {
    title: `VIGÍLIA SAGRADA (${timeStr})`,
    desc: `Durante sua ausência, o culto continuou ardendo: ${parts.join(', ')}.`
  };
}

/** One owner advances a wall-clock cursor. Saving the resulting state persists the credit. */
export class ElapsedTimeCredit {
  constructor(private creditedThroughMs: number) {}

  public consume(game: GameStateManager, nowMs: number): { seconds: number; faithGained: number; fervorGained: number; relicGained: number } {
    if (!Number.isFinite(nowMs) || nowMs <= this.creditedThroughMs) return { seconds: 0, faithGained: 0, fervorGained: 0, relicGained: 0 };
    const seconds = Math.min(86400, Math.max(0, (nowMs - this.creditedThroughMs) / 1000));
    this.creditedThroughMs = nowMs;
    // Combat requires presence; no clicks, miracles, ascensions or Avatar purchases offline.
    game.retreatBossBattle();
    const gains = { faithGained: 0, fervorGained: 0, relicGained: 0 };
    let remaining = seconds;
    while (remaining > 1e-8) {
      const dt = Math.min(0.1, remaining);
      const step = game.tick(dt);
      gains.faithGained += step.faithGained;
      gains.fervorGained += step.fervorGained;
      gains.relicGained += step.relicGained;
      game.checkAchievements();
      remaining -= dt;
    }
    return { seconds, ...gains };
  }
}
