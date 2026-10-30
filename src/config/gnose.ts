import type { GnoseUpgrade } from '../types.js';

/** Minimum Fé required to perform a Gnose Prestige Reset (1 Quatrilhão / 1e15, matching DodecaDragons Magic) */
export const GNOSE_MIN_FAITH_REQ = 1e15;

export const GNOSE_TIER_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: 'I. DESPERTAR & AUTOMAÇÃO',
  2: 'II. PERSISTÊNCIA & ECONOMIA',
  3: 'III. PODER DO CULTO',
  4: 'IV. APOTEOSE'
};

/** Bound work per simulation second even when resources are extremely large. */
export const GNOSE_AUTOMATION = { maxRitualLevelsPerCycle: 50 } as const;
export const GNOSE_SEAL_UPGRADES: Readonly<Record<string, string>> = {
  gn_memoria_selos: 'unlock_incarnation',
};
/** Small parameter improvements; the underlying formula shapes stay unchanged. */
export const GNOSE_FORMULAS = {
  followerCostStep: 0.01,
  fervorProductionBase: 2.05,
  hermeticProductionBase: 2.35,
  ritualCostStep: 0.05,
  relicProductionBase: 3.05,
  relicCostStep: 0.1,
  followerEconomyStep: 0.015,
  refinedRelicProductionBase: 3.4,
  refinedRelicCostStep: 0.3,
  empyreanProductionBase: 2.65,
  empyreanRitualCostStep: 0.1,
  perfectRelicProductionBase: 3.75,
  perfectRelicCostStep: 0.4,
} as const;
export const GNOSE_APOTHEOSIS_COSTS: Readonly<Record<number, number>> = { 4: 1e20, 5: 1e30 };

