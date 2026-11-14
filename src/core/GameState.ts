import { getRelicUpgradeCost, getRelicUpgradeBulkCost, getMaxAffordableRelicLevels } from '../systems/relicCosts.js';
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
} from '../types.js';
import { initialFollowers } from '../config/followers.js';
import { initialFervorUpgrades, BASE_FERVOR_RATE } from '../config/fervor.js';
import { initialAchievements, SPHERE_CRITICAL } from '../config/achievements.js';
import { initialUnlocks } from '../config/unlocks.js';
import { initialRelicUpgrades, ETERNAL_RELIC_IDS } from '../config/relics.js';
import { INCARNATION_STAGES, BLESSING_MAX_SECONDS, type IncarnationStage } from '../config/incarnation.js';
import { PROGRESSION_BALANCE, GNOSE_UPGRADES, GNOSE_SEAL_UPGRADES, GNOSE_FORMULAS, GNOSE_APOTHEOSIS_COSTS } from '../config/gnose.js';
import {
  GNOSE_BOSSES,
  BOSS_SPHERE_COOLDOWN_SEC,
} from '../config/bosses.js';
import {
  calculateItemCost,
  calculateFervorUpgradeCost,
  getFervorUpgradeMultiplier,
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
import {
  applySaveDataToState,
  buildSaveDataFromState,
  type SaveData,
} from '../systems/saveSystem.js';
import {
  beginBossCombat,
  calculateBossCombatBreakdown,
  canChallengeBoss,
  checkAndApplyBossPhaseTransitions,
  clickBossMiracle,
  clickBossRift,
  completeBossBattle,
  defeatBossForTesting,
  getBossBestTimeSec,
  getBossCurseMultiplier,
  getBossForTier,
  getBossPhase,
  getBossRewardsMultiplier,
  isBossDefeated,
  isGnoseTierUnlocked,
  retreatBossBattle,
  spawnBossMiracle,
  spawnBossRift,
  startBossBattle,
  tickBossBattle,
} from '../systems/bossCombat.js';

export class GameStateManager {
  // Numeric Resources & Stats
  public faithPoints: number = 0;
  public totalFaithAccumulated: number = 0;
  public totalClicks: number = 0;
  public gameStartedAtMs: number = 0;
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
  public campaignEnding: 'pending' | 'completed' | 'freeplay' = 'pending';
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
  public riftIdCounter: number = 0;
  public miracleIdCounter: number = 0;

  public confirmGnoseReset: boolean = true;
  public autoFollowersEnabled: boolean = true;
  public autoFervorEnabled: boolean = true;
  public autoRelicsEnabled: boolean = true;
  public gnoseAutoAccumulatorSec: number = 0;
  public sphereAutoAccumulatorSec: number = 0;
  private lastSphereAutoclick: { fpc: number; isCrit: boolean } | null = null;
  public autoRelicUpgradesEnabled: boolean = true;

  // Onboarding & Intro Sequence
  public hasSeenIntro: boolean = false;
  public seenCardTutorials: Set<string> = new Set();
  public nerdsEnabled: boolean = false;
  public hideGuidance: boolean = false;
  public showHotkeys: boolean = true;
  public convertMaxUnlocked: boolean = false;
  public bulkFervorEnabled: boolean = false;
  public bulkRelicsEnabled: boolean = false;

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
    this.campaignEnding = 'pending';
    this.faithPoints = 0;
    this.totalFaithAccumulated = 0;
    this.totalClicks = 0;
    this.gameStartedAtMs = 0;
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
    this.hideGuidance = false;
    this.showHotkeys = true;
    this.convertMaxUnlocked = false;
    this.bulkFervorEnabled = false;
    this.bulkRelicsEnabled = false;

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
    this.sphereAutoAccumulatorSec = 0;
    this.lastSphereAutoclick = null;
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
      gnoseUpgradeIds: [...this.unlockedGnoseUpgrades],
      defeatedBossesCount: this.defeatedBosses.size,
      defeatedBossIds: [...this.defeatedBosses],
      tiamatDefeated: this.defeatedBosses.has('boss_tiamat')
    };
  }

  // --- Multipliers & Rates ---
  public getTotalFollowersCount(): number {
    let total = 0;
    for (let i = 0; i < this.followers.length; i++) {
      total += this.followers[i].count;
    }
    return total;
  }

  private isSealUnlockedById(id: string, expectedIndex: number): boolean {
    const fast = this.unlocks[expectedIndex];
    if (fast && fast.id === id) return fast.unlocked;
    for (let i = 0; i < this.unlocks.length; i++) {
      if (this.unlocks[i].id === id) return this.unlocks[i].unlocked;
    }
    return false;
  }

  public isIncarnationUnlocked(): boolean {
    return this.isSealUnlockedById('unlock_incarnation', 0);
  }

  public isFervorUpgradesUnlocked(): boolean {
    return this.isSealUnlockedById('unlock_fervor_upgrades', 1);
  }

  public isRelicsUnlocked(): boolean {
    return this.isSealUnlockedById('unlock_relics', 2);
  }

  public isGnoseUnlocked(): boolean {
    return (
      this.isSealUnlockedById('unlock_gnose', 3) ||
      this.gnoseResets > 0 ||
      this.totalGnoseEarned > 0
    );
  }

  public hasGnoseUpgrade(upgradeId: string): boolean {
    return this.unlockedGnoseUpgrades.has(upgradeId);
  }

  // --- Gnose Boss & Tier Gate Logic ---
  public isBossDefeated(bossId: string): boolean {
    return isBossDefeated(this, bossId);
  }

  public getBossBestTimeSec(bossId: string): number | undefined {
    return getBossBestTimeSec(this, bossId);
  }

  public getBossForTier(tier: 1 | 2 | 3 | 4): GnoseBoss | undefined {
    return getBossForTier(tier);
  }

  public isGnoseTierUnlocked(tier: 1 | 2 | 3 | 4): boolean {
    return isGnoseTierUnlocked(this, tier);
  }

  public canChallengeBoss(bossId: string, options?: { isRematch?: boolean }): boolean {
    return canChallengeBoss(this, bossId, options);
  }

  public getBossRewardsMultiplier(): number {
    return getBossRewardsMultiplier(this);
  }

  public getBossCurseMultiplier(): number {
    return getBossCurseMultiplier(this);
  }

  public getBossCombatBreakdown(bossId?: string): BossCombatBreakdown {
    return calculateBossCombatBreakdown(this, bossId);
  }

  public startBossBattle(
    bossId: string,
    options?: { awaitProcession?: boolean; isRematch?: boolean }
  ): boolean {
    return startBossBattle(this, bossId, options);
  }

  public beginBossCombat(): void {
    beginBossCombat(this);
  }

  public getBossPhase(): 1 | 2 | 3 {
    return getBossPhase(this);
  }

  private hasUnlockedAchievementBuff(buffType: Achievement['buffType']): boolean {
    for (let i = 0; i < this.achievements.length; i++) {
      const ach = this.achievements[i];
      if (ach.unlocked && ach.buffType === buffType) return true;
    }
    return false;
  }

  public areMiraclesUnlocked(): boolean {
    return this.hasUnlockedAchievementBuff('miracles_unlock');
  }

  public areMiraclesAutoCollected(): boolean {
    return this.hasUnlockedAchievementBuff('miracles_auto');
  }

  public spawnBossMiracle(preferredSlot?: number): void {
    spawnBossMiracle(this, preferredSlot);
  }

  public clickBossMiracle(): { healed: number; triggered: boolean; integrityAfter: number } {
    return clickBossMiracle(this);
  }

  public spawnBossRift(options?: { forceSpecial?: boolean; forceStandard?: boolean }): void {
    spawnBossRift(this, options);
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
    return clickBossRift(this, riftId);
  }

  public retreatBossBattle(): void {
    retreatBossBattle(this);
  }

  /** Test panel shortcut: grant a Guardian victory without campaign requirements. */
  public defeatBossForTesting(bossId: string): boolean {
    return defeatBossForTesting(this, bossId);
  }

  public isConvertMaxUnlocked(): boolean {
    return this.convertMaxUnlocked || this.hasGnoseUpgrade('gn_automation') || this.getTotalFollowersCount() >= 25 || this.hasGnoseUpgrade('gn_memoria_selos');
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

  /** Smooth cycle growth between permanent milestones; no lifetime resource history. */
  public getFervorResonanceMultiplier(): number {
    const exponent = PROGRESSION_BALANCE.fervorResonanceExponent;
    return (1 + Math.max(this.fervorPoints, this.fervorPeakThisRun) / PROGRESSION_BALANCE.fervorResonanceScale) ** exponent;
  }

  public getGnoseFollowersSynergyMultiplier(followersCount: number = this.getTotalFollowersCount()): number {
    const hasCongregation = this.hasGnoseUpgrade('gn_followers_syn');
    const early = this.hasGnoseUpgrade('gn_init_faith');
    const exponent = hasCongregation
      ? (this.hasGnoseUpgrade('gn_followers_cubic') ? 1.1 : PROGRESSION_BALANCE.congregationExponent)
      : PROGRESSION_BALANCE.earlySynergyExponent;
    return calculateGnoseFollowersSynergyMultiplier(followersCount, hasCongregation || early, exponent);

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
    const fast = this.relicUpgrades[2];
    if (fast && fast.id === 'relic_phoenix') return fast.level >= 1;
    return (this.relicUpgrades.find((r) => r.id === 'relic_phoenix')?.level ?? 0) >= 1;
  }

  public getMaxIncarnationBoost(): number {
    return BLESSING_MAX_SECONDS;
  }

  /** Manual purchases, automation and UI use the same effective exponential cost. */
  public getFervorUpgradeCost(upg: FervorUpgrade, level = upg.level): number {
    return calculateFervorUpgradeCost(upg, this.getFervorUpgradeCostMultiplier(upg), level);
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
  public getFervorUpgradeEffect(upg: FervorUpgrade, followersCount = this.getTotalFollowersCount(), level = upg.level): number {
    const productionBase = this.hasGnoseUpgrade('gn_empyrean_fire') ? GNOSE_FORMULAS.empyreanProductionBase
      : this.isFu1Boosted() ? GNOSE_FORMULAS.hermeticProductionBase
      : this.hasGnoseUpgrade('gn_init_fervor') ? GNOSE_FORMULAS.fervorProductionBase : 2;
    const relicBase = this.hasGnoseUpgrade('gn_perfect_opus') ? GNOSE_FORMULAS.perfectRelicProductionBase
      : this.hasGnoseUpgrade('gn_relic_refinement') ? GNOSE_FORMULAS.refinedRelicProductionBase
      : this.hasGnoseUpgrade('gn_relic_gain') ? GNOSE_FORMULAS.relicProductionBase : 3;
    return getFervorUpgradeMultiplier(upg, followersCount, this.faithPoints, productionBase, relicBase, level);
  }

  public getAutoRelicsFraction(): number {
    if (this.hasGnoseUpgrade('gn_omniscience')) return 1;
    return 0;
  }

  public getRelicsBonusMultiplier(): number {
    const fast = this.fervorUpgrades[5];
    const fuRelics = fast && fast.id === 'fu_relics' ? fast : this.fervorUpgrades.find((u) => u.id === 'fu_relics');
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
    const fast = INCARNATION_STAGES[this.incarnationStage - 1];
    if (fast && fast.stage === this.incarnationStage) return fast.multiplier;
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

    let base = 1;
    for (let i = 0; i < this.achievements.length; i++) {
      const ach = this.achievements[i];
      if (ach.unlocked && ach.buffType === 'fpc_base') {
        base += ach.buffVal;
      }
    }
    return calculateFaithPerClick(clickBuff, globalBuff, fervorClickMult, fervorFaithBonus, base);
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
    let followersCount = 0;
    for (let i = 0; i < followers.length; i++) {
      followersCount += followers[i].count;
    }
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
    const fastTorch = this.relicUpgrades[1];
    const torchLevel = fastTorch && fastTorch.id === 'relic_torch'
      ? fastTorch.level
      : (this.relicUpgrades.find((r) => r.id === 'relic_torch')?.level ?? 0);
    const torchMult = 1 + (torchLevel * 0.20);
    prodMult *= torchMult;
    prodMult *= this.getIncarnationStageMultiplier();
    prodMult *= this.getTotalGnosePassiveMultiplier();
    prodMult *= this.getBossRewardsMultiplier();
    prodMult *= this.getBossCurseMultiplier();

    let synergyMult = this.getFervorUpgradeEffect(this.fervorUpgrades[4]);
    if (this.isPhoenixRelicUnlocked()) {
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
    return Math.max(1.0, extraPerSec) + autoGen;
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

  public getLastSphereAutoclick(): Readonly<{ fpc: number; isCrit: boolean }> | null {
    return this.lastSphereAutoclick;
  }

  public getSphereAutoclickProgress(): number | null {
    return this.hasUnlockedAchievementBuff('sphere_autoclick')
      ? this.sphereAutoAccumulatorSec : null;
  }

  // --- Game Loop Tick Logic ---
  public tick(
    deltaSec: number,
    random: () => number = Math.random
  ): {
    faithGained: number;
    fervorGained: number;
    relicGained: number;
    autoClickFaithGained: number;
    autoClickBossDamage: number;
  } {
    if (!Number.isFinite(deltaSec) || deltaSec < 0) throw new RangeError('Intervalo de simulação inválido.');
    let faithGained = 0;
    let fervorGained = 0;
    let relicGained = 0;
    let autoClickFaithGained = 0;
    let autoClickBossDamage = 0;
    // All systems share the same substeps, including buffs, combat and automation.
    let remaining = deltaSec;
    while (remaining > 1e-8) {
      const step = Math.min(0.1, remaining);
      const result = this.advanceTick(step, random);
      faithGained += result.faithGained;
      fervorGained += result.fervorGained;
      relicGained += result.relicGained;
      autoClickFaithGained += result.autoClickFaithGained;
      autoClickBossDamage += result.autoClickBossDamage;
      remaining -= step;
    }
    return { faithGained, fervorGained, relicGained, autoClickFaithGained, autoClickBossDamage };
  }

  private readonly tickResult = {
    faithGained: 0,
    fervorGained: 0,
    relicGained: 0,
    autoClickFaithGained: 0,
    autoClickBossDamage: 0
  };

  private advanceTick(
    deltaSec: number,
    random: () => number = Math.random
  ): {
    faithGained: number;
    fervorGained: number;
    relicGained: number;
    autoClickFaithGained: number;
    autoClickBossDamage: number;
  } {
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
      tickBossBattle(this, deltaSec);
    }

    let autoClickFaithGained = 0;
    let autoClickBossDamage = 0;
    // Automatic Sphere clicks use the same rewards, criticals and lifetime counter as manual clicks.
    if (this.hasUnlockedAchievementBuff('sphere_autoclick')) {
      this.sphereAutoAccumulatorSec += deltaSec;
      if (this.sphereAutoAccumulatorSec + 1e-8 >= 1) {
        this.sphereAutoAccumulatorSec = Math.max(0, this.sphereAutoAccumulatorSec - 1);
        const battleBefore = this.activeBossBattle;
        const hpBefore = battleBefore?.bossHp ?? 0;
        const result = this.addClick(random);
        autoClickFaithGained = result.fpc;
        if (battleBefore) {
          autoClickBossDamage = Math.min(hpBefore, result.bossClickDamage);
        }
        this.lastSphereAutoclick = { fpc: result.fpc, isCrit: result.isCrit };
        faithGained += result.fpc;
      }
    }

    // Gnose autobuyers (runs once per second; paid until Olho do Infinito)
    this.gnoseAutoAccumulatorSec += deltaSec;
    if (this.gnoseAutoAccumulatorSec + 1e-8 >= 1.0) {
      this.gnoseAutoAccumulatorSec = Math.max(0, this.gnoseAutoAccumulatorSec - 1.0);
      this.runGnoseAutomation();
    }

    this.tickResult.faithGained = faithGained;
    this.tickResult.fervorGained = fervorGained;
    this.tickResult.relicGained = relicGained;
    this.tickResult.autoClickFaithGained = autoClickFaithGained;
    this.tickResult.autoClickBossDamage = autoClickBossDamage;
    return this.tickResult;
  }

  public canAccessIncarnationStage(stage: number): boolean {
    return INCARNATION_STAGES.some(incarnation => incarnation.stage === stage);
  }

  private ritualInvestmentScore(upg: FervorUpgrade): number {
    const followersCount = this.getTotalFollowersCount();
    const before = this.getFervorUpgradeEffect(upg, followersCount, upg.level);
    const after = this.getFervorUpgradeEffect(upg, followersCount, upg.level + 1);
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
    return (after.reduce((sum, rate, i) => sum + Math.max(0, rate - before[i]) / Math.max(1, before[i]), 0) + costGain) / this.getRelicUpgradeCost(relic);
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
      this.recruitMaxFollowers(0, free);
    }

    if (this.hasGnoseUpgrade('gn_ritual_automation') && this.autoFervorEnabled && this.isFervorUpgradesUnlocked()) {
      const bought = new Set<string>();
      const reserved = this.unlocks.find(u => !u.unlocked && u.costCurrency === 'fervor')?.cost ?? 0;
      for (let step = 0; step < this.fervorUpgrades.length; step++) {
        const upg = this.fervorUpgrades.filter(u => (u.id !== 'fu_relics' || this.isPhoenixRelicUnlocked())
          && !bought.has(u.id) && this.getFervorUpgradeCost(u) <= this.fervorPoints - reserved && this.ritualInvestmentScore(u) > 0)
          .sort((a, b) => this.ritualInvestmentScore(b) - this.ritualInvestmentScore(a))[0];
        if (!upg) break;
        const count = this.bulkFervorEnabled && this.hasGnoseUpgrade('gn_memoria_selos')
          ? this.getMaxFervorUpgradeCount(upg, this.fervorPoints - reserved) : 1;
        if (free) upg.level += count;
        else for (let level = 0; level < count; level++) this.buyFervorUpgrade(upg);
        bought.add(upg.id);
      }
    }

    if (this.hasGnoseUpgrade('gn_relic_automation') && this.autoRelicUpgradesEnabled && this.isRelicsUnlocked()) {
      // Save for the first Phoenix before buying repeated minor upgrades.
      const phoenix = this.relicUpgrades.find(r => r.id === 'relic_phoenix')!;
      if (phoenix.level === 0) {
        if (this.relicPoints >= phoenix.cost) this.buyRelicUpgrade(phoenix);
        else return;
      }
      const bought = new Set<string>();
      // Each relic receives one purchase per cycle, using the same quantity as its card.
      for (let step = 0; step < this.relicUpgrades.length; step++) {
        const relic = this.relicUpgrades.filter(r => r.level < this.getRelicMaxLevel(r) && r.level < Number.MAX_SAFE_INTEGER
          && !bought.has(r.id) && this.getRelicUpgradeCost(r) <= this.relicPoints)
          .sort((a, b) => this.relicInvestmentScore(b) - this.relicInvestmentScore(a))[0];
        if (!relic) break;
        if (this.bulkRelicsEnabled && this.hasGnoseUpgrade('gn_memoria_selos')) this.buyMaxRelicUpgrade(relic);
        else this.buyRelicUpgrade(relic);
        bought.add(relic.id);
      }
    }
  }

  // --- Click & Actions ---
  public getSphereCriticalChance(): number {
    return SPHERE_CRITICAL.chanceMilestones.filter((clicks) => this.totalClicks >= clicks).length
      * SPHERE_CRITICAL.chancePerMilestone;
  }

  public addClick(random: () => number = Math.random): { fpc: number; bossClickDamage: number; isCrit: boolean; bossIsCrit: boolean } {
    let fpc = this.getFaithPerClick();
    // The completed lifetime click milestones apply starting with the next click.
    const isCrit = random() < this.getSphereCriticalChance();
    const bossIsCrit = isCrit && this.totalClicks >= SPHERE_CRITICAL.bossUnlockClicks;
    if (isCrit) {
      fpc *= SPHERE_CRITICAL.multiplier;
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
      const breakdown = this.getBossCombatBreakdown(battle.bossId);
      bossClickDamage = breakdown.clickDamage * (bossIsCrit ? SPHERE_CRITICAL.multiplier : 1);
      battle.bossHp = Math.max(0, battle.bossHp - bossClickDamage);
      battle.phase = this.getBossPhase();
      if (battle.bossHp <= 0) {
        completeBossBattle(this, true);
      } else {
        checkAndApplyBossPhaseTransitions(this);
      }
    }

    return { fpc, bossClickDamage, isCrit, bossIsCrit };
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

    return this.recruitMaxFollowers(index);
  }

  private recruitMaxFollowers(index: number, free = false): { count: number; totalCost: number; success: boolean } {
    const item = this.followers[index];
    if (!item) return { count: 0, totalCost: 0, success: false };
    const discount = calculateCostDiscountMultiplier(this.achievements);
    const mult = this.getDevoteeBaseMultiplier();
    const { count, totalCost } = calculateMaxAffordableFollowers(item, this.faithPoints, discount, mult);

    if (count > 0 && this.faithPoints >= totalCost) {
      if (!free) this.faithPoints -= totalCost;
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

  public getMaxFervorUpgradeCount(upg: FervorUpgrade, balance = this.fervorPoints): number {
    if (!this.hasGnoseUpgrade('gn_memoria_selos') || (upg.id === 'fu_relics' && !this.isPhoenixRelicUnlocked())) return 0;
    let remaining = balance;
    let count = 0;
    while (count < 100) {
      const cost = this.getFervorUpgradeCost(upg, upg.level + count);
      if (!Number.isFinite(cost) || remaining < cost) break;
      remaining -= cost;
      count++;
    }
    return count;
  }

  public buyMaxFervorUpgrade(upg: FervorUpgrade): number {
    const count = this.getMaxFervorUpgradeCount(upg);
    let levels = 0;
    while (levels < count && this.buyFervorUpgrade(upg)) levels++;
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

  public getRelicUpgradeCost(relic: RelicUpgrade): number {
    return getRelicUpgradeCost(relic);
  }

  public getEternalRelicRetention(): number {
    if (!this.hasGnoseUpgrade('gn_keep_relics')) return 0;
    return this.hasGnoseUpgrade('gn_eternal_memory') ? 0.8 : 0.5;
  }

  public getRelicMaxLevel(relic: RelicUpgrade): number {
    return this.hasGnoseUpgrade('gn_keep_relics') && ETERNAL_RELIC_IDS.includes(relic.id)
      ? Infinity : relic.maxLevel;
  }

  public buyRelicUpgrade(relic: RelicUpgrade): boolean {
    if (relic.level >= Number.MAX_SAFE_INTEGER || relic.level >= this.getRelicMaxLevel(relic) || this.relicPoints < this.getRelicUpgradeCost(relic)) {
      return false;
    }
    this.restoreRelicLevels(relic, 1);
    return true;
  }

  public getMaxRelicUpgradeCount(relic: RelicUpgrade): number {
    if (!this.hasGnoseUpgrade('gn_memoria_selos')) return 0;
    return this.getAffordableRelicUpgradeCount(relic);
  }

  private getAffordableRelicUpgradeCount(relic: RelicUpgrade): number {
    return getMaxAffordableRelicLevels(relic, this.relicPoints, this.getRelicMaxLevel(relic));
  }

  public buyMaxRelicUpgrade(relic: RelicUpgrade): number {
    const count = this.getMaxRelicUpgradeCount(relic);
    if (count === 0) return 0;
    this.restoreRelicLevels(relic, count);
    return count;
  }

  private restoreRelicLevels(relic: RelicUpgrade, count: number): void {
    this.relicPeakThisRun = Math.max(this.relicPeakThisRun, this.relicPoints);
    this.relicPoints = Math.max(0, this.relicPoints - getRelicUpgradeBulkCost(relic, count));
    relic.level += count;
  }

  // --- Gnose (True Prestige) Actions ---
  public canBuyGnoseUpgrade(upg: GnoseUpgrade): boolean {
    if (this.unlockedGnoseUpgrades.has(upg.id)) return false;
    if (!this.isGnoseTierUnlocked(upg.tier)) return false;
    if (this.gnosePoints < upg.cost) return false;
    return true;
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
    this.faithPoints = this.hasGnoseUpgrade('gn_init_faith') ? 1000 : 0;

    // Preserve recruitment access before clearing this ascension's followers.
    this.convertMaxUnlocked = this.isConvertMaxUnlocked();

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
    const keepRelics = this.hasGnoseUpgrade('gn_keep_relics');
    const retention = this.getEternalRelicRetention();
    this.relicUpgrades.forEach((relic) => {
      if (!keepRelics) relic.level = 0;
      else if (ETERNAL_RELIC_IDS.includes(relic.id)) relic.level = Math.floor(relic.level * retention);
    });

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

  private readonly achSnapshot: GameStateSnapshot = {
    faith: 0,
    totalFaith: 0,
    clicks: 0,
    followers: 0,
    fps: 0,
    fervor: 0,
    relics: 0,
    totalRelics: 0,
    gnosePoints: 0,
    totalGnoseEarned: 0,
    gnoseResets: 0,
    gnoseUpgradeIds: [],
    defeatedBossesCount: 0,
    defeatedBossIds: [],
    tiamatDefeated: false
  };
  private readonly emptyAchievements: Achievement[] = [];

  public checkAchievements(): Achievement[] {
    let hasLocked = false;
    for (let i = 0; i < this.achievements.length; i++) {
      const ach = this.achievements[i];
      if (!ach.unlocked) {
        hasLocked = true;
        break;
      }
    }
    if (!hasLocked) {
      this.emptyAchievements.length = 0;
      return this.emptyAchievements;
    }

    // Refresh every field: achievement conditions must not depend on ID naming.
    // Reuse the snapshot and its arrays to avoid per-tick allocation.
    const snap = this.achSnapshot;
    snap.faith = this.faithPoints;
    snap.totalFaith = this.totalFaithAccumulated;
    snap.clicks = this.totalClicks;
    snap.followers = this.getTotalFollowersCount();
    snap.fps = this.getFaithPerSecond();
    snap.fervor = this.fervorPoints;
    snap.relics = this.relicPoints;
    snap.totalRelics = this.bestRelicsToGet;
    snap.gnosePoints = this.gnosePoints;
    snap.totalGnoseEarned = this.totalGnoseEarned;
    snap.gnoseResets = this.gnoseResets;
    snap.defeatedBossesCount = this.defeatedBosses.size;
    snap.tiamatDefeated = this.defeatedBosses.has('boss_tiamat');

    const gnoseArr = snap.gnoseUpgradeIds!;
    gnoseArr.length = 0;
    for (const id of this.unlockedGnoseUpgrades) gnoseArr.push(id);
    const bossArr = snap.defeatedBossIds!;
    bossArr.length = 0;
    for (const id of this.defeatedBosses) bossArr.push(id);

    let newlyUnlocked: Achievement[] | null = null;
    for (let i = 0; i < this.achievements.length; i++) {
      const ach = this.achievements[i];
      if (!ach.unlocked && ach.check(snap)) {
        ach.unlocked = true;
        if (!newlyUnlocked) newlyUnlocked = [];
        newlyUnlocked.push(ach);
      }
    }
    if (!newlyUnlocked) {
      this.emptyAchievements.length = 0;
      return this.emptyAchievements;
    }
    return newlyUnlocked;
  }

  // --- Serialization & Persistence ---
  public startGameClock(nowMs = Date.now()): void {
    if (this.gameStartedAtMs === 0 && Number.isFinite(nowMs) && nowMs > 0) this.gameStartedAtMs = nowMs;
  }

  public getTotalPlayTimeSeconds(nowMs = Date.now()): number {
    if (this.gameStartedAtMs === 0 || !Number.isFinite(nowMs)) return 0;
    return Math.max(0, Math.floor((nowMs - this.gameStartedAtMs) / 1000));
  }

  public isCampaignComplete(): boolean {
    const finalStage = INCARNATION_STAGES.at(-1)!;
    const finalBoss = GNOSE_BOSSES.find(boss => boss.unlocksTier === 4);
    return this.incarnationStage >= finalStage.stage && !!finalBoss && this.isBossDefeated(finalBoss.id)
      && GNOSE_UPGRADES.every(upgrade => this.hasGnoseUpgrade(upgrade.id));
  }

  public buildSaveData(): SaveData {
    return buildSaveDataFromState(this);
  }

  public applySaveData(save: SaveData): void {
    applySaveDataToState(this, save);
    this.lastSphereAutoclick = null;
  }
}
