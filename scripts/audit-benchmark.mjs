// The original audit is archived in docs/benchmark-audit-2026-10-27.json.
// Current invariant probes run through the test runner, against the real simulator.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const result = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'src/benchmark/benchmark.test.ts'], { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
