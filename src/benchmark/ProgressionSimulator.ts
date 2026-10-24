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

/** Priority order for buying all 20 Gnose nodes to maximize Faith & Gnose gain speed */
const GNOSE_PURCHASE_PRIORITY: string[] = [
  // Tier 1
  'gn_init_faith',
  'gn_memoria_selos',
  'gn_init_fervor',
  'gn_dilatacao',
  'gn_click_power',
  // Tier 2 (unlocked after defeating Anúbis)
  'gn_followers_syn',
  'gn_keep_relics',
  'gn_bencao_eterna',
  'gn_altar_resonance',
  'gn_alchemical_mind',
  // Tier 3 (unlocked after defeating Cronos)
  'gn_followers_cubic',
  'gn_gnose_mult',
  'gn_fu1_boost',
  'gn_synergy_boost',
  'gn_relic_resonance',
  // Tier 4 (unlocked after defeating Odin)
  'gn_omniscience',
  'gn_auto_followers',
  'gn_auto_fervor',
  'gn_auto_relics',
  'gn_apotheosis'
];

export class ProgressionSimulator {
  /**
   * Simulates a Boss Battle encounter (no 60s timer, Altar Integrity vs Boss HP + Rifts + Sphere Clicks)
   * and returns the elapsed combat duration in seconds.
   */
  private static simulateBossFight(gs: GameStateManager, bossId: string, archetype: PlayerArchetype): number {
    if (!gs.startBossBattle(bossId)) return 0;

    const fightClickCps = archetype === 'active' ? 5.0 : archetype === 'casual' ? 3.5 : 2.5;
    let fightElapsedSec = 0;
    const dt = 0.5;
    let clickAcc = 0;

    while (gs.activeBossBattle && fightElapsedSec < 60) {
      fightElapsedSec += dt;
      gs.tick(dt);
      if (!gs.activeBossBattle) break;

      while (gs.activeBossBattle && gs.activeBossBattle.activeRifts.length > 0) {
        const riftId = gs.activeBossBattle.activeRifts[0].id;
        gs.clickBossRift(riftId);
      }
      if (!gs.activeBossBattle) break;

      clickAcc += fightClickCps * dt;
      while (clickAcc >= 1.0 && gs.activeBossBattle) {
        clickAcc -= 1.0;
        gs.addClick();
      }
    }

    return fightElapsedSec;
  }

  private static getNextTargetGnoseUpgrade(gs: GameStateManager) {
    for (const id of GNOSE_PURCHASE_PRIORITY) {
      if (!gs.hasGnoseUpgrade(id)) {
        const upg = GNOSE_UPGRADES.find((u) => u.id === id);
        if (upg && gs.isGnoseTierUnlocked(upg.tier)) {
          const prereqsOk = upg.prerequisites.every((r) => gs.hasGnoseUpgrade(r));
          if (prereqsOk) return upg;
        }
      }
    }
    return undefined;
  }

  /**
   * Batch purchases affordable levels of a Fervor Upgrade so post-Gnose runs execute in < 100ms.
   */
  private static buyBatchFervorUpgrade(gs: GameStateManager, upgIndex: number): boolean {
    const upg = gs.fervorUpgrades[upgIndex];
    if (!upg) return false;
    if (upg.id === 'fu_relics' && !gs.isPhoenixRelicUnlocked()) return false;

    let bought = false;
    let steps = 0;
    while (steps < 250) {
      const cost = calculateFervorUpgradeCost(upg);
      if (!Number.isFinite(cost) || gs.fervorPoints < cost) break;
      gs.fervorPoints -= cost;
      upg.level += 1;
      bought = true;
      steps += 1;
    }
    return bought;
  }

