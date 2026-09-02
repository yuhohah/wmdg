import { UpgradeConfig, UpgradeState, ResourceId } from './types';
import { EventEmitter } from './EventEmitter';
import { GameEventMap } from './types';
import { ResourceManager } from './ResourceManager';
import { GameMath, FIEL_MILESTONES, SACERDOTE_MILESTONES, MilestoneProgress } from './GameMath';

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
    id: 'sacerdote',
    name: 'Sacerdote',
    description: 'Líder sagrado do Templo que gera Ouro continuamente (+10 Ouro/s). Podem ser promovidos a Apóstolos.',
    baseCost: 20,
    costMultiplier: 2.4,
    baseOutput: 10,
    icon: '/assets/icons/icon_sacerdote.jpg',
    targetResource: 'gold',
    consumesResource: 'gold',
    unlockCost: 0
  },
  {
    id: 'apostolo_1',
    name: '1º Apóstolo',
    description: 'Promove o 1º Sacerdote a Apóstolo (+50 Ouro/s).',
    baseCost: 50000,
    costMultiplier: 1.0,
    baseOutput: 50,
    icon: '/assets/icons/icon_star.png',
    targetResource: 'gold',
    consumesResource: 'faith',
    unlockCost: 0
  },
  {
    id: 'apostolo_2',
    name: '2º Apóstolo',
    description: 'Promove o 2º Sacerdote a Apóstolo (+50 Ouro/s).',
    baseCost: 150000,
    costMultiplier: 1.0,
    baseOutput: 50,
    icon: '/assets/icons/icon_star.png',
    targetResource: 'gold',
    consumesResource: 'faith',
    unlockCost: 0
  },
  {
    id: 'apostolo_3',
    name: '3º Apóstolo',
    description: 'Promove o 3º Sacerdote a Apóstolo (+50 Ouro/s).',
    baseCost: 450000,
    costMultiplier: 1.0,
    baseOutput: 50,
    icon: '/assets/icons/icon_star.png',
    targetResource: 'gold',
    consumesResource: 'faith',
    unlockCost: 0
  },
  {
    id: 'apostolo_4',
    name: '4º Apóstolo',
    description: 'Promove o 4º Sacerdote a Apóstolo (+50 Ouro/s).',
    baseCost: 1350000,
    costMultiplier: 1.0,
    baseOutput: 50,
    icon: '/assets/icons/icon_star.png',
    targetResource: 'gold',
    consumesResource: 'faith',
    unlockCost: 0
  },
  {
    id: 'apostolo_5',
    name: '5º Apóstolo',
    description: 'Promove o 5º Sacerdote a Apóstolo (+50 Ouro/s).',
    baseCost: 4050000,
    costMultiplier: 1.0,
    baseOutput: 50,
    icon: '/assets/icons/icon_star.png',
    targetResource: 'gold',
    consumesResource: 'faith',
    unlockCost: 0
  },
  {
    id: 'apostolo_6',
    name: '6º Apóstolo',
    description: 'Promove o 6º Sacerdote a Apóstolo (+50 Ouro/s).',
    baseCost: 12150000,
    costMultiplier: 1.0,
    baseOutput: 50,
    icon: '/assets/icons/icon_star.png',
    targetResource: 'gold',
    consumesResource: 'faith',
    unlockCost: 0
  },
  {
    id: 'apostolo_7',
    name: '7º Apóstolo',
    description: 'Promove o 7º Sacerdote a Apóstolo (+50 Ouro/s).',
    baseCost: 36450000,
    costMultiplier: 1.0,
    baseOutput: 50,
    icon: '/assets/icons/icon_star.png',
    targetResource: 'gold',
    consumesResource: 'faith',
    unlockCost: 0
  },
  {
    id: 'apostolo_8',
    name: '8º Apóstolo',
    description: 'Promove o 8º Sacerdote a Apóstolo (+50 Ouro/s).',
    baseCost: 109350000,
    costMultiplier: 1.0,
    baseOutput: 50,
    icon: '/assets/icons/icon_star.png',
    targetResource: 'gold',
    consumesResource: 'faith',
    unlockCost: 0
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
    id: 'reza_1',
    name: 'Prece dos Fiéis',
    description: 'Bênção do Nível 1 do Templo. Fiéis produzem +25% de Fé por escala logarítmica a cada nível.',
    baseCost: 50000,
    costMultiplier: 1.8,
    baseOutput: 0,
    icon: '/assets/icons/icon_star.png',
    targetResource: 'faith',
    consumesResource: 'faith',
    unlockCost: 0
  },
  {
    id: 'reza_2',
    name: 'Prece do Ouro Sagrado',
    description: 'Bênção do Nível 2 do Templo. Ouro gerado pelo Templo aumenta +25% por escala logarítmica a cada nível.',
    baseCost: 250000,
    costMultiplier: 1.8,
    baseOutput: 0,
    icon: '/assets/icons/icon_star.png',
    targetResource: 'gold',
    consumesResource: 'faith',
    unlockCost: 0
  },
  {
    id: 'reza_3',
    name: 'Invocação Celestial',
    description: 'Bênção do Nível 3 do Templo. Dobra a eficiência de todos os Sacerdotes (+100% Fiéis/s).',
    baseCost: 1250000,
    costMultiplier: 1.0,
    baseOutput: 0,
    icon: '/assets/icons/icon_star.png',
    targetResource: 'faith',
    consumesResource: 'faith',
    unlockCost: 0
  },
  {
    id: 'reza_4',
    name: 'Oração Absoluta',
    description: 'Bênção do Nível 4 do Templo. Dobra a produção global de todas as fontes de Fé (+100% Geral).',
    baseCost: 10000000,
    costMultiplier: 1.0,
    baseOutput: 0,
    icon: '/assets/icons/icon_star.png',
    targetResource: 'faith',
    consumesResource: 'faith',
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
  private fractionalFiel: number = 0;

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
   * Custo usando GameMath
   */
  public getUpgradeCost(id: string, countToBuy: number = 1): number {
    const config = this.configs.get(id);
    const state = this.states.get(id);
    if (!config || !state || countToBuy <= 0) return Infinity;

    if (id === 'templo') {
      return 30 * countToBuy;
    }

    if (id === 'temple_enhancement') {
      return this.getTempleEnhancementCost();
    }

    if (id === 'monument') {
      return this.getNextMonumentCost();
    }

    return GameMath.calculateBulkCost(config.baseCost, config.costMultiplier, state.count, countToBuy);
  }

  /**
   * Máximo comprável em O(1) usando GameMath
   */
  public getMaxAffordable(id: string): { count: number; cost: number } {
    const config = this.configs.get(id);
    const state = this.states.get(id);
    if (!config || !state) return { count: 0, cost: 0 };

    const balance = this.resourceManager.getResource(config.consumesResource).amount;

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

    return GameMath.calculateMaxBuy(config.baseCost, config.costMultiplier, state.count, balance);
  }

  public getFiesCount(): number {
    return this.states.get('fiel')?.count || 0;
  }

  public getTemplosCount(): number {
    return this.states.get('templo')?.count || 0;
  }

  public isTemplesUnlocked(): boolean {
    const temploState = this.states.get('templo');
    if (temploState?.unlocked || (temploState?.count || 0) > 0) return true;
    const faithRes = this.resourceManager.getResource('faith');
    return (faithRes.amount >= 200 || faithRes.peakAmount >= 200 || this.getFiesCount() >= 15);
  }

  /**
   * Multiplicadores do Templo
   */
  public getTempleClickMultiplier(): number {
    const state = this.states.get('temple_click');
    const level = state?.count || 0;
    const reza2Mult = (this.states.get('reza_2')?.count || 0) > 0 ? 3.0 : 1.0;
    return (1.00 + (level * 0.50)) * reza2Mult;
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
   * Milestones dos Fiéis
   */
  public getFielMilestoneMultiplier(): number {
    const fiesCount = this.states.get('fiel')?.count || 0;
    return GameMath.getMilestoneMultiplier(fiesCount, FIEL_MILESTONES);
  }

  public getFielMilestoneProgress(): MilestoneProgress {
    const fiesCount = this.states.get('fiel')?.count || 0;
    return GameMath.getMilestoneProgress(fiesCount, FIEL_MILESTONES);
  }

  /**
   * Milestones dos Sacerdotes
   */
  public getSacerdoteMilestoneMultiplier(): number {
    const count = this.getSacerdotesCount();
    return GameMath.getMilestoneMultiplier(count, SACERDOTE_MILESTONES);
  }

  public getSacerdoteMilestoneProgress(): MilestoneProgress {
    const count = this.getSacerdotesCount();
    return GameMath.getMilestoneProgress(count, SACERDOTE_MILESTONES);
  }

  /**
   * Aprimoramento do Templo (Máximo de 4 Níveis)
   */
  public getTempleEnhancementLevel(): number {
    return this.states.get('temple_enhancement')?.count || 0;
  }

  public getTempleEnhancementCost(): number {
    const level = this.getTempleEnhancementLevel();
    if (level >= 4) return Infinity;
    return Math.floor(10000 * Math.pow(3.5, level));
  }

  public canUpgradeTempleWithFaith(): boolean {
    const isBuilt = this.isTempleBuilt();
    if (!isBuilt) return false;
    const level = this.getTempleEnhancementLevel();
    if (level >= 4) return false;
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
   * Multiplicador Logarítmico Sem Limite da Reza 1 para os Fiéis (+25% por escala log10)
   */
  public getFielFaithLogMultiplier(faithAmount: number = 0): number {
    const level = this.states.get('reza_1')?.count || 0;
    if (level <= 0) return 1.0;
    const logBonus = Math.log10(Math.max(1, faithAmount)) * (0.25 * level);
    return 1.0 + logBonus;
  }

  /**
   * Multiplicador Logarítmico Sem Limite da Reza 2 para o Ouro do Templo (+25% por escala log10)
   */
  public getTempleGoldLogMultiplier(faithAmount: number = 0): number {
    const level = this.states.get('reza_2')?.count || 0;
    if (level <= 0) return 1.0;
    const logBonus = Math.log10(Math.max(1, faithAmount)) * (0.25 * level);
    return 1.0 + logBonus;
  }

  /**
   * Apóstolos System
   */
  public getApostolosCount(): number {
    let count = 0;
    for (let i = 1; i <= 8; i++) {
      if ((this.states.get(`apostolo_${i}`)?.count || 0) > 0) {
        count++;
      }
    }
    return count;
  }

  public isApostoloPurchased(slotIndex: number): boolean {
    if (slotIndex < 0 || slotIndex >= 8) return false;
    return (this.states.get(`apostolo_${slotIndex + 1}`)?.count || 0) > 0;
  }

  public getApostoloCost(slotIndex: number): number {
    if (slotIndex < 0 || slotIndex >= 8) return Infinity;
    const cfg = this.getConfig(`apostolo_${slotIndex + 1}`);
    return cfg?.baseCost || (50000 * Math.pow(3, slotIndex));
  }

  public canUpgradeApostolo(slotIndex: number): boolean {
    const sacerdotesCount = this.getSacerdotesCount();
    if (slotIndex >= sacerdotesCount) return false;
    if (this.isApostoloPurchased(slotIndex)) return false;
    const cost = this.getApostoloCost(slotIndex);
    return this.resourceManager.hasAmount('faith', cost);
  }

  public upgradeApostolo(slotIndex: number): boolean {
    if (!this.canUpgradeApostolo(slotIndex)) return false;
    const cost = this.getApostoloCost(slotIndex);
    if (!this.resourceManager.spend('faith', cost)) return false;

    const stateId = `apostolo_${slotIndex + 1}`;
    const state = this.states.get(stateId);
    if (!state) return false;
    state.count = 1;

    this.events.emit('upgrade:purchased', {
      upgradeId: stateId,
      newCount: 1,
      cost
    });
    return true;
  }

  /**
   * Produção de Ouro por segundo (Sacerdotes +10/s, Apóstolos +50/s)
   */
  public getGoldProductionPerSecond(faithAmount: number = 0): number {
    const templosCount = this.states.get('templo')?.count || 0;
    if (templosCount <= 0) return 0;

    const enhLevel = this.getTempleEnhancementLevel();
    const enhMult = Math.pow(2, enhLevel);

    const baseTempleGold = templosCount * 1.0 * enhMult;

    // Direct Sacerdotes (+10 Gold/s) & Apóstolos (+50 Gold/s) income
    const sacerdotesCount = this.getSacerdotesCount();
    const apostolosCount = this.getApostolosCount();
    const normalSacerdotes = Math.max(0, sacerdotesCount - apostolosCount);
    const sacerdotesGold = (normalSacerdotes * 10) + (apostolosCount * 50);

    const totalBaseGold = baseTempleGold + sacerdotesGold;

    const faithBonusMult = this.getTempleGoldFaithMultiplier();
    
    // Logarithmic faith scaling com Power Softcap em 5.0x
    const rawFaithBonus = (Math.log10(Math.max(1, faithAmount)) * 0.25) * faithBonusMult;
    const softcappedFaithBonus = GameMath.applyPowerSoftcap(rawFaithBonus, 5.0, 0.5);

    const monumentMult = this.getMonumentGoldMultiplier();
    const reza2GoldLogMult = this.getTempleGoldLogMultiplier(faithAmount);

    return totalBaseGold * (1.0 + softcappedFaithBonus) * monumentMult * reza2GoldLogMult;
  }

  /**
   * Produção de Fé por segundo (Multiplicada por Milestones, Reza 1 e Monumentos)
   */
  public getTotalProductionPerSecond(resourceId: ResourceId, faithAmount: number = 0): number {
    if (resourceId === 'faith') {
      const fiesCount = this.states.get('fiel')?.count || 0;
      const monumentMult = this.getMonumentFaithMultiplier();
      const reza1LogMult = this.getFielFaithLogMultiplier(faithAmount);
      return fiesCount * 1.0 * this.getTempleFielMultiplier() * monumentMult * reza1LogMult;
    }
    if (resourceId === 'gold') {
      return this.getGoldProductionPerSecond(faithAmount);
    }
    return 0;
  }

  public canAffordTemple(): boolean {
    const temploCount = this.states.get('templo')?.count || 0;
    if (temploCount >= 1) return false;
    const fies = this.states.get('fiel')?.count || 0;
    return fies >= 30;
  }

  public isTempleBuilt(): boolean {
    return (this.states.get('templo')?.count || 0) >= 1;
  }

  public buyTemple(): boolean {
    const fielState = this.states.get('fiel');
    const temploState = this.states.get('templo');
    if (!fielState || !temploState) return false;

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
   * Sacerdotes do Templo (Multiplicados por Milestones de Sacerdotes)
   */
  public getSacerdotesCount(): number {
    return this.states.get('sacerdote')?.count || 0;
  }

  public addSacerdoteFies(dt: number): number {
    const sacerdotes = this.getSacerdotesCount();
    if (sacerdotes <= 0) return 0;

    const sMult = this.getSacerdoteMilestoneMultiplier();
    const gained = sacerdotes * dt * sMult;
    this.fractionalFiel += gained;

    const whole = Math.floor(this.fractionalFiel);
    if (whole > 0) {
      this.fractionalFiel -= whole;
      const fielState = this.states.get('fiel');
      if (fielState) {
        fielState.count += whole;
      }
    }

    return gained;
  }

  public buySacerdote(count: number = 1): boolean {
    return this.buyUpgrade('sacerdote', count);
  }

  public getMaxAffordableSacerdote(): { count: number; cost: number } {
    return this.getMaxAffordable('sacerdote');
  }

  /**
   * Sistema de Monumentos Ancestrais
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
    return MONUMENTS[count];
  }

  public getNextMonumentCost(): number {
    const next = this.getNextMonument();
    return next ? next.cost : Infinity;
  }

  public canAffordNextMonument(): boolean {
    if (!this.isMonumentsUnlocked()) return false;
    const cost = this.getNextMonumentCost();
    return this.resourceManager.hasAmount('gold', cost);
  }

  public buyNextMonument(): boolean {
    if (!this.canAffordNextMonument()) return false;
    const cost = this.getNextMonumentCost();
    if (!this.resourceManager.spend('gold', cost)) return false;

    const state = this.states.get('monument');
    if (!state) return false;

    state.count += 1;
    state.unlocked = true;

    this.events.emit('upgrade:purchased', {
      upgradeId: 'monument',
      newCount: state.count,
      cost
    });

    return true;
  }

  public getMonumentGlobalMultiplier(): number {
    const count = this.getMonumentsCount();
    let mult = 1.0;
    if (count >= 1) mult *= 2.0; // Monólito da Aurora: +100% Global
    if (count >= 5) mult *= 5.0; // Colosso: +400% Global
    if (count >= 6) mult *= 6.0; // Farol: +500% Global
    if (count >= 7) mult *= 11.0; // Trono: +1000% Global
    return mult;
  }

  public getMonumentFaithMultiplier(): number {
    const count = this.getMonumentsCount();
    let mult = 1.0;
    if (count >= 2) mult *= 2.5; // Obelisco: +150% Fé dos Fiéis
    return mult * this.getMonumentGlobalMultiplier();
  }

  public getMonumentGoldMultiplier(): number {
    const count = this.getMonumentsCount();
    let mult = 1.0;
    if (count >= 3) mult *= 3.0; // Torre dos Céus: +200% Ouro dos Templos
    return mult * this.getMonumentGlobalMultiplier();
  }

  public getMonumentClickMultiplier(): number {
    const count = this.getMonumentsCount();
    let mult = 1.0;
    if (count >= 4) mult *= 4.0; // Pirâmide: +300% Fé por Toque
    return mult * this.getMonumentGlobalMultiplier();
  }

  public buyUpgrade(id: string, count: number = 1): boolean {
    const config = this.configs.get(id);
    const state = this.states.get(id);
    if (!config || !state || count <= 0) return false;

    if (id === 'templo') {
      return this.buyTemple();
    }
    if (id === 'temple_enhancement') {
      return this.upgradeTempleWithFaith();
    }
    if (id === 'monument') {
      return this.buyNextMonument();
    }

    if (id === 'sacerdote' && state.count >= 8) {
      return false;
    }

    const totalCost = this.getUpgradeCost(id, count);
    if (!this.resourceManager.hasAmount(config.consumesResource, totalCost)) {
      return false;
    }

    if (!this.resourceManager.spend(config.consumesResource, totalCost)) {
      return false;
    }

    const prevCount = state.count;
    state.count += count;

    if (id === 'sacerdote') {
      this.checkMilestoneCross('sacerdote', prevCount, state.count, SACERDOTE_MILESTONES);
    }

    this.events.emit('upgrade:purchased', {
      upgradeId: id,
      newCount: state.count,
      cost: totalCost
    });

    return true;
  }

  private checkMilestoneCross(id: string, prevCount: number, newCount: number, milestones: typeof FIEL_MILESTONES): void {
    for (const m of milestones) {
      if (prevCount < m.level && newCount >= m.level) {
        this.events.emit('milestone:reached', {
          id,
          level: m.level,
          multiplier: m.multiplier,
          label: m.label
        });
      }
    }
  }

  public checkUnlocks(peakResources: Record<ResourceId, number>): boolean {
    let anyNewlyUnlocked = false;
    const fiesCount = this.states.get('fiel')?.count || 0;

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
    this.fractionalFiel = 0;
    this.configs.forEach(cfg => {
      this.states.set(cfg.id, {
        id: cfg.id,
        count: 0,
        unlocked: cfg.unlockCost === 0 && (cfg.unlockFielCount === undefined || cfg.unlockFielCount === 0)
      });
    });
  }
}
