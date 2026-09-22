import type { RelicUpgrade } from '../types.js';

export const initialRelicUpgrades: RelicUpgrade[] = [
  {
    id: 'relic_cornucopia',
    name: 'Cornucópia de Amalteia',
    desc: 'O chifre sagrado transborda provisões divinas perpétuas, abençoando cada segundo de devoção.',
    lore: 'Na mitologia grega, o chifre que amamentou Zeus concede abundância infinita de tudo o que seu portador desejar.',
    icon: '',
    cost: 200,
    level: 0,
    maxLevel: 20,
    effectText: (level) => `+${level * 20}% de Fé / seg (Nível ${level}/20)`
  },
  {
    id: 'relic_torch',
    name: 'Tocha de Prometeu',
    desc: 'O fogo sagrado roubado dos deuses celestes incendeia a alma dos devotos com vigor renovado.',
    lore: 'O titã desafiou o Olimpo para entregar a chama do conhecimento e do fervor aos mortais na terra.',
    icon: '',
    cost: 500,
    level: 0,
    maxLevel: 20,
    effectText: (level) => `+${level * 20}% de Fervor / seg (Nível ${level}/20)`
  },
  {
    id: 'relic_phoenix',
    name: 'Pena Solar de Fênix',
    desc: 'Pluma incandescente colhida das cinzas astrais que desperta consagrações místicas de fervor.',
    lore: 'A cada renascimento solar, a ave mitológica deixa para trás relíquias purificadas em chamas eternas.',
    icon: '',
    cost: 750,
    level: 0,
    maxLevel: 1,
    effectText: (level) => level >= 1 ? 'Consagração Mística de Fervor Ativa' : 'Desbloqueia novo rito de Fervor (0/1)'
  },
  {
    id: 'relic_caduceus',
    name: 'Báculo de Hermes',
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
    desc: 'Gera relíquias místicas continuamente a cada segundo sem necessidade de consagrar a Fé acumulada.',
    lore: 'Forjado por anões nórdicos para Odin, o anel de ouro pinga espontaneamente novas riquezas mágicas.',
    icon: '',
    cost: 2000,
    level: 0,
    maxLevel: 1,
    effectText: (level) => level >= 1 ? 'Geração Automática de Relíquias Ativa' : 'Gera relíquias sem reiniciar Fé (0/1)'
  },
  {
    id: 'relic_ark',
    name: 'Arca da Aliança Cósmica',
    desc: 'O relicário supremo que canaliza a glória de todas as relíquias para multiplicar exponencialmente a Fé.',
    lore: 'Revestida em ouro sagrado e querubins celestiais, a arca manifesta o poder direto da Esfera no templo.',
    icon: '',
    cost: 15000,
    level: 0,
    maxLevel: 4,
    effectText: (level, relicPoints = 0) => {
      const mult = level > 0 ? Math.pow(Math.log10(Math.max(0, relicPoints) + 1) + 1, level * 1.2) : 1.0;
      return `Relíquias multiplicam Fé/seg (Nível ${level}/4) • Atualmente x${mult.toFixed(2)}`;
    }
  }
];
