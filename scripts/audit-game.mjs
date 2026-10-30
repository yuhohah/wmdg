// Read-only diagnostic probes. Run with: nix-shell --run 'node scripts/audit-game.mjs'
// A nonzero exit status means an invariant failed; this does not modify game saves.
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const originalStorage = globalThis.localStorage;
const storage = new Map();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  },
});

let failures = 0;
function probe(name, check) {
  try {
    check();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures++;
    console.log(`FAIL ${name}: ${error.message}`);
  }
}

try {
  const { GameStateManager: Game } = await server.ssrLoadModule('/src/core/GameState.ts');
  const { SaveSystem: Saves } = await server.ssrLoadModule('/src/systems/saveSystem.ts');

  probe('Reject save without stats', () => {
    assert.equal(Saves.deserialize('{"version":1}'), null);
  });
  probe('Reject null follower entry before applying save', () => {
    const save = new Game().buildSaveData();
    save.followers = [null];
    assert.equal(Saves.deserialize(JSON.stringify(save)), null);
  });
  probe('Use backup when primary save has invalid structure', () => {
    storage.clear();
    const backup = new Game().buildSaveData();
    backup.stats.faithPoints = 1234;
    storage.set('cult_of_the_sphere_save_v1', '{"version":1}');
    storage.set('cult_of_the_sphere_save_backup', JSON.stringify(backup));
    assert.equal(Saves.load()?.stats?.faithPoints, 1234);
  });
  probe('Reject nonfinite resources parsed from JSON', () => {
    const json = JSON.stringify(new Game().buildSaveData()).replace('"faithPoints":1', '"faithPoints":1e309');
    const parsed = Saves.deserialize(json);
    if (parsed) {
      const game = new Game();
      game.applySaveData(parsed);
      assert.ok(Number.isFinite(game.faithPoints), 'faithPoints became Infinity');
    }
  });
  probe('Import clears transient combat and cooldown', () => {
    const game = new Game();
    game.totalGnoseEarned = 1;
    assert.ok(game.startBossBattle('boss_anubis'));
    game.relicConvertCooldown = 2.5;
    game.applySaveData(new Game().buildSaveData());
    assert.equal(game.activeBossBattle, null, 'previous battle remains active');
    assert.equal(game.relicConvertCooldown, 0);
  });
  probe('Seal purchase enforces prerequisite', () => {
    const game = new Game();
    game.faithPoints = 1e15;
    assert.equal(game.buyUnlock(game.unlocks.find((u) => u.id === 'unlock_gnose')), false);
  });
  console.log(`\n${failures} invariant(s) failed out of 6 probes.`);
  process.exitCode = failures ? 1 : 0;
} finally {
  await server.close();
  if (originalStorage === undefined) delete globalThis.localStorage;
  else Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: originalStorage });
}
