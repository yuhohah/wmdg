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
  gnosePoints?: number;
  totalGnoseEarned?: number;
  gnoseResets?: number;
  defeatedBossesCount?: number;
  tiamatDefeated?: boolean;
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

// --- Gnose (True Prestige) & Mythological Guardians Types ---

export interface GnoseUpgrade {
  id: string;
  name: string;
  title: string;
  desc: string;
  lore: string;
  icon: string;
  tier: 1 | 2 | 3 | 4;
  cost: number;
  prerequisites: string[];
  effectText: string;
}

export interface GnoseBoss {
  id: string;
  name: string;
  title: string;
  mythology: string;
  symbol: string;
  unlocksTier: 2 | 3 | 4 | 'endgame';
  maxHp: number;
  riftDamagePercent: number;
  riftIntervalSec: number;
  riftWindowSec: number;
  altarDamageOnMiss: number;
  rewardName: string;
  rewardDesc: string;
  lore: string;
  faithFervorMult: number;
}

export interface BossRift {
  id: string;
  xPercent: number;
  yPercent: number;
  remainingSec: number;
  maxSec: number;
}

export interface ActiveBossBattle {
  bossId: string;
  bossHp: number;
  bossMaxHp: number;
  altarIntegrity: number;
  maxAltarIntegrity: number;
  riftSpawnTimerSec: number;
  sphereCooldownSec: number;
  activeRifts: BossRift[];
  riftsShattered: number;
  riftsMissed: number;
}

export interface BossCombatBreakdown {
  faithBonus: number;
  followersBonus: number;
  fervorBonus: number;
  relicsBonus: number;
  incarnationBonus: number;
  gnoseBonus: number;
  totalResourceMultiplier: number;
  passiveHpFractionPerSec: number;
  passiveDps: number;
  clickHpFraction: number;
  clickDamage: number;
  riftHpFraction: number;
  riftDamage: number;
  altarDamageOnMiss: number;
  altarHealOnRift: number;
}

export interface GnoseSaveData {
  gnosePoints: number;
  totalGnoseEarned: number;
  gnoseResets: number;
  unlockedUpgrades: string[];
  defeatedBosses?: string[];
  bossCurseTimerSec?: number;
  confirmReset: boolean;
  autoFollowersEnabled: boolean;
  autoFervorEnabled: boolean;
  autoRelicsEnabled?: boolean;
  autoFollowersBudget?: number;
  autoFervorBudget?: number;
}
