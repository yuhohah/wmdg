// Read-only combat audit: nix-shell --run 'node scripts/audit-bosses.mjs'
// Fixtures are isolated GameState instances; no player saves are accessed.
import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
try {
  const { GameStateManager: Game } = await server.ssrLoadModule('/src/core/GameState.ts');
  const { ProgressionSimulator } = await server.ssrLoadModule('/src/benchmark/ProgressionSimulator.ts');
  const minimal = () => { const g = new Game(); g.totalGnoseEarned = 1; return g; };
  const probes = [];
  const probe = (name, check) => {
    const { passed, evidence } = check();
    probes.push({ name, passed, evidence });
  };
  probe('Starting another battle does not reset an ongoing battle', () => {
    const g = minimal(); g.startBossBattle('boss_anubis');
    g.activeBossBattle.altarIntegrity = 25;
    const restarted = g.startBossBattle('boss_anubis');
    return { passed: !restarted && g.activeBossBattle.altarIntegrity === 25,
      evidence: { restarted, integrityAfter: g.activeBossBattle.altarIntegrity } };
  });
  probe('Applying a save clears transient battle state', () => {
    const g = minimal(); g.startBossBattle('boss_anubis');
    g.applySaveData(new Game().buildSaveData());
    return { passed: g.activeBossBattle === null, evidence: { battleRemaining: !!g.activeBossBattle } };
  });
  probe('Rift scheduling is independent of tick size over 10 simulated seconds', () => {
    const run = (step) => {
      const g = minimal(); g.startBossBattle('boss_anubis');
      for (let i = 0; i < Math.round(10 / step); i++) g.tick(step);
      const b = g.activeBossBattle;
      return { missed: b?.riftsMissed, active: b?.activeRifts.length, integrity: b?.altarIntegrity };
    };
    const fine = run(0.1), coarse = run(10);
    return { passed: JSON.stringify(fine) === JSON.stringify(coarse), evidence: { fine, coarse } };
  });
  probe('Displayed percent components describe actual damage when raw production dominates', () => {
    const g = minimal(); g.followers[0].count = 1e20;
    const b = g.getBossCombatBreakdown('boss_anubis');
    return { passed: Math.abs(b.passiveDps / 1e18 - b.passiveHpFractionPerSec) < 1e-6,
      evidence: { displayedPassivePercent: b.passiveHpFractionPerSec * 100,
        actualPassivePercent: b.passiveDps / 1e18 * 100,
        displayedClickPercent: b.clickHpFraction * 100, actualClickPercent: b.clickDamage / 1e18 * 100,
        displayedRiftPercent: b.riftHpFraction * 100, actualRiftPercent: b.riftDamage / 1e18 * 100 } };
  });
  probe('Retreat leaves no curse and permits a fresh attempt', () => {
    const g = minimal(); g.startBossBattle('boss_anubis'); g.retreatBossBattle();
    return { passed: g.bossCurseTimerSec === 0 && g.startBossBattle('boss_anubis'),
      evidence: { curseSec: g.bossCurseTimerSec } };
  });
  probe('Curse reduces passive damage while direct manual damage remains unchanged', () => {
    const g = minimal(); const normal = g.getBossCombatBreakdown('boss_anubis');
    g.bossCurseTimerSec = 20; const cursed = g.getBossCombatBreakdown('boss_anubis');
    return { passed: Math.abs(cursed.passiveDps / normal.passiveDps - 0.75) < 1e-6
      && cursed.clickDamage === normal.clickDamage && cursed.riftDamage === normal.riftDamage,
      evidence: { totalPowerRatio: cursed.totalResourceMultiplier / normal.totalResourceMultiplier,
        passiveRatio: cursed.passiveDps / normal.passiveDps, clickRatio: cursed.clickDamage / normal.clickDamage,
        riftRatio: cursed.riftDamage / normal.riftDamage } };
  });
  // Observe real benchmark fights without changing its decisions or RNG streams.
  const proto = Game.prototype;
  const original = { tick: proto.tick, start: proto.startBossBattle, click: proto.addClick };
  const clocks = new WeakMap(), current = new WeakMap();
  let battles = [];
  proto.tick = function (dt) { clocks.set(this, (clocks.get(this) ?? 0) + dt); return original.tick.call(this, dt); };
  proto.addClick = function (random) { const row = current.get(this); if (row) row.sphereClicks++; return original.click.call(this, random); };
  proto.startBossBattle = function (id) {
    const started = original.start.call(this, id);
    if (started) {
      const row = { boss: id, startSec: clocks.get(this) ?? 0, sphereClicks: 0, riftsShattered: 0,
        faithPerSecond: this.getFaithPerSecond(), breakdown: this.getBossCombatBreakdown(id),
        startSave: this.buildSaveData() };
      battles.push(row); current.set(this, row);
      const previous = this.onBossBattleFinished;
      this.onBossBattleFinished = (result) => {
        row.durationSec = (clocks.get(this) ?? 0) - row.startSec;
        row.victory = result.victory; current.delete(this);
        this.onBossBattleFinished = previous; previous?.(result);
      };
    }
    return started;
  };
  const campaigns = {};
  const results = {};
  try {
    for (const profile of ['active', 'casual', 'afk']) {
      battles = [];
      const result = ProgressionSimulator.runArchetype(profile, { seed: 786802, maxDurationSec: 72 * 3600,
        onEvent: event => { if (event.action === 'rift') battles.at(-1).riftsShattered++; } });
      results[profile] = result;
      campaigns[profile] = { status: result.status, durationSec: result.totalSimulatedTimeSec, battles };
    }
  } finally {
    proto.tick = original.tick; proto.startBossBattle = original.start; proto.addClick = original.click;
  }
  // Replay each exact campaign challenge state with no manual input.
  for (const campaign of Object.values(campaigns)) {
    for (const battle of campaign.battles) {
      const g = new Game(); g.applySaveData(battle.startSave);
      g.startBossBattle(battle.boss);
      let result;
      g.onBossBattleFinished = ({ victory }) => { result = victory; };
      let elapsed = 0, maxMissed = 0;
      while (g.activeBossBattle && elapsed < 120) {
        g.tick(0.1); elapsed += 0.1;
        maxMissed = Math.max(maxMissed, g.activeBossBattle?.riftsMissed ?? 0);
      }
      battle.passiveReplay = { victory: result, durationSec: elapsed, missedBeforeFinalTick: maxMissed };
      delete battle.startSave;
    }
  }
  console.log(JSON.stringify({ seed: 786802, probes, campaigns, benchmark: { timestamp: Date.now(), results } }, null, 2));
} finally { await server.close(); }
