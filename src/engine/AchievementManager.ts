import { GameEventMap } from './types';
import { EventEmitter } from './EventEmitter';

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'clicks' | 'faith' | 'fies' | 'gold' | 'temples' | 'monuments' | 'time';
}

export interface AchievementState {
  id: string;
  unlocked: boolean;
  unlockedAt?: number;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  // --- Cliques & Toque ---
  {
    id: 'first_click',
    title: 'Primeira Prece',
    description: 'Toque na Entidade Divina pela primeira vez.',
    icon: '/assets/icons/icon_entity_eye.png',
    category: 'clicks'
  },
  {
    id: 'clicks_100',
    title: 'Devoto Fervoroso',
    description: 'Realize 100 cliques manuais na Entidade Divina.',
    icon: '/assets/icons/icon_entity_eye.png',
    category: 'clicks'
  },
  {
    id: 'clicks_1000',
    title: 'Adorador Incansável',
    description: 'Realize 1.000 cliques manuais de adoração.',
    icon: '/assets/icons/icon_star.png',
    category: 'clicks'
  },

  // --- Produção de Fé ---
  {
    id: 'faith_1k_sec',
    title: 'Fé Crescente',
    description: 'Alcance uma produção de 1.000 Pontos de Fé por segundo.',
    icon: '/assets/icons/icon_star.png',
    category: 'faith'
  },
  {
    id: 'faith_100k_sec',
    title: 'Rio de Devoção',
    description: 'Alcance uma produção de 100.000 Pontos de Fé por segundo.',
    icon: '/assets/icons/icon_star.png',
    category: 'faith'
  },
  {
    id: 'faith_1m_total',
    title: 'Oceano Sagrado',
    description: 'Acumule um total de 1.000.000 de Pontos de Fé.',
    icon: '/assets/icons/icon_star.png',
    category: 'faith'
  },

  // --- Fiéis & Sacerdotes ---
  {
    id: 'first_fiel',
    title: 'Primeiro Fiel',
    description: 'Converta seu primeiro devoto.',
    icon: '/assets/icons/icon_flame.png',
    category: 'fies'
  },
  {
    id: 'fies_10',
    title: 'Pequena Congregação',
    description: 'Tenha 10 fiéis orando continuamente.',
    icon: '/assets/icons/icon_flame.png',
    category: 'fies'
  },
  {
    id: 'fies_50',
    title: 'Comunhão Sagrada',
    description: 'Reúna 50 fiéis sob a graça da Entidade.',
    icon: '/assets/icons/icon_flame.png',
    category: 'fies'
  },
  {
    id: 'fies_100',
    title: 'Legião de Devotos',
    description: 'Alcance 100 fiéis ativos no culto.',
    icon: '/assets/icons/icon_flame.png',
    category: 'fies'
  },
  {
    id: 'first_sacerdote',
    title: 'Primeiro Pastor',
    description: 'Ordene seu primeiro Sacerdote (+1 fiel/segundo).',
    icon: '/assets/icons/icon_shrine.png',
    category: 'fies'
  },
  {
    id: 'sacerdotes_10',
    title: 'Ordem Eclesiástica',
    description: 'Ordene 10 Sacerdotes no Templo Sagrado (+10 fiéis/s).',
    icon: '/assets/icons/icon_shrine.png',
    category: 'fies'
  },

  // --- Templos & Ouro ---
  {
    id: 'build_temple',
    title: 'A Casa de Deus',
    description: 'Desperte e construa o Templo Sagrado.',
    icon: '/assets/icons/icon_cathedral.png',
    category: 'temples'
  },
  {
    id: 'gold_1k',
    title: 'Cofre Abençoado',
    description: 'Acumule 1.000 unidades de Ouro.',
    icon: '/assets/icons/icon_shrine.png',
    category: 'gold'
  },
  {
    id: 'temple_enh_5',
    title: 'Templo Glorioso',
    description: 'Aprimore o Templo Sagrado com Fé para o Nível 5.',
    icon: '/assets/icons/icon_cathedral.png',
    category: 'temples'
  },

