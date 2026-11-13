import type { FervorUpgrade } from '../types.js';

export const BASE_FERVOR_RATE = 1.0;

export const initialFervorUpgrades: FervorUpgrade[] = [
  {
    id: 'fu_prod',
    name: 'Produção de Fervor',
    desc: 'Intensifica a chama interior do culto, gerando mais Fervor por segundo.',
    lore: '<strong>Rito: Alimentar a Chama.</strong> Seus fiéis lançam preces ao fogo dia e noite, e o Fervor sobe mais rápido.',
    icon: '',
    baseCost: 50,
    costMultiplier: 1.8,
    level: 0
  },
  {
    id: 'fu_effect',
    name: 'Efeito do Fervor',
    desc: 'Amplifica o bônus místico que todo o Fervor acumulado concede à geração de Fé.',
    lore: '<strong>Rito: Brasa Reveladora.</strong> Diante da brasa certa, até a dúvida vira combustível: cada ponto de Fervor fortalece mais a sua Fé.',
    icon: '',
    baseCost: 100,
    costMultiplier: 2.0,
    level: 0
  },
  {
    id: 'fu_click',
    name: 'Fé por Clique',
    desc: 'Multiplica a Fé obtida a cada clique na Esfera.',
    lore: '<strong>Rito: Pulso em Brasa.</strong> Sua vontade arde, e cada pulso seu queima mais fundo nas mentes mortais.',
    icon: '',
    baseCost: 100,
    costMultiplier: 1.4,
    level: 0
  },
  {
    id: 'fu_followers',
    name: 'Fé/s por Fiéis',
    desc: 'Acende o fervor nos corações dos Fiéis Devotos, multiplicando sua devoção passiva.',
    lore: '<strong>Rito: Coro das Tochas.</strong> Uma voz é uma prece; mil vozes ao redor do fogo são um único pensamento. Quanto mais fiéis, mais cada um rende.',
    icon: '',
    baseCost: 500,
    costMultiplier: 1.5,
    level: 0
  },
  {
    id: 'fu_synergy',
    name: 'Fervor/s por Fé',
    desc: 'Converte a densidade de Fé acumulada em combustível puro para a chama do Fervor.',
    lore: '<strong>Rito: Óleo da Devoção.</strong> A Fé guardada não é desperdício: derramada no fogo, faz o Fervor subir.',
    icon: '',
    baseCost: 500,
    costMultiplier: 2.5,
    level: 0
  },
  {
    id: 'fu_relics',
    name: 'Ganho de Fragmentos',
    desc: 'Multiplica os Fragmentos obtidos a cada Transmutação.',
    lore: '<strong>Rito: Cinzas da Fênix.</strong> Das cinzas, a Transmutação aprende a render mais Fragmentos a cada vez.',
    icon: '',
    baseCost: 20000000,
    costMultiplier: 5.0,
    level: 0
  }
];

export { getFervorUpgradeMultiplier } from '../systems/calculations.js';

