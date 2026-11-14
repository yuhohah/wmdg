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
  BOSS_CURSE_DURATION_SEC,
  BOSS_CURSE_MULTIPLIER,
  BOSS_DAMAGE_READINESS_THRESHOLD,
  BOSS_DEFENSE_READINESS_THRESHOLD,
  BOSS_MAX_ALTAR_INTEGRITY,
  BOSS_MAX_CLICK_HP_FRACTION,
  BOSS_MAX_PASSIVE_HP_PER_SEC,
  COMBAT_BOSSES,
} from '../config/bosses.js';

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
  bestBossTimesSec: Record<string, number>;
  bossCurseTimerSec: number;
  activeBossBattle: ActiveBossBattle | null;
  riftIdCounter: number;
  miracleIdCounter: number;
  onBossBattleFinished?: (result: {
    boss: GnoseBoss;
    victory: boolean;
    isRematch?: boolean;
    durationSec?: number;
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
  areMiraclesAutoCollected(): boolean;
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
    GNOSE_UPGRADES.filter((u) => u.tier === previousTier).every((u) => state.hasGnoseUpgrade(u.id))
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

  // Normalize and cap final damage: Cult Readiness + Resource Synergies + Raw Production determine battle speed.
  const readinessFactor = 0.45 + 0.55 * cultReadiness;
  const passiveDps =
    damageMultiplier *
    Math.min(
      bossMaxHp * BOSS_MAX_PASSIVE_HP_PER_SEC,
      Math.max(fps, hasActiveCultPower ? bossMaxHp * bonusSum * 0.00175 * readinessFactor * curseMult : 0)
    );
  const passiveHpFractionPerSec = passiveDps / bossMaxHp;

  const hasHadesChains =
    state.activeBossBattle &&
    state.activeBossBattle.bossId === boss.id &&
    state.activeBossBattle.activeRifts.some((r) => r.kind === 'hades_chains');
  const chainPenaltyMult = hasHadesChains ? 0.5 : 1.0;

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
  const clickDamage = rawClickDamage * chainPenaltyMult * damageMultiplier;
  const clickHpFraction = clickDamage / bossMaxHp;

  // Parrying is defensive: it charges the Sphere without dealing damage.
  const riftDamage = 0;
  const riftHpFraction = 0;

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
  const altarDamageOnMiss = canWithstandBoss
    ? Math.max(minMissFloor, boss.altarDamageOnMiss * mitigationFactor)
    : BOSS_MAX_ALTAR_INTEGRITY;
  const altarHealOnRift = Math.min(16, followersBonus * 4 + relicsBonus * 5 + incarnationBonus * 4);

  // Low readiness makes misses lethal, not perfect play impossible.
  const altarPressurePerSec = Math.max(0.06,
    (boss.altarPressurePerSec ?? 0.65) / (1 + defenseScore * 2.2));

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
    sphereCooldownSec: 0,
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
  if (state.areMiraclesAutoCollected()) clickBossMiracle(state);
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

export function spawnBossRift(
  state: BossCombatStateHost,
  options?: { forceSpecial?: boolean; forceStandard?: boolean }
): void {
  if (!state.activeBossBattle) return;
  const battle = state.activeBossBattle;
  const boss = COMBAT_BOSSES.find((b) => b.id === battle.bossId);
  if (!boss) return;

  const phase = getBossPhase(state);
  const wave = (battle.attackWaveCounter ?? 0) + 1;
  battle.attackWaveCounter = wave;

  const useSpecial =
    options?.forceSpecial === true ||
    (!options?.forceStandard && phase >= 2 && wave % 2 === 0);

  const windowScale = phase === 3 ? 0.85 : phase === 2 ? 0.92 : 1.0;
  const baseWindowSec = Math.max(1.3, boss.riftWindowSec * windowScale);

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

  // Special Attack 2 patterns (synced with the 2nd spritesheet of each Guardian)
  const groupId = `grp_${wave}_${state.riftIdCounter + 1}`;
  if (boss.id === 'boss_anubis') {
    const positions = [
      { xPercent: 22, yPercent: 50, slotIndex: 0 },
      { xPercent: 78, yPercent: 50, slotIndex: 1 },
    ];
    const lowerValue = 1 + ((wave * 7) % 40);
    const higherValue = lowerValue + 1 + ((wave * 11) % 40);
    for (const pos of positions) {
      state.riftIdCounter += 1;
      battle.activeRifts.push({
        id: `rift_${state.riftIdCounter}`,
        xPercent: pos.xPercent,
        yPercent: pos.yPercent,
        remainingSec: baseWindowSec * 1.15,
        maxSec: baseWindowSec * 1.15,
        kind: 'anubis_scales',
        scaleValue: pos.slotIndex === Math.floor(wave / 2) % 2 ? higherValue : lowerValue,
        attackIndex: 1,
        groupId,
        slotIndex: pos.slotIndex,
      });
    }
  } else if (boss.id === 'boss_cronos') {
    const positions = [
      { xPercent: 32, yPercent: 34, slotIndex: 0 },
      { xPercent: 68, yPercent: 66, slotIndex: 1 },
    ];
    for (const pos of positions) {
      state.riftIdCounter += 1;
      battle.activeRifts.push({
        id: `rift_${state.riftIdCounter}`,
        xPercent: pos.xPercent,
        yPercent: pos.yPercent,
        remainingSec: baseWindowSec * 1.15,
        maxSec: baseWindowSec * 1.15,
        kind: 'hades_chains',
        attackIndex: 1,
        groupId,
        slotIndex: pos.slotIndex,
      });
    }
  } else if (boss.id === 'boss_demiurge') {
    state.riftIdCounter++;
    battle.activeRifts.push({ id: `rift_${state.riftIdCounter}`, xPercent: 50, yPercent: 20,
      remainingSec: RITUAL_DURATION, maxSec: RITUAL_DURATION,
      kind: 'demiurge_ritual', attackIndex: 1, groupId });
  } else if (boss.id === 'boss_odin') {
    state.riftIdCounter += 1;
    const ravenWindow = Math.max(1.15, baseWindowSec * 0.82);
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
    for (const pos of positions) {
      state.riftIdCounter += 1;
      battle.activeRifts.push({
        id: `rift_${state.riftIdCounter}`,
        xPercent: pos.xPercent,
        yPercent: pos.yPercent,
        remainingSec: baseWindowSec * 1.25,
        maxSec: baseWindowSec * 1.25,
        kind: 'chaos_orbit',
        attackIndex: 1,
        groupId,
        slotIndex: pos.slotIndex,
      });
    }
  }
}

export function clickBossRift(state: BossCombatStateHost, riftId: string, pointerPosition?: number): BossRiftClickResult {
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

  if (kind === 'odin_raven' && !odinParryCue(rift).green) {
    const damage = calculateBossCombatBreakdown(state, battle.bossId).altarDamageOnMiss;
    const before = battle.altarIntegrity;
    battle.activeRifts.splice(idx, 1);
    battle.riftsMissed++;
    battle.comboStreak = 0;
    battle.altarIntegrity = Math.max(0, before - damage);
    if (battle.altarIntegrity <= 0) completeBossBattle(state, false);
    return { damage: 0, shattered: false, victory: false, kind,
      altarDamageTaken: before - battle.altarIntegrity };
  }

  if (kind === 'demiurge_ritual') {
    const result = ritualJudgement(pointerPosition ?? ritualPointer(rift.maxSec - rift.remainingSec));
    battle.ritualOutcome = { id: rift.id, ...result, remainingSec: 1.7 };
    if (result.side !== 'center') {
      battle.activeRifts.splice(idx, 1);
      battle.riftsMissed++;
      battle.comboStreak = 0;
      if (result.side === 'moon') {
        battle.bossHp = Math.min(battle.bossMaxHp, battle.bossHp + battle.bossMaxHp * result.percent / 100);
        battle.phase = getBossPhase(state);
      } else {
        battle.altarIntegrity = Math.max(0, battle.altarIntegrity - battle.maxAltarIntegrity * result.percent / 100);
        if (battle.altarIntegrity <= 0) completeBossBattle(state, false);
      }
      return { damage: 0, shattered: false, victory: false, kind, ritualSide: result.side, ritualPercent: result.percent };
    }
  }

  if (kind === 'anubis_scales') {
    const siblings = battle.activeRifts.filter((r) => r.kind === kind && r.groupId === groupId);
    const isLower =
      rift.scaleHigherSelected === true ||
      siblings.some((r) => (r.scaleValue ?? 0) > (rift.scaleValue ?? 0));
    if (isLower) {
      const multiplier = rift.scaleHigherSelected ? 3 : 2;
      const damage = calculateBossCombatBreakdown(state, battle.bossId).altarDamageOnMiss * multiplier;
      const before = battle.altarIntegrity;
      battle.activeRifts = battle.activeRifts.filter((r) => !siblings.includes(r));
      battle.altarIntegrity = Math.max(0, before - damage);
      battle.riftsMissed += 1;
      battle.comboStreak = 0;
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
    // Keep the lower balloon clickable, but harmless if its window expires.
    siblings.forEach((r) => {
      if (r !== rift) r.scaleHigherSelected = true;
    });
  }

  const nextCombo = (battle.comboStreak ?? 0) + 1;
  battle.comboStreak = nextCombo;

  battle.activeRifts.splice(idx, 1);
  battle.riftsShattered += 1;

  let specialBonusTriggered = false;
  const miracleAwakened = false;
  const siblingsRemaining = groupId
    ? battle.activeRifts.filter((r) => r.groupId === groupId).length
    : 0;

  if (kind === 'hades_chains' && siblingsRemaining === 0) {
    specialBonusTriggered = true;
  } else if (kind === 'odin_raven') {
    battle.riftSpawnTimerSec += 1.4;
    specialBonusTriggered = true;
  } else if (kind === 'chaos_orbit' && siblingsRemaining === 0) {
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
  if (victory && boss) {
    state.defeatedBosses.add(boss.id);
    state.bossCurseTimerSec = 0;
    const prevBest = state.bestBossTimesSec[boss.id];
    if (durationSec > 0 && (typeof prevBest !== 'number' || durationSec < prevBest)) {
      state.bestBossTimesSec[boss.id] = Number(durationSec.toFixed(1));
    }
  } else if (!isRematch) {
    state.bossCurseTimerSec = BOSS_CURSE_DURATION_SEC;
  }

  if (boss && state.onBossBattleFinished) {
    state.onBossBattleFinished({ boss, victory, isRematch, durationSec });
  }
}

export function tickBossBattle(state: BossCombatStateHost, deltaSec: number): void {
  const battle = state.activeBossBattle;
  if (!battle || battle.combatStarted === false) return;

  const boss = COMBAT_BOSSES.find((b) => b.id === battle.bossId);
  if (!boss) return;

  battle.elapsedCombatSec = (battle.elapsedCombatSec ?? 0) + deltaSec;
  battle.sphereCooldownSec = Math.max(0, battle.sphereCooldownSec - deltaSec);
  const breakdown = calculateBossCombatBreakdown(state, battle.bossId);

  // Check if external HP manipulation crossed a phase boundary before ticking rifts
  if (checkAndApplyBossPhaseTransitions(state)) {
    return;
  }
  const phase = getBossPhase(state);
  battle.phase = phase;

  if (battle.ritualOutcome) battle.ritualOutcome.remainingSec = Math.max(0, battle.ritualOutcome.remainingSec - deltaSec);

  // 1. Update active rifts & check for expired rifts first so defeat on expiry takes precedence over passive tick victory
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
      const missMult =
        rift.kind === 'hades_chains'
          ? 0.5
          : rift.kind === 'chaos_orbit'
            ? 0.4
            : 1.0;
      battle.altarIntegrity = Math.max(
        0,
        battle.altarIntegrity - breakdown.altarDamageOnMiss * (breakdown.canWithstandBoss ? missMult : 1)
      );
      if (battle.altarIntegrity <= 0) {
        completeBossBattle(state, false);
        return;
      }
    }
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

  if (battle.activeRifts.some(r => r.kind === 'demiurge_ritual') || (battle.ritualOutcome?.remainingSec ?? 0) > 0) return;

  // 3. Spawn new rifts periodically (faster in Phase 2 & 3 as the guardian grows desperate)
  const phaseIntervalScale = phase === 3 ? 0.78 : phase === 2 ? 0.88 : 1.0;
  battle.riftSpawnTimerSec -= deltaSec;
  if (battle.riftSpawnTimerSec <= 0) {
    battle.riftSpawnTimerSec += boss.riftIntervalSec * phaseIntervalScale;
    if (battle.activeRifts.length < 3) {
      spawnBossRift(state);
    }
  }
}
