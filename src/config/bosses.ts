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
  fragment_vaelzaphir: {
    id: 'fragment_vaelzaphir',
    name: "Astrolábio de Vael'Zaphir",
    title: 'Engrenagem do Tempo Celeste',
    desc: 'Reduz a recarga de Transmutação de Fé para 1 segundo e aumenta a produção de Fervor em +30%.',
    lore: 'Instrumento forjado com anéis de platina celeste que calcula a declinação dos deuses e acelera as transmutações.',
    icon: '🧭',
    effectText: 'Recarga Transmutação 1s e +30% Fervor/s'
  },
  fragment_xulkhor: {
    id: 'fragment_xulkhor',
    name: "Manto de Xul'Khor",
    title: 'Tecido da Noite Eterna',
    desc: 'Dobra o ganho de Relíquias em Transmutações e concede multiplicador global permanente de 3x em toda a Fé gerada.',
    lore: 'Um manto tecido com a matéria escura que sobra quando sóis ancestrais se apagam.',
    icon: '🌌',
    effectText: '2x Relíquias em Transmutações e 3x Fé Global'
  },
  fragment_ouroboros: {
    id: 'fragment_ouroboros',
    name: 'Escama de Ouroboros',
    title: 'Ciclo Alquímico Infinito',
    desc: '+5% de Fé por Clique e Dano na Esfera para cada nível total de Relíquia restaurado (cumulativo e retroativo).',
    lore: 'A escama iridescente do grande verme que devora a própria cauda, unindo cada sacrifício ao renascimento contínuo.',
    icon: '🐍',
    effectText: '+5% FPC/Dano por Nível de Relíquia'
  },
  fragment_solinvictus: {
    id: 'fragment_solinvictus',
    name: 'Coroa de Sol-Invictus',
    title: 'Clarão da Apoteose Sagrada',
    desc: 'A Bênção da Encarnação concede 4x de Fé (em vez de 2x) e multiplica toda a produção global de Fé por 5x.',
    lore: 'A coroa radiante de puro ouro solar que repousa sobre a fronte do soberano absoluto do firmamento.',
    icon: '👑',
    effectText: 'Bênção concede 4x Fé e 5x Fé Global'
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
    unlockFaithReq: 50000000,
    baseHp: 50000000,
    hpMultiplierPerAscension: 0.75,
    timeLimitSec: 45,
    baseRelicReward: 50,
    relicRewardPerAscension: 25,
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
    unlockFaithReq: 250000000,
    baseHp: 500000000,
    hpMultiplierPerAscension: 1.0,
    timeLimitSec: 45,
    baseRelicReward: 150,
    relicRewardPerAscension: 75,
    fragmentId: 'fragment_aethelgard',
    artThemeColor: '#ef4444',
    auraClass: 'boss-aura-aethelgard'
  },
  {
    id: 'boss_vaelzaphir',
    name: "Vael'Zaphir",
    title: 'A Balança das Estrelas',
    subtitle: 'Guardiã do Transe Celeste',
    lore: 'Uma deusa esculpida em mármore astral segurando uma armila astronômica. Seu olhar impiedoso pesa a pureza das almas devotas contra a gravidade do éter estelar.',
    satelliteIndex: 2,
    unlockFaithReq: 1000000000,
    baseHp: 3500000000,
    hpMultiplierPerAscension: 1.25,
    timeLimitSec: 45,
    baseRelicReward: 400,
    relicRewardPerAscension: 200,
    fragmentId: 'fragment_vaelzaphir',
    artThemeColor: '#06b6d4',
    auraClass: 'boss-aura-vaelzaphir'
  },
  {
    id: 'boss_xulkhor',
    name: "Xul'Khor",
    title: 'O Demiurgo do Vazio',
    subtitle: 'Senhor da Entropia Final',
    lore: 'A sombra cósmica que antecede o início dos tempos e aguarda pacientemente o apagar da última estrela. Somente um culto dotado de relíquias divinas pode desafiá-lo.',
    satelliteIndex: 3,
    unlockFaithReq: 10000000000,
    baseHp: 50000000000,
    hpMultiplierPerAscension: 1.5,
    timeLimitSec: 45,
    baseRelicReward: 1000,
    relicRewardPerAscension: 500,
    fragmentId: 'fragment_xulkhor',
    artThemeColor: '#8b5cf6',
    auraClass: 'boss-aura-xulkhor'
  },
  {
    id: 'boss_ouroboros',
    name: 'Ouroboros-Nox',
    title: 'O Verme da Eternidade',
    subtitle: 'Devorador de Eras e Ciclos',
    lore: 'A colossal serpente cósmica entalhada nos grimórios herméticos que devora a própria cauda. O próprio tempo congela e se desfaz sob suas escamas de ferro alquímico.',
    satelliteIndex: 4,
    unlockFaithReq: 100000000000,
    baseHp: 750000000000,
    hpMultiplierPerAscension: 1.75,
    timeLimitSec: 45,
    baseRelicReward: 3000,
    relicRewardPerAscension: 1500,
    fragmentId: 'fragment_ouroboros',
    artThemeColor: '#10b981',
    auraClass: 'boss-aura-ouroboros'
  },
  {
    id: 'boss_solinvictus',
    name: 'Sol-Invictus',
    title: 'O Olho da Apoteose',
    subtitle: 'Soberano da Luz Inclemente',
    lore: 'A suprema divindade solar, um seraphim de seis asas em forma de engrenagens de bronze cósmico e fogo branco. Sua coroação exige a submissão de todo o universo visível.',
    satelliteIndex: 5,
    unlockFaithReq: 1000000000000,
    baseHp: 10000000000000,
    hpMultiplierPerAscension: 2.0,
    timeLimitSec: 45,
    baseRelicReward: 10000,
    relicRewardPerAscension: 5000,
    fragmentId: 'fragment_solinvictus',
    artThemeColor: '#fbbf24',
    auraClass: 'boss-aura-solinvictus'
  }
];

export function getBossHp(config: BossGodConfig, ascensionLevel: number): number {
  return Math.floor(config.baseHp * (1 + config.hpMultiplierPerAscension * ascensionLevel));
}

export function getBossRelicReward(config: BossGodConfig, ascensionLevel: number): number {
  return config.baseRelicReward + config.relicRewardPerAscension * ascensionLevel;
}
