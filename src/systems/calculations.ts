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

export function calculateCostDiscountMultiplier(_achievements: Achievement[]): number {
  return 1.0;
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
  fervorFaithBonus: number
): number {
  const base = 1;
  const fpc = base * clickBuffMult * globalBuffMult * fervorClickMult * fervorFaithBonus;
  return Math.max(1, Math.floor(fpc));
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
  const followersOutput = followers.reduce((acc, curr) => acc + curr.count * curr.baseEffect, 0)
    * fervorFollowersMult
    * incarnationFollowerMult;
  return followersOutput * passiveBuffMult * globalBuffMult * fervorFaithBonus * relicFaithMult * incarnationBoostMult;
}

const NUMBER_UNITS = [
  { val: 1e15, symbol: 'Q' },
  { val: 1e12, symbol: 'T' },
  { val: 1e9,  symbol: 'B' },
  { val: 1e6,  symbol: 'M' },
  { val: 1e3,  symbol: 'K' },
];

export function formatNumber(num: number): string {
  if (isNaN(num) || !isFinite(num)) return '0';
  if (num < 0) return '-' + formatNumber(-num);

  // 1. Notação Científica além de Quadrilhão (a partir de 1e18 / 1000Q): 1.0 até 9.9 eX
  if (num >= 1e18) {
    let exponent = Math.floor(Math.log10(num));
    let mantissa = num / Math.pow(10, exponent);

    // Ajuste se o arredondamento para 1 decimal der 10.0 (ex: 9.96e18 -> 1.0e19)
    if (Number(mantissa.toFixed(1)) >= 10) {
      mantissa /= 10;
      exponent += 1;
    }

    return `${mantissa.toFixed(1)}e${exponent}`;
  }

  // 2. Notação por letras até o Quadrilhão (K, M, B, T, Q)
  for (let i = 0; i < NUMBER_UNITS.length; i++) {
    const unit = NUMBER_UNITS[i];
    if (num >= unit.val) {
      const scaled = num / unit.val;
      let formatted: string;

      if (scaled >= 100) {
        formatted = scaled.toFixed(1);
      } else {
        formatted = scaled.toFixed(2);
      }

      // Se o arredondamento atingir 1000 (ex: 999.96K vira 1M; 999.96T vira 1Q)
      if (Number(formatted) >= 1000) {
        if (i === 0) {
          // Se for 1000Q, transiciona para notação científica
          return '1.0e18';
        }
        const nextUnit = NUMBER_UNITS[i - 1];
        const nextScaled = num / nextUnit.val;
        let nextFormatted = nextScaled >= 100 ? nextScaled.toFixed(1) : nextScaled.toFixed(2);
        nextFormatted = nextFormatted
          .replace(/\.00$/, '')
          .replace(/(\.[0-9])0$/, '$1')
          .replace(/\.0$/, '');
        return `${nextFormatted}${nextUnit.symbol}`;
      }

      // Remove zeros desnecessários (.00 -> '', .50 -> .5, .0 -> '')
      formatted = formatted
        .replace(/\.00$/, '')
        .replace(/(\.[0-9])0$/, '$1')
        .replace(/\.0$/, '');

      return `${formatted}${unit.symbol}`;
    }
  }

  // 3. Menor que 1000
  if (num < 10 && num > 0 && num % 1 !== 0) {
    return num.toFixed(1);
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
  if (faith <= 0) return 0;
  // Fórmula DodecaDragons: floor(log2(faith + 1)) (com 20.000.000 de Fé, rende 24 relíquias)
  return Math.max(0, Math.floor(Math.log2(faith + 1)));
}

export function calculateExtraRelicsPerSecond(bestRelics: number): number {
  return Math.max(1, Math.floor(bestRelics / 10));
}

export function calculateRelicFaithMultiplier(relicPoints: number, level: number): number {
  if (level <= 0) return 1.0;
  // Based on DodecaDragons: (log10(relics + 1) + 1) ^ (level * 1.2)
  return Math.pow(Math.log10(Math.max(0, relicPoints) + 1) + 1, level * 1.2);
}
