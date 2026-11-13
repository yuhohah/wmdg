import type { GameStateManager } from '../core/GameState.js';
import { GNOSE_PACING } from '../config/gnose.js';
import { GNOSE_BOSSES } from '../config/bosses.js';

export interface GnoseTierCadence {
  tier: number;
  bossId: string;
  startedSec: number | null;
  completedSec: number | null;
  durationSec: number | null;
  ascensions: number | null;
  timeInTarget: boolean;
  ascensionsInTarget: boolean;
}

export interface CampaignMetricsResult {
  version: 2;
  combat: Array<{ bossId: string; startSec: number; endSec: number | null; result: 'active' | 'won' | 'lost' | 'retreated'; readiness: number; avatar: number; passiveHpFraction: number; sphereHpFraction: number; riftHpFraction: number; interactions: number }>;
  purchases: { followers: number; rituals: number; relics: number };
  goals: Array<{ label: string; chosenSec: number; predictedSec: number | null; reachedSec: number | null; cancelled: boolean }>;
  income: { passive: number; clicks: number; miracles: number };
  miracleShareMeanPct: number;
  advances: Array<{ timeSec: number; category: 'permanent' | 'unlock' | 'avatar' | 'boss' | 'production'; id: string }>;
  maxPermanentGapSec: number;
  maxRelevantGapSec: number;
  recoveries: Array<{ resetSec: number; previousCycleSec: number; targetFps: number; recoveredAfterSec: number | null; gnosePerMinute: number }>;
  productionDrops: Array<{ timeSec: number; action: string; before: number; after: number; recoveredAfterSec: number | null }>;
  gnoseTiers: GnoseTierCadence[];
}

/** Adds metrics without changing the historical signature-based idle metric. */
export class CampaignMetrics {
  public passiveFaith = 0;
  public clickFaith = 0;
  public miracleFaith = 0;
  private cycleIncomeByKind = { passive: 0, clicks: 0, miracles: 0 };
  private cycleMiracleShares: number[] = [];
  private purchases = { followers: 0, rituals: 0, relics: 0 };
  private previousCounts = { followers: 0, rituals: 0, relics: 0 };
  private combat: CampaignMetricsResult['combat'] = [];
  private goals: CampaignMetricsResult['goals'] = [];
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

  public addIncome(kind: 'passive' | 'clicks' | 'miracles', amount: number): void {
    if (amount <= 0 || !Number.isFinite(amount)) return;
    if (kind === 'passive') this.passiveFaith += amount;
    else if (kind === 'clicks') this.clickFaith += amount;
    else this.miracleFaith += amount;
    this.cycleIncomeByKind[kind] += amount;
  }

  public startGoal(label: string, chosenSec: number, predictedSec: number | null = null): void {
    const active = this.goals.at(-1);
    if (active && active.reachedSec === null && !active.cancelled) {
      if (active.label === label) return;
      active.cancelled = true;
    }
    this.goals.push({ label, chosenSec, predictedSec, reachedSec: null, cancelled: false });
  }

  public finishGoal(label: string, reachedSec: number, cancelled = false): void {
    const goal = [...this.goals].reverse().find(g => g.label === label && g.reachedSec === null && !g.cancelled);
    if (!goal) return;
    if (cancelled) goal.cancelled = true;
    else goal.reachedSec = reachedSec;
  }

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

  public damageCombat(kind: 'passive' | 'sphere' | 'rift', damage: number, maxHp: number, countInteraction = true): void {
    const combat = this.combat.at(-1);
    if (!combat) return;
    if (kind === 'passive') combat.passiveHpFraction += damage / maxHp;
    if (kind === 'sphere') {
      combat.sphereHpFraction += damage / maxHp;
      if (countInteraction) combat.interactions++;
    }
    if (kind === 'rift') {
      combat.riftHpFraction += damage / maxHp;
      if (countInteraction) combat.interactions++;
    }
  }

