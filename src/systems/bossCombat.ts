import { odinParryCue } from './odinParry.js';
import { RITUAL_DURATION, ritualPointer, ritualJudgement } from './demiurgeRitual.js';
import type { DemiurgeState } from './demiurge.js';
import type {
  Achievement,
  ActiveBossBattle,
  BossCombatBreakdown,
  BossRiftKind,
  FervorUpgrade,
  GnoseBoss,
  RelicUpgrade,
} from '../types.js';
import { GNOSE_UPGRADES } from '../config/gnose.js';
import {
  BOSS_ANUBIS_WRONG_SCALE_MULT,
  BOSS_CHAOS_SEAL_MISS_MULT,
  BOSS_CURSE_ATTACK_SPEED_PER_STACK,
  BOSS_CURSE_DAMAGE_TAKEN_REDUCTION_PER_STACK,
  BOSS_CURSE_EXTRA_DAMAGE_PER_STACK,
  BOSS_CURSE_MAX_DAMAGE_TAKEN_REDUCTION,
  BOSS_CURSE_MAX_EXTRA_DAMAGE,
  BOSS_CURSE_MAX_STACKS,
  BOSS_CURSE_MULTIPLIER,
  BOSS_CURSE_WINDOW_TIGHTEN_PER_STACK,
  BOSS_DAMAGE_READINESS_THRESHOLD,
  BOSS_DEFENSE_READINESS_THRESHOLD,
  BOSS_HADES_CHAIN_2_MISS_MULT,
  BOSS_HADES_CHAIN_3_MISS_MULT,
  BOSS_MAX_ALTAR_INTEGRITY,
  BOSS_MAX_CLICK_HP_FRACTION,
  BOSS_MAX_PASSIVE_HP_PER_SEC,
  BOSS_SPECIAL_MISS_MULT,
  COMBAT_BOSSES,
} from '../config/bosses.js';

export interface BossCurseModifiers {
  stacks: number;
  damageReduction: number;
  damageTakenMult: number;
  extraDamageRatio: number;
  damageDealtMult: number;
  attackCadenceMult: number;
  windowScaleMult: number;
}

export interface BossCombatStateHost {
  faithPoints: number;
  totalFaithAccumulated: number;
  demiurge: DemiurgeState;
  fervorPoints: number;
  totalFervorGenerated: number;
  relicPoints: number;
  bestRelicsToGet: number;
  totalRelicsGenerated: number;
  incarnationStage: number;
  incarnationBoostTimer: number;
  gnosePoints: number;
  totalGnoseEarned: number;
  fervorUpgrades: FervorUpgrade[];
  relicUpgrades: RelicUpgrade[];
  achievements: Achievement[];
  unlockedGnoseUpgrades: Set<string>;
  defeatedBosses: Set<string>;
  maxCurseDefeatedBosses?: Set<string>;
  bestBossTimesSec: Record<string, number>;
  bossCurseTimerSec: number;
  bossCurseStacks: number;
  bossCurseBossId: string | null;
  activeBossBattle: ActiveBossBattle | null;
  riftIdCounter: number;
  miracleIdCounter: number;
  onBossBattleFinished?: (result: {
    boss: GnoseBoss;
    victory: boolean;
    isRematch?: boolean;
    durationSec?: number;
    cursePurified?: boolean;
    curseStacks?: number;
  }) => void;
  getTotalFollowersCount(): number;
  getFaithPerSecond(): number;
  getFaithPerClick(): number;
  getFervorRatePerSecond(): number;
  getRelicsRatePerSecond(): number;
  isIncarnationUnlocked(): boolean;
  isGnoseUnlocked(): boolean;
  hasGnoseUpgrade(upgradeId: string): boolean;
  areMiraclesUnlocked(): boolean;
}

export interface BossRiftClickResult {
  damage: number;
  shattered: boolean;
  victory: boolean;
  comboStreak?: number;
  kind?: BossRiftKind;
  specialBonusTriggered?: boolean;
  miracleAwakened?: boolean;
  altarDamageTaken?: number;
  scaleDamageMultiplier?: number;
  chainLocked?: boolean;
  ritualSide?: 'center' | 'moon' | 'sun';
  ritualPercent?: number;
}

export function isBossDefeated(state: BossCombatStateHost, bossId: string): boolean {
  return state.defeatedBosses.has(bossId);
}

export function getBossBestTimeSec(state: BossCombatStateHost, bossId: string): number | undefined {
  const val = state.bestBossTimesSec[bossId];
  return typeof val === 'number' && Number.isFinite(val) && val > 0 ? val : undefined;
}

export function getBossForTier(tier: 1 | 2 | 3 | 4): GnoseBoss | undefined {
  return COMBAT_BOSSES.find((b) => b.unlocksTier === tier);
}

export function isGnoseTierUnlocked(state: BossCombatStateHost, tier: 1 | 2 | 3 | 4): boolean {
  const boss = COMBAT_BOSSES.find((b) => b.unlocksTier === tier);
  if (!boss) return true;
  if (state.defeatedBosses.has(boss.id)) return true;
  // Backward compatibility: if player already owns an upgrade in this tier, consider it unlocked
  return GNOSE_UPGRADES.some(
    (u) => u.tier === tier && state.unlockedGnoseUpgrades.has(u.id)
  );
}

export function canChallengeBoss(
  state: BossCombatStateHost,
  bossId: string,
  options?: { isRematch?: boolean }
): boolean {
  const boss = COMBAT_BOSSES.find((b) => b.id === bossId);
  if (!boss) return false;
  if (options?.isRematch) {
    return state.defeatedBosses.has(boss.id);
  }
  if (state.defeatedBosses.has(boss.id)) return false;

  if (bossId === 'boss_demiurge') return state.demiurge.phase === 'approaching'
    && state.defeatedBosses.has('boss_tiamat') && GNOSE_UPGRADES.every(u => state.hasGnoseUpgrade(u.id));
  if (boss.unlocksTier === 1) return state.isGnoseUnlocked();
  const previousTier = (boss.unlocksTier - 1) as 1 | 2 | 3;
  return (
    state.isGnoseUnlocked() &&
    isGnoseTierUnlocked(state, previousTier) &&
    GNOSE_UPGRADES.some((u) => u.tier === previousTier && state.hasGnoseUpgrade(u.id))
  );
}