export const GNOSE_UPGRADES: GnoseUpgrade[] = [
  {
    id: 'gn_init_faith',
    name: 'Emanação Primordial',
    title: 'Centelha do Nous',
    desc: 'Reduz a escala de custo dos Fiéis em 0,01: de 1,10 para 1,09 antes do Cajado de Hermes. A fórmula continua custo base × escala^quantidade. Completa até 1.000 Fé na compra e em cada reinício. Concede sinergia de 1 + raiz quadrada dos Fiéis.',
    lore: 'Mesmo quando o templo retorna ao pó, a primeira centelha do Nous permanece acesa na memória da Esfera.',
    icon: 'star',
    tier: 1,
    cost: 1,
    prerequisites: [],
    effectText: 'Fiéis: escala de custo −0,01',
  },
  {
    id: 'gn_memoria_selos',
    name: 'Memória Hermética',
    title: 'Tábuas Inquebráveis',
    desc: 'Abre o Selo da Encarnação imediatamente e o preserva nos reinícios de Gnose. Converter Máximo, Ritualizar Máximo e Restaurar Máximo ficam disponíveis. Os Selos de Fervor e Relíquias continuam sendo comprados com Fé.',
    lore: 'O que foi gravado na Tábua de Esmeralda não pode ser selado novamente pelos séculos mortais.',
    icon: 'scroll',
    tier: 1,
    cost: 77,
    prerequisites: ['gn_init_faith'],
    effectText: 'Selo da Encarnação permanente · Converter Máximo',
  },
  {
    id: 'gn_init_fervor',
    name: 'Chama Astral',
    title: 'Fogo Inextinguível',
    desc: 'No Rito de produção de Fervor, a base de ganho passa de 2 para 2,05 e a escala de custo de 1,80 para 1,75. O expoente nível^0,6 continua igual.',
    lore: 'O fogo que arde acima das esferas planetárias não precisa de lenha terrena para consumir o firmamento.',
    icon: 'fervor',
    tier: 1,
    cost: 749310,
    prerequisites: ['gn_init_faith'],
    effectText: 'Rito de Fervor: ganho 2 → 2,05; custo 1,80 → 1,75',
  },
  {
    id: 'gn_relic_gain',
    name: 'Alquimia Astral',
    title: 'Matéria Transfigurada',
    desc: 'No Rito de Fragmentos, a base de ganho passa de 3 para 3,05 e a escala de custo de 5 para 4,90. Mantém nível^0,6 e a fórmula original da Transmutação. Exige a Fênix para usar esse Rito.',
    lore: 'O cadinho revela a essência que já repousava na matéria.',
    icon: 'relics',
    tier: 1,
    cost: 1546331765,
    prerequisites: ['gn_init_faith'],
    effectText: 'Rito de Fragmentos: ganho 3 → 3,05; custo 5 → 4,90',
  },
  {
    id: 'gn_automation',
    name: 'Culto Autônomo',
    title: 'Liturgia Autônoma',
    desc: 'Compra Fiéis automaticamente com a Fé disponível, pagando os custos normais. Pode ser ativado ou desativado para guardar Fé.',
    lore: 'Você não precisa mais chamar: as mentes mortais caminham em sonhos até o pátio da catedral por pura gravidade espiritual.',
    icon: 'gear',
    tier: 1,
    cost: 1816,
    prerequisites: ['gn_memoria_selos'],
    effectText: 'Auto-Fiéis · compra com Fé disponível · ativar/desativar',
  },
  {
    id: 'gn_seal_automation',
    name: 'Ruptura Automática',
    title: 'Abertura dos Selos',
    desc: 'Compra automaticamente todos os Selos ainda fechados, na ordem de seus pré-requisitos, pagando os custos normais com Fé. O Selo da Gnose exige apenas atingir o limiar. Repete as compras necessárias após cada Ascensão. Não preserva Selos abertos.',
    lore: 'Cada grilhão se rompe quando a devoção alcança o seu preço.',
    icon: 'gear',
    tier: 1,
    cost: 55923,
    prerequisites: ['gn_memoria_selos'],
    effectText: 'Compra automática de todos os Selos com Fé',
  },
  {
    id: 'gn_ritual_automation',
    name: 'Liturgia Autônoma',
    title: 'Ritos sem Vigília',
    desc: 'Compara o efeito relativo por custo dos Ritos de Fervor a cada segundo, usando até 100% do saldo atual de Fervor. Respeita a exigência da Fênix e o limite de 50 níveis por Rito por segundo. Possui ativar/desativar próprio.',
    lore: 'Os cânticos mantêm a chama sem aguardar a mão da Esfera.',
    icon: 'gear',
    tier: 2,
    cost: 10547999,
    prerequisites: ['gn_seal_automation', 'gn_init_fervor'],
    effectText: 'Auto-Ritos · usa todo o Fervor · ativar/desativar',
  },
  {
    id: 'gn_relic_automation',
    name: 'Oficina Autônoma',
    title: 'Artífices da Transmutação',
    desc: 'Prioriza a primeira Fênix e depois compara o retorno por Fragmento das Relíquias acessíveis, usando até 100% do saldo de Fragmentos e respeitando o nível máximo de cada Relíquia. Possui ativar/desativar próprio.',
    lore: 'As cinzas transmutadas encontram seu lugar nas obras dos antigos deuses.',
    icon: 'gear',
    tier: 2,
    cost: 127150504,
    prerequisites: ['gn_seal_automation'],
    effectText: 'Auto-Relíquias · usa todos os Fragmentos · ativar/desativar',
  },
  {
    id: 'gn_followers_syn',
    name: 'Congregação Esférica',
    title: 'Ressonância dos Devotos (MU6)',
    desc: 'O total de Fiéis amplifica toda a Fé: 1 + Fiéis. A Emanação Primordial já concede 1 + raiz quadrada dos Fiéis.',
    lore: 'Cada mente devota passa a refletir todas as outras como espelhos dispostos no interior de uma esfera perfeita.',
    icon: 'followers',
    tier: 2,
    cost: 107263635481,
    prerequisites: ['gn_memoria_selos'],
    effectText: 'Mais Fiéis aumentam toda a Fé',
  },
  {
    id: 'gn_bencao_eterna',
    name: 'Vigília Perpétua',
    title: 'Êxtase Sem Fim',
    desc: 'Mantém a Bênção de 2× Fé/s sempre ativa enquanto a Encarnação estiver desbloqueada.',
    lore: 'Quando o Profeta contempla a Gnose, sua prece deixa de ser um sopro passageiro e se torna um estado eterno do ser.',
    icon: 'hourglass',
    tier: 2,
    cost: 2102158069257,
    prerequisites: ['gn_init_fervor'],
    effectText: 'Bênção sempre ativa',
  },
  {
    id: 'gn_keep_relics',
    name: 'Cripta Eterna',
    title: 'Preservação do Opus Magnum',
    desc: 'Preserva todos os níveis das Relíquias restauradas nos reinícios de Gnose.',
    lore: 'As relíquias dos deuses esquecidos foram fundidas ao próprio núcleo da Esfera, tornando-se imunes à dissolução dos ciclos.',
    icon: 'urn',
    tier: 2,
    cost: 13443656846,
    prerequisites: ['gn_memoria_selos', 'gn_init_fervor'],
    effectText: 'Preserva Relíquias nos reinícios',
  },
  {
    id: 'gn_followers_economy',
    name: 'Convergência dos Fiéis',
    title: 'O Chamado Unificado',
    desc: 'Reduz a escala de custo dos Fiéis em mais 0,015: de 1,09 para 1,075 antes do Cajado de Hermes. Este passo é maior que a redução de 0,01 da Emanação Primordial. A fórmula de custo permanece igual.',
    lore: 'Cada voz reunida torna o chamado seguinte mais fácil de ouvir.',
    icon: 'followers',
    tier: 2,
    cost: 19612553057056,
    prerequisites: ['gn_init_faith', 'gn_followers_syn'],
    effectText: 'Fiéis: escala de custo −0,015 adicional',
  },
  {
    id: 'gn_followers_cubic',
    name: 'Coro Harmônico',
    title: 'Geometria Sagrada (MU10)',
    desc: 'Melhora o expoente da sinergia dos Fiéis de 1 para 1,1. A fórmula continua 1 + Fiéis^expoente.',
    lore: 'Três dimensões da mente, três oitavas do cântico: a devoção coletiva cresce a cada alma convertida.',
    icon: 'gem',
    tier: 3,
    cost: 183392573867151,
    prerequisites: ['gn_followers_syn'],
    effectText: 'Sinergia dos Fiéis: expoente 1 → 1,1',
  },
  {
    id: 'gn_gnose_mult',
    name: 'Olho de Trismegisto',
    title: 'Tríplice Sabedoria',
    desc: 'A fórmula da Ascensão continua (Fé / 1Q)^expoente. Melhora apenas o expoente de 0,25 para 0,28; o requisito de 1Q continua igual.',
    lore: 'Três vezes grande é aquele que enxerga simultaneamente o abismo mortal, o fogo astral e a mente divina.',
    icon: 'eye',
    tier: 3,
    cost: 1688174629283967,
    prerequisites: ['gn_bencao_eterna'],
    effectText: 'Ascensão: expoente 0,25 → 0,28',
  },
  {
    id: 'gn_relic_refinement',
    name: 'Alquimia Hermética',
    title: 'O Cadinho Aperfeiçoado',
    desc: 'No Rito de Fragmentos, melhora a base de ganho de 3,05 para 3,40 e reduz a escala de custo de 4,90 para 4,60. Os passos de +0,35 no ganho e −0,30 no custo superam os da Alquimia Astral. Mantém nível^0,6 e exige a Fênix.',
    lore: 'O cadinho aprende a separar cada vez menos cinza de cada vez mais essência.',
    icon: 'relics',
    tier: 3,
    cost: 1514981284744221400,
    prerequisites: ['gn_relic_gain', 'gn_keep_relics'],
    effectText: 'Fragmentos: ganho 3,05 → 3,40; custo 4,90 → 4,60',
  },
  {
    id: 'gn_fu1_boost',
    name: 'Fogo Hermético',
    title: 'Quinta-Essência Ígnea (MU14)',
    desc: 'Evolui a base de ganho do Rito de Fervor para 2,35, mantendo o mesmo expoente nível^0,6. Substitui a base 2,05 da Chama Astral.',
    lore: 'O fogo comum queima a matéria; o Fogo Hermético transmuta a própria lei matemática que rege o ardor do culto.',
    icon: 'sun',
    tier: 3,
    cost: 68207446966874170000,
    prerequisites: ['gn_keep_relics'],
    effectText: 'Rito de Fervor: ganho 2,05 → 2,35',
  },
  {
    id: 'gn_omniscience',
    name: 'Olho do Infinito',
    title: 'Visão Panóptica',
    desc: 'Fiéis e Ritos com as respectivas automações desbloqueadas deixam de consumir recursos, mas ainda exigem saldo para cada compra. Libera a geração automática de 100% da Transmutação por segundo. A Oficina Autônoma continua pagando os custos das Relíquias em Fragmentos.',
    lore: 'Aquele que tudo vê não apenas compreende o universo: ele se torna a própria mente que o concebe.',
    icon: 'orb',
    tier: 4,
    cost: 6.835505852917952e+21,
    prerequisites: ['gn_gnose_mult', 'gn_automation'],
    effectText: 'Fiéis/Ritos automáticos sem gasto · Transmutação 100%/s',
  },
  {
    id: 'gn_apotheosis',
    name: 'Gnosis Suprema',
    title: 'A Circunferência Infinita',
    desc: 'Reduz em 0,05 a escala de custo de cada Rito, depois das melhorias específicas. A fórmula continua custo base × escala^nível. Mantém o acesso aos Avatares finais: Eclipse por 1e20 Fé e Solar por 1e30 Fé, exigindo Gnosis Suprema.',
    lore: 'O centro está em toda parte; a circunferência, em lugar nenhum. A Esfera recorda sua plenitude anterior à criação.',
    icon: 'crown',
    tier: 4,
    cost: 7.921350349797226e+23,
    prerequisites: ['gn_omniscience', 'gn_fu1_boost', 'gn_followers_cubic'],
    effectText: 'Ritos: escala de custo −0,05 · Avatares finais',
  },
  {
    id: 'gn_empyrean_fire',
    name: 'Fogo Empíreo',
    title: 'A Chama do Firmamento',
    desc: 'No Rito de Fervor, evolui a base de ganho de 2,35 para 2,65 e reduz sua escala de custo em mais 0,10. Com Chama Astral e Gnosis Suprema, o custo passa de 1,70 para 1,60. O ganho de +0,30 mantém o passo de +0,30 do Fogo Hermético; mantém nível^0,6.',
    lore: 'A chama já não consome o altar: ilumina o próprio firmamento.',
    icon: 'sun',
    tier: 4,
    cost: 1.530668187652525e+30,
    prerequisites: ['gn_init_fervor', 'gn_fu1_boost', 'gn_apotheosis'],
    effectText: 'Fervor: ganho 2,35 → 2,65; custo −0,10 adicional',
  },
  {
    id: 'gn_perfect_opus',
    name: 'Opus Perfeito',
    title: 'A Matéria Consumada',
    desc: 'No Rito de Fragmentos, evolui a base de ganho de 3,40 para 3,75 e reduz sua escala de custo em mais 0,40. Com Gnosis Suprema, o custo passa de 4,55 para 4,15. O passo de +0,35 no ganho mantém o da Alquimia Hermética e a redução de −0,40 no custo o supera. Mantém nível^0,6 e exige a Fênix.',
    lore: 'Nada se perde no último fogo: toda matéria encontra sua forma sagrada.',
    icon: 'gem',
    tier: 4,
    cost: 2.4881152227410747e+34,
    prerequisites: ['gn_relic_refinement', 'gn_apotheosis'],
    effectText: 'Fragmentos: ganho 3,40 → 3,75; custo −0,40 adicional',
  }
];

