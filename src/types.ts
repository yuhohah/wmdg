export type EffectType = 'fps' | 'fpc';

export type BuffType =
  | 'fpc_mult'
  | 'fps_mult'
  | 'global_mult'
  | 'cost_discount';

export interface BuyableItem {
  id: string;
  name: string;
  desc: string;
  lore: string;
  symbol: string;
  artUrl?: string;
  baseCost: number;
  costMultiplier: number;
  benefitText: string;
  count: number;
  baseEffect: number;
  effectType: EffectType;
}

export interface FervorUpgrade {
  id: string;
  name: string;
  desc: string;
  lore: string;
  icon: string;
  baseCost: number;
  costMultiplier: number;
  level: number;
}

export interface GameState {
  faith: number;
  totalFaith: number;
  clicks: number;
  followers: number;
  fps: number;
  fervor: number;
  relics?: number;
  totalRelics?: number;
}

export interface AchievementProgress {
  current: number;
  target: number;
  percent: number;
  label: string;
}

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  lore: string;
  icon: string;
  unlocked: boolean;
  buffText: string;
  buffType: BuffType;
  buffVal: number;
  check: (state: GameState) => boolean;
  getProgress: (state: GameState) => AchievementProgress;
}

export interface MechanicUnlock {
  id: string;
  name: string;
  desc: string;
  lore: string;
  symbol: string;
  cost: number;
  costCurrency: 'faith' | 'fervor';
  unlocked: boolean;
  tabId?: string;
  tabName?: string;
  prerequisiteId?: string;
}

export interface RelicUpgrade {
  id: string;
  name: string;
  desc: string;
  lore: string;
  icon: string;
  cost: number;
  level: number;
  maxLevel: number;
  effectText: (level: number, relicPoints?: number) => string;
}
