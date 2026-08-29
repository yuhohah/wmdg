import { GameState, ResourceId, GameEventMap, OfflineEarningsReport } from './types';
import { EventEmitter } from './EventEmitter';
import { GameLoop } from './GameLoop';
import { ResourceManager } from './ResourceManager';
import { UpgradeManager, MonumentConfig } from './UpgradeManager';
import { SaveSystem } from './SaveSystem';
import { OfflineProgressCalculator } from './OfflineProgress';

export class GameEngine {
  public readonly events: EventEmitter<GameEventMap>;
  public readonly resources: ResourceManager;
  public readonly upgrades: UpgradeManager;
  private readonly loop: GameLoop;
  private autoSaveTimer: number = 0;
  private readonly autoSaveIntervalMs: number = 5000;
  private offlineReport: OfflineEarningsReport | null = null;
  private stats: GameState['stats'];
  private multipliers: GameState['multipliers'];

  constructor() {
    this.events = new EventEmitter<GameEventMap>();

    // 1. Load saved state or default
    const savedState = SaveSystem.load();
    this.stats = savedState.stats;
    this.multipliers = savedState.multipliers;

    // 2. Initialize sub-systems
    this.resources = new ResourceManager(this.events, savedState.resources);
    this.upgrades = new UpgradeManager(this.events, this.resources, savedState.upgrades);

    // 3. Check for offline progress
    this.offlineReport = OfflineProgressCalculator.calculate(
      this.stats.lastSaveTimestamp,
      this.upgrades
    );

    // 4. Initialize Game Loop
    this.loop = new GameLoop(this.onTick.bind(this));

    // 5. Setup beforeunload save
    window.addEventListener('beforeunload', () => {
      this.save();
    });
  }

  public start(): void {
    this.loop.start();

    // Auto-save interval
    this.autoSaveTimer = window.setInterval(() => {
      this.save();
    }, this.autoSaveIntervalMs);

    // If offline earnings occurred, emit report
    if (this.offlineReport && Object.keys(this.offlineReport.gains).length > 0) {
      setTimeout(() => {
        if (this.offlineReport) {
          this.events.emit('offline:collected', this.offlineReport);
        }
      }, 300);
    }
  }

  public stop(): void {
    this.loop.stop();
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    this.save();
  }

  /**
   * Main simulation tick invoked by RAF
   */
  private onTick(dt: number): void {
    // 1. Update play time stats
    this.stats.playTimeSeconds += dt;

    // 2. Automated resource generation
    const faithPerSec = this.getIncomePerSecond('faith');
    const goldPerSec = this.getIncomePerSecond('gold');
    const incomeThisTick: Record<ResourceId, number> = {};

    if (faithPerSec > 0) {
      const faithGained = faithPerSec * dt;
      this.resources.add('faith', faithGained, false);
      incomeThisTick['faith'] = faithGained;
    }

    if (goldPerSec > 0) {
      const goldGained = goldPerSec * dt;
      this.resources.add('gold', goldGained, false);
      incomeThisTick['gold'] = goldGained;
    }

    // 3. Unlock progression check
    const allRes = this.resources.getAllResources();
    const peakMap: Record<ResourceId, number> = {
      faith: allRes.faith?.peakAmount || 0,
      gold: allRes.gold?.peakAmount || 0
    };
    this.upgrades.checkUnlocks(peakMap);

    // 4. Broadcast tick to view
    this.events.emit('tick', {
      dt,
      totalIncome: incomeThisTick
    });
  }

  /**
   * Manual player adoration / click interaction on the Entity
   */
  public clickResource(id: ResourceId = 'faith', screenX?: number, screenY?: number): number {
    const clickPower = this.getClickPower();
    this.resources.add(id, clickPower, true);

    this.stats.totalClicks += 1;
    this.stats.manualFaithEarned += clickPower;

    this.events.emit('click:produced', {
      resourceId: id,
      amount: clickPower,
      screenX,
      screenY
    });

    return clickPower;
  }

  /**
   * Calculate manual click power (Base 1 * temple click multiplier * monument click multiplier)
   */
  public getClickPower(): number {
    const baseClick = 1;
    const templeClickMult = this.upgrades.getTempleClickMultiplier();
    const monumentClickMult = this.upgrades.getMonumentClickMultiplier();
    return Math.max(1, Math.round(baseClick * templeClickMult * monumentClickMult * this.multipliers.globalClick));
  }

  /**
   * Get production rate per second for faith or gold
   */
  public getIncomePerSecond(id: ResourceId = 'faith'): number {
    const faithAmount = this.resources.getResource('faith').amount;
    const base = this.upgrades.getTotalProductionPerSecond(id, faithAmount);
    return base * this.multipliers.globalProduction;
  }

  /**
   * Purchase quantity of items
   */
  public buyUpgrade(id: string, count: number = 1): boolean {
    const success = this.upgrades.buyUpgrade(id, count);
    if (success) {
      this.save();
    }
    return success;
  }

  /**
   * Convert a single faithful devotee
   */
  public convertFiel(): boolean {
    return this.buyUpgrade('fiel', 1);
  }

