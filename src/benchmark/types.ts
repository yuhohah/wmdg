export type PlayerArchetype = 'active' | 'casual' | 'afk';

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
  summaryScore: 'Excelente' | 'Balanceado' | 'Lento' | 'Gargalo Crítico';
  bottleneckNotes: string[];
}

export interface BenchmarkReport {
  timestamp: number;
  results: Record<PlayerArchetype, ArchetypeBenchmarkResult>;
}
