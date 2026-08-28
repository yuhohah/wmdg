import { UpgradeConfig, UpgradeState, ResourceId } from './types';
import { EventEmitter } from './EventEmitter';
import { GameEventMap } from './types';
import { ResourceManager } from './ResourceManager';

export const DEFAULT_UPGRADES: UpgradeConfig[] = [
  {
    id: 'fiel',
    name: 'Fiéis',
    description: 'Devotos que oram continuamente, gerando Fé para a Entidade.',
    baseCost: 15,
    costMultiplier: 1.15,
    baseOutput: 1, // 1 PF/s base por fiel
    icon: '/assets/icons/icon_flame.png',
    targetResource: 'faith',
    consumesResource: 'faith',
    unlockCost: 0
  },
  {
    id: 'templo',
    name: 'Templos',
    description: 'Monumentos grandiosos que multiplicam o ganho por segundo dos fiéis.',
    baseCost: 2500,
    costMultiplier: 1.5,
    baseOutput: 0, // Apenas os fiéis geram Fé por segundo; templos multiplicam esse ganho
    multiplierPerItem: 1.0, // +100% por templo (+1x multiplicador por templo)
    icon: '/assets/icons/icon_cathedral.png',
    targetResource: 'faith',
    consumesResource: 'faith',
    unlockCost: 0,
    unlockFielCount: 100 // Desbloqueia exatamente ao adquirir 100 fiéis
  }
];

export class UpgradeManager {
  private configs: Map<string, UpgradeConfig> = new Map();
  private states: Map<string, UpgradeState> = new Map();
  private events: EventEmitter<GameEventMap>;
  private resourceManager: ResourceManager;

  constructor(
    events: EventEmitter<GameEventMap>,
    resourceManager: ResourceManager,
    initialStates?: Record<string, UpgradeState>,
    customConfigs?: UpgradeConfig[]
  ) {
    this.events = events;
    this.resourceManager = resourceManager;

    const list = customConfigs || DEFAULT_UPGRADES;
    list.forEach(cfg => this.configs.set(cfg.id, cfg));

    list.forEach(cfg => {
      const saved = initialStates ? initialStates[cfg.id] : undefined;
      this.states.set(cfg.id, saved ? { ...saved } : {
        id: cfg.id,
        count: 0,
        unlocked: cfg.unlockCost === 0 && (cfg.unlockFielCount === undefined || cfg.unlockFielCount === 0)
      });
    });
  }

  public getConfigs(): UpgradeConfig[] {
    return Array.from(this.configs.values());
  }

  public getConfig(id: string): UpgradeConfig | undefined {
    return this.configs.get(id);
  }

  public getState(id: string): UpgradeState | undefined {
    const s = this.states.get(id);
    return s ? { ...s } : undefined;
  }

  public getAllStates(): Record<string, UpgradeState> {
    const result: Record<string, UpgradeState> = {};
    this.states.forEach((val, key) => {
      result[key] = { ...val };
    });
    return result;
  }

  /**
   * Cost formula: BaseCost * (CostMultiplier ^ currentCount)
   */
  public getUpgradeCost(id: string, countToBuy: number = 1): number {
    const config = this.configs.get(id);
    const state = this.states.get(id);
    if (!config || !state || countToBuy <= 0) return Infinity;

    const base = config.baseCost;
    const r = config.costMultiplier;
    const l = state.count;

    if (countToBuy === 1) {
      return Math.floor(base * Math.pow(r, l));
    }

    // Geometric series sum: Base * (r^l * (r^k - 1) / (r - 1))
    const totalCost = base * (Math.pow(r, l) * (Math.pow(r, countToBuy) - 1)) / (r - 1);
    return Math.floor(totalCost);
  }