  /**
   * Convert maximum affordable faithful devotees
   */
  public convertMaxFiel(): { count: number; cost: number } {
    const max = this.upgrades.getMaxAffordable('fiel');
    if (max.count > 0) {
      this.buyUpgrade('fiel', max.count);
    }
    return max;
  }

  /**
   * Get maximum affordable count and cost for faithful
   */
  public getMaxAffordableFiel(): { count: number; cost: number } {
    return this.upgrades.getMaxAffordable('fiel');
  }

  /**
   * Check if player can afford a sacred temple (costs 30 fiéis)
   */
  public canAffordTemple(): boolean {
    return this.upgrades.canAffordTemple();
  }

  /**
   * Check if sacred temple was already built (one-time purchase)
   */
  public isTempleBuilt(): boolean {
    return this.upgrades.isTempleBuilt();
  }

  /**
   * Buy sacred temple (deducts 30 fiéis, one-time cost)
   */
  public buyTemple(): boolean {
    return this.upgrades.buyTemple();
  }

  /**
   * Buy temple upgrade with gold
   */
  public buyTempleUpgrade(upgradeId: string): boolean {
    return this.upgrades.buyUpgrade(upgradeId, 1);
  }

  /**
   * Temple enhancement with Faith (PF): 10 levels
   */
  public getTempleEnhancementLevel(): number {
    return this.upgrades.getTempleEnhancementLevel();
  }

  public getTempleEnhancementCost(): number {
    return this.upgrades.getTempleEnhancementCost();
  }

  public canUpgradeTempleWithFaith(): boolean {
    return this.upgrades.canUpgradeTempleWithFaith();
  }

  public upgradeTempleWithFaith(): boolean {
    return this.upgrades.upgradeTempleWithFaith();
  }

  /**
   * Monument System (7 mythical monuments)
   */
  public isMonumentsUnlocked(): boolean {
    return this.upgrades.isMonumentsUnlocked();
  }

  public getMonumentsCount(): number {
    return this.upgrades.getMonumentsCount();
  }

  public getNextMonument(): MonumentConfig | undefined {
    return this.upgrades.getNextMonument();
  }

  public getNextMonumentCost(): number {
    return this.upgrades.getNextMonumentCost();
  }

  public canAffordNextMonument(): boolean {
    return this.upgrades.canAffordNextMonument();
  }

  public buyNextMonument(): boolean {
    return this.upgrades.buyNextMonument();
  }

  /**
   * Count of faithful devotees
   */
  public getFiesCount(): number {
    return this.upgrades.getState('fiel')?.count || 0;
  }

  /**
   * Count of temples built
   */
  public getTemplosCount(): number {
    return this.upgrades.getState('templo')?.count || 0;
  }

  /**
   * Multipliers for temple upgrades
   */
  public getTempleClickMultiplier(): number {
    return this.upgrades.getTempleClickMultiplier();
  }

  public getTempleFielMultiplier(): number {
    return this.upgrades.getTempleFielMultiplier();
  }

  public getTempleGoldFaithMultiplier(): number {
    return this.upgrades.getTempleGoldFaithMultiplier();
  }

  /**
   * Checks if temples action card is unlocked (>= 30 fiéis)
   */
  public isTemplesUnlocked(): boolean {
    const temploState = this.upgrades.getState('templo');
    return (temploState?.unlocked ?? false) || this.getFiesCount() >= 30;
  }

  /**
   * Time acceleration scale (1x to 10x)
   */
  public setTimeScale(scale: number): void {
    this.loop.setTimeScale(scale);
  }

  public getTimeScale(): number {
    return this.loop.getTimeScale();
  }

  /**
   * Claim offline earnings
   */
  public claimOfflineEarnings(): void {
    if (!this.offlineReport) return;
    Object.entries(this.offlineReport.gains).forEach(([resId, amount]) => {
      this.resources.add(resId as ResourceId, amount, false);
    });
    this.offlineReport = null;
    this.save();
  }

  /**
   * Save current state snapshot to storage
   */
  public save(): boolean {
    const state = this.getState();
    const success = SaveSystem.save(state);
    if (success) {
      this.events.emit('game:saved', { timestamp: state.stats.lastSaveTimestamp });
    }
    return success;
  }

  /**
   * Reset game progress (completely wipe everything to 0)
   */
  public resetGame(): void {
    SaveSystem.clear();
    const defaults = SaveSystem.getDefaultState();
    this.stats = defaults.stats;
    this.multipliers = defaults.multipliers;

    // Reset resources completely (amounts, peak, totals)
    this.resources.resetAll();

    // Reset upgrades completely
    this.upgrades.resetAll();

    this.save();
    this.events.emit('game:reset', undefined);
  }

  /**
   * Get complete game state snapshot
   */
  public getState(): GameState {
    return {
      version: 3,
      resources: this.resources.getAllResources(),
      upgrades: this.upgrades.getAllStates(),
      stats: {
        ...this.stats,
        lastSaveTimestamp: Date.now()
      },
      multipliers: { ...this.multipliers }
    };
  }
}
