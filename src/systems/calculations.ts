import type { BuyableItem, FervorUpgrade, Achievement, BuffType } from '../types.js';

export function calculateMiracleReward(_faith: number, faithPerClick: number, faithPerSecond: number): number {
  return Math.max(30, faithPerClick * 15, Math.floor(30 * faithPerSecond));
}

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

export function calculateFervorUpgradeCost(upg: FervorUpgrade, costMultiplier: number = upg.costMultiplier): number {
  return Math.floor(upg.baseCost * Math.pow(costMultiplier, upg.level));
}

// Bônus de conquistas somam dentro da mesma categoria (ex: +10% e +20% de clique = +30%),
// e categorias diferentes se multiplicam entre si (clique × global, passiva × global).
const MAX_ACHIEVEMENT_COST_DISCOUNT = 0.5;

function sumAchievementBuffs(achievements: Achievement[], type: BuffType): number {
  let acc = 0;
  for (let i = 0; i < achievements.length; i++) {
    const ach = achievements[i];
    if (ach.unlocked && ach.buffType === type) {
      acc += ach.buffVal;
    }
  }
  return acc;
}

export function calculateClickBuffMultiplier(achievements: Achievement[]): number {
  return 1 + sumAchievementBuffs(achievements, 'fpc_mult');
}

export function calculatePassiveBuffMultiplier(achievements: Achievement[]): number {
  return 1 + sumAchievementBuffs(achievements, 'fps_mult');
}

export function calculateGlobalBuffMultiplier(achievements: Achievement[]): number {
  return 1 + sumAchievementBuffs(achievements, 'global_mult');
}

export function calculateCostDiscountMultiplier(achievements: Achievement[]): number {
  const discount = Math.min(MAX_ACHIEVEMENT_COST_DISCOUNT, sumAchievementBuffs(achievements, 'cost_discount'));
  return 1 - discount;
}

export function calculateIncarnationFollowerMultiplier(fervorPoints: number, stage: number): number {
  if (fervorPoints <= 0 || stage <= 0) return 1.0;
  // Fórmula estilo DodecaDragons (Opção C): 1 + log10(1 + Fervor / 150) * 1.5 * Estágio
  const fervorRatio = Math.max(0, fervorPoints) / 150;
  return 1 + Math.log10(1 + fervorRatio) * 1.5 * Math.max(1, stage);
}

export function calculateFervorFaithBonus(fervorPoints: number, effectMult: number): number {
  const fervorAmount = Math.max(0, fervorPoints);
  // Fórmula DodecaDragons: (log10(fire / 10 + 1) * 2 + 1) * (1.25 ^ (level ^ 0.8))
  return (Math.log10(fervorAmount / 10 + 1) * 2 + 1) * effectMult;
}

export function calculateFervorRate(
  baseRate: number,
  prodMult: number,
  synergyMult: number = 1.0
): number {
  return baseRate * prodMult * synergyMult;
}

export function calculateFaithPerClick(
  clickBuffMult: number,
  globalBuffMult: number,
  fervorClickMult: number,
  fervorFaithBonus: number,
  base: number = 1
): number {
  const fpc = base * clickBuffMult * globalBuffMult * fervorClickMult * fervorFaithBonus;
  // Sem arredondar para baixo: senão bônus pequenos (+10%, +20%) sumiriam no início do jogo
  return Math.max(1, fpc);
}

export function calculateFaithPerSecond(
  followers: BuyableItem[],
  fervorFollowersMult: number,
  incarnationFollowerMult: number,
  passiveBuffMult: number,
  globalBuffMult: number,
  fervorFaithBonus: number,
  relicFaithMult: number = 1.0,
  incarnationBoostMult: number = 1.0
): number {
  let rawFollowersOutput = 0;
  for (let i = 0; i < followers.length; i++) {
    const curr = followers[i];
    rawFollowersOutput += curr.count * curr.baseEffect;
  }
  const followersOutput = rawFollowersOutput * fervorFollowersMult * incarnationFollowerMult;
  return followersOutput * passiveBuffMult * globalBuffMult * fervorFaithBonus * relicFaithMult * incarnationBoostMult;
}

export { formatNumber } from './numberFormat.js';

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
    if (!Number.isFinite(nextCost)) break;
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

export function calculateRelicsToGet(faith: number, relicBonusMult: number = 1.0): number {
  if (faith <= 0) return 0;
  // Fórmula DodecaDragons: floor(log2(faith + 1) * relicBonusMult) (com 20.000.000 de Fé, rende 24 relíquias base)
  return Math.max(0, Math.floor(Math.log2(Math.max(0, faith) + 1) * relicBonusMult));
}

export function calculateExtraRelicsPerSecond(bestRelics: number): number {
  return Math.max(1, Math.floor(bestRelics / 10));
}

export function calculateRelicFaithMultiplier(relicPoints: number, level: number): number {
  if (level <= 0) return 1.0;
  // Based on DodecaDragons: (log10(relics + 1) + 1) ^ (level * 1.2)
  return Math.pow(Math.log10(Math.max(0, relicPoints) + 1) + 1, level * 1.2);
}

export function calculateGnoseToGet(faith: number, gainExponent: number = 0.25): number {
  if (faith < 1e15) return 0;
  return Math.max(1, Math.floor(Math.pow(faith / 1e15, gainExponent)));
}

export function calculateFaithForNextGnose(faith: number, gainExponent: number = 0.25): number {
  if (faith < 1e15) return 1e15;
  return 1e15 * Math.pow(calculateGnoseToGet(faith, gainExponent) + 1, 1 / gainExponent);
}

export function calculateTotalGnoseMultiplier(totalGnoseEarned: number): number {
  if (totalGnoseEarned <= 0) return 1.0;
  return 1 + Math.pow(totalGnoseEarned, 0.35) * 1.5;
}

export function calculateGnoseFollowersSynergyMultiplier(
  followersCount: number,
  hasFollowersSyn: boolean,
  exponent: number = 1.5
): number {
  if (!hasFollowersSyn || followersCount <= 0) return 1.0;
  return 1 + Math.pow(followersCount, exponent);
}
