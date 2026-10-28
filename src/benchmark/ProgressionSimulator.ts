import { GameStateManager } from '../core/GameState.js';
import { INCARNATION_STAGES, BLESSING_SECONDS_PER_PRESS } from '../config/incarnation.js';
import { GNOSE_UPGRADES } from '../config/gnose.js';
import { GNOSE_BOSSES } from '../config/bosses.js';
import { calculateMiracleReward } from '../systems/calculations.js';
import { PLAYER_BEHAVIORS, createSeededRandom, describeBehavior, manualBlessingAllowed, manualSphereAllowed, routineClicksAvailable, VisitSchedule } from './behavior.js';
import { ProgressTracker } from './ProgressTracker.js';
import { formatDuration } from './reporters.js';
import type { ArchetypeBenchmarkResult, BenchmarkReport, ManualAction, MilestoneRecord, PlayerArchetype, SimulationOptions } from './types.js';

interface Decision {
  key: string;
  action: ManualAction;
  execute: () => boolean;
}

const DEFAULT_SEED = 0xc0172;
const DEFAULT_HORIZON_SEC = 72 * 3600;
const EPSILON = 1e-8;

class Simulation {
  private readonly game = new GameStateManager();
  private readonly behavior;
  private readonly visits: VisitSchedule;
  private readonly randomMiracles: () => number;
  private readonly randomClicks: () => number;
  private readonly progress = new ProgressTracker();
  private readonly seed: number;
  private readonly horizon: number;
  private readonly step: number;
  private time = 0;
  private presentTime = 0;
  private tickSeconds = 0;
  private nextInteraction = 0;
  private nextSphere = 0;
  private pending: { decision: Decision; due: number } | null = null;
  private awaitingConfirmation = false;
  private miracleCooldown = 5;
  private miracle: { born: number; expires: number; willing: boolean } | null = null;
  private miraclesSpawned = 0;
  private miraclesCaught = 0;
  private clicks = 0;
  private recoveryClicks = 0;
  private lastSphereClickSec: number | undefined;
  private lastManualBlessingSec: number | undefined;
  private criticalClicks = 0;
  private occasionalBlessingPresses = 0;
  private relicResets = 0;
  private gnoseResets = 0;
  private blockedReason: string | undefined;
  private actions: Partial<Record<ManualAction, number>> = {};
  private readonly milestones: MilestoneRecord[] = [];
  private readonly milestoneIds = new Set<string>();

  constructor(private archetype: PlayerArchetype, private options: SimulationOptions) {
    this.seed = options.seed ?? DEFAULT_SEED;
    this.horizon = options.maxDurationSec ?? DEFAULT_HORIZON_SEC;
    this.step = options.stepSec ?? 0.1;
    if (!Number.isFinite(this.seed) || !Number.isInteger(this.seed)) throw new Error('Seed deve ser um inteiro finito.');
    if (!Number.isFinite(this.horizon) || this.horizon < 0) throw new Error('Duração inválida.');
    if (!Number.isFinite(this.step) || this.step <= 0 || this.step > 0.1) throw new Error('Passo deve estar entre 0 e 0,1 s.');
    this.behavior = PLAYER_BEHAVIORS[archetype];
    this.visits = new VisitSchedule(this.behavior, createSeededRandom(this.seed ^ 0x513a));
    this.randomMiracles = createSeededRandom(this.seed ^ 0xa117);
    this.randomClicks = createSeededRandom(this.seed ^ 0xc11c);
    if (options.initialSave) this.game.applySaveData(options.initialSave);
    this.recordMilestones();
  }

