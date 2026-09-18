import type { BuyableItem } from '../types.js';

export const initialMonuments: BuyableItem[] = [
  {
    id: 'm_monolith',
    name: 'Monólito do Eclipse',
    desc: 'Pilar alienígena de pedra negra pulsando energia cósmica perpétua.',
    lore: 'Erguido em perfeito alinhamento astronômico, o monólito canaliza os sussurros do vazio interestelar para o altar central do culto.',
    symbol: '🗿',
    baseCost: 150,
    costMultiplier: 1.25,
    benefitText: '+12 Fé / seg',
    count: 0,
    baseEffect: 12,
    effectType: 'fps'
  },
  {
    id: 'm_orb_core',
    name: 'Núcleo Primordial',
    desc: 'Fragmento condensado do nascimento da Esfera levitando em transe gravitacional.',
    lore: 'Uma relíquia densa de matéria estelar viva. Suas pulsações atraem devotos de terras distantes e distorcem as leis da realidade.',
    symbol: '🪐',
    baseCost: 1200,
    costMultiplier: 1.28,
    benefitText: '+85 Fé / seg',
    count: 0,
    baseEffect: 85,
    effectType: 'fps'
  },
  {
    id: 'm_stargate',
    name: 'Portão Cósmico Infinito',
    desc: 'Fenda dimensional na abóbada celeste que atrai a devoção de mundos paralelos.',
    lore: 'Um vórtice hiperdimensional que transcende a matéria. Conecta milhões de adoradores de outras realidades ao nosso Círculo.',
    symbol: '🌀',
    baseCost: 9500,
    costMultiplier: 1.32,
    benefitText: '+600 Fé / seg',
    count: 0,
    baseEffect: 600,
    effectType: 'fps'
  },
  {
    id: 'm_singularity',
    name: 'Singularidade Astral',
    desc: 'O ponto de convergência absoluto de toda a consciência devocional cósmica.',
    lore: 'O ápice da comunhão. Quando o universo e a Esfera se tornam uma única entidade indivisível de fé infinita.',
    symbol: '⚡',
    baseCost: 75000,
    costMultiplier: 1.35,
    benefitText: '+4.500 Fé / seg',
    count: 0,
    baseEffect: 4500,
    effectType: 'fps'
  }
];
