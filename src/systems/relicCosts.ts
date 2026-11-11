import type { RelicUpgrade } from '../types.js';
import { ETERNAL_RELIC_IDS, ETERNAL_RELIC_COST_GROWTH, ETERNAL_RELIC_FIXED_LEVELS } from '../config/relics.js';

const logGrowth = Math.log(ETERNAL_RELIC_COST_GROWTH);

/** The original 20 levels keep their price; each additional level costs 15% more. */
export function getRelicUpgradeCost(relic: RelicUpgrade, level = relic.level): number {
  if (!ETERNAL_RELIC_IDS.includes(relic.id)) return relic.cost;
  return relic.cost * Math.pow(ETERNAL_RELIC_COST_GROWTH, Math.max(0, level - ETERNAL_RELIC_FIXED_LEVELS + 1));
}

/** Sum the fixed-price prefix and geometric tail without iterating through levels. */
export function getRelicUpgradeBulkCost(relic: RelicUpgrade, count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return getRelicUpgradeCost(relic);
  if (!ETERNAL_RELIC_IDS.includes(relic.id)) return relic.cost * count;
  const fixed = Math.min(count, Math.max(0, ETERNAL_RELIC_FIXED_LEVELS - relic.level));
  const growing = count - fixed;
  if (growing === 0) return fixed * relic.cost;
  return fixed * relic.cost + getRelicUpgradeCost(relic, relic.level + fixed)
    * (Math.expm1(growing * logGrowth) / (ETERNAL_RELIC_COST_GROWTH - 1));
}

export function getMaxAffordableRelicLevels(relic: RelicUpgrade, balance: number, maxLevel: number): number {
  const remaining = Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, maxLevel) - relic.level);
  if (getRelicUpgradeCost(relic) > balance || remaining === 0) return 0;
  if (!ETERNAL_RELIC_IDS.includes(relic.id)) return Math.min(remaining, Math.floor(balance / relic.cost));
  // A level-zero geometric series gives a conservative bound even for old high-level saves.
  let high = Math.min(remaining, ETERNAL_RELIC_FIXED_LEVELS
    + Math.ceil(Math.log1p(balance / relic.cost * (ETERNAL_RELIC_COST_GROWTH - 1)) / logGrowth));
  let low = 0;
  while (low < high) {
    const middle = low + Math.ceil((high - low) / 2);
    if (getRelicUpgradeBulkCost(relic, middle) <= balance) low = middle;
    else high = middle - 1;
  }
  return low;
}
