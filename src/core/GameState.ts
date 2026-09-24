import type {
  BuyableItem,
  FervorUpgrade,
  Achievement,
  MechanicUnlock,
  RelicUpgrade,
  GameState as GameStateSnapshot
} from '../types.js';
import { initialFollowers } from '../config/followers.js';
import { initialFervorUpgrades, BASE_FERVOR_RATE, getFervorUpgradeMultiplier } from '../config/fervor.js';
import { initialAchievements } from '../config/achievements.js';
import { initialUnlocks } from '../config/unlocks.js';
import { initialRelicUpgrades } from '../config/relics.js';
import { INCARNATION_STAGES } from '../config/incarnation.js';
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
  calculateRelicFaithMultiplier
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
  public readonly MAX_INCARNATION_BOOST: number = 60;

  // Relics (Prestige) State
  public relicPoints: number = 0;
  public bestRelicsToGet: number = 0;
  public relicConvertCooldown: number = 0;

  // 6 Sphere Satellite Nodes State
  public sphereSatellitesUnlocked: boolean[] = [false, false, false, false, false, false];

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
    this.sphereSatellitesUnlocked = [false, false, false, false, false, false];

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
      totalRelics: this.bestRelicsToGet
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
    const globalBuff = calculateGlobalBuffMultiplier(this.achievements);
    const fervorClickMult = getFervorUpgradeMultiplier(this.fervorUpgrades[2]);
    const fervorEffectMult = getFervorUpgradeMultiplier(this.fervorUpgrades[1]);
    const fervorFaithBonus = calculateFervorFaithBonus(this.fervorPoints, fervorEffectMult);

    return calculateFaithPerClick(clickBuff, globalBuff, fervorClickMult, fervorFaithBonus);
  }

  public getFaithPerSecond(): number {
    const fervorFollowersMult = getFervorUpgradeMultiplier(this.fervorUpgrades[3], this.getTotalFollowersCount());
    const incFollowerMult = calculateIncarnationFollowerMultiplier(this.fervorPoints, this.incarnationStage);
    const passiveBuff = calculatePassiveBuffMultiplier(this.achievements);
    const globalBuff = calculateGlobalBuffMultiplier(this.achievements);
    const fervorEffectMult = getFervorUpgradeMultiplier(this.fervorUpgrades[1]);
    const fervorFaithBonus = calculateFervorFaithBonus(this.fervorPoints, fervorEffectMult);

    const cornucopiaMult = 1 + (this.relicUpgrades[0].level * 0.20);
    const arkMult = calculateRelicFaithMultiplier(this.relicPoints, this.relicUpgrades[5].level);
    const relicFaithMult = cornucopiaMult * arkMult;
    const incarnationBoostMult = this.incarnationBoostTimer > 0 ? 2.0 : 1.0;

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

    let prodMult = getFervorUpgradeMultiplier(this.fervorUpgrades[0]);
    const torchMult = 1 + (this.relicUpgrades[1].level * 0.20);
    prodMult *= torchMult;

    let synergyMult = getFervorUpgradeMultiplier(this.fervorUpgrades[4], 0, this.faithPoints);
    if (this.relicUpgrades[2].level >= 1) {
      synergyMult *= 1.5;
    }

    return calculateFervorRate(BASE_FERVOR_RATE, prodMult, synergyMult);
  }

  public getRelicsRatePerSecond(): number {
    const extraPerSec = calculateExtraRelicsPerSecond(this.bestRelicsToGet);
    let autoGen = 0;
    if (this.relicUpgrades[4]?.level >= 1) {
      const toGet = calculateRelicsToGet(this.faithPoints);
      autoGen = toGet * 0.05;
    }
    return Math.max(1.0, extraPerSec) + autoGen;
  }

  // --- Game Loop Tick Logic ---
  public tick(deltaSec: number): { faithGained: number; fervorGained: number; relicGained: number } {
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

    if (this.incarnationBoostTimer > 0) {
      this.incarnationBoostTimer = Math.max(0, this.incarnationBoostTimer - deltaSec);
    }

    return { faithGained, fervorGained, relicGained };
  }

  // --- Click & Actions ---
  public addClick(): number {
    const fpc = this.getFaithPerClick();
    this.faithPoints += fpc;
    this.totalFaithAccumulated += fpc;
    this.totalClicks += 1;
    return fpc;
  }

  public addIncarnationBoost(seconds: number = 2): void {
    this.incarnationBoostTimer = Math.min(this.MAX_INCARNATION_BOOST, this.incarnationBoostTimer + seconds);
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
    if (!item || this.getTotalFollowersCount() < 25) {
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
    if (this.faithPoints >= nextStage.cost) {
      this.faithPoints -= nextStage.cost;
      this.incarnationStage += 1;
      return true;
    }
    return false;
  }

  public buyFervorUpgrade(upg: FervorUpgrade): boolean {
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
    const toGet = calculateRelicsToGet(this.faithPoints);
    if (this.relicConvertCooldown > 0 || toGet <= 0) {
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

  public unlockSphereSatellite(index: number): void {
    if (index >= 0 && index < 6) {
      this.sphereSatellitesUnlocked[index] = true;
    }
  }

  public lockSphereSatellite(index: number): void {
    if (index >= 0 && index < 6) {
      this.sphereSatellitesUnlocked[index] = false;
    }
  }

  public isSphereSatelliteUnlocked(index: number): boolean {
    return !!this.sphereSatellitesUnlocked[index];
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
        incarnationBoostTimer: this.incarnationBoostTimer
      },
      followers: this.followers.map((f) => ({ id: f.id, count: f.count })),
      fervorUpgrades: this.fervorUpgrades.map((u) => ({ id: u.id, level: u.level })),
      relicUpgrades: this.relicUpgrades.map((r) => ({ id: r.id, level: r.level })),
      unlocks: this.unlocks.filter((u) => u.unlocked).map((u) => u.id),
      achievements: this.achievements.filter((a) => a.unlocked).map((a) => a.id),
      sphereSatellites: [...this.sphereSatellitesUnlocked]
    };
  }

  public applySaveData(save: SaveData): void {
    if (!save || !save.stats) return;

    this.faithPoints = typeof save.stats.faithPoints === 'number' ? Math.max(0, save.stats.faithPoints) : 1;
    this.totalFaithAccumulated = typeof save.stats.totalFaithAccumulated === 'number' ? Math.max(1, save.stats.totalFaithAccumulated) : 1;
    this.totalClicks = typeof save.stats.totalClicks === 'number' ? Math.max(0, save.stats.totalClicks) : 0;
    this.fervorPoints = typeof save.stats.fervorPoints === 'number' ? Math.max(0, save.stats.fervorPoints) : 0;
    this.incarnationStage = typeof save.stats.incarnationStage === 'number' ? Math.max(1, save.stats.incarnationStage) : 1;
    this.relicPoints = typeof save.stats.relicPoints === 'number' ? Math.max(0, save.stats.relicPoints) : 0;
    this.bestRelicsToGet = typeof save.stats.bestRelicsToGet === 'number' ? Math.max(0, save.stats.bestRelicsToGet) : 0;
    this.incarnationBoostTimer = typeof save.stats.incarnationBoostTimer === 'number'
      ? Math.max(0, Math.min(this.MAX_INCARNATION_BOOST, save.stats.incarnationBoostTimer))
      : 0;

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

    if (Array.isArray(save.achievements)) {
      this.achievements.forEach((a) => {
        a.unlocked = save.achievements.includes(a.id);
      });
    }

    if (Array.isArray(save.sphereSatellites)) {
      for (let i = 0; i < 6; i++) {
        this.sphereSatellitesUnlocked[i] = !!save.sphereSatellites[i];
      }
    } else {
      this.sphereSatellitesUnlocked = [false, false, false, false, false, false];
    }
  }
}
