import type { RelicUpgrade } from '../types.js';

export const initialRelicUpgrades: RelicUpgrade[] = [
  {
    id: 'relic_cornucopia',
    name: 'Cornucópia de Amalteia',
    desc: 'O chifre sagrado transborda provisões divinas perpétuas, abençoando cada segundo de devoção.',
    lore: 'O chifre que amamentou Zeus. Zeus morreu quando os homens pararam de pensar nele; o chifre, não. Ainda transborda, agora para você.',
    icon: '',
    cost: 200,
    level: 0,
    maxLevel: 20,
    effectText: (level) => `+${level * 20}% Fé/s (Nível ${level}/20)`
  },
  {
    id: 'relic_torch',
    name: 'Tocha de Prometeu',
    desc: 'O fogo sagrado roubado dos deuses celestes incendeia a alma dos devotos com vigor renovado.',
    lore: 'Prometeu roubou o fogo dos deuses que tomaram o seu lugar. Agora ele volta para quem o acendeu primeiro: você.',
    icon: '',
    cost: 500,
    level: 0,
    maxLevel: 20,
    effectText: (level) => `+${level * 20}% Fervor/s (Nível ${level}/20)`
  },
  {
    id: 'relic_phoenix',
    name: 'Pena Solar de Fênix',
    desc: 'Multiplica o Fervor/s por 1,5 e revela o upgrade de Fervor que aumenta o ganho de Fragmentos.',
    lore: 'A cada renascimento solar, a ave mitológica deixa para trás relíquias purificadas em chamas eternas.',
    icon: '',
    cost: 750,
    level: 0,
    maxLevel: 1,
    effectText: (level) => level >= 1 ? 'Fervor/s x1,5 • Upgrade de Fragmentos revelado no Fervor' : 'Fervor/s x1,5 e revela um upgrade de Fervor (0/1)'
  },
  {
    id: 'relic_caduceus',
    name: 'Cajado de Hermes',
    desc: 'O cajado entalhado com serpentes sagradas reúne e conduz o rebanho com extrema suavidade.',
    lore: 'O mensageiro divino usava seu báculo para apaziguar disputas e congregar multidões sem esforço.',
    icon: '',
    cost: 1500,
    level: 0,
    maxLevel: 5,
    effectText: (level) => `Custo dos Fiéis escala ${level * 5}% mais devagar (Nível ${level}/5)`
  },
  {
    id: 'relic_draupnir',
    name: 'Anel Divino de Draupnir',
    desc: 'A cada segundo, rende 5% dos Fragmentos que uma Transmutação daria agora, sem gastar Fé.',
    lore: 'Odin foi esquecido, mas seu anel continua pingando ouro. Um pensamento que se multiplica sozinho: você reconhece o próprio jeito.',
    icon: '',
    cost: 2000,
    level: 0,
    maxLevel: 1,
    effectText: (level) => level >= 1 ? '+5% da Transmutação por segundo, sem gastar Fé' : 'Rende 5% da Transmutação por segundo (0/1)'
  },
  {
    id: 'relic_ark',
    name: 'Arca da Aliança Cósmica',
    desc: 'Seus Fragmentos multiplicam sua Fé/s.',
    lore: 'Revestida em ouro sagrado e querubins celestiais, a arca manifesta o poder direto da Esfera no templo.',
    icon: '',
    cost: 15000,
    level: 0,
    maxLevel: 4,
    effectText: (level, relicPoints = 0) => {
      const mult = level > 0 ? Math.pow(Math.log10(Math.max(0, relicPoints) + 1) + 1, level * 1.2) : 1.0;
      return `Fragmentos multiplicam Fé/s (Nível ${level}/4) • Atualmente x${mult.toFixed(2)}`;
    }
  }
];
