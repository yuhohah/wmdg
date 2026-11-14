import type { GnoseUpgrade } from '../types.js';

/** Minimum Fé required to perform a Gnose Prestige Reset (1 Quatrilhão / 1e15, matching DodecaDragons Magic) */
export const GNOSE_MIN_FAITH_REQ = 1e15;

export const GNOSE_TIER_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: 'I. DESPERTAR & AUTOMAÇÃO',
  2: 'II. PERSISTÊNCIA & ECONOMIA',
  3: 'III. PODER DO CULTO',
  4: 'IV. APOTEOSE'
};

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

/** Fixed campaign prices. Within each tier, cheaper nodes appear first.
 * Calibrated without generic production per node. Paired investments remain comparable;
 * free automation is the final reward. All paths stay purchasable. */
export const GNOSE_UPGRADES: GnoseUpgrade[] = [
  {
    id: 'gn_memoria_selos',
    name: 'Memória Hermética',
    title: 'Tábuas Inquebráveis',
    desc: 'Abre o Selo da Encarnação imediatamente e o mantém aberto após cada Ascensão. Libera Converter Máximo e as opções de compra máxima de Ritos e Relíquias. Os demais Selos continuam sujeitos aos seus custos e requisitos.',
    lore: 'O que foi gravado na Tábua de Esmeralda não pode ser selado novamente pelos séculos mortais.',
    icon: 'scroll',
    tier: 1,
    cost: 2,
    effectText: 'Encarnação permanente · compra máxima de Fiéis, Ritos e Relíquias',
  },
  {
    id: 'gn_automation',
    name: 'Culto Autônomo',
    title: 'Liturgia Autônoma',
    desc: 'A cada segundo, usa Converter Máximo para comprar todos os Fiéis que a Fé disponível permitir. Libera Converter Máximo e paga o custo total da compra. Pode ser pausado no painel dos Fiéis.',
    lore: 'Você não precisa mais chamar: as mentes mortais caminham em sonhos até o pátio da catedral por pura gravidade espiritual.',
    icon: 'gear',
    tier: 1,
    cost: 3,
    effectText: 'Converter Máximo automático a cada 1 s · usa Fé',
  },
  {
    id: 'gn_seal_automation',
    name: 'Ruptura Automática',
    title: 'Abertura dos Selos',
    desc: 'Verifica os Selos a cada segundo e compra os que puder pagar, respeitando os pré-requisitos e a moeda exigida por cada um. O Selo da Gnose abre ao atingir seu limiar, sem consumir Fé. Após cada Ascensão, volta a comprar os Selos; este upgrade não os torna permanentes.',
    lore: 'Cada grilhão se rompe quando a devoção alcança o seu preço.',
    icon: 'gear',
    tier: 1,
    cost: 8,
    effectText: 'Abre Selos automaticamente a cada 1 s · paga os custos exigidos',
  },
  {
    id: 'gn_ritual_automation',
    name: 'Liturgia Autônoma',
    title: 'Ritos sem Vigília',
    desc: 'A cada segundo, compra Ritos seguindo a opção Máximo do painel de Fervor: desativada, compra um nível de cada Rito; ativada, compra o máximo disponível. Prioriza o maior ganho por Fervor e reserva o custo de Selos ainda fechados. O Rito de Fragmentos exige a Fênix. Pode ser pausada no painel.',
    lore: 'Os cânticos mantêm a chama sem aguardar a mão da Esfera.',
    icon: 'gear',
    tier: 1,
    cost: 9,
    effectText: 'Ritos automáticos a cada 1 s · respeita a opção Máximo do painel',
  },
  {
    id: 'gn_relic_automation',
    name: 'Oficina Autônoma',
    title: 'Artífices da Transmutação',
    desc: 'A cada segundo, restaura Relíquias seguindo a opção Máximo do painel: desativada, compra um nível de cada Relíquia; ativada, compra o máximo disponível. Prioriza a primeira Fênix e depois o maior retorno por Fragmento. Respeita os limites de nível e pode usar todo o saldo. Pode ser pausada no painel.',
    lore: 'As cinzas transmutadas encontram seu lugar nas obras dos antigos deuses.',
    icon: 'gear',
    tier: 1,
    cost: 10,
    effectText: 'Relíquias automáticas a cada 1 s · respeita a opção Máximo do painel',
  },
  {
    id: 'gn_init_faith',
    name: 'Emanação Primordial',
    title: 'Centelha do Nous',
    desc: 'Reduz o aumento de custo por Fiel de 10% para 9%, antes do Cajado de Hermes (escala 1,10 → 1,09). Multiplica a Fé por clique e a Fé/s por 1 + √Fiéis; com 100 Fiéis, o bônus é 11×. Ao comprar, completa seu saldo até 1.000 Fé; após cada Ascensão, você começa com 1.000 Fé.',
    lore: 'Mesmo quando o templo retorna ao pó, a primeira centelha do Nous permanece acesa na memória da Esfera.',
    icon: 'star',
    tier: 2,
    cost: 20,
    effectText: 'Custo dos Fiéis: +10% → +9% por compra · sinergia: 1 + √Fiéis · início com 1.000 Fé',
  },
  {
    id: 'gn_keep_relics',
    name: 'Cripta Eterna',
    title: 'Preservação do Opus Magnum',
    desc: 'Preserva todos os níveis das Relíquias com limite após cada Ascensão. Cornucópia de Amalteia e Tocha de Prometeu ficam sem limite de nível e mantêm 50% dos níveis a cada Ascensão, arredondados para baixo.',
    lore: 'As relíquias dos deuses esquecidos foram fundidas ao próprio núcleo da Esfera, tornando-se imunes à dissolução dos ciclos.',
    icon: 'urn',
    tier: 2,
    cost: 25,
    effectText: 'Relíquias com limite preservadas · Cornucópia e Tocha ilimitadas, com 50% dos níveis mantidos',
  },
  {
    id: 'gn_bencao_eterna',
    name: 'Vigília Perpétua',
    title: 'Êxtase Sem Fim',
    desc: 'Mantém a Bênção permanentemente ativa enquanto a Encarnação estiver desbloqueada: 2× Fé/s (+100%), sem precisar recarregar sua duração. A Bênção não aumenta a Fé por clique.',
    lore: 'Quando o Profeta contempla a Gnose, sua prece deixa de ser um sopro passageiro e se torna um estado eterno do ser.',
    icon: 'hourglass',
    tier: 2,
    cost: 48,
    effectText: 'Bênção permanente: 2× Fé/s (+100%)',
  },
  {
    id: 'gn_init_fervor',
    name: 'Chama Astral',
    title: 'Fogo Inextinguível',
    desc: 'Melhora o Rito de produção de Fervor: a base do multiplicador sobe de 2 para 2,05, e o aumento de custo por nível cai de 80% para 75% (escala 1,80 → 1,75). O multiplicador de produção é base^(nível^0,6); o ganho depende do nível do Rito.',
    lore: 'O fogo que arde acima das esferas planetárias não precisa de lenha terrena para consumir o firmamento.',
    icon: 'fervor',
    tier: 2,
    cost: 60,
    effectText: 'Rito de Fervor: base 2 → 2,05 · custo por nível: +80% → +75%',
  },
  {
    id: 'gn_relic_gain',
    name: 'Alquimia Astral',
    title: 'Matéria Transfigurada',
    desc: 'Melhora o Rito de ganho de Fragmentos: a base do multiplicador sobe de 3 para 3,05, e o aumento de custo por nível cai de 400% para 390% (escala 5 → 4,90). O multiplicador é base^(nível^0,6) e melhora o resultado da Transmutação. O Rito exige a Fênix restaurada.',
    lore: 'O cadinho revela a essência que já repousava na matéria.',
    icon: 'gem',
    tier: 2,
    cost: 120,
    effectText: 'Rito de Fragmentos: base 3 → 3,05 · escala de custo 5 → 4,90',
  },
  {
    id: 'gn_followers_syn',
    name: 'Congregação Esférica',
    title: 'Ressonância dos Devotos (MU6)',
    desc: 'Melhora a sinergia dos Fiéis: o multiplicador de Fé por clique e Fé/s passa de 1 + √Fiéis para 1 + Fiéis. Com 100 Fiéis, passa de 11× para 101×. Substitui a sinergia da Emanação Primordial; os dois multiplicadores não se acumulam.',
    lore: 'Cada mente devota passa a refletir todas as outras como espelhos dispostos no interior de uma esfera perfeita.',
    icon: 'followers',
    tier: 2,
    cost: 150,
    effectText: 'Sinergia de Fé: 1 + √Fiéis → 1 + Fiéis',
  },
  {
    id: 'gn_followers_economy',
    name: 'Convergência dos Fiéis',
    title: 'O Chamado Unificado',
    desc: 'Reduz o aumento de custo por Fiel de 9% para 7,5%, antes do Cajado de Hermes (escala 1,09 → 1,075). Soma sua redução à da Emanação Primordial. Com o Cajado, a escala mínima continua sendo 1,05, ou +5% de custo por Fiel.',
    lore: 'Cada voz reunida torna o chamado seguinte mais fácil de ouvir.',
    icon: 'followers',
    tier: 3,
    cost: 1200,
    effectText: 'Custo dos Fiéis: +9% → +7,5% por compra',
  },
  {
    id: 'gn_followers_cubic',
    name: 'Coro Harmônico',
    title: 'Geometria Sagrada (MU10)',
    desc: 'Melhora a sinergia dos Fiéis de 1 + Fiéis para 1 + Fiéis^1,1, aumentando a Fé por clique e a Fé/s. Com 100 Fiéis, o multiplicador passa de 101× para aproximadamente 159,49×. O ganho cresce com a quantidade de Fiéis.',
    lore: 'Três dimensões da mente, três oitavas do cântico: a devoção coletiva cresce a cada alma convertida.',
    icon: 'gem',
    tier: 3,
    cost: 1500,
    effectText: 'Sinergia de Fé: 1 + Fiéis → 1 + Fiéis^1,1',
  },
  {
    id: 'gn_gnose_mult',
    name: 'Olho de Trismegisto',
    title: 'Tríplice Sabedoria',
    desc: 'Aumenta o expoente do ganho de Gnose por Ascensão de 0,25 para 0,28. O cálculo passa a ser (Fé ÷ 1 quatrilhão)^0,28, arredondado para baixo. O requisito continua em 1 quatrilhão de Fé; o benefício cresce conforme a Fé acumulada para ascender.',
    lore: 'Três vezes grande é aquele que enxerga simultaneamente o abismo mortal, o fogo astral e a mente divina.',
    icon: 'eye',
    tier: 3,
    cost: 36000,
    effectText: 'Gnose por Ascensão: expoente 0,25 → 0,28',
  },
  {
    id: 'gn_eternal_memory',
    name: 'Memória do Opus',
    title: 'Herança dos Artífices',
    desc: 'Com Cripta Eterna, aumenta de 50% para 80% a preservação dos níveis da Cornucópia de Amalteia e da Tocha de Prometeu em cada Ascensão. Os níveis preservados são arredondados para baixo. Não remove limites nem preserva Relíquias sem Cripta Eterna.',
    lore: 'O fogo dos artífices grava na matéria aquilo que nem os ciclos conseguem apagar.',
    icon: 'urn',
    tier: 3,
    cost: 45000,
    effectText: 'Com Cripta Eterna: preservação de Cornucópia e Tocha de 50% → 80%',
  },
  {
    id: 'gn_relic_refinement',
    name: 'Alquimia Hermética',
    title: 'O Cadinho Aperfeiçoado',
    desc: 'Melhora o Rito de ganho de Fragmentos: a base do multiplicador passa de 3,05 para 3,40, e a escala de custo cai de 4,90 para 4,60, antes de Gnosis Suprema. O multiplicador continua base^(nível^0,6), e o Rito exige a Fênix.',
    lore: 'O cadinho aprende a separar cada vez menos cinza de cada vez mais essência.',
    icon: 'gem',
    tier: 3,
    cost: 200000,
    effectText: 'Rito de Fragmentos: base 3,05 → 3,40 · escala de custo 4,90 → 4,60',
  },
  {
    id: 'gn_fu1_boost',
    name: 'Fogo Hermético',
    title: 'Quinta-Essência Ígnea (MU14)',
    desc: 'Melhora o Rito de produção de Fervor: a base do multiplicador passa de 2,05 para 2,35. O multiplicador continua base^(nível^0,6); o ganho depende do nível do Rito. Substitui a base concedida por Chama Astral e não altera o custo do Rito.',
    lore: 'O fogo comum queima a matéria; o Fogo Hermético transmuta a própria lei matemática que rege o ardor do culto.',
    icon: 'sun',
    tier: 3,
    cost: 240000,
    effectText: 'Rito de Fervor: base 2,05 → 2,35',
  },
  {
    id: 'gn_apotheosis',
    name: 'Gnosis Suprema',
    title: 'A Circunferência Infinita',
    desc: 'Reduz em 0,05 a escala de custo de todos os Ritos, somando às melhorias específicas; no Rito de Fervor com Chama Astral, a escala cai de 1,75 para 1,70. Reduz o custo do Avatar do Eclipse de 10 septilhões (10^25) para 100 quintilhões (10^20) de Fé: 100.000 vezes mais barato. O Avatar Solar continua custando 10^30 Fé e não exige este upgrade.',
    lore: 'O centro está em toda parte; a circunferência, em lugar nenhum. A Esfera recorda sua plenitude anterior à criação.',
    icon: 'crown',
    tier: 4,
    cost: 600000,
    effectText: 'Escala de custo dos Ritos: −0,05 · Eclipse 100.000× mais barato',
  },
  {
    id: 'gn_empyrean_fire',
    name: 'Fogo Empíreo',
    title: 'A Chama do Firmamento',
    desc: 'Melhora o Rito de produção de Fervor: a base do multiplicador passa de 2,35 para 2,65, mantendo base^(nível^0,6). Reduz também a escala de custo de 1,70 para 1,60, considerando Chama Astral e Gnosis Suprema: o aumento de custo por nível cai de 70% para 60%.',
    lore: 'A chama já não consome o altar: ilumina o próprio firmamento.',
    icon: 'sun',
    tier: 4,
    cost: 660000,
    effectText: 'Rito de Fervor: base 2,35 → 2,65 · custo por nível: +70% → +60%',
  },
  {
    id: 'gn_perfect_opus',
    name: 'Opus Perfeito',
    title: 'A Matéria Consumada',
    desc: 'Melhora o Rito de ganho de Fragmentos: a base do multiplicador passa de 3,40 para 3,75, mantendo base^(nível^0,6). Com Gnosis Suprema, a escala de custo cai de 4,55 para 4,15. O Rito continua exigindo a Fênix restaurada.',
    lore: 'Nada se perde no último fogo: toda matéria encontra sua forma sagrada.',
    icon: 'gem',
    tier: 4,
    cost: 720000,
    effectText: 'Rito de Fragmentos: base 3,40 → 3,75 · escala de custo 4,55 → 4,15',
  },
  {
    id: 'gn_omniscience',
    name: 'Olho do Infinito',
    title: 'Visão Panóptica',
    desc: 'As compras automáticas de Fiéis e Ritos passam a consumir 0 recursos, mas ainda exigem saldo suficiente para o orçamento de Fiéis e para o custo de cada nível de Rito. Cada automação precisa estar desbloqueada e ativa. Também libera geração automática de Fragmentos equivalente a 100% do resultado atual da Transmutação por segundo, sem gastar Fé. A restauração automática de Relíquias continua consumindo Fragmentos.',
    lore: 'Aquele que tudo vê não apenas compreende o universo: ele se torna a própria mente que o concebe.',
    icon: 'orb',
    tier: 4,
    cost: 2200000,
    effectText: 'Fiéis e Ritos automáticos sem gasto · 100% da Transmutação/s',
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

/** Current economy revision persisted in saves for one-time price refunds. */
export const PROGRESSION_REVISION = 6;

/** Prices before reordering tiers and pairing choices in 0.12.2. */
export const PROGRESSION_REVISION_5_PRICES: Readonly<Record<string, number>> = {
  gn_init_faith: 1,
  gn_memoria_selos: 2,
  gn_automation: 4,
  gn_init_fervor: 5,
  gn_seal_automation: 8,
  gn_relic_gain: 10,
  gn_ritual_automation: 20,
  gn_relic_automation: 25,
  gn_keep_relics: 48,
  gn_followers_syn: 60,
  gn_bencao_eterna: 120,
  gn_followers_economy: 150,
  gn_followers_cubic: 30_000,
  gn_gnose_mult: 36_000,
  gn_relic_refinement: 200_000,
  gn_fu1_boost: 240_000,
  gn_apotheosis: 300_000,
  gn_empyrean_fire: 600_000,
  gn_perfect_opus: 720_000,
  gn_omniscience: 2_200_000,
};

/** Prices before calibrating time and Ascensions per tier. */
export const PROGRESSION_REVISION_4_PRICES: Readonly<Record<string, number>> = {
  gn_init_faith: 1,
  gn_memoria_selos: 2,
  gn_automation: 4,
  gn_init_fervor: 5,
  gn_seal_automation: 8,
  gn_relic_gain: 10,
  gn_ritual_automation: 16,
  gn_relic_automation: 20,
  gn_keep_relics: 40,
  gn_followers_syn: 48,
  gn_bencao_eterna: 100,
  gn_followers_economy: 120,
  gn_followers_cubic: 240,
  gn_gnose_mult: 300,
  gn_relic_refinement: 800,
  gn_fu1_boost: 1_000,
  gn_omniscience: 2_400,
  gn_apotheosis: 6_000,
  gn_empyrean_fire: 1e12,
  gn_perfect_opus: 1.2e12,
};

/** Investment-path prices before removing generic production per node. */
export const PROGRESSION_REVISION_3_PRICES: Readonly<Record<string, number>> = {
  gn_init_faith: 1,
  gn_memoria_selos: 24,
  gn_automation: 300,
  gn_init_fervor: 360,
  gn_seal_automation: 4_000,
  gn_relic_gain: 4_800,
  gn_ritual_automation: 800_000,
  gn_relic_automation: 1_000_000,
  gn_keep_relics: 1e9,
  gn_followers_syn: 1.2e9,
  gn_bencao_eterna: 1e11,
  gn_followers_economy: 1.2e11,
  gn_followers_cubic: 1e13,
  gn_gnose_mult: 1.2e13,
  gn_relic_refinement: 8e16,
  gn_fu1_boost: 9.6e16,
  gn_omniscience: 2e20,
  gn_apotheosis: 1.7e22,
  gn_empyrean_fire: 1.2e28,
  gn_perfect_opus: 1.44e28,
};

/** Prices before the investment-path revision; refund reductions for existing saves. */
export const PROGRESSION_REVISION_2_PRICES: Readonly<Record<string, number>> = {
  gn_init_faith: 1,
  gn_memoria_selos: 24,
  gn_automation: 300,
  gn_seal_automation: 4_000,
  gn_init_fervor: 60_000,
  gn_relic_gain: 1e8,
  gn_ritual_automation: 800_000,
  gn_relic_automation: 1e7,
  gn_keep_relics: 1e9,
  gn_followers_syn: 1e10,
  gn_bencao_eterna: 1e11,
  gn_followers_economy: 1e12,
  gn_followers_cubic: 1e13,
  gn_gnose_mult: 1e14,
  gn_relic_refinement: 8e16,
  gn_fu1_boost: 2.8e18,
  gn_omniscience: 2e20,
  gn_apotheosis: 1.7e22,
  gn_empyrean_fire: 1.2e28,
  gn_perfect_opus: 9.8e31,
};
/** Revision 1 prices, used only to refund purchases from that revision. */
export const PROGRESSION_REVISION_1_PRICES: Readonly<Record<string, number>> = {
  gn_init_faith: 1,
  gn_memoria_selos: 57,
  gn_init_fervor: 290_000,
  gn_relic_gain: 3.4e8,
  gn_automation: 1_100,
  gn_seal_automation: 26_000,
  gn_ritual_automation: 3.5e6,
  gn_relic_automation: 3.5e7,
  gn_followers_syn: 1.9e10,
  gn_bencao_eterna: 2.9e11,
  gn_keep_relics: 2.5e9,
  gn_followers_economy: 2.3e12,
  gn_followers_cubic: 1.8e13,
  gn_gnose_mult: 1.5e14,
  gn_relic_refinement: 8.0e16,
  gn_fu1_boost: 2.8e18,
  gn_omniscience: 2.0e20,
  gn_apotheosis: 1.7e22,
  gn_empyrean_fire: 1.2e28,
  gn_perfect_opus: 9.8e31,
};

/** Campaign calibration coefficients, shared by game and simulation. */
export const PROGRESSION_BALANCE = {
  ascensionExponent: 0.25,
  enlightenedExponent: 0.28,
  earlySynergyExponent: 0.5,
  congregationExponent: 1.0,
  solarCost: 1e30,
  fervorResonanceScale: 1e18,
  fervorResonanceExponent: 0.1,
  gnoseProductionScale: 7_000,
  gnoseProductionExponent: 0.35,
  // Gentle early bonus; the campaign-scale contribution fades in gradually.
  gnoseProductionEarlyScale: 0.5,
  gnoseProductionRamp: 1_000,
};

/** Calibration targets for continuous active play; these are not timers or purchase locks. */
export const GNOSE_PACING = { minTierSec: 20 * 60, maxTierSec: 40 * 60, minAscensions: 4, maxAscensions: 12 } as const;
export const GNOSE_PASSIVE_FORMULA = `1 + ${PROGRESSION_BALANCE.gnoseProductionEarlyScale.toLocaleString('pt-BR')} × √Gnose total + ${PROGRESSION_BALANCE.gnoseProductionScale.toLocaleString('pt-BR')} × Gnose total^${PROGRESSION_BALANCE.gnoseProductionExponent.toLocaleString('pt-BR')} × (Gnose total / (Gnose total + ${PROGRESSION_BALANCE.gnoseProductionRamp.toLocaleString('pt-BR')}))²`;

for (const upgrade of GNOSE_UPGRADES) {
  upgrade.desc += ` O total de Gnose obtida em todas as Ascensões também aumenta a Fé por clique, a Fé/s e o Fervor/s. Esse bônus é calculado por ${GNOSE_PASSIVE_FORMULA} e não diminui ao gastar Gnose.`;
}
