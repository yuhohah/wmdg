import { GameStateManager } from '../core/GameState.js';
import { INCARNATION_STAGES } from '../config/incarnation.js';
import { calculateFervorUpgradeCost } from '../systems/calculations.js';
import { GNOSE_UPGRADES } from '../config/gnose.js';
import type {
  PlayerArchetype,
  ArchetypeBenchmarkResult,
  MilestoneRecord,
  DeadZone,
  BenchmarkReport
} from './types.js';
import { formatDuration } from './reporters.js';

export class ProgressionSimulator {
  public static runArchetype(archetype: PlayerArchetype): ArchetypeBenchmarkResult {
    const gs = new GameStateManager();
    const milestones: MilestoneRecord[] = [];
    const deadZones: DeadZone[] = [];
    const notes: string[] = [];
    let gameTimeSec = 0;
    let relicResets = 0;
    let gnoseResets = 0;
    let maxWaitSec = 0;

    // Tempo de reação médio definido por perfil (Active: 3s, Casual: 5s, AFK: 0s / acumulação por lote)
    const reactionDelaySec = archetype === 'active' ? 3.0 : archetype === 'casual' ? 5.0 : 0.0;

    const recordedMilestones = new Set<string>();

    const recordMilestone = (id: string, name: string, details?: string) => {
      if (recordedMilestones.has(id)) return;
      recordedMilestones.add(id);
      milestones.push({
        id,
        name,
        gameTimeSec,
        formattedTime: formatDuration(gameTimeSec),
        faith: gs.faithPoints,
        fervor: gs.fervorPoints,
        relics: gs.relicPoints,
        gnose: gs.gnosePoints,
        details
      });
    };

    // 1. Kickstart Early Game: Click until 1st Follower (20 Faith)
    const earlyClicksNeeded = 20;
    const clickSpeed = archetype === 'active' ? 5 : archetype === 'casual' ? 2 : 1; // clicks/sec
    const earlyTime = earlyClicksNeeded / clickSpeed;
    gameTimeSec += earlyTime;
    for (let c = 0; c < earlyClicksNeeded; c++) {
      gs.addClick();
    }
    gs.buyOneFollower(0);
    recordMilestone('first_follower', '1º Fiel Devoto', 'Início da geração passiva (+1 Fé/s)');

    const MAX_STEPS = 40000;
    let stepCount = 0;

    while (gs.unlockedGnoseUpgrades.size === 0 && stepCount < MAX_STEPS) {
      stepCount++;

      // Check current phase for DeadZone threshold
      const isEarly = !gs.isIncarnationUnlocked();
      const isMid = !gs.isGnoseUnlocked();
      const deadZoneThreshold = isEarly ? 300 : isMid ? 1200 : 7200;

      // Milestone checks from current state
      if (gs.isIncarnationUnlocked()) {
        recordMilestone('unlock_incarnation', 'Selo da Encarnação', 'Libera Fervor e Altar');
      }
      if (gs.isFervorUpgradesUnlocked()) {
        recordMilestone('unlock_fervor_upgrades', 'Selo do Fervor', 'Libera Ritos de Fervor');
      }
      if (gs.incarnationStage >= 2) {
        recordMilestone('incarnation_stage_2', 'Avatar Consagrado', '100x Fervor/s');
      }
      if (gs.isRelicsUnlocked()) {
        recordMilestone('unlock_relics', 'Selo das Relíquias', 'Libera Transmutação e Fragmentos');
      }
      if (gs.isGnoseUnlocked()) {
        recordMilestone('unlock_gnose', 'Selo da Gnose', 'Câmara da Gnose acessível (1Q Fé)');
      }

      // Check Gnose Reset Trigger (Target: enough to buy at least 1 Gnose upgrade, e.g. gn_init_faith cost 1)
      if (gs.isGnoseUnlocked()) {
        const gnoseToGet = gs.getGnoseToGet();
        if (gs.gnosePoints + gnoseToGet >= 1) {
          gs.performGnoseReset();
          gnoseResets++;
          recordMilestone('first_gnose_reset', '1º Despertar Gnóstico', `Ganho: +${gnoseToGet} Gnose`);

          // Buy first Gnose upgrade
          const firstUpg = GNOSE_UPGRADES[0];
          if (gs.canBuyGnoseUpgrade(firstUpg)) {
            gs.buyGnoseUpgrade(firstUpg.id);
            recordMilestone('first_gnose_upgrade', '1º Upgrade da Gnose', firstUpg.name);
            break; // Goal reached!
          }
        }
      }

      // Check Relic Reset Trigger
      if (gs.isRelicsUnlocked()) {
        const toGet = gs.getRelicsToGet();
        const shouldResetRelics =
          toGet >= 15 && (toGet >= Math.max(20, gs.relicPoints * 1.5) || gs.relicPoints === 0);
        if (shouldResetRelics) {
          const res = gs.convertFaithToRelics();
          if (res.success) {
            relicResets++;
            recordMilestone(
              'first_relic_reset',
              '1ª Transmutação Relíquias',
              `Ganho: +${res.gained} Fragmentos`
            );
            continue;
          }
        }
      }

      // Evaluate candidate actions to fast-forward
      type Candidate = {
        name: string;
        timeToAffordSec: number;
        execute: () => boolean;
        priority: number; // lower number = higher priority
      };

      const candidates: Candidate[] = [];
      const fps = Math.max(0.001, gs.getFaithPerSecond());
      const fervorRate = Math.max(0, gs.getFervorRatePerSecond());
      const relicsRate = Math.max(0, gs.getRelicsRatePerSecond());

      // Priority 1: Mechanic Unlocks
      for (const unlock of gs.unlocks) {
        if (!unlock.unlocked) {
          // Check prerequisites
          if (unlock.prerequisiteId) {
            const req = gs.unlocks.find((u) => u.id === unlock.prerequisiteId);
            if (!req || !req.unlocked) continue;
          }
          const pool = unlock.costCurrency === 'fervor' ? gs.fervorPoints : gs.faithPoints;
          const rate = unlock.costCurrency === 'fervor' ? fervorRate : fps;
          if (rate > 0) {
            const time = Math.max(0, (unlock.cost - pool) / rate);
            candidates.push({
              name: `Desbloquear ${unlock.name}`,
              timeToAffordSec: time,
              execute: () => gs.buyUnlock(unlock),
              priority: 1
            });
          }
          break; // unlocks are strictly sequential
        }
      }

      // Priority 2: Incarnation Stage
      const nextStage = INCARNATION_STAGES.find((s) => s.stage === gs.incarnationStage + 1);
      if (nextStage && gs.isIncarnationUnlocked()) {
        const cost = gs.getIncarnationStageCost(nextStage);
        const time = Math.max(0, (cost - gs.faithPoints) / fps);
        // Only prioritize if affordable within 30 minutes
        if (time < 1800) {
          candidates.push({
            name: `Encarnação para Estágio ${nextStage.stage} (${nextStage.name})`,
            timeToAffordSec: time,
            execute: () => gs.upgradeIncarnation(),
            priority: 2
          });
        }
      }

      // Priority 3: Followers (Devotees)
      const devotee = gs.followers[0];
      if (devotee) {
        const cost = gs.getItemCost(devotee);
        const time = Math.max(0, (cost - gs.faithPoints) / fps);
        candidates.push({
          name: `Comprar Fiel Devoto`,
          timeToAffordSec: time,
          execute: () => {
            if (gs.isConvertMaxUnlocked()) {
              return gs.buyMaxFollowers(0).success;
            }
            return gs.buyOneFollower(0);
          },
          priority: 3
        });
      }

      // Priority 4: Fervor Upgrades
      if (gs.isFervorUpgradesUnlocked() && fervorRate > 0) {
        for (const upg of gs.fervorUpgrades) {
          if (upg.id === 'fu_relics' && !gs.isPhoenixRelicUnlocked()) continue;
          const cost = calculateFervorUpgradeCost(upg);
          const time = Math.max(0, (cost - gs.fervorPoints) / fervorRate);
          candidates.push({
            name: `Upgrade Fervor: ${upg.name}`,
            timeToAffordSec: time,
            execute: () => gs.buyFervorUpgrade(upg),
            priority: 4
          });
        }
      }

      // Priority 5: Relic Upgrades
      if (gs.isRelicsUnlocked() && relicsRate > 0) {
        for (const relic of gs.relicUpgrades) {
          if (relic.level < relic.maxLevel) {
            const time = Math.max(0, (relic.cost - gs.relicPoints) / relicsRate);
            candidates.push({
              name: `Restaurar Relíquia: ${relic.name}`,
              timeToAffordSec: time,
              execute: () => gs.buyRelicUpgrade(relic),
              priority: 5
            });
          }
        }
      }

      // Filter and pick best candidate
      if (candidates.length === 0) {
        // Fallback tick
        gameTimeSec += 60;
        gs.tick(60);
        continue;
      }

      // Sort by priority first, then by shortest timeToAffordSec
      candidates.sort((a, b) => {
        if (a.timeToAffordSec === 0 && b.timeToAffordSec === 0) {
          return a.priority - b.priority;
        }
        // If one is immediately affordable, take it
        if (a.timeToAffordSec === 0) return -1;
        if (b.timeToAffordSec === 0) return 1;

        // If unlock is affordable in under 3 minutes, prioritize it over tiny upgrades
        if (a.priority === 1 && a.timeToAffordSec < 180) return -1;
        if (b.priority === 1 && b.timeToAffordSec < 180) return 1;

        return a.timeToAffordSec - b.timeToAffordSec;
      });

      const chosen = candidates[0];
      // O tempo de espera total é o tempo para acumular o recurso + o tempo de reação humana até clicar
      const waitTime = Math.max(0.1, chosen.timeToAffordSec) + (chosen.timeToAffordSec > 0 ? reactionDelaySec : 0);

      // Dead Zone Detection
      if (waitTime > deadZoneThreshold) {
        deadZones.push({
          phase: isEarly ? 'early' : isMid ? 'mid' : 'late',
          startTimeSec: gameTimeSec,
          durationSec: waitTime,
          formattedDuration: formatDuration(waitTime),
          targetAction: chosen.name,
          reason: `Espera de ${formatDuration(waitTime)} excedeu o limiar de tolerância (${formatDuration(deadZoneThreshold)})`
        });
      }

      if (waitTime > maxWaitSec) {
        maxWaitSec = waitTime;
      }

      // Fast-forward time
      gameTimeSec += waitTime;
      gs.tick(waitTime);

      // Archetype-specific behavioral simulation:
      // Active player keeps blessing active
      if (archetype === 'active' && gs.isIncarnationUnlocked()) {
        gs.addIncarnationBoost(60);
      }

      // Execute chosen action
      chosen.execute();
    }

    // Determine balance summary score
    let summaryScore: 'Excelente' | 'Balanceado' | 'Lento' | 'Gargalo Crítico' = 'Excelente';
    if (deadZones.length > 3 || maxWaitSec > 14400) {
      summaryScore = 'Gargalo Crítico';
      notes.push('Excesso de Zonas Mortas ou espera superior a 4 horas.');
    } else if (deadZones.length > 0 || maxWaitSec > 3600) {
      summaryScore = 'Lento';
      notes.push('Existem gargalos pontuais onde o jogador espera mais de 1 hora.');
    } else if (gameTimeSec < 86400 * 3) {
      summaryScore = 'Balanceado';
    }

    const archNames: Record<PlayerArchetype, string> = {
      active: 'Devoto Fervoroso (Ativo)',
      casual: 'Devoto Regular (Casual/Híbrido)',
      afk: 'Ocioso Puro (AFK)'
    };

    return {
      archetype,
      archetypeName: archNames[archetype],
      totalSimulatedTimeSec: gameTimeSec,
      formattedTotalTime: formatDuration(gameTimeSec),
      milestones,
      relicResets,
      gnoseResets,
      deadZones,
      maxWaitSec,
      formattedMaxWait: formatDuration(maxWaitSec),
      firstGnoseUpgradeBought: gs.unlockedGnoseUpgrades.values().next().value,
      summaryScore,
      bottleneckNotes: notes
    };
  }

  public static runFullBenchmark(): BenchmarkReport {
    return {
      timestamp: Date.now(),
      results: {
        active: this.runArchetype('active'),
        casual: this.runArchetype('casual'),
        afk: this.runArchetype('afk')
      }
    };
  }
}
