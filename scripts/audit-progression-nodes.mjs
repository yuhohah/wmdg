// Counterfactual purchases in reconstructed saved economies; no lifetime Gnose is invented.
import { createServer } from 'vite';
import { readFileSync, writeFileSync } from 'node:fs';
const states = JSON.parse(readFileSync('Base/progression-price-fit-pacing.json','utf8'));
const server = await createServer({ server:{middlewareMode:true,hmr:false},appType:'custom' });
try {
  const { ProgressionSimulator } = await server.ssrLoadModule('/src/benchmark/ProgressionSimulator.ts');
  const { REFERENCE_BEHAVIOR } = await server.ssrLoadModule('/src/benchmark/behavior.ts');
  const { GameStateManager } = await server.ssrLoadModule('/src/core/GameState.ts');
  const { GNOSE_UPGRADES } = await server.ssrLoadModule('/src/config/gnose.ts');
  const prices = new Map(GNOSE_UPGRADES.map(u=>[u.id,u.cost]));
  const output = [];
  for (const state of states) {
    for (const node of GNOSE_UPGRADES) node.cost = state.before.gnose.unlockedUpgrades.includes(node.id) ? prices.get(node.id) : 1e100;
    let reconstructed;
    ProgressionSimulator.runArchetype('reference',{initialSave:state.before,behavior:REFERENCE_BEHAVIOR,maxDurationSec:600,
      onSnapshot:(_,save)=>{reconstructed=save;}});
    const without = new GameStateManager(), withNode = new GameStateManager();
    without.applySaveData(reconstructed); withNode.applySaveData(reconstructed);
    withNode.unlockedGnoseUpgrades.add(state.id);
    const rates = g=>({faith:g.getFaithPerSecond(),click:g.getFaithPerClick(),fervor:g.getFervorRatePerSecond(),fragments:g.getRelicsRatePerSecond()});
    const before=rates(without),after=rates(withNode);
    output.push({id:state.id,method:'10 min reconstructed economy, identical balances/history, only node ownership changed',
      lifetimeGnose:without.totalGnoseEarned,followers:without.getTotalFollowersCount(),avatar:without.incarnationStage,before,after,
      ratios:Object.fromEntries(Object.keys(before).map(k=>[k,before[k]>0?after[k]/before[k]:null])),snapshot:reconstructed});
  }
  writeFileSync('Base/progression-node-comparisons.json',JSON.stringify(output,null,2));
  console.log(JSON.stringify(output.map(({id,ratios})=>({id,ratios})),null,2));
} finally { await server.close(); }
