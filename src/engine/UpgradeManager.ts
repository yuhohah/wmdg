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
    name: 'Templo Sagrado',
    description: 'Monumento sagrado que gera Ouro e canaliza bênçãos divinas.',
    baseCost: 30, // Custa 30 fiéis
    costMultiplier: 1.0,
    baseOutput: 1, // 1 Ouro/s base por templo
    icon: '/assets/icons/icon_cathedral.png',
    targetResource: 'gold',
    consumesResource: 'faith',
    unlockCost: 0,
    unlockFielCount: 30 // Desbloqueia ao atingir 30 fiéis
  },
  {
    id: 'temple_click',
    name: 'Prece Dourada',
    description: 'Aumenta a Fé gerada por clique na Entidade.',
    baseCost: 10,
    costMultiplier: 1.45,
    baseOutput: 0,
    baseMultiplier: 1.00,
    multiplierIncreasePerLevel: 0.50, // 1.00x base, +0.50x por nível (1.00x, 1.50x, 2.00x...)
    icon: '/assets/icons/icon_star.png',
    targetResource: 'faith',
    consumesResource: 'gold',
    unlockCost: 0
  },
  {
    id: 'temple_fiel',
    name: 'Glória aos Devotos',
    description: 'Aumenta a produção de Fé por segundo de todos os fiéis.',
    baseCost: 15,
    costMultiplier: 1.45,
    baseOutput: 0,
    baseMultiplier: 1.00,
    multiplierIncreasePerLevel: 0.25, // 1.00x base, +0.25x por nível (1.00x, 1.25x, 1.50x...)
    icon: '/assets/icons/icon_flame.png',
    targetResource: 'faith',
    consumesResource: 'gold',
    unlockCost: 0
  },
  {
    id: 'temple_gold_faith',
    name: 'Alquimia Espiritual',
    description: 'Faz com que seus Pontos de Fé aumentem o Ouro gerado por segundo.',
    baseCost: 25,
    costMultiplier: 1.50,
    baseOutput: 0,
    baseMultiplier: 1.00,
    multiplierIncreasePerLevel: 0.50, // 1.00x base, +0.50x por nível (1.00x, 1.50x, 2.00x...)
    icon: '/assets/icons/icon_shrine.png',
    targetResource: 'gold',
    consumesResource: 'gold',
    unlockCost: 0
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

    // Special: Templo costs exactly 30 fiéis per unit
    if (id === 'templo') {
      return 30 * countToBuy;
    }

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

    // Special: Templo costs fiéis
    if (id === 'templo') {
      const fiesCount = this.states.get('fiel')?.count || 0;
      const maxT = Math.floor(fiesCount / 30);
      return { count: maxT, cost: maxT * 30 };
    }

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
   * Multipliers for the 3 Temple upgrades (Base 1.00x, increasing gradually)
   */
  public getTempleClickMultiplier(): number {
    const state = this.states.get('temple_click');
    const level = state?.count || 0;
    return 1.00 + (level * 0.50);
  }

  public getTempleFielMultiplier(): number {
    const state = this.states.get('temple_fiel');
    const level = state?.count || 0;
    return 1.00 + (level * 0.25);
  }

  public getTempleGoldFaithMultiplier(): number {
    const state = this.states.get('temple_gold_faith');
    const level = state?.count || 0;
    return 1.00 + (level * 0.50);
  }

  /**
   * Calculates Gold per second from temples and faith points
   */
  public getGoldProductionPerSecond(faithAmount: number = 0): number {
    const templosCount = this.states.get('templo')?.count || 0;
    if (templosCount <= 0) return 0;

    const baseGold = templosCount * 1.0;
    const faithBonusMult = this.getTempleGoldFaithMultiplier();
    // Logarithmic faith scaling: Faith points gradually boost gold generation
    const faithBonus = (Math.log10(Math.max(1, faithAmount)) * 0.25) * faithBonusMult;
    return baseGold * (1.0 + faithBonus);
  }

  /**
   * Faith production per second (Exclusively from fiéis, multiplied by temple_fiel upgrade)
   */
  public getTotalProductionPerSecond(resourceId: ResourceId, faithAmount: number = 0): number {
    if (resourceId === 'faith') {
      const fiesCount = this.states.get('fiel')?.count || 0;
      return fiesCount * 1.0 * this.getTempleFielMultiplier();
    }
    if (resourceId === 'gold') {
      return this.getGoldProductionPerSecond(faithAmount);
    }
    return 0;
  }

  /**
   * Checks if player has at least 30 fiéis to buy a temple
   */
  public canAffordTemple(): boolean {
    const fies = this.states.get('fiel')?.count || 0;
    return fies >= 30;
  }

  /**
   * Buy a temple (costs 30 fiéis)
   */
  public buyTemple(): boolean {
    const fielState = this.states.get('fiel');
    const temploState = this.states.get('templo');
    if (!fielState || !temploState) return false;

    if (fielState.count < 30) return false;

    fielState.count -= 30;
    temploState.count += 1;
    temploState.unlocked = true;

    this.events.emit('upgrade:purchased', {
      upgradeId: 'templo',
      newCount: temploState.count,
      cost: 30
    });

    return true;
  }

  /**
   * Purchase general upgrades (consumes resource)
   */
  public buyUpgrade(id: string, countToBuy: number = 1): boolean {
    if (id === 'templo') {
      return this.buyTemple();
    }

    const config = this.configs.get(id);
    const state = this.states.get(id);
    if (!config || !state) return false;

    const cost = this.getUpgradeCost(id, countToBuy);
    if (!this.resourceManager.spend(config.consumesResource, cost)) {
      return false;
    }

    state.count += countToBuy;
    state.unlocked = true;

    // Check unlocks immediately if faithful count reached 30
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
   * Check unlocks (e.g. 30 fiéis unlocks Templo Sagrado)
   */
  public checkUnlocks(peakResources: Record<ResourceId, number>): boolean {
    let anyNewlyUnlocked = false;
    const fiesCount = this.states.get('fiel')?.count || 0;

    this.configs.forEach(cfg => {
      const state = this.states.get(cfg.id);
      if (state && !state.unlocked) {
        let shouldUnlock = false;

        // Unlock condition: 30 fiéis for temples
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
