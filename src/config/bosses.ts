import type { BossGodConfig, DivineFragment } from '../types.js';

export const DIVINE_FRAGMENTS: Record<string, DivineFragment> = {
  fragment_morvath: {
    id: 'fragment_morvath',
    name: 'Olho de Morvath',
    title: 'Visão do Vazio Primordial',
    desc: '+25% de Fé por Clique e concede 5% de chance de Impacto Divino (5x de dano/fé no clique).',
    lore: 'O olho cego arrancado do arauto cósmico enxerga as fendas invisíveis na trama da realidade.',
    icon: '👁️',
    effectText: '+25% FPC e 5% de Crítico Divino (5x)'
  },
  fragment_aethelgard: {
    id: 'fragment_aethelgard',
    name: 'Coração de Aethelgard',
    title: 'Pulso da Chama Eterna',
    desc: '+50% na sinergia de Fervor sobre os Fiéis e amplia a Bênção da Encarnação para 90 segundos.',
    lore: 'Mesmo arrancado do peito de Aethelgard, o coração de pedra ígnea pulsa em cadência com os fiéis.',
    icon: '❤️‍🔥',
    effectText: '+50% Sinergia Fervor e Bênção máx. de 90s'
  },
  fragment_xulkhor: {
    id: 'fragment_xulkhor',
    name: 'Manto de Xul\'Khor',
    title: 'Tecido da Noite Eterna',
    desc: 'Dobra o ganho de Relíquias em Transmutações e concede multiplicador global permanente de 3x em toda a Fé gerada.',
    lore: 'Um manto tecido com a matéria escura que sobra quando sóis ancestrais se apagam.',
    icon: '🌌',
    effectText: '2x Relíquias em Transmutação e 3x Fé Global'
  }
};

export const BOSS_GODS: BossGodConfig[] = [
  {
    id: 'boss_morvath',
    name: 'Morvath',
    title: 'O Cego da Discórdia',
    subtitle: 'Arauto do Éter Primordial',
    lore: 'Um antigo titã que perdeu a visão ao fitar a luz da Esfera em seu nascimento. Ergueu-se para sufocar o despertar do seu culto antes que ele se alastre pelas estrelas.',
    satelliteIndex: 0,
    unlockFaithReq: 50000,
    baseHp: 150000,
    hpMultiplierPerAscension: 0.75,
    timeLimitSec: 45,
    baseRelicReward: 15,
    relicRewardPerAscension: 10,
    fragmentId: 'fragment_morvath',
    artThemeColor: '#e0a96d',
    auraClass: 'boss-aura-morvath'
  },
  {
    id: 'boss_aethelgard',
    name: 'Aethelgard',
    title: 'O Devorador de Éter',
    subtitle: 'Monarca da Chama Voraz',
    lore: 'Habitante do núcleo das forjas cósmicas. Alimenta-se do Fervor das almas mortais e busca tragar a Encarnação Sagrada para o abismo do seu peito incandescente.',
    satelliteIndex: 1,
    unlockFaithReq: 5000000,
    baseHp: 35000000,
    hpMultiplierPerAscension: 1.0,
    timeLimitSec: 45,
    baseRelicReward: 75,
    relicRewardPerAscension: 50,
    fragmentId: 'fragment_aethelgard',
    artThemeColor: '#ef4444',
    auraClass: 'boss-aura-aethelgard'
  },
  {
    id: 'boss_xulkhor',
    name: 'Xul\'Khor',
    title: 'O Demiurgo do Vazio',
    subtitle: 'Senhor da Entropia Final',
    lore: 'A sombra que antecede o início dos tempos e que aguarda pacientemente o apagar da última estrela. Somente um culto dotado de relíquias divinas e devoção inabalável pode desafiá-lo.',
    satelliteIndex: 2,
    unlockFaithReq: 100000000,
    baseHp: 2500000000,
    hpMultiplierPerAscension: 1.5,
    timeLimitSec: 45,
    baseRelicReward: 350,
    relicRewardPerAscension: 200,
    fragmentId: 'fragment_xulkhor',
    artThemeColor: '#8b5cf6',
    auraClass: 'boss-aura-xulkhor'
  }
];

export function getBossHp(config: BossGodConfig, ascensionLevel: number): number {
  return Math.floor(config.baseHp * (1 + config.hpMultiplierPerAscension * ascensionLevel));
}

export function getBossRelicReward(config: BossGodConfig, ascensionLevel: number): number {
  return config.baseRelicReward + config.relicRewardPerAscension * ascensionLevel;
}