export function getBossRewardsMultiplier(state: BossCombatStateHost): number {
  let mult = 1.0;
  for (const boss of COMBAT_BOSSES) {
    if (state.defeatedBosses.has(boss.id)) {
      mult *= boss.faithFervorMult;
    }
  }
  return mult;
}

export function getBossCurseMultiplier(state: BossCombatStateHost): number {
  return state.bossCurseTimerSec > 0 ? BOSS_CURSE_MULTIPLIER : 1.0;
}

/** Curse starts from Hades (index 1 in COMBAT_BOSSES: Hades, Odin, Caos Primordial, Demiurgo). */
export function isBossSubjectToCurse(bossId: string): boolean {
  const idx = COMBAT_BOSSES.findIndex((b) => b.id === bossId);
  return idx >= 1;
}

export function getPreviousBoss(bossId: string): GnoseBoss | undefined {
  const idx = COMBAT_BOSSES.findIndex((b) => b.id === bossId);
  return idx >= 1 ? COMBAT_BOSSES[idx - 1] : undefined;
}

export function getBossCurseStacks(state: BossCombatStateHost): number {
  const raw = Number.isFinite(state.bossCurseStacks) ? Math.floor(state.bossCurseStacks) : 0;
  return Math.max(0, Math.min(BOSS_CURSE_MAX_STACKS, raw));
}

export function getBossCurseCleanseBoss(state: BossCombatStateHost): GnoseBoss | undefined {
  if (getBossCurseStacks(state) <= 0) return undefined;
  if (state.bossCurseBossId) {
    const prev = getPreviousBoss(state.bossCurseBossId);
    if (prev) return prev;
  }
  const nextUndefeated = COMBAT_BOSSES.find((b, i) => i >= 1 && !state.defeatedBosses.has(b.id));
  return getPreviousBoss(nextUndefeated?.id ?? 'boss_demiurge');
}

export function getBossCurseModifiers(state: BossCombatStateHost, bossId: string): BossCurseModifiers {
  const stacks = isBossSubjectToCurse(bossId) ? getBossCurseStacks(state) : 0;
  if (stacks <= 0) {
    return {
      stacks: 0,
      damageReduction: 0,
      damageTakenMult: 1,
      extraDamageRatio: 0,
      damageDealtMult: 1,
      attackCadenceMult: 1,
      windowScaleMult: 1,
    };
  }
  const damageReduction = Math.min(
    BOSS_CURSE_MAX_DAMAGE_TAKEN_REDUCTION,
    stacks * BOSS_CURSE_DAMAGE_TAKEN_REDUCTION_PER_STACK
  );
  const extraDamageRatio = Math.min(
    BOSS_CURSE_MAX_EXTRA_DAMAGE,
    stacks * BOSS_CURSE_EXTRA_DAMAGE_PER_STACK
  );
  return {
    stacks,
    damageReduction,
    damageTakenMult: Math.max(0.5, 1 - damageReduction),
    extraDamageRatio,
    damageDealtMult: 1 + extraDamageRatio,
    attackCadenceMult: 1 + stacks * BOSS_CURSE_ATTACK_SPEED_PER_STACK,
    windowScaleMult: Math.max(0.85, 1 - stacks * BOSS_CURSE_WINDOW_TIGHTEN_PER_STACK),
  };
}

/**
 * Computes how all Cult Systems (Fé, Fiéis, Fervor, Relíquias, Encarnação, Gnose, Conquistas)
 * synergize to drive Boss Battle DPS, Sphere Click damage, Rift critical damage,
 * Altar Integrity protection, and combat duration.
 */
