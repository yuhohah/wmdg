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
  portraitSrc?: string;
  maxHp: number;
  riftDamagePercent: number;
  riftIntervalSec: number;
  riftWindowSec: number;
  altarDamageOnMiss: number;
  /** Ambient altar integrity erosion (% per second) before cult mitigation */
  altarPressurePerSec?: number;
  /** Target resource readiness benchmarks for this boss */
  requirements?: {
    faithLog: number;
    followers: number;
    fervorLog: number;
    fervorLevels: number;
    relicsLog: number;
    relicLevels: number;
    incarnationStage: number;
    gnoseLog: number;
    gnoseNodes: number;
  };
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
  /** Current boss phase (1 = Vigília, 2 = Fúria Divina below 60% HP, 3 = Apocalipse below 25% HP) */
  phase?: 1 | 2 | 3;
  /** Consecutive rifts shattered without missing any */
  comboStreak?: number;
}

export interface BossCombatBreakdown {
  faithBonus: number;
  followersBonus: number;
  fervorBonus: number;
  relicsBonus: number;
  incarnationBonus: number;
  gnoseBonus: number;
  achievementsBonus: number;
  totalResourceMultiplier: number;
  /** Cult Readiness vs Boss target benchmarks (0.15 to 2.5+) */
  cultReadiness: number;
  passiveHpFractionPerSec: number;
  passiveDps: number;
  clickHpFraction: number;
  clickDamage: number;
  riftHpFraction: number;
  riftDamage: number;
  altarDamageOnMiss: number;
  altarHealOnRift: number;
  /** Continuous Altar Integrity drain per second after defense mitigation */
  altarPressurePerSec: number;
  /** Estimated passive time to defeat boss (seconds) */
  estimatedPassiveVictorySec: number;
  /** Estimated time until Altar breaks if no rifts are shattered (seconds) */
  estimatedAltarSurvivalSec: number;
}

export interface GnoseSaveData {
  automationAccumulatorSec?: number;
  gnosePoints: number;
  totalGnoseEarned: number;
  gnoseResets: number;
  unlockedUpgrades: string[];
  defeatedBosses?: string[];
  bossCurseTimerSec?: number;
  confirmReset: boolean;
  autoFollowersEnabled: boolean;
  autoFervorEnabled: boolean;
  /** Passive transmutation unlocked by Olho do Infinito. */
  autoRelicsEnabled?: boolean;
  autoRelicUpgradesEnabled?: boolean;
  /** Legacy income budgets are accepted on import but no longer used. */
  autoFollowersBudget?: number;
  autoFervorBudget?: number;
}
