// Experimentos de análise: altera apenas a política carregada em memória, nunca as regras do jogo no disco.
// Uso: node scripts/analyze-progression.mjs <modo> <horas> <perfil> <seed> [arquivo-json]
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
const { createServer } = await import(pathToFileURL(resolve('node_modules/vite/dist/node/index.js')));
const mode = process.argv[2] ?? 'baseline';
const hours = Number(process.argv[3] ?? 24);
if (!['baseline', 'no-miracles', 'short-resets', 'no-auto-pause'].includes(mode)) throw new Error('Modo inválido');
if (!Number.isFinite(hours) || hours <= 0) throw new Error('Horas devem ser positivas');
const profile = process.argv[4] ?? 'active';
const seed = Number(process.argv[5] ?? 0xc0172);
if (!['active', 'casual', 'afk'].includes(profile)) throw new Error('Perfil inválido');
if (!Number.isInteger(seed)) throw new Error('Seed deve ser inteira');
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', plugins: [{
  name: 'analysis-only-policy', enforce: 'pre', transform(source, id) {
    if (!id.endsWith('/src/benchmark/ProgressionSimulator.ts')) return;
    const replacePolicy = (from, to) => {
      if (!source.includes(from)) throw new Error('Política do benchmark mudou; revise o experimento.');
      return source.replace(from, to);
    };
    if (mode === 'short-resets') return replacePolicy(
      'g.getGnoseToGet() >= Math.max(1, nextGnose.cost - g.gnosePoints)', 'g.getGnoseToGet() >= 1');
    if (mode === 'no-auto-pause') return replacePolicy(
      'const enabled = !(savingForUnlock || savingForIncarnation || savingForGnose);', 'const enabled = true;');
  }
}] });
try {
  const { GameStateManager } = await server.ssrLoadModule('/src/core/GameState.ts');
  const { PLAYER_BEHAVIORS } = await server.ssrLoadModule('/src/benchmark/behavior.ts');
  if (mode === 'no-miracles') PLAYER_BEHAVIORS[profile] = { ...PLAYER_BEHAVIORS[profile], miracleCatchChance: 0 };
  const { ProgressionSimulator } = await server.ssrLoadModule('/src/benchmark/ProgressionSimulator.ts');
  let t = 0, nextSample = 3600, game;
  const snapshots = [], resets = [], upgrades = [];
  const snapshot = g => ({ t, faith: g.faithPoints, fps: g.getFaithPerSecond(), fervor: g.fervorPoints,
    q: g.getFervorRatePerSecond(), relics: g.relicPoints, followers: g.getTotalFollowersCount(),
    stage: g.incarnationStage, gh: g.totalGnoseEarned, gnose: g.gnosePoints,
    levels: g.fervorUpgrades.map(u => u.level), relicLevels: g.relicUpgrades.map(u => u.level),
    nodes: [...g.unlockedGnoseUpgrades], bosses: [...g.defeatedBosses] });
  const tick = GameStateManager.prototype.tick;
  GameStateManager.prototype.tick = function(dt) {
    t += dt; game = this; tick.call(this, dt);
    if (t >= nextSample) {
      snapshots.push(snapshot(this)); nextSample += 3600;
    }
  };
  const reset = GameStateManager.prototype.performGnoseReset;
  GameStateManager.prototype.performGnoseReset = function() {
    const before = snapshot(this), result = reset.call(this);
    if (result.success) { resets.push({ ...before, gained: result.gained }); }
    return result;
  };
  const buy = GameStateManager.prototype.buyGnoseUpgrade;
  GameStateManager.prototype.buyGnoseUpgrade = function(id) {
    const result = buy.call(this, id); if (result) upgrades.push({ id, ...snapshot(this) }); return result;
  };
  const result = ProgressionSimulator.runArchetype(profile, { seed, maxDurationSec: hours * 3600 });
  const output = { mode, hours, profile, seed, result, snapshots, resets, upgrades, final: snapshot(game) };
  const file = process.argv[6] ?? `/tmp/wmdg-${mode}-${profile}-${seed}-${hours}h.json`;
  writeFileSync(file, JSON.stringify(output, null, 2));
  console.log(JSON.stringify({ file, status: result.status, duration: result.formattedTotalTime, nodes: result.gnoseUpgradesBought, resets: result.gnoseResets, faith: result.finalResources.faith }));
} finally { await server.close(); }