export function calculateBossCombatBreakdown(
  state: BossCombatStateHost,
  bossId?: string
): BossCombatBreakdown {
  const targetBossId = bossId ?? state.activeBossBattle?.bossId ?? 'boss_anubis';
  const boss = COMBAT_BOSSES.find((b) => b.id === targetBossId) ?? COMBAT_BOSSES[0];
  const bossMaxHp =
    state.activeBossBattle && state.activeBossBattle.bossId === boss.id
      ? state.activeBossBattle.bossMaxHp
      : boss.maxHp;

  const difficultyScale =
    boss.id === 'boss_anubis'
      ? 1.0
      : boss.id === 'boss_cronos'
        ? 1.6
        : boss.id === 'boss_odin'
          ? 2.3
          : 3.2;

  const fps = state.getFaithPerSecond();
  const fpc = state.getFaithPerClick();

  // 1. Fé (current Fé, total Fé accumulated, and Fé/s)
  const faithLog = Math.log10(Math.max(0, state.faithPoints) + 1);
  const faithHistoryLog = Math.log10(Math.max(state.faithPoints, state.totalFaithAccumulated, 0) + 1);
  const fpsLog = fps > 1 ? Math.log10(fps) : 0;
  const faithBonus = (faithLog * 0.02 + faithHistoryLog * 0.02 + fpsLog * 0.05) / difficultyScale;

  // 2. Fiéis Devotos (count of active devotees chanting)
  const followersCount = state.getTotalFollowersCount();
  const followersBonus =
    followersCount > 0
      ? (Math.log10(followersCount + 1) * 0.22 + Math.min(1.5, followersCount * 0.008)) /
        difficultyScale
      : 0;

  // 3. Fervor (accumulated Fervor, Fervor/s, and Ritos de Fervor levels)
  const fervorRate = state.getFervorRatePerSecond();
  const fervorLevels = state.fervorUpgrades.reduce((acc, u) => acc + u.level, 0);
  const fervorLog = state.fervorPoints > 0 ? Math.log10(state.fervorPoints + 1) : 0;
  const fervorHistoryLog = Math.log10(Math.max(state.fervorPoints, state.totalFervorGenerated, 0) + 1);
  const fervorRateLog = fervorRate > 0 ? Math.log10(fervorRate + 1) : 0;
  const fervorBonus =
    (fervorLog * 0.08 + fervorHistoryLog * 0.04 + fervorRateLog * 0.08 + fervorLevels * 0.04) /
    difficultyScale;

  // 4. Relíquias & Fragmentos (Fragmentos pool, best transmutation, and Relic upgrade levels)
  const relicLevels = state.relicUpgrades.reduce((acc, r) => acc + r.level, 0);
  const effectiveRelics = Math.max(state.relicPoints, state.bestRelicsToGet);
  const relicsLog = effectiveRelics > 0 ? Math.log10(effectiveRelics + 1) : 0;
  const relicsHistoryLog = Math.log10(Math.max(effectiveRelics, state.totalRelicsGenerated, 0) + 1);
  const relicsRateLog = Math.log10(state.getRelicsRatePerSecond() + 1);
  const relicsBonus =
    (relicsLog * 0.15 + relicsHistoryLog * 0.1 + relicsRateLog * 0.08 + relicLevels * 0.08) /
    difficultyScale;

  // 5. Encarnação Sagrada (Avatar stage 1..5 and active Blessing)
  const isBoostActive =
    state.incarnationBoostTimer > 0 ||
    (state.hasGnoseUpgrade('gn_bencao_eterna') && state.isIncarnationUnlocked());
  const incarnationBonus =
    ((state.incarnationStage - 1) * 0.35 + (isBoostActive ? 0.25 : 0)) / difficultyScale;

  // 6. Gnose & Conquistas (Gnose points, total Gnose earned, assimilated Gnose nodes, and unlocked Achievements)
  const effectiveGnose = Math.max(state.gnosePoints, state.totalGnoseEarned);
  const gnoseLog = effectiveGnose > 0 ? Math.log10(effectiveGnose + 1) : 0;
  const gnoseNodes = state.unlockedGnoseUpgrades.size;
  const unlockedAchievements = state.achievements.filter((a) => a.unlocked).length;
  const achievementsBonus = (unlockedAchievements * 0.025) / difficultyScale;
  const gnoseBonus =
    (gnoseLog * 0.22 + gnoseNodes * 0.08 + unlockedAchievements * 0.015) / difficultyScale;

  const bonusSum =
    faithBonus +
    followersBonus +
    fervorBonus +
    relicsBonus +
    incarnationBonus +
    gnoseBonus +
    achievementsBonus;
  const curseMult = getBossCurseMultiplier(state);
  const totalResourceMultiplier = (1 + bonusSum) * curseMult;

  // Spending or resetting the cult must never reduce readiness.
  const totalGnoseEarned = Math.max(0, state.totalGnoseEarned);
  const baseReadiness = boss.id === 'boss_anubis' ? BOSS_DAMAGE_READINESS_THRESHOLD : 0;
  const cultReadiness = Math.min(2, baseReadiness + (1 - baseReadiness)
    * Math.log1p(totalGnoseEarned) / Math.log1p(boss.readinessGnose));
  const canDamageBoss = cultReadiness >= BOSS_DAMAGE_READINESS_THRESHOLD;
  const canWithstandBoss = cultReadiness >= BOSS_DEFENSE_READINESS_THRESHOLD;
  const damageMultiplier = canDamageBoss ? Math.min(1, cultReadiness) : 0;

  const hasActiveCultPower =
    fps > 0 ||
    followersCount > 0 ||
    state.fervorPoints > 0 ||
    fervorLevels > 0 ||
    effectiveRelics > 0 ||
    relicLevels > 0 ||
    state.incarnationStage > 1 ||
    effectiveGnose > 0 ||
    gnoseNodes > 0 ||
    state.faithPoints > 1 ||
    state.totalFaithAccumulated > 1 ||
    state.totalFervorGenerated > 0 ||
    state.totalRelicsGenerated > 0;

  const hasHadesChains =
    state.activeBossBattle &&
    state.activeBossBattle.bossId === boss.id &&
    state.activeBossBattle.activeRifts.some((r) => r.kind === 'hades_chains');
  const passiveChainMult = hasHadesChains ? 0.75 : 1.0;
  const chainPenaltyMult = hasHadesChains ? 0.5 : 1.0;

  // Normalize and cap final damage: Cult Readiness + Resource Synergies + Raw Production determine battle speed.
  const bossCurse = getBossCurseModifiers(state, boss.id);
  const readinessFactor = 0.45 + 0.55 * cultReadiness;
  const passiveDps =
    damageMultiplier *
    passiveChainMult *
    bossCurse.damageTakenMult *
    Math.min(
      bossMaxHp * BOSS_MAX_PASSIVE_HP_PER_SEC,
      Math.max(fps, hasActiveCultPower ? bossMaxHp * bonusSum * 0.00175 * readinessFactor * curseMult : 0)
    );
  const passiveHpFractionPerSec = passiveDps / bossMaxHp;

  const rawClickDamage = Math.min(
    bossMaxHp * BOSS_MAX_CLICK_HP_FRACTION,
    Math.max(
      fpc,
      bossMaxHp *
        0.0014 *
        (0.6 + 0.4 * cultReadiness) *
        (1 + bonusSum * 0.12 + fervorBonus * 0.08 + incarnationBonus * 0.08)
    )
  );
  const clickDamage = rawClickDamage * chainPenaltyMult * damageMultiplier * bossCurse.damageTakenMult;
  const clickHpFraction = clickDamage / bossMaxHp;

  // Parrying cancels the incoming strike without healing the Sphere or dealing direct Boss damage.
  const riftHpFraction = 0;
  const riftDamage = 0;

  // Protection follows the same lifetime-Gnose curve as the readiness indicator.
  const defenseScore = Math.max(0, cultReadiness - BOSS_DAMAGE_READINESS_THRESHOLD) * 4;
  const mitigationFactor = 1 / (1 + defenseScore * 1.85);
  const minMissFloor =
    boss.id === 'boss_anubis'
      ? 3.2
      : boss.id === 'boss_cronos'
        ? 4.2
        : boss.id === 'boss_odin'
          ? 5.5
          : 7.5;
  const baseAltarDamageOnMiss = Math.max(minMissFloor, boss.altarDamageOnMiss * mitigationFactor);
  const curseMissFloors = [0, 30, 45, 65, 85, 100];
  const cursedMissFloor = curseMissFloors[bossCurse.stacks] ?? BOSS_MAX_ALTAR_INTEGRITY;
  const altarDamageOnMiss = canWithstandBoss
    ? Math.min(
        BOSS_MAX_ALTAR_INTEGRITY,
        Math.max(baseAltarDamageOnMiss * bossCurse.damageDealtMult, cursedMissFloor)
      )
    : BOSS_MAX_ALTAR_INTEGRITY;

  // Continuous Sphere tension without any parry healing: hitless play survives Phase II (-15%) + Phase III (-30%) shockwaves + aura drain.
  // Under Curse, scale aura pressure alongside damageTakenMult so the longer battle remains winnable on hitless play even at 5/5 Curse.
  const rawPressure = Math.max(
    0.06,
    (boss.altarPressurePerSec ?? 0.65) / (1 + defenseScore * 2.65)
  );
  const altarPressurePerSec =
    bossCurse.stacks > 0 && canWithstandBoss
      ? Math.min(0.45, rawPressure) * bossCurse.damageTakenMult
      : rawPressure;
  const altarHealOnRift = 0;

  const estimatedPassiveVictorySec =
    passiveHpFractionPerSec > 0 ? 1 / passiveHpFractionPerSec : Infinity;
  const avgMissDrainPerSec = altarDamageOnMiss / (boss.riftIntervalSec + boss.riftWindowSec * 0.35);
  const estimatedAltarSurvivalSec =
    BOSS_MAX_ALTAR_INTEGRITY / Math.max(0.05, altarPressurePerSec + avgMissDrainPerSec);

  return {
    faithBonus,
    followersBonus,
    fervorBonus,
    relicsBonus,
    incarnationBonus,
    gnoseBonus,
    achievementsBonus,
    totalResourceMultiplier,
    cultReadiness,
    canDamageBoss,
    canWithstandBoss,
    totalGnoseEarned,
    readinessGnose: boss.readinessGnose,
    passiveHpFractionPerSec,
    passiveDps,
    clickHpFraction,
    clickDamage,
    riftHpFraction,
    riftDamage,
    altarDamageOnMiss,
    altarHealOnRift,
    altarPressurePerSec,
    estimatedPassiveVictorySec,
    estimatedAltarSurvivalSec,
    curseStacks: bossCurse.stacks,
    curseDamageReduction: bossCurse.damageReduction,
    curseExtraDamageRatio: bossCurse.extraDamageRatio,
  };
}

