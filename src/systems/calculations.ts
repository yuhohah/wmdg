import type { BuyableItem, FervorUpgrade, Achievement } from '../types.js';

export function calculateItemCost(
  item: BuyableItem,
  discountMultiplier: number = 1.0,
  customMultiplier?: number
): number {
  const mult = customMultiplier !== undefined ? customMultiplier : item.costMultiplier;
  let cost = Math.floor(item.baseCost * Math.pow(mult, item.count));
  if (item.id === 'f_devotee') {
    cost = Math.floor(cost * discountMultiplier);
  }
  return Math.max(1, cost);
}

export function calculateFervorUpgradeCost(upg: FervorUpgrade): number {
  return Math.floor(upg.baseCost * Math.pow(upg.costMultiplier, upg.level));
}

export function calculateClickBuffMultiplier(_achievements: Achievement[]): number {
  return 1.0;
}

export function calculatePassiveBuffMultiplier(_achievements: Achievement[]): number {
  return 1.0;
}

export function calculateGlobalBuffMultiplier(_achievements: Achievement[]): number {
  return 1.0;
}

export function calculateMonumentBuffMultiplier(_achievements: Achievement[]): number {
  return 1.0;
}

export function calculateCostDiscountMultiplier(_achievements: Achievement[]): number {
  return 1.0;
}

export function calculateFervorFaithBonus(fervorPoints: number, effectMult: number): number {
  const fervorAmount = Math.max(0, fervorPoints);
  return 1 + (Math.log10(fervorAmount + 1) * 0.15) * effectMult;
}

export function calculateFervorRate(
  baseRate: number,
  prodMult: number,
  faithPoints: number,
  synergyMult: number,
  hasSynergy: boolean
): number {
  let synergyBonus = 0;
  if (hasSynergy) {
    synergyBonus = Math.pow(Math.max(0, faithPoints), 0.25) * 0.15 * synergyMult;
  }
  return (baseRate * prodMult) + synergyBonus;
}

export function calculateFaithPerClick(
  clickBuffMult: number,
  globalBuffMult: number,
  fervorClickMult: number,
  fervorFaithBonus: number
): number {
  const base = 1;
  const fpc = base * clickBuffMult * globalBuffMult * fervorClickMult * fervorFaithBonus;
  return Math.max(1, Math.floor(fpc));
}

export function calculateFaithPerSecond(
  followers: BuyableItem[],
  monuments: BuyableItem[],
  fervorFollowersMult: number,
  monumentBuffMult: number,
  passiveBuffMult: number,
  globalBuffMult: number,
  fervorFaithBonus: number,
  relicFaithMult: number = 1.0
): number {
  const followersOutput = followers.reduce((acc, curr) => acc + curr.count * curr.baseEffect, 0) * fervorFollowersMult;
  const monumentsOutput = monuments.reduce((acc, curr) => acc + curr.count * curr.baseEffect, 0) * monumentBuffMult;
  const totalBase = followersOutput + monumentsOutput;
  return totalBase * passiveBuffMult * globalBuffMult * fervorFaithBonus * relicFaithMult;
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return String(Math.floor(num));
}

export function calculateMaxAffordableFollowers(
  item: BuyableItem,
  currentFaith: number,
  discountMultiplier: number = 1.0,
  customMultiplier?: number
): { count: number; totalCost: number } {
  let count = 0;
  let totalCost = 0;
  let remainingFaith = currentFaith;
  let tempCount = item.count;
  const mult = customMultiplier !== undefined ? customMultiplier : item.costMultiplier;

  while (true) {
    let nextCost = Math.floor(item.baseCost * Math.pow(mult, tempCount));
    if (item.id === 'f_devotee') {
      nextCost = Math.floor(nextCost * discountMultiplier);
    }
    nextCost = Math.max(1, nextCost);

    if (remainingFaith >= nextCost) {
      remainingFaith -= nextCost;
      totalCost += nextCost;
      count += 1;
      tempCount += 1;
      if (count >= 10000) break;
    } else {
      break;
    }
  }

  return { count, totalCost };
}

export function calculateRelicsToGet(faith: number): number {
  if (faith < 100) return 0;
  // Based on DodecaDragons formula: log2(faith + 1) * 1.75 (~25 Relics at 20,000 Faith, matching reference image)
  return Math.max(0, Math.floor(Math.log2(faith + 1) * 1.75));
}

export function calculateExtraRelicsPerSecond(bestRelics: number): number {
  return Math.max(1, Math.floor(bestRelics / 10));
}

export function calculateRelicFaithMultiplier(relicPoints: number, level: number): number {
  if (level <= 0) return 1.0;
  // Based on DodecaDragons: (log10(relics + 1) + 1) ^ (level * 1.2)
  return Math.pow(Math.log10(Math.max(0, relicPoints) + 1) + 1, level * 1.2);
}
