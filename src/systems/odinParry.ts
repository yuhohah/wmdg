import type { BossRift } from '../types.js';

export const ODIN_TARGET_DIAMETER = 64;
export const ODIN_START_DIAMETER = 158;

/** A shared clock keeps the green visual and accepted click window identical. */
export function odinParryCue(rift: Pick<BossRift, 'remainingSec' | 'maxSec'>): {
  green: boolean;
  readySoon: boolean;
  diameter: number;
  greenWindow: number;
} {
  const greenWindow = Math.min(0.56, Math.max(0.48, rift.maxSec * 0.28));
  const green = rift.remainingSec > 0 && rift.remainingSec <= greenWindow;
  const readySoon = !green && rift.remainingSec > greenWindow && rift.remainingSec <= greenWindow + 0.34;
  const shrink = Math.max(
    0,
    Math.min(1, (rift.remainingSec - greenWindow) / Math.max(0.001, rift.maxSec - greenWindow))
  );
  return {
    green,
    readySoon,
    diameter: ODIN_TARGET_DIAMETER + (ODIN_START_DIAMETER - ODIN_TARGET_DIAMETER) * shrink,
    greenWindow,
  };
}