export function startBossBattle(
  state: BossCombatStateHost,
  bossId: string,
  options?: { awaitProcession?: boolean; isRematch?: boolean }
): boolean {
  const boss = COMBAT_BOSSES.find((b) => b.id === bossId);
  const isRematch = options?.isRematch === true;
  if (state.activeBossBattle || !boss || !canChallengeBoss(state, bossId, { isRematch })) {
    return false;
  }

  if (bossId === 'boss_demiurge') state.demiurge.phase = 'fighting';
  state.activeBossBattle = {
    bossId: boss.id,
    bossHp: boss.maxHp,
    bossMaxHp: boss.maxHp,
    altarIntegrity: BOSS_MAX_ALTAR_INTEGRITY,
    maxAltarIntegrity: BOSS_MAX_ALTAR_INTEGRITY,
    riftSpawnTimerSec: boss.riftIntervalSec * 0.65,
    activeRifts: [],
    riftsShattered: 0,
    riftsMissed: 0,
    combatStarted: options?.awaitProcession ? false : true,
    phase: 1,
    comboStreak: 0,
    activeMiracle: null,
    miracleSpawnTimerSec: 11,
    highestPhaseShocked: 1,
    isRematch,
    elapsedCombatSec: 0,
    attackWaveCounter: 0,
  };
  return true;
}

export function beginBossCombat(state: BossCombatStateHost): void {
  if (state.activeBossBattle) {
    state.activeBossBattle.combatStarted = true;
  }
}

export function getBossPhase(state: BossCombatStateHost): 1 | 2 | 3 {
  if (!state.activeBossBattle) return 1;
  const hpRatio = state.activeBossBattle.bossHp / state.activeBossBattle.bossMaxHp;
  if (hpRatio <= 0.25) return 3;
  if (hpRatio <= 0.6) return 2;
  return 1;
}

/**
 * Applies lethal Phase II (15%) and Phase III (30%) shockwave damage to Sphere Integrity,
 * clears stale active rifts without extra miss penalty, and guarantees a Faithful Miracle on the circle.
 * Returns true if the Altar collapsed (defeat).
 */
export function checkAndApplyBossPhaseTransitions(state: BossCombatStateHost): boolean {
  const battle = state.activeBossBattle;
  if (!battle) return false;

  const newPhase = getBossPhase(state);
  battle.phase = newPhase;
  const prevShocked = battle.highestPhaseShocked ?? 1;
  if (newPhase <= prevShocked) {
    return false;
  }

  let phaseDamage = 0;
  if (prevShocked < 2 && newPhase >= 2) {
    phaseDamage += 15;
  }
  if (prevShocked < 3 && newPhase >= 3) {
    phaseDamage += 30;
  }
  battle.highestPhaseShocked = newPhase;

  // Dissipate existing rifts without extra penalty at the exact instant of phase shockwave
  battle.activeRifts = [];

  if (phaseDamage > 0) {
    battle.altarIntegrity = Math.max(0, battle.altarIntegrity - phaseDamage);
    if (battle.altarIntegrity <= 0) {
      completeBossBattle(state, false);
      return true;
    }
    // Guarantee a Faithful Miracle on the wheel right after the Phase II/III shockwave if none is active
    if (!battle.activeMiracle) {
      spawnBossMiracle(state);
    }
  }
  return false;
}

export function spawnBossMiracle(state: BossCombatStateHost, preferredSlot?: number): void {
  const battle = state.activeBossBattle;
  if (!battle) return;
  if (!state.areMiraclesUnlocked()) return;
  state.miracleIdCounter += 1;
  const totalSlots = Math.max(1, Math.min(34, Math.max(1, state.getTotalFollowersCount())));
  const slot =
    typeof preferredSlot === 'number' && preferredSlot >= 0
      ? preferredSlot % totalSlots
      : (state.miracleIdCounter * 7 + Math.floor(battle.elapsedCombatSec ?? 0)) % totalSlots;
  battle.activeMiracle = {
    id: `miracle_${state.miracleIdCounter}`,
    followerSlot: slot,
    remainingSec: 1.5,
    maxSec: 1.5,
  };
  battle.miracleSpawnTimerSec = 10 + ((state.miracleIdCounter * 3) % 5);
}

