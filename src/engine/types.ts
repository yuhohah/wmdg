export type ResourceId = 'faith' | 'gems' | string;

export interface ResourceState {
  id: ResourceId;
  amount: number;
  totalEarned: number;
  peakAmount: number;
}

export interface UpgradeConfig {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  costMultiplier: number;
  baseOutput: number; // production per second per item
  clickMultiplier?: number; // bonus to manual adoration/click
  multiplierPerItem?: number; // multiplier applied to faithful output (e.g. +1.0 for +100%)
  icon: string;
  targetResource: ResourceId;
  consumesResource: ResourceId;
  unlockCost: number; // required peak faith to unlock
  unlockFielCount?: number; // required count of faithful to unlock
}

export interface UpgradeState {
  id: string;
  count: number; // quantity owned
  unlocked: boolean;
}

export interface GameStats {
  totalClicks: number;
  manualFaithEarned: number;
  startTime: number;
  playTimeSeconds: number;
  lastSaveTimestamp: number;
}

export interface GameState {
  version: number;
  resources: Record<ResourceId, ResourceState>;
  upgrades: Record<string, UpgradeState>;
  stats: GameStats;
  multipliers: {
    globalProduction: number;
    globalClick: number;
  };
}

export interface OfflineEarningsReport {
  elapsedSeconds: number;
  gains: Record<ResourceId, number>;
}

export type GameEventMap = {
  'tick': { dt: number; totalIncome: Record<ResourceId, number> };
  'resource:changed': { id: ResourceId; amount: number; delta: number; isManual: boolean };
  'upgrade:purchased': { upgradeId: string; newCount: number; cost: number };
  'click:produced': { resourceId: ResourceId; amount: number; screenX?: number; screenY?: number };
  'offline:collected': OfflineEarningsReport;
  'game:saved': { timestamp: number };
  'game:reset': void;
};
