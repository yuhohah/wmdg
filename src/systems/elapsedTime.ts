import type { GameStateManager } from '../core/GameState.js';

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
