import type { BossRift } from '../types.js';

/** A shared clock keeps the green visual and accepted click window identical. */
export function odinParryCue(rift: Pick<BossRift, 'remainingSec' | 'maxSec'>): { green: boolean; diameter: number } {
  const greenWindow = Math.min(0.4, rift.maxSec * 0.3);
  const green = rift.remainingSec > 0 && rift.remainingSec <= greenWindow;
  const shrink = Math.max(0, Math.min(1,
    (rift.remainingSec - greenWindow) / Math.max(0.001, rift.maxSec - greenWindow)));
  return { green, diameter: 56 + 104 * shrink };
}