export function clickBossMiracle(
  state: BossCombatStateHost
): { healed: number; triggered: boolean; integrityAfter: number } {
  const battle = state.activeBossBattle;
  if (!battle || battle.combatStarted === false || !battle.activeMiracle) {
    return { healed: 0, triggered: false, integrityAfter: battle?.altarIntegrity ?? 0 };
  }
  const before = battle.altarIntegrity;
  battle.altarIntegrity = Math.min(battle.maxAltarIntegrity, battle.altarIntegrity + 10);
  const healed = battle.altarIntegrity - before;
  battle.activeMiracle = null;
  battle.miracleSpawnTimerSec = 10 + ((state.miracleIdCounter * 3) % 5);
  return { healed, triggered: true, integrityAfter: battle.altarIntegrity };
}

/**
 * Phase-based boss attack schedule:
 * - Phase 1 (>60% HP): normal attacks only
 * - Phase 2 (25%..60% HP): both normal and special attacks
 * - Phase 3 (<=25% HP): special attacks only
 */
export function shouldSpawnSpecialBossRift(phase: 1 | 2 | 3, wave: number): boolean {
  if (phase === 1) return false;
  if (phase === 3) return true;
  return wave % 2 === 0;
}

/** Multiplier applied to breakdown.altarDamageOnMiss when an unparried rift expires. */
export function getBossRiftMissDamageMultiplier(
  rift: { kind?: BossRiftKind; chainTotal?: number },
  curseStacks: number
): number {
  const kind = rift.kind ?? 'standard';
  if (kind === 'standard') return 1.0;

  if (kind === 'hades_chains') {
    const base = rift.chainTotal === 3 ? BOSS_HADES_CHAIN_3_MISS_MULT : BOSS_HADES_CHAIN_2_MISS_MULT;
    if (curseStacks >= BOSS_CURSE_MAX_STACKS) return Math.max(1.0, base);
    return Math.min(BOSS_SPECIAL_MISS_MULT, base + curseStacks * 0.15);
  }

  if (kind === 'chaos_orbit') {
    const base = BOSS_CHAOS_SEAL_MISS_MULT;
    if (curseStacks >= BOSS_CURSE_MAX_STACKS) return Math.max(1.0, base);
    return Math.min(BOSS_SPECIAL_MISS_MULT, base + curseStacks * 0.15);
  }

  // Single-target specials (Anúbis scales timeout, Odin raven timeout, etc.) hit significantly harder than normal.
  return BOSS_SPECIAL_MISS_MULT;
}

export function spawnBossRift(
  state: BossCombatStateHost,
  options?: { forceSpecial?: boolean; forceStandard?: boolean }
): void {
  if (!state.activeBossBattle) return;
  const battle = state.activeBossBattle;
  const boss = COMBAT_BOSSES.find((b) => b.id === battle.bossId);
  if (!boss) return;

  // Clear any harmlessly resolved Anúbis trap pan before spawning the next wave
  battle.activeRifts = battle.activeRifts.filter((r) => !r.scaleHigherSelected);

  const phase = getBossPhase(state);
  const curse = getBossCurseModifiers(state, boss.id);
  const wave = (battle.attackWaveCounter ?? 0) + 1;
  battle.attackWaveCounter = wave;

  const useSpecial =
    options?.forceSpecial === true ||
    (!options?.forceStandard && shouldSpawnSpecialBossRift(phase, wave));

  const windowScale = (phase === 3 ? 0.85 : phase === 2 ? 0.92 : 1.0) * curse.windowScaleMult;
  const baseWindowSec = Math.max(1.25, boss.riftWindowSec * windowScale);

  if (!useSpecial) {
    state.riftIdCounter += 1;
    const angle = ((state.riftIdCounter * 137.5) % 360) * (Math.PI / 180);
    const radiusPercent = 30 + (state.riftIdCounter % 3) * 6;
    const xPercent = Math.max(14, Math.min(86, 50 + Math.cos(angle) * radiusPercent));
    const yPercent = Math.max(18, Math.min(82, 50 + Math.sin(angle) * radiusPercent));

    battle.activeRifts.push({
      id: `rift_${state.riftIdCounter}`,
      xPercent,
      yPercent,
      remainingSec: baseWindowSec,
      maxSec: baseWindowSec,
      kind: 'standard',
      attackIndex: 0,
    });
    return;
  }

  // Signature Guardian attacks (synced with the 2nd spritesheet of each Guardian)
  const groupId = `grp_${wave}_${state.riftIdCounter + 1}`;
  if (boss.id === 'boss_anubis') {
    const positions = [
      { xPercent: 28, yPercent: 32, slotIndex: 0 },
      { xPercent: 72, yPercent: 32, slotIndex: 1 },
    ];
    // Two-digit weights with a tight 5..13 spread and non-alternating side so players must read both plates
    const diff = 5 + ((wave * 7) % 9);
    const lowerValue = 24 + ((wave * 19 + state.riftIdCounter * 13) % 52);
    const higherValue = lowerValue + diff;
    const higherSlot = (Math.imul(wave + state.riftIdCounter, 2654435761) >>> 30) & 1;
    const scaleWindow = Math.max(1.9, baseWindowSec * 1.02);
    for (const pos of positions) {
      state.riftIdCounter += 1;
      battle.activeRifts.push({
        id: `rift_${state.riftIdCounter}`,
        xPercent: pos.xPercent,
        yPercent: pos.yPercent,
        remainingSec: scaleWindow,
        maxSec: scaleWindow,
        kind: 'anubis_scales',
        scaleValue: pos.slotIndex === higherSlot ? higherValue : lowerValue,
        attackIndex: 1,
        groupId,
        slotIndex: pos.slotIndex,
      });
    }
  } else if (boss.id === 'boss_cronos') {
    // Sequenced Underworld Chains: 1º → 2º (and 1º → 2º → 3º in Phase III) at varied arc slots
    const chainCount = phase >= 3 ? 3 : 2;
    const slotPermutations =
      chainCount === 3
        ? [
            [0, 1, 2],
            [1, 2, 0],
            [2, 0, 1],
            [0, 2, 1],
            [2, 1, 0],
            [1, 0, 2],
          ]
        : [
            [0, 1],
            [1, 0],
          ];
    const slots = slotPermutations[(wave + state.riftIdCounter) % slotPermutations.length];
    const chainWindow =
      chainCount === 3
        ? Math.max(2.25, baseWindowSec * 1.38)
        : Math.max(1.95, baseWindowSec * 1.12);
    for (let orderIdx = 0; orderIdx < chainCount; orderIdx++) {
      const slotIndex = slots[orderIdx];
      state.riftIdCounter += 1;
      battle.activeRifts.push({
        id: `rift_${state.riftIdCounter}`,
        xPercent: 32 + slotIndex * 22,
        yPercent: 30 + slotIndex * 20,
        remainingSec: chainWindow,
        maxSec: chainWindow,
        kind: 'hades_chains',
        attackIndex: 1,
        groupId,
        slotIndex,
        chainOrder: orderIdx + 1,
        chainTotal: chainCount,
      });
    }
  } else if (boss.id === 'boss_demiurge') {
    state.riftIdCounter++;
    battle.activeRifts.push({
      id: `rift_${state.riftIdCounter}`,
      xPercent: 50,
      yPercent: 20,
      remainingSec: RITUAL_DURATION,
      maxSec: RITUAL_DURATION,
      kind: 'demiurge_ritual',
      attackIndex: 1,
      groupId,
    });
  } else if (boss.id === 'boss_odin') {
    state.riftIdCounter += 1;
    const ravenWindow = Math.max(1.8, baseWindowSec * 1.14);
    battle.activeRifts.push({
      id: `rift_${state.riftIdCounter}`,
      xPercent: 46,
      yPercent: 26,
      remainingSec: ravenWindow,
      maxSec: ravenWindow,
      kind: 'odin_raven',
      attackIndex: 1,
      groupId,
      slotIndex: 0,
    });
  } else {
    const positions = [
      { xPercent: 50, yPercent: 18, slotIndex: 0 },
      { xPercent: 22, yPercent: 72, slotIndex: 1 },
      { xPercent: 78, yPercent: 72, slotIndex: 2 },
    ];
    const chaosWindow = Math.max(2.05, baseWindowSec * 1.36);
    for (const pos of positions) {
      state.riftIdCounter += 1;
      battle.activeRifts.push({
        id: `rift_${state.riftIdCounter}`,
        xPercent: pos.xPercent,
        yPercent: pos.yPercent,
        remainingSec: chaosWindow,
        maxSec: chaosWindow,
        kind: 'chaos_orbit',
        attackIndex: 1,
        groupId,
        slotIndex: pos.slotIndex,
      });
    }
  }
}

