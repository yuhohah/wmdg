// Fit local late-node prices in saved real economies, without introducing waits in game rules.
import { createServer } from 'vite';
import { writeFileSync } from 'node:fs';
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
try {
  const { ProgressionSimulator } = await server.ssrLoadModule('/src/benchmark/ProgressionSimulator.ts');
  const { REFERENCE_BEHAVIOR } = await server.ssrLoadModule('/src/benchmark/behavior.ts');
  const { GNOSE_UPGRADES } = await server.ssrLoadModule('/src/config/gnose.ts');
  const { GameStateManager } = await server.ssrLoadModule('/src/core/GameState.ts');
  const behavior = { ...REFERENCE_BEHAVIOR, ...(process.env.NO_MIRACLES ? { miracleCatchChance: 0 } : {}) };
  let checkpoint;
  let initial = ProgressionSimulator.runArchetype('active', { behavior, maxDurationSec: 8 * 3600,
    stopAfterUpgrade: process.env.START_AFTER ?? 'gn_init_faith', onSnapshot: (_, save) => { checkpoint = save; } });
  console.log('initial', initial.totalSimulatedTimeSec / 3600);
  const data = [];
  const order = ['gn_memoria_selos', 'gn_automation', 'gn_seal_automation', 'gn_init_fervor', 'gn_ritual_automation', 'gn_relic_automation', 'gn_relic_gain', 'gn_keep_relics', 'gn_followers_syn', 'gn_bencao_eterna', 'gn_followers_economy', 'gn_followers_cubic', 'gn_gnose_mult', 'gn_relic_refinement', 'gn_fu1_boost', 'gn_omniscience', 'gn_apotheosis', 'gn_empyrean_fire', 'gn_perfect_opus'];
  const remaining = order.map(id => GNOSE_UPGRADES.find(u => u.id === id)).filter(u => !checkpoint.gnose.unlockedUpgrades.includes(u.id));
  let previousPrice = 1;
  for (const node of remaining) {
    const targetMinutes = process.env.NO_MIRACLES ? 57.5 : data.length < 5 ? Number(process.argv[3] ?? 30) : Number(process.argv[4] ?? 44);
    // Preserve eligibility order while observing production without an early ascension.
    for (const pending of remaining) if (!checkpoint.gnose.unlockedUpgrades.includes(pending.id)) pending.cost = 1e100;
    node.cost = 1e90;
    let projected;
    ProgressionSimulator.runArchetype('active', { initialSave: checkpoint, behavior, maxDurationSec: targetMinutes * 60,
      onSnapshot: (_, save) => { projected = save; } });
    const game = new GameStateManager(); game.applySaveData(projected);
    let low = Math.max(previousPrice + 1, game.gnosePoints + 1), high = Math.max(low * 10, game.gnosePoints + game.getGnoseToGet() * 1e6);
    let nextCheckpoint, result;
    for (let attempt = 0; attempt < 14; attempt++) {
      const trial = Math.max(previousPrice + 1, Math.round(Math.sqrt(low * high)));
      node.cost = trial;
      result = ProgressionSimulator.runArchetype('active', { initialSave: checkpoint, behavior,
        maxDurationSec: 65 * 60, stopAfterUpgrade: node.id, onSnapshot: (_, save) => { nextCheckpoint = save; } });
      if (result.totalSimulatedTimeSec < (targetMinutes - 0.8) * 60) low = trial;
      else if (result.totalSimulatedTimeSec > (targetMinutes + 0.8) * 60) high = trial;
      else break;
    }
    const price = node.cost;
    data.push({ id: node.id, price, minutes: result.totalSimulatedTimeSec / 60, acquired: nextCheckpoint.gnose.unlockedUpgrades.includes(node.id), before: checkpoint, after: nextCheckpoint });
    console.log(node.id, price, result.totalSimulatedTimeSec / 60, data.at(-1).acquired);
    writeFileSync(process.argv[2] ?? 'Base/progression-price-fit-final.json', JSON.stringify(data, null, 2));
    if (!data.at(-1).acquired) break;
    checkpoint = nextCheckpoint; previousPrice = price;
  }
} finally { await server.close(); }
