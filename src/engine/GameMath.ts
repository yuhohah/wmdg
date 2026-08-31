/**
 * GameMath.ts - Motor Matemático de Balanceamento e Progressão
 * Inspirado nas mecânicas de Dodeca Dragons, Antimatter Dimensions e Exponential Idle.
 */

export interface MilestoneDefinition {
  level: number;
  multiplier: number;
  label: string;
  description: string;
}

export const FIEL_MILESTONES: MilestoneDefinition[] = [
  { level: 10, multiplier: 2, label: 'Fervor Inicial', description: '2x Produção de Fé dos Fiéis' },
  { level: 25, multiplier: 3, label: 'Comunhão Sagrada', description: '3x Produção de Fé dos Fiéis' },
  { level: 50, multiplier: 5, label: 'Coro dos Devotos', description: '5x Produção de Fé dos Fiéis' },
  { level: 100, multiplier: 10, label: 'Ordem Eclesiástica', description: '10x Produção de Fé dos Fiéis' },
  { level: 250, multiplier: 25, label: 'Dogma Supremo', description: '25x Produção de Fé dos Fiéis' },
  { level: 500, multiplier: 100, label: 'Transcendência Menor', description: '100x Produção de Fé dos Fiéis' },
  { level: 1000, multiplier: 1000, label: 'Ascensão Divina', description: '1000x Produção de Fé dos Fiéis' },
];

export const SACERDOTE_MILESTONES: MilestoneDefinition[] = [
  { level: 5, multiplier: 2, label: 'Sínodo Menor', description: '2x Velocidade de conversão de Fiéis' },
  { level: 15, multiplier: 3, label: 'Liturgia Sagrada', description: '3x Velocidade de conversão de Fiéis' },
  { level: 30, multiplier: 5, label: 'Conclave Supremo', description: '5x Velocidade de conversão de Fiéis' },
  { level: 50, multiplier: 10, label: 'Hierofantes Cósmicos', description: '10x Velocidade de conversão de Fiéis' },
  { level: 100, multiplier: 50, label: 'Oráculo da Entidade', description: '50x Velocidade de conversão de Fiéis' },
];

export interface MilestoneProgress {
  prevLevel: number;
  nextLevel: number;
  currentLevel: number;
  progress: number; // 0.0 to 1.0
  nextMultiplier: number;
  label: string;
  isMaxed: boolean;
}

export class GameMath {
  /**
   * Custo unitário para o nível N:
   * C(n) = BaseCost * (ratio ^ n)
   */
  public static calculateCost(baseCost: number, ratio: number, currentLevel: number): number {
    return Math.floor(baseCost * Math.pow(ratio, currentLevel));
  }

  /**
   * Custo cumulativo para comprar K níveis a partir do nível N:
   * Sum = C_0 * ratio^N * (ratio^K - 1) / (ratio - 1)
   */
  public static calculateBulkCost(baseCost: number, ratio: number, currentLevel: number, count: number): number {
    if (count <= 0) return 0;
    if (ratio === 1) return baseCost * count;
    const cost = baseCost * Math.pow(ratio, currentLevel) * (Math.pow(ratio, count) - 1) / (ratio - 1);
    return Math.floor(cost);
  }

  /**
   * Quantidade máxima comprável com saldo disponível em O(1):
   * K = floor( ln(1 + (currency * (ratio - 1)) / (baseCost * ratio^N)) / ln(ratio) )
   */
  public static calculateMaxBuy(baseCost: number, ratio: number, currentLevel: number, currency: number): { count: number; cost: number } {
    if (currency <= 0) return { count: 0, cost: 0 };
    const currentUnitCost = baseCost * Math.pow(ratio, currentLevel);
    if (currency < currentUnitCost) return { count: 0, cost: 0 };

    if (ratio === 1) {
      const count = Math.floor(currency / baseCost);
      return { count, cost: count * baseCost };
    }

    const count = Math.floor(Math.log(1 + (currency * (ratio - 1)) / currentUnitCost) / Math.log(ratio));
    const cost = this.calculateBulkCost(baseCost, ratio, currentLevel, count);
    return { count, cost };
  }

  /**
   * Retornos Decrescentes por Potência (Power Softcap):
   * Se x > cap, excedente é elevado a exponent (ex: 0.5)
   */
  public static applyPowerSoftcap(value: number, cap: number, exponent: number = 0.5): number {
    if (value <= cap) return value;
    return cap + Math.pow(value - cap, exponent);
  }

  /**
   * Retornos Decrescentes Logarítmicos (Log Softcap):
   * f(x) = cap * (1 + ln(x / cap)) para x > cap
   */
  public static applyLogSoftcap(value: number, cap: number): number {
    if (value <= cap) return value;
    return cap * (1 + Math.log10(value / cap));
  }

  /**
   * Retorno Decrescente Contínuo Assintótico:
   * f(x) = cap * (1 - e^(-x / cap))
   */
  public static applyAsymptoticSoftcap(value: number, cap: number): number {
    if (value <= 0) return 0;
    return cap * (1 - Math.exp(-value / cap));
  }

  /**
   * Multiplicador total acumulado de Milestones para um nível N
   */
  public static getMilestoneMultiplier(level: number, milestones: MilestoneDefinition[]): number {
    let totalMult = 1;
    for (const m of milestones) {
      if (level >= m.level) {
        totalMult *= m.multiplier;
      }
    }
    return totalMult;
  }

  /**
   * Informação do progresso até o próximo marco (para barra de progresso visual)
   */
  public static getMilestoneProgress(level: number, milestones: MilestoneDefinition[]): MilestoneProgress {
    let prevLevel = 0;
    let nextMilestone: MilestoneDefinition | undefined;

    for (const m of milestones) {
      if (level < m.level) {
        nextMilestone = m;
        break;
      }
      prevLevel = m.level;
    }

    if (!nextMilestone) {
      return {
        prevLevel,
        nextLevel: prevLevel,
        currentLevel: level,
        progress: 1.0,
        nextMultiplier: 1,
        label: 'MÁXIMO ALCANÇADO',
        isMaxed: true
      };
    }

    const range = nextMilestone.level - prevLevel;
    const currentInRange = level - prevLevel;
    const progress = Math.min(1.0, Math.max(0.0, currentInRange / range));

    return {
      prevLevel,
      nextLevel: nextMilestone.level,
      currentLevel: level,
      progress,
      nextMultiplier: nextMilestone.multiplier,
      label: nextMilestone.label,
      isMaxed: false
    };
  }

  /**
   * Fórmula de Prestígio (Transcendência Cósmica):
   * Ganho de Essência Divina E = floor( 10 * (Fé / 1e6)^0.20 * (Ouro / 1e4)^0.15 )
   */
  public static calculatePrestigeGain(totalFaith: number, totalGold: number): number {
    const faithThreshold = 100000; // 100k PF threshold
    const goldThreshold = 1000;    // 1k Gold threshold

    if (totalFaith < faithThreshold && totalGold < goldThreshold) {
      return 0;
    }

    const faithPart = Math.pow(Math.max(1, totalFaith) / faithThreshold, 0.22);
    const goldPart = Math.pow(Math.max(1, totalGold) / goldThreshold, 0.18);
    return Math.floor(5 * faithPart * goldPart);
  }

  /**
   * Multiplicador Global concedido pela Essência Divina:
   * Cada ponto de essência dá +10% (+0.10) de bônus global aditivo
   */
  public static getEssenceBonusMultiplier(essence: number): number {
    return 1.0 + essence * 0.10;
  }
}