  public run(): ArchetypeBenchmarkResult {
    let previousProgress = this.signature();
    while (this.time + EPSILON < this.horizon && !this.completed()) {
      // Every elapsed interval advances the same state, including visits and reaction delays.
      const dt = Math.min(this.step, this.horizon - this.time, this.visits.nextTransitionSec - this.time);
      if (dt > EPSILON) {
        this.game.tick(dt);
        this.tickSeconds += dt;
        this.progress.advance(dt, this.visits.present);
        if (this.visits.present) this.presentTime += dt;
        this.time += dt;
        this.updateMiracle(dt);
        this.game.checkAchievements();
      }
      const transition = this.visits.update(this.time);
      if (transition) {
        this.emit(transition);
        this.pending = null;
        this.occasionalBlessingPresses = 0;
        this.nextInteraction = this.time;
        this.nextSphere = this.time;
      }
      if (this.visits.present && this.time < this.horizon - EPSILON) this.interact();
      this.game.checkAchievements();
      const signature = this.signature();
      if (signature !== previousProgress) {
        this.progress.progress(this.time, !this.game.isIncarnationUnlocked() ? 'early' : !this.game.isGnoseUnlocked() ? 'mid' : 'late');
        previousProgress = signature;
        this.recordMilestones();
      }
      if (!manualSphereAllowed(this.behavior, this.time) && !this.canRecoverAfterGnose() && this.game.gnoseResets > 0
        && this.game.hasGnoseUpgrade('gn_init_faith') && this.game.getTotalFollowersCount() === 0
        && this.game.getFaithPerSecond() === 0 && this.game.faithPoints < this.game.getItemCost(this.game.followers[0])) {
        this.blockedReason = 'Após a Ascensão, não há fiéis nem Fé para recrutá-los. Emanação Primordial só fornece 1.000 Fé no próximo reset; não há cliques de recuperação disponíveis para reiniciar a produção.';
        break;
      }
    }
    this.progress.finish();
    const completed = this.completed();
    const score = !completed ? 'Incompleto'
      : this.progress.deadZones.length > 3 || this.progress.maxPresentIdleSec > 14400 ? 'Gargalo Crítico'
        : this.progress.deadZones.length > 0 || this.progress.maxPresentIdleSec > 3600 ? 'Lento'
          : this.progress.maxPresentIdleSec < 300 && this.presentTime < 5 * 3600 ? 'Excelente' : 'Balanceado';
    return {
      status: completed ? 'completed' : this.blockedReason ? 'blocked' : 'time_limit', completed, seed: this.seed,
      blockedReason: this.blockedReason,
      maxDurationSec: this.horizon, stepSec: this.step,
      presentTimeSec: this.presentTime, awayTimeSec: this.time - this.presentTime,
      visits: this.visits.visits, manualActions: Object.values(this.actions).reduce((sum, count) => sum + count, 0),
      actionsByType: { ...this.actions }, sphereClicks: this.clicks, postGnoseRecoveryClicks: this.recoveryClicks, criticalClicks: this.criticalClicks,
      lastSphereClickSec: this.lastSphereClickSec, lastManualBlessingSec: this.lastManualBlessingSec,
      miraclesSpawned: this.miraclesSpawned, maxPresentIdleSec: this.progress.maxPresentIdleSec,
      simulatedTickSeconds: this.tickSeconds,
      finalResources: { faith: this.game.faithPoints, fervor: this.game.fervorPoints, relics: this.game.relicPoints },
      archetype: this.archetype, archetypeName: this.behavior.name,
      totalSimulatedTimeSec: this.time, formattedTotalTime: formatDuration(this.time),
      milestones: this.milestones, relicResets: this.relicResets, gnoseResets: this.gnoseResets,
      miraclesCaught: this.miraclesCaught, bossesDefeated: this.game.defeatedBosses.size,
      gnoseUpgradesBought: this.game.unlockedGnoseUpgrades.size,
      deadZones: this.progress.deadZones, maxWaitSec: this.progress.maxWaitSec,
      formattedMaxWait: formatDuration(this.progress.maxWaitSec),
      firstGnoseUpgradeBought: this.milestones.find(m => m.id === 'first_gnose_upgrade')?.details,
      summaryScore: score,
      bottleneckNotes: [
        'Jogo aberto e visível: a produção continua durante a ausência do jogador. Não simula aba oculta nem save offline.',
        describeBehavior(this.archetype),
        'Gnose por menor custo entre nós elegíveis; reserva para Selos/Encarnação. Não é uma prova de estratégia ótima.',
        ...(this.blockedReason ? [this.blockedReason] : !completed ? [`Campanha não concluída no limite de ${formatDuration(this.horizon)}.`] : []),
      ],
    };
  }

  private emit(kind: 'action' | 'arrive' | 'leave' | 'miracle_spawn' | 'miracle_expire', action?: ManualAction): void {
    this.options.onEvent?.({ timeSec: this.time, kind, action, present: this.visits.present });
  }

  private completed(): boolean {
    return this.game.isBossDefeated('boss_tiamat') && GNOSE_UPGRADES.every(upgrade => this.game.hasGnoseUpgrade(upgrade.id));
  }

