export type PlayerArchetype = 'reference' | 'active' | 'casual' | 'afk';

export type ManualAction = 'sphere' | 'blessing' | 'miracle' | 'rift' | 'follower'
  | 'fervor' | 'relic' | 'unlock' | 'incarnation' | 'transmutation' | 'gnose' | 'gnose_confirm' | 'gnose_upgrade' | 'challenge' | 'automation_toggle';

export interface BenchmarkEvent {
  timeSec: number;
  kind: 'action' | 'arrive' | 'leave' | 'miracle_spawn' | 'miracle_expire';
  action?: ManualAction;
  present: boolean;
}

export interface SimulationOptions {
  seed?: number;
  behavior?: Partial<import('./behavior.js').PlayerBehavior>;
  absenceMode?: 'visible' | 'hidden' | 'save';
  stopAfterUpgrade?: string;
  resetPolicy?: 'immediate' | 'short' | 'medium' | 'long';
  purchasePriority?: 'cost' | 'comfort' | 'production';
  onSnapshot?: (timeSec: number, save: import('../systems/saveSystem.js').SaveData) => void;
  maxDurationSec?: number;
  /** Numerical reference is at most 100 ms, matching the normal game loop. */
  stepSec?: number;
  initialSave?: import('../systems/saveSystem.js').SaveData;
  onEvent?: (event: BenchmarkEvent) => void;
}

export interface MilestoneRecord {
  id: string;
  name: string;
  gameTimeSec: number;
  formattedTime: string;
  faith: number;
  fervor: number;
  relics: number;
  gnose: number;
  details?: string;
}

export interface DeadZone {
  phase: 'early' | 'mid' | 'late';
  startTimeSec: number;
  durationSec: number;
  formattedDuration: string;
  targetAction: string;
  reason: string;
}

export interface ArchetypeBenchmarkResult {
  progression: import('./CampaignMetrics.js').CampaignMetricsResult;
  status: 'completed' | 'time_limit' | 'blocked';
  blockedReason?: string;
  completed: boolean;
  seed: number;
  maxDurationSec: number;
  stepSec: number;
  presentTimeSec: number;
  awayTimeSec: number;
  visits: number;
  manualActions: number;
  actionsByType: Partial<Record<ManualAction, number>>;
  sphereClicks: number;
  postGnoseRecoveryClicks: number;
  lastSphereClickSec?: number;
  lastManualBlessingSec?: number;
  criticalClicks: number;
  miraclesSpawned: number;
  maxPresentIdleSec: number;
  simulatedTickSeconds: number;
  finalResources: { faith: number; fervor: number; relics: number };
  archetype: PlayerArchetype;
  archetypeName: string;
  totalSimulatedTimeSec: number;
  formattedTotalTime: string;
  milestones: MilestoneRecord[];
  relicResets: number;
  gnoseResets: number;
  miraclesCaught: number;
  bossesDefeated: number;
  gnoseUpgradesBought: number;
  deadZones: DeadZone[];
  maxWaitSec: number;
  formattedMaxWait: string;
  firstGnoseUpgradeBought?: string;
  summaryScore: 'Excelente' | 'Balanceado' | 'Lento' | 'Gargalo Crítico' | 'Incompleto';
  bottleneckNotes: string[];
}

export interface BenchmarkReport {
  timestamp: number;
  results: Record<PlayerArchetype, ArchetypeBenchmarkResult>;
}

export type BenchmarkWorkerMessage =
  | { kind: 'progress'; profile: PlayerArchetype }
  | { kind: 'done'; report: BenchmarkReport }
  | { kind: 'error'; message: string };
