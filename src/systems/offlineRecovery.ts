import { GameStateManager } from '../core/GameState.js';
import type { SaveData } from './saveSystem.js';
import { ElapsedTimeCredit, buildOfflineNotice, consumeElapsedTime } from './elapsedTime.js';

/** Work on a candidate so autosave/unload never sees a partially credited state. */
export async function recoverOfflineProgress(
  source: SaveData,
  nowMs: number,
  yieldControl?: () => Promise<void>,
): Promise<{ save: SaveData; notice?: { title: string; desc: string } }> {
  const candidate = new GameStateManager();
  candidate.applySaveData(source);
  const fromMs = source.timestamp > 0 ? source.timestamp : nowMs;
  const gains = await consumeElapsedTime(new ElapsedTimeCredit(fromMs), candidate, fromMs, nowMs, yieldControl);
  const save = candidate.buildSaveData();
  save.timestamp = nowMs;
  return { save, notice: buildOfflineNotice(gains.seconds, gains) };
}