  private signature(): string {
    const g = this.game;
    return `${g.getTotalFollowersCount()}/${g.fervorUpgrades.reduce((s, u) => s + u.level, 0)}/${g.relicUpgrades.reduce((s, r) => s + r.level, 0)}/${g.unlocks.filter(u => u.unlocked).length}/${g.incarnationStage}/${g.gnoseResets}/${g.unlockedGnoseUpgrades.size}/${g.defeatedBosses.size}`;
  }

  private updateMiracle(dt: number): void {
    if (this.game.getTotalFollowersCount() === 0) { this.miracle = null; return; }
    if (this.miracle) {
      if (this.time + EPSILON >= this.miracle.expires) {
        this.miracle = null;
        this.emit('miracle_expire');
      }
      return; // Next cooldown is paused until the plea is collected or expires.
    }
    this.miracleCooldown -= dt;
    if (this.miracleCooldown <= EPSILON) {
      this.miracle = { born: this.time, expires: this.time + 15, willing: this.randomMiracles() < this.behavior.miracleCatchChance };
      this.miracleCooldown = 35 + this.randomMiracles() * 30;
      this.miraclesSpawned++;
      this.emit('miracle_spawn');
    }
  }

  private interact(): void {
    const g = this.game;
    if (!this.pending && !g.activeBossBattle) {
      const decision = this.chooseDecision();
      if (decision) this.pending = { decision, due: this.time + this.behavior.decisionDelaySec };
    }
    if (this.time + EPSILON < this.nextInteraction) return;

    let action: ManualAction | null = null;
    // All manual events share the same finite interaction budget.
    const rift = !this.awaitingConfirmation && g.activeBossBattle?.activeRifts.find(r => r.maxSec - r.remainingSec + EPSILON >= this.behavior.riftResponseSec);
    if (rift && g.clickBossRift(rift.id).shattered) {
      action = 'rift';
    } else if (!this.awaitingConfirmation && this.miracle?.willing && this.time + EPSILON >= this.miracle.born + this.behavior.miracleResponseSec) {
      const reward = calculateMiracleReward(g.faithPoints, g.getFaithPerClick(), g.getFaithPerSecond());
      g.faithPoints += reward;
      g.totalFaithAccumulated += reward;
      this.miracle = null;
      this.miraclesCaught++;
      action = 'miracle';
    } else if (this.pending && this.time + EPSILON >= this.pending.due) {
      // Re-evaluate eligibility: state may have changed during the reaction delay.
      const current = this.chooseDecision();
      const ready = this.pending.decision;
      this.pending = null;
      if (current?.key === ready.key && current.execute()) action = current.action;
    } else if (!this.awaitingConfirmation && manualBlessingAllowed(this.behavior, this.time)
      && g.isIncarnationUnlocked() && !g.hasGnoseUpgrade('gn_bencao_eterna')
      && ((this.behavior.blessingMode === 'maintain'
        && g.incarnationBoostTimer <= this.behavior.blessingTargetSec - BLESSING_SECONDS_PER_PRESS + EPSILON)
        || this.occasionalBlessingPresses > 0)) {
      g.addIncarnationBoost(BLESSING_SECONDS_PER_PRESS);
      this.occasionalBlessingPresses = Math.max(0, this.occasionalBlessingPresses - 1);
      action = 'blessing';
    }
    const recovery = !manualSphereAllowed(this.behavior, this.time) && this.canRecoverAfterGnose();
    if (!action && !this.awaitingConfirmation && (manualSphereAllowed(this.behavior, this.time) || recovery)) {
      const cps = g.activeBossBattle ? this.behavior.combatClickCps
        : g.getTotalFollowersCount() === 0 ? this.behavior.initialClickCps
          : routineClicksAvailable(this.behavior, this.time, this.visits.visitStartedAtSec) ? this.behavior.routineClickCps : 0;
      if (cps > 0 && this.time + EPSILON >= this.nextSphere) {
        const result = g.addClick(this.randomClicks);
        this.clicks++;
        if (recovery) this.recoveryClicks++;
        if (result.isCrit) this.criticalClicks++;
        this.nextSphere = this.nextSlot(this.nextSphere, 1 / cps);
        action = 'sphere';
      }
    }
    if (action) {
      if (action === 'sphere') this.lastSphereClickSec = this.time;
      if (action === 'blessing') this.lastManualBlessingSec = this.time;
      if (this.behavior.blessingMode === 'after_purchase' && manualBlessingAllowed(this.behavior, this.time)
        && ['follower', 'fervor', 'relic', 'unlock', 'incarnation', 'gnose_upgrade'].includes(action)) {
        this.occasionalBlessingPresses = Math.max(0,
          Math.ceil((this.behavior.blessingTargetSec - g.incarnationBoostTimer) / BLESSING_SECONDS_PER_PRESS));
      }
      this.actions[action] = (this.actions[action] ?? 0) + 1;
      this.nextInteraction = this.nextSlot(this.nextInteraction, 1 / this.behavior.maxInteractionCps);
      this.emit('action', action);
    }
  }

