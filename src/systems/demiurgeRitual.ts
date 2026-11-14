/** Four unequal legs: Moon → Sun → Moon → Sun → Moon, exactly two round trips. */
export const RITUAL_LEGS = [1.6, 1.1, 1.9, 1.4] as const;
export const RITUAL_DURATION = RITUAL_LEGS.reduce((sum, leg) => sum + leg, 0);
export const RITUAL_SAFE_HALF_WIDTH = 0.08;
export const RITUAL_MAX_PENALTY = 40;
export function ritualPointer(elapsed: number): number {
  let time = Math.max(0, elapsed);
  for (let i = 0; i < RITUAL_LEGS.length; i++) {
    const duration = RITUAL_LEGS[i];
    if (time <= duration) {
      const t = time / duration;
      // Monotonic easing changes speed within each leg without adding reversals.
      const progress = t + 0.1 * Math.sin(2 * Math.PI * t);
      return i % 2 === 0 ? -1 + 2 * progress : 1 - 2 * progress;
    }
    time -= duration;
  }
  return -1;
}
export function ritualJudgement(position: number): { side: 'center' | 'moon' | 'sun'; percent: number } {
  const p = Math.max(-1, Math.min(1, Number.isFinite(position) ? position : -1));
  if (Math.abs(p) <= RITUAL_SAFE_HALF_WIDTH) return { side: 'center', percent: 0 };
  return { side: p < 0 ? 'moon' : 'sun',
    percent: RITUAL_MAX_PENALTY * (Math.abs(p) - RITUAL_SAFE_HALF_WIDTH) / (1 - RITUAL_SAFE_HALF_WIDTH) };
}
