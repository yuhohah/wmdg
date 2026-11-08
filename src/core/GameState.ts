import type {
  BuyableItem,
  FervorUpgrade,
  Achievement,
  MechanicUnlock,
  RelicUpgrade,
  GameState as GameStateSnapshot,
  GnoseUpgrade,
  GnoseBoss,
  ActiveBossBattle,
  BossCombatBreakdown,
  BossRiftKind,
  CultPillarId,
  CultPillarStatus
} from '../types.js';
import { initialFollowers } from '../config/followers.js';
import { initialFervorUpgrades, BASE_FERVOR_RATE, getFervorUpgradeMultiplier } from '../config/fervor.js';
import { initialAchievements } from '../config/achievements.js';
import { initialUnlocks } from '../config/unlocks.js';
import { initialRelicUpgrades } from '../config/relics.js';
import { INCARNATION_STAGES, BLESSING_MAX_SECONDS, type IncarnationStage } from '../config/incarnation.js';
import { PROGRESSION_BALANCE, PROGRESSION_OLD_PRICES, GNOSE_UPGRADES, GNOSE_AUTOMATION, GNOSE_SEAL_UPGRADES, LEGACY_GNOSE_SEAL_AUTOMATIONS, GNOSE_FORMULAS, GNOSE_APOTHEOSIS_COSTS, RETIRED_GNOSE_UPGRADES, LEGACY_GNOSE_AUTOMATIONS } from '../config/gnose.js';
import {
  GNOSE_BOSSES,
  BOSS_CURSE_DURATION_SEC,
  BOSS_CURSE_MULTIPLIER,
  BOSS_MAX_ALTAR_INTEGRITY,
  BOSS_MAX_PASSIVE_HP_PER_SEC,
  BOSS_MAX_CLICK_HP_FRACTION,
  BOSS_SPHERE_COOLDOWN_SEC,
  BOSS_DAMAGE_READINESS_THRESHOLD,
  BOSS_DEFENSE_READINESS_THRESHOLD,
  BOSS_UNPREPARED_PRESSURE_PER_SEC
} from '../config/bosses.js';
import {
  calculateItemCost,
  calculateFervorUpgradeCost,
  calculateClickBuffMultiplier,
  calculatePassiveBuffMultiplier,
  calculateGlobalBuffMultiplier,
  calculateCostDiscountMultiplier,
  calculateMaxAffordableFollowers,
  calculateIncarnationFollowerMultiplier,
  calculateFervorFaithBonus,
  calculateFervorRate,
  calculateFaithPerClick,
  calculateFaithPerSecond,
  calculateRelicsToGet,
  calculateExtraRelicsPerSecond,
  calculateRelicFaithMultiplier,
  calculateGnoseToGet,
  calculateTotalGnoseMultiplier,
  calculateGnoseFollowersSynergyMultiplier
} from '../systems/calculations.js';
import { SaveSystem, type SaveData } from '../systems/saveSystem.js';

export class GameStateManager {
  // Numeric Resources & Stats
  public faithPoints: number = 1;
  public totalFaithAccumulated: number = 1;
  public totalClicks: number = 0;
  public fervorPoints: number = 0;
  public fervorPeakThisRun = 0;
  public relicPeakThisRun = 0;
  public totalFervorGenerated: number = 0;
  public totalRelicsGenerated: number = 0;

  // Progression Data Arrays
  public followers: BuyableItem[] = initialFollowers.map((item) => ({ ...item }));
  public fervorUpgrades: FervorUpgrade[] = initialFervorUpgrades.map((u) => ({ ...u }));
  public achievements: Achievement[] = initialAchievements.map((a) => ({ ...a }));
  public unlocks: MechanicUnlock[] = initialUnlocks.map((u) => ({ ...u }));
  public relicUpgrades: RelicUpgrade[] = initialRelicUpgrades.map((r) => ({ ...r }));

  // Incarnation State
  public incarnationStage: number = 1;
  public incarnationBoostTimer: number = 0;

  // Relics (Prestige) State
  public relicPoints: number = 0;
  public bestRelicsToGet: number = 0;
  public relicConvertCooldown: number = 0;

  // Gnose (True Prestige) & Guardians Boss State
  public gnosePoints: number = 0;
  public totalGnoseEarned: number = 0;
  public gnoseResets: number = 0;
  public unlockedGnoseUpgrades: Set<string> = new Set();
  public defeatedBosses: Set<string> = new Set();
  public bestBossTimesSec: Record<string, number> = {};
  public bossCurseTimerSec: number = 0;
  public activeBossBattle: ActiveBossBattle | null = null;
  private riftIdCounter: number = 0;
  private miracleIdCounter: number = 0;

  public confirmGnoseReset: boolean = true;
  public autoFollowersEnabled: boolean = true;
  public autoFervorEnabled: boolean = true;
  public autoRelicsEnabled: boolean = true;
  private gnoseAutoAccumulatorSec: number = 0;
  public autoRelicUpgradesEnabled: boolean = true;

  // Onboarding & Intro Sequence
  public hasSeenIntro: boolean = false;
  public seenCardTutorials: Set<string> = new Set();
  public nerdsEnabled: boolean = false;

  // Optional callback when an active boss battle concludes during tick or click
  public onBossBattleFinished?: (result: {
    boss: GnoseBoss;
    victory: boolean;
    isRematch?: boolean;
    durationSec?: number;
  }) => void;

  constructor() {
    this.resetToDefaults();
  }

  public resetToDefaults(): void {
    this.faithPoints = 1;
    this.totalFaithAccumulated = 1;
    this.totalClicks = 0;
    this.fervorPoints = 0;
    this.fervorPeakThisRun = 0;
    this.relicPeakThisRun = 0;
    this.totalFervorGenerated = 0;
    this.totalRelicsGenerated = 0;
    this.incarnationStage = 1;
    this.incarnationBoostTimer = 0;
    this.relicPoints = 0;
    this.bestRelicsToGet = 0;
    this.relicConvertCooldown = 0;
    this.hasSeenIntro = false;
    this.seenCardTutorials.clear();
    this.nerdsEnabled = false;

    this.gnosePoints = 0;
    this.totalGnoseEarned = 0;
    this.gnoseResets = 0;
    this.unlockedGnoseUpgrades.clear();
    this.defeatedBosses.clear();
    this.bestBossTimesSec = {};
    this.bossCurseTimerSec = 0;
    this.activeBossBattle = null;
    this.riftIdCounter = 0;
    this.miracleIdCounter = 0;

    this.confirmGnoseReset = true;
    this.autoFollowersEnabled = true;
    this.autoFervorEnabled = true;
    this.autoRelicsEnabled = true;
    this.gnoseAutoAccumulatorSec = 0;
    this.autoRelicUpgradesEnabled = true;

    this.followers = initialFollowers.map((item) => ({ ...item }));
    this.fervorUpgrades = initialFervorUpgrades.map((u) => ({ ...u }));
    this.achievements = initialAchievements.map((a) => ({ ...a }));
    this.unlocks = initialUnlocks.map((u) => ({ ...u }));
    this.relicUpgrades = initialRelicUpgrades.map((r) => ({ ...r }));
  }

  // --- Snapshot for external checks / achievements ---
  public getSnapshot(): GameStateSnapshot {
    return {
      faith: this.faithPoints,
      totalFaith: this.totalFaithAccumulated,
      clicks: this.totalClicks,
      followers: this.getTotalFollowersCount(),
      fps: this.getFaithPerSecond(),
      fervor: this.fervorPoints,
      relics: this.relicPoints,
      totalRelics: this.bestRelicsToGet,
      gnosePoints: this.gnosePoints,
      totalGnoseEarned: this.totalGnoseEarned,
      gnoseResets: this.gnoseResets,
      defeatedBossesCount: this.defeatedBosses.size,
      tiamatDefeated: this.defeatedBosses.has('boss_tiamat')
    };
  }

  // --- Multipliers & Rates ---
  public getTotalFollowersCount(): number {
    return this.followers.reduce((acc, curr) => acc + curr.count, 0);
  }

  public isIncarnationUnlocked(): boolean {
    return this.unlocks.find((u) => u.id === 'unlock_incarnation')?.unlocked ?? false;
  }

  public isFervorUpgradesUnlocked(): boolean {
    return this.unlocks.find((u) => u.id === 'unlock_fervor_upgrades')?.unlocked ?? false;
  }

  public isRelicsUnlocked(): boolean {
    return this.unlocks.find((u) => u.id === 'unlock_relics')?.unlocked ?? false;
  }

  public isGnoseUnlocked(): boolean {
    return (
      (this.unlocks.find((u) => u.id === 'unlock_gnose')?.unlocked ?? false) ||
      this.gnoseResets > 0 ||
      this.totalGnoseEarned > 0
    );
  }

  public hasGnoseUpgrade(upgradeId: string): boolean {
    return this.unlockedGnoseUpgrades.has(upgradeId);
  }

  // --- Gnose Boss & Tier Gate Logic ---
  public isBossDefeated(bossId: string): boolean {
    return this.defeatedBosses.has(bossId);
  }

  public getBossBestTimeSec(bossId: string): number | undefined {
    const val = this.bestBossTimesSec[bossId];
    return typeof val === 'number' && Number.isFinite(val) && val > 0 ? val : undefined;
  }

  public getBossForTier(tier: 2 | 3 | 4 | 'endgame'): GnoseBoss | undefined {
    return GNOSE_BOSSES.find((b) => b.unlocksTier === tier);
  }

  public isGnoseTierUnlocked(tier: 1 | 2 | 3 | 4): boolean {
    if (tier === 1) return true;
    const boss = GNOSE_BOSSES.find((b) => b.unlocksTier === tier);
    if (!boss) return true;
    if (this.defeatedBosses.has(boss.id)) return true;
    // Backward compatibility: if player already owns an upgrade in this tier, consider it unlocked
    const hasUpgradeInTier = GNOSE_UPGRADES.some(
      (u) => u.tier === tier && this.unlockedGnoseUpgrades.has(u.id)
    );
    return hasUpgradeInTier;
  }

