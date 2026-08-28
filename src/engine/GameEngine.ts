import { GameState, ResourceId, GameEventMap, OfflineEarningsReport } from './types';
import { EventEmitter } from './EventEmitter';
import { GameLoop } from './GameLoop';
import { ResourceManager } from './ResourceManager';
import { UpgradeManager } from './UpgradeManager';
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
    const incomeThisTick: Record<ResourceId, number> = {};

    if (faithPerSec > 0) {
      const faithGained = faithPerSec * dt;
      this.resources.add('faith', faithGained, false);
      incomeThisTick['faith'] = faithGained;
    }

    // 3. Unlock progression check
    const allRes = this.resources.getAllResources();
    const peakMap: Record<ResourceId, number> = {
      faith: allRes.faith?.peakAmount || 0,
      gems: allRes.gems?.peakAmount || 0
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
   * Calculate manual click / adoration power (Base 1 + bonus from upgrades) * global multiplier
   */
  public getClickPower(): number {
    const baseClick = 1;
    const upgradeBonus = this.upgrades.getTotalClickBonus();
    return Math.floor((baseClick + upgradeBonus) * this.multipliers.globalClick);
  }

  /**
   * Get production rate per second for faith
   */
  public getIncomePerSecond(id: ResourceId = 'faith'): number {
    const base = this.upgrades.getTotalProductionPerSecond(id);
    return base * this.multipliers.globalProduction;
  }

  /**
   * Purchase quantity of items
   */
  public buyUpgrade(id: string, count: number = 1): boolean {
    const success = this.upgrades.buyUpgrade(id, count);
    if (success) {
      // Re-check unlocks immediately if faithful were bought
      if (id === 'fiel') {
        const peakMap: Record<ResourceId, number> = {
          faith: this.resources.getResource('faith').peakAmount
        };
        this.upgrades.checkUnlocks(peakMap);
      }
    }
    return success;
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
   * Multiplier applied to faithful production
   */
  public getTempleMultiplier(): number {
    return this.upgrades.getFielMultiplier();
  }

  /**
   * Checks if temples action card is unlocked (>= 100 fiéis)
   */
  public isTemplesUnlocked(): boolean {
    const temploState = this.upgrades.getState('templo');
    return (temploState?.unlocked ?? false) || this.getFiesCount() >= 100;
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
   * Reset game progress
   */
  public resetGame(): void {
    SaveSystem.clear();
    const defaults = SaveSystem.getDefaultState();
    this.stats = defaults.stats;
    this.multipliers = defaults.multipliers;

    // Reset resources
    Object.keys(this.resources.getAllResources()).forEach(k => {
      this.resources.set(k as ResourceId, 0);
    });

    // Reset upgrades
    this.upgrades.getConfigs().forEach(cfg => {
      const state = this.upgrades.getState(cfg.id);
      if (state) {
        state.count = 0;
        state.unlocked = cfg.unlockCost === 0 && (cfg.unlockFielCount === undefined || cfg.unlockFielCount === 0);
      }
    });

    this.save();
    this.events.emit('game:reset', undefined);
  }

  /**
   * Get complete game state snapshot
   */
  public getState(): GameState {
    return {
      version: 2,
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