  /** Recover only a stalled post-Gnose economy; stop once recruitment is affordable. */
  private canRecoverAfterGnose(): boolean {
    const g = this.game;
    return this.behavior.postGnoseRecoveryClicks && g.gnoseResets > 0
      && !g.activeBossBattle && g.getTotalFollowersCount() === 0
      && g.getFaithPerSecond() === 0 && g.faithPoints < g.getItemCost(g.followers[0]);
  }

  /** Keep sub-tick fractions; idle time never builds a burst of deferred clicks. */
  private nextSlot(previous: number, interval: number): number {
    return (this.time - previous <= this.step + EPSILON ? previous : this.time) + interval;
  }

  private chooseDecision(): Decision | null {
    const g = this.game;
    const decision = (key: string, action: ManualAction, execute: () => boolean): Decision => ({ key, action, execute });
    const ascend = () => {
      this.awaitingConfirmation = false;
      const result = g.performGnoseReset();
      if (result.success) this.gnoseResets++;
      return result.success;
    };
    if (this.awaitingConfirmation) return decision('gnose-confirm', 'gnose_confirm', ascend);
    const follower = g.followers[0];
    const buyFollower = () => g.isConvertMaxUnlocked() ? g.buyMaxFollowers().success : g.buyOneFollower();
    if (g.getTotalFollowersCount() === 0 && g.faithPoints >= g.getItemCost(follower)) {
      return decision('bootstrap', 'follower', buyFollower);
    }
    const nextGnose = GNOSE_UPGRADES.filter(u => !g.hasGnoseUpgrade(u.id)
      && g.isGnoseTierUnlocked(u.tier) && u.prerequisites.every(id => g.hasGnoseUpgrade(id)))
      .sort((a, b) => a.cost - b.cost)[0];
    if (nextGnose && g.canBuyGnoseUpgrade(nextGnose)) {
      return decision(nextGnose.id, 'gnose_upgrade', () => g.buyGnoseUpgrade(nextGnose.id));
    }
    const boss = GNOSE_BOSSES.find(b => g.canChallengeBoss(b.id));
    if (boss && g.bossCurseTimerSec === 0) {
      return decision(boss.id, 'challenge', () => g.startBossBattle(boss.id));
    }
    if (nextGnose && g.getGnoseToGet() >= Math.max(1, nextGnose.cost - g.gnosePoints)) {
      return decision('gnose', 'gnose', () => {
        if (!g.confirmGnoseReset) return ascend();
        this.awaitingConfirmation = true;
        return true;
      });
    }
    const unlock = g.unlocks.find(u => !u.unlocked && (!u.prerequisiteId || g.unlocks.some(p => p.id === u.prerequisiteId && p.unlocked)));
    if (unlock && (unlock.costCurrency === 'fervor' ? g.fervorPoints : g.faithPoints) >= unlock.cost) {
      return decision(unlock.id, 'unlock', () => g.buyUnlock(unlock));
    }
    const incarnation = INCARNATION_STAGES.find(s => s.stage === g.incarnationStage + 1);
    if (incarnation && g.isIncarnationUnlocked() && g.faithPoints >= g.getIncarnationStageCost(incarnation)) {
      return decision(`incarnation-${incarnation.stage}`, 'incarnation', () => g.upgradeIncarnation());
    }
    const relic = g.isRelicsUnlocked() ? g.relicUpgrades.find(r => r.level < r.maxLevel && g.relicPoints >= r.cost) : undefined;
    if (relic) return decision(relic.id, 'relic', () => g.buyRelicUpgrade(relic));
    if (g.isFervorUpgradesUnlocked() && !(g.hasGnoseUpgrade('gn_automation') && g.autoFervorEnabled)) {
      const rito = g.fervorUpgrades.filter(u => (u.id !== 'fu_relics' || g.isPhoenixRelicUnlocked()) && g.fervorPoints >= g.getFervorUpgradeCost(u))
        .sort((a, b) => g.getFervorUpgradeCost(a) - g.getFervorUpgradeCost(b))[0];
      if (rito) return decision(rito.id, 'fervor', () => g.buyFervorUpgrade(rito));
    }
    const passiveRelics = (g.hasGnoseUpgrade('gn_automation') && g.autoRelicsEnabled) || g.relicUpgrades[4].level > 0;
    const transmute = g.getRelicsToGet();
    if (g.isRelicsUnlocked() && g.relicConvertCooldown === 0 && transmute >= 15
      && ((!passiveRelics && transmute >= Math.max(20, g.relicPoints * 1.5)) || g.bestRelicsToGet === 0)) {
      return decision('transmutation', 'transmutation', () => {
        const result = g.convertFaithToRelics();
        if (result.success) this.relicResets++;
        return result.success;
      });
    }
    const routineDuty = Number.isFinite(this.behavior.routineBurstEverySec)
      ? this.behavior.routineBurstDurationSec / this.behavior.routineBurstEverySec : 1;
    const routineCps = manualSphereAllowed(this.behavior, this.time) ? this.behavior.routineClickCps * routineDuty : 0;
    const fps = g.getFaithPerSecond() + routineCps * g.getFaithPerClick();
    const savingForUnlock = unlock?.costCurrency === 'faith' && fps > 0 && (unlock.cost - g.faithPoints) / fps < 180;
    const savingForIncarnation = incarnation && g.isIncarnationUnlocked() && fps > 0
      && (g.getIncarnationStageCost(incarnation) - g.faithPoints) / fps < 180;
    if (!savingForUnlock && !savingForIncarnation && !(g.hasGnoseUpgrade('gn_automation') && g.autoFollowersEnabled)
      && g.faithPoints >= g.getItemCost(follower) && (g.gnoseResets === 0 || (fps > 0 && g.getItemCost(follower) / fps < 8))) {
      return decision('follower', 'follower', buyFollower);
    }
    return null;
  }

