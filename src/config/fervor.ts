import type { FervorUpgrade } from '../types.js';

export const BASE_FERVOR_RATE = 1.0;

export const initialFervorUpgrades: FervorUpgrade[] = [
  {
    id: 'fu_prod',
    name: 'Aumentar Produção de Fervor',
    desc: 'Intensifica a chama interior do culto, gerando mais Fervor por segundo.',
    lore: 'O fogo sagrado queima com resina cósmica, multiplicando a velocidade com que o Fervor é gerado.',
    icon: '',
    baseCost: 50,
    costMultiplier: 1.8,
    level: 0
  },
  {
    id: 'fu_effect',
    name: 'Aumentar Efeito do Fervor',
    desc: 'Amplifica o bônus místico que todo o Fervor acumulado concede à geração de Fé.',
    lore: 'A luz da chama dissipa as dúvidas e energiza as preces com poder transcendental contínuo.',
    icon: '',
    baseCost: 100,
    costMultiplier: 2.0,
    level: 0
  },
  {
    id: 'fu_click',
    name: 'Aumentar Fé por Clique',
    desc: 'O calor sagrado flui pelas mãos do líder, multiplicando a Fé obtida ao tocar a Esfera.',
    lore: 'A Esfera responde com descargas ardentes cada vez que seus dedos se aproximam do núcleo.',
    icon: '',
    baseCost: 100,
    costMultiplier: 1.4,
    level: 0
  },
  {
    id: 'fu_followers',
    name: 'Fiéis Aumentam Fé por Segundo',
    desc: 'Acende o fervor nos corações dos Fiéis Devotos, multiplicando sua devoção passiva.',
    lore: 'Os adeptos cantam hinos apaixonados à luz das tochas sagradas, ampliando drasticamente seu influxo.',
    icon: '',
    baseCost: 500,
    costMultiplier: 1.5,
    level: 0
  },
  {
    id: 'fu_synergy',
    name: 'Fé Aumenta Fervor por Segundo',
    desc: 'Converte a densidade de Fé acumulada em combustível puro para a chama do Fervor.',
    lore: 'Uma simbiose cósmica: quanto maior o oceano de fé, mais alto e rápido sobem as chamas do santuário.',
    icon: '',
    baseCost: 500,
    costMultiplier: 2.5,
    level: 0
  }
];

export function getFervorUpgradeMultiplier(
  upg: FervorUpgrade,
  followersCount: number = 0,
  faithPoints: number = 0
): number {
  if (upg.level <= 0) return 1.0;

  switch (upg.id) {
    case 'fu_prod':
      // DodecaDragons FU1: 2 ^ (level ^ 0.6)
      return Math.pow(2, Math.pow(upg.level, 0.6));

    case 'fu_effect':
      // DodecaDragons FU2: 1.25 ^ (level ^ 0.8)
      return Math.pow(1.25, Math.pow(upg.level, 0.8));

    case 'fu_click':
      // DodecaDragons FU3: (level ^ 2.6) * 4 + 1
      return Math.pow(upg.level, 2.6) * 4 + 1;

    case 'fu_followers':
      // DodecaDragons FU4: ((level ^ 1.5) * miners / 50) + 1
      return (Math.pow(upg.level, 1.5) * followersCount / 50) + 1;

    case 'fu_synergy':
      // DodecaDragons FU5: ((level ^ 1.5) * log10(gold + 1) / 5) + 1
      return (Math.pow(upg.level, 1.5) * Math.log10(Math.max(0, faithPoints) + 1) / 5) + 1;

    default:
      return 1.0;
  }
}

export function getFervorUpgradeFormula(upg: FervorUpgrade): string {
  switch (upg.id) {
    case 'fu_prod':
      return '2^(Nível^0.6)';
    case 'fu_effect':
      return '1.25^(Nível^0.8)';
    case 'fu_click':
      return '(Nível^2.6 × 4) + 1';
    case 'fu_followers':
      return '((Nível^1.5 × Fiéis) / 50) + 1';
    case 'fu_synergy':
      return '((Nível^1.5 × log10(Fé + 1)) / 5) + 1';
    default:
      return '1.0';
  }
}

