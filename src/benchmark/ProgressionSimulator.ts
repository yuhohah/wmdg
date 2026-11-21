import { odinParryCue } from '../systems/odinParry.js';
import { ritualJudgement, ritualPointer } from '../systems/demiurgeRitual.js';
import { summonDemiurge, tickDemiurge, challengeDemiurge } from '../systems/demiurge.js';
import { ElapsedTimeCredit } from '../systems/elapsedTime.js';
import type { SaveData } from '../systems/saveSystem.js';
import { GameStateManager } from '../core/GameState.js';
import { INCARNATION_STAGES, BLESSING_SECONDS_PER_PRESS } from '../config/incarnation.js';
import { GNOSE_UPGRADES } from '../config/gnose.js';
import { COMBAT_BOSSES, GNOSE_BOSSES } from '../config/bosses.js';
import { calculateMiracleReward } from '../systems/calculations.js';
import { PLAYER_BEHAVIORS, createSeededRandom, describeBehavior, manualBlessingAllowed, manualSphereAllowed, routineClicksAvailable, VisitSchedule } from './behavior.js';
import { CampaignMetrics } from './CampaignMetrics.js';
import { ProgressTracker } from './ProgressTracker.js';
import { formatDuration } from './reporters.js';
import type { ArchetypeBenchmarkResult, BenchmarkReport, ManualAction, MilestoneRecord, PlayerArchetype, SimulationOptions } from './types.js';
import type { ActiveBossBattle, BossRift } from '../types.js';

interface Decision {
  key: string;
  action: ManualAction;
  execute: () => boolean;
}

type RiftPlan = 'parry' | 'mistime' | 'ignore';

const DEFAULT_SEED = 0xc0172;
const DEFAULT_HORIZON_SEC = 72 * 3600;
const PROCESSION_DURATION_SEC = 6;
const DEMIURGE_APPROACH_SEC = 2.75;
const STALL_ASCENSION_ETA_SEC = 600;
const EPSILON = 1e-8;

const PRODUCTION_GNOSE_IDS = new Set([
  'gn_init_faith',
  'gn_keep_relics',
  'gn_bencao_eterna',
  'gn_init_fervor',
  'gn_relic_gain',
  'gn_followers_syn',
  'gn_followers_economy',
  'gn_followers_cubic',
  'gn_gnose_mult',
  'gn_eternal_memory',
  'gn_relic_refinement',
  'gn_fu1_boost',
  'gn_apotheosis',
  'gn_empyrean_fire',
  'gn_perfect_opus',
]);

const COMFORT_GNOSE_IDS = new Set([
  'gn_memoria_selos',
  'gn_automation',
  'gn_seal_automation',
  'gn_ritual_automation',
  'gn_relic_automation',
  'gn_omniscience',
]);