  /**
   * Calculates maximum quantity of items affordable with current balance
   */
  public getMaxAffordable(id: string): { count: number; cost: number } {
    const config = this.configs.get(id);
    const state = this.states.get(id);
    if (!config || !state) return { count: 0, cost: 0 };

    const balance = this.resourceManager.getResource(config.consumesResource).amount;
    const base = config.baseCost;
    const r = config.costMultiplier;
    const l = state.count;

    const singleCost = Math.floor(base * Math.pow(r, l));
    if (balance < singleCost) {
      return { count: 0, cost: 0 };
    }

    // k = floor( log_r( (Balance * (r - 1) / (base * r^l)) + 1 ) )
    const numerator = balance * (r - 1);
    const denominator = base * Math.pow(r, l);
    const maxK = Math.floor(Math.log(numerator / denominator + 1) / Math.log(r));

    if (maxK <= 0) return { count: 0, cost: 0 };
    const cost = this.getUpgradeCost(id, maxK);
    return { count: maxK, cost };
  }

  /**
   * Multiplier applied to faithful production based on temple count
   * E.g. 0 temples = 1x, 1 temple = 2x (+100%), 2 temples = 3x (+200%)
   */
  public getFielMultiplier(): number {
    const temploConfig = this.configs.get('templo');
    const temploState = this.states.get('templo');
    if (!temploState || temploState.count <= 0) return 1.0;
    const multPerItem = temploConfig?.multiplierPerItem ?? 1.0;
    return 1.0 + temploState.count * multPerItem;
  }

  /**
   * Production per second for this item based on current quantity owned
   */
  public getUpgradeOutput(id: string): number {
    const config = this.configs.get(id);
    const state = this.states.get(id);
    if (!config || !state || state.count <= 0) return 0;

    if (id === 'fiel') {
      return config.baseOutput * state.count * this.getFielMultiplier();
    }

    return config.baseOutput * state.count;
  }

  /**
   * Extra adoration/click power given by click bonus items
   */
  public getTotalClickBonus(): number {
    let bonus = 0;
    this.configs.forEach(config => {
      if (config.clickMultiplier) {
        const state = this.states.get(config.id);
        if (state && state.count > 0) {
          bonus += config.clickMultiplier * state.count;
        }
      }
    });
    return bonus;
  }

  /**
   * Total automated production per second for a specific resource
   * SPECIFICATION: Apenas os fiéis geram Pontos de Fé por segundo.
   * Templos multiplicam esse ganho.
   */
  public getTotalProductionPerSecond(resourceId: ResourceId): number {
    if (resourceId !== 'faith') return 0;
    return this.getUpgradeOutput('fiel');
  }

  /**
   * Purchase quantity of items
   */
  public buyUpgrade(id: string, countToBuy: number = 1): boolean {
    const config = this.configs.get(id);
    const state = this.states.get(id);
    if (!config || !state) return false;

    const cost = this.getUpgradeCost(id, countToBuy);
    if (!this.resourceManager.spend(config.consumesResource, cost)) {
      return false;
    }

    state.count += countToBuy;
    state.unlocked = true;

    // Check unlocks immediately if faithful count reached 100
    if (id === 'fiel') {
      this.checkUnlocks({});
    }

    this.events.emit('upgrade:purchased', {
      upgradeId: id,
      newCount: state.count,
      cost
    });

    return true;
  }

  /**
   * Update unlock status based on peak faith points or faithful devotos count
   */
  public checkUnlocks(peakResources: Record<ResourceId, number>): boolean {
    let anyNewlyUnlocked = false;
    const fiesCount = this.states.get('fiel')?.count || 0;

    this.configs.forEach(cfg => {
      const state = this.states.get(cfg.id);
      if (state && !state.unlocked) {
        let shouldUnlock = false;

        // Unlock condition: 100 fiéis for temples
        if (cfg.unlockFielCount !== undefined) {
          if (fiesCount >= cfg.unlockFielCount) {
            shouldUnlock = true;
          }
        } else if (cfg.unlockCost > 0) {
          const peak = peakResources[cfg.consumesResource] || 0;
          if (peak >= cfg.unlockCost) {
            shouldUnlock = true;
          }
        }

        if (shouldUnlock) {
          state.unlocked = true;
          anyNewlyUnlocked = true;
        }
      }
    });
    return anyNewlyUnlocked;
  }
}
