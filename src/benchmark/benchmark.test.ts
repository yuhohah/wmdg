import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProgressionSimulator } from './ProgressionSimulator.js';
import { PLAYER_BEHAVIORS, manualBlessingAllowed, manualSphereAllowed, VisitSchedule } from './behavior.js';
import { ProgressTracker } from './ProgressTracker.js';
import { GameStateManager } from '../core/GameState.js';
import type { BenchmarkEvent } from './types.js';
import { formatDuration, formatHtmlReport, formatTerminalReport } from './reporters.js';

afterEach(() => vi.restoreAllMocks());

describe('Reference progression simulation', () => {
  it('is reproducible without consuming or replacing global randomness', () => {
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Global RNG used'); });
    const first = ProgressionSimulator.runArchetype('active', { seed: 42, maxDurationSec: 120 });
    expect(ProgressionSimulator.runArchetype('active', { seed: 42, maxDurationSec: 120 })).toEqual(first);
    expect(first.criticalClicks).toBeGreaterThan(0);
    expect(random).not.toHaveBeenCalled();
  });

  it.each(['casual'] as const)('performs no manual action during %s absences', (profile) => {
    const events: BenchmarkEvent[] = [];
    const result = ProgressionSimulator.runArchetype(profile, { maxDurationSec: 8000, onEvent: event => events.push(event) });
    expect(result.visits).toBeGreaterThan(1);
    expect(events.filter(e => e.kind === 'action').every(e => e.present)).toBe(true);
    const left = events.find(e => e.kind === 'leave')!;
    const returned = events.find(e => e.kind === 'arrive')!;
    expect(left.timeSec).toBeCloseTo(480, 6);
    expect(returned.timeSec - left.timeSec).toBeCloseTo(720, 6);
    expect(events.some(e => e.kind === 'action' && e.timeSec > left.timeSec && e.timeSec < returned.timeSec)).toBe(false);
    expect(result.presentTimeSec + result.awayTimeSec).toBeCloseTo(result.totalSimulatedTimeSec, 5);
    expect(result.simulatedTickSeconds).toBeCloseTo(result.totalSimulatedTimeSec, 5);
  });

  it('advances unattended production with the actual small-step game integrator', () => {
    const game = new GameStateManager();
    game.followers[0].count = 10;
    game.unlocks[0].unlocked = true;
    let current: GameStateManager | undefined;
    let departure: ReturnType<GameStateManager['buildSaveData']> | undefined;
    let maxTick = 0;
    const original = GameStateManager.prototype.tick;
    vi.spyOn(GameStateManager.prototype, 'tick').mockImplementation(function (this: GameStateManager, dt) {
      current = this;
      maxTick = Math.max(maxTick, dt);
      return original.call(this, dt);
    });
    const result = ProgressionSimulator.runArchetype('casual', {
      initialSave: game.buildSaveData(), maxDurationSec: 510,
      onEvent: event => { if (event.kind === 'leave') departure = current?.buildSaveData(); },
    });
    expect(departure).toBeDefined();
    const reference = new GameStateManager();
    reference.applySaveData(departure!);
    for (let i = 0; i < 300; i++) { original.call(reference, 0.1); reference.checkAchievements(); }
    expect(maxTick).toBeLessThanOrEqual(0.1);
    expect(result.finalResources.faith).toBeCloseTo(reference.faithPoints, 3);
    expect(result.finalResources.fervor).toBeCloseTo(reference.fervorPoints, 3);
  });

  it('buys one ritual level per manual interaction and shares the interaction budget', () => {
    const game = new GameStateManager();
    game.unlocks.forEach(u => { u.unlocked = true; });
    game.followers[0].count = 25;
    game.faithPoints = 1e6;
    game.fervorPoints = 1e25;
    ['boss_anubis', 'boss_cronos', 'boss_odin'].forEach(id => game.defeatedBosses.add(id));
    const original = GameStateManager.prototype.buyFervorUpgrade;
    let levelsBought = 0;
    vi.spyOn(GameStateManager.prototype, 'buyFervorUpgrade').mockImplementation(function (this: GameStateManager, upgrade) {
      const before = upgrade.level;
      const bought = original.call(this, upgrade);
      if (bought) { expect(upgrade.level - before).toBe(1); levelsBought++; }
      return bought;
    });
    const result = ProgressionSimulator.runArchetype('active', { initialSave: game.buildSaveData(), maxDurationSec: 60 });
    expect(levelsBought).toBeGreaterThan(0);
    expect(result.actionsByType.fervor).toBe(levelsBought);
    expect(levelsBought).toBeLessThanOrEqual(20); // each purchase requires its own 3-second decision
    expect(result.manualActions).toBeLessThanOrEqual(Math.ceil(result.presentTimeSec * 5) + 1);
  });

  it('AFK clicks and blesses during warmup, then only purchases after the global 10-minute cutoff', () => {
    const game = new GameStateManager();
    game.followers[0].count = 10;
    game.unlocks[0].unlocked = true;
    const events: BenchmarkEvent[] = [];
    const result = ProgressionSimulator.runArchetype('afk', {
      initialSave: game.buildSaveData(), maxDurationSec: 1300, onEvent: event => events.push(event),
    });
    const actions = events.filter(event => event.kind === 'action');
    expect(actions.some(event => event.action === 'sphere' && event.timeSec < 600)).toBe(true);
    expect(actions.some(event => event.action === 'blessing' && event.timeSec < 600)).toBe(true);
    expect(actions.some(event => event.timeSec >= 600 && (event.action === 'sphere' || event.action === 'blessing'))).toBe(false);
    expect(actions.some(event => event.timeSec >= 600 && event.action === 'fervor')).toBe(true);
    expect(result.awayTimeSec).toBe(0);
    expect(result.visits).toBe(1);
    expect(result.lastSphereClickSec).toBeLessThan(600);
    expect(result.lastManualBlessingSec).toBeLessThan(600);
    expect(result.miraclesCaught).toBe(0);
  });

  it('recovers after Gnose without restarting AFK routine clicks, combat clicks or blessing', () => {
    const game = new GameStateManager();
    game.followers[0].count = 10;
    game.unlocks[0].unlocked = true;
    const original = GameStateManager.prototype.tick;
    const events: BenchmarkEvent[] = [];
    let elapsed = 0;
    let battleStarted = false;
    let reset = false;
    const originalClick = GameStateManager.prototype.addClick;
    vi.spyOn(GameStateManager.prototype, 'addClick').mockImplementation(function (this: GameStateManager, random) {
      if (elapsed >= 600) {
        expect(this.gnoseResets).toBeGreaterThan(0);
        expect(this.getTotalFollowersCount()).toBe(0);
        expect(this.getFaithPerSecond()).toBe(0);
        expect(this.faithPoints).toBeLessThan(this.getItemCost(this.followers[0]));
        expect(this.activeBossBattle).toBeFalsy();
      }
      return originalClick.call(this, random);
    });
    vi.spyOn(GameStateManager.prototype, 'tick').mockImplementation(function (this: GameStateManager, dt) {
      elapsed += dt;
      if (elapsed >= 601 && !battleStarted) {
        this.totalGnoseEarned = 1;
        battleStarted = this.startBossBattle('boss_anubis');
      }
      if (elapsed >= 605 && !reset) {
        this.retreatBossBattle();
        this.unlocks.forEach(u => { u.unlocked = true; });
        this.faithPoints = 1e18;
        reset = this.performGnoseReset().success;
      }
      return original.call(this, dt);
    });
    const result = ProgressionSimulator.runArchetype('afk', {
      initialSave: game.buildSaveData(), maxDurationSec: 630, onEvent: event => events.push(event),
    });
    expect(battleStarted).toBe(true);
    expect(reset).toBe(true);
    const actions = events.filter(e => e.kind === 'action');
    expect(actions.some(e => e.timeSec >= 600 && e.action === 'blessing')).toBe(false);
    expect(actions.some(e => e.timeSec >= 600 && e.timeSec < 605 && e.action === 'sphere')).toBe(false);
    const recovery = actions.filter(e => e.timeSec >= 605 && e.action === 'sphere');
    expect(recovery.length).toBeGreaterThan(0);
    expect(result.postGnoseRecoveryClicks).toBe(recovery.length);
    const recruitment = actions.find(e => e.timeSec >= 605 && e.action === 'follower');
    expect(recruitment).toBeDefined();
    expect(recovery.every(e => e.timeSec < recruitment!.timeSec)).toBe(true);
    expect(result.status).toBe('time_limit');
    expect(result.blockedReason).toBeUndefined();
    const report = { timestamp: 0, results: { active: result, casual: result, afk: result } };
    expect(formatTerminalReport(report)).toContain('Cliques de recuperação após Gnose');
    expect(formatHtmlReport(report)).toContain('Cliques de recuperação após Gnose');
  });

  it('enforces the AFK boundary at exactly 600 seconds, leaving the Casual allowed', () => {
    expect(manualSphereAllowed(PLAYER_BEHAVIORS.afk, 599.999)).toBe(true);
    expect(manualBlessingAllowed(PLAYER_BEHAVIORS.afk, 599.999)).toBe(true);
    for (const time of [600, 601, 3600]) {
      expect(manualSphereAllowed(PLAYER_BEHAVIORS.afk, time)).toBe(false);
      expect(manualBlessingAllowed(PLAYER_BEHAVIORS.afk, time)).toBe(false);
      expect(manualSphereAllowed(PLAYER_BEHAVIORS.casual, time)).toBe(true);
      expect(manualBlessingAllowed(PLAYER_BEHAVIORS.casual, time)).toBe(true);
    }
  });

  it('does not waste blessing presses against an almost-full charge', () => {
    const game = new GameStateManager();
    game.followers[0].count = 10;
    game.unlocks[0].unlocked = true;
    const result = ProgressionSimulator.runArchetype('afk', {
      initialSave: game.buildSaveData(), maxDurationSec: 120,
    });
    expect(result.actionsByType.blessing).toBeGreaterThan(0);
    // Each press supplies 2 s; a 120-s interval plus at most 60 s stored needs <=90 presses.
    expect(result.actionsByType.blessing).toBeLessThanOrEqual(90);
  });

  it('Casual plays continuously for eight minutes every twenty minutes', () => {
    const game = new GameStateManager();
    game.followers[0].count = 10;
    game.unlocks[0].unlocked = true;
    const events: BenchmarkEvent[] = [];
    const result = ProgressionSimulator.runArchetype('casual', {
      initialSave: game.buildSaveData(), maxDurationSec: 2400, onEvent: e => events.push(e),
    });
    const transitions = events.filter(e => e.kind === 'arrive' || e.kind === 'leave');
    expect(transitions.map(e => e.kind)).toEqual(['leave', 'arrive', 'leave', 'arrive']);
    [480, 1200, 1680, 2400].forEach((time, index) => {
      expect(transitions[index].timeSec).toBeCloseTo(time, 6);
    });
    expect(result.presentTimeSec).toBeCloseTo(960, 6);
    expect(result.awayTimeSec).toBeCloseTo(1440, 6);
    for (const start of [0, 1200]) {
      for (let minute = 0; minute < 8; minute++) {
        const actions = events.filter(e => e.kind === 'action'
          && e.timeSec >= start + minute * 60 && e.timeSec < start + (minute + 1) * 60);
        expect(actions.some(e => e.action === 'sphere')).toBe(true);
        expect(actions.some(e => e.action === 'blessing')).toBe(true);
      }
    }
    expect(events.filter(e => e.kind === 'action').every(e => e.present)).toBe(true);
  });

  it('uses the initial miracle cooldown, expiry and paused next-spawn cooldown', () => {
    const game = new GameStateManager();
    game.followers[0].count = 10;
    const events: BenchmarkEvent[] = [];
    const result = ProgressionSimulator.runArchetype('afk', {
      initialSave: game.buildSaveData(), maxDurationSec: 150, onEvent: e => events.push(e),
    });
    const spawns = events.filter(e => e.kind === 'miracle_spawn');
    const expiry = events.find(e => e.kind === 'miracle_expire')!;
    expect(spawns[0].timeSec).toBeCloseTo(5, 5);
    expect(expiry.timeSec - spawns[0].timeSec).toBeCloseTo(15, 5);
    expect(spawns[1].timeSec - expiry.timeSec).toBeGreaterThanOrEqual(35 - 1e-6);
    expect(spawns[1].timeSec - expiry.timeSec).toBeLessThanOrEqual(65 + 0.1);
    expect(result.miraclesCaught).toBe(0);
  });

  it('reports truncation explicitly and never grades it Excellent', () => {
    const result = ProgressionSimulator.runArchetype('active', { maxDurationSec: 1 });
    expect(result.completed).toBe(false);
    expect(result.status).toBe('time_limit');
    expect(result.summaryScore).toBe('Incompleto');
    const report = { timestamp: 0, results: { active: result, casual: result, afk: result } };
    expect(formatTerminalReport(report)).toContain('Incompleto');
    expect(formatHtmlReport(report)).toContain('Incompleto');
  });

  it('charges a separate Gnose confirmation and blocks altar clicks while the dialog is open', () => {
    const game = new GameStateManager();
    game.unlocks.forEach(u => { u.unlocked = true; });
    game.followers[0].count = 10;
    game.faithPoints = 1e18;
    ['boss_anubis', 'boss_cronos', 'boss_odin'].forEach(id => game.defeatedBosses.add(id));
    const events: BenchmarkEvent[] = [];
    const result = ProgressionSimulator.runArchetype('active', {
      initialSave: game.buildSaveData(), maxDurationSec: 10, onEvent: event => events.push(event),
    });
    const request = events.find(event => event.action === 'gnose')!;
    const confirmation = events.find(event => event.action === 'gnose_confirm')!;
    expect(result.gnoseResets).toBe(1);
    expect(confirmation.timeSec - request.timeSec).toBeGreaterThanOrEqual(3 - 1e-6);
    expect(events.some(event => event.kind === 'action' && event.timeSec > request.timeSec && event.timeSec < confirmation.timeSec)).toBe(false);
  });

  it('tracks cumulative idle time, excluding scheduled absences from forced-idle diagnosis', () => {
    const tracker = new ProgressTracker();
    for (let i = 0; i < 4; i++) tracker.advance(90, true); // polling is not progress
    tracker.advance(2000, false);
    tracker.finish();
    expect(tracker.maxWaitSec).toBe(2360);
    expect(tracker.maxPresentIdleSec).toBe(360);
    expect(tracker.deadZones).toHaveLength(1);
    expect(tracker.deadZones[0].durationSec).toBe(360);
    const schedule = new VisitSchedule(PLAYER_BEHAVIORS.casual, () => 0);
    expect(schedule.update(480)).toBe('leave');
    expect(schedule.update(1200)).toBe('arrive');
    expect(schedule.update(1680)).toBe('leave');
  });

  it('rejects coarse integration instead of silently changing the model', () => {
    expect(() => ProgressionSimulator.runArchetype('active', { stepSec: 5 })).toThrow();
  });

  it('does not lose a minute in attendance totals due to floating-point accumulation', () => {
    expect(formatDuration(43559.99999776)).toBe('12h 6m');
    expect(formatDuration(59.8)).toBe('59s');
  });

  it('preserves the routine click count across finer integration partitions', () => {
    const game = new GameStateManager();
    game.followers[0].count = 10;
    const options = { initialSave: game.buildSaveData(), maxDurationSec: 2 };
    const coarse = ProgressionSimulator.runArchetype('active', options);
    const fine = ProgressionSimulator.runArchetype('active', { ...options, stepSec: 0.05 });
    expect(coarse.sphereClicks).toBe(4);
    expect(fine.sphereClicks).toBe(coarse.sphereClicks);
  });

  it('completes the active campaign through legal actions without a prescribed boss timetable', () => {
    const result = ProgressionSimulator.runArchetype('active', { maxDurationSec: 18 * 3600 });
    expect(result.status).toBe('completed');
    expect(result.completed).toBe(true);
    expect(result.gnoseUpgradesBought).toBe(20);
    expect(result.bossesDefeated).toBe(4);
    expect(result.milestones.at(-1)?.id).toBe('boss_tiamat');
    expect(result.milestones.every((m, i, all) => i === 0 || m.gameTimeSec >= all[i - 1].gameTimeSec)).toBe(true);
    expect(Object.values(result.finalResources).every(Number.isFinite)).toBe(true);
  }, 30000);
});