  private recordMilestones(): void {
    const g = this.game;
    const record = (id: string, name: string, condition: boolean, details?: string) => {
      if (!condition || this.milestoneIds.has(id)) return;
      this.milestoneIds.add(id);
      this.milestones.push({ id, name, details, gameTimeSec: this.time, formattedTime: formatDuration(this.time),
        faith: g.faithPoints, fervor: g.fervorPoints, relics: g.relicPoints, gnose: g.gnosePoints });
    };
    record('first_follower', '1º Fiel Devoto', g.getTotalFollowersCount() > 0);
    record('unlock_incarnation', 'Selo da Encarnação', g.isIncarnationUnlocked());
    record('unlock_fervor_upgrades', 'Selo do Fervor', g.isFervorUpgradesUnlocked());
    record('incarnation_stage_2', 'Avatar Consagrado', g.incarnationStage >= 2);
    record('unlock_relics', 'Selo das Relíquias', g.isRelicsUnlocked());
    record('unlock_gnose', 'Selo da Gnose', g.isGnoseUnlocked());
    record('first_relic_reset', '1ª Transmutação', this.relicResets > 0);
    record('first_gnose_reset', '1ª Ascensão', this.gnoseResets > 0);
    record('first_gnose_upgrade', '1º Upgrade da Gnose', g.unlockedGnoseUpgrades.size > 0, [...g.unlockedGnoseUpgrades][0]);
    for (const upg of GNOSE_UPGRADES) record(`gnose_node_${upg.id}`, upg.name, g.hasGnoseUpgrade(upg.id), `${upg.cost} Gnose · Tier ${upg.tier}`);
    record('gnose_tree_complete', `Árvore da Gnose (${GNOSE_UPGRADES.length}/${GNOSE_UPGRADES.length})`, g.unlockedGnoseUpgrades.size === GNOSE_UPGRADES.length);
    for (const boss of GNOSE_BOSSES) record(boss.id, boss.name, g.isBossDefeated(boss.id));
  }
}

export class ProgressionSimulator {
  public static runArchetype(archetype: PlayerArchetype, options: SimulationOptions = {}): ArchetypeBenchmarkResult {
    return new Simulation(archetype, options).run();
  }

  public static runFullBenchmark(options: SimulationOptions = {}): BenchmarkReport {
    return { timestamp: Date.now(), results: {
      active: this.runArchetype('active', options),
      casual: this.runArchetype('casual', options),
      afk: this.runArchetype('afk', options),
    } };
  }
}