export function clickBossRift(
  state: BossCombatStateHost,
  riftId: string,
  pointerPosition?: number,
  displayedRemainingSec?: number
): BossRiftClickResult {
  if (!state.activeBossBattle || state.activeBossBattle.combatStarted === false) {
    return { damage: 0, shattered: false, victory: false };
  }
  const battle = state.activeBossBattle;
  const idx = battle.activeRifts.findIndex((r) => r.id === riftId);
  if (idx === -1) {
    return { damage: 0, shattered: false, victory: false };
  }

  const rift = battle.activeRifts[idx];
  const kind: BossRiftKind = rift.kind ?? 'standard';
  const groupId = rift.groupId;

  if (kind === 'odin_raven') {
    const cueRift =
      typeof displayedRemainingSec === 'number' && Number.isFinite(displayedRemainingSec)
        ? { remainingSec: displayedRemainingSec, maxSec: rift.maxSec }
        : rift;
    if (!odinParryCue(cueRift).green) {
      const damage =
        calculateBossCombatBreakdown(state, battle.bossId).altarDamageOnMiss * BOSS_SPECIAL_MISS_MULT;
      const before = battle.altarIntegrity;
      battle.activeRifts.splice(idx, 1);
      battle.riftsMissed++;
      battle.comboStreak = 0;
      battle.lastMissDamage = damage;
      battle.lastMissWasSpecial = true;
      battle.altarIntegrity = Math.max(0, before - damage);
      if (battle.altarIntegrity <= 0) completeBossBattle(state, false);
      return {
        damage: 0,
        shattered: false,
        victory: false,
        kind,
        altarDamageTaken: before - battle.altarIntegrity,
      };
    }
  }

  if (kind === 'demiurge_ritual') {
    const result = ritualJudgement(pointerPosition ?? ritualPointer(rift.maxSec - rift.remainingSec));
    const curse = getBossCurseModifiers(state, battle.bossId);
    const effectivePercent =
      result.side === 'sun' && curse.stacks > 0
        ? curse.stacks >= BOSS_CURSE_MAX_STACKS
          ? 100
          : Math.min(100, Math.max(result.percent * curse.damageDealtMult, curse.stacks * 25))
        : result.percent;
    battle.ritualOutcome = {
      id: rift.id,
      side: result.side,
      percent: effectivePercent,
      remainingSec: 1.7,
    };
    if (result.side !== 'center') {
      battle.activeRifts.splice(idx, 1);
      battle.riftsMissed++;
      battle.comboStreak = 0;
      if (result.side === 'moon') {
        battle.bossHp = Math.min(battle.bossMaxHp, battle.bossHp + (battle.bossMaxHp * result.percent) / 100);
        battle.phase = getBossPhase(state);
        if (curse.stacks >= BOSS_CURSE_MAX_STACKS) {
          battle.lastMissDamage = battle.maxAltarIntegrity;
          battle.lastMissWasSpecial = true;
          battle.altarIntegrity = 0;
          completeBossBattle(state, false);
        }
      } else {
        const sunDamage = (battle.maxAltarIntegrity * effectivePercent) / 100;
        battle.lastMissDamage = sunDamage;
        battle.lastMissWasSpecial = true;
        battle.altarIntegrity = Math.max(0, battle.altarIntegrity - sunDamage);
        if (battle.altarIntegrity <= 0) completeBossBattle(state, false);
      }
      return {
        damage: 0,
        shattered: false,
        victory: false,
        kind,
        ritualSide: result.side,
        ritualPercent: effectivePercent,
      };
    }
  }

  if (kind === 'hades_chains' && typeof rift.chainOrder === 'number') {
    const siblings = battle.activeRifts.filter((r) => r.kind === kind && r.groupId === groupId);
    const isLocked = siblings.some(
      (r) => typeof r.chainOrder === 'number' && r.chainOrder < rift.chainOrder!
    );
    if (isLocked) {
      const breakdown = calculateBossCombatBreakdown(state, battle.bossId);
      const curse = getBossCurseModifiers(state, battle.bossId);
      const lockMult =
        curse.stacks >= BOSS_CURSE_MAX_STACKS
          ? 1.0
          : Math.min(1.25, 0.5 + curse.stacks * 0.18);
      const recoil = breakdown.canWithstandBoss
        ? Math.max(4, breakdown.altarDamageOnMiss * lockMult)
        : breakdown.altarDamageOnMiss * Math.max(1, lockMult);
      const before = battle.altarIntegrity;
      battle.comboStreak = 0;
      battle.altarIntegrity = Math.max(0, before - recoil);
      if (battle.altarIntegrity <= 0) completeBossBattle(state, false);
      return {
        damage: 0,
        shattered: false,
        victory: false,
        kind,
        chainLocked: true,
        altarDamageTaken: before - battle.altarIntegrity,
      };
    }
  }

  if (kind === 'anubis_scales') {
    const siblings = battle.activeRifts.filter((r) => r.kind === kind && r.groupId === groupId);
    const isLower =
      rift.scaleHigherSelected === true ||
      siblings.some((r) => (r.scaleValue ?? 0) > (rift.scaleValue ?? 0));
    if (isLower) {
      const multiplier = BOSS_ANUBIS_WRONG_SCALE_MULT;
      const damage = calculateBossCombatBreakdown(state, battle.bossId).altarDamageOnMiss * multiplier;
      const before = battle.altarIntegrity;
      battle.activeRifts = battle.activeRifts.filter((r) => !siblings.includes(r));
      battle.altarIntegrity = Math.max(0, before - damage);
      battle.riftsMissed += 1;
      battle.comboStreak = 0;
      battle.lastMissDamage = damage;
      battle.lastMissWasSpecial = true;
      if (battle.altarIntegrity <= 0) completeBossBattle(state, false);
      return {
        damage: 0,
        shattered: false,
        victory: false,
        kind,
        altarDamageTaken: before - battle.altarIntegrity,
        scaleDamageMultiplier: multiplier,
      };
    }
    // Keep the lower pan briefly clickable to catch blind double-clicking, then expire harmlessly.
    siblings.forEach((r) => {
      if (r !== rift) {
        r.scaleHigherSelected = true;
        r.remainingSec = Math.min(r.remainingSec, 0.75);
      }
    });
  }

  const nextCombo = (battle.comboStreak ?? 0) + 1;
  battle.comboStreak = nextCombo;

  battle.activeRifts.splice(idx, 1);
  battle.riftsShattered += 1;

  let specialBonusTriggered = false;
  const miracleAwakened = false;
  const remainingSameGroup = groupId
    ? battle.activeRifts.filter((r) => r.groupId === groupId && !r.scaleHigherSelected).length
    : 0;

  if (kind === 'hades_chains' && remainingSameGroup === 0) {
    battle.riftSpawnTimerSec += 0.65;
    specialBonusTriggered = true;
  } else if (kind === 'odin_raven') {
    battle.riftSpawnTimerSec += 1.4;
    specialBonusTriggered = true;
  } else if (kind === 'chaos_orbit' && remainingSameGroup === 0) {
    battle.riftSpawnTimerSec += 0.8;
    specialBonusTriggered = true;
  } else if (kind === 'demiurge_ritual') {
    battle.riftSpawnTimerSec += 1.2;
    specialBonusTriggered = true;
  }

  return {
    damage: 0,
    shattered: true,
    victory: false,
    comboStreak: nextCombo,
    kind,
    specialBonusTriggered,
    miracleAwakened,
  };
}

