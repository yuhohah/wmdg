import type {
  BuyableItem,
  AutomationGoal,
  FervorUpgrade,
  Achievement,
  MechanicUnlock,
  RelicUpgrade,
  GameState as GameStateSnapshot,
  GnoseUpgrade,
  GnoseBoss,
  ActiveBossBattle,
  BossCombatBreakdown
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
  BOSS_MAX_RIFT_HP_FRACTION,
  BOSS_SPHERE_COOLDOWN_SEC
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
  public bossCurseTimerSec: number = 0;
  public activeBossBattle: ActiveBossBattle | null = null;
  private riftIdCounter: number = 0;

  public automationGoal: AutomationGoal = 'automatic';
  public automationGnoseTarget = 1;
  public confirmGnoseReset: boolean = true;
  public autoFollowersEnabled: boolean = true;
  public autoFervorEnabled: boolean = true;
  public autoRelicsEnabled: boolean = true;
  private gnoseAutoAccumulatorSec: number = 0;
  public autoRelicUpgradesEnabled: boolean = true;

  // Onboarding & Intro Sequence
  public hasSeenIntro: boolean = false;

  // Optional callback when an active boss battle concludes during tick or click
  public onBossBattleFinished?: (result: { boss: GnoseBoss; victory: boolean }) => void;

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

    this.gnosePoints = 0;
    this.totalGnoseEarned = 0;
    this.gnoseResets = 0;
    this.unlockedGnoseUpgrades.clear();
    this.defeatedBosses.clear();
    this.bossCurseTimerSec = 0;
    this.activeBossBattle = null;
    this.riftIdCounter = 0;

    this.automationGoal = 'automatic';
    this.automationGnoseTarget = 1;
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

  public getBossForTier(tier: 2 | 3 | 4 | 'endgame'): GnoseBoss | undefined {
    return GNOSE_BOSSES.find((b) => b.unlocksTier === tier);
  }

  public isGnoseTierUnlocked(tier: 1 | 2 | 3 | 4): boolean {
    if (tier === 1) return true;
    const boss = this.getBossForTier(tier);
    if (!boss) return true;
    if (this.defeatedBosses.has(boss.id)) return true;
    // Backward compatibility: if player already owns an upgrade in this tier, consider it unlocked
    const hasUpgradeInTier = GNOSE_UPGRADES.some(
      (u) => u.tier === tier && this.unlockedGnoseUpgrades.has(u.id)
    );
    return hasUpgradeInTier;
  }

  public canChallengeBoss(bossId: string): boolean {
    const boss = GNOSE_BOSSES.find((b) => b.id === bossId);
    if (!boss) return false;
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
   * Altar Integrity protection/restoration, and combat duration.
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
      faithBonus + followersBonus + fervorBonus + relicsBonus + incarnationBonus + gnoseBonus;
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

    const cultReadiness = Math.max(
      0.2,
      faithReadiness * 0.18 +
        followersReadiness * 0.16 +
        fervorReadiness * 0.2 +
        relicsReadiness * 0.18 +
        incarnationReadiness * 0.14 +
        gnoseReadiness * 0.14
    );

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
    const passiveDps = Math.min(
      bossMaxHp * BOSS_MAX_PASSIVE_HP_PER_SEC,
      Math.max(fps, hasActiveCultPower ? bossMaxHp * bonusSum * 0.00175 * readinessFactor * curseMult : 0)
    );
    const passiveHpFractionPerSec = passiveDps / bossMaxHp;

    const clickDamage = Math.min(
      bossMaxHp * BOSS_MAX_CLICK_HP_FRACTION,
      Math.max(
        fpc,
        bossMaxHp *
          0.0014 *
          (0.6 + 0.4 * cultReadiness) *
          (1 + bonusSum * 0.12 + fervorBonus * 0.08 + incarnationBonus * 0.08)
      )
    );
    const clickHpFraction = clickDamage / bossMaxHp;

    const baseRiftPct = boss.riftDamagePercent;
    const riftDamage = Math.min(
      bossMaxHp * BOSS_MAX_RIFT_HP_FRACTION,
      Math.max(
        fpc * 5,
        bossMaxHp *
          baseRiftPct *
          (0.8 + 0.2 * cultReadiness) *
          (1 + bonusSum * 0.06 + relicsBonus * 0.1 + gnoseBonus * 0.08)
      )
    );
    const riftHpFraction = riftDamage / bossMaxHp;

    // Altar Integrity Protection (from Relíquias, Encarnação, Fervor, Conquistas) & Heal on Rift Shatter
    const defenseScore =
      relicsBonus * 0.35 +
      incarnationBonus * 0.35 +
      fervorBonus * 0.15 +
      achievementsBonus * 0.25;
    const mitigationFactor = 1 / (1 + defenseScore * 1.85);
    const minMissFloor =
      boss.id === 'boss_anubis'
        ? 4
        : boss.id === 'boss_cronos'
          ? 5
          : boss.id === 'boss_odin'
            ? 6.5
            : 8.5;
    const altarDamageOnMiss = Math.max(minMissFloor, boss.altarDamageOnMiss * mitigationFactor);
    const altarHealOnRift = Math.min(
      16,
      followersBonus * 4 + relicsBonus * 5 + incarnationBonus * 4
    );

    // Continuous Divine Pressure on Altar Integrity (mitigated by cult preparation; makes battle duration depend on rest of game)
    const rawPressure = boss.altarPressurePerSec ?? 0.65;
    const pressureMitigation = 1 / (1 + defenseScore * 2.2 + cultReadiness * 1.2);
    const altarPressurePerSec = Math.max(0.08, rawPressure * pressureMitigation);

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
      estimatedAltarSurvivalSec
    };
  }

  public startBossBattle(bossId: string): boolean {
    const boss = GNOSE_BOSSES.find((b) => b.id === bossId);
    if (this.activeBossBattle || !boss || !this.canChallengeBoss(bossId)) {
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
      phase: 1,
      comboStreak: 0
    };
    return true;
  }

  public getBossPhase(): 1 | 2 | 3 {
    if (!this.activeBossBattle) return 1;
    const hpRatio = this.activeBossBattle.bossHp / this.activeBossBattle.bossMaxHp;
    if (hpRatio <= 0.25) return 3;
    if (hpRatio <= 0.6) return 2;
    return 1;
  }

  public spawnBossRift(): void {
    if (!this.activeBossBattle) return;
    const boss = GNOSE_BOSSES.find((b) => b.id === this.activeBossBattle?.bossId);
    if (!boss) return;

    this.riftIdCounter += 1;
    // Spread rifts around the guardian, leaving the portrait readable.
    const angle = ((this.riftIdCounter * 137.5) % 360) * (Math.PI / 180);
    const radiusPercent = 30 + (this.riftIdCounter % 3) * 6;
    const xPercent = Math.max(14, Math.min(86, 50 + Math.cos(angle) * radiusPercent));
    const yPercent = Math.max(18, Math.min(82, 50 + Math.sin(angle) * radiusPercent));

    const phase = this.getBossPhase();
    const windowScale = phase === 3 ? 0.85 : phase === 2 ? 0.92 : 1.0;
    const windowSec = Math.max(1.6, boss.riftWindowSec * windowScale);

    this.activeBossBattle.activeRifts.push({
      id: `rift_${this.riftIdCounter}`,
      xPercent,
      yPercent,
      remainingSec: windowSec,
      maxSec: windowSec
    });
  }

  public clickBossRift(riftId: string): { damage: number; shattered: boolean; victory: boolean; comboStreak?: number } {
    if (!this.activeBossBattle) {
      return { damage: 0, shattered: false, victory: false };
    }
    const battle = this.activeBossBattle;
    const idx = battle.activeRifts.findIndex((r) => r.id === riftId);
    if (idx === -1) {
      return { damage: 0, shattered: false, victory: false };
    }

    const breakdown = this.getBossCombatBreakdown(battle.bossId);
    const nextCombo = (battle.comboStreak ?? 0) + 1;
    battle.comboStreak = nextCombo;
    // Combo streak rewards active rift defense (+5% per consecutive rift, up to +30%)
    const comboMult = 1 + Math.min(0.3, (nextCombo - 1) * 0.05);
    const damage = Math.min(battle.bossMaxHp * BOSS_MAX_RIFT_HP_FRACTION, breakdown.riftDamage * comboMult);

    battle.activeRifts.splice(idx, 1);
    battle.riftsShattered += 1;
    battle.bossHp = Math.max(0, battle.bossHp - damage);
    battle.phase = this.getBossPhase();
    if (breakdown.altarHealOnRift > 0) {
      battle.altarIntegrity = Math.min(
        battle.maxAltarIntegrity,
        battle.altarIntegrity + breakdown.altarHealOnRift
      );
    }

    if (battle.bossHp <= 0) {
      this.completeBossBattle(true);
      return { damage, shattered: true, victory: true, comboStreak: nextCombo };
    }

    return { damage, shattered: true, victory: false, comboStreak: nextCombo };
  }

  public retreatBossBattle(): void {
    this.activeBossBattle = null;
  }

  private completeBossBattle(victory: boolean): void {
    if (!this.activeBossBattle) return;
    const boss = GNOSE_BOSSES.find((b) => b.id === this.activeBossBattle?.bossId);
    this.activeBossBattle = null;

    if (victory && boss) {
      this.defeatedBosses.add(boss.id);
      this.bossCurseTimerSec = 0;
    } else {
      this.bossCurseTimerSec = BOSS_CURSE_DURATION_SEC;
    }

    if (boss && this.onBossBattleFinished) {
      this.onBossBattleFinished({ boss, victory });
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
    let scale = upg.costMultiplier;
    if (upg.id === 'fu_prod' && this.hasGnoseUpgrade('gn_init_fervor')) scale -= GNOSE_FORMULAS.ritualCostStep;
    if (upg.id === 'fu_relics' && this.hasGnoseUpgrade('gn_relic_gain')) scale -= GNOSE_FORMULAS.relicCostStep;
    if (upg.id === 'fu_relics' && this.hasGnoseUpgrade('gn_relic_refinement')) scale -= GNOSE_FORMULAS.refinedRelicCostStep;
    if (upg.id === 'fu_relics' && this.hasGnoseUpgrade('gn_perfect_opus')) scale -= GNOSE_FORMULAS.perfectRelicCostStep;
    if (upg.id === 'fu_prod' && this.hasGnoseUpgrade('gn_empyrean_fire')) scale -= GNOSE_FORMULAS.empyreanRitualCostStep;
    if (this.hasGnoseUpgrade('gn_apotheosis')) scale -= GNOSE_FORMULAS.ritualCostStep;
    return calculateFervorUpgradeCost(upg, Math.max(1.01, scale));
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
    if (!battle) return;

    const boss = GNOSE_BOSSES.find((b) => b.id === battle.bossId);
    if (!boss) return;

    battle.sphereCooldownSec = Math.max(0, battle.sphereCooldownSec - deltaSec);
    const breakdown = this.getBossCombatBreakdown(battle.bossId);
    const phase = this.getBossPhase();
    battle.phase = phase;

    // 1. Update active rifts & check for expired rifts first so defeat on expiry takes precedence over passive tick victory
    for (let i = battle.activeRifts.length - 1; i >= 0; i--) {
      const rift = battle.activeRifts[i];
      rift.remainingSec -= deltaSec;
      if (rift.remainingSec <= 0) {
        battle.activeRifts.splice(i, 1);
        battle.riftsMissed += 1;
        battle.comboStreak = 0;
        battle.altarIntegrity = Math.max(0, battle.altarIntegrity - breakdown.altarDamageOnMiss);
        if (battle.altarIntegrity <= 0) {
          this.completeBossBattle(false);
          return;
        }
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

  public getAutomationTarget(): { id: string; label: string; faith: number; etaSec: number } {
    const targets: Array<{ id: string; label: string; faith: number }> = [];
    if (this.automationGoal === 'automatic' || this.automationGoal === 'next_seal') {
      const seal = this.unlocks.find(u => !u.unlocked && (!u.prerequisiteId || this.unlocks.some(p => p.id === u.prerequisiteId && p.unlocked)));
      if (seal?.costCurrency === 'faith') targets.push({ id: seal.id, label: seal.name, faith: seal.cost });
    }
    if ((this.automationGoal === 'automatic' || this.automationGoal === 'avatar') && this.isIncarnationUnlocked()) {
      const avatar = INCARNATION_STAGES.find(s => s.stage === this.incarnationStage + 1);
      if (avatar && this.canAccessIncarnationStage(avatar.stage)) targets.push({ id: `avatar-${avatar.stage}`, label: avatar.name, faith: this.getIncarnationStageCost(avatar) });
    }
    if ((this.automationGoal === 'automatic' || this.automationGoal === 'gnose') && this.isGnoseUnlocked()) {
      const next = GNOSE_UPGRADES.filter(u => !this.hasGnoseUpgrade(u.id) && this.isGnoseTierUnlocked(u.tier)
        && u.prerequisites.every(id => this.hasGnoseUpgrade(id))).sort((a, b) => a.cost - b.cost)[0];
      const amount = this.automationGoal === 'gnose' ? this.automationGnoseTarget : Math.max(1, (next?.cost ?? 1) - this.gnosePoints);
      targets.push({ id: `gnose-${amount}`, label: `${amount} Gnose`, faith: 1e15 * amount ** (1 / this.getGnoseGainExponent()) });
    }
    const target = targets.sort((a, b) => a.faith - b.faith)[0] ?? { id: 'production', label: 'Produção livre', faith: Infinity };
    const rate = this.getFaithPerSecond();
    return { ...target, etaSec: target.faith <= this.faithPoints ? 0 : rate > 0 ? (target.faith - this.faithPoints) / rate : Infinity };
  }

  public getFollowerReservation(): { label: string; faith: number; etaSec: number } | undefined {
    const goal = this.getAutomationTarget();
    if (!Number.isFinite(goal.faith)) return undefined;
    if (goal.etaSec <= 180) return goal;
    const rate = this.getFaithPerSecond();
    if (rate <= 0) return undefined;
    const milestones: Array<{ label: string; faith: number }> = [];
    const seal = this.unlocks.find(u => !u.unlocked && (!u.prerequisiteId || this.unlocks.some(p => p.id === u.prerequisiteId && p.unlocked)));
    if (seal?.costCurrency === 'faith') milestones.push({ label: seal.name, faith: seal.cost });
    const avatar = INCARNATION_STAGES.find(s => s.stage === this.incarnationStage + 1);
    if (avatar && this.isIncarnationUnlocked() && this.canAccessIncarnationStage(avatar.stage)) milestones.push({ label: avatar.name, faith: this.getIncarnationStageCost(avatar) });
    return milestones.filter(m => m.faith <= goal.faith).map(m => ({ ...m, etaSec: Math.max(0, (m.faith - this.faithPoints) / rate) }))
      .filter(m => m.etaSec <= 180).sort((a, b) => a.faith - b.faith)[0];
  }

  /** The same investment rule is consumed by automation and the benchmark. */
  public shouldInvestInFollower(count = 1, cost = this.getItemCost(this.followers[0])): boolean {
    if (this.getTotalFollowersCount() === 0) return true;
    if (this.getFollowerReservation()) return false;
    const target = this.getAutomationTarget();
    if (!Number.isFinite(target.faith)) return true;
    if (target.etaSec <= 180) return false;
    const rate = this.getFaithPerSecond();
    const after = rate + this.getFollowerPurchaseFaithGain(count);
    return after > 0 && (target.faith - this.faithPoints + cost) / after < target.etaSec;
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
          if (available < cost || (!free && !this.shouldInvestInFollower(1, cost))) break;
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
    if (this.activeBossBattle && this.activeBossBattle.sphereCooldownSec <= 1e-8) {
      this.activeBossBattle.sphereCooldownSec = BOSS_SPHERE_COOLDOWN_SEC;
      const breakdown = this.getBossCombatBreakdown(this.activeBossBattle.bossId);
      bossClickDamage = breakdown.clickDamage * (isCrit ? 2 : 1);
      this.activeBossBattle.bossHp = Math.max(0, this.activeBossBattle.bossHp - bossClickDamage);
      this.activeBossBattle.phase = this.getBossPhase();
      if (this.activeBossBattle.bossHp <= 0) {
        this.completeBossBattle(true);
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
        hasSeenIntro: this.hasSeenIntro
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
        bossCurseTimerSec: this.bossCurseTimerSec,
        automationAccumulatorSec: this.gnoseAutoAccumulatorSec,
        automationGoal: this.automationGoal,
        automationGnoseTarget: this.automationGnoseTarget,
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
      if ((save.progressionRevision ?? 0) < 1) {
        for (const [id, paid] of Object.entries(PROGRESSION_OLD_PRICES)) {
          if (this.hasGnoseUpgrade(id)) this.gnosePoints += Math.max(0, paid - GNOSE_UPGRADES.find(u => u.id === id)!.cost);
        }
      }
      this.migrateGnoseUpgrades();
      this.bossCurseTimerSec =
        typeof save.gnose.bossCurseTimerSec === 'number' ? Math.max(0, save.gnose.bossCurseTimerSec) : 0;
      this.gnoseAutoAccumulatorSec = Number.isFinite(save.gnose.automationAccumulatorSec) ? Math.max(0, Math.min(1, save.gnose.automationAccumulatorSec!)) : 0;
      this.automationGoal = ['automatic', 'next_seal', 'avatar', 'gnose'].includes(save.gnose.automationGoal ?? '') ? save.gnose.automationGoal! : 'automatic';
      this.automationGnoseTarget = Number.isFinite(save.gnose.automationGnoseTarget) ? Math.max(1, Math.floor(save.gnose.automationGnoseTarget!)) : 1;
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
