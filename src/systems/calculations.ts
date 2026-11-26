import { PROGRESSION_BALANCE } from '../config/gnose.js';
import type { BuyableItem, FervorUpgrade, Achievement, BuffType } from '../types.js';

export const MIRACLE_BASE = {
  minFaith: 15,
  clickMultiplier: 8,
  fpsSeconds: 10,
} as const;

export function calculateMiracleReward(
  _faith: number,
  faithPerClick: number,
  faithPerSecond: number,
  miracleMultiplier: number = 1
): number {
  const mult = Math.max(1, miracleMultiplier);
  const minReward = Math.floor(MIRACLE_BASE.minFaith * mult);
  const clickReward = faithPerClick * (MIRACLE_BASE.clickMultiplier * mult);
  const passiveReward = Math.floor(faithPerSecond * (MIRACLE_BASE.fpsSeconds * mult));
  return Math.max(minReward, clickReward, passiveReward);
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

export function calculateFervorUpgradeCost(
  upg: FervorUpgrade,
  costMultiplier: number = upg.costMultiplier,
  level: number = upg.level
): number {
  return Math.floor(upg.baseCost * Math.pow(costMultiplier, level));
}

export function getFervorUpgradeMultiplier(
  upg: FervorUpgrade,
  followersCount: number = 0,
  faithPoints: number = 0,
  productionBase: number = 2,
  relicBase: number = 3,
  level: number = upg.level
): number {
  if (level <= 0) return 1.0;

  switch (upg.id) {
    case 'fu_prod':
      return Math.pow(productionBase, Math.pow(level, 0.6));

    case 'fu_effect':
      // DodecaDragons FU2: 1.25 ^ (level ^ 0.8)
      return Math.pow(1.25, Math.pow(level, 0.8));

    case 'fu_click':
      // DodecaDragons FU3: (level ^ 2.6) * 4 + 1
      return Math.pow(level, 2.6) * 4 + 1;

    case 'fu_followers':
      // DodecaDragons FU4: ((level ^ 1.5) * miners / 50) + 1
      return (Math.pow(level, 1.5) * followersCount / 50) + 1;

    case 'fu_synergy':
      // DodecaDragons FU5: ((level ^ 1.5) * log10(gold + 1) / 5) + 1
      return (Math.pow(level, 1.5) * Math.log10(Math.max(0, faithPoints) + 1) / 5) + 1;

    case 'fu_relics':
      // DodecaDragons FU6: 3 ^ (level ^ 0.6)
      return Math.pow(relicBase, Math.pow(level, 0.6));

    default:
      return 1.0;
  }
}

// Bônus de conquistas somam dentro da mesma categoria (ex: +10% e +20% de clique = +30%),
// e categorias diferentes se multiplicam entre si (clique × global, passiva × global).
const MAX_ACHIEVEMENT_COST_DISCOUNT = 0.5;

export interface AchievementBuffTotals {
  fpcMult: number;
  fpsMult: number;
  globalMult: number;
  costDiscount: number;
  fpcBase: number;
  fpcFpsPct: number;
  miracleMult: number;
  sphereAutoclick: number;
  nonClickCritChance: number;
  hasBossCrit: boolean;
}

interface CachedAchievementBuffs extends AchievementBuffTotals {
  len: number;
  maskLo: number;
  maskHi: number;
}

const achievementBuffCache = new WeakMap<Achievement[], CachedAchievementBuffs>();

export function getAchievementBuffTotals(achievements: Achievement[]): AchievementBuffTotals {
  const len = achievements.length;
  if (len <= 64) {
    let maskLo = 0;
    let maskHi = 0;
    const loEnd = Math.min(32, len);
    for (let i = 0; i < loEnd; i++) {
      if (achievements[i].unlocked) maskLo |= 1 << i;
    }
    for (let i = 32; i < len; i++) {
      if (achievements[i].unlocked) maskHi |= 1 << (i - 32);
    }
    const cached = achievementBuffCache.get(achievements);
    if (cached && cached.len === len && cached.maskLo === maskLo && cached.maskHi === maskHi) {
      return cached;
    }

    const next: CachedAchievementBuffs = cached ?? {
      len: 0,
      maskLo: 0,
      maskHi: 0,
      fpcMult: 0,
      fpsMult: 0,
      globalMult: 0,
      costDiscount: 0,
      fpcBase: 0,
      fpcFpsPct: 0,
      miracleMult: 0,
      sphereAutoclick: 0,
      nonClickCritChance: 0,
      hasBossCrit: false,
    };
    next.len = len;
    next.maskLo = maskLo;
    next.maskHi = maskHi;
    computeAchievementTotalsInto(achievements, next);
    if (!cached) achievementBuffCache.set(achievements, next);
    return next;
  }

  const uncached: AchievementBuffTotals = {
    fpcMult: 0,
    fpsMult: 0,
    globalMult: 0,
    costDiscount: 0,
    fpcBase: 0,
    fpcFpsPct: 0,
    miracleMult: 0,
    sphereAutoclick: 0,
    nonClickCritChance: 0,
    hasBossCrit: false,
  };
  computeAchievementTotalsInto(achievements, uncached);
  return uncached;
}

function computeAchievementTotalsInto(achievements: Achievement[], out: AchievementBuffTotals): void {
  let fpcMult = 0;
  let fpsMult = 0;
  let globalMult = 0;
  let costDiscount = 0;
  let fpcBase = 0;
  let fpcFpsPct = 0;
  let miracleMult = 0;
  let sphereAutoclick = 0;
  let nonClickCritChance = 0;
  let hasBossCrit = false;

  const applyBuff = (achId: string, buffType: BuffType, buffVal: number): void => {
    switch (buffType) {
      case 'fpc_mult':
        fpcMult += buffVal;
        break;
      case 'fps_mult':
        fpsMult += buffVal;
        break;
      case 'global_mult':
        globalMult += buffVal;
        break;
      case 'cost_discount':
        costDiscount += buffVal;
        break;
      case 'fpc_base':
        fpcBase += buffVal;
        break;
      case 'fpc_fps_pct':
        fpcFpsPct += buffVal;
        break;
      case 'miracle_mult':
        miracleMult += buffVal;
        break;
      case 'sphere_autoclick':
        sphereAutoclick += buffVal;
        break;
      case 'critical_chance':
        if (!achId.startsWith('ach_click_')) nonClickCritChance += buffVal;
        break;
      case 'boss_critical':
        hasBossCrit = true;
        break;
    }
  };

  for (let i = 0; i < achievements.length; i++) {
    const ach = achievements[i];
    if (!ach.unlocked) continue;
    applyBuff(ach.id, ach.buffType, ach.buffVal);
    if (ach.extraBuffs) {
      for (let j = 0; j < ach.extraBuffs.length; j++) {
        const extra = ach.extraBuffs[j];
        applyBuff(ach.id, extra.type, extra.val);
      }
    }
  }

  out.fpcMult = fpcMult;
  out.fpsMult = fpsMult;
  out.globalMult = globalMult;
  out.costDiscount = costDiscount;
  out.fpcBase = fpcBase;
  out.fpcFpsPct = fpcFpsPct;
  out.miracleMult = miracleMult;
  out.sphereAutoclick = sphereAutoclick;
  out.nonClickCritChance = nonClickCritChance;
  out.hasBossCrit = hasBossCrit;
}

export function calculateClickBuffMultiplier(achievements: Achievement[]): number {
  return 1 + getAchievementBuffTotals(achievements).fpcMult;
}

export function calculatePassiveBuffMultiplier(achievements: Achievement[]): number {
  return 1 + getAchievementBuffTotals(achievements).fpsMult;
}

export function calculateGlobalBuffMultiplier(achievements: Achievement[]): number {
  return 1 + getAchievementBuffTotals(achievements).globalMult;
}

export function calculateCostDiscountMultiplier(achievements: Achievement[]): number {
  const discount = Math.min(MAX_ACHIEVEMENT_COST_DISCOUNT, getAchievementBuffTotals(achievements).costDiscount);
  return 1 - discount;
}

export function calculateMiracleMultiplier(achievements: Achievement[]): number {
  return 1 + getAchievementBuffTotals(achievements).miracleMult;
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
  base: number = 1,
  faithPerSecond: number = 0,
  fpsToClickPct: number = 0
): number {
  const directClick = base * globalBuffMult * fervorClickMult * fervorFaithBonus;
  const passiveSynergy = Math.max(0, faithPerSecond) * Math.max(0, fpsToClickPct);
  const fpc = (directClick + passiveSynergy) * clickBuffMult;
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
  incarnationBoostMult: number = 1.0,
  extraIndex: number = -1,
  extraCount: number = 0
): number {
  let rawFollowersOutput = 0;
  for (let i = 0; i < followers.length; i++) {
    const curr = followers[i];
    const count = i === extraIndex ? curr.count + extraCount : curr.count;
    rawFollowersOutput += count * curr.baseEffect;
  }
  const followersOutput = rawFollowersOutput * fervorFollowersMult * incarnationFollowerMult;
  return followersOutput * passiveBuffMult * globalBuffMult * fervorFaithBonus * relicFaithMult * incarnationBoostMult;
}

export { formatNumber } from './numberFormat.js';

const EXACT_INTEGER_FLOAT_THRESHOLD = 9007199254740992; // 2^53: all IEEE-754 floats >= 2^53 are exact integers

let maxFollowersMemoId = '';
let maxFollowersMemoBase = -1;
let maxFollowersMemoStart = -1;
let maxFollowersMemoFaith = -1;
let maxFollowersMemoDiscount = -1;
let maxFollowersMemoMult = -1;
let maxFollowersMemoCount = 0;
let maxFollowersMemoCost = 0;

export function calculateMaxAffordableFollowers(
  item: BuyableItem,
  currentFaith: number,
  discountMultiplier: number = 1.0,
  customMultiplier?: number
): { count: number; totalCost: number } {
  const mult = customMultiplier !== undefined ? customMultiplier : item.costMultiplier;
  if (
    item.id === maxFollowersMemoId &&
    item.baseCost === maxFollowersMemoBase &&
    item.count === maxFollowersMemoStart &&
    currentFaith === maxFollowersMemoFaith &&
    discountMultiplier === maxFollowersMemoDiscount &&
    mult === maxFollowersMemoMult
  ) {
    return { count: maxFollowersMemoCount, totalCost: maxFollowersMemoCost };
  }

  const isDevotee = item.id === 'f_devotee';
  const effDiscount = isDevotee ? discountMultiplier : 1.0;

  let firstCost = Math.floor(item.baseCost * Math.pow(mult, item.count));
  if (isDevotee) firstCost = Math.floor(firstCost * discountMultiplier);
  if (!Number.isFinite(firstCost) || currentFaith <= 0) {
    return { count: 0, totalCost: 0 };
  }
  firstCost = Math.max(1, firstCost);
  if (currentFaith < firstCost) {
    maxFollowersMemoId = item.id;
    maxFollowersMemoBase = item.baseCost;
    maxFollowersMemoStart = item.count;
    maxFollowersMemoFaith = currentFaith;
    maxFollowersMemoDiscount = discountMultiplier;
    maxFollowersMemoMult = mult;
    maxFollowersMemoCount = 0;
    maxFollowersMemoCost = 0;
    return { count: 0, totalCost: 0 };
  }

  let count = 0;
  let totalCost = 0;
  let remainingFaith = currentFaith;
  let tempCount = item.count;

  // 1. Exact per-term floor prefix while individual costs have fractional bits (< 2^53)
  while (count < 10000) {
    const raw = item.baseCost * Math.pow(mult, tempCount);
    if (!Number.isFinite(raw)) break;
    let nextCost = Math.floor(raw);
    if (isDevotee) nextCost = Math.floor(nextCost * discountMultiplier);
    if (!Number.isFinite(nextCost)) break;
    nextCost = Math.max(1, nextCost);

    if (nextCost >= EXACT_INTEGER_FLOAT_THRESHOLD && mult > 1.000001) {
      // 2. Closed-form geometric series tail: above 2^53 every IEEE-754 float is already an exact integer
      const maxRemainingSteps = 10000 - count;
      const a0 = raw * effDiscount;
      if (remainingFaith >= a0 && Number.isFinite(a0)) {
        const logMult = Math.log(mult);
        const ratio = (remainingFaith * (mult - 1)) / a0;
        const maxBeforeOverflow = Math.max(
          0,
          Math.floor((Math.log(Number.MAX_VALUE) - Math.log(a0)) / logMult)
        );
        let n = Math.min(
          maxRemainingSteps,
          maxBeforeOverflow,
          Math.floor((Number.isFinite(ratio) ? Math.log1p(ratio) : Math.log(remainingFaith) + Math.log(mult - 1) - Math.log(a0)) / logMult)
        );
        const geomCost = (steps: number): number =>
          steps <= 0 ? 0 : (a0 * Math.expm1(steps * logMult)) / (mult - 1);

        while (n > 0 && (!Number.isFinite(geomCost(n)) || geomCost(n) > remainingFaith)) {
          n--;
        }
        while (
          n < maxRemainingSteps &&
          n < maxBeforeOverflow &&
          Number.isFinite(geomCost(n + 1)) &&
          geomCost(n + 1) <= remainingFaith
        ) {
          n++;
        }
        if (n > 0) {
          const tailCost = geomCost(n);
          remainingFaith -= tailCost;
          totalCost += tailCost;
          count += n;
          tempCount += n;
        }
      }
      break;
    }

    if (remainingFaith >= nextCost) {
      remainingFaith -= nextCost;
      totalCost += nextCost;
      count += 1;
      tempCount += 1;
    } else {
      break;
    }
  }

  maxFollowersMemoId = item.id;
  maxFollowersMemoBase = item.baseCost;
  maxFollowersMemoStart = item.count;
  maxFollowersMemoFaith = currentFaith;
  maxFollowersMemoDiscount = discountMultiplier;
  maxFollowersMemoMult = mult;
  maxFollowersMemoCount = count;
  maxFollowersMemoCost = totalCost;

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
  const {
    gnoseProductionScale: scale, gnoseProductionExponent: exponent,
    gnoseProductionEarlyScale: earlyScale, gnoseProductionRamp: ramp,
  } = PROGRESSION_BALANCE;
  const campaignWeight = totalGnoseEarned / (totalGnoseEarned + ramp);
  return 1 + earlyScale * Math.sqrt(totalGnoseEarned)
    + scale * Math.pow(totalGnoseEarned, exponent) * campaignWeight ** 2;
}

export function calculateGnoseFollowersSynergyMultiplier(
  followersCount: number,
  hasFollowersSyn: boolean,
  exponent: number = 1.5,
  scale: number = 1
): number {
  if (!hasFollowersSyn || followersCount <= 0) return 1.0;
  return 1 + scale * Math.pow(followersCount, exponent);
}