  public static runArchetype(archetype: PlayerArchetype): ArchetypeBenchmarkResult {
    const gs = new GameStateManager();
    const milestones: MilestoneRecord[] = [];
    const deadZones: DeadZone[] = [];
    const notes: string[] = [];
    let gameTimeSec = 0;
    let relicResets = 0;
    let gnoseResets = 0;
    let miraclesCaught = 0;
    let maxWaitSec = 0;
    let firstGnoseUpgradeBought: string | undefined;

    // Tempo de reação médio definido por perfil (Active: 3s, Casual: 5s, AFK: 0s / acumulação por lote)
    const reactionDelaySec = archetype === 'active' ? 3.0 : archetype === 'casual' ? 5.0 : 0.0;

    // Cadência de cliques estratégicos pós-1º Fiel (Ativo: 2.0 cliques/s na Esfera; Casual e AFK: 0 cliques/s)
    const sustainedClickCps = archetype === 'active' ? 2.0 : 0.0;

    // Cadência e taxa determinística de coleta de Milagres:
    const miracleCatchRate = archetype === 'active' ? 0.95 : archetype === 'casual' ? 0.40 : 0.0;
    let timeSinceLastMiracleSpawnSec = 0;
    let miracleCatchAccumulator = 0.5;

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
    gs.checkAchievements();
    recordMilestone('first_follower', '1º Fiel Devoto', 'Início da geração passiva (+1 Fé/s)');

    const MAX_STEPS = 20000;
    let stepCount = 0;

    while (!gs.isBossDefeated('boss_tiamat') && stepCount < MAX_STEPS) {
      stepCount++;

      // Unlock any earned achievements so their permanent buffs apply
      gs.checkAchievements();

      // Active player keeps Blessing 100% active as soon as Incarnation is unlocked
      if (archetype === 'active' && gs.isIncarnationUnlocked()) {
        gs.addIncarnationBoost(60);
      }

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

      // 2. Challenge Guardian Bosses as soon as the previous Gnose Tier is completed
      const tier1Complete = GNOSE_UPGRADES.filter((u) => u.tier === 1).every((u) =>
        gs.hasGnoseUpgrade(u.id)
      );
      if (tier1Complete && gs.canChallengeBoss('boss_anubis')) {
        const fightSec = this.simulateBossFight(gs, 'boss_anubis', archetype);
        gameTimeSec += fightSec + reactionDelaySec;
        if (gs.isBossDefeated('boss_anubis')) {
          recordMilestone('boss_anubis', 'Guardião 1: Anúbis', 'Libera Tier II da Gnose (+50% Fé/Fervor)');
          continue;
        }
      }

      const tier2Complete = GNOSE_UPGRADES.filter((u) => u.tier === 2).every((u) =>
        gs.hasGnoseUpgrade(u.id)
      );
      if (tier2Complete && gs.canChallengeBoss('boss_cronos')) {
        const fightSec = this.simulateBossFight(gs, 'boss_cronos', archetype);
        gameTimeSec += fightSec + reactionDelaySec;
        if (gs.isBossDefeated('boss_cronos')) {
          recordMilestone('boss_cronos', 'Guardião 2: Cronos', 'Libera Tier III da Gnose (+50% Fé/Fervor)');
          continue;
        }
      }

      const tier3Complete = GNOSE_UPGRADES.filter((u) => u.tier === 3).every((u) =>
        gs.hasGnoseUpgrade(u.id)
      );
      if (tier3Complete && gs.canChallengeBoss('boss_odin')) {
        const fightSec = this.simulateBossFight(gs, 'boss_odin', archetype);
        gameTimeSec += fightSec + reactionDelaySec;
        if (gs.isBossDefeated('boss_odin')) {
          recordMilestone('boss_odin', 'Guardião 3: Odin', 'Libera Tier IV da Gnose (+50% Fé/Fervor)');
          continue;
        }
      }

      // Buy any affordable Gnose upgrades in priority order
      let boughtGnoseUpg = false;
      while (true) {
        const nextUpg = this.getNextTargetGnoseUpgrade(gs);
        if (nextUpg && gs.canBuyGnoseUpgrade(nextUpg)) {
          gs.buyGnoseUpgrade(nextUpg.id);
          boughtGnoseUpg = true;
          if (!firstGnoseUpgradeBought) {
            firstGnoseUpgradeBought = nextUpg.id;
            recordMilestone('first_gnose_upgrade', '1º Upgrade da Gnose', nextUpg.name);
          }
          if (gs.unlockedGnoseUpgrades.size === GNOSE_UPGRADES.length) {
            recordMilestone('gnose_tree_complete', 'Árvore da Gnose (20/20)', 'Todos os 20 nós assimilados');
          }
        } else {
          break;
        }
      }
      if (boughtGnoseUpg) {
        continue;
      }

      // Challenge Final Endgame Boss: Tiamat once all 20/20 Gnose nodes are bought
      if (gs.canChallengeBoss('boss_tiamat')) {
        const fightSec = this.simulateBossFight(gs, 'boss_tiamat', archetype);
        gameTimeSec += fightSec + reactionDelaySec;
        gs.checkAchievements();
        if (gs.isBossDefeated('boss_tiamat')) {
          recordMilestone('boss_tiamat', 'Chefe Final: Tiamat', 'Crepúsculo dos Deuses concluído (×10 Fé/Fervor)');
          break;
        }
      }

      // After a Gnose Reset, if Faith is at starting 1000 and we have 0 followers, immediately recruit 1st follower (or use clickSpeed)
      if (gs.gnoseResets > 0 && gs.getTotalFollowersCount() === 0) {
        if (gs.faithPoints < 20) {
          gs.addClick();
          gameTimeSec += 1 / clickSpeed;
        }
        if (gs.isConvertMaxUnlocked()) {
          gs.buyMaxFollowers(0);
        } else {
          gs.buyOneFollower(0);
        }
        if (gs.getTotalFollowersCount() > 0) {
          continue;
        }
      }

      // Check Gnose Reset Trigger:
      if (gs.isGnoseUnlocked()) {
        const gnoseToGet = gs.getGnoseToGet();
        const nextUpg = this.getNextTargetGnoseUpgrade(gs);
        if (nextUpg && gnoseToGet > 0) {
          const neededForNext = Math.max(1, nextUpg.cost - gs.gnosePoints);
          if (gnoseToGet >= neededForNext) {
            gs.performGnoseReset();
            gnoseResets++;
            gs.checkAchievements();
            recordMilestone('first_gnose_reset', '1º Despertar Gnóstico', `Ganho: +${gnoseToGet} Gnose`);
            continue;
          }
        }
      }

      // Check if an Incarnation Stage is immediately affordable before resetting Faith for Relics
      const nextIncStage = INCARNATION_STAGES.find((s) => s.stage === gs.incarnationStage + 1);
      if (
        nextIncStage &&
        gs.isIncarnationUnlocked() &&
        gs.faithPoints >= gs.getIncarnationStageCost(nextIncStage)
      ) {
        if (gs.upgradeIncarnation()) {
          if (gs.incarnationStage >= 2) {
            recordMilestone('incarnation_stage_2', 'Avatar Consagrado', '100x Fervor/s');
          }
          continue;
        }
      }

      // Check Relic Reset Trigger
      const hasPassiveRelicGen =
        gs.hasGnoseUpgrade('gn_keep_relics') ||
        gs.hasGnoseUpgrade('gn_auto_relics') ||
        (gs.relicUpgrades[4]?.level ?? 0) >= 1;
      if (gs.isRelicsUnlocked() && !hasPassiveRelicGen) {
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
      } else if (gs.isRelicsUnlocked() && gs.bestRelicsToGet === 0 && gs.getRelicsToGet() >= 15) {
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

      // Evaluate candidate actions to fast-forward
      type Candidate = {
        name: string;
        timeToAffordSec: number;
        execute: () => boolean;
        priority: number; // lower number = higher priority
      };

      const candidates: Candidate[] = [];
      const passiveFps = gs.getFaithPerSecond();
      const clickFps = sustainedClickCps * gs.getFaithPerClick();
      const fps = Math.max(0.001, passiveFps + clickFps);
      const fervorRate = Math.max(0, gs.getFervorRatePerSecond());
      const relicsRate = Math.max(0, gs.getRelicsRatePerSecond());

      // Priority 1: Mechanic Unlocks
      for (const unlock of gs.unlocks) {
        if (!unlock.unlocked) {
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
          break;
        }
      }

      // Priority 1.5: Direct Faith target for next Gnose Reset (once Relics are active in a post-Gnose run)
      const hasGnoseAuto =
        (gs.hasGnoseUpgrade('gn_auto_followers') && gs.autoFollowersEnabled) ||
        (gs.hasGnoseUpgrade('gn_auto_fervor') && gs.autoFervorEnabled);

      if (gs.isGnoseUnlocked() && gs.isRelicsUnlocked()) {
        const nextUpg = this.getNextTargetGnoseUpgrade(gs);
        if (nextUpg) {
          const neededGnose = Math.max(1, nextUpg.cost - gs.gnosePoints);
          const gnoseMult = gs.getGnoseGainMultiplier();
          const rawTargetFaith = 1e15 * Math.pow(neededGnose / gnoseMult, 1 / 0.15);
          const targetFaith = Number.isFinite(rawTargetFaith) ? rawTargetFaith : gs.faithPoints + fps * 600;
          if (fps > 0) {
            const timeToGnose = Math.max(0, (targetFaith - gs.faithPoints) / fps);
            const relicsReady = gs.hasGnoseUpgrade('gn_keep_relics') || (gs.relicUpgrades[0]?.level ?? 0) >= 8;
            if (timeToGnose < 3600 || hasGnoseAuto || relicsReady) {
              candidates.push({
                name: `Acumular Fé para Ascensão Gnóstica (+${neededGnose} Gnose -> ${nextUpg.name})`,
                timeToAffordSec: Math.min(timeToGnose, 90),
                execute: () => true,
                priority: timeToGnose < 60 ? 2 : 3
              });
            }
          }
        }
      }

      // Priority 2: Incarnation Stage
      if (nextIncStage && gs.isIncarnationUnlocked()) {
        const cost = gs.getIncarnationStageCost(nextIncStage);
        const time = Math.max(0, (cost - gs.faithPoints) / fps);
        if (time < 1800) {
          candidates.push({
            name: `Encarnação para Estágio ${nextIncStage.stage} (${nextIncStage.name})`,
            timeToAffordSec: time,
            execute: () => gs.upgradeIncarnation(),
            priority: 2
          });
        }
      }

      // Priority 3: Followers (Devotees)
      const devotee = gs.followers[0];
      if (devotee && !(gs.hasGnoseUpgrade('gn_auto_followers') && gs.autoFollowersEnabled)) {
        const cost = gs.getItemCost(devotee);
        if (Number.isFinite(cost) && (gs.gnoseResets === 0 || cost / fps < 8)) {
          const time = Math.max(0, (cost - gs.faithPoints) / fps);
          candidates.push({
            name: `Comprar Fiel Devoto`,
            timeToAffordSec: time,
            execute: () => {
              if (gs.gnoseResets > 0) {
                let bought = false;
                while (gs.followers[0]) {
                  const nextCost = gs.getItemCost(gs.followers[0]);
                  const curFps = Math.max(1, gs.getFaithPerSecond() + sustainedClickCps * gs.getFaithPerClick());
                  if (gs.faithPoints < nextCost || (gs.followers[0].count > 0 && nextCost / curFps >= 8)) {
                    break;
                  }
                  if (!gs.buyOneFollower(0)) break;
                  bought = true;
                }
                return bought;
              }
              if (gs.isConvertMaxUnlocked()) {
                return gs.buyMaxFollowers(0).success;
              }
              return gs.buyOneFollower(0);
            },
            priority: 3
          });
        }
      }

      // Priority 4: Fervor Upgrades (batch purchase in post-Gnose to avoid micro-steps)
      if (gs.isFervorUpgradesUnlocked() && fervorRate > 0 && !(gs.hasGnoseUpgrade('gn_auto_fervor') && gs.autoFervorEnabled)) {
        gs.fervorUpgrades.forEach((upg, idx) => {
          if (upg.id === 'fu_relics' && !gs.isPhoenixRelicUnlocked()) return;
          const cost = calculateFervorUpgradeCost(upg);
          if (!Number.isFinite(cost)) return;
          const time = Math.max(0, (cost - gs.fervorPoints) / fervorRate);
          candidates.push({
            name: `Upgrade Fervor: ${upg.name}`,
            timeToAffordSec: time,
            execute: () =>
              gs.gnoseResets > 0
                ? this.buyBatchFervorUpgrade(gs, idx)
                : gs.buyFervorUpgrade(upg),
            priority: 4
          });
        });
      }

      // Priority 5: Relic Upgrades
      if (gs.isRelicsUnlocked() && relicsRate > 0) {
        for (const relic of gs.relicUpgrades) {
          if (relic.level < relic.maxLevel) {
            const time = Math.max(0, (relic.cost - gs.relicPoints) / relicsRate);
            candidates.push({
              name: `Restaurar Relíquia: ${relic.name}`,
              timeToAffordSec: time,
              execute: () => {
                if (gs.gnoseResets > 0) {
                  let any = false;
                  while (relic.level < relic.maxLevel && gs.relicPoints >= relic.cost) {
                    gs.buyRelicUpgrade(relic);
                    any = true;
                  }
                  return any;
                }
                return gs.buyRelicUpgrade(relic);
              },
              priority: 5
            });
          }
        }
      }

      if (candidates.length === 0) {
        const stepSec = 15;
        for (let s = 0; s < stepSec; s += 3) {
          gs.tick(3);
        }
        gameTimeSec += stepSec;
        continue;
      }

      candidates.sort((a, b) => {
        if (a.timeToAffordSec === 0 && b.timeToAffordSec === 0) {
          return a.priority - b.priority;
        }
        if (a.timeToAffordSec === 0) return -1;
        if (b.timeToAffordSec === 0) return 1;

        const aMajor = a.priority <= 2 && a.timeToAffordSec < 180;
        const bMajor = b.priority <= 2 && b.timeToAffordSec < 180;
        if (aMajor && !bMajor) return -1;
        if (!aMajor && bMajor) return 1;

        return a.timeToAffordSec - b.timeToAffordSec;
      });

      const chosen = candidates[0];
      const isPostGnoseBatch = gs.gnoseResets > 0 && chosen.timeToAffordSec === 0;
      const waitTime = isPostGnoseBatch
        ? 0.5
        : Math.max(0.1, chosen.timeToAffordSec) + (chosen.timeToAffordSec > 0 ? reactionDelaySec : 0);

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

      // Fast-forward time in slices (use 5s slices in Gnose phase so we never overshoot target Gnose or miss automation ticks)
      const avgMiracleIntervalSec = 50;
      const maxSliceSec = gs.isGnoseUnlocked() ? 5 : avgMiracleIntervalSec;
      const targetNextUpg = gs.isGnoseUnlocked() ? this.getNextTargetGnoseUpgrade(gs) : undefined;
      const targetNeededGnose = targetNextUpg ? Math.max(1, targetNextUpg.cost - gs.gnosePoints) : 0;

      let remainingWait = waitTime;
      while (remainingWait > 0) {
        const dt = Math.min(remainingWait, maxSliceSec);
        remainingWait -= dt;
        gameTimeSec += dt;

        if (archetype === 'active' && gs.isIncarnationUnlocked()) {
          gs.addIncarnationBoost(60);
        }

        gs.tick(dt);

        if (sustainedClickCps > 0) {
          const clicksInSlice = Math.max(0, Math.floor(sustainedClickCps * dt));
          if (clicksInSlice > 0) {
            const fpc = gs.getFaithPerClick();
            const clickFaith = fpc * clicksInSlice;
            gs.faithPoints += clickFaith;
            gs.totalFaithAccumulated += clickFaith;
            gs.totalClicks += clicksInSlice;
          }
        }

        if (miracleCatchRate > 0 && gs.followers[0] && gs.followers[0].count > 0) {
          timeSinceLastMiracleSpawnSec += dt;
          while (timeSinceLastMiracleSpawnSec >= avgMiracleIntervalSec) {
            timeSinceLastMiracleSpawnSec -= avgMiracleIntervalSec;
            miracleCatchAccumulator += miracleCatchRate;
            if (miracleCatchAccumulator >= 1.0) {
              miracleCatchAccumulator -= 1.0;
              const currentFps = gs.getFaithPerSecond();
              const minReward = Math.max(30, gs.getFaithPerClick() * 15);
              const calculated = Math.floor(30 * currentFps + 0.10 * gs.faithPoints);
              const finalReward = Math.max(minReward, calculated);
              gs.faithPoints += finalReward;
              gs.totalFaithAccumulated += finalReward;
              miraclesCaught++;
            }
          }
        }

        if (targetNextUpg && gs.getGnoseToGet() >= targetNeededGnose) {
          break;
        }
      }

      if (gs.isIncarnationUnlocked()) {
        if (archetype === 'active') {
          gs.addIncarnationBoost(60);
        } else if (archetype === 'casual') {
          gs.addIncarnationBoost(6);
        }
      }

      chosen.execute();
    }

    // Determine balance summary score
    let summaryScore: 'Excelente' | 'Balanceado' | 'Lento' | 'Gargalo Crítico' = 'Balanceado';
    if (deadZones.length > 3 || maxWaitSec > 14400) {
      summaryScore = 'Gargalo Crítico';
      notes.push('Excesso de Zonas Mortas ou espera superior a 4 horas.');
    } else if (deadZones.length > 0 || maxWaitSec > 3600) {
      summaryScore = 'Lento';
      notes.push('Existem gargalos pontuais onde o jogador espera mais de 1 hora.');
    } else if (deadZones.length === 0 && gameTimeSec < 18000 && maxWaitSec < 300) {
      summaryScore = 'Excelente';
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
      miraclesCaught,
      bossesDefeated: gs.defeatedBosses.size,
      gnoseUpgradesBought: gs.unlockedGnoseUpgrades.size,
      deadZones,
      maxWaitSec,
      formattedMaxWait: formatDuration(maxWaitSec),
      firstGnoseUpgradeBought,
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