  public canChallengeBoss(bossId: string, options?: { isRematch?: boolean }): boolean {
    const boss = GNOSE_BOSSES.find((b) => b.id === bossId);
    if (!boss) return false;
    if (options?.isRematch) {
      return this.defeatedBosses.has(boss.id);
    }
    if (this.defeatedBosses.has(boss.id)) return false;

    if (boss.unlocksTier === 2) {
      return this.isGnoseUnlocked();
    }
    if (boss.unlocksTier === 3) {
      const tier2Owned = GNOSE_UPGRADES.filter(
        (u) => u.tier === 2 && this.unlockedGnoseUpgrades.has(u.id)
      ).length;
      return this.isGnoseTierUnlocked(2) && tier2Owned >= 2;
    }
    if (boss.unlocksTier === 4) {
      const tier3Owned = GNOSE_UPGRADES.filter(
        (u) => u.tier === 3 && this.unlockedGnoseUpgrades.has(u.id)
      ).length;
      return this.isGnoseTierUnlocked(3) && tier3Owned >= 2;
    }
    if (boss.unlocksTier === 'endgame') {
      return GNOSE_UPGRADES.every((u) => this.unlockedGnoseUpgrades.has(u.id));
    }
    return false;
  }

  public getBossRewardsMultiplier(): number {
    let mult = 1.0;
    for (const boss of GNOSE_BOSSES) {
      if (this.defeatedBosses.has(boss.id)) {
        mult *= boss.faithFervorMult;
      }
    }
    return mult;
  }

  public getBossCurseMultiplier(): number {
    return this.bossCurseTimerSec > 0 ? BOSS_CURSE_MULTIPLIER : 1.0;
  }

