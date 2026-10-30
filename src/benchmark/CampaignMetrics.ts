import type { GameStateManager } from '../core/GameState.js';

export interface CampaignMetricsResult {
  version: 2;
  combat: Array<{ bossId: string; startSec: number; endSec: number | null; result: 'active' | 'won' | 'lost' | 'retreated'; readiness: number; avatar: number; passiveHpFraction: number; sphereHpFraction: number; riftHpFraction: number; interactions: number }>;
  purchases: { followers: number; rituals: number; relics: number };
  goals: Array<{ label: string; chosenSec: number; predictedSec: number | null; reachedSec: number | null; cancelled: boolean }>;
  income: { passive: number; clicks: number; miracles: number };
  advances: Array<{ timeSec: number; category: 'permanent' | 'unlock' | 'avatar' | 'boss' | 'production'; id: string }>;
  maxPermanentGapSec: number;
  maxRelevantGapSec: number;
  recoveries: Array<{ resetSec: number; previousCycleSec: number; targetFps: number; recoveredAfterSec: number | null; gnosePerMinute: number }>;
  productionDrops: Array<{ timeSec: number; action: string; before: number; after: number; recoveredAfterSec: number | null }>;
}

/** Adds metrics without changing the historical signature-based idle metric. */
export class CampaignMetrics {
  public passiveFaith = 0;
  public clickFaith = 0;
  public miracleFaith = 0;
  private purchases = { followers: 0, rituals: 0, relics: 0 };
  private previousCounts = { followers: 0, rituals: 0, relics: 0 };
  private combat: CampaignMetricsResult['combat'] = [];
  private advances: CampaignMetricsResult['advances'] = [];
  private seen = new Set<string>();
  private samples: Array<{ time: number; fps: number }> = [];
  private sampleHead = 0;
  private integral = 0;
  private resets: CampaignMetricsResult['recoveries'] = [];
  private drops: CampaignMetricsResult['productionDrops'] = [];
  private lastReset = 0;
  private productionAnchor = 0;
  private cycleIncome = 0;

  public startCombat(time: number, game: GameStateManager): void {
    const bossId = game.activeBossBattle?.bossId;
    if (!bossId) return;
    this.combat.push({ bossId, startSec: time, endSec: null, result: 'active', readiness: game.getBossCombatBreakdown(bossId).cultReadiness,
      avatar: game.incarnationStage, passiveHpFraction: 0, sphereHpFraction: 0, riftHpFraction: 0, interactions: 0 });
  }

  public finishCombat(time: number, result: 'won' | 'lost' | 'retreated'): void {
    const combat = this.combat.at(-1);
    if (combat?.result === 'active') { combat.endSec = time; combat.result = result; }
  }

  public damageCombat(kind: 'passive' | 'sphere' | 'rift', damage: number, maxHp: number): void {
    const combat = this.combat.at(-1);
    if (!combat) return;
    if (kind === 'passive') combat.passiveHpFraction += damage / maxHp;
    if (kind === 'sphere') { combat.sphereHpFraction += damage / maxHp; combat.interactions++; }
    if (kind === 'rift') { combat.riftHpFraction += damage / maxHp; combat.interactions++; }
  }

  public observe(time: number, game: GameStateManager): void {
    const fps = game.getFaithPerSecond();
    const counts = { followers: game.getTotalFollowersCount(), rituals: game.fervorUpgrades.reduce((sum, u) => sum + u.level, 0), relics: game.relicUpgrades.reduce((sum, u) => sum + u.level, 0) };
    for (const key of ['followers', 'rituals', 'relics'] as const) this.purchases[key] += Math.max(0, counts[key] - this.previousCounts[key]);
    this.previousCounts = counts;
    const previous = this.samples.at(-1);
    if (previous) this.integral += previous.fps * (time - previous.time);
    this.samples.push({ time, fps });
    while (this.sampleHead + 1 < this.samples.length && this.samples[this.sampleHead + 1].time <= time - 60) {
      this.integral -= this.samples[this.sampleHead].fps * (this.samples[this.sampleHead + 1].time - this.samples[this.sampleHead].time);
      this.sampleHead++;
    }
    if (this.sampleHead > 1200) { this.samples = this.samples.slice(this.sampleHead); this.sampleHead = 0; }
    const record = (category: CampaignMetricsResult['advances'][number]['category'], id: string) => {
      if (this.seen.has(id)) return;
      this.seen.add(id); this.advances.push({ timeSec: time, category, id });
    };
    for (const id of game.unlockedGnoseUpgrades) record('permanent', id);
    for (const id of game.defeatedBosses) record('boss', id);
    for (const seal of game.unlocks) if (seal.unlocked) record('unlock', seal.id);
    record('avatar', `avatar-${game.incarnationStage}`);
    // Use a trailing minute average for sustained gains, never one tick's blessing peak.
    const average = this.average(time);
    if (time - this.lastReset >= 60 && average > 0 && average >= this.productionAnchor * 1.25) {
      this.productionAnchor = average;
      this.advances.push({ timeSec: time, category: 'production', id: `production-${average}` });
    }
    const recovery = this.resets.at(-1);
    if (recovery && recovery.recoveredAfterSec === null && time - this.lastReset >= 60 && average >= recovery.targetFps) {
      recovery.recoveredAfterSec = time - recovery.resetSec;
    }
    for (const drop of this.drops) if (drop.recoveredAfterSec === null && fps >= drop.before) drop.recoveredAfterSec = time - drop.timeSec;
  }

  private average(time: number): number {
    const first = this.samples[this.sampleHead];
    if (!first) return 0;
    const start = Math.max(this.lastReset, time - 60, first.time);
    const clipped = this.integral - first.fps * Math.max(0, start - first.time);
    return Math.max(0, clipped) / Math.max(0.1, time - start);
  }

  public beforeReset(time: number, game: GameStateManager): void {
    if (!game.isGnoseUnlocked() || game.activeBossBattle || game.getGnoseToGet() <= 0) return;
    const duration = time - this.lastReset;
    this.resets.push({ resetSec: time, previousCycleSec: duration, targetFps: this.average(time), recoveredAfterSec: null,
      gnosePerMinute: (game.totalGnoseEarned - this.cycleIncome + game.getGnoseToGet()) / Math.max(0.1, duration) * 60 });
    this.cycleIncome = game.totalGnoseEarned + game.getGnoseToGet();
    this.lastReset = time; this.samples = []; this.sampleHead = 0; this.integral = 0; this.productionAnchor = 0;
  }

  public afterPurchase(time: number, action: string, before: number, after: number): void {
    if (['follower', 'fervor', 'relic'].includes(action) && after < before * (1 - 1e-10)) {
      this.drops.push({ timeSec: time, action, before, after, recoveredAfterSec: null });
    }
  }

  public finish(time: number): CampaignMetricsResult {
    const gap = (events: typeof this.advances, start: number) => {
      let last = start, max = 0;
      for (const event of events.filter(e => e.timeSec >= start)) { max = Math.max(max, event.timeSec - last); last = event.timeSec; }
      return Math.max(max, time - last);
    };
    return { version: 2, combat: this.combat, purchases: this.purchases, goals: [], income: { passive: this.passiveFaith, clicks: this.clickFaith, miracles: this.miracleFaith }, advances: this.advances,
      maxPermanentGapSec: gap(this.advances.filter(e => e.category === 'permanent' || e.category === 'boss'), this.resets[0]?.resetSec ?? time),
      maxRelevantGapSec: gap(this.advances, 0), recoveries: this.resets, productionDrops: this.drops };
  }
}