export function retreatBossBattle(state: BossCombatStateHost): void {
  if (state.activeBossBattle?.bossId === 'boss_demiurge') { state.demiurge.phase = state.activeBossBattle.isRematch ? 'defeated' : 'walking'; state.demiurge.elapsed = 0; }
  state.activeBossBattle = null;
}

export function defeatBossForTesting(state: BossCombatStateHost, bossId: string): boolean {
  if (!COMBAT_BOSSES.some((boss) => boss.id === bossId)) return false;
  if (state.activeBossBattle?.bossId === bossId) {
    completeBossBattle(state, true);
  } else {
    state.defeatedBosses.add(bossId);
    state.bossCurseTimerSec = 0;
    state.bossCurseStacks = 0;
    state.bossCurseBossId = null;
  }
  return true;
}

export function completeBossBattle(state: BossCombatStateHost, victory: boolean): void {
  if (!state.activeBossBattle) return;
  const battle = state.activeBossBattle;
  const boss = COMBAT_BOSSES.find((b) => b.id === battle.bossId);
  const isRematch = battle.isRematch === true;
  const durationSec = Math.max(0.1, battle.elapsedCombatSec ?? 0);
  state.activeBossBattle = null;

  if (battle.bossId === 'boss_demiurge') {
    state.demiurge.phase = victory || isRematch ? 'defeated' : 'walking';
    state.demiurge.elapsed = 0;
  }

  let cursePurified = false;
  if (victory && boss) {
    const foughtCurseStacks = getBossCurseModifiers(state, boss.id).stacks;
    if (foughtCurseStacks >= BOSS_CURSE_MAX_STACKS) {
      state.maxCurseDefeatedBosses?.add(boss.id);
    }
    const cleanseBoss = getBossCurseCleanseBoss(state);
    if (
      getBossCurseStacks(state) > 0 &&
      (boss.id === cleanseBoss?.id || boss.id === state.bossCurseBossId)
    ) {
      state.bossCurseStacks = 0;
      state.bossCurseBossId = null;
      cursePurified = true;
    }
    state.defeatedBosses.add(boss.id);
    state.bossCurseTimerSec = 0;
    const prevBest = state.bestBossTimesSec[boss.id];
    if (durationSec > 0 && (typeof prevBest !== 'number' || durationSec < prevBest)) {
      state.bestBossTimesSec[boss.id] = Number(durationSec.toFixed(1));
    }
  } else if (!victory && boss) {
    state.bossCurseTimerSec = 0;
    if (isBossSubjectToCurse(boss.id)) {
      state.bossCurseStacks = Math.min(BOSS_CURSE_MAX_STACKS, getBossCurseStacks(state) + 1);
      const currentIdx = state.bossCurseBossId
        ? COMBAT_BOSSES.findIndex((b) => b.id === state.bossCurseBossId)
        : -1;
      const lostIdx = COMBAT_BOSSES.findIndex((b) => b.id === boss.id);
      if (lostIdx >= currentIdx) {
        state.bossCurseBossId = boss.id;
      }
    }
  }

  if (boss && state.onBossBattleFinished) {
    state.onBossBattleFinished({
      boss,
      victory,
      isRematch,
      durationSec,
      cursePurified,
      curseStacks: getBossCurseStacks(state),
    });
  }
}