class Simulation {
  private readonly game = new GameStateManager();
  private readonly behavior;
  private readonly visits: VisitSchedule;
  private readonly randomMiracles: () => number;
  private readonly randomClicks: () => number;
  private readonly randomCombat: () => number;
  private readonly progress = new ProgressTracker();
  private readonly metrics = new CampaignMetrics();
  private readonly seed: number;
  private readonly horizon: number;
  private readonly step: number;
  private time = 0;
  private absenceSave: SaveData | undefined;
  private absenceCredit: ElapsedTimeCredit | undefined;
  private presentTime = 0;
  private tickSeconds = 0;
  private tickOffset = 0;
  private processionSec = 0;
  private nextInteraction = 0;
  private nextSphere = 0;
  private pending: { decision: Decision; due: number } | null = null;
  private awaitingConfirmation = false;
  private miracleCooldown = 5;
  private miracle: { born: number; expires: number; willing: boolean } | null = null;
  private lastBossMiracleId: string | null = null;
  private lastBossMiracleWilling = false;
  private readonly riftPlans = new Map<string, RiftPlan>();
  private readonly seenSpecialWaves = new Map<string, number>();
  private readonly bossFailuresThisCycle = new Map<string, number>();
  private readonly bossLossReadiness = new Map<string, number>();
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
    this.behavior = { ...PLAYER_BEHAVIORS[archetype], ...options.behavior };
    this.visits = new VisitSchedule(this.behavior, createSeededRandom(this.seed ^ 0x513a));
    this.randomMiracles = createSeededRandom(this.seed ^ 0xa117);
    this.randomClicks = createSeededRandom(this.seed ^ 0xc11c);
    this.randomCombat = createSeededRandom(this.seed ^ 0x7b93);
    if (options.initialSave) this.game.applySaveData(options.initialSave);
    this.game.onBossBattleFinished = result => {
      this.processionSec = 0;
      this.riftPlans.clear();
      this.metrics.finishCombat(this.time + this.tickOffset, result.victory ? 'won' : 'lost', Boolean(result.cursePurified));
      if (result.victory) {
        this.bossLossReadiness.delete(result.boss.id);
        this.bossFailuresThisCycle.delete(result.boss.id);
      } else if (!result.isRematch && result.boss.id !== 'boss_demiurge') {
        const failures = (this.bossFailuresThisCycle.get(result.boss.id) ?? 0) + 1;
        this.bossFailuresThisCycle.set(result.boss.id, failures);
        const readiness = this.game.getBossCombatBreakdown(result.boss.id).cultReadiness;
        if (result.boss.id === 'boss_anubis') {
          if (this.game.totalGnoseEarned > 0 || failures >= 2) {
            this.bossLossReadiness.set(result.boss.id, Math.min(1.25, Math.max(0.85, readiness + (failures >= 3 ? 0.08 : 0))));
          }
        } else if (failures >= 2) {
          this.bossLossReadiness.set(result.boss.id, Math.min(1.45, readiness + 0.08));
        }
      }
    };
    this.recordMilestones();
  }

  public run(): ArchetypeBenchmarkResult {
    let previousProgress = this.signature();
    while (this.time + EPSILON < this.horizon && !this.completed() && !(this.options.stopAfterUpgrade && this.game.hasGnoseUpgrade(this.options.stopAfterUpgrade))) {
      // Every elapsed interval advances the same state, including visits and reaction delays.
      const dt = Math.min(this.step, this.horizon - this.time, this.visits.nextTransitionSec - this.time);
      if (dt > EPSILON) {
        if (this.visits.present && this.game.activeBossBattle?.combatStarted === false) {
          this.processionSec = Math.max(0, this.processionSec - dt);
          if (this.processionSec <= EPSILON) this.game.beginBossCombat();
        }
        const battle = this.game.activeBossBattle;
        const hpBefore = battle?.bossHp ?? 0;
        this.tickOffset = dt;
        const gains = this.absenceCredit
          ? { faithGained: 0, autoClickFaithGained: 0, autoClickBossDamage: 0 }
          : this.game.tick(dt, this.randomClicks);
        if (this.visits.present && !this.game.activeBossBattle) {
          summonDemiurge(this.game);
          tickDemiurge(this.game, dt);
          if (this.game.demiurge.phase === 'approaching') {
            this.game.demiurge.elapsed += dt;
            if (this.game.demiurge.elapsed + EPSILON >= DEMIURGE_APPROACH_SEC) {
              this.startCombatWithProcession('boss_demiurge', false, this.time + dt);
            }
          }
        }
        if (this.game.demiurge.phase === 'lost') { this.blockedReason = 'O Demiurgo consumiu toda a Gnose.'; break; }
        this.tickOffset = 0;
        if (battle && battle.combatStarted !== false) {
          const totalTickDamage = Math.max(0, hpBefore - battle.bossHp);
          const autoClickDamage = Math.min(totalTickDamage, gains.autoClickBossDamage ?? 0);
          const passiveDamage = Math.max(0, totalTickDamage - autoClickDamage);
          this.metrics.damageCombat('passive', passiveDamage, battle.bossMaxHp);
          if (autoClickDamage > 0) {
            this.metrics.damageCombat('sphere', autoClickDamage, battle.bossMaxHp, false);
          }
        }
        const autoClickFaith = gains.autoClickFaithGained ?? 0;
        this.metrics.addIncome('passive', Math.max(0, gains.faithGained - autoClickFaith));
        this.metrics.addIncome('clicks', autoClickFaith);
        if (!this.absenceCredit) this.tickSeconds += dt;
        this.progress.advance(dt, this.visits.present);
        this.metrics.advancePresence(dt, this.visits.present);
        if (this.visits.present) this.presentTime += dt;
        this.time += dt;
        if (!this.absenceCredit) this.updateMiracle(dt);
        this.game.checkAchievements();
      }
      const transition = this.visits.update(this.time);
      if (transition) {
        if (transition === 'arrive') this.creditAbsence();
        else {
          this.processionSec = 0;
          this.riftPlans.clear();
          this.metrics.finishCombat(this.time, 'retreated');
          this.game.retreatBossBattle();
          if (this.game.demiurge.phase === 'approaching') {
            this.game.demiurge.phase = 'walking';
            this.game.demiurge.elapsed = 0;
          }
          if (this.options.absenceMode && this.options.absenceMode !== 'visible') {
            this.absenceSave = this.game.buildSaveData();
            this.absenceCredit = new ElapsedTimeCredit(this.time * 1000);
            this.miracle = null;
          }
        }
        this.emit(transition);
        this.pending = null;
        this.occasionalBlessingPresses = 0;
        this.nextInteraction = this.time;
        this.nextSphere = this.time;
      }
      if (this.visits.present && this.time < this.horizon - EPSILON) this.interact();
      this.game.checkAchievements();
      if (!this.absenceCredit) {
        this.metrics.observe(this.time, this.game);
        const signature = this.signature();
        if (signature !== previousProgress) {
          this.progress.progress(this.time, !this.game.isIncarnationUnlocked() ? 'early' : !this.game.isGnoseUnlocked() ? 'mid' : 'late');
          previousProgress = signature;
          this.recordMilestones();
        }
      }
      const initFaithUpgrade = GNOSE_UPGRADES.find(u => u.id === 'gn_init_faith');
      const canBuyInitFaithNow = Boolean(initFaithUpgrade && !this.game.hasGnoseUpgrade('gn_init_faith') && this.game.canBuyGnoseUpgrade(initFaithUpgrade));
      if (!manualSphereAllowed(this.behavior, this.time) && !this.canRecoverAfterGnose() && !canBuyInitFaithNow
        && this.game.getTotalFollowersCount() === 0 && this.game.getFaithPerSecond() === 0
        && this.game.faithPoints < this.game.getItemCost(this.game.followers[0])) {
        this.blockedReason = this.game.gnoseResets > 0
          ? 'Após a Ascensão, não há fiéis nem Fé para recrutá-los. Emanação Primordial só fornece 1.000 Fé no próximo reset; não há cliques de recuperação disponíveis para reiniciar a produção.'
          : 'Sem fiéis, sem produção passiva e sem Fé para recrutar o primeiro fiel; não há cliques manuais disponíveis para reiniciar a produção.';
        break;
      }
    }
    this.creditAbsence();
    this.recordMilestones();
    this.options.onSnapshot?.(this.time, this.game.buildSaveData());
    this.progress.finish();
    const progression = this.metrics.finish(this.time);
    const completed = this.completed();
    const score = !completed ? 'Incompleto'
      : this.progress.deadZones.length > 3 || this.progress.maxPresentIdleSec > 14400 ? 'Gargalo Crítico'
        : this.progress.deadZones.length > 0 || this.progress.maxPresentIdleSec > 3600 ? 'Lento'
          : this.progress.maxPresentIdleSec < 300 && this.time < 5 * 3600 ? 'Excelente' : 'Balanceado';
    const absenceMode = this.options.absenceMode ?? 'visible';
    return {
      progression,
      absenceMode,
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
        absenceMode !== 'visible' ? `Ausência real via ${absenceMode}, com teto de 24 h e sem ações manuais.` : 'Jogo aberto e visível: a produção continua durante a ausência do jogador; combates recuam ao sair.',
        describeBehavior(this.archetype),
        'Gnose prioriza nós de produção primeiro e segura a run apenas se o próximo marco/ponto de Gnose ou upgrade da Encarnação estiver a menos de 10 min. Não é uma prova de estratégia ótima.',
        ...(this.blockedReason ? [this.blockedReason] : !completed ? [`Campanha não concluída no limite de ${formatDuration(this.horizon)}.`] : []),
      ],
    };
  }

  private creditAbsence(): void {
    if (!this.absenceCredit) return;
    if (this.options.absenceMode === 'save' && this.absenceSave) this.game.applySaveData(this.absenceSave);
    const gains = this.absenceCredit.consume(this.game, this.time * 1000, this.randomClicks);
    const autoClickFaith = gains.autoClickFaithGained ?? 0;
    this.metrics.addIncome('passive', Math.max(0, gains.faithGained - autoClickFaith));
    this.metrics.addIncome('clicks', autoClickFaith);
    this.tickSeconds += gains.seconds;
    this.absenceCredit = undefined; this.absenceSave = undefined;
  }

  private emit(kind: 'action' | 'arrive' | 'leave' | 'miracle_spawn' | 'miracle_expire', action?: ManualAction): void {
    this.options.onEvent?.({ timeSec: this.time, kind, action, present: this.visits.present });
  }

  private completed(): boolean {
    return this.game.isCampaignComplete() && GNOSE_UPGRADES.every(upgrade => this.game.hasGnoseUpgrade(upgrade.id));
  }

  private signature(): string {
    const g = this.game;
    const autoFollowers = g.hasGnoseUpgrade('gn_automation') && g.autoFollowersEnabled;
    const autoFervor = g.hasGnoseUpgrade('gn_ritual_automation') && g.autoFervorEnabled;
    const autoRelics = g.hasGnoseUpgrade('gn_relic_automation') && g.autoRelicUpgradesEnabled;
    return `${autoFollowers ? 'auto' : g.getTotalFollowersCount()}/${autoFervor ? 'auto' : g.fervorUpgrades.reduce((s, u) => s + u.level, 0)}/${autoRelics ? 'auto' : g.relicUpgrades.reduce((s, r) => s + r.level, 0)}/${g.unlocks.filter(u => u.unlocked).length}/${g.incarnationStage}/${g.gnoseResets}/${g.unlockedGnoseUpgrades.size}/${g.defeatedBosses.size}`;
  }

  private updateMiracle(dt: number): void {
    if (!this.game.areMiraclesUnlocked() || this.game.getTotalFollowersCount() === 0) { this.miracle = null; return; }
    // Courtyard updates pause while a Guardian duel is active, matching FollowersArena.
    if (this.game.activeBossBattle) return;
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
      if (this.game.areMiraclesAutoCollected()) {
        const reward = calculateMiracleReward(this.game.faithPoints, this.game.getFaithPerClick(), this.game.getFaithPerSecond());
        this.metrics.addIncome('miracles', reward);
        this.game.faithPoints += reward;
        this.game.totalFaithAccumulated += reward;
        this.miracle = null;
        this.miraclesCaught++;
      }
    }
  }

  private startCombatWithProcession(bossId: string, isRematch: boolean, startedSec = this.time): boolean {
    const started = this.game.startBossBattle(bossId, { awaitProcession: true, isRematch });
    if (started) {
      this.processionSec = PROCESSION_DURATION_SEC;
      this.riftPlans.clear();
      this.metrics.startCombat(startedSec, this.game);
    }
    return started;
  }

  private canStartFightNow(): boolean {
    const timeLeftInVisit = this.visits.nextTransitionSec - this.time;
    return !Number.isFinite(timeLeftInVisit) || timeLeftInVisit > 75;
  }

  private isCultBuiltForFight(bossId: string): boolean {
    const breakdown = this.game.getBossCombatBreakdown(bossId);
    if (!(bossId === 'boss_anubis' ? breakdown.canDamageBoss : breakdown.canWithstandBoss)) return false;
    const clickCps = manualSphereAllowed(this.behavior, this.time)
      ? Math.min(this.behavior.combatClickCps, 5)
      : this.game.getSphereAutoclickRate();
    const effectiveHpPerSec = breakdown.passiveHpFractionPerSec + breakdown.clickHpFraction * clickCps;
    const minHpPerSec = breakdown.canWithstandBoss
      ? (this.behavior.parryAccuracy < 0.75 ? 1 / 75 : 1 / 160)
      : 1 / 110;
    return effectiveHpPerSec >= minHpPerSec;
  }

  private selectRiftAttempt(battle: ActiveBossBattle): { rift: BossRift; pointer?: number } | undefined {
    const candidates: Array<{ rift: BossRift; pointer?: number; priority: number }> = [];
    for (const r of battle.activeRifts) {
      if (r.scaleHigherSelected) continue;
      const elapsed = r.maxSec - r.remainingSec;
      if (elapsed + EPSILON < this.behavior.riftResponseSec) continue;
      const kind = r.kind ?? 'standard';
      const waveKey = r.groupId ?? r.id;
      let plan = this.riftPlans.get(waveKey);
      if (!plan) {
        let accuracy = this.behavior.parryAccuracy;
        if (kind !== 'standard' && accuracy < 1) {
          const seen = this.seenSpecialWaves.get(battle.bossId) ?? 0;
          this.seenSpecialWaves.set(battle.bossId, seen + 1);
          if (seen < 4) {
            const firstRead = accuracy >= 0.95 ? 0.68 : 0.30;
            accuracy *= firstRead + (1 - firstRead) * (seen / 4);
          }
        }
        plan = accuracy >= 1 || this.randomCombat() < accuracy
          ? 'parry'
          : (this.randomCombat() < 0.65 ? 'mistime' : 'ignore');
        this.riftPlans.set(waveKey, plan);
      }
      if (plan === 'ignore') {
        if (kind === 'chaos_orbit') {
          const remainingInWave = battle.activeRifts.filter(o => o.groupId === r.groupId).length;
          if (remainingInWave > 2) candidates.push({ rift: r, priority: r.remainingSec });
        }
        continue;
      }
      if (plan === 'mistime') {
        if (kind === 'anubis_scales') {
          const isLower = battle.activeRifts.some(o =>
            o.kind === 'anubis_scales' && o.groupId === r.groupId && (o.scaleValue ?? 0) > (r.scaleValue ?? 0));
          if (isLower) candidates.push({ rift: r, priority: r.remainingSec });
        } else if (kind === 'hades_chains') {
          const isLocked = typeof r.chainOrder === 'number' && battle.activeRifts.some(o =>
            o.kind === 'hades_chains' && o.groupId === r.groupId && typeof o.chainOrder === 'number' && o.chainOrder < r.chainOrder!);
          if (isLocked) candidates.push({ rift: r, priority: r.remainingSec });
        } else if (kind === 'odin_raven') {
          if (odinParryCue(r).readySoon) candidates.push({ rift: r, priority: r.remainingSec });
        } else if (kind === 'demiurge_ritual') {
          const ptr = ritualPointer(elapsed);
          if (ritualJudgement(ptr).side !== 'center' && Math.abs(ptr) <= 0.45) {
            candidates.push({ rift: r, pointer: ptr, priority: r.remainingSec });
          }
        } else if (kind === 'chaos_orbit') {
          const remainingInWave = battle.activeRifts.filter(o => o.groupId === r.groupId).length;
          if (remainingInWave > 1) candidates.push({ rift: r, priority: r.remainingSec });
        }
        continue;
      }
      if (kind === 'odin_raven') {
        if (odinParryCue(r).green) candidates.push({ rift: r, priority: r.remainingSec });
      } else if (kind === 'demiurge_ritual') {
        const ptr = ritualPointer(elapsed);
        if (ritualJudgement(ptr).side === 'center') candidates.push({ rift: r, pointer: ptr, priority: r.remainingSec });
      } else if (kind === 'hades_chains') {
        const isUnlocked = typeof r.chainOrder !== 'number' || !battle.activeRifts.some(o =>
          o.kind === 'hades_chains' && o.groupId === r.groupId && typeof o.chainOrder === 'number' && o.chainOrder < r.chainOrder!);
        if (isUnlocked) candidates.push({ rift: r, priority: r.chainOrder ?? r.remainingSec });
      } else if (kind === 'anubis_scales') {
        const isHigher = !battle.activeRifts.some(o =>
          o.kind === 'anubis_scales' && o.groupId === r.groupId && (o.scaleValue ?? 0) > (r.scaleValue ?? 0));
        if (isHigher) candidates.push({ rift: r, priority: r.remainingSec });
      } else {
        candidates.push({ rift: r, priority: r.remainingSec });
      }
    }
    candidates.sort((a, b) => a.priority - b.priority);
    const chosen = candidates[0];
    if (chosen && chosen.rift.kind === 'hades_chains') {
      const waveKey = chosen.rift.groupId ?? chosen.rift.id;
      if (this.riftPlans.get(waveKey) === 'mistime') {
        this.riftPlans.set(waveKey, 'parry');
      }
    }
    return chosen ? { rift: chosen.rift, pointer: chosen.pointer } : undefined;
  }

  private interact(): void {
    const g = this.game;
    if (g.activeBossBattle?.combatStarted === false || g.demiurge.phase === 'approaching') return;
    if (!g.activeBossBattle && ['announced', 'walking', 'draining'].includes(g.demiurge.phase)) {
      if (this.time + EPSILON < this.nextInteraction) return;
      if (g.getBossCurseStacks() >= this.behavior.cursePurifyThreshold && this.canStartFightNow()) {
        const cleanseBoss = g.getBossCurseCleanseBoss();
        if (cleanseBoss && g.canChallengeBoss(cleanseBoss.id, { isRematch: true }) && this.startCombatWithProcession(cleanseBoss.id, true)) {
          this.actions.challenge = (this.actions.challenge ?? 0) + 1;
          this.nextInteraction = this.nextSlot(this.nextInteraction, 1 / this.behavior.maxInteractionCps);
          this.emit('action', 'challenge');
          return;
        }
      }
      if (g.demiurge.phase === 'announced') {
        if (!this.canStartFightNow()) return;
        g.demiurge.phase = 'walking';
        g.demiurge.elapsed = 0;
        this.actions.demiurge = (this.actions.demiurge ?? 0) + 1;
        this.nextInteraction = this.time + Math.min(this.behavior.decisionDelaySec, 3);
        this.emit('action', 'demiurge');
      } else if (challengeDemiurge(g)) {
        this.actions.demiurge = (this.actions.demiurge ?? 0) + 1;
        this.nextInteraction = this.nextSlot(this.nextInteraction, 1 / this.behavior.maxInteractionCps);
        this.emit('action', 'demiurge');
      }
      return;
    }
    if (!this.pending && !g.activeBossBattle) {
      const decision = this.chooseDecision();
      if (decision) {
        this.pending = { decision, due: this.time + this.behavior.decisionDelaySec };
        if (['gnose_upgrade', 'gnose', 'challenge', 'unlock', 'incarnation'].includes(decision.action)) {
          this.metrics.startGoal(decision.key, this.time, this.pending.due);
        }
      }
    }
    if (this.time + EPSILON < this.nextInteraction) return;

    let action: ManualAction | null = null;
    // All manual events share the same finite interaction budget.
    const battleBeforeRift = g.activeBossBattle;
    const bossMiracle = battleBeforeRift?.activeMiracle;
    if (bossMiracle && bossMiracle.id !== this.lastBossMiracleId) {
      this.lastBossMiracleId = bossMiracle.id;
      this.lastBossMiracleWilling = this.randomMiracles() < this.behavior.miracleCatchChance;
    }
    const riftAttempt = !this.awaitingConfirmation && battleBeforeRift
      ? this.selectRiftAttempt(battleBeforeRift)
      : undefined;
    const hpBeforeRift = battleBeforeRift?.bossHp ?? 0;
    const riftHit = riftAttempt ? g.clickBossRift(riftAttempt.rift.id, riftAttempt.pointer) : undefined;
    if (riftHit) {
      // A real attempt consumes its slot even if the domain rejects the parry.
      if (riftHit.shattered && battleBeforeRift) {
        if (riftHit.damage > 0) {
          this.metrics.damageCombat('rift', Math.min(hpBeforeRift, riftHit.damage), battleBeforeRift.bossMaxHp);
        } else {
          this.metrics.recordCombatInteraction();
        }
      } else {
        this.metrics.recordCombatInteraction();
      }
      action = 'rift';
    } else if (!this.awaitingConfirmation && bossMiracle
      && this.lastBossMiracleWilling
      && bossMiracle.maxSec - bossMiracle.remainingSec + EPSILON >= this.behavior.riftResponseSec) {
      if (g.clickBossMiracle().triggered) {
        this.metrics.recordCombatInteraction();
        action = 'boss_miracle';
      }
    } else if (!this.awaitingConfirmation && !g.activeBossBattle && this.miracle?.willing && this.time + EPSILON >= this.miracle.born + this.behavior.miracleResponseSec) {
      const reward = calculateMiracleReward(g.faithPoints, g.getFaithPerClick(), g.getFaithPerSecond());
      this.metrics.addIncome('miracles', reward);
      g.faithPoints += reward;
      g.totalFaithAccumulated += reward;
      this.miracle = null;
      this.miraclesCaught++;
      action = 'miracle';
    } else if (this.pending && this.time + EPSILON >= this.pending.due) {
      // Re-evaluate eligibility: state may have changed during the reaction delay.
      const current = this.chooseDecision();
      const ready = this.pending.decision;
      const productionBefore = g.getFaithPerSecond();
      if (current && (current.key === ready.key || this.canDecisionsCoexist(ready.action, current.action))) {
        this.pending = null;
        const executed = current.key === ready.key ? current : ready;
        if (executed.execute()) {
          action = executed.action;
          this.metrics.finishGoal(executed.key, this.time);
          this.metrics.afterPurchase(this.time, action, productionBefore, g.getFaithPerSecond());
          if (action === 'gnose_upgrade') this.options.onSnapshot?.(this.time, g.buildSaveData());
        }
      } else {
        this.metrics.finishGoal(ready.key, this.time, true);
        this.pending = current ? { decision: current, due: this.time + this.behavior.decisionDelaySec } : null;
        if (this.pending && ['gnose_upgrade', 'gnose', 'challenge', 'unlock', 'incarnation'].includes(this.pending.decision.action)) {
          this.metrics.startGoal(this.pending.decision.key, this.time, this.pending.due);
        }
      }
    } else if (!this.awaitingConfirmation && manualBlessingAllowed(this.behavior, this.time)
      && g.isIncarnationUnlocked() && !g.hasGnoseUpgrade('gn_bencao_eterna')
      && (((this.behavior.blessingMode === 'maintain'
        || (this.behavior.blessingMode === 'burst' && routineClicksAvailable(this.behavior, this.time, this.visits.visitStartedAtSec)))
        && g.incarnationBoostTimer <= Math.max(0, this.behavior.blessingTargetSec - BLESSING_SECONDS_PER_PRESS) + EPSILON)
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
        const battle = g.activeBossBattle;
        if (battle) {
          const hpBefore = battle.bossHp;
          const result = g.attackBossClick(this.randomClicks);
          this.metrics.damageCombat('sphere', Math.min(hpBefore, result.bossClickDamage), battle.bossMaxHp);
          if (result.bossIsCrit) this.criticalClicks++;
        } else {
          const result = g.addClick(this.randomClicks);
          this.metrics.addIncome('clicks', result.fpc);
          this.clicks++;
          if (recovery) this.recoveryClicks++;
          if (result.isCrit) this.criticalClicks++;
        }
        this.nextSphere = this.nextSlot(this.nextSphere, 1 / cps);
        action = 'sphere';
      }
    }
    if (action) {
      if (action === 'sphere') this.lastSphereClickSec = this.time;
      if (action === 'blessing') this.lastManualBlessingSec = this.time;
      if ((this.behavior.blessingMode === 'after_purchase' || this.behavior.blessingMode === 'burst')
        && manualBlessingAllowed(this.behavior, this.time)
        && ['follower', 'fervor', 'relic', 'unlock', 'incarnation', 'gnose_upgrade'].includes(action)) {
        this.occasionalBlessingPresses = Math.max(0,
          Math.ceil((this.behavior.blessingTargetSec - g.incarnationBoostTimer) / BLESSING_SECONDS_PER_PRESS));
      }
      this.actions[action] = (this.actions[action] ?? 0) + 1;
      this.nextInteraction = this.nextSlot(this.nextInteraction, 1 / this.behavior.maxInteractionCps);
      this.emit('action', action);
    }
  }

  /** Allow ready purchase to complete if superseded by an unrelated currency/upgrade. */
  private canDecisionsCoexist(ready: ManualAction, current: ManualAction): boolean {
    if (current === 'gnose_upgrade') return ['follower', 'fervor', 'relic', 'automation_toggle'].includes(ready);
    if (ready === 'automation_toggle') return true;
    if (ready === 'relic') return ['follower', 'fervor', 'unlock', 'incarnation'].includes(current);
    if (ready === 'fervor') return ['follower', 'relic', 'incarnation'].includes(current);
    if (ready === 'follower') return ['fervor', 'relic'].includes(current);
    return false;
  }

  /** Recover only a stalled post-Gnose economy; stop once recruitment or gn_init_faith is affordable. */
  private canRecoverAfterGnose(): boolean {
    const g = this.game;
    const initFaithUpgrade = GNOSE_UPGRADES.find(u => u.id === 'gn_init_faith');
    if (initFaithUpgrade && !g.hasGnoseUpgrade('gn_init_faith') && g.canBuyGnoseUpgrade(initFaithUpgrade)) return false;
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
      // Only the first Ascension shows the confirmation dialog, matching GnoseTab.
      if (g.gnoseResets === 0) g.confirmGnoseReset = false;
      this.metrics.beforeReset(this.time, g);
      const result = g.performGnoseReset();
      if (result.success) {
        this.gnoseResets++;
        this.bossFailuresThisCycle.clear();
      }
      return result.success;
    };
    if (this.awaitingConfirmation) return decision('gnose-confirm', 'gnose_confirm', ascend);
    if (g.hasGnoseUpgrade('gn_memoria_selos') && (!g.bulkFervorEnabled || !g.bulkRelicsEnabled)) {
      return decision('enable-bulk', 'automation_toggle', () => {
        if (!g.hasGnoseUpgrade('gn_memoria_selos') || (g.bulkFervorEnabled && g.bulkRelicsEnabled)) return false;
        g.bulkFervorEnabled = true;
        g.bulkRelicsEnabled = true;
        return true;
      });
    }
    const follower = g.followers[0];
    const buyFollower = () => g.isConvertMaxUnlocked() ? g.buyMaxFollowers().success : g.buyOneFollower();
    if (g.getTotalFollowersCount() === 0 && g.faithPoints >= g.getItemCost(follower)) {
      return decision('bootstrap', 'follower', buyFollower);
    }
    const purchasePriority = this.options.purchasePriority ?? 'production';
    const eligibleGnose = GNOSE_UPGRADES.filter(u => !g.hasGnoseUpgrade(u.id)
      && g.isGnoseTierUnlocked(u.tier));
    const orderedGnose = [...eligibleGnose].sort((a, b) => {
      if (purchasePriority === 'production') {
        const aProd = PRODUCTION_GNOSE_IDS.has(a.id) ? 0 : 1;
        const bProd = PRODUCTION_GNOSE_IDS.has(b.id) ? 0 : 1;
        if (aProd !== bProd) return aProd - bProd;
        return a.cost - b.cost;
      }
      if (purchasePriority === 'comfort') {
        const aComf = COMFORT_GNOSE_IDS.has(a.id) ? 0 : 1;
        const bComf = COMFORT_GNOSE_IDS.has(b.id) ? 0 : 1;
        if (aComf !== bComf) return aComf - bComf;
        return a.cost - b.cost;
      }
      return a.cost - b.cost;
    });
    const nextGnose = orderedGnose[0];
    const resetPolicy = this.options.resetPolicy ?? 'stall';
    const readinessTargetGnose = Math.max(1, Math.ceil(g.totalGnoseEarned * 0.25));
    const remainingGnose = nextGnose ? Math.max(1, nextGnose.cost - g.gnosePoints) : readinessTargetGnose;
    const desiredGnose = resetPolicy === 'immediate' ? 1 : Math.max(1, Math.ceil(
      resetPolicy === 'short' ? Math.min(remainingGnose, (nextGnose?.cost ?? readinessTargetGnose) * 0.9)
        : remainingGnose * (resetPolicy === 'long' ? 1.05 : 1)));
    if (nextGnose && g.canBuyGnoseUpgrade(nextGnose)) {
      return decision(nextGnose.id, 'gnose_upgrade', () => g.buyGnoseUpgrade(nextGnose.id));
    }
    const unlock = g.unlocks.find(u => !u.unlocked && (!u.prerequisiteId || g.unlocks.some(p => p.id === u.prerequisiteId && p.unlocked)));
    if (unlock && (unlock.costCurrency === 'fervor' ? g.fervorPoints : g.faithPoints) >= unlock.cost) {
      return decision(unlock.id, 'unlock', () => g.buyUnlock(unlock));
    }
    const incarnation = INCARNATION_STAGES.find(s => s.stage === g.incarnationStage + 1);
    if (incarnation && g.isIncarnationUnlocked() && g.canAccessIncarnationStage(incarnation.stage) && g.faithPoints >= g.getIncarnationStageCost(incarnation)) {
      return decision(`incarnation-${incarnation.stage}`, 'incarnation', () => g.upgradeIncarnation());
    }
    const canStartFight = this.canStartFightNow();
    if (canStartFight && g.getBossCurseStacks() >= this.behavior.cursePurifyThreshold) {
      const cleanseBoss = g.getBossCurseCleanseBoss();
      if (cleanseBoss && g.canChallengeBoss(cleanseBoss.id, { isRematch: true }) && this.isCultBuiltForFight(cleanseBoss.id)) {
        return decision(cleanseBoss.id, 'challenge', () => this.startCombatWithProcession(cleanseBoss.id, true));
      }
    }
    const boss = canStartFight
      ? GNOSE_BOSSES.find(b => {
          if (!g.canChallengeBoss(b.id) || !this.isCultBuiltForFight(b.id)) return false;
          const breakdown = g.getBossCombatBreakdown(b.id);
          return breakdown.cultReadiness >= (this.bossLossReadiness.get(b.id) ?? 0);
        })
      : undefined;
    if (boss && g.bossCurseTimerSec === 0) {
      return decision(boss.id, 'challenge', () => this.startCombatWithProcession(boss.id, false));
    }
    const routineDuty = Number.isFinite(this.behavior.routineBurstEverySec) && this.behavior.routineBurstEverySec > 0
      ? Math.min(1, Math.max(0, this.behavior.routineBurstDurationSec / this.behavior.routineBurstEverySec))
      : (this.behavior.routineBurstDurationSec > 0 ? 1 : 0);
    const routineCps = manualSphereAllowed(this.behavior, this.time) ? this.behavior.routineClickCps * routineDuty : 0;
    const fps = g.getFaithPerSecond() + routineCps * g.getFaithPerClick();
    const draupnirLevel = g.relicUpgrades.find(r => r.id === 'relic_draupnir')?.level ?? 0;
    const passiveRelics = (g.hasGnoseUpgrade('gn_omniscience') && g.autoRelicsEnabled) || draupnirLevel > 0;
    const gnoseToGet = g.getGnoseToGet();
    const gnoseExp = g.getGnoseGainExponent();
    // With all available tiers bought (or Tier I still sealed), readiness can
    // only improve through lifetime Gnose. Do not wait for production to fix it.
    const needsGuardianGnose = !nextGnose && GNOSE_BOSSES.some(b => {
      if (!g.canChallengeBoss(b.id)) return false;
      const readiness = g.getBossCombatBreakdown(b.id);
      const needsSuddenDeathDefense = b.id === 'boss_anubis' && !readiness.canWithstandBoss && !this.isCultBuiltForFight(b.id);
      return (!readiness.canWithstandBoss && b.id !== 'boss_anubis')
        || needsSuddenDeathDefense
        || readiness.cultReadiness < (this.bossLossReadiness.get(b.id) ?? 0);
    });
    let affordableCount = 0;
    let remainingPool = g.gnosePoints + gnoseToGet;
    let nextUnboughtUpgrade: typeof orderedGnose[number] | undefined = orderedGnose[0];
    for (const u of orderedGnose) {
      if (remainingPool >= u.cost) {
        remainingPool -= u.cost;
        affordableCount++;
        nextUnboughtUpgrade = undefined;
      } else {
        nextUnboughtUpgrade = u;
        break;
      }
    }
    const gnoseNeededForMilestone = nextUnboughtUpgrade
      ? gnoseToGet + Math.max(1, nextUnboughtUpgrade.cost - remainingPool)
      : Infinity;
    const etaToNextGnoseMilestoneSec = Number.isFinite(gnoseNeededForMilestone)
      ? (fps > 0 ? Math.max(0, (1e15 * Math.pow(gnoseNeededForMilestone, 1 / gnoseExp) - g.faithPoints) / fps) : Infinity)
      : Infinity;
    const nextGnoseStepTarget = gnoseToGet + Math.max(1, Math.ceil(gnoseToGet * 0.1));
    const faithForNextGnoseStep = 1e15 * Math.pow(Math.max(1, nextGnoseStepTarget), 1 / gnoseExp);
    const nextGnoseStepEtaSec = fps > 0 ? Math.max(0, (faithForNextGnoseStep - g.faithPoints) / fps) : Infinity;
    const incarnationEtaSec = incarnation && g.isIncarnationUnlocked() && g.canAccessIncarnationStage(incarnation.stage)
      ? (fps > 0 ? Math.max(0, (g.getIncarnationStageCost(incarnation) - g.faithPoints) / fps) : Infinity)
      : Infinity;
    let shouldAscend = false;
    if ((nextGnose || needsGuardianGnose) && gnoseToGet >= 1) {
      if (resetPolicy === 'stall') {
        const waitForStep = affordableCount === 0 && nextGnoseStepEtaSec < STALL_ASCENSION_ETA_SEC;
        const waitForMilestone = etaToNextGnoseMilestoneSec < STALL_ASCENSION_ETA_SEC;
        const waitForIncarnation = incarnationEtaSec < STALL_ASCENSION_ETA_SEC;
        shouldAscend = !waitForStep && !waitForMilestone && !waitForIncarnation;
      } else {
        shouldAscend = gnoseToGet >= desiredGnose;
      }
    }
    if (shouldAscend) {
      return decision('gnose', 'gnose', () => {
        if (!g.confirmGnoseReset) return ascend();
        this.awaitingConfirmation = true;
        return true;
      });
    }
    const savingForUnlock = unlock?.costCurrency === 'faith' && fps > 0 && (unlock.cost - g.faithPoints) / fps < 180;
    const savingForIncarnation = incarnation && g.canAccessIncarnationStage(incarnation.stage) && g.isIncarnationUnlocked() && fps > 0
      && (g.getIncarnationStageCost(incarnation) - g.faithPoints) / fps < 180;
    const ascensionTarget = nextGnose && g.isGnoseUnlocked()
      ? 1e15 * Math.max(1, desiredGnose) ** (1 / gnoseExp) : Infinity;
    const savingForGnose = resetPolicy === 'stall'
      ? (g.isGnoseUnlocked() && (
        (nextGnose ? affordableCount > 0 || etaToNextGnoseMilestoneSec < STALL_ASCENSION_ETA_SEC : needsGuardianGnose && gnoseToGet >= 1)
        || (passiveRelics && gnoseToGet >= 1)
      ))
      : (fps > 0 && (ascensionTarget - g.faithPoints) / fps < 180);
    const relic = g.isRelicsUnlocked() && !(g.hasGnoseUpgrade('gn_relic_automation') && g.autoRelicUpgradesEnabled) ? g.relicUpgrades.find(r => r.level < g.getRelicMaxLevel(r) && g.relicPoints >= g.getRelicUpgradeCost(r)) : undefined;
    if (relic) return decision(relic.id, 'relic', () => g.bulkRelicsEnabled && g.hasGnoseUpgrade('gn_memoria_selos') ? g.buyMaxRelicUpgrade(relic) > 0 : g.buyRelicUpgrade(relic));
    if (g.isFervorUpgradesUnlocked() && !(g.hasGnoseUpgrade('gn_ritual_automation') && g.autoFervorEnabled)) {
      const clickRelevant = manualSphereAllowed(this.behavior, this.time) || g.getSphereAutoclickProgress() !== null;
      const fervorSortCost = (u: typeof g.fervorUpgrades[number]) => g.getFervorUpgradeCost(u) * (u.id === 'fu_click' && !clickRelevant ? 10 : 1);
      const rito = g.fervorUpgrades.filter(u => (u.id !== 'fu_relics' || g.isPhoenixRelicUnlocked()) && g.fervorPoints >= g.getFervorUpgradeCost(u))
        .sort((a, b) => fervorSortCost(a) - fervorSortCost(b))[0];
      if (rito) return decision(rito.id, 'fervor', () => g.bulkFervorEnabled && g.hasGnoseUpgrade('gn_memoria_selos') ? g.buyMaxFervorUpgrade(rito) > 0 : g.buyFervorUpgrade(rito));
    }
    const transmute = g.getRelicsToGet();
    if (!savingForUnlock && !savingForIncarnation && !savingForGnose && g.isRelicsUnlocked() && g.relicConvertCooldown === 0 && transmute >= 15
      && ((!passiveRelics && transmute >= Math.max(20, g.relicPoints * 1.5)) || g.bestRelicsToGet === 0)) {
      return decision('transmutation', 'transmutation', () => {
        const result = g.convertFaithToRelics();
        if (result.success) this.relicResets++;
        return result.success;
      });
    }
    const followerBlockedBySaving = resetPolicy === 'stall'
      ? (savingForUnlock || savingForIncarnation || (!g.isGnoseUnlocked() && savingForGnose))
      : (savingForUnlock || savingForIncarnation || savingForGnose);
    if (!followerBlockedBySaving && !(g.hasGnoseUpgrade('gn_automation') && g.autoFollowersEnabled)
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
    record('incarnation_stage_3', 'Avatar Ancestral', g.incarnationStage >= 3);
    record('incarnation_stage_4', 'Avatar do Eclipse', g.incarnationStage >= 4);
    record('incarnation_stage_5', 'Avatar Solar', g.incarnationStage >= 5);
    record('unlock_relics', 'Selo das Relíquias', g.isRelicsUnlocked());
    record('unlock_gnose', 'Selo da Gnose', g.isGnoseUnlocked());
    record('first_relic_reset', '1ª Transmutação', this.relicResets > 0);
    record('first_gnose_reset', '1ª Ascensão', this.gnoseResets > 0);
    record('first_gnose_upgrade', '1º Upgrade da Gnose', g.unlockedGnoseUpgrades.size > 0, [...g.unlockedGnoseUpgrades][0]);
    for (const upg of GNOSE_UPGRADES) record(`gnose_node_${upg.id}`, upg.name, g.hasGnoseUpgrade(upg.id), `${upg.cost} Gnose · Tier ${upg.tier}`);
    record('gnose_tree_complete', `Árvore da Gnose (${GNOSE_UPGRADES.length}/${GNOSE_UPGRADES.length})`, g.unlockedGnoseUpgrades.size === GNOSE_UPGRADES.length);
    for (const boss of COMBAT_BOSSES) record(boss.id, boss.name, g.isBossDefeated(boss.id));
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
