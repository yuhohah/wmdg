import type {
  BuyableItem,
  FervorUpgrade,
  Achievement,
  MechanicUnlock,
  RelicUpgrade,
  GameState as GameStateSnapshot,
  GnoseUpgrade
} from '../types.js';
import { initialFollowers } from '../config/followers.js';
import { initialFervorUpgrades, BASE_FERVOR_RATE, getFervorUpgradeMultiplier } from '../config/fervor.js';
import { initialAchievements } from '../config/achievements.js';
import { initialUnlocks } from '../config/unlocks.js';
import { initialRelicUpgrades } from '../config/relics.js';
import { INCARNATION_STAGES, BLESSING_MAX_SECONDS, type IncarnationStage } from '../config/incarnation.js';
import { GNOSE_UPGRADES } from '../config/gnose.js';
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

  // Gnose (True Prestige) State
  public gnosePoints: number = 0;
  public totalGnoseEarned: number = 0;
  public gnoseResets: number = 0;
  public unlockedGnoseUpgrades: Set<string> = new Set();
  public confirmGnoseReset: boolean = true;
  public autoFollowersEnabled: boolean = true;
  public autoFervorEnabled: boolean = true;
  public autoRelicsEnabled: boolean = true;
  private gnoseAutoAccumulatorSec: number = 0;

  // Onboarding & Intro Sequence
  public hasSeenIntro: boolean = false;

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
    this.confirmGnoseReset = true;
    this.autoFollowersEnabled = true;
    this.autoFervorEnabled = true;
    this.autoRelicsEnabled = true;
    this.gnoseAutoAccumulatorSec = 0;

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
      gnoseResets: this.gnoseResets
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

  public getGnoseFollowersSynergyMultiplier(): number {
    return calculateGnoseFollowersSynergyMultiplier(
      this.getTotalFollowersCount(),
      this.hasGnoseUpgrade('gn_followers_syn'),
      this.hasGnoseUpgrade('gn_followers_cubic')
    );
  }

  public getIncarnationStageCost(stageObj: IncarnationStage): number {
    if (stageObj.stage >= 4 && this.hasGnoseUpgrade('gn_apotheosis')) {
      return stageObj.cost / 100000;
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

  public getRelicsBonusMultiplier(): number {
    const fuRelics = this.fervorUpgrades.find((u) => u.id === 'fu_relics');
    let mult = 1.0;
    if (fuRelics && fuRelics.level > 0) {
      mult = getFervorUpgradeMultiplier(fuRelics);
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
      globalBuff *= 5.0;
    }
    if (this.hasGnoseUpgrade('gn_apotheosis')) {
      globalBuff *= 100.0;
    }
    if (this.hasGnoseUpgrade('gn_dilatacao')) {
      globalBuff *= 2.0;
    }
    if (this.hasGnoseUpgrade('gn_relic_resonance')) {
      const activeRelics = this.relicUpgrades.filter((r) => r.level > 0).length;
      globalBuff *= (1 + activeRelics * 0.5);
    }
    globalBuff *= this.getTotalGnosePassiveMultiplier();
    globalBuff *= this.getGnoseFollowersSynergyMultiplier();

    const fervorClickMult = getFervorUpgradeMultiplier(this.fervorUpgrades[2]);
    const fervorEffectMult = getFervorUpgradeMultiplier(this.fervorUpgrades[1]);
    const fervorFaithBonus = calculateFervorFaithBonus(this.fervorPoints, fervorEffectMult);

    let fpc = calculateFaithPerClick(clickBuff, globalBuff, fervorClickMult, fervorFaithBonus);
    if (this.hasGnoseUpgrade('gn_click_power')) {
      fpc *= 10.0;
    }
    if (this.hasGnoseUpgrade('gn_dilatacao')) {
      fpc *= 2.0;
    }

    return fpc;
  }

  public getFaithPerSecond(): number {
    const fervorFollowersMult = getFervorUpgradeMultiplier(this.fervorUpgrades[3], this.getTotalFollowersCount());
    const incFollowerMult = this.getEffectiveIncarnationFollowerMultiplier();
    const passiveBuff = calculatePassiveBuffMultiplier(this.achievements);
    let globalBuff = calculateGlobalBuffMultiplier(this.achievements);
    if (this.hasGnoseUpgrade('gn_init_faith')) {
      globalBuff *= 5.0;
    }
    if (this.hasGnoseUpgrade('gn_apotheosis')) {
      globalBuff *= 100.0;
    }
    if (this.hasGnoseUpgrade('gn_dilatacao')) {
      globalBuff *= 2.0;
    }
    if (this.hasGnoseUpgrade('gn_relic_resonance')) {
      const activeRelics = this.relicUpgrades.filter((r) => r.level > 0).length;
      globalBuff *= (1 + activeRelics * 0.5);
    }
    globalBuff *= this.getTotalGnosePassiveMultiplier();
    globalBuff *= this.getGnoseFollowersSynergyMultiplier();

    const fervorEffectMult = getFervorUpgradeMultiplier(this.fervorUpgrades[1]);
    const fervorFaithBonus = calculateFervorFaithBonus(this.fervorPoints, fervorEffectMult);

    const cornucopiaMult = 1 + (this.relicUpgrades[0].level * 0.20);
    const arkMult = calculateRelicFaithMultiplier(this.relicPoints, this.relicUpgrades[5].level);
    const relicFaithMult = cornucopiaMult * arkMult;
    const isBoostActive =
      this.incarnationBoostTimer > 0 || (this.hasGnoseUpgrade('gn_bencao_eterna') && this.isIncarnationUnlocked());
    const incarnationBoostMult = isBoostActive ? 2.0 : 1.0;

    return calculateFaithPerSecond(
      this.followers,
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

    let prodMult = getFervorUpgradeMultiplier(this.fervorUpgrades[0], 0, 0, this.isFu1Boosted());
    const torchMult = 1 + (this.relicUpgrades[1].level * 0.20);
    prodMult *= torchMult;
    prodMult *= this.getIncarnationStageMultiplier();
    if (this.hasGnoseUpgrade('gn_init_fervor')) {
      prodMult *= 5.0;
    }
    if (this.hasGnoseUpgrade('gn_dilatacao')) {
      prodMult *= 2.0;
    }
    if (this.hasGnoseUpgrade('gn_altar_resonance')) {
      prodMult *= this.getEffectiveIncarnationFollowerMultiplier();
    }
    if (this.hasGnoseUpgrade('gn_relic_resonance')) {
      const activeRelics = this.relicUpgrades.filter((r) => r.level > 0).length;
      prodMult *= (1 + activeRelics * 0.5);
    }
    if (this.hasGnoseUpgrade('gn_apotheosis')) {
      prodMult *= 100.0;
    }
    prodMult *= this.getTotalGnosePassiveMultiplier();

    let synergyMult = getFervorUpgradeMultiplier(this.fervorUpgrades[4], 0, this.faithPoints);
    if (this.relicUpgrades[2].level >= 1) {
      synergyMult *= 1.5;
    }
    if (this.hasGnoseUpgrade('gn_synergy_boost')) {
      synergyMult *= 5.0;
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
      autoGen += toGet * 1.0;
    }
    return Math.max(1.0, extraPerSec) + autoGen;
  }

  // --- Game Loop Tick Logic ---
  public tick(deltaSec: number): { faithGained: number; fervorGained: number; relicGained: number } {
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

    // Gnose Tier 4 Automation (runs once per second)
    this.gnoseAutoAccumulatorSec += deltaSec;
    if (this.gnoseAutoAccumulatorSec >= 1.0) {
      this.gnoseAutoAccumulatorSec %= 1.0;
      this.runGnoseAutomation();
    }

    return { faithGained, fervorGained, relicGained };
  }

  public runGnoseAutomation(): void {
    // 1. Auto-recruit Followers without spending Fé
    if (this.hasGnoseUpgrade('gn_auto_followers') && this.autoFollowersEnabled) {
      const devotee = this.followers[0];
      if (devotee) {
        const discount = calculateCostDiscountMultiplier(this.achievements);
        const mult = this.getDevoteeBaseMultiplier();
        const { count } = calculateMaxAffordableFollowers(devotee, this.faithPoints, discount, mult);
        if (count > 0) {
          devotee.count += count;
        }
      }
    }

    // 2. Auto-upgrade Ritos de Fervor without spending Fervor
    if (this.hasGnoseUpgrade('gn_auto_fervor') && this.autoFervorEnabled && this.isFervorUpgradesUnlocked()) {
      for (const upg of this.fervorUpgrades) {
        if (upg.id === 'fu_relics' && !this.isPhoenixRelicUnlocked()) {
          continue;
        }
        let steps = 0;
        while (this.fervorPoints >= calculateFervorUpgradeCost(upg) && steps < 50) {
          upg.level += 1;
          steps += 1;
        }
      }
    }
  }

  // --- Click & Actions ---
  public addClick(): { fpc: number; isCrit: boolean } {
    const fpc = this.getFaithPerClick();
    this.faithPoints += fpc;
    this.totalFaithAccumulated += fpc;
    this.totalClicks += 1;
    return { fpc, isCrit: false };
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

    if (upg.id === 'gn_memoria_selos') {
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
    if (!this.isGnoseUnlocked() || toGet <= 0) {
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
        confirmReset: this.confirmGnoseReset,
        autoFollowersEnabled: this.autoFollowersEnabled,
        autoFervorEnabled: this.autoFervorEnabled,
        autoRelicsEnabled: this.autoRelicsEnabled
      }
    };
  }

  public applySaveData(save: SaveData): void {
    if (!save || !save.stats) return;

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

    // Saves antigos geravam relíquias antes do desbloqueio; descarta esse saldo indevido
    if (!this.isRelicsUnlocked()) {
      this.relicPoints = 0;
      this.bestRelicsToGet = 0;
    }

    if (Array.isArray(save.achievements)) {
      this.achievements.forEach((a) => {
        a.unlocked = save.achievements.includes(a.id);
      });
    }

    // Restore Gnose data if present
    if (save.gnose) {
      this.gnosePoints = typeof save.gnose.gnosePoints === 'number' ? Math.max(0, save.gnose.gnosePoints) : 0;
      this.totalGnoseEarned = typeof save.gnose.totalGnoseEarned === 'number' ? Math.max(0, save.gnose.totalGnoseEarned) : 0;
      this.gnoseResets = typeof save.gnose.gnoseResets === 'number' ? Math.max(0, save.gnose.gnoseResets) : 0;
      if (Array.isArray(save.gnose.unlockedUpgrades)) {
        this.unlockedGnoseUpgrades = new Set(save.gnose.unlockedUpgrades);
      } else {
        this.unlockedGnoseUpgrades.clear();
      }
      this.confirmGnoseReset = typeof save.gnose.confirmReset === 'boolean' ? save.gnose.confirmReset : true;
      this.autoFollowersEnabled = typeof save.gnose.autoFollowersEnabled === 'boolean' ? save.gnose.autoFollowersEnabled : true;
      this.autoFervorEnabled = typeof save.gnose.autoFervorEnabled === 'boolean' ? save.gnose.autoFervorEnabled : true;
      this.autoRelicsEnabled = typeof save.gnose.autoRelicsEnabled === 'boolean' ? save.gnose.autoRelicsEnabled : true;
    } else {
      this.gnosePoints = 0;
      this.totalGnoseEarned = 0;
      this.gnoseResets = 0;
      this.unlockedGnoseUpgrades.clear();
      this.confirmGnoseReset = true;
      this.autoFollowersEnabled = true;
      this.autoFervorEnabled = true;
      this.autoRelicsEnabled = true;
    }
  }
}