/** Removed purchases are refunded once when an older save is loaded. */
export const RETIRED_GNOSE_UPGRADES = [
  { id: 'gn_click_power', cost: 3, tier: 1 },
  { id: 'gn_dilatacao', cost: 3, tier: 1 },
  { id: 'gn_altar_resonance', cost: 118, tier: 2 },
  { id: 'gn_alchemical_mind', cost: 150, tier: 2 },
  { id: 'gn_synergy_boost', cost: 8450, tier: 3 },
  { id: 'gn_relic_resonance', cost: 9900, tier: 3 },
] as const;

export const LEGACY_GNOSE_AUTOMATIONS = [
  { id: 'gn_auto_followers', cost: 3 },
  { id: 'gn_auto_fervor', cost: 5 },
  { id: 'gn_auto_relics', cost: 8 },
] as const;

/** Separate seal purchases are merged and excess paid Gnose is refunded once. */
export const LEGACY_GNOSE_SEAL_AUTOMATIONS = [
  { id: 'gn_fervor_seal', cost: 4, tier: 1 },
  { id: 'gn_relics_seal', cost: 12, tier: 2 },
] as const;

/** Prices paid before progression revision 1; refund only the difference, never lifetime Gnose. */
export const PROGRESSION_OLD_PRICES: Readonly<Record<string, number>> = {
  gn_automation: 8, gn_ritual_automation: 15, gn_relic_automation: 20, gn_keep_relics: 78,
};

/** Campaign calibration coefficients, shared by game and simulation. */
export const PROGRESSION_BALANCE = {
  ascensionExponent: 0.25,
  enlightenedExponent: 0.28,
  earlySynergyExponent: 0.5,
  congregationExponent: 1.0,
  solarCost: 1e30,
  nodeProductionMultiplier: 4,
  fervorResonanceScale: 1e18,
  fervorResonanceExponent: 2,
};

for (const upgrade of GNOSE_UPGRADES) {
  upgrade.desc += ' Cada nó assimilado também multiplica Fé por clique, Fé/s, Fervor/s e Fragmentos/s por 4, permanentemente.';
  upgrade.effectText += ' · produção ×4';
}
