import { ProgressionSimulator } from './ProgressionSimulator.js';
import type { BenchmarkReport, BenchmarkWorkerMessage, PlayerArchetype, SimulationOptions } from './types.js';

const send = (message: BenchmarkWorkerMessage): void => self.postMessage(message);
self.addEventListener('message', (event: MessageEvent<Omit<SimulationOptions, 'onEvent'>>) => {
  try {
    const run = (profile: PlayerArchetype) => {
      send({ kind: 'progress', profile });
      return ProgressionSimulator.runArchetype(profile, event.data);
    };
    const report: BenchmarkReport = {
      timestamp: Date.now(), results: { active: run('active'), casual: run('casual'), afk: run('afk') },
    };
    send({ kind: 'done', report });
  } catch (error) {
    send({ kind: 'error', message: String(error) });
  }
});