  /**
   * Computes how all Cult Systems (Fé, Fiéis, Fervor, Relíquias, Encarnação, Gnose, Conquistas)
   * synergize to drive Boss Battle DPS, Sphere Click damage, Rift critical damage,
   * Altar Integrity protection, and combat duration.
   */
  public getBossCombatBreakdown(bossId?: string): BossCombatBreakdown {
    const targetBossId = bossId ?? this.activeBossBattle?.bossId ?? 'boss_anubis';
    const boss = GNOSE_BOSSES.find((b) => b.id === targetBossId) ?? GNOSE_BOSSES[0];
    const bossMaxHp =
      this.activeBossBattle && this.activeBossBattle.bossId === boss.id
        ? this.activeBossBattle.bossMaxHp
        : boss.maxHp;

    const difficultyScale =
      boss.id === 'boss_anubis'
        ? 1.0
        : boss.id === 'boss_cronos'
          ? 1.6
          : boss.id === 'boss_odin'
            ? 2.3
            : 3.2;

    const fps = this.getFaithPerSecond();
    const fpc = this.getFaithPerClick();

    // 1. Fé (current Fé, total Fé accumulated, and Fé/s)
    const faithLog = Math.log10(Math.max(0, this.faithPoints) + 1);
    const faithHistoryLog = Math.log10(Math.max(this.faithPoints, this.totalFaithAccumulated, 0) + 1);
    const fpsLog = fps > 1 ? Math.log10(fps) : 0;
    const faithBonus = (faithLog * 0.02 + faithHistoryLog * 0.02 + fpsLog * 0.05) / difficultyScale;

    // 2. Fiéis Devotos (count of active devotees chanting)
    const followersCount = this.getTotalFollowersCount();
    const followersBonus =
      followersCount > 0
        ? (Math.log10(followersCount + 1) * 0.22 + Math.min(1.5, followersCount * 0.008)) /
          difficultyScale
        : 0;

    // 3. Fervor (accumulated Fervor, Fervor/s, and Ritos de Fervor levels)
    const fervorRate = this.getFervorRatePerSecond();
    const fervorLevels = this.fervorUpgrades.reduce((acc, u) => acc + u.level, 0);
    const fervorLog = this.fervorPoints > 0 ? Math.log10(this.fervorPoints + 1) : 0;
    const fervorHistoryLog = Math.log10(Math.max(this.fervorPoints, this.totalFervorGenerated, 0) + 1);
    const fervorRateLog = fervorRate > 0 ? Math.log10(fervorRate + 1) : 0;
    const fervorBonus =
      (fervorLog * 0.08 + fervorHistoryLog * 0.04 + fervorRateLog * 0.08 + fervorLevels * 0.04) / difficultyScale;

    // 4. Relíquias & Fragmentos (Fragmentos pool, best transmutation, and Relic upgrade levels)
    const relicLevels = this.relicUpgrades.reduce((acc, r) => acc + r.level, 0);
    const effectiveRelics = Math.max(this.relicPoints, this.bestRelicsToGet);
    const relicsLog = effectiveRelics > 0 ? Math.log10(effectiveRelics + 1) : 0;
    const relicsHistoryLog = Math.log10(Math.max(effectiveRelics, this.totalRelicsGenerated, 0) + 1);
    const relicsRateLog = Math.log10(this.getRelicsRatePerSecond() + 1);
    const relicsBonus = (relicsLog * 0.15 + relicsHistoryLog * 0.1 + relicsRateLog * 0.08 + relicLevels * 0.08) / difficultyScale;

    // 5. Encarnação Sagrada (Avatar stage 1..5 and active Blessing)
    const isBoostActive =
      this.incarnationBoostTimer > 0 ||
      (this.hasGnoseUpgrade('gn_bencao_eterna') && this.isIncarnationUnlocked());
    const incarnationBonus =
      ((this.incarnationStage - 1) * 0.35 + (isBoostActive ? 0.25 : 0)) / difficultyScale;

    // 6. Gnose & Conquistas (Gnose points, total Gnose earned, assimilated Gnose nodes, and unlocked Achievements)
    const effectiveGnose = Math.max(this.gnosePoints, this.totalGnoseEarned);
    const gnoseLog = effectiveGnose > 0 ? Math.log10(effectiveGnose + 1) : 0;
    const gnoseNodes = this.unlockedGnoseUpgrades.size;
    const unlockedAchievements = this.achievements.filter((a) => a.unlocked).length;
    const achievementsBonus = (unlockedAchievements * 0.025) / difficultyScale;
    const gnoseBonus = (gnoseLog * 0.22 + gnoseNodes * 0.08 + unlockedAchievements * 0.015) / difficultyScale;

    const bonusSum =
      faithBonus + followersBonus + fervorBonus + relicsBonus + incarnationBonus + gnoseBonus + achievementsBonus;
    const curseMult = this.getBossCurseMultiplier();
    const totalResourceMultiplier = (1 + bonusSum) * curseMult;

    // Cult Readiness Index: measures how well the player has developed all systems vs. boss requirements
    const req = boss.requirements ?? {
      faithLog: 15,
      followers: 120,
      fervorLog: 7,
      fervorLevels: 35,
      relicsLog: 2.5,
      relicLevels: 6,
      incarnationStage: 2,
      gnoseLog: 0,
      gnoseNodes: 1
    };
    const faithReadiness = Math.min(2.0, Math.max(faithLog, faithHistoryLog) / Math.max(1, req.faithLog));
    const followersReadiness = Math.min(2.0, followersCount / Math.max(1, req.followers));
    const fervorReadiness = Math.min(
      2.0,
      0.5 * (fervorHistoryLog / Math.max(1, req.fervorLog)) +
        0.5 * (fervorLevels / Math.max(1, req.fervorLevels))
    );
    const relicsReadiness = Math.min(
      2.0,
      0.5 * (relicsHistoryLog / Math.max(1, req.relicsLog)) +
        0.5 * (relicLevels / Math.max(1, req.relicLevels))
    );
    const incarnationReadiness = Math.min(
      2.0,
      (this.incarnationStage + (isBoostActive ? 0.5 : 0)) / Math.max(1, req.incarnationStage)
    );
    const gnoseReadiness =
      req.gnoseNodes <= 1 && req.gnoseLog <= 0
        ? Math.min(2.0, 0.8 + gnoseNodes * 0.25 + gnoseLog * 0.2)
        : Math.min(
            2.0,
            0.5 * (gnoseLog / Math.max(0.5, req.gnoseLog)) +
              0.5 * (gnoseNodes / Math.max(1, req.gnoseNodes))
          );

    const pillarReadiness: Record<CultPillarId, number> = {
      faith: faithReadiness,
      followers: followersReadiness,
      fervor: fervorReadiness,
      relics: relicsReadiness,
      incarnation: incarnationReadiness,
      gnose: gnoseReadiness
    };

    const pillarCatalog: CultPillarStatus[] = [
      {
        id: 'faith',
        label: 'Fé',
        readiness: faithReadiness
      },
      {
        id: 'followers',
        label: 'Fiéis',
        readiness: followersReadiness
      },
      {
        id: 'fervor',
        label: 'Fervor',
        readiness: fervorReadiness
      },
      {
        id: 'relics',
        label: 'Relíquias',
        readiness: relicsReadiness
      },
      {
        id: 'incarnation',
        label: 'Encarnação',
        readiness: incarnationReadiness
      },
      {
        id: 'gnose',
        label: 'Gnose',
        readiness: gnoseReadiness
      }
    ];

    const sortedPillars = [...pillarCatalog].sort((a, b) => a.readiness - b.readiness);
    const weakPillars = sortedPillars.filter((p) => p.readiness < 0.95);
    const lowestTwoPillars: [CultPillarStatus, CultPillarStatus] = [sortedPillars[0], sortedPillars[1]];

    // A surplus in one system cannot replace a missing pillar. Each pillar is
    // capped at 2 before taking the geometric mean, so all resources matter.
    const cultReadiness = Object.values(pillarReadiness).reduce((product, value) => product * value, 1) ** (1 / 6);
    const canDamageBoss = cultReadiness >= BOSS_DAMAGE_READINESS_THRESHOLD;
    const canWithstandBoss = cultReadiness >= BOSS_DEFENSE_READINESS_THRESHOLD;
    const damageMultiplier = canDamageBoss ? Math.min(1, cultReadiness) : 0;

    const hasActiveCultPower =
      fps > 0 ||
      followersCount > 0 ||
      this.fervorPoints > 0 ||
      fervorLevels > 0 ||
      effectiveRelics > 0 ||
      relicLevels > 0 ||
      this.incarnationStage > 1 ||
      effectiveGnose > 0 ||
      gnoseNodes > 0 ||
      this.faithPoints > 1 ||
      this.totalFaithAccumulated > 1 ||
      this.totalFervorGenerated > 0 ||
      this.totalRelicsGenerated > 0;

    // Normalize and cap final damage: Cult Readiness + Resource Synergies + Raw Production determine battle speed.
    const readinessFactor = 0.45 + 0.55 * cultReadiness;
    const passiveDps = damageMultiplier * Math.min(
      bossMaxHp * BOSS_MAX_PASSIVE_HP_PER_SEC,
      Math.max(fps, hasActiveCultPower ? bossMaxHp * bonusSum * 0.00175 * readinessFactor * curseMult : 0)
    );
    const passiveHpFractionPerSec = passiveDps / bossMaxHp;

    const hasHadesChains =
      this.activeBossBattle &&
      this.activeBossBattle.bossId === boss.id &&
      this.activeBossBattle.activeRifts.some((r) => r.kind === 'hades_chains');
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

    // FULGOR DIVINO (100% Sphere Astral Charge): pure attack beam (~10% max HP scaled by cultReadiness, no heal)
    const fulgorHpFraction = damageMultiplier * Math.min(0.14, Math.max(0.06, 0.08 + 0.02 * Math.min(2.0, cultReadiness)));
    const fulgorDamage = bossMaxHp * fulgorHpFraction;

    // Every cult system contributes directly to Sphere protection.
    const defenseScore =
      faithBonus * 0.2 +
      followersBonus * 0.25 +
      relicsBonus * 0.35 +
      incarnationBonus * 0.35 +
      fervorBonus * 0.15 +
      gnoseBonus * 0.25 +
      achievementsBonus * 0.25;
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
    const altarHealOnRift = Math.min(
      16,
      followersBonus * 4 + relicsBonus * 5 + incarnationBonus * 4
    );

    // Continuous Divine Pressure on Altar Integrity:
    // Strongly mitigated when cultReadiness >= 1.0; heavier drain when cultReadiness < 0.8
    const rawPressure = boss.altarPressurePerSec ?? 0.65;
    const underpreparedPenalty =
      cultReadiness < 0.8 ? 1 + (0.8 - cultReadiness) * 1.8 : 1.0;
    const preparedBonus =
      cultReadiness >= 1.0 ? 1 / (1 + (cultReadiness - 0.9) * 3.2) : 1.0;
    const pressureMitigation =
      (underpreparedPenalty * preparedBonus) / (1 + defenseScore * 2.2 + cultReadiness * 1.4);
    const altarPressurePerSec = canWithstandBoss
      ? Math.max(0.06, rawPressure * pressureMitigation)
      : Math.max(
          BOSS_UNPREPARED_PRESSURE_PER_SEC * (1 + BOSS_DEFENSE_READINESS_THRESHOLD - cultReadiness),
          rawPressure * pressureMitigation
        );

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
      pillarReadiness,
      weakPillars,
      lowestTwoPillars,
      passiveHpFractionPerSec,
      passiveDps,
      clickHpFraction,
      clickDamage,
      riftHpFraction,
      riftDamage,
      fulgorHpFraction,
      fulgorDamage,
      altarDamageOnMiss,
      altarHealOnRift,
      altarPressurePerSec,
      estimatedPassiveVictorySec,
      estimatedAltarSurvivalSec
    };
  }

  public startBossBattle(
    bossId: string,
    options?: { awaitProcession?: boolean; isRematch?: boolean }
  ): boolean {
    const boss = GNOSE_BOSSES.find((b) => b.id === bossId);
    const isRematch = options?.isRematch === true;
    if (this.activeBossBattle || !boss || !this.canChallengeBoss(bossId, { isRematch })) {
      return false;
    }

    this.activeBossBattle = {
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
      sphereCharge: 0,
      activeMiracle: null,
      miracleSpawnTimerSec: 11,
      highestPhaseShocked: 1,
      isRematch,
      elapsedCombatSec: 0,
      attackWaveCounter: 0
    };
    return true;
  }

  public beginBossCombat(): void {
    if (this.activeBossBattle) {
      this.activeBossBattle.combatStarted = true;
    }
  }

  public getBossPhase(): 1 | 2 | 3 {
    if (!this.activeBossBattle) return 1;
    const hpRatio = this.activeBossBattle.bossHp / this.activeBossBattle.bossMaxHp;
    if (hpRatio <= 0.25) return 3;
    if (hpRatio <= 0.6) return 2;
    return 1;
  }

  /**
   * Applies lethal Phase II (15%) and Phase III (30%) shockwave damage to Sphere Integrity,
   * clears stale active rifts without extra miss penalty, and guarantees a Faithful Miracle on the circle.
   * Returns true if the Altar collapsed (defeat).
   */
  private checkAndApplyBossPhaseTransitions(): boolean {
    const battle = this.activeBossBattle;
    if (!battle) return false;

    const newPhase = this.getBossPhase();
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
        this.completeBossBattle(false);
        return true;
      }
      // Guarantee a Faithful Miracle on the wheel right after the Phase II/III shockwave if none is active
      if (!battle.activeMiracle) {
        this.spawnBossMiracle();
      }
    }
    return false;
  }

  public spawnBossMiracle(preferredSlot?: number): void {
    const battle = this.activeBossBattle;
    if (!battle) return;
    this.miracleIdCounter += 1;
    const totalSlots = Math.max(1, Math.min(34, Math.max(1, this.getTotalFollowersCount())));
    const slot =
      typeof preferredSlot === 'number' && preferredSlot >= 0
        ? preferredSlot % totalSlots
        : (this.miracleIdCounter * 7 + Math.floor(battle.elapsedCombatSec ?? 0)) % totalSlots;
    battle.activeMiracle = {
      id: `miracle_${this.miracleIdCounter}`,
      followerSlot: slot,
      remainingSec: 1.5,
      maxSec: 1.5
    };
    battle.miracleSpawnTimerSec = 10 + ((this.miracleIdCounter * 3) % 5);
  }

  public clickBossMiracle(): { healed: number; triggered: boolean; integrityAfter: number } {
    const battle = this.activeBossBattle;
    if (!battle || battle.combatStarted === false || !battle.activeMiracle) {
      return { healed: 0, triggered: false, integrityAfter: battle?.altarIntegrity ?? 0 };
    }
    const before = battle.altarIntegrity;
    battle.altarIntegrity = Math.min(battle.maxAltarIntegrity, battle.altarIntegrity + 10);
    const healed = battle.altarIntegrity - before;
    battle.activeMiracle = null;
    battle.miracleSpawnTimerSec = 10 + ((this.miracleIdCounter * 3) % 5);
    return { healed, triggered: true, integrityAfter: battle.altarIntegrity };
  }

  public triggerSphereFulgor(): { damage: number; triggered: boolean; victory: boolean } {
    const battle = this.activeBossBattle;
    if (
      !battle ||
      battle.combatStarted === false ||
      (battle.sphereCharge ?? 0) < 100 - 1e-6
    ) {
      return { damage: 0, triggered: false, victory: false };
    }

    const breakdown = this.getBossCombatBreakdown(battle.bossId);
    if (!breakdown.canDamageBoss) {
      return { damage: 0, triggered: false, victory: false };
    }
    const damage = breakdown.fulgorDamage;
    battle.sphereCharge = 0;
    battle.bossHp = Math.max(0, battle.bossHp - damage);
    battle.phase = this.getBossPhase();

    if (battle.bossHp <= 0) {
      this.completeBossBattle(true);
      return { damage, triggered: true, victory: true };
    }

    if (this.checkAndApplyBossPhaseTransitions()) {
      return { damage, triggered: true, victory: false };
    }

    return { damage, triggered: true, victory: false };
  }

  public spawnBossRift(options?: { forceSpecial?: boolean; forceStandard?: boolean }): void {
    if (!this.activeBossBattle) return;
    const battle = this.activeBossBattle;
    const boss = GNOSE_BOSSES.find((b) => b.id === battle.bossId);
    if (!boss) return;

    const phase = this.getBossPhase();
    const wave = (battle.attackWaveCounter ?? 0) + 1;
    battle.attackWaveCounter = wave;

    const useSpecial =
      options?.forceSpecial === true ||
      (!options?.forceStandard && phase >= 2 && wave % 2 === 0);

    const windowScale = phase === 3 ? 0.85 : phase === 2 ? 0.92 : 1.0;
    const baseWindowSec = Math.max(1.3, boss.riftWindowSec * windowScale);

    if (!useSpecial) {
      this.riftIdCounter += 1;
      const angle = ((this.riftIdCounter * 137.5) % 360) * (Math.PI / 180);
      const radiusPercent = 30 + (this.riftIdCounter % 3) * 6;
      const xPercent = Math.max(14, Math.min(86, 50 + Math.cos(angle) * radiusPercent));
      const yPercent = Math.max(18, Math.min(82, 50 + Math.sin(angle) * radiusPercent));

      battle.activeRifts.push({
        id: `rift_${this.riftIdCounter}`,
        xPercent,
        yPercent,
        remainingSec: baseWindowSec,
        maxSec: baseWindowSec,
        kind: 'standard',
        attackIndex: 0
      });
      return;
    }

    // Special Attack 2 patterns (synced with the 2nd spritesheet of each Guardian)
    const groupId = `grp_${wave}_${this.riftIdCounter + 1}`;
    if (boss.id === 'boss_anubis') {
      // Anubis (ataque-balanca): 2 symmetric golden scale rifts left & right of the Sphere
      const positions = [
        { xPercent: 22, yPercent: 50, slotIndex: 0 },
        { xPercent: 78, yPercent: 50, slotIndex: 1 }
      ];
      const lowerValue = 1 + ((wave * 7) % 40);
      const higherValue = lowerValue + 1 + ((wave * 11) % 40);
      for (const pos of positions) {
        this.riftIdCounter += 1;
        battle.activeRifts.push({
          id: `rift_${this.riftIdCounter}`,
          xPercent: pos.xPercent,
          yPercent: pos.yPercent,
          remainingSec: baseWindowSec * 1.15,
          maxSec: baseWindowSec * 1.15,
          kind: 'anubis_scales',
          scaleValue: pos.slotIndex === Math.floor(wave / 2) % 2 ? higherValue : lowerValue,
          attackIndex: 1,
          groupId,
          slotIndex: pos.slotIndex
        });
      }
    } else if (boss.id === 'boss_cronos') {
      // Hades (ataque-correntes): 2 crimson shackle rifts locked on the Sphere edges (-50% click damage while active)
      const positions = [
        { xPercent: 32, yPercent: 34, slotIndex: 0 },
        { xPercent: 68, yPercent: 66, slotIndex: 1 }
      ];
      for (const pos of positions) {
        this.riftIdCounter += 1;
        battle.activeRifts.push({
          id: `rift_${this.riftIdCounter}`,
          xPercent: pos.xPercent,
          yPercent: pos.yPercent,
          remainingSec: baseWindowSec * 1.15,
          maxSec: baseWindowSec * 1.15,
          kind: 'hades_chains',
          attackIndex: 1,
          groupId,
          slotIndex: pos.slotIndex
        });
      }
    } else if (boss.id === 'boss_odin') {
      // Odin (ataque-corvo): 1 swift diagonal raven seal with critical golden window
      this.riftIdCounter += 1;
      const ravenWindow = Math.max(1.15, baseWindowSec * 0.82);
      battle.activeRifts.push({
        id: `rift_${this.riftIdCounter}`,
        xPercent: 46,
        yPercent: 26,
        remainingSec: ravenWindow,
        maxSec: ravenWindow,
        kind: 'odin_raven',
        attackIndex: 1,
        groupId,
        slotIndex: 0
      });
    } else {
      // Primordial Chaos (ataque-circulos): 3 abyssal seals in an orbital triangle around the Sphere
      const positions = [
        { xPercent: 50, yPercent: 18, slotIndex: 0 },
        { xPercent: 22, yPercent: 72, slotIndex: 1 },
        { xPercent: 78, yPercent: 72, slotIndex: 2 }
      ];
      for (const pos of positions) {
        this.riftIdCounter += 1;
        battle.activeRifts.push({
          id: `rift_${this.riftIdCounter}`,
          xPercent: pos.xPercent,
          yPercent: pos.yPercent,
          remainingSec: baseWindowSec * 1.25,
          maxSec: baseWindowSec * 1.25,
          kind: 'chaos_orbit',
          attackIndex: 1,
          groupId,
          slotIndex: pos.slotIndex
        });
      }
    }
  }

  public clickBossRift(riftId: string): {
    damage: number;
    shattered: boolean;
    victory: boolean;
    comboStreak?: number;
    kind?: BossRiftKind;
    specialBonusTriggered?: boolean;
    miracleAwakened?: boolean;
    altarDamageTaken?: number;
    scaleDamageMultiplier?: number;
  } {
    if (!this.activeBossBattle || this.activeBossBattle.combatStarted === false) {
      return { damage: 0, shattered: false, victory: false };
    }
    const battle = this.activeBossBattle;
    const idx = battle.activeRifts.findIndex((r) => r.id === riftId);
    if (idx === -1) {
      return { damage: 0, shattered: false, victory: false };
    }

    const rift = battle.activeRifts[idx];
    const kind: BossRiftKind = rift.kind ?? 'standard';
    const groupId = rift.groupId;

    if (kind === 'anubis_scales') {
      const siblings = battle.activeRifts.filter(r => r.kind === kind && r.groupId === groupId);
      const isLower = rift.scaleHigherSelected === true ||
        siblings.some(r => (r.scaleValue ?? 0) > (rift.scaleValue ?? 0));
      if (isLower) {
        const multiplier = rift.scaleHigherSelected ? 3 : 2;
        const damage = this.getBossCombatBreakdown(battle.bossId).altarDamageOnMiss * multiplier;
        const before = battle.altarIntegrity;
        battle.activeRifts = battle.activeRifts.filter(r => !siblings.includes(r));
        battle.altarIntegrity = Math.max(0, before - damage);
        battle.riftsMissed += 1;
        battle.comboStreak = 0;
        if (battle.altarIntegrity <= 0) this.completeBossBattle(false);
        return {
          damage: 0, shattered: false, victory: false, kind,
          altarDamageTaken: before - battle.altarIntegrity,
          scaleDamageMultiplier: multiplier
        };
      }
      // Keep the lower balloon clickable, but harmless if its window expires.
      siblings.forEach(r => { if (r !== rift) r.scaleHigherSelected = true; });
    }

    const nextCombo = (battle.comboStreak ?? 0) + 1;
    battle.comboStreak = nextCombo;

    battle.activeRifts.splice(idx, 1);
    battle.riftsShattered += 1;

    // Charge the Divine Sphere (+25% per APARAR)
    battle.sphereCharge = Math.min(100, (battle.sphereCharge ?? 0) + 25);

    let specialBonusTriggered = false;
    const miracleAwakened = false;
    const siblingsRemaining = groupId
      ? battle.activeRifts.filter((r) => r.groupId === groupId).length
      : 0;

    if (kind === 'hades_chains' && siblingsRemaining === 0) {
      // Hades Chains broken: restores full click power
      specialBonusTriggered = true;
    } else if (kind === 'odin_raven') {
      // Intercepting the raven early delays Odin's next attack.
      const isCritParry = rift.remainingSec >= rift.maxSec * 0.35;
      if (isCritParry) {
        battle.riftSpawnTimerSec += 1.4;
        specialBonusTriggered = true;
      }
    } else if (kind === 'chaos_orbit' && siblingsRemaining === 0) {
      // All orbital seals have been safely intercepted.
      specialBonusTriggered = true;
    }

    // A parry changes neither combatant's health and cannot trigger phase shockwaves.
    return {
      damage: 0,
      shattered: true,
      victory: false,
      comboStreak: nextCombo,
      kind,
      specialBonusTriggered,
      miracleAwakened
    };
  }

  public retreatBossBattle(): void {
    this.activeBossBattle = null;
  }

  private completeBossBattle(victory: boolean): void {
    if (!this.activeBossBattle) return;
    const battle = this.activeBossBattle;
    const boss = GNOSE_BOSSES.find((b) => b.id === battle.bossId);
    const isRematch = battle.isRematch === true;
    const durationSec = Math.max(0.1, battle.elapsedCombatSec ?? 0);
    this.activeBossBattle = null;

    if (victory && boss) {
      this.defeatedBosses.add(boss.id);
      this.bossCurseTimerSec = 0;
      const prevBest = this.bestBossTimesSec[boss.id];
      if (durationSec > 0 && (typeof prevBest !== 'number' || durationSec < prevBest)) {
        this.bestBossTimesSec[boss.id] = Number(durationSec.toFixed(1));
      }
    } else if (!isRematch) {
      this.bossCurseTimerSec = BOSS_CURSE_DURATION_SEC;
    }

    if (boss && this.onBossBattleFinished) {
      this.onBossBattleFinished({ boss, victory, isRematch, durationSec });
    }
  }

  public isConvertMaxUnlocked(): boolean {
    return this.getTotalFollowersCount() >= 25 || this.hasGnoseUpgrade('gn_memoria_selos');
  }

  public isFu1Boosted(): boolean {
    return this.hasGnoseUpgrade('gn_fu1_boost');
  }

  public getGnoseGainExponent(): number {
    return this.hasGnoseUpgrade('gn_gnose_mult') ? PROGRESSION_BALANCE.enlightenedExponent : PROGRESSION_BALANCE.ascensionExponent;
  }

  public getGnoseToGet(): number {
    if (!this.isGnoseUnlocked()) {
      return 0;
    }
    return calculateGnoseToGet(this.faithPoints, this.getGnoseGainExponent());
  }

  public getTotalGnosePassiveMultiplier(): number {
    return calculateTotalGnoseMultiplier(this.totalGnoseEarned);
  }

  public getGnoseReconstructionMultiplier(): number {
    return PROGRESSION_BALANCE.nodeProductionMultiplier ** this.unlockedGnoseUpgrades.size;
  }

  /** Smooth cycle growth between permanent milestones; no lifetime resource history. */
  public getFervorResonanceMultiplier(): number {
    const nodes = this.unlockedGnoseUpgrades.size;
    const exponent = PROGRESSION_BALANCE.fervorResonanceExponent * nodes / (nodes + 1);
    return (1 + Math.max(this.fervorPoints, this.fervorPeakThisRun) / PROGRESSION_BALANCE.fervorResonanceScale) ** exponent;
  }

  public getGnoseFollowersSynergyMultiplier(followersCount: number = this.getTotalFollowersCount()): number {
    const hasCongregation = this.hasGnoseUpgrade('gn_followers_syn');
    const early = this.hasGnoseUpgrade('gn_init_faith');
    const exponent = hasCongregation
      ? (this.hasGnoseUpgrade('gn_followers_cubic') ? 1.1 : PROGRESSION_BALANCE.congregationExponent)
      : PROGRESSION_BALANCE.earlySynergyExponent;
    return calculateGnoseFollowersSynergyMultiplier(followersCount, hasCongregation || early, exponent)
      * this.getGnoseReconstructionMultiplier();

  }

  public getIncarnationStageCost(stageObj: IncarnationStage): number {
    if (stageObj.stage === 5) return PROGRESSION_BALANCE.solarCost;
    if (stageObj.stage >= 4 && this.hasGnoseUpgrade('gn_apotheosis')) {
      return GNOSE_APOTHEOSIS_COSTS[stageObj.stage] ?? stageObj.cost;
    }
    return stageObj.cost;
  }

  public getEffectiveIncarnationFollowerMultiplier(): number {
    return calculateIncarnationFollowerMultiplier(Math.max(this.fervorPoints, this.fervorPeakThisRun), this.incarnationStage);
  }

  public isPhoenixRelicUnlocked(): boolean {
    return (this.relicUpgrades.find((r) => r.id === 'relic_phoenix')?.level ?? 0) >= 1;
  }

  public getMaxIncarnationBoost(): number {
    return BLESSING_MAX_SECONDS;
  }

  /** Manual purchases, automation and UI use the same effective exponential cost. */
  public getFervorUpgradeCost(upg: FervorUpgrade): number {
    return calculateFervorUpgradeCost(upg, this.getFervorUpgradeCostMultiplier(upg));
  }

  public getFervorUpgradeCostMultiplier(upg: FervorUpgrade): number {
    let scale = upg.costMultiplier;
    if (upg.id === 'fu_prod' && this.hasGnoseUpgrade('gn_init_fervor')) scale -= GNOSE_FORMULAS.ritualCostStep;
    if (upg.id === 'fu_relics' && this.hasGnoseUpgrade('gn_relic_gain')) scale -= GNOSE_FORMULAS.relicCostStep;
    if (upg.id === 'fu_relics' && this.hasGnoseUpgrade('gn_relic_refinement')) scale -= GNOSE_FORMULAS.refinedRelicCostStep;
    if (upg.id === 'fu_relics' && this.hasGnoseUpgrade('gn_perfect_opus')) scale -= GNOSE_FORMULAS.perfectRelicCostStep;
    if (upg.id === 'fu_prod' && this.hasGnoseUpgrade('gn_empyrean_fire')) scale -= GNOSE_FORMULAS.empyreanRitualCostStep;
    if (this.hasGnoseUpgrade('gn_apotheosis')) scale -= GNOSE_FORMULAS.ritualCostStep;
    return Math.max(1.01, scale);
  }

  /** Only formula coefficients change; production retains the same level exponent. */
  public getFervorUpgradeEffect(upg: FervorUpgrade, followersCount = this.getTotalFollowersCount()): number {
    const productionBase = this.hasGnoseUpgrade('gn_empyrean_fire') ? GNOSE_FORMULAS.empyreanProductionBase
      : this.isFu1Boosted() ? GNOSE_FORMULAS.hermeticProductionBase
      : this.hasGnoseUpgrade('gn_init_fervor') ? GNOSE_FORMULAS.fervorProductionBase : 2;
    const relicBase = this.hasGnoseUpgrade('gn_perfect_opus') ? GNOSE_FORMULAS.perfectRelicProductionBase
      : this.hasGnoseUpgrade('gn_relic_refinement') ? GNOSE_FORMULAS.refinedRelicProductionBase
      : this.hasGnoseUpgrade('gn_relic_gain') ? GNOSE_FORMULAS.relicProductionBase : 3;
    return getFervorUpgradeMultiplier(upg, followersCount, this.faithPoints, productionBase, relicBase);
  }

  public getAutoRelicsFraction(): number {
    if (this.hasGnoseUpgrade('gn_omniscience')) return 1;
    return 0;
  }

  public getRelicsBonusMultiplier(): number {
    const fuRelics = this.fervorUpgrades.find((u) => u.id === 'fu_relics');
    let mult = 1.0;
    if (fuRelics && fuRelics.level > 0) {
      mult = this.getFervorUpgradeEffect(fuRelics);
    }
    return mult;
  }

  public getRelicsToGet(): number {
    return calculateRelicsToGet(this.faithPoints, this.getRelicsBonusMultiplier());
  }

  public getIncarnationStageMultiplier(): number {
    const st = INCARNATION_STAGES.find((s) => s.stage === this.incarnationStage);
    return st ? st.multiplier : 1;
  }

  public getDevoteeBaseMultiplier(): number {
    const caduceusLevel = this.relicUpgrades[3]?.level || 0;
    return Math.max(1.05, 1.10 - caduceusLevel * 0.005
      - (this.hasGnoseUpgrade('gn_init_faith') ? GNOSE_FORMULAS.followerCostStep : 0)
      - (this.hasGnoseUpgrade('gn_followers_economy') ? GNOSE_FORMULAS.followerEconomyStep : 0));
  }

  public getItemCost(item: BuyableItem): number {
    const discount = calculateCostDiscountMultiplier(this.achievements);
    const customMult = item.id === 'f_devotee' ? this.getDevoteeBaseMultiplier() : undefined;
    return calculateItemCost(item, discount, customMult);
  }

  public getFaithPerClick(): number {
    const clickBuff = calculateClickBuffMultiplier(this.achievements);
    let globalBuff = calculateGlobalBuffMultiplier(this.achievements);
    globalBuff *= this.getTotalGnosePassiveMultiplier();
    globalBuff *= this.getGnoseFollowersSynergyMultiplier();
    globalBuff *= this.getBossRewardsMultiplier();

    const fervorClickMult = this.getFervorUpgradeEffect(this.fervorUpgrades[2]);
    const fervorEffectMult = this.getFervorUpgradeEffect(this.fervorUpgrades[1]);
    const fervorFaithBonus = calculateFervorFaithBonus(Math.max(this.fervorPoints, this.fervorPeakThisRun), fervorEffectMult) * this.getFervorResonanceMultiplier();

    return calculateFaithPerClick(clickBuff, globalBuff, fervorClickMult, fervorFaithBonus);
  }

  public getFaithPerSecond(): number {
    return this.getFaithPerSecondForFollowers(this.followers);
  }

  /** Immediate passive gain, including synergies that change with the purchased count. */
  public getFollowerPurchaseFaithGain(count: number, index: number = 0): number {
    if (count <= 0 || !this.followers[index]) return 0;
    const followers = this.followers.map((item, i) =>
      i === index ? { ...item, count: item.count + count } : item
    );
    return this.getFaithPerSecondForFollowers(followers) - this.getFaithPerSecond();
  }

  private getFaithPerSecondForFollowers(followers: BuyableItem[]): number {
    const followersCount = followers.reduce((total, item) => total + item.count, 0);
    const fervorFollowersMult = this.getFervorUpgradeEffect(this.fervorUpgrades[3], followersCount);
    const incFollowerMult = this.getEffectiveIncarnationFollowerMultiplier();
    const passiveBuff = calculatePassiveBuffMultiplier(this.achievements);
    let globalBuff = calculateGlobalBuffMultiplier(this.achievements);
    globalBuff *= this.getTotalGnosePassiveMultiplier();
    globalBuff *= this.getGnoseFollowersSynergyMultiplier(followersCount);
    globalBuff *= this.getBossRewardsMultiplier();
    globalBuff *= this.getBossCurseMultiplier();

    const fervorEffectMult = this.getFervorUpgradeEffect(this.fervorUpgrades[1]);
    const fervorFaithBonus = calculateFervorFaithBonus(Math.max(this.fervorPoints, this.fervorPeakThisRun), fervorEffectMult) * this.getFervorResonanceMultiplier();

    const cornucopiaMult = 1 + (this.relicUpgrades[0].level * 0.20);
    const arkMult = calculateRelicFaithMultiplier(Math.max(this.relicPoints, this.relicPeakThisRun), this.relicUpgrades[5].level);
    const relicFaithMult = cornucopiaMult * arkMult;
    const isBoostActive =
      this.incarnationBoostTimer > 0 || (this.hasGnoseUpgrade('gn_bencao_eterna') && this.isIncarnationUnlocked());
    const incarnationBoostMult = isBoostActive ? 2.0 : 1.0;

    return calculateFaithPerSecond(
      followers,
      fervorFollowersMult,
      incFollowerMult,
      passiveBuff,
      globalBuff,
      fervorFaithBonus,
      relicFaithMult,
      incarnationBoostMult
    );
  }

  public getFervorRatePerSecond(): number {
    if (!this.isIncarnationUnlocked()) {
      return 0;
    }

    let prodMult = this.getFervorUpgradeEffect(this.fervorUpgrades[0]);
    const torchMult = 1 + (this.relicUpgrades[1].level * 0.20);
    prodMult *= torchMult;
    prodMult *= this.getIncarnationStageMultiplier();
    prodMult *= this.getGnoseReconstructionMultiplier();
    prodMult *= this.getTotalGnosePassiveMultiplier();
    prodMult *= this.getBossRewardsMultiplier();
    prodMult *= this.getBossCurseMultiplier();

    let synergyMult = this.getFervorUpgradeEffect(this.fervorUpgrades[4]);
    if (this.relicUpgrades[2].level >= 1) {
      synergyMult *= 1.5;
    }

    return calculateFervorRate(BASE_FERVOR_RATE, prodMult, synergyMult);
  }

  public getRelicsRatePerSecond(): number {
    if (!this.isRelicsUnlocked()) {
      return 0;
    }

    const extraPerSec = calculateExtraRelicsPerSecond(this.bestRelicsToGet);
    let autoGen = 0;
    const toGet = this.getRelicsToGet();
    if (this.relicUpgrades[4]?.level >= 1) {
      autoGen += toGet * 0.05;
    }
    if (this.hasGnoseUpgrade('gn_omniscience') && this.autoRelicsEnabled) {
      autoGen += toGet * this.getAutoRelicsFraction();
    }
    return (Math.max(1.0, extraPerSec) + autoGen) * this.getGnoseReconstructionMultiplier();
  }

  /** Production history survives spending and Ascension, and also includes offline gains. */
  public addFervor(amount: number): void {
    this.fervorPoints += amount;
    this.totalFervorGenerated += amount;
    this.fervorPeakThisRun = Math.max(this.fervorPeakThisRun, this.fervorPoints);
  }

  public addRelics(amount: number): void {
    this.relicPoints += amount;
    this.totalRelicsGenerated += amount;
    this.relicPeakThisRun = Math.max(this.relicPeakThisRun, this.relicPoints);
  }

  // --- Game Loop Tick Logic ---
  public tick(deltaSec: number): { faithGained: number; fervorGained: number; relicGained: number } {
    if (!Number.isFinite(deltaSec) || deltaSec < 0) throw new RangeError('Intervalo de simulação inválido.');
    const gains = { faithGained: 0, fervorGained: 0, relicGained: 0 };
    // All systems share the same substeps, including buffs, combat and automation.
    let remaining = deltaSec;
    while (remaining > 1e-8) {
      const step = Math.min(0.1, remaining);
      const result = this.advanceTick(step);
      gains.faithGained += result.faithGained;
      gains.fervorGained += result.fervorGained;
      gains.relicGained += result.relicGained;
      remaining -= step;
    }
    return gains;
  }

  private advanceTick(deltaSec: number): { faithGained: number; fervorGained: number; relicGained: number } {
    if (this.bossCurseTimerSec > 0) {
      this.bossCurseTimerSec = Math.max(0, this.bossCurseTimerSec - deltaSec);
    }

    if (this.hasGnoseUpgrade('gn_bencao_eterna') && this.isIncarnationUnlocked()) {
      this.incarnationBoostTimer = this.getMaxIncarnationBoost();
    }

    const fps = this.getFaithPerSecond();
    let faithGained = 0;
    if (fps > 0) {
      faithGained = fps * deltaSec;
      this.faithPoints += faithGained;
      this.totalFaithAccumulated += faithGained;
    }

    const fervorRate = this.getFervorRatePerSecond();
    const fervorGained = fervorRate * deltaSec;
    this.addFervor(fervorGained);

    if (this.relicConvertCooldown > 0) {
      this.relicConvertCooldown = Math.max(0, this.relicConvertCooldown - deltaSec);
    }

    const relicRate = this.getRelicsRatePerSecond();
    let relicGained = 0;
    if (relicRate > 0) {
      relicGained = relicRate * deltaSec;
      this.addRelics(relicGained);
    }

    if (this.incarnationBoostTimer > 0 && !this.hasGnoseUpgrade('gn_bencao_eterna')) {
      this.incarnationBoostTimer = Math.max(0, this.incarnationBoostTimer - deltaSec);
    }

    // Active Boss Battle tick (no countdown timer; Altar Integrity vs Boss HP)
    if (this.activeBossBattle) {
      this.tickBossBattle(deltaSec);
    }

    // Gnose autobuyers (runs once per second; paid until Olho do Infinito)
    this.gnoseAutoAccumulatorSec += deltaSec;
    if (this.gnoseAutoAccumulatorSec + 1e-8 >= 1.0) {
      this.gnoseAutoAccumulatorSec = Math.max(0, this.gnoseAutoAccumulatorSec - 1.0);
      this.runGnoseAutomation();
    }

    return { faithGained, fervorGained, relicGained };
  }

  private tickBossBattle(deltaSec: number): void {
    const battle = this.activeBossBattle;
    if (!battle || battle.combatStarted === false) return;

    const boss = GNOSE_BOSSES.find((b) => b.id === battle.bossId);
    if (!boss) return;

    battle.elapsedCombatSec = (battle.elapsedCombatSec ?? 0) + deltaSec;
    battle.sphereCooldownSec = Math.max(0, battle.sphereCooldownSec - deltaSec);
    const breakdown = this.getBossCombatBreakdown(battle.bossId);

    // Check if external HP manipulation crossed a phase boundary before ticking rifts
    if (this.checkAndApplyBossPhaseTransitions()) {
      return;
    }
    const phase = this.getBossPhase();
    battle.phase = phase;

    // 1. Update active rifts & check for expired rifts first so defeat on expiry takes precedence over passive tick victory
    for (const rift of [...battle.activeRifts].reverse()) {
      const i = battle.activeRifts.indexOf(rift);
      if (i === -1) continue;
      rift.remainingSec -= deltaSec;
      if (rift.remainingSec <= 0) {
        battle.activeRifts.splice(i, 1);
        if (rift.kind === 'anubis_scales') {
          battle.activeRifts = battle.activeRifts.filter(r =>
            r.kind !== 'anubis_scales' || r.groupId !== rift.groupId);
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
          this.completeBossBattle(false);
          return;
        }
      }
    }

    // 1b. Continuous Divine Pressure on Altar Integrity (strongly mitigated when cultReadiness >= 100%, heavier when < 80%)
    if (breakdown.altarPressurePerSec > 0) {
      battle.altarIntegrity = Math.max(
        0,
        battle.altarIntegrity - breakdown.altarPressurePerSec * deltaSec
      );
      if (battle.altarIntegrity <= 0) {
        this.completeBossBattle(false);
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
        this.spawnBossMiracle();
      }
    }

    // 2. Passive DPS from all Cult Resources (Fé, Fiéis, Fervor, Relíquias, Encarnação, Gnose, Conquistas)
    if (breakdown.passiveDps > 0) {
      battle.bossHp = Math.max(0, battle.bossHp - breakdown.passiveDps * deltaSec);
      battle.phase = this.getBossPhase();
      if (battle.bossHp <= 0) {
        this.completeBossBattle(true);
        return;
      }
      if (this.checkAndApplyBossPhaseTransitions()) {
        return;
      }
    }

    // 3. Spawn new rifts periodically (faster in Phase 2 & 3 as the guardian grows desperate)
    const phaseIntervalScale = phase === 3 ? 0.78 : phase === 2 ? 0.88 : 1.0;
    battle.riftSpawnTimerSec -= deltaSec;
    if (battle.riftSpawnTimerSec <= 0) {
      battle.riftSpawnTimerSec += boss.riftIntervalSec * phaseIntervalScale;
      if (battle.activeRifts.length < 3) {
        this.spawnBossRift();
      }
    }
  }

  public canAccessIncarnationStage(stage: number): boolean {
    return stage < 5 || this.hasGnoseUpgrade('gn_apotheosis');
  }

  private ritualInvestmentScore(upg: FervorUpgrade): number {
    const before = this.getFervorUpgradeEffect(upg);
    upg.level++;
    const after = this.getFervorUpgradeEffect(upg);
    upg.level--;
    const weight = upg.id === 'fu_click' ? 0.15 : 1;
    return weight * Math.max(0, after / before - 1) / this.getFervorUpgradeCost(upg);
  }

  private relicInvestmentScore(relic: RelicUpgrade): number {
    const before = [this.getFaithPerSecond(), this.getFervorRatePerSecond(), this.getRelicsRatePerSecond()];
    const scale = this.getDevoteeBaseMultiplier();
    relic.level++;
    const after = [this.getFaithPerSecond(), this.getFervorRatePerSecond(), this.getRelicsRatePerSecond()];
    const costGain = Math.max(0, scale - this.getDevoteeBaseMultiplier()) * this.getTotalFollowersCount();
    relic.level--;
    return (after.reduce((sum, rate, i) => sum + Math.max(0, rate - before[i]) / Math.max(1, before[i]), 0) + costGain) / relic.cost;
  }

  public runGnoseAutomation(): void {
    // Pay for eligible seals before any competing follower purchase in this cycle.
    if (this.hasGnoseUpgrade('gn_seal_automation')) {
      for (const seal of this.unlocks) {
        if (!seal.unlocked && (!seal.prerequisiteId || this.unlocks.some(u => u.id === seal.prerequisiteId && u.unlocked))) {
          this.buyUnlock(seal);
        }
      }
    }
    const free = this.hasGnoseUpgrade('gn_omniscience');
    if (this.hasGnoseUpgrade('gn_automation') && this.autoFollowersEnabled) {
      const devotee = this.followers[0];
      if (devotee) {
        let available = this.faithPoints;
        for (let bought = 0; bought < 10000; bought++) {
          const cost = this.getItemCost(devotee);
          if (available < cost) break;
          available -= cost;
          if (!free) this.faithPoints -= cost;
          devotee.count++;
        }
      }
    }

    if (this.hasGnoseUpgrade('gn_ritual_automation') && this.autoFervorEnabled && this.isFervorUpgradesUnlocked()) {
      const bought = new Map<string, number>();
      const cap = GNOSE_AUTOMATION.maxRitualLevelsPerCycle;
      // Positive marginal effect per Fervor; keep resources required by pending seals.
      const reserved = this.unlocks.find(u => !u.unlocked && u.costCurrency === 'fervor')?.cost ?? 0;
      for (let step = 0; step < this.fervorUpgrades.length * cap; step++) {
        const upg = this.fervorUpgrades.filter(u => (u.id !== 'fu_relics' || this.isPhoenixRelicUnlocked())
          && (bought.get(u.id) ?? 0) < cap && this.getFervorUpgradeCost(u) <= this.fervorPoints - reserved && this.ritualInvestmentScore(u) > 0)
          .sort((a, b) => this.ritualInvestmentScore(b) - this.ritualInvestmentScore(a))[0];
        if (!upg) break;
        if (free) upg.level++;
        else if (!this.buyFervorUpgrade(upg)) break;
        bought.set(upg.id, (bought.get(upg.id) ?? 0) + 1);
      }
    }

    if (this.hasGnoseUpgrade('gn_relic_automation') && this.autoRelicUpgradesEnabled && this.isRelicsUnlocked()) {
      // Save for the first Phoenix before buying repeated minor upgrades.
      const phoenix = this.relicUpgrades.find(r => r.id === 'relic_phoenix')!;
      if (phoenix.level === 0) {
        if (this.relicPoints >= phoenix.cost) this.buyRelicUpgrade(phoenix);
        else return;
      }
      // Relic maxima bound this loop, independently of balance size.
      const cap = this.relicUpgrades.reduce((sum, relic) => sum + Math.max(0, relic.maxLevel - relic.level), 0);
      for (let step = 0; step < cap; step++) {
        const relic = this.relicUpgrades.filter(r => r.level < r.maxLevel && r.cost <= this.relicPoints)
          .sort((a, b) => this.relicInvestmentScore(b) - this.relicInvestmentScore(a))[0];
        if (!relic || !this.buyRelicUpgrade(relic)) break;
      }
    }
  }

  // --- Click & Actions ---
  public addClick(random: () => number = Math.random): { fpc: number; bossClickDamage: number; isCrit: boolean } {
    let fpc = this.getFaithPerClick();
    // 5% de chance de Pulso Crítico Cósmico (concede 2x Fé e 2x dano no Altar de Guardiões)
    const isCrit = random() < 0.05;
    if (isCrit) {
      fpc *= 2;
    }

    this.faithPoints += fpc;
    this.totalFaithAccumulated += fpc;
    this.totalClicks += 1;

    let bossClickDamage = 0;
    if (
      this.activeBossBattle &&
      this.activeBossBattle.combatStarted !== false &&
      this.activeBossBattle.sphereCooldownSec <= 1e-8
    ) {
      const battle = this.activeBossBattle;
      battle.sphereCooldownSec = BOSS_SPHERE_COOLDOWN_SEC;
      // Charge the Divine Sphere (+8% per Boss click)
      battle.sphereCharge = Math.min(100, (battle.sphereCharge ?? 0) + 8);
      const breakdown = this.getBossCombatBreakdown(battle.bossId);
      bossClickDamage = breakdown.clickDamage * (isCrit ? 2 : 1);
      battle.bossHp = Math.max(0, battle.bossHp - bossClickDamage);
      battle.phase = this.getBossPhase();
      if (battle.bossHp <= 0) {
        this.completeBossBattle(true);
      } else {
        this.checkAndApplyBossPhaseTransitions();
      }
    }

    return { fpc, bossClickDamage, isCrit };
  }

  public addIncarnationBoost(seconds: number): void {
    const maxCap = this.getMaxIncarnationBoost();
    this.incarnationBoostTimer = Math.min(maxCap, this.incarnationBoostTimer + seconds);
  }

  public buyOneFollower(index: number = 0): boolean {
    const item = this.followers[index];
    if (!item) return false;
    const cost = this.getItemCost(item);
    if (this.faithPoints >= cost) {
      this.faithPoints -= cost;
      item.count += 1;
      return true;
    }
    return false;
  }

  public buyMaxFollowers(index: number = 0): { count: number; totalCost: number; success: boolean } {
    const item = this.followers[index];
    if (!item || !this.isConvertMaxUnlocked()) {
      return { count: 0, totalCost: 0, success: false };
    }

    const discount = calculateCostDiscountMultiplier(this.achievements);
    const mult = this.getDevoteeBaseMultiplier();
    const { count, totalCost } = calculateMaxAffordableFollowers(item, this.faithPoints, discount, mult);

    if (count > 0 && this.faithPoints >= totalCost) {
      this.faithPoints -= totalCost;
      item.count += count;
      return { count, totalCost, success: true };
    }
    return { count: 0, totalCost: 0, success: false };
  }

  public upgradeIncarnation(): boolean {
    const nextStage = INCARNATION_STAGES.find((s) => s.stage === this.incarnationStage + 1);
    if (!nextStage || !this.isIncarnationUnlocked() || !this.canAccessIncarnationStage(nextStage.stage)) return false;
    const cost = this.getIncarnationStageCost(nextStage);
    if (this.faithPoints >= cost) {
      this.faithPoints -= cost;
      this.incarnationStage += 1;
      return true;
    }
    return false;
  }

  public buyFervorUpgrade(upg: FervorUpgrade): boolean {
    if (upg.id === 'fu_relics' && !this.isPhoenixRelicUnlocked()) {
      return false;
    }
    const cost = this.getFervorUpgradeCost(upg);
    if (this.fervorPoints >= cost) {
      this.fervorPeakThisRun = Math.max(this.fervorPeakThisRun, this.fervorPoints);
      this.fervorPoints -= cost;
      upg.level += 1;
      return true;
    }
    return false;
  }

  public buyMaxFervorUpgrade(upg: FervorUpgrade): number {
    if (!this.hasGnoseUpgrade('gn_memoria_selos')) return 0;
    let levels = 0;
    while (levels < 100 && this.buyFervorUpgrade(upg)) levels++;
    return levels;
  }

  public buyUnlock(unlock: MechanicUnlock): boolean {
    if (unlock.unlocked || (unlock.prerequisiteId && !this.unlocks.some(u => u.id === unlock.prerequisiteId && u.unlocked))) return false;
    const pool = unlock.costCurrency === 'fervor' ? this.fervorPoints : this.faithPoints;
    if (pool >= unlock.cost) {
      if (unlock.costCurrency === 'fervor') {
        this.fervorPoints -= unlock.cost;
      } else if (unlock.id !== 'unlock_gnose') {
        this.faithPoints -= unlock.cost;
      }
      unlock.unlocked = true;
      return true;
    }
    return false;
  }

  public convertFaithToRelics(): { gained: number; success: boolean } {
    const toGet = this.getRelicsToGet();
    if (!this.isRelicsUnlocked() || this.relicConvertCooldown > 0 || toGet <= 0) {
      return { gained: 0, success: false };
    }

    this.addRelics(toGet);
    if (toGet > this.bestRelicsToGet) {
      this.bestRelicsToGet = toGet;
    }
    this.faithPoints = 0;
    this.relicConvertCooldown = 3;
    return { gained: toGet, success: true };
  }

  public buyRelicUpgrade(relic: RelicUpgrade): boolean {
    if (relic.level >= relic.maxLevel || this.relicPoints < relic.cost) {
      return false;
    }
    this.relicPeakThisRun = Math.max(this.relicPeakThisRun, this.relicPoints);
    this.relicPoints -= relic.cost;
    relic.level += 1;
    return true;
  }

  public buyMaxRelicUpgrade(relic: RelicUpgrade): number {
    if (!this.hasGnoseUpgrade('gn_memoria_selos')) return 0;
    let levels = 0;
    while (levels < relic.maxLevel && this.buyRelicUpgrade(relic)) levels++;
    return levels;
  }

  // --- Gnose (True Prestige) Actions ---
  public canBuyGnoseUpgrade(upg: GnoseUpgrade): boolean {
    if (this.unlockedGnoseUpgrades.has(upg.id)) return false;
    if (!this.isGnoseTierUnlocked(upg.tier)) return false;
    if (this.gnosePoints < upg.cost) return false;
    return upg.prerequisites.every((reqId) => this.unlockedGnoseUpgrades.has(reqId));
  }

  public buyGnoseUpgrade(upgradeId: string): boolean {
    const upg = GNOSE_UPGRADES.find((u) => u.id === upgradeId);
    if (!upg || !this.canBuyGnoseUpgrade(upg)) {
      return false;
    }
    this.gnosePoints -= upg.cost;
    this.unlockedGnoseUpgrades.add(upg.id);

    if (upg.id === 'gn_init_faith') {
      const credited = Math.max(0, 1000 - this.faithPoints);
      this.faithPoints += credited;
      this.totalFaithAccumulated += credited;
    } else if (GNOSE_SEAL_UPGRADES[upg.id]) {
      const seal = this.unlocks.find(u => u.id === GNOSE_SEAL_UPGRADES[upg.id]);
      if (seal) seal.unlocked = true;
    } else if (upg.id === 'gn_bencao_eterna' && this.isIncarnationUnlocked()) {
      this.incarnationBoostTimer = this.getMaxIncarnationBoost();
    }

    return true;
  }

  public performGnoseReset(): { gained: number; success: boolean } {
    const toGet = this.getGnoseToGet();
    if (this.activeBossBattle || !this.isGnoseUnlocked() || toGet <= 0) {
      return { gained: 0, success: false };
    }

    this.gnosePoints += toGet;
    this.totalGnoseEarned += toGet;
    this.gnoseResets += 1;

    // Reset Fé (starts at 1000 if gn_init_faith is unlocked)
    this.faithPoints = this.hasGnoseUpgrade('gn_init_faith') ? 1000 : 1;

    // Reset Followers
    this.followers.forEach((f) => {
      f.count = 0;
    });

    // Reset Fervor & Ritos de Fervor
    this.fervorPoints = 0;
    this.fervorPeakThisRun = 0;
    this.relicPeakThisRun = 0;
    this.fervorUpgrades.forEach((u) => {
      u.level = 0;
    });

    // Reset Encarnação
    this.incarnationStage = 1;
    this.incarnationBoostTimer =
      this.hasGnoseUpgrade('gn_bencao_eterna') && this.hasGnoseUpgrade('gn_memoria_selos')
        ? this.getMaxIncarnationBoost()
        : 0;

    // Reset Fragmentos & Relíquias (unless Cripta Eterna is unlocked)
    this.relicPoints = 0;
    this.bestRelicsToGet = 0;
    this.relicConvertCooldown = 0;
    if (!this.hasGnoseUpgrade('gn_keep_relics')) {
      this.relicUpgrades.forEach((r) => {
        r.level = 0;
      });
    }

    // Only Memória Hermética preserves Encarnação; automated seals must be paid again.
    const permanentSelos = new Set(Object.entries(GNOSE_SEAL_UPGRADES)
      .filter(([upgrade]) => this.hasGnoseUpgrade(upgrade)).map(([, seal]) => seal));
    this.unlocks.forEach((u) => {
      if (u.id === 'unlock_incarnation' || u.id === 'unlock_fervor_upgrades' || u.id === 'unlock_relics') {
        u.unlocked = permanentSelos.has(u.id);
      } else if (u.id === 'unlock_gnose') {
        u.unlocked = true;
      }
    });

    // Note: defeatedBosses are permanently kept across Gnose resets!
    return { gained: toGet, success: true };
  }

  public checkAchievements(): Achievement[] {
    const snapshot = this.getSnapshot();
    const newlyUnlocked: Achievement[] = [];
    for (const ach of this.achievements) {
      if (!ach.unlocked && ach.check(snapshot)) {
        ach.unlocked = true;
        newlyUnlocked.push(ach);
      }
    }
    return newlyUnlocked;
  }

  // --- Serialization & Persistence ---
  public buildSaveData(): SaveData {
    return {
      version: SaveSystem.CURRENT_VERSION,
      progressionRevision: 1,
      timestamp: Date.now(),
      stats: {
        faithPoints: this.faithPoints,
        totalFaithAccumulated: this.totalFaithAccumulated,
        totalClicks: this.totalClicks,
        fervorPoints: this.fervorPoints,
        fervorPeakThisRun: this.fervorPeakThisRun,
        relicPeakThisRun: this.relicPeakThisRun,
        totalFervorGenerated: this.totalFervorGenerated,
        incarnationStage: this.incarnationStage,
        relicPoints: this.relicPoints,
        totalRelicsGenerated: this.totalRelicsGenerated,
        bestRelicsToGet: this.bestRelicsToGet,
        incarnationBoostTimer: this.incarnationBoostTimer,
        hasSeenIntro: this.hasSeenIntro,
        seenCardTutorials: Array.from(this.seenCardTutorials),
        nerdsEnabled: this.nerdsEnabled
      },
      followers: this.followers.map((f) => ({ id: f.id, count: f.count })),
      fervorUpgrades: this.fervorUpgrades.map((u) => ({ id: u.id, level: u.level })),
      relicUpgrades: this.relicUpgrades.map((r) => ({ id: r.id, level: r.level })),
      unlocks: this.unlocks.filter((u) => u.unlocked).map((u) => u.id),
      achievements: this.achievements.filter((a) => a.unlocked).map((a) => a.id),
      gnose: {
        gnosePoints: this.gnosePoints,
        totalGnoseEarned: this.totalGnoseEarned,
        gnoseResets: this.gnoseResets,
        unlockedUpgrades: Array.from(this.unlockedGnoseUpgrades),
        defeatedBosses: Array.from(this.defeatedBosses),
        bestBossTimesSec: { ...this.bestBossTimesSec },
        bossCurseTimerSec: this.bossCurseTimerSec,
        automationAccumulatorSec: this.gnoseAutoAccumulatorSec,
        confirmReset: this.confirmGnoseReset,
        autoFollowersEnabled: this.autoFollowersEnabled,
        autoFervorEnabled: this.autoFervorEnabled,
        autoRelicsEnabled: this.autoRelicsEnabled,
        autoRelicUpgradesEnabled: this.autoRelicUpgradesEnabled
      }
    };
  }

  public applySaveData(save: SaveData): void {
    if (!save || !save.stats) return;
    this.retreatBossBattle();
    this.riftIdCounter = 0;
    this.miracleIdCounter = 0;
    this.gnoseAutoAccumulatorSec = 0;

    this.faithPoints = typeof save.stats.faithPoints === 'number' ? Math.max(0, save.stats.faithPoints) : 1;
    this.totalFaithAccumulated = typeof save.stats.totalFaithAccumulated === 'number' ? Math.max(1, save.stats.totalFaithAccumulated) : 1;
    this.totalClicks = typeof save.stats.totalClicks === 'number' ? Math.max(0, save.stats.totalClicks) : 0;
    this.fervorPoints = typeof save.stats.fervorPoints === 'number' ? Math.max(0, save.stats.fervorPoints) : 0;
    this.totalFervorGenerated = Math.max(this.fervorPoints,
      Number.isFinite(save.stats.totalFervorGenerated) ? save.stats.totalFervorGenerated! : 0);
    this.incarnationStage = typeof save.stats.incarnationStage === 'number'
      ? Math.min(INCARNATION_STAGES.length, Math.max(1, save.stats.incarnationStage))
      : 1;
    this.relicPoints = typeof save.stats.relicPoints === 'number' ? Math.max(0, save.stats.relicPoints) : 0;
    this.fervorPeakThisRun = Math.max(this.fervorPoints, Number.isFinite(save.stats.fervorPeakThisRun) ? save.stats.fervorPeakThisRun! : 0);
    this.relicPeakThisRun = Math.max(this.relicPoints, Number.isFinite(save.stats.relicPeakThisRun) ? save.stats.relicPeakThisRun! : 0);
    this.bestRelicsToGet = typeof save.stats.bestRelicsToGet === 'number' ? Math.max(0, save.stats.bestRelicsToGet) : 0;
    this.incarnationBoostTimer = typeof save.stats.incarnationBoostTimer === 'number'
      ? Math.max(0, Math.min(this.getMaxIncarnationBoost(), save.stats.incarnationBoostTimer))
      : 0;
    this.hasSeenIntro = typeof save.stats.hasSeenIntro === 'boolean' ? save.stats.hasSeenIntro : false;
    this.nerdsEnabled = save.stats.nerdsEnabled === true;
    this.seenCardTutorials = new Set(Array.isArray(save.stats.seenCardTutorials)
      ? save.stats.seenCardTutorials.filter(id => typeof id === 'string') : []);

    if (Array.isArray(save.followers)) {
      save.followers.forEach((savedItem) => {
        const item = this.followers.find((f) => f.id === savedItem.id);
        if (item && typeof savedItem.count === 'number') {
          item.count = Math.max(0, savedItem.count);
        }
      });
    }

    if (Array.isArray(save.fervorUpgrades)) {
      save.fervorUpgrades.forEach((savedItem) => {
        const upg = this.fervorUpgrades.find((u) => u.id === savedItem.id);
        if (upg && typeof savedItem.level === 'number') {
          upg.level = Math.max(0, savedItem.level);
        }
      });
    }

    if (Array.isArray(save.relicUpgrades)) {
      save.relicUpgrades.forEach((savedItem) => {
        const rel = this.relicUpgrades.find((r) => r.id === savedItem.id);
        if (rel && typeof savedItem.level === 'number') {
          rel.level = Math.max(0, Math.min(rel.maxLevel, savedItem.level));
        }
      });
    }

    if (Array.isArray(save.unlocks)) {
      this.unlocks.forEach((u) => {
        u.unlocked = save.unlocks.includes(u.id);
      });
    }

    if (!this.isRelicsUnlocked()) {
      this.relicPoints = 0;
      this.bestRelicsToGet = 0;
    }

    this.totalRelicsGenerated = Math.max(this.relicPoints, this.bestRelicsToGet,
      Number.isFinite(save.stats.totalRelicsGenerated) ? save.stats.totalRelicsGenerated! : 0);

    if (Array.isArray(save.achievements)) {
      this.achievements.forEach((a) => {
        a.unlocked = save.achievements.includes(a.id);
      });
    }

    if (save.gnose) {
      this.gnosePoints = typeof save.gnose.gnosePoints === 'number' ? Math.max(0, save.gnose.gnosePoints) : 0;
      this.totalGnoseEarned = typeof save.gnose.totalGnoseEarned === 'number' ? Math.max(0, save.gnose.totalGnoseEarned) : 0;
      this.gnoseResets = typeof save.gnose.gnoseResets === 'number' ? Math.max(0, save.gnose.gnoseResets) : 0;
      if (Array.isArray(save.gnose.unlockedUpgrades)) {
        this.unlockedGnoseUpgrades = new Set(save.gnose.unlockedUpgrades);
      } else {
        this.unlockedGnoseUpgrades.clear();
      }
      if (Array.isArray(save.gnose.defeatedBosses)) {
        this.defeatedBosses = new Set(save.gnose.defeatedBosses);
      } else {
        this.defeatedBosses.clear();
      }
      this.bestBossTimesSec = {};
      if (save.gnose.bestBossTimesSec && typeof save.gnose.bestBossTimesSec === 'object') {
        for (const [k, v] of Object.entries(save.gnose.bestBossTimesSec)) {
          if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
            this.bestBossTimesSec[k] = v;
          }
        }
      }
      if ((save.progressionRevision ?? 0) < 1) {
        for (const [id, paid] of Object.entries(PROGRESSION_OLD_PRICES)) {
          if (this.hasGnoseUpgrade(id)) this.gnosePoints += Math.max(0, paid - GNOSE_UPGRADES.find(u => u.id === id)!.cost);
        }
      }
      this.migrateGnoseUpgrades();
      this.bossCurseTimerSec =
        typeof save.gnose.bossCurseTimerSec === 'number' ? Math.max(0, save.gnose.bossCurseTimerSec) : 0;
      this.gnoseAutoAccumulatorSec = Number.isFinite(save.gnose.automationAccumulatorSec) ? Math.max(0, Math.min(1, save.gnose.automationAccumulatorSec!)) : 0;
      this.confirmGnoseReset = typeof save.gnose.confirmReset === 'boolean' ? save.gnose.confirmReset : true;
      this.autoFollowersEnabled =
        typeof save.gnose.autoFollowersEnabled === 'boolean' ? save.gnose.autoFollowersEnabled : true;
      this.autoFervorEnabled =
        typeof save.gnose.autoFervorEnabled === 'boolean' ? save.gnose.autoFervorEnabled : true;
      this.autoRelicsEnabled =
        typeof save.gnose.autoRelicsEnabled === 'boolean' ? save.gnose.autoRelicsEnabled : true;
      this.autoRelicUpgradesEnabled =
        typeof save.gnose.autoRelicUpgradesEnabled === 'boolean' ? save.gnose.autoRelicUpgradesEnabled : true;
    } else {
      this.gnosePoints = 0;
      this.totalGnoseEarned = 0;
      this.gnoseResets = 0;
      this.unlockedGnoseUpgrades.clear();
      this.defeatedBosses.clear();
      this.bestBossTimesSec = {};
      this.bossCurseTimerSec = 0;
    }

    if (this.hasGnoseUpgrade('gn_bencao_eterna') && this.isIncarnationUnlocked()) {
      this.incarnationBoostTimer = this.getMaxIncarnationBoost();
    }
  }

  private migrateGnoseUpgrades(): void {
    for (const upgrade of RETIRED_GNOSE_UPGRADES) {
      if (!this.unlockedGnoseUpgrades.delete(upgrade.id)) continue;
      this.gnosePoints += upgrade.cost;
      // Owning a later-tier purchase already made that tier accessible in old saves.
      const guardian = GNOSE_BOSSES.find(boss => boss.unlocksTier === upgrade.tier);
      if (guardian) this.defeatedBosses.add(guardian.id);
    }
    const automations = LEGACY_GNOSE_AUTOMATIONS.filter(upgrade => this.unlockedGnoseUpgrades.delete(upgrade.id));
    if (automations.length > 0) {
      const automation = GNOSE_UPGRADES.find(upgrade => upgrade.id === 'gn_automation')!;
      const previousCost = automations.reduce((sum, upgrade) => sum + upgrade.cost, 0);
      this.gnosePoints += this.hasGnoseUpgrade(automation.id) ? previousCost : Math.max(0, previousCost - automation.cost);
      this.unlockedGnoseUpgrades.add(automation.id);
    }
    const sealAutomations = LEGACY_GNOSE_SEAL_AUTOMATIONS.filter(upgrade => this.unlockedGnoseUpgrades.delete(upgrade.id));
    if (sealAutomations.length > 0) {
      const replacement = GNOSE_UPGRADES.find(upgrade => upgrade.id === 'gn_seal_automation')!;
      const paid = sealAutomations.reduce((sum, upgrade) => sum + upgrade.cost, 0);
      this.gnosePoints += this.hasGnoseUpgrade(replacement.id) ? paid : Math.max(0, paid - replacement.cost);
      this.unlockedGnoseUpgrades.add(replacement.id);
      // Preserve access granted by a tier-II purchase in older saves.
      for (const upgrade of sealAutomations) {
        const guardian = GNOSE_BOSSES.find(boss => boss.unlocksTier === upgrade.tier);
        if (guardian) this.defeatedBosses.add(guardian.id);
      }
    }
    const validIds = new Set(GNOSE_UPGRADES.map(upgrade => upgrade.id));
    this.unlockedGnoseUpgrades = new Set([...this.unlockedGnoseUpgrades].filter(id => validIds.has(id)));
  }
}