  // --- Monumentos & Tempo ---
  {
    id: 'first_monument',
    title: 'Maravilha Cósmica',
    description: 'Erga seu primeiro Monumento Ancestral.',
    icon: '/assets/icons/icon_monument.png',
    category: 'monuments'
  },
  {
    id: 'playtime_10m',
    title: 'Culto Perene',
    description: 'Mantenha o culto ativo por mais de 10 minutos.',
    icon: '/assets/icons/icon_entity_eye.png',
    category: 'time'
  }
];

export class AchievementManager {
  private events: EventEmitter<GameEventMap>;
  private states: Map<string, AchievementState> = new Map();

  constructor(events: EventEmitter<GameEventMap>, savedStates?: Record<string, AchievementState>) {
    this.events = events;

    ACHIEVEMENTS.forEach(ach => {
      const saved = savedStates ? savedStates[ach.id] : undefined;
      this.states.set(ach.id, saved ? { ...saved } : { id: ach.id, unlocked: false });
    });
  }

  public getDefinitions(): AchievementDefinition[] {
    return ACHIEVEMENTS;
  }

  public getState(id: string): AchievementState | undefined {
    const s = this.states.get(id);
    return s ? { ...s } : undefined;
  }

  public getAllStates(): Record<string, AchievementState> {
    const result: Record<string, AchievementState> = {};
    this.states.forEach((val, key) => {
      result[key] = { ...val };
    });
    return result;
  }

  public getUnlockedCount(): number {
    let count = 0;
    this.states.forEach(s => {
      if (s.unlocked) count++;
    });
    return count;
  }

  public getTotalCount(): number {
    return ACHIEVEMENTS.length;
  }

  /**
   * Unlock achievement if not already unlocked
   */
  public unlock(id: string): boolean {
    const state = this.states.get(id);
    const def = ACHIEVEMENTS.find(a => a.id === id);
    if (!state || !def || state.unlocked) return false;

    state.unlocked = true;
    state.unlockedAt = Date.now();

    this.events.emit('achievement:unlocked', {
      id: def.id,
      title: def.title,
      description: def.description,
      icon: def.icon
    });

    return true;
  }

  /**
   * Comprehensive condition checker invoked on every game loop tick
   */
  public checkConditions(params: {
    totalClicks: number;
    faithRate: number;
    totalFaith: number;
    fiesCount: number;
    sacerdotesCount: number;
    isTempleBuilt: boolean;
    goldAmount: number;
    templeEnhLevel: number;
    monumentsCount: number;
    playTimeSeconds: number;
  }): void {
    if (params.totalClicks >= 1) this.unlock('first_click');
    if (params.totalClicks >= 100) this.unlock('clicks_100');
    if (params.totalClicks >= 1000) this.unlock('clicks_1000');

    if (params.faithRate >= 1000) this.unlock('faith_1k_sec');
    if (params.faithRate >= 100000) this.unlock('faith_100k_sec');
    if (params.totalFaith >= 1000000) this.unlock('faith_1m_total');

    if (params.fiesCount >= 1) this.unlock('first_fiel');
    if (params.fiesCount >= 10) this.unlock('fies_10');
    if (params.fiesCount >= 50) this.unlock('fies_50');
    if (params.fiesCount >= 100) this.unlock('fies_100');

    if (params.sacerdotesCount >= 1) this.unlock('first_sacerdote');
    if (params.sacerdotesCount >= 10) this.unlock('sacerdotes_10');

    if (params.isTempleBuilt) this.unlock('build_temple');
    if (params.goldAmount >= 1000) this.unlock('gold_1k');
    if (params.templeEnhLevel >= 5) this.unlock('temple_enh_5');

    if (params.monumentsCount >= 1) this.unlock('first_monument');
    if (params.playTimeSeconds >= 600) this.unlock('playtime_10m');
  }

  public resetAll(): void {
    ACHIEVEMENTS.forEach(ach => {
      this.states.set(ach.id, { id: ach.id, unlocked: false });
    });
  }
}
