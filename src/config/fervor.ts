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
    costMultiplier: 1.6,
    level: 0
  },
  {
    id: 'fu_effect',
    name: 'Aumentar Efeito do Fervor',
    desc: 'Amplifica o bônus místico que todo o Fervor acumulado concede à geração de Fé.',
    lore: 'A luz da chama dissipa as dúvidas e energiza as preces com poder transcendental contínuo.',
    icon: '',
    baseCost: 100,
    costMultiplier: 1.7,
    level: 0
  },
  {
    id: 'fu_click',
    name: 'Aumentar Fé por Clique',
    desc: 'O calor sagrado flui pelas mãos do líder, multiplicando a Fé obtida ao tocar a Esfera.',
    lore: 'A Esfera responde com descargas ardentes cada vez que seus dedos se aproximam do núcleo.',
    icon: '',
    baseCost: 100,
    costMultiplier: 1.65,
    level: 0
  },
  {
    id: 'fu_followers',
    name: 'Fiéis Aumentam Fé por Segundo',
    desc: 'Acende o fervor nos corações dos Fiéis Devotos, multiplicando sua devoção passiva.',
    lore: 'Os adeptos cantam hinos apaixonados à luz das tochas sagradas, ampliando drasticamente seu influxo.',
    icon: '',
    baseCost: 500,
    costMultiplier: 1.75,
    level: 0
  },
  {
    id: 'fu_synergy',
    name: 'Fé Aumenta Fervor por Segundo',
    desc: 'Converte a densidade de Fé acumulada em combustível puro para a chama do Fervor.',
    lore: 'Uma simbiose cósmica: quanto maior o oceano de fé, mais alto e rápido sobem as chamas do santuário.',
    icon: '',
    baseCost: 500,
    costMultiplier: 1.8,
    level: 0
  }
];

export function getFervorUpgradeMultiplier(upg: FervorUpgrade): number {
  switch (upg.id) {
    case 'fu_prod':
      return Math.pow(1.25, upg.level);
    case 'fu_effect':
      return 1 + upg.level * 0.50;
    case 'fu_click':
      return 1 + upg.level * 0.50;
    case 'fu_followers':
      return 1 + upg.level * 0.75;
    case 'fu_synergy':
      return 1 + upg.level * 0.50;
    default:
      return 1 + upg.level * 0.50;
  }
}
