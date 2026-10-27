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
  BossCombatBreakdown
} from '../types.js';
import { initialFollowers } from '../config/followers.js';
import { initialFervorUpgrades, BASE_FERVOR_RATE, getFervorUpgradeMultiplier } from '../config/fervor.js';
import { initialAchievements } from '../config/achievements.js';
import { initialUnlocks } from '../config/unlocks.js';
import { initialRelicUpgrades } from '../config/relics.js';
import { INCARNATION_STAGES, BLESSING_MAX_SECONDS, type IncarnationStage } from '../config/incarnation.js';
import { GNOSE_UPGRADES, GNOSE_AUTOMATION, GNOSE_APOTHEOSIS_COSTS } from '../config/gnose.js';
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

  public confirmGnoseReset: boolean = true;
  public autoFollowersEnabled: boolean = true;
  public autoFervorEnabled: boolean = true;
  public autoRelicsEnabled: boolean = true;
  private gnoseAutoAccumulatorSec: number = 0;
  private autoFollowersBudget = 0;
  private autoFervorBudget = 0;

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

    this.confirmGnoseReset = true;
    this.autoFollowersEnabled = true;
    this.autoFervorEnabled = true;
    this.autoRelicsEnabled = true;
    this.gnoseAutoAccumulatorSec = 0;
    this.autoFollowersBudget = 0;
    this.autoFervorBudget = 0;

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
      return this.isGnoseTierUnlocked(2);
    }
    if (boss.unlocksTier === 4) {
      return this.isGnoseTierUnlocked(3);
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
   * Computes how all 6 Cult Resources (Fé, Fiéis, Fervor, Relíquias, Encarnação, Gnose)
   * synergize to drive Boss Battle DPS, Sphere Click damage, Rift critical damage,
   * and Altar Integrity protection/restoration.
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
    const effectiveFaith = Math.max(this.faithPoints, this.totalFaithAccumulated * 0.1);
    const faithLog = effectiveFaith > 1 ? Math.log10(effectiveFaith) : 0;
    const fpsLog = fps > 1 ? Math.log10(fps) : 0;
    const faithBonus = (faithLog * 0.04 + fpsLog * 0.05) / difficultyScale;

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
    const fervorRateLog = fervorRate > 0 ? Math.log10(fervorRate + 1) : 0;
    const fervorBonus =
      (fervorLog * 0.12 + fervorRateLog * 0.08 + fervorLevels * 0.04) / difficultyScale;

    // 4. Relíquias & Fragmentos (Fragmentos pool, best transmutation, and Relic upgrade levels)
    const relicLevels = this.relicUpgrades.reduce((acc, r) => acc + r.level, 0);
    const effectiveRelics = Math.max(this.relicPoints, this.bestRelicsToGet);
    const relicsLog = effectiveRelics > 0 ? Math.log10(effectiveRelics + 1) : 0;
    const relicsBonus = (relicsLog * 0.25 + relicLevels * 0.08) / difficultyScale;

    // 5. Encarnação Sagrada (Avatar stage 1..5 and active Blessing)
    const isBoostActive =
      this.incarnationBoostTimer > 0 ||
      (this.hasGnoseUpgrade('gn_bencao_eterna') && this.isIncarnationUnlocked());
    const incarnationBonus =
      ((this.incarnationStage - 1) * 0.35 + (isBoostActive ? 0.25 : 0)) / difficultyScale;

    // 6. Gnose (Gnose points, total Gnose earned, and assimilated Gnose tree nodes)
    const effectiveGnose = Math.max(this.gnosePoints, this.totalGnoseEarned);
    const gnoseLog = effectiveGnose > 0 ? Math.log10(effectiveGnose + 1) : 0;
    const gnoseNodes = this.unlockedGnoseUpgrades.size;
    const gnoseBonus = (gnoseLog * 0.22 + gnoseNodes * 0.08) / difficultyScale;

    const bonusSum =
      faithBonus + followersBonus + fervorBonus + relicsBonus + incarnationBonus + gnoseBonus;
    const curseMult = this.getBossCurseMultiplier();
    const totalResourceMultiplier = (1 + bonusSum) * curseMult;

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
      this.faithPoints > 1;

    // Normalize and cap final damage: raw production must not bypass combat pacing.
    const passiveDps = Math.min(bossMaxHp * BOSS_MAX_PASSIVE_HP_PER_SEC,
      Math.max(fps, hasActiveCultPower ? bossMaxHp * bonusSum * 0.0018 * curseMult : 0));
    const passiveHpFractionPerSec = passiveDps / bossMaxHp;

    const clickDamage = Math.min(bossMaxHp * BOSS_MAX_CLICK_HP_FRACTION,
      Math.max(fpc, bossMaxHp * 0.0015
        * (1 + bonusSum * 0.12 + fervorBonus * 0.08 + incarnationBonus * 0.08)));
    const clickHpFraction = clickDamage / bossMaxHp;

    const baseRiftPct = boss.riftDamagePercent;
    const riftDamage = Math.min(bossMaxHp * BOSS_MAX_RIFT_HP_FRACTION,
      Math.max(fpc * 5, bossMaxHp * baseRiftPct
        * (1 + bonusSum * 0.06 + relicsBonus * 0.1 + gnoseBonus * 0.08)));
    const riftHpFraction = riftDamage / bossMaxHp;

    // Altar Integrity Protection (from Relíquias, Encarnação, Fervor) & Heal on Rift Shatter
    const defenseScore = relicsBonus * 0.35 + incarnationBonus * 0.35 + fervorBonus * 0.15;
    const mitigationFactor = 1 / (1 + defenseScore * 2);
    const altarDamageOnMiss = Math.max(3, boss.altarDamageOnMiss * mitigationFactor);
    const altarHealOnRift = Math.min(
      15,
      followersBonus * 4 + relicsBonus * 5 + incarnationBonus * 4
    );

    return {
      faithBonus,
      followersBonus,
      fervorBonus,
      relicsBonus,
      incarnationBonus,
      gnoseBonus,
      totalResourceMultiplier,
      passiveHpFractionPerSec,
      passiveDps,
      clickHpFraction,
      clickDamage,
      riftHpFraction,
      riftDamage,
      altarDamageOnMiss,
      altarHealOnRift
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
      riftsMissed: 0
    };
    return true;
  }

  public spawnBossRift(): void {
    if (!this.activeBossBattle) return;
    const boss = GNOSE_BOSSES.find((b) => b.id === this.activeBossBattle?.bossId);
    if (!boss) return;

    this.riftIdCounter += 1;
    // Spread rifts around the arena perimeter (avoiding the center sphere)
    const angle = ((this.riftIdCounter * 137.5) % 360) * (Math.PI / 180);
    const radiusPercent = 30 + (this.riftIdCounter % 3) * 6;
    const xPercent = Math.max(14, Math.min(86, 50 + Math.cos(angle) * radiusPercent));
    const yPercent = Math.max(18, Math.min(82, 50 + Math.sin(angle) * radiusPercent));

    this.activeBossBattle.activeRifts.push({
      id: `rift_${this.riftIdCounter}`,
      xPercent,
      yPercent,
      remainingSec: boss.riftWindowSec,
      maxSec: boss.riftWindowSec
    });
  }

  public clickBossRift(riftId: string): { damage: number; shattered: boolean; victory: boolean } {
    if (!this.activeBossBattle) {
      return { damage: 0, shattered: false, victory: false };
    }
    const battle = this.activeBossBattle;
    const idx = battle.activeRifts.findIndex((r) => r.id === riftId);
    if (idx === -1) {
      return { damage: 0, shattered: false, victory: false };
    }

    const breakdown = this.getBossCombatBreakdown(battle.bossId);
    const damage = breakdown.riftDamage;

    battle.activeRifts.splice(idx, 1);
    battle.riftsShattered += 1;
    battle.bossHp = Math.max(0, battle.bossHp - damage);
    if (breakdown.altarHealOnRift > 0) {
      battle.altarIntegrity = Math.min(
        battle.maxAltarIntegrity,
        battle.altarIntegrity + breakdown.altarHealOnRift
      );
    }

    if (battle.bossHp <= 0) {
      this.completeBossBattle(true);
      return { damage, shattered: true, victory: true };
    }

    return { damage, shattered: true, victory: false };
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

  public getGnoseGainMultiplier(): number {
    let mult = 1.0;
    if (this.hasGnoseUpgrade('gn_gnose_mult')) {
      mult *= 2.5;
    }
    if (this.hasGnoseUpgrade('gn_omniscience')) {
      mult *= 2.0;
    }
    if (this.hasGnoseUpgrade('gn_apotheosis')) {
      mult *= 2.0;
    }
    return mult;
  }

  public getGnoseToGet(): number {
    if (!this.isGnoseUnlocked()) {
      return 0;
    }
    return calculateGnoseToGet(this.faithPoints, this.getGnoseGainMultiplier());
  }

  public getTotalGnosePassiveMultiplier(): number {
    let mult = calculateTotalGnoseMultiplier(this.totalGnoseEarned);
    if (this.hasGnoseUpgrade('gn_omniscience')) {
      mult *= 1.5;
    }
    return mult;
  }

  public getGnoseFollowersSynergyMultiplier(followersCount: number = this.getTotalFollowersCount()): number {
    return calculateGnoseFollowersSynergyMultiplier(
      followersCount,
      this.hasGnoseUpgrade('gn_followers_syn'),
      this.hasGnoseUpgrade('gn_followers_cubic')
    );
  }

  public getIncarnationStageCost(stageObj: IncarnationStage): number {
    if (stageObj.stage >= 4 && this.hasGnoseUpgrade('gn_apotheosis')) {
      return GNOSE_APOTHEOSIS_COSTS[stageObj.stage] ?? stageObj.cost;
    }
    return stageObj.cost;
  }

  public getEffectiveIncarnationFollowerMultiplier(): number {
    const base = calculateIncarnationFollowerMultiplier(this.fervorPoints, this.incarnationStage);
    return this.hasGnoseUpgrade('gn_gnose_mult') ? base * 3.0 : base;
  }

  public isPhoenixRelicUnlocked(): boolean {
    return (this.relicUpgrades.find((r) => r.id === 'relic_phoenix')?.level ?? 0) >= 1;
  }

  public getMaxIncarnationBoost(): number {
    return BLESSING_MAX_SECONDS;
  }

  /** Production and the Ritos panel use exactly the same evolved formulas. */
  public getFervorUpgradeEffect(upg: FervorUpgrade, followersCount = this.getTotalFollowersCount()): number {
    let effect = getFervorUpgradeMultiplier(upg, followersCount, this.faithPoints, this.isFu1Boosted());
    if (upg.id === 'fu_relics' && upg.level > 0 && this.hasGnoseUpgrade('gn_alchemical_mind')) {
      effect = Math.pow(4, Math.pow(upg.level, 0.6));
    }
    if (upg.id === 'fu_synergy' && this.hasGnoseUpgrade('gn_synergy_boost')) {
      effect = 5 * Math.pow(effect, 1.35);
    }
    return effect;
  }

  public getRelicResonanceMultiplier(): number {
    if (!this.hasGnoseUpgrade('gn_relic_resonance')) return 1;
    return 1 + this.relicUpgrades.reduce((sum, r) => sum + (r.level > 0 ? 0.5 + 0.5 * Math.min(1, r.level / r.maxLevel) : 0), 0);
  }

  public getAutoRelicsFraction(): number {
    if (this.hasGnoseUpgrade('gn_omniscience')) return 1;
    return this.hasGnoseUpgrade('gn_alchemical_mind')
      ? GNOSE_AUTOMATION.refinedRelicFraction : GNOSE_AUTOMATION.relicFraction;
  }

  public getRelicsBonusMultiplier(): number {
    const fuRelics = this.fervorUpgrades.find((u) => u.id === 'fu_relics');
    let mult = 1.0;
    if (fuRelics && fuRelics.level > 0) {
      mult = this.getFervorUpgradeEffect(fuRelics);
    }
    if (this.hasGnoseUpgrade('gn_init_faith')) {
      mult *= 3.5;
    }
    if (this.hasGnoseUpgrade('gn_memoria_selos')) {
      mult *= 1.5;
    }
    if (this.hasGnoseUpgrade('gn_init_fervor')) {
      mult *= 3.0;
    }
    if (this.hasGnoseUpgrade('gn_alchemical_mind')) {
      mult *= 4.0;
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
    return Math.max(1.05, 1.10 - caduceusLevel * 0.005);
  }

  public getItemCost(item: BuyableItem): number {
    const discount = calculateCostDiscountMultiplier(this.achievements);
    const customMult = item.id === 'f_devotee' ? this.getDevoteeBaseMultiplier() : undefined;
    return calculateItemCost(item, discount, customMult);
  }

  public getFaithPerClick(): number {
    const clickBuff = calculateClickBuffMultiplier(this.achievements);
    let globalBuff = calculateGlobalBuffMultiplier(this.achievements);
    if (this.hasGnoseUpgrade('gn_init_faith')) {
      globalBuff *= 8.0;
    }
    if (this.hasGnoseUpgrade('gn_apotheosis')) {
      globalBuff *= 100.0;
    }
    if (this.hasGnoseUpgrade('gn_dilatacao')) {
      globalBuff *= 2.0;
    }
    globalBuff *= this.getRelicResonanceMultiplier();
    globalBuff *= this.getTotalGnosePassiveMultiplier();
    globalBuff *= this.getGnoseFollowersSynergyMultiplier();
    globalBuff *= this.getBossRewardsMultiplier();

    const fervorClickMult = this.getFervorUpgradeEffect(this.fervorUpgrades[2]);
    const fervorEffectMult = this.getFervorUpgradeEffect(this.fervorUpgrades[1]);
    const fervorFaithBonus = calculateFervorFaithBonus(this.fervorPoints, fervorEffectMult);

    let fpc = calculateFaithPerClick(clickBuff, globalBuff, fervorClickMult, fervorFaithBonus);
    if (this.hasGnoseUpgrade('gn_click_power')) {
      fpc *= 10.0;
    }

    return fpc;
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
    const pulsePassiveMultiplier = this.hasGnoseUpgrade('gn_click_power') ? 1.25 : 1;
    const fervorFollowersMult = this.getFervorUpgradeEffect(this.fervorUpgrades[3], followersCount);
    const incFollowerMult = this.getEffectiveIncarnationFollowerMultiplier();
    const passiveBuff = calculatePassiveBuffMultiplier(this.achievements);
    let globalBuff = calculateGlobalBuffMultiplier(this.achievements);
    if (this.hasGnoseUpgrade('gn_init_faith')) {
      globalBuff *= 8.0;
    }
    if (this.hasGnoseUpgrade('gn_apotheosis')) {
      globalBuff *= 100.0;
    }
    if (this.hasGnoseUpgrade('gn_dilatacao')) {
      globalBuff *= 2.0;
    }
    globalBuff *= this.getRelicResonanceMultiplier();
    globalBuff *= this.getTotalGnosePassiveMultiplier();
    globalBuff *= this.getGnoseFollowersSynergyMultiplier(followersCount);
    globalBuff *= this.getBossRewardsMultiplier();
    globalBuff *= this.getBossCurseMultiplier();

    const fervorEffectMult = this.getFervorUpgradeEffect(this.fervorUpgrades[1]);
    const fervorFaithBonus = calculateFervorFaithBonus(this.fervorPoints, fervorEffectMult);

    const cornucopiaMult = 1 + (this.relicUpgrades[0].level * 0.20);
    const arkMult = calculateRelicFaithMultiplier(this.relicPoints, this.relicUpgrades[5].level);
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
      incarnationBoostMult * pulsePassiveMultiplier
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
    if (this.hasGnoseUpgrade('gn_init_faith')) {
      prodMult *= 3.0;
    }
    if (this.hasGnoseUpgrade('gn_init_fervor')) {
      prodMult *= 5.0;
    }
    if (this.hasGnoseUpgrade('gn_dilatacao')) {
      prodMult *= 2.0;
    }
    if (this.hasGnoseUpgrade('gn_altar_resonance')) {
      prodMult *= this.getEffectiveIncarnationFollowerMultiplier();
    }
    prodMult *= this.getRelicResonanceMultiplier();
    if (this.hasGnoseUpgrade('gn_apotheosis')) {
      prodMult *= 100.0;
    }
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
    if (this.hasGnoseUpgrade('gn_keep_relics')) {
      autoGen += toGet * 0.25;
    }
    if (this.hasGnoseUpgrade('gn_auto_relics') && this.autoRelicsEnabled) {
      autoGen += toGet * this.getAutoRelicsFraction();
    }
    return Math.max(1.0, extraPerSec) + autoGen;
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
    this.fervorPoints += fervorGained;

    if (this.relicConvertCooldown > 0) {
      this.relicConvertCooldown = Math.max(0, this.relicConvertCooldown - deltaSec);
    }

    const relicRate = this.getRelicsRatePerSecond();
    let relicGained = 0;
    if (relicRate > 0) {
      relicGained = relicRate * deltaSec;
      this.relicPoints += relicGained;
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

    // 1. Passive DPS from all Cult Resources (Fé, Fiéis, Fervor, Relíquias, Encarnação, Gnose)
    if (breakdown.passiveDps > 0) {
      battle.bossHp = Math.max(0, battle.bossHp - breakdown.passiveDps * deltaSec);
      if (battle.bossHp <= 0) {
        this.completeBossBattle(true);
        return;
      }
    }

    // 2. Update active rifts & check for expired rifts (which damage Altar Integrity, mitigated by Relíquias/Encarnação/Fervor)
    for (let i = battle.activeRifts.length - 1; i >= 0; i--) {
      const rift = battle.activeRifts[i];
      rift.remainingSec -= deltaSec;
      if (rift.remainingSec <= 0) {
        battle.activeRifts.splice(i, 1);
        battle.riftsMissed += 1;
        battle.altarIntegrity = Math.max(0, battle.altarIntegrity - breakdown.altarDamageOnMiss);
        if (battle.altarIntegrity <= 0) {
          this.completeBossBattle(false);
          return;
        }
      }
    }

    // 3. Spawn new rifts periodically
    battle.riftSpawnTimerSec -= deltaSec;
    if (battle.riftSpawnTimerSec <= 0) {
      battle.riftSpawnTimerSec += boss.riftIntervalSec;
      if (battle.activeRifts.length < 3) {
        this.spawnBossRift();
      }
    }
  }

  public runGnoseAutomation(): void {
    const free = this.hasGnoseUpgrade('gn_omniscience');
    if (this.hasGnoseUpgrade('gn_auto_followers') && this.autoFollowersEnabled) {
      const devotee = this.followers[0];
      if (devotee) {
        // Seed the economy when there is no passive income, using the normal first cost.
        this.autoFollowersBudget = free ? 0 : Math.min(this.faithPoints * GNOSE_AUTOMATION.balanceShare,
          this.autoFollowersBudget + this.getFaithPerSecond() * GNOSE_AUTOMATION.incomeShare);
        const budget = free ? this.faithPoints : this.getTotalFollowersCount() === 0
          ? Math.min(this.faithPoints, this.getItemCost(devotee)) : this.autoFollowersBudget;
        const { count, totalCost } = calculateMaxAffordableFollowers(devotee, budget,
          calculateCostDiscountMultiplier(this.achievements), this.getDevoteeBaseMultiplier());
        if (count > 0) {
          if (!free) {
            this.faithPoints = Math.max(0, this.faithPoints - totalCost);
            this.autoFollowersBudget = Math.max(0, this.autoFollowersBudget - totalCost);
          }
          devotee.count += count;
        }
      }
    }

    if (this.hasGnoseUpgrade('gn_auto_fervor') && this.autoFervorEnabled && this.isFervorUpgradesUnlocked()) {
      this.autoFervorBudget = free ? 0 : Math.min(this.fervorPoints * GNOSE_AUTOMATION.balanceShare,
        this.autoFervorBudget + this.getFervorRatePerSecond() * GNOSE_AUTOMATION.incomeShare);
      let budget = free ? this.fervorPoints : this.autoFervorBudget;
      const bought = new Map<string, number>();
      // Spend one shared budget on the cheapest eligible Rito; cap work at 50 levels per Rito.
      for (let step = 0; step < this.fervorUpgrades.length * 50; step++) {
        const upg = this.fervorUpgrades.filter(u => (u.id !== 'fu_relics' || this.isPhoenixRelicUnlocked())
          && (bought.get(u.id) ?? 0) < 50 && calculateFervorUpgradeCost(u) <= budget)
          .sort((a, b) => calculateFervorUpgradeCost(a) - calculateFervorUpgradeCost(b))[0];
        if (!upg) break;
        const cost = calculateFervorUpgradeCost(upg);
        if (!free) {
          budget = Math.max(0, budget - cost);
          this.fervorPoints = Math.max(0, this.fervorPoints - cost);
          this.autoFervorBudget = budget;
        }
        upg.level++;
        bought.set(upg.id, (bought.get(upg.id) ?? 0) + 1);
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
    if (!nextStage) return false;
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
    const cost = calculateFervorUpgradeCost(upg);
    if (this.fervorPoints >= cost) {
      this.fervorPoints -= cost;
      upg.level += 1;
      return true;
    }
    return false;
  }

  public buyUnlock(unlock: MechanicUnlock): boolean {
    if (unlock.unlocked) return false;
    const pool = unlock.costCurrency === 'fervor' ? this.fervorPoints : this.faithPoints;
    if (pool >= unlock.cost) {
      if (unlock.costCurrency === 'fervor') {
        this.fervorPoints -= unlock.cost;
      } else {
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

    this.relicPoints += toGet;
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
    this.relicPoints -= relic.cost;
    relic.level += 1;
    return true;
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
    } else if (upg.id === 'gn_memoria_selos') {
      const earlySelos = ['unlock_incarnation', 'unlock_fervor_upgrades', 'unlock_relics'];
      this.unlocks.forEach((u) => {
        if (earlySelos.includes(u.id)) {
          u.unlocked = true;
        }
      });
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
    this.autoFollowersBudget = 0;
    this.autoFervorBudget = 0;

    // Reset Fé (starts at 1000 if gn_init_faith is unlocked)
    this.faithPoints = this.hasGnoseUpgrade('gn_init_faith') ? 1000 : 1;

    // Reset Followers
    this.followers.forEach((f) => {
      f.count = 0;
    });

    // Reset Fervor & Ritos de Fervor
    this.fervorPoints = 0;
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

    // Re-lock earlier Selos unless Memória Hermética is unlocked
    const keepEarlySelos = this.hasGnoseUpgrade('gn_memoria_selos');
    this.unlocks.forEach((u) => {
      if (u.id === 'unlock_incarnation' || u.id === 'unlock_fervor_upgrades' || u.id === 'unlock_relics') {
        u.unlocked = keepEarlySelos;
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
      timestamp: Date.now(),
      stats: {
        faithPoints: this.faithPoints,
        totalFaithAccumulated: this.totalFaithAccumulated,
        totalClicks: this.totalClicks,
        fervorPoints: this.fervorPoints,
        incarnationStage: this.incarnationStage,
        relicPoints: this.relicPoints,
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
        confirmReset: this.confirmGnoseReset,
        autoFollowersEnabled: this.autoFollowersEnabled,
        autoFervorEnabled: this.autoFervorEnabled,
        autoRelicsEnabled: this.autoRelicsEnabled,
        autoFollowersBudget: this.autoFollowersBudget,
        autoFervorBudget: this.autoFervorBudget
      }
    };
  }

  public applySaveData(save: SaveData): void {
    if (!save || !save.stats) return;
    this.retreatBossBattle();
    this.riftIdCounter = 0;
    this.gnoseAutoAccumulatorSec = 0;
    this.autoFollowersBudget = 0;
    this.autoFervorBudget = 0;

    this.faithPoints = typeof save.stats.faithPoints === 'number' ? Math.max(0, save.stats.faithPoints) : 1;
    this.totalFaithAccumulated = typeof save.stats.totalFaithAccumulated === 'number' ? Math.max(1, save.stats.totalFaithAccumulated) : 1;
    this.totalClicks = typeof save.stats.totalClicks === 'number' ? Math.max(0, save.stats.totalClicks) : 0;
    this.fervorPoints = typeof save.stats.fervorPoints === 'number' ? Math.max(0, save.stats.fervorPoints) : 0;
    this.incarnationStage = typeof save.stats.incarnationStage === 'number'
      ? Math.min(INCARNATION_STAGES.length, Math.max(1, save.stats.incarnationStage))
      : 1;
    this.relicPoints = typeof save.stats.relicPoints === 'number' ? Math.max(0, save.stats.relicPoints) : 0;
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
      this.bossCurseTimerSec =
        typeof save.gnose.bossCurseTimerSec === 'number' ? Math.max(0, save.gnose.bossCurseTimerSec) : 0;
      this.confirmGnoseReset = typeof save.gnose.confirmReset === 'boolean' ? save.gnose.confirmReset : true;
      this.autoFollowersEnabled =
        typeof save.gnose.autoFollowersEnabled === 'boolean' ? save.gnose.autoFollowersEnabled : true;
      this.autoFervorEnabled =
        typeof save.gnose.autoFervorEnabled === 'boolean' ? save.gnose.autoFervorEnabled : true;
      this.autoRelicsEnabled =
        typeof save.gnose.autoRelicsEnabled === 'boolean' ? save.gnose.autoRelicsEnabled : true;
      const restoreBudget = (value: number | undefined, balance: number) => Number.isFinite(value)
        ? Math.min(balance * GNOSE_AUTOMATION.balanceShare, Math.max(0, value!)) : 0;
      this.autoFollowersBudget = restoreBudget(save.gnose.autoFollowersBudget, this.faithPoints);
      this.autoFervorBudget = restoreBudget(save.gnose.autoFervorBudget, this.fervorPoints);
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
}