export function tickBossBattle(state: BossCombatStateHost, deltaSec: number): void {
  const battle = state.activeBossBattle;
  if (!battle || battle.combatStarted === false) return;

  const boss = COMBAT_BOSSES.find((b) => b.id === battle.bossId);
  if (!boss) return;

  battle.elapsedCombatSec = (battle.elapsedCombatSec ?? 0) + deltaSec;
  const breakdown = calculateBossCombatBreakdown(state, battle.bossId);
  const curse = getBossCurseModifiers(state, battle.bossId);

  // Check if external HP manipulation crossed a phase boundary before ticking rifts
  if (checkAndApplyBossPhaseTransitions(state)) {
    return;
  }
  const phase = getBossPhase(state);
  battle.phase = phase;

  if (battle.ritualOutcome) battle.ritualOutcome.remainingSec = Math.max(0, battle.ritualOutcome.remainingSec - deltaSec);

  // 1. Update active rifts & check for expired rifts first so defeat on expiry takes precedence over passive tick victory
  let expiredDamage = 0;
  let expiredSpecial = false;
  for (const rift of [...battle.activeRifts].reverse()) {
    const i = battle.activeRifts.indexOf(rift);
    if (i === -1) continue;
    rift.remainingSec -= deltaSec;
    if (rift.remainingSec <= 0) {
      if (rift.kind === 'demiurge_ritual') {
        clickBossRift(state, rift.id, ritualPointer(rift.maxSec));
        if (!state.activeBossBattle) return;
        continue;
      }
      battle.activeRifts.splice(i, 1);
      if (rift.kind === 'anubis_scales') {
        battle.activeRifts = battle.activeRifts.filter(
          (r) => r.kind !== 'anubis_scales' || r.groupId !== rift.groupId
        );
        if (rift.scaleHigherSelected) continue;
      }
      battle.riftsMissed += 1;
      battle.comboStreak = 0;
      const missMult = getBossRiftMissDamageMultiplier(rift, curse.stacks);
      const riftDamage =
        breakdown.altarDamageOnMiss * (breakdown.canWithstandBoss ? missMult : Math.max(1, missMult));
      expiredDamage += riftDamage;
      if ((rift.kind ?? 'standard') !== 'standard') {
        expiredSpecial = true;
      }
      battle.altarIntegrity = Math.max(0, battle.altarIntegrity - riftDamage);
      if (battle.altarIntegrity <= 0) {
        battle.lastMissDamage = expiredDamage;
        battle.lastMissWasSpecial = expiredSpecial;
        completeBossBattle(state, false);
        return;
      }
    }
  }
  if (expiredDamage > 0) {
    battle.lastMissDamage = expiredDamage;
    battle.lastMissWasSpecial = expiredSpecial;
  }

  // 1b. Continuous pressure, mitigated only by lifetime-Gnose readiness.
  if (breakdown.altarPressurePerSec > 0) {
    battle.altarIntegrity = Math.max(
      0,
      battle.altarIntegrity - breakdown.altarPressurePerSec * deltaSec
    );
    if (battle.altarIntegrity <= 0) {
      completeBossBattle(state, false);
      return;
    }
  }

  // 1c. Update Faithful Miracle on the Sacred Circle (1.5s duration, spawns every ~10..14s)
  if (battle.activeMiracle) {
    battle.activeMiracle.remainingSec -= deltaSec;
    if (battle.activeMiracle.remainingSec <= 0) {
      battle.activeMiracle = null;
    }
  } else {
    battle.miracleSpawnTimerSec = (battle.miracleSpawnTimerSec ?? 11) - deltaSec;
    if (battle.miracleSpawnTimerSec <= 0) {
      spawnBossMiracle(state);
    }
  }

  // 2. Passive DPS from all Cult Resources (Fé, Fiéis, Fervor, Relíquias, Encarnação, Gnose, Conquistas)
  if (breakdown.passiveDps > 0) {
    battle.bossHp = Math.max(0, battle.bossHp - breakdown.passiveDps * deltaSec);
    battle.phase = getBossPhase(state);
    if (battle.bossHp <= 0) {
      completeBossBattle(state, true);
      return;
    }
    if (checkAndApplyBossPhaseTransitions(state)) {
      return;
    }
  }

  // Hold new attack waves while any signature Guardian mechanic is active so UI & focus stay crystal clear
  const hasActiveSpecial = battle.activeRifts.some(
    (r) => (r.kind ?? 'standard') !== 'standard' && !r.scaleHigherSelected
  );
  if (hasActiveSpecial || (battle.ritualOutcome?.remainingSec ?? 0) > 0) {
    battle.riftSpawnTimerSec = Math.max(battle.riftSpawnTimerSec, 0.45);
    return;
  }

  // 3. Spawn new rifts periodically (faster in Phase 2 & 3 and under Curse fury)
  const currentPhase = battle.phase;
  const phaseIntervalScale = currentPhase === 3 ? 0.78 : currentPhase === 2 ? 0.88 : 1.0;
  battle.riftSpawnTimerSec -= deltaSec;
  if (battle.riftSpawnTimerSec <= 0) {
    const nextWave = (battle.attackWaveCounter ?? 0) + 1;
    const nextWillBeSpecial = shouldSpawnSpecialBossRift(currentPhase, nextWave);
    const blockingRifts = battle.activeRifts.filter((r) => !r.scaleHigherSelected);
    if (nextWillBeSpecial && blockingRifts.length > 0) {
      battle.riftSpawnTimerSec = 0.2;
      return;
    }
    battle.riftSpawnTimerSec += (boss.riftIntervalSec * phaseIntervalScale) / curse.attackCadenceMult;
    if (blockingRifts.length < 3) {
      spawnBossRift(state);
    }
  }
}
