// node scripts/calibrate-progression.mjs [output] [seeds=3] [suite=explore|final] [hours=20]
import { createServer } from 'vite';
import { writeFileSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const output = process.argv[2] ?? 'Base/progression-candidates.json';
const count = Number(process.argv[3] ?? 3);
const suite = process.argv[4] ?? 'explore';
const hours = Number(process.argv[5] ?? 20);
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
try {
  const { PROGRESSION_BALANCE } = await server.ssrLoadModule('/src/config/gnose.ts');
  if (process.env.PROGRESSION_BALANCE) Object.assign(PROGRESSION_BALANCE, JSON.parse(process.env.PROGRESSION_BALANCE));
  const { ProgressionSimulator } = await server.ssrLoadModule('/src/benchmark/ProgressionSimulator.ts');
  const { REFERENCE_BEHAVIOR } = await server.ssrLoadModule('/src/benchmark/behavior.ts');
  const scenarios = [
    { id: 'reference', profile: 'active', behavior: REFERENCE_BEHAVIOR },
    { id: 'no-miracles', profile: 'active', behavior: { ...REFERENCE_BEHAVIOR, miracleCatchChance: 0 } },
    ...(suite === 'final' ? [
      { id: 'intense', profile: 'active' },
      { id: 'comfort', profile: 'active', behavior: REFERENCE_BEHAVIOR, purchasePriority: 'comfort' },
      { id: 'production', profile: 'active', behavior: REFERENCE_BEHAVIOR, purchasePriority: 'production' },
      { id: 'immediate', profile: 'active', behavior: REFERENCE_BEHAVIOR, resetPolicy: 'immediate' },
      { id: 'short', profile: 'active', behavior: REFERENCE_BEHAVIOR, resetPolicy: 'short' },
      { id: 'long', profile: 'active', behavior: REFERENCE_BEHAVIOR, resetPolicy: 'long' },
      { id: 'casual', profile: 'casual' },
      { id: 'casual-hidden', profile: 'casual', absenceMode: 'hidden' },
      { id: 'casual-save', profile: 'casual', absenceMode: 'save' },
      { id: 'absence', profile: 'active', absenceMode: 'save', behavior: { ...REFERENCE_BEHAVIOR, initialVisitDurationSec: 600, visitDurationSec: 0, absenceMinSec: Infinity, absenceMaxSec: Infinity } },
    ] : []),
  ];
  const { GNOSE_UPGRADES } = await server.ssrLoadModule('/src/config/gnose.ts');
  const metadata = { balance: PROGRESSION_BALANCE, costs: Object.fromEntries(GNOSE_UPGRADES.map(u => [u.id, u.cost])),
    sources: Object.fromEntries(['src/core/GameState.ts','src/benchmark/ProgressionSimulator.ts','src/benchmark/behavior.ts','src/systems/calculations.ts'].map(file => [file, createHash('sha256').update(readFileSync(file)).digest('hex')])) };
  const results = [];
  for (const scenario of scenarios.filter(s => !process.env.SCENARIOS || process.env.SCENARIOS.split(',').includes(s.id))) for (let i = 0; i < count; i++) {
    const result = ProgressionSimulator.runArchetype(scenario.profile, { ...scenario, seed: 0xc0172 + i + Number(process.env.SEED_OFFSET ?? 0), maxDurationSec: hours * 3600 });
    results.push({ scenario: scenario.id, result });
    const json = JSON.stringify({ suite, hours, metadata, results });
    writeFileSync(output, output.endsWith('.gz') ? gzipSync(json) : json);
    console.log(JSON.stringify({ scenario: scenario.id, seed: result.seed, completed: result.completed, hours: result.totalSimulatedTimeSec / 3600,
      nodes: result.gnoseUpgradesBought, resets: result.gnoseResets, permanentGapMin: result.progression.maxPermanentGapSec / 60 }));
  }
} finally { await server.close(); }