  public recordCombatInteraction(): void {
    const combat = this.combat.at(-1);
    if (combat) combat.interactions++;
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
    const settleSec = recovery ? Math.min(15, Math.max(2, recovery.previousCycleSec * 0.15)) : 60;
    if (recovery && recovery.recoveredAfterSec === null && time - this.lastReset >= settleSec && average >= recovery.targetFps) {
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

  private flushCycleMiracleShare(): void {
    const total = this.cycleIncomeByKind.passive + this.cycleIncomeByKind.clicks + this.cycleIncomeByKind.miracles;
    if (total > 0) this.cycleMiracleShares.push((100 * this.cycleIncomeByKind.miracles) / total);
    this.cycleIncomeByKind = { passive: 0, clicks: 0, miracles: 0 };
  }

  public beforeReset(time: number, game: GameStateManager): void {
    if (!game.isGnoseUnlocked() || game.activeBossBattle || game.getGnoseToGet() <= 0) return;
    const duration = time - this.lastReset;
    this.resets.push({ resetSec: time, previousCycleSec: duration, targetFps: this.average(time), recoveredAfterSec: null,
      gnosePerMinute: (game.totalGnoseEarned - this.cycleIncome + game.getGnoseToGet()) / Math.max(0.1, duration) * 60 });
    this.cycleIncome = game.totalGnoseEarned + game.getGnoseToGet();
    this.flushCycleMiracleShare();
    this.lastReset = time; this.samples = []; this.sampleHead = 0; this.integral = 0; this.productionAnchor = 0;
  }

  public afterPurchase(time: number, action: string, before: number, after: number): void {
    if (['follower', 'fervor', 'relic'].includes(action) && after < before * (1 - 1e-10)) {
      this.drops.push({ timeSec: time, action, before, after, recoveredAfterSec: null });
    }
  }

  public finish(time: number): CampaignMetricsResult {
    this.flushCycleMiracleShare();
    const miracleShareMeanPct = this.cycleMiracleShares.length > 0
      ? this.cycleMiracleShares.reduce((sum, v) => sum + v, 0) / this.cycleMiracleShares.length
      : 0;
    const gap = (events: typeof this.advances, start: number) => {
      let last = start, max = 0;
      for (const event of events.filter(e => e.timeSec >= start)) { max = Math.max(max, event.timeSec - last); last = event.timeSec; }
      return Math.max(max, time - last);
    };
    let tierStart: number | null = this.resets[0]?.resetSec ?? null;
    const gnoseTiers = GNOSE_BOSSES.map((boss, i): GnoseTierCadence => {
      const completedSec = this.advances.find(e => e.category === 'boss' && e.id === boss.id)?.timeSec ?? null;
      const durationSec = tierStart !== null && completedSec !== null && completedSec >= tierStart ? completedSec - tierStart : null;
      const ascensions = durationSec !== null
        ? this.resets.filter(r => r.resetSec <= completedSec! && (i === 0 ? r.resetSec >= tierStart! : r.resetSec > tierStart!)).length
        : null;
      const result = { tier: i + 1, bossId: boss.id, startedSec: tierStart, completedSec, durationSec, ascensions,
        timeInTarget: durationSec !== null && durationSec >= GNOSE_PACING.minTierSec && durationSec <= GNOSE_PACING.maxTierSec,
        ascensionsInTarget: ascensions !== null && ascensions >= GNOSE_PACING.minAscensions && ascensions <= GNOSE_PACING.maxAscensions };
      tierStart = completedSec;
      return result;
    });
    return { version: 2, combat: this.combat, purchases: this.purchases, goals: this.goals,
      income: { passive: this.passiveFaith, clicks: this.clickFaith, miracles: this.miracleFaith },
      miracleShareMeanPct, advances: this.advances,
      maxPermanentGapSec: gap(this.advances.filter(e => e.category === 'permanent' || e.category === 'boss'), this.resets[0]?.resetSec ?? time),
      maxRelevantGapSec: gap(this.advances, 0), recoveries: this.resets, productionDrops: this.drops, gnoseTiers };
  }
}
