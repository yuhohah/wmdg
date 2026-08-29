import { UpgradeConfig, UpgradeState, ResourceId } from './types';
import { EventEmitter } from './EventEmitter';
import { GameEventMap } from './types';
import { ResourceManager } from './ResourceManager';

export interface MonumentConfig {
  id: number;
  name: string;
  subtitle: string;
  cost: number;
  bonusText: string;
}

export const MONUMENTS: MonumentConfig[] = [
  {
    id: 1,
    name: 'Monólito da Aurora',
    subtitle: 'Canaliza a primeira centelha de luz cósmica',
    cost: 100000,
    bonusText: '+100% Produção Global'
  },
  {
    id: 2,
    name: 'Obelisco da Eternidade',
    subtitle: 'Cristaliza a devoção no continuum temporal',
    cost: 350000,
    bonusText: '+150% Fé dos Fiéis'
  },
  {
    id: 3,
    name: 'Torre dos Céus',
    subtitle: 'Alcança as esferas astrais superiores',
    cost: 1200000,
    bonusText: '+200% Ouro dos Templos'
  },
  {
    id: 4,
    name: 'Pirâmide da Ascensão',
    subtitle: 'Focaliza a geometria sagrada do culto',
    cost: 5000000,
    bonusText: '+300% Fé por Toque'
  },
  {
    id: 5,
    name: 'Colosso da Devoção',
    subtitle: 'Uma estátua titânica de adoração pura',
    cost: 25000000,
    bonusText: '+400% Produção Global'
  },
  {
    id: 6,
    name: 'Farol Cósmico',
    subtitle: 'Guia almas e energias de galáxias distantes',
    cost: 150000000,
    bonusText: '+500% Todos os Recursos'
  },
  {
    id: 7,
    name: 'Trono Divino',
    subtitle: 'O trono supremo da Suprema Entidade',
    cost: 1000000000,
    bonusText: '+1000% Multiplicador Universal'
  }
];

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
    id: 'temple_enhancement',
    name: 'Aprimoramento do Templo',
    description: 'Aprimora a estrutura sagrada com Fé, dobrando a quantidade de ouro gerado.',
    baseCost: 10000,
    costMultiplier: 2.2,
    baseOutput: 0,
    icon: '/assets/icons/icon_cathedral.png',
    targetResource: 'gold',
    consumesResource: 'faith',
    unlockCost: 0
  },
  {
    id: 'temple_click',
    name: 'Prece Dourada',
    description: 'Aumenta a Fé gerada por clique na Entidade.',
    baseCost: 10,
    costMultiplier: 1.45,
    baseOutput: 0,
    baseMultiplier: 1.00,
    multiplierIncreasePerLevel: 0.50, // 1.00x base, +0.50x por nível
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
    multiplierIncreasePerLevel: 0.25, // 1.00x base, +0.25x por nível
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
    multiplierIncreasePerLevel: 0.50, // 1.00x base, +0.50x por nível
    icon: '/assets/icons/icon_shrine.png',
    targetResource: 'gold',
    consumesResource: 'gold',
    unlockCost: 0
  },
  {
    id: 'monument',
    name: 'Monumentos Ancestrais',
    description: '7 Grandes monumentos cósmicos que impulsionam o culto.',
    baseCost: 100000,
    costMultiplier: 3.5,
    baseOutput: 0,
    icon: '/assets/icons/icon_monument.png',
    targetResource: 'gold',
    consumesResource: 'gold',
    unlockCost: 10000 // Desbloqueado com 10.000 Ouro
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

    if (id === 'temple_enhancement') {
      return this.getTempleEnhancementCost();
    }

    if (id === 'monument') {
      return this.getNextMonumentCost();
    }

    const base = config.baseCost;
    const r = config.costMultiplier;
    const l = state.count;

    if (r === 1) {
      return base * countToBuy;
    }

    // Sum of geometric series: base * r^l * (r^k - 1) / (r - 1)
    const cost = base * Math.pow(r, l) * (Math.pow(r, countToBuy) - 1) / (r - 1);
    return Math.floor(cost);
  }

  /**
   * Maximum affordable upgrades for geometric cost series
   */
  public getMaxAffordable(id: string): { count: number; cost: number } {
    const config = this.configs.get(id);
    const state = this.states.get(id);
    if (!config || !state) return { count: 0, cost: 0 };

    const balance = this.resourceManager.getResource(config.consumesResource).amount;
    const base = config.baseCost;
    const r = config.costMultiplier;
    const l = state.count;

    if (id === 'templo') {
      const fies = this.states.get('fiel')?.count || 0;
      return fies >= 30 && state.count === 0 ? { count: 1, cost: 30 } : { count: 0, cost: 0 };
    }

    if (id === 'temple_enhancement') {
      const cost = this.getTempleEnhancementCost();
      if (this.getTempleEnhancementLevel() < 10 && balance >= cost) {
        return { count: 1, cost };
      }
      return { count: 0, cost: 0 };
    }

    if (id === 'monument') {
      const cost = this.getNextMonumentCost();
      if (this.getMonumentsCount() < 7 && balance >= cost) {
        return { count: 1, cost };
      }
      return { count: 0, cost: 0 };
    }

    if (r === 1) {
      const count = Math.floor(balance / base);
      return { count, cost: count * base };
    }

    const singleCost = Math.floor(base * Math.pow(r, l));
    if (balance < singleCost) {
      return { count: 0, cost: 0 };
    }

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
   * Temple Enhancement with Faith (PF): 10 levels, initial cost 10,000 PF
   * Multiplies base gold substantially (2^level = 1x, 2x, 4x, 8x, 16x... up to 1024x at level 10)
   */
  public getTempleEnhancementLevel(): number {
    return this.states.get('temple_enhancement')?.count || 0;
  }

  public getTempleEnhancementCost(): number {
    const level = this.getTempleEnhancementLevel();
    if (level >= 10) return Infinity;
    return Math.floor(10000 * Math.pow(2.2, level));
  }

  public canUpgradeTempleWithFaith(): boolean {
    const isBuilt = this.isTempleBuilt();
    if (!isBuilt) return false;
    const level = this.getTempleEnhancementLevel();
    if (level >= 10) return false;
    const cost = this.getTempleEnhancementCost();
    return this.resourceManager.hasAmount('faith', cost);
  }

  public upgradeTempleWithFaith(): boolean {
    if (!this.canUpgradeTempleWithFaith()) return false;
    const cost = this.getTempleEnhancementCost();
    if (!this.resourceManager.spend('faith', cost)) return false;

    const state = this.states.get('temple_enhancement');
    if (!state) return false;
    state.count += 1;

    this.events.emit('upgrade:purchased', {
      upgradeId: 'temple_enhancement',
      newCount: state.count,
      cost
    });
    return true;
  }

  /**
   * Calculates Gold per second from temples, temple enhancement, faith bonus and monuments
   */
  public getGoldProductionPerSecond(faithAmount: number = 0): number {
    const templosCount = this.states.get('templo')?.count || 0;
    if (templosCount <= 0) return 0;

    // Temple enhancement with PF: doubles base gold per level
    const enhLevel = this.getTempleEnhancementLevel();
    const enhMult = Math.pow(2, enhLevel);

    const baseGold = templosCount * 1.0 * enhMult;
    const faithBonusMult = this.getTempleGoldFaithMultiplier();
    // Logarithmic faith scaling: Faith points gradually boost gold generation
    const faithBonus = (Math.log10(Math.max(1, faithAmount)) * 0.25) * faithBonusMult;

    // Monument Gold multiplier
    const monumentMult = this.getMonumentGoldMultiplier();

    return baseGold * (1.0 + faithBonus) * monumentMult;
  }

  /**
   * Faith production per second (Exclusively from fiéis, multiplied by temple_fiel and monuments)
   */
  public getTotalProductionPerSecond(resourceId: ResourceId, faithAmount: number = 0): number {
    if (resourceId === 'faith') {
      const fiesCount = this.states.get('fiel')?.count || 0;
      const monumentMult = this.getMonumentFaithMultiplier();
      return fiesCount * 1.0 * this.getTempleFielMultiplier() * monumentMult;
    }
    if (resourceId === 'gold') {
      return this.getGoldProductionPerSecond(faithAmount);
    }
    return 0;
  }

  /**
   * Checks if player has at least 30 fiéis to buy the temple (one-time cost)
   */
  public canAffordTemple(): boolean {
    const temploCount = this.states.get('templo')?.count || 0;
    if (temploCount >= 1) return false;
    const fies = this.states.get('fiel')?.count || 0;
    return fies >= 30;
  }

  /**
   * Checks if temple was already built (one-time purchase)
   */
  public isTempleBuilt(): boolean {
    return (this.states.get('templo')?.count || 0) >= 1;
  }

  /**
   * Buy the temple (one-time cost of 30 fiéis)
   */
  public buyTemple(): boolean {
    const fielState = this.states.get('fiel');
    const temploState = this.states.get('templo');
    if (!fielState || !temploState) return false;

    // Custo único de apenas uma vez
    if (temploState.count >= 1) return false;
    if (fielState.count < 30) return false;

    fielState.count -= 30;
    temploState.count = 1;
    temploState.unlocked = true;

    this.events.emit('upgrade:purchased', {
      upgradeId: 'templo',
      newCount: 1,
      cost: 30
    });

    return true;
  }

  /**
   * Monument System: 7 mythical monuments
   * Card unlocked when player accumulates 10,000 Gold
   * Initial cost: 100,000 Gold
   */
  public isMonumentsUnlocked(): boolean {
    const state = this.states.get('monument');
    if (state?.unlocked) return true;
    const goldRes = this.resourceManager.getResource('gold');
    return (goldRes.amount >= 10000 || goldRes.peakAmount >= 10000);
  }

  public getMonumentsCount(): number {
    return this.states.get('monument')?.count || 0;
  }

  public getNextMonument(): MonumentConfig | undefined {
    const count = this.getMonumentsCount();
    if (count >= MONUMENTS.length) return undefined;
    return MONUMENTS[count];
  }

  public getNextMonumentCost(): number {
    const next = this.getNextMonument();
    return next ? next.cost : Infinity;
  }

  public canAffordNextMonument(): boolean {
    const next = this.getNextMonument();
    if (!next) return false;
    return this.resourceManager.hasAmount('gold', next.cost);
  }

  public buyNextMonument(): boolean {
    if (!this.canAffordNextMonument()) return false;
    const next = this.getNextMonument();
    if (!next) return false;

    if (!this.resourceManager.spend('gold', next.cost)) return false;

    const state = this.states.get('monument');
    if (!state) return false;
    state.count += 1;
    state.unlocked = true;

    this.events.emit('upgrade:purchased', {
      upgradeId: 'monument',
      newCount: state.count,
      cost: next.cost
    });

    return true;
  }

  public getMonumentFaithMultiplier(): number {
    const count = this.getMonumentsCount();
    let mult = 1.0;
    if (count >= 1) mult *= 2.0;
    if (count >= 2) mult *= 2.5;
    if (count >= 5) mult *= 5.0;
    if (count >= 6) mult *= 6.0;
    if (count >= 7) mult *= 11.0;
    return mult;
  }

  public getMonumentGoldMultiplier(): number {
    const count = this.getMonumentsCount();
    let mult = 1.0;
    if (count >= 1) mult *= 2.0;
    if (count >= 3) mult *= 3.0;
    if (count >= 5) mult *= 5.0;
    if (count >= 6) mult *= 6.0;
    if (count >= 7) mult *= 11.0;
    return mult;
  }

  public getMonumentClickMultiplier(): number {
    const count = this.getMonumentsCount();
    let mult = 1.0;
    if (count >= 1) mult *= 2.0;
    if (count >= 4) mult *= 4.0;
    if (count >= 5) mult *= 5.0;
    if (count >= 6) mult *= 6.0;
    if (count >= 7) mult *= 11.0;
    return mult;
  }

  /**
   * Purchase general upgrades (consumes resource)
   */
  public buyUpgrade(id: string, countToBuy: number = 1): boolean {
    if (id === 'templo') {
      return this.buyTemple();
    }
    if (id === 'temple_enhancement') {
      return this.upgradeTempleWithFaith();
    }
    if (id === 'monument') {
      return this.buyNextMonument();
    }

    const config = this.configs.get(id);
    const state = this.states.get(id);
    if (!config || !state) return false;

    const cost = this.getUpgradeCost(id, countToBuy);
    if (!this.resourceManager.spend(config.consumesResource, cost)) {
      return false;
    }

    state.count += countToBuy;
    this.events.emit('upgrade:purchased', {
      upgradeId: id,
      newCount: state.count,
      cost
    });

    return true;
  }

  /**
   * Check unlocks (e.g. 30 fiéis unlocks Templo Sagrado, 10000 Ouro unlocks Monumentos)
   */
  public checkUnlocks(peakResources: Record<ResourceId, number>): boolean {
    let anyNewlyUnlocked = false;
    const fiesCount = this.states.get('fiel')?.count || 0;

    // Check monument unlock (10,000 Ouro)
    const monumentState = this.states.get('monument');
    if (monumentState && !monumentState.unlocked) {
      const peakGold = peakResources['gold'] || 0;
      if (peakGold >= 10000) {
        monumentState.unlocked = true;
        anyNewlyUnlocked = true;
      }
    }

    this.configs.forEach(cfg => {
      const state = this.states.get(cfg.id);
      if (state && !state.unlocked) {
        let shouldUnlock = false;

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

  public resetAll(): void {
    this.configs.forEach(cfg => {
      this.states.set(cfg.id, {
        id: cfg.id,
        count: 0,
        unlocked: cfg.unlockCost === 0 && (cfg.unlockFielCount === undefined || cfg.unlockFielCount === 0)
      });
    });
  }
}
